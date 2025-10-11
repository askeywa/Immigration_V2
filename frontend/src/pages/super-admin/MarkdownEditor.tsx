// Markdown Editor for Super Admin - Documentation Creation & General Editing
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Code, 
  Edit3, 
  Save, 
  Copy, 
  Check, 
  Settings, 
  Moon, 
  Sun, 
  ZoomIn, 
  ZoomOut, 
  Printer, 
  FileDown, 
  Search, 
  Replace, 
  Undo, 
  Redo, 
  Table, 
  List, 
  Bold, 
  Italic, 
  Link,
  Shield
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';

const MarkdownEditor: React.FC = () => {
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSave, setAutoSave] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  const { isSuperAdmin } = useTenant();
  const { user } = useAuthStore();

  // Immigration System Documentation Template
  const sampleMarkdown = `# Immigration Portal System Documentation

## Overview

This document provides comprehensive documentation for the Immigration Portal system, including setup, configuration, and usage guidelines.

## System Architecture

### Multi-Tenant Architecture
- **Domain-based tenant resolution**
- **Isolated data per tenant**
- **Shared infrastructure with tenant-specific configurations**

### Key Components
- **Frontend**: React TypeScript application
- **Backend**: Node.js with Express
- **Database**: MongoDB Atlas
- **Cache**: Redis
- **Authentication**: JWT with MFA support

## Super Admin Features

### Tenant Management
- Create and manage tenant accounts
- Configure tenant-specific settings
- Monitor tenant usage and performance

### User Management
- Manage super admin users
- Assign roles and permissions
- Monitor user activity

### System Monitoring
- Performance metrics and monitoring
- System health checks
- Error tracking and logging

## API Endpoints

### Authentication
\`\`\`
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
\`\`\`

### Tenant Management
\`\`\`
GET /api/super-admin/tenants
POST /api/super-admin/tenants
PUT /api/super-admin/tenants/:id
DELETE /api/super-admin/tenants/:id
\`\`\`

## Configuration

### Environment Variables
- \`MONGODB_URI\`: Database connection string
- \`JWT_SECRET\`: JWT signing secret
- \`REDIS_URL\`: Redis connection string
- \`MAIN_DOMAIN\`: Primary domain for the application

### Security Settings
- **Rate limiting**: Configurable per endpoint
- **CORS**: Domain-specific configuration
- **SSL**: Automatic SSL certificate management

## Deployment

### Production Deployment
1. Set up environment variables
2. Configure database connections
3. Set up SSL certificates
4. Deploy using PM2 process manager

### Monitoring
- **Uptime monitoring**: 24/7 system availability
- **Performance tracking**: Response times and throughput
- **Error logging**: Comprehensive error tracking

---

*This documentation is maintained by the Super Admin team and should be updated regularly to reflect system changes.*`;

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setMarkdown(content);
        addToHistory(content);
      };
      reader.readAsText(file);
    }
  };

  const addToHistory = (content: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleMarkdownChange = (value: string) => {
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

  const insertMarkdown = (syntax: string) => {
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
    a.download = 'immigration-documentation.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Immigration Portal Documentation</title>
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
        code {
            background: ${darkMode ? '#374151' : '#f3f4f6'};
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: ${darkMode ? '#374151' : '#f3f4f6'};
            padding: 1em;
            border-radius: 0.5rem;
            overflow-x: auto;
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
    a.download = 'immigration-documentation.html';
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
        characterCount: (markdown || sampleMarkdown).length,
        author: user?.email || 'Super Admin',
        documentType: 'Immigration Portal Documentation'
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'immigration-documentation.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown || sampleMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdownToHTML = (md: string) => {
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
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gim, '<p>$1</p>')
      .replace(/<\/p><p><h/g, '</p><h')
      .replace(/<\/h([1-3])><\/p>/g, '</h$1>')
      .replace(/<\/p><p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>')
      .replace(/<\/p><p><hr>/g, '<hr>')
      .replace(/<\/hr><\/p>/g, '');
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: JSX.Element[] = [];
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-4 pl-6 space-y-2 list-disc">
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
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
        
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
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
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

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is restricted to Super Admin users only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Markdown Editor
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Documentation creation & general editing for Super Admin
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Mode Buttons */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'edit' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('edit')}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Button>
                  
                  <Button
                    variant={viewMode === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('preview')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  
                  <Button
                    variant={viewMode === 'split' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('split')}
                    className="flex items-center gap-2"
                  >
                    <Code className="w-4 h-4" />
                    Split
                  </Button>
                </div>

                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

                {/* Action Buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-2"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2"
                >
                  <Redo className="w-4 h-4" />
                </Button>

                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

                <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  Upload
                  <input type="file" accept=".md" onChange={handleFileUpload} className="hidden" />
                </label>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                
                <Button
                  size="sm"
                  onClick={downloadMarkdown}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  Save MD
                </Button>
                
                <Button
                  size="sm"
                  onClick={downloadAsHTML}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <FileDown className="w-4 h-4" />
                  HTML
                </Button>

                <Button
                  size="sm"
                  onClick={downloadAsPDF}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>

                <Button
                  size="sm"
                  onClick={exportAsJSON}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </Button>

                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Font Size
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                        className="p-1.5"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-mono">{fontSize}px</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                        className="p-1.5"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Auto Save
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSave} 
                        onChange={(e) => setAutoSave(e.target.checked)} 
                        className="w-4 h-4" 
                      />
                      <span className="text-sm">{autoSave ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Quick Insert
                    </label>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertMarkdown('**bold text**')}
                        className="p-1.5"
                        title="Bold"
                      >
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertMarkdown('*italic text*')}
                        className="p-1.5"
                        title="Italic"
                      >
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertMarkdown('[Link Text](url)')}
                        className="p-1.5"
                        title="Link"
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertMarkdown('- List item')}
                        className="p-1.5"
                        title="List"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertMarkdown('| Column 1 | Column 2 |\n|----------|----------|\n| Data 1   | Data 2   |')}
                        className="p-1.5"
                        title="Table"
                      >
                        <Table className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Search & Replace
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <input
                        type="text"
                        placeholder="Replace..."
                        value={replaceTerm}
                        onChange={(e) => setReplaceTerm(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <Button
                        size="sm"
                        onClick={handleReplace}
                        className="px-3 py-2"
                      >
                        Replace
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Statistics
                    </label>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        Words: <strong>{wordCount}</strong>
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        Characters: <strong>{displayContent.length}</strong>
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        Lines: <strong>{displayContent.split('\n').length}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Content */}
        <div className="grid grid-cols-12 gap-6">
          {viewMode === 'split' ? (
            <>
              {/* Editor */}
              <div className="col-span-6">
                <Card>
                  <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-gray-300" />
                      <span className="font-semibold text-sm">Editor</span>
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
                    className="w-full h-[calc(100vh-300px)] p-6 font-mono text-sm resize-none focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-0"
                    style={{fontSize: `${fontSize}px`}}
                    placeholder="Start typing your markdown here..."
                  />
                </Card>
              </div>

              {/* Preview */}
              <div className="col-span-6">
                <Card>
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-100" />
                      <span className="font-semibold text-sm">Live Preview</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="h-[calc(100vh-300px)] overflow-y-auto p-6 bg-white dark:bg-gray-800">
                    <div className="prose prose-lg max-w-none">
                      {renderMarkdown(displayContent)}
                    </div>
                  </div>
                </Card>
              </div>
            </>
          ) : viewMode === 'edit' ? (
            <div className="col-span-12">
              <Card>
                <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-gray-300" />
                    <span className="font-semibold">Editor Mode - Full Screen</span>
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
                  className="w-full h-[calc(100vh-300px)] p-8 font-mono text-base resize-none focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-0"
                  style={{fontSize: `${fontSize}px`}}
                  placeholder="Start typing your markdown here..."
                />
              </Card>
            </div>
          ) : (
            <div className="col-span-12">
              <Card className="p-10">
                <div className="prose prose-lg max-w-none">
                  {renderMarkdown(displayContent)}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Info Bar */}
        <Card className="mt-6">
          <div className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-gray-200">Mode:</strong> {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-gray-200">Words:</strong> {wordCount}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-gray-200">Characters:</strong> {displayContent.length}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-gray-200">Lines:</strong> {displayContent.split('\n').length}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 dark:text-gray-400">
                  {autoSave ? '💾 Auto-save enabled' : '⚠️ Auto-save disabled'}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Theme: {darkMode ? '🌙 Dark' : '☀️ Light'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MarkdownEditor;
