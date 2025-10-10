import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { fileService } from '@/services/api';

type TabKey = 'main' | 'spouse' | 'children';

type UploadItem = {
  title: string;
  files?: File[];
};

type PartUploads = {
  name: string;
  items: UploadItem[];
};

type UploadState = Record<TabKey, PartUploads[]>;

const defaultState: UploadState = {
  main: [
    { name: "Part A: Main Applicant's Personal Information", items: [{ title: '' }] },
    { name: 'Part B: Education Information', items: [{ title: '' }] },
    { name: 'Part C: Current and Previous Employment', items: [{ title: '' }] },
    { name: 'Part D: Visa Eligibility Documents', items: [{ title: '' }] },
    { name: 'Part E: Applicant Financial Documents', items: [{ title: '' }] },
  ],
  spouse: [
    { name: 'Part A: Spouse/Partner Documents', items: [{ title: '' }] },
    { name: 'Part B: Additional Spouse Documents', items: [{ title: '' }] },
    { name: 'Part C: Spouse Financial/Other Documents', items: [{ title: '' }] },
  ],
  children: [
    { name: 'Part A: Children Documents', items: [{ title: '' }] },
    { name: 'Part B: Additional Children Documents', items: [{ title: '' }] },
  ],
};

const PART_TITLES: Record<TabKey, string[]> = {
  main: defaultState.main.map(p => p.name),
  spouse: defaultState.spouse.map(p => p.name),
  children: defaultState.children.map(p => p.name),
};

const normalizeWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim();
const stripTrailingIndex = (s: string) => s.replace(/\s*[-–—]?\s*\d+$/i, '').trim();
const canonicalizeForTab = (tab: TabKey, name: string): string | null => {
  const cleaned = stripTrailingIndex(normalizeWhitespace(name)).toLowerCase();
  const candidates = PART_TITLES[tab];
  // Prefer exact (case-insensitive)
  for (const t of candidates) {
    if (cleaned === normalizeWhitespace(t).toLowerCase()) return t;
  }
  // Fallback: prefix match (e.g., "Part D: Visa Eligibility Documents-2")
  for (const t of candidates) {
    const canonical = normalizeWhitespace(t).toLowerCase();
    if (cleaned.startsWith(canonical)) return t;
  }
  return null;
};

const STORAGE_KEY = 'documentsUploadState';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTS = ['txt','jpg','jpeg','png','pdf','doc','docx','xls','xlsx'];
const ACCEPT_ATTR = 'image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx';

const getExt = (name: string) => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i+1).toLowerCase() : '';
};

const isAllowedFile = (file: File) => {
  if (file.size > MAX_SIZE) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = getExt(file.name);
  return ALLOWED_EXTS.includes(ext);
};

const isImageName = (name?: string) => {
  if (!name) return false;
  const ext = getExt(name);
  return ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext);
};
const isPdfName = (name?: string) => {
  if (!name) return false;
  return getExt(name) === 'pdf';
};

const DocumentsUpload: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  const [editingTitleById, setEditingTitleById] = useState<Record<string, string>>({});
  const [state, setState] = useState<UploadState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return defaultState;
  });

  // Lazy load PDF.js only when component mounts (saves ~500KB from initial bundle)
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        console.log('📄 Loading PDF.js library...');
        const pdfjs = await import('pdfjs-dist');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker?url');
        (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
        setPdfjsLib(pdfjs);
        console.log('✅ PDF.js loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load PDF.js:', error);
      }
    };
    
    loadPdfJs();
  }, []);

  // One-time migration to enforce new descriptive titles while preserving items
  useEffect(() => {
    setState(prev => {
      const copy: UploadState = {
        main: [...prev.main],
        spouse: [...prev.spouse],
        children: [...prev.children],
      } as UploadState;

      (['main','spouse','children'] as TabKey[]).forEach((tab) => {
        const titles = PART_TITLES[tab];
        const parts = copy[tab];
        const upgraded: PartUploads[] = [];
        for (let i = 0; i < titles.length; i++) {
          const existing = parts[i];
          upgraded[i] = existing
            ? { name: titles[i], items: existing.items && existing.items.length ? existing.items : [{ title: '' }] }
            : { name: titles[i], items: [{ title: '' }] };
        }
        // keep any extra custom parts after defaults
        for (let j = titles.length; j < parts.length; j++) {
          upgraded.push(parts[j]);
        }
        (copy as any)[tab] = upgraded;
      });

      return copy;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize: merge duplicate sections with same name into a single card (keeps order by PART_TITLES)
  useEffect(() => {
    setState(prev => {
      const normalizeTab = (partsIn: PartUploads[], titles: string[], tab: TabKey): PartUploads[] => {
        const map = new Map<string, UploadItem[]>();
        for (const p of partsIn) {
          const canon = canonicalizeForTab(tab, p.name);
          const key = canon ?? p.name;
          const arr = map.get(key) || [];
          // Include only non-empty items (title/files). Placeholders will be added later.
          if (p.items && p.items.length) {
            for (const it of p.items) {
              const hasTitle = !!(it.title && it.title.trim());
              const hasFiles = Array.isArray((it as any).files) && ((it as any).files as any[]).length > 0;
              if (hasTitle || hasFiles) arr.push({ title: it.title, files: (it as any).files });
            }
          }
          map.set(key, arr);
        }
        const out: PartUploads[] = [];
        for (const title of titles) {
          const merged = map.get(title) || [];
          const items = merged.length ? merged : [{ title: '' }];
          out.push({ name: title, items });
          map.delete(title);
        }
        // Append any custom sections left
        for (const [name, items] of map.entries()) {
          out.push({ name, items: items.length ? items : [{ title: '' }] });
        }
        return out;
      };

      const nextRaw: UploadState = {
        main: normalizeTab(prev.main, PART_TITLES.main, 'main'),
        spouse: normalizeTab(prev.spouse, PART_TITLES.spouse, 'spouse'),
        children: normalizeTab(prev.children, PART_TITLES.children, 'children'),
      } as UploadState;

      const normKey = (s: string) => normalizeWhitespace(s).toLowerCase();
      const dedupe = (arr: PartUploads[]): PartUploads[] => {
        const m = new Map<string, PartUploads>();
        for (const p of arr) {
          const k = normKey(p.name);
          if (!m.has(k)) m.set(k, { name: p.name, items: [...p.items] });
          else {
            const ex = m.get(k)!;
            ex.items.push(...p.items);
          }
        }
        return Array.from(m.values());
      };

      const next: UploadState = {
        main: dedupe(nextRaw.main),
        spouse: dedupe(nextRaw.spouse),
        children: dedupe(nextRaw.children),
      } as UploadState;

      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(next);
      if (prevStr !== nextStr) return next;
      return prev;
    });
  }, []);

  useEffect(() => {
    try {
      const toSave = JSON.stringify({
        ...state,
        // strip File objects before persisting
        main: state.main.map(p => ({ name: p.name, items: p.items.map(i => ({ title: i.title })) })),
        spouse: state.spouse.map(p => ({ name: p.name, items: p.items.map(i => ({ title: i.title })) })),
        children: state.children.map(p => ({ name: p.name, items: p.items.map(i => ({ title: i.title })) })),
      });
      localStorage.setItem(STORAGE_KEY, toSave);
    } catch {}
  }, [state]);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [serverFiles, setServerFiles] = useState<Array<{ _id: string; title: string; fileName: string; section?: string; partName?: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const flash = (type: 'success' | 'error', message: string, ms = 2000) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), ms);
  };

  const refreshFiles = async () => {
    try {
      const list = await fileService.listMine();
      setServerFiles(list?.data || []);
    } catch {}
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const parts = useMemo(() => state[activeTab], [state, activeTab]);
  const [progressByKey, setProgressByKey] = useState<Record<string, number>>({});
  const [pdfThumbByName, setPdfThumbByName] = useState<Record<string, string>>({});

  const addItem = (partIdx: number) => {
    setState(prev => {
      const copy: UploadState = { ...prev, [activeTab]: prev[activeTab].map(p => ({ ...p, items: [...p.items] })) } as UploadState;
      copy[activeTab][partIdx].items.push({ title: '' });
      return copy;
    });
  };

  // kept for potential future row insertions (reorder support)
  // const insertItemAfter = (partIdx: number, afterIdx: number, newItem: UploadItem) => {
  //   setState(prev => {
  //     const copy: UploadState = { ...prev, [activeTab]: prev[activeTab].map(p => ({ ...p, items: [...p.items] })) } as UploadState;
  //     copy[activeTab][partIdx].items.splice(afterIdx + 1, 0, newItem);
  //     return copy;
  //   });
  // };

  // removeItem no longer used (actions moved to sticky bar)

  const updateTitle = (partIdx: number, itemIdx: number, title: string) => {
    setState(prev => {
      const copy: UploadState = { ...prev, [activeTab]: prev[activeTab].map(p => ({ ...p, items: [...p.items] })) } as UploadState;
      copy[activeTab][partIdx].items[itemIdx].title = title;
      return copy;
    });
  };

  const updateFiles = (partIdx: number, itemIdx: number, files: File[] | null | undefined) => {
    setState(prev => {
      const copy: UploadState = { ...prev, [activeTab]: prev[activeTab].map(p => ({ ...p, items: [...p.items] })) } as UploadState;
      copy[activeTab][partIdx].items[itemIdx].files = files || undefined;
      return copy;
    });
  };

  const TabButton: React.FC<{ tab: TabKey; label: string }>=({ tab, label }) => (
    <button
      className={`px-3 py-1.5 rounded-full text-sm border transition ${activeTab===tab? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
      onClick={()=>setActiveTab(tab)}
    >{label}</button>
  );

  const addFilesToPart = (partIdx: number, baseTitle: string, files: File[], afterIdx?: number) => {
    if (files.length === 0) return;
    // Single card behavior: set all files into one item, with base title only
    if (afterIdx !== undefined) {
      updateTitle(partIdx, afterIdx, baseTitle);
      updateFiles(partIdx, afterIdx, files);
    } else {
      setState(prev => {
        const copy: UploadState = { ...prev, [activeTab]: prev[activeTab].map(p => ({ ...p, items: [...p.items] })) } as UploadState;
        (copy[activeTab][partIdx].items as UploadItem[]).push({ title: baseTitle, files });
        return copy;
      });
    }
    // kick off pdf thumbnail generation
    queueGeneratePdfThumbs(files);
  };

  const generatePdfThumb = async (file: File): Promise<string | null> => {
    // Wait for PDF.js to load before generating thumbnail
    if (!pdfjsLib) {
      console.warn('⚠️ PDF.js not loaded yet, skipping thumbnail generation');
      return null;
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const pdfKey = (f: File) => `${f.name}|${f.size}`;
  const queueGeneratePdfThumbs = async (files: File[]) => {
    const pdfs = files.filter(f => isPdfName(f.name));
    for (const f of pdfs) {
      const key = pdfKey(f);
      if (pdfThumbByName[key]) continue;
      const dataUrl = await generatePdfThumb(f);
      if (dataUrl) setPdfThumbByName(prev => ({ ...prev, [key]: dataUrl }));
    }
  };

  const hasPendingFiles = useMemo(() => {
    return parts.some(p => p.items.some(i => (i.files && i.files.length)));
  }, [parts]);

  const uploadItemFiles = async (partName: string, item: UploadItem, tab: TabKey, partIdx: number, itemIdx: number) => {
    if (!item.files || item.files.length === 0) return;
    const base = item.title && item.title.trim() ? item.title.trim() : partName;
    for (let k = 0; k < item.files.length; k++) {
      const file = item.files[k];
      const title = item.files.length > 1 ? `${base}-${k + 1}` : base;
      const key = `${tab}|${partName}|${itemIdx}|${file.name}`;
      setProgressByKey(prev => ({ ...prev, [key]: 0 }));
      try {
        await fileService.upload(
          { title, section: tab, partName, file },
          (p: number) => setProgressByKey(prev => ({ ...prev, [key]: p }))
        );
      } catch {
        flash('error', `Upload failed: ${file.name}`);
      } finally {
        setProgressByKey(prev => ({ ...prev, [key]: 0 }));
      }
    }
    // After uploads, clear this card
    updateTitle(partIdx, itemIdx, '');
    updateFiles(partIdx, itemIdx, undefined);
  };

  const uploadAllPendingInTab = async () => {
    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      for (let iIdx = 0; iIdx < part.items.length; iIdx++) {
        const item = part.items[iIdx];
        if (item.files && item.files.length) {
          await uploadItemFiles(part.name, item, activeTab, pIdx, iIdx);
        }
      }
    }
    await refreshFiles();
    flash('success', 'All pending files uploaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Documents Upload</h1>

      {notice && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <TabButton tab="main" label="Main Applicant documents" />
        <TabButton tab="spouse" label="Spouse documents" />
        <TabButton tab="children" label="Children documents" />
      </div>

      {/* Sticky top action bar */}
      <div className={`sticky top-14 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 border border-gray-200 rounded-md p-3 flex items-center justify-between ${hasPendingFiles ? 'bg-red-50' : 'bg-white/90'}`}>
        <div className="text-sm text-gray-700">Selected: {selectedIds.size}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={`text-xs ${hasPendingFiles ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse' : ''}`}
            onClick={uploadAllPendingInTab}
          >Upload</Button>
          <Button
            variant="outline"
            className="text-xs"
            onClick={async ()=>{
              const ids = Array.from(selectedIds);
              if (ids.length === 0) return;
              try { await Promise.all(ids.map(id => fileService.delete(id))); flash('success','Deleted selected'); setSelectedIds(new Set()); refreshFiles(); } catch { flash('error','Delete failed'); }
            }}
          >Delete selected</Button>
          <Button
            variant="outline"
            className="text-xs"
            onClick={async ()=>{
              // Download each selected file via URL open to preserve name
              const toDownload = serverFiles.filter(f=>selectedIds.has(f._id));
              for (const f of toDownload) {
                const a = document.createElement('a');
                a.href = fileService.downloadUrl(f._id);
                a.download = f.fileName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
          >Download selected</Button>
        </div>
      </div>

      <div className="space-y-4">
        {parts.map((part, pIdx) => (
          <Card key={part.name} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{part.name}</h3>
              <div className="flex items-center gap-2">
                <Button className="text-xs" onClick={()=>addItem(pIdx)}>+ Add</Button>
              </div>
            </div>

            <div className="space-y-3"
                 onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                 onDrop={(e)=>{ e.preventDefault(); const all=Array.from(e.dataTransfer.files||[]); const valid=all.filter(isAllowedFile); const base=part.name; addFilesToPart(pIdx, base, valid); if (valid.length!==all.length) flash('error','Some files exceed 10MB or type not allowed'); }}>
              {part.items.map((item, iIdx) => (
                <Card key={iIdx} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center"
                       onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                       onDrop={(e)=>{ e.preventDefault(); const dropped = Array.from(e.dataTransfer.files||[]).filter(isAllowedFile); const base=(item.title&&item.title.trim())?item.title.trim():part.name; addFilesToPart(pIdx, base, dropped, iIdx); }}>
                    <Input
                      placeholder="Document Title"
                      value={item.title}
                      onChange={(e)=>updateTitle(pIdx, iIdx, e.target.value)}
                      onDoubleClick={(e)=> (e.target as HTMLInputElement).select()}
                    />
                    <input
                      type="file"
                      multiple
                      accept={ACCEPT_ATTR}
                      onChange={(e)=>{
                        const files = Array.from(e.target.files || []).filter(isAllowedFile);
                        if (files.length === 0) return;
                        const base = (item.title && item.title.trim()) ? item.title.trim() : part.name;
                        updateTitle(pIdx, iIdx, base);
                        updateFiles(pIdx, iIdx, files);
                        queueGeneratePdfThumbs(files);
                      }}
                      onDoubleClick={(e)=> (e.target as HTMLInputElement).click()}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span className="truncate">{(item.files && item.files.length) ? `${item.files.length} file(s) selected` : 'No file selected'}</span>
                    <div className="flex items-center gap-2"></div>
                  </div>

                  {/* Inline previews for selected files */}
                  {item.files && item.files.length ? (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {item.files.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded border border-gray-200 p-2">
                          {isImageName(f.name) ? (
                            <img src={URL.createObjectURL(f)} alt={f.name} className="h-10 w-10 object-cover rounded" />
                          ) : isPdfName(f.name) ? (
                            pdfThumbByName[`${f.name}|${f.size}`] ? (
                              <img src={pdfThumbByName[`${f.name}|${f.size}`]} alt="PDF preview" className="h-10 w-10 object-cover rounded" />
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center rounded bg-gray-100 text-red-600 text-xs font-semibold">PDF</div>
                            )
                          ) : (
                            <div className="h-10 w-10 flex items-center justify-center rounded bg-gray-100 text-gray-600 text-xs">
                              {getExt(f.name).toUpperCase() || 'FILE'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{f.name}</div>
                            <div className="text-[10px] text-gray-500">{(f.size/1024/1024).toFixed(2)} MB</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Upload progress (single combined bar) */}
                  {(() => {
                    const keys = Object.keys(progressByKey).filter(k=>k.startsWith(`${activeTab}|${part.name}|${iIdx}|`));
                    if (!keys.length) return null;
                    const avg = Math.round(keys.reduce((sum, k)=> sum + (progressByKey[k] || 0), 0) / keys.length);
                    return (
                      <div className="mt-2 w-full h-2 rounded bg-gray-200 overflow-hidden">
                        <div className="h-full bg-red-500 transition-all" style={{ width: `${avg}%` }} />
                      </div>
                    );
                  })()}

                  {/* Existing uploaded files for this part */}
                  <div className="mt-3 space-y-2">
                    {serverFiles
                      .filter(f => (f.section as any) === activeTab && f.partName === part.name)
                      .map(f => (
                        <div key={f._id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
                          <div className="flex items-center gap-2 truncate">
                            <input type="checkbox" checked={selectedIds.has(f._id)} onChange={()=>toggleSelect(f._id)} />
                            <input
                              className="font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-gray-400"
                              value={editingTitleById[f._id] ?? f.title}
                              onChange={(e)=> setEditingTitleById(prev=>({ ...prev, [f._id]: e.target.value }))}
                              onBlur={async ()=>{
                                const next = (editingTitleById[f._id] ?? '').trim();
                                if (!next || next === f.title) { setEditingTitleById(prev=>{ const c={...prev}; delete c[f._id]; return c;}); return; }
                                try { await fileService.rename(f._id, next); setEditingTitleById(prev=>{ const c={...prev}; delete c[f._id]; return c;}); refreshFiles(); }
                                catch { flash('error','Rename failed'); }
                              }}
                            />
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-gray-600">{f.fileName}</span>
                            <span className="ml-2 inline-flex items-center text-green-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L8.5 11.586l6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocumentsUpload;


