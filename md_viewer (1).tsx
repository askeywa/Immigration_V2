import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Eye, Code, Edit3, Save, Copy, Check, Settings, Moon, Sun, ZoomIn, ZoomOut, Printer, FileDown, Search, Replace, Undo, Redo, Table, List, Bold, Italic, Link } from 'lucide-react';

const MarkdownViewer = () => {
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState('split');
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSave, setAutoSave] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  const sampleMarkdown = `# Enterprise Multi-Tenant Immigration SaaS Implementation Plan

## Executive Summary

Transform your existing single-tenant Immigration Portal into an enterprise-grade multi-tenant SaaS platform serving 30+ RCIC firms with subdomain-based tenant resolution. This plan follows the MASTER_IMPLEMENTATION_PLAN specifications while maintaining achievable milestones and best practices for multinational-scale expansion.

**Target Timeline:** 12-16 weeks (with 10 team members) **Infrastructure Budget:** $500-1,000/month (scalable) **Initial Scale:** 30+ RCIC tenants **Architecture:** Single deployment, domain-based tenant resolution

## Core Architecture Principles

### Evolutionary Upgrade Strategy

✅ **Zero disruption** to existing functionality
✅ **Backward compatibility** maintained throughout
✅ **Gradual migration** to enterprise patterns
✅ **Follow existing code patterns** with enhancements
✅ **Enterprise-grade security** from day one

---

## Week 2: Authentication & Tenant Resolution

**Objective:** Implement enterprise-grade authentication with tenant context

### Critical Tasks:

- Create **domain-based tenant resolution** middleware
- Enhance JWT tokens with tenant context and security claims
- Implement **Multi-Factor Authentication (MFA)** system
- Add **API key management** for tenant integrations
- Create **session management** with tenant isolation
- Build **super admin impersonation** features

### Deliverables:

✅ All APIs converted to multi-tenant
✅ API versioning system
✅ Comprehensive logging
✅ Usage tracking for billing
✅ Performance monitoring`;

  useEffect(() => {
    const words = (markdown || sampleMarkdown).trim().split(/\s+/).length;
    setWordCount(words);
  }, [markdown]);

  useEffect(() => {
    if (autoSave && markdown) {
      const timer = setTimeout(() => {
        localStorage.setItem('autosave-markdown', markdown);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [markdown, autoSave]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMarkdown(event.target.result);
        addToHistory(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const addToHistory = (content) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleMarkdownChange = (value) => {
    setMarkdown(value);
    addToHistory(value);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMarkdown(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMarkdown(history[historyIndex + 1]);
    }
  };

  const handleSearch = () => {
    if (!searchTerm) return;
    const content = markdown || sampleMarkdown;
    const highlighted = content.replace(
      new RegExp(searchTerm, 'gi'),
      (match) => `**${match}**`
    );
    setMarkdown(highlighted);
  };

  const handleReplace = () => {
    if (!searchTerm) return;
    const content = markdown || sampleMarkdown;
    const replaced = content.replace(new RegExp(searchTerm, 'g'), replaceTerm);
    setMarkdown(replaced);
    addToHistory(replaced);
  };

  const insertMarkdown = (syntax) => {
    const content = markdown || sampleMarkdown;
    const newContent = content + '\n' + syntax;
    setMarkdown(newContent);
    addToHistory(newContent);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown || sampleMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Document</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: ${darkMode ? '#1a1a1a' : '#ffffff'};
            color: ${darkMode ? '#e5e5e5' : '#1a1a1a'};
            font-size: ${fontSize}px;
        }
        h1 {
            font-size: 2.5em;
            font-weight: 700;
            margin: 1em 0 0.5em 0;
            line-height: 1.2;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 0.3em;
        }
        h2 {
            font-size: 1.8em;
            font-weight: 600;
            margin: 1.5em 0 0.8em 0;
            color: ${darkMode ? '#60a5fa' : '#1e40af'};
            border-bottom: 2px solid ${darkMode ? '#374151' : '#e5e7eb'};
            padding-bottom: 0.3em;
        }
        h3 {
            font-size: 1.4em;
            font-weight: 600;
            margin: 1.2em 0 0.6em 0;
            color: ${darkMode ? '#60a5fa' : '#1e40af'};
        }
        p {
            margin: 1em 0;
            text-align: justify;
        }
        strong {
            font-weight: 600;
            color: ${darkMode ? '#60a5fa' : '#1e40af'};
        }
        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }
        li {
            margin: 0.5em 0;
        }
        hr {
            border: none;
            border-top: 2px solid ${darkMode ? '#374151' : '#e5e7eb'};
            margin: 2em 0;
        }
    </style>
</head>
<body>
${renderMarkdownToHTML(markdown || sampleMarkdown)}
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = () => {
    window.print();
  };

  const exportAsJSON = () => {
    const data = {
      content: markdown || sampleMarkdown,
      metadata: {
        createdAt: new Date().toISOString(),
        wordCount: wordCount,
        characterCount: (markdown || sampleMarkdown).length
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown || sampleMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdownToHTML = (md) => {
    return md
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^---$/gim, '<hr>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/✅/g, '<span style="color: #10b981;">✅</span>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gim, '<p>$1</p>')
      .replace(/<\/p><p><h/g, '</p><h')
      .replace(/<\/h([1-3])><\/p>/g, '</h$1>')
      .replace(/<\/p><p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>')
      .replace(/<\/p><p><hr>/g, '<hr>')
      .replace(/<\/hr><\/p>/g, '');
  };

  const renderMarkdown = (md) => {
    const lines = md.split('\n');
    const elements = [];
    let listItems = [];
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-4 pl-6 space-y-2">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, idx) => {
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={idx} className={`text-4xl font-bold mt-8 mb-4 pb-3 border-b-4 ${darkMode ? 'border-blue-500 text-gray-100' : 'border-blue-600 text-gray-900'}`} style={{fontSize: `${fontSize * 2.5 / 16}rem`}}>
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={idx} className={`text-3xl font-semibold mt-6 mb-3 pb-2 border-b-2 ${darkMode ? 'border-gray-600 text-blue-400' : 'border-gray-200 text-blue-900'}`} style={{fontSize: `${fontSize * 1.8 / 16}rem`}}>
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={idx} className={`text-2xl font-semibold mt-5 mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`} style={{fontSize: `${fontSize * 1.4 / 16}rem`}}>
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith('---')) {
        flushList();
        elements.push(<hr key={idx} className={`my-6 border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />);
      } else if (line.startsWith('- ') || line.startsWith('✅')) {
        const content = line.replace(/^- /, '').replace(/^✅ /, '');
        const formatted = content
          .replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-900'}">$1</strong>`)
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        listItems.push(
          <li key={idx} className="flex items-start gap-2" style={{fontSize: `${fontSize}px`}}>
            <span className="text-green-500 mt-1">✅</span>
            <span dangerouslySetInnerHTML={{ __html: formatted }} />
          </li>
        );
      } else if (line.trim()) {
        flushList();
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-900'}">$1</strong>`)
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        elements.push(
          <p key={idx} className="my-3 text-justify leading-relaxed" style={{fontSize: `${fontSize}px`}} dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      } else {
        flushList();
      }
    });
    
    flushList();
    return elements;
  };

  const displayContent = markdown || sampleMarkdown;
  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${cardBg} shadow-lg border-b ${borderColor}`}>
        <div className="max-w-[1920px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${textColor}`}>Professional Markdown Editor</h1>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Advanced editing & viewing platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Buttons */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                    viewMode === 'edit' ? 'bg-blue-600 text-white shadow-md' : `${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                    viewMode === 'preview' ? 'bg-blue-600 text-white shadow-md' : `${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                
                <button
                  onClick={() => setViewMode('split')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                    viewMode === 'split' ? 'bg-blue-600 text-white shadow-md' : `${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  Split
                </button>
              </div>

              <div className={`h-8 w-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

              {/* Action Buttons */}
              <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded-lg transition-colors ${historyIndex <= 0 ? 'opacity-40 cursor-not-allowed' : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}>
                <Undo className="w-4 h-4" />
              </button>
              
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded-lg transition-colors ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}>
                <Redo className="w-4 h-4" />
              </button>

              <div className={`h-8 w-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

              <label className={`flex items-center gap-1.5 px-3 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg cursor-pointer transition-colors text-xs font-medium shadow-md`}>
                <Upload className="w-3.5 h-3.5" />
                Upload
                <input type="file" accept=".md" onChange={handleFileUpload} className="hidden" />
              </label>
              
              <button onClick={copyToClipboard} className={`flex items-center gap-1.5 px-3 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-lg transition-colors text-xs font-medium`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              
              <button onClick={downloadMarkdown} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium shadow-md">
                <Save className="w-3.5 h-3.5" />
                Save MD
              </button>
              
              <button onClick={downloadAsHTML} className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-xs font-medium">
                <FileDown className="w-3.5 h-3.5" />
                HTML
              </button>

              <button onClick={downloadAsPDF} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs font-medium">
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>

              <button onClick={exportAsJSON} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-xs font-medium">
                <Download className="w-3.5 h-3.5" />
                JSON
              </button>

              <div className={`h-8 w-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

              <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <Settings className="w-4 h-4" />
              </button>

              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className={`mt-3 p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border ${borderColor}`}>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 block`}>Font Size</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`}>
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-mono">{fontSize}px</span>
                    <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`}>
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 block`}>Auto Save</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm">{autoSave ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 block`}>Quick Insert</label>
                  <div className="flex gap-1">
                    <button onClick={() => insertMarkdown('**bold text**')} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`} title="Bold">
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertMarkdown('*italic text*')} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`} title="Italic">
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertMarkdown('[Link Text](url)')} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`} title="Link">
                      <Link className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertMarkdown('- List item')} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`} title="List">
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertMarkdown('| Column 1 | Column 2 |\n|----------|----------|\n| Data 1   | Data 2   |')} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'}`} title="Table">
                      <Table className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 block`}>Search & Replace</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`flex-1 px-2 py-1.5 text-sm rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'} border ${borderColor}`}
                    />
                    <input
                      type="text"
                      placeholder="Replace..."
                      value={replaceTerm}
                      onChange={(e) => setReplaceTerm(e.target.value)}
                      className={`flex-1 px-2 py-1.5 text-sm rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'} border ${borderColor}`}
                    />
                    <button onClick={handleReplace} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium">
                      Replace
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 block`}>Statistics</label>
                  <div className="flex gap-4 text-sm">
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Words: <strong>{wordCount}</strong></span>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Characters: <strong>{displayContent.length}</strong></span>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Lines: <strong>{displayContent.split('\n').length}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-4">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Editor */}
            <div className={`${cardBg} rounded-xl shadow-xl overflow-hidden border ${borderColor}`}>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-700 to-gray-800'} px-4 py-2.5 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-gray-300" />
                  <span className="text-white font-semibold text-sm">Editor</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <textarea
                value={displayContent}
                onChange={(e) => handleMarkdownChange(e.target.value)}
                className={`w-full h-[calc(100vh-220px)] p-6 font-mono text-sm resize-none focus:outline-none ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
                style={{fontSize: `${fontSize}px`}}
                placeholder="Start typing your markdown here..."
              />
            </div>

            {/* Preview */}
            <div className={`${cardBg} rounded-xl shadow-xl overflow-hidden border ${borderColor}`}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-100" />
                  <span className="text-white font-semibold text-sm">Live Preview</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className={`h-[calc(100vh-220px)] overflow-y-auto p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="prose prose-lg max-w-none">
                  {renderMarkdown(displayContent)}
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'edit' ? (
          <div className={`${cardBg} rounded-xl shadow-xl overflow-hidden border ${borderColor}`}>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-700 to-gray-800'} px-4 py-2.5 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gray-300" />
                <span className="text-white font-semibold">Editor Mode - Full Screen</span>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <textarea
              value={displayContent}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              className={`w-full h-[calc(100vh-220px)] p-8 font-mono text-base resize-none focus:outline-none ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
              style={{fontSize: `${fontSize}px`}}
              placeholder="Start typing your markdown here..."
            />
          </div>
        ) : (
          <div className={`${cardBg} rounded-xl shadow-xl p-10 border ${borderColor}`}>
            <div className="prose prose-lg max-w-none">
              {renderMarkdown(displayContent)}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className={`fixed bottom-0 left-0 right-0 ${cardBg} border-t ${borderColor} px-6 py-2 shadow-lg`}>
        <div className="max-w-[1920px] mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong className={darkMode ? 'text-gray-200' : 'text-gray-800'}>Mode:</strong> {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
            </span>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong className={darkMode ? 'text-gray-200' : 'text-gray-800'}>Words:</strong> {wordCount}
            </span>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong className={darkMode ? 'text-gray-200' : 'text-gray-800'}>Characters:</strong> {displayContent.length}
            </span>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong className={darkMode ? 'text-gray-200' : 'text-gray-800'}>Lines:</strong> {displayContent.split('\n').length}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {autoSave ? '💾 Auto-save enabled' : '⚠️ Auto-save disabled'}
            </span>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Theme: {darkMode ? '🌙 Dark' : '☀️ Light'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownViewer;