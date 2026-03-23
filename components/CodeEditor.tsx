'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVFS } from '@/contexts/VFSContext';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FileIcon: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let defaultStyles: any = {};

// Lazy-load react-file-icon (client-only, no SSR issues)
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-file-icon');
    FileIcon = mod.FileIcon;
    defaultStyles = mod.defaultStyles ?? {};
  } catch {
    // silently ignore if unavailable
  }
}

// ── Tree data structures ────────────────────────────────────────────────────

type FileNode = { kind: 'file'; path: string; name: string };
type DirNode  = { kind: 'dir';  name: string; fullPath: string; children: TreeNode[] };
type TreeNode = FileNode | DirNode;

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;
    let curPath = '';

    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      curPath = curPath ? `${curPath}/${seg}` : seg;
      let dir = current.find((n): n is DirNode => n.kind === 'dir' && n.name === seg);
      if (!dir) {
        dir = { kind: 'dir', name: seg, fullPath: curPath, children: [] };
        current.push(dir);
      }
      current = dir.children;
    }

    current.push({ kind: 'file', path, name: parts[parts.length - 1] });
  }

  function sortNodes(nodes: TreeNode[]): void {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.kind === 'dir') sortNodes(n.children);
    }
  }

  sortNodes(root);
  return root;
}

// ── Component ───────────────────────────────────────────────────────────────

interface CodeEditorProps {
  className?: string;
}

export default function CodeEditor({ className = '' }: CodeEditorProps) {
  const { vfs } = useVFS();

  const [files, setFiles]                   = useState<string[]>([]);
  const [activeFile, setActiveFile]         = useState<string | null>(null);
  const [code, setCode]                     = useState('');
  const [flashingFiles, setFlashingFiles]   = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed]           = useState<Set<string>>(new Set());
  const writeTimerRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimersRef                      = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flashFile = useCallback((path: string) => {
    setFlashingFiles((prev) => new Set(prev).add(path));
    const existing = flashTimersRef.current.get(path);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setFlashingFiles((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      flashTimersRef.current.delete(path);
    }, 1000);
    flashTimersRef.current.set(path, timer);
  }, []);

  // Sync file list from VFS + flash on write
  useEffect(() => {
    const refresh = (event?: { type: string; path: string }) => {
      const list = vfs.listFiles();
      setFiles(list);
      setActiveFile((prev) => {
        if (prev && list.includes(prev)) return prev;
        return list[0] ?? null;
      });
      if (event && (event.type === 'create' || event.type === 'change')) {
        flashFile(event.path);
      }
    };
    refresh();
    return vfs.onChange(refresh as Parameters<typeof vfs.onChange>[0]);
  }, [vfs, flashFile]);

  // Load content when active file changes
  useEffect(() => {
    if (activeFile && vfs.exists(activeFile)) {
      setCode(vfs.readFile(activeFile));
    } else {
      setCode('');
    }
  }, [activeFile, vfs]);

  // Listen for open-file-in-editor events from ToolCallCard
  useEffect(() => {
    function handler(e: Event) {
      const path = (e as CustomEvent<{ path: string }>).detail.path;
      if (path && vfs.exists(path)) setActiveFile(path);
    }
    window.addEventListener('open-file-in-editor', handler);
    return () => window.removeEventListener('open-file-in-editor', handler);
  }, [vfs]);

  // Sync active file content when VFS changes (AI rewrites it)
  useEffect(() => {
    return vfs.onChange((event) => {
      if (event.path === activeFile && (event.type === 'create' || event.type === 'change')) {
        setCode(vfs.readFile(event.path));
      }
    });
  }, [activeFile, vfs]);

  // Write back to VFS with 300 ms debounce
  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      if (!activeFile) return;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        if (activeFile && vfs.exists(activeFile)) {
          vfs.writeFile(activeFile, value);
        }
      }, 300);
    },
    [activeFile, vfs],
  );

  // ── Tree rendering ──────────────────────────────────────────────────────

  function toggleDir(fullPath: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(fullPath)) next.delete(fullPath);
      else next.add(fullPath);
      return next;
    });
  }

  function renderTree(nodes: TreeNode[], depth = 0): React.ReactNode {
    return nodes.map((node) => {
      if (node.kind === 'dir') {
        const isCollapsed = collapsed.has(node.fullPath);
        return (
          <div key={node.fullPath}>
            <button
              onClick={() => toggleDir(node.fullPath)}
              className="flex items-center gap-1 w-full text-left hover:bg-[#0f1117] transition-colors"
              style={{ paddingLeft: depth * 12 + 8, paddingTop: 4, paddingBottom: 4, paddingRight: 8 }}
            >
              {/* Chevron */}
              <svg
                className="w-2.5 h-2.5 shrink-0 text-[#3d4055] transition-transform"
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
              {/* Folder icon */}
              <svg className="w-3.5 h-3.5 shrink-0 text-[#e8c275]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              <span className="font-mono text-[11px] text-[#8b8d9e] truncate">{node.name}</span>
            </button>
            {!isCollapsed && renderTree(node.children, depth + 1)}
          </div>
        );
      }

      // File node
      const ext = node.name.split('.').pop() ?? '';
      const isFlashing = flashingFiles.has(node.path);
      const isActive = activeFile === node.path;

      return (
        <button
          key={node.path}
          onClick={() => setActiveFile(node.path)}
          className={`relative flex items-center gap-1.5 text-left w-full transition-all ${
            isActive
              ? 'bg-[#141620] text-[#f0f0f5] border-l-2 border-l-white'
              : 'text-[#6b7080] hover:text-[#f0f0f5] hover:bg-[#0f1117] border-l-2 border-l-transparent'
          } ${isFlashing ? 'bg-white/5' : ''}`}
          style={{ paddingLeft: (depth + 1) * 12 + 4, paddingTop: 5, paddingBottom: 5, paddingRight: 8 }}
        >
          {/* File type icon */}
          <div className="w-3.5 h-3.5 shrink-0">
            {FileIcon ? (
              <FileIcon extension={ext} {...(defaultStyles[ext] ?? {})} />
            ) : (
              <svg
                className={`w-3.5 h-3.5 ${isFlashing ? 'text-[#34d399]' : isActive ? 'text-white' : 'text-[#3d4055]'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
          </div>
          <span className="font-mono text-[11px] truncate">{node.name}</span>
          {isFlashing && (
            <span className="absolute inset-0 ring-1 ring-inset ring-white/15 pointer-events-none" />
          )}
        </button>
      );
    });
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  const lines = code.split('\n');

  if (!files.length) {
    return (
      <div
        className={`flex bg-[#0d0e14] items-center justify-center ${className}`}
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        <p className="text-[#3d4055] text-xs">No files in project yet</p>
      </div>
    );
  }

  const tree = buildTree(files);

  return (
    <div className={`flex bg-[#0d0e14] ${className}`}>
      {/* Vertical file sidebar */}
      <div
        className="flex flex-col bg-[#0a0b0f] border-r border-[#1f2133] shrink-0 overflow-y-auto scrollbar-thin"
        style={{ width: 176 }}
      >
        {/* Sidebar header — project name */}
        <div className="px-3 py-2 border-b border-[#1f2133] flex items-center gap-1">
          <svg className="w-2.5 h-2.5 text-[#3d4055]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-[9px] font-semibold text-[#3d4055] uppercase tracking-widest">Project</span>
        </div>

        {/* Nested file tree */}
        <div className="py-1">{renderTree(tree)}</div>
      </div>

      {/* Editor pane */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Path breadcrumb */}
        {activeFile && (
          <div className="px-4 py-1.5 border-b border-[#1f2133] bg-[#0a0b0f] shrink-0 flex items-center justify-between">
            <span className="text-[10px] text-[#3d4055] font-mono truncate">{activeFile}</span>
            <span className="text-[10px] text-[#3d4055] shrink-0 ml-2">{lines.length} lines</span>
          </div>
        )}

        {/* Editable code area */}
        <div className="flex-1 overflow-auto relative">
          {/* Line numbers */}
          <div className="absolute top-0 left-0 w-10 pt-4 pb-4 select-none pointer-events-none z-10">
            {lines.map((_, i) => (
              <div
                key={i}
                className="text-right pr-3 text-[10px] leading-5"
                style={{
                  fontFamily: 'var(--font-jetbrains, monospace)',
                  color: '#3d4055',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Editable textarea */}
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="absolute inset-0 w-full h-full bg-transparent text-[#f0f0f5] text-xs leading-5 resize-none outline-none pl-10 pr-4 pt-4 pb-4"
            style={{
              fontFamily: 'var(--font-jetbrains, "JetBrains Mono", monospace)',
              tabSize: 2,
              caretColor: '#ffffff',
            }}
          />
        </div>
      </div>
    </div>
  );
}
