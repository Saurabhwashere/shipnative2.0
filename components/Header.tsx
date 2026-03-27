'use client';

import { useEffect, useRef } from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

interface Snapshot {
  id: string;
  timestamp: number;
  label: string;
  files: { path: string; content: string }[];
}

interface HeaderProps {
  showEditor: boolean;
  onToggleEditor: () => void;
  snapshots: Snapshot[];
  showHistory: boolean;
  onToggleHistory: () => void;
  onRestoreSnapshot: (id: string) => void;
  fileCount: number;
}

function formatRelTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Header({
  showEditor,
  onToggleEditor,
  snapshots,
  showHistory,
  onToggleHistory,
  onRestoreSnapshot,
  fileCount,
}: HeaderProps) {
  const { isSignedIn } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showHistory) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onToggleHistory();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showHistory, onToggleHistory]);

  return (
    <header
      className="bg-[#1c1c1c]/90 backdrop-blur-xl border-b border-[#252525] flex items-center justify-between px-4 shrink-0 z-20"
      style={{ height: 52 }}
    >
      {/* Top accent gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{ background: 'linear-gradient(90deg, #ffffff, #34d399)' }}
      />

      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
          {/* Rocket icon */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 6 5 6 11l-2 2 1 1 1.5-1.5c.5 1 1.2 1.8 2 2.2L7 16l1 1 2-2c.6.1 1 .1 1.5.1 3.5 0 6.5-2.5 6.5-6.5C18 4.5 10 2 10 2z" fill="#ffffff" opacity="0.8"/>
              <circle cx="12" cy="8" r="1.5" fill="#f0f0f5" opacity="0.9"/>
              <path d="M6 14l-2 3 3-2" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold tracking-tight text-sm text-[--color-text-primary]">
            ShipNative
          </span>
        </a>
      </div>

      {/* Right: History + Editor toggle + User */}
      <div className="flex items-center gap-1.5">
        {/* History button + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={onToggleHistory}
            disabled={snapshots.length === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              showHistory
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-[#2a2a2a] border-[#3a3a3a] text-[#6b7080] hover:text-[#f0f0f5] hover:bg-[#333333]'
            }`}
            title={snapshots.length === 0 ? 'No history yet' : 'Version history'}
          >
            {/* Clock icon */}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {snapshots.length > 0 && (
              <span className="text-[10px] min-w-[12px] h-4 flex items-center justify-center bg-white/15 rounded-full px-1 font-medium">
                {snapshots.length}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showHistory && snapshots.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#222222] border border-[#3a3a3a] rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[#3a3a3a]">
                <p className="text-[10px] text-[#6b7080] font-medium uppercase tracking-widest">Version History</p>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {[...snapshots].reverse().map((snap) => (
                  <button
                    key={snap.id}
                    onClick={() => onRestoreSnapshot(snap.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#333333] transition-colors border-b border-[#3a3a3a]/50 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[#f0f0f5] truncate flex-1">{snap.label}</p>
                      <span className="text-[10px] text-[#6b7080] shrink-0">{formatRelTime(snap.timestamp)}</span>
                    </div>
                    <p className="text-[10px] text-[#6b7080] mt-0.5">{snap.files.length} files</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor toggle — icon button with file count badge */}
        <div className="relative">
          <button
            onClick={onToggleEditor}
            title={showEditor ? 'Hide editor' : 'Show editor'}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
              showEditor
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-[#2a2a2a] border-[#3a3a3a] text-[#6b7080] hover:text-[#f0f0f5] hover:bg-[#333333]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          {fileCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center bg-white text-[#1c1c1c] text-[8px] font-bold rounded-full px-0.5 pointer-events-none">
              {fileCount}
            </span>
          )}
        </div>

        {/* Clerk auth */}
        {isSignedIn ? (
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-7 h-7',
                userButtonTrigger: 'focus:shadow-none',
              },
            }}
          />
        ) : (
          <SignInButton mode="modal">
            <button className="px-2.5 py-1.5 rounded-lg border border-[--color-border] bg-[--color-editor] text-xs text-[--color-text-dim] hover:text-[--color-text-primary] hover:bg-[--color-hover] transition-all">
              Sign in
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
