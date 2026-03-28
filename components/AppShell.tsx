'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import ChatPanel from '@/components/ChatPanel';
import CodeEditor from '@/components/CodeEditor';
import PhonePreview from '@/components/PhonePreview';
import { VFSProvider } from '@/contexts/VFSContext';
import { PreviewProvider } from '@/contexts/PreviewContext';
import { useVFS } from '@/contexts/VFSContext';
import { usePersistence } from '@/lib/hooks/use-persistence';
import { BLANK_INDEX_SOURCE, BLANK_LAYOUT_SOURCE } from '@/lib/preview-placeholders';

const INITIAL_FILES = [
  { path: 'app/_layout.tsx', content: BLANK_LAYOUT_SOURCE },
  { path: 'app/index.tsx',   content: BLANK_INDEX_SOURCE },
];

interface ProjectSnapshot {
  id: string;
  timestamp: number;
  label: string;
  files: { path: string; content: string }[];
}

// ── Layout (inside providers) ─────────────────────────────────────────────────
function Layout({
  initialPrompt,
  projectId,
}: {
  initialPrompt?: string;
  projectId?: string;
}) {
  const { vfs } = useVFS();
  const [showEditor, setShowEditor] = useState(false);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [vfsHydrated, setVfsHydrated] = useState(false);

  const persistence = usePersistence(projectId);

  // ── Bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    persistence.init((newProjectId) => {
      // Update the URL to /studio/[projectId] without triggering a Next.js route change.
      // history.replaceState keeps the component alive — no remount, no reload flash.
      const url = initialPrompt
        ? `/studio/${newProjectId}?prompt=${encodeURIComponent(initialPrompt)}`
        : `/studio/${newProjectId}`;
      window.history.replaceState(null, '', url);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Once persistence is ready, hydrate VFS + messages ────────────────────
  useEffect(() => {
    if (!persistence.ready || vfsHydrated) return;
    setVfsHydrated(true);

    // Hydrate VFS from DB files (only if there are any saved files)
    if (persistence.initialFiles.length > 0) {
      for (const path of vfs.listFiles()) vfs.deleteFile(path);
      for (const { path, content } of persistence.initialFiles) {
        vfs.writeFile(path, content);
      }
    }

    // Restore snapshots list
    const dbSnaps: ProjectSnapshot[] = persistence.snapshots.map((s) => ({
      id: s.id,
      timestamp: new Date(s.created_at).getTime(),
      label: s.label,
      files: [],
    }));
    setSnapshots(dbSnaps);

  }, [persistence.ready, persistence.initialFiles, persistence.snapshots, vfs, vfsHydrated]);

  // ── Save snapshot ─────────────────────────────────────────────────────────
  const saveSnapshot = useCallback(
    async (label: string) => {
      const files = vfs.getAllFiles().map((f) => ({ path: f.path, content: f.content }));
      if (files.length === 0) return;

      const snap: ProjectSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        label: label.slice(0, 50),
        files,
      };
      setSnapshots((prev) => [...prev.slice(-19), snap]);

      const dbSnap = await persistence.saveSnapshotToDb(label.slice(0, 50), files);
      if (dbSnap) {
        setSnapshots((prev) => prev.map((s) => (s.id === snap.id ? { ...s, id: dbSnap.id } : s)));
      }
    },
    [vfs, persistence]
  );

  // ── Restore snapshot ──────────────────────────────────────────────────────
  const restoreSnapshot = useCallback(
    async (id: string) => {
      const snap = snapshots.find((s) => s.id === id);
      if (!snap) return;

      let files = snap.files;
      if (files.length === 0) {
        files = await persistence.loadSnapshotFiles(id);
      }

      for (const path of vfs.listFiles()) vfs.deleteFile(path);
      for (const { path, content } of files) vfs.writeFile(path, content);

      setShowHistory(false);
      setRestoreConfirm(null);
    },
    [snapshots, vfs, persistence]
  );

  // ── Sync files + messages after each AI turn ──────────────────────────────
  const handleTurnComplete = useCallback(
    (messages: { id: string; role: string; parts: unknown[] }[]) => {
      const files = vfs.getAllFiles().map((f) => ({ path: f.path, content: f.content }));
      persistence.syncFiles(files);
      persistence.syncMessages(messages);
    },
    [vfs, persistence]
  );

  // Show a minimal loading screen while fetching an existing project
  if (persistence.loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1c1c1c]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <p className="text-[#6b7080] text-xs">Loading project…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1c1c1c] overflow-hidden">
      <Header
        showEditor={showEditor}
        onToggleEditor={() => setShowEditor((v) => !v)}
        snapshots={snapshots}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory((v) => !v)}
        onRestoreSnapshot={(id) => setRestoreConfirm(id)}
        fileCount={vfs.listFiles().length}
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex flex-col border-r border-[#252525] shrink-0 transition-all duration-300"
          style={{ width: showEditor ? '30%' : '40%', minWidth: 320, maxWidth: 480 }}
        >
          <ChatPanel
            className="flex-1 overflow-hidden"
            onBeforeSend={saveSnapshot}
            onTurnComplete={handleTurnComplete}
            initialPrompt={initialPrompt}
            initialMessages={persistence.initialMessages}
          />
        </div>

        {showEditor && (
          <div
            className="flex flex-col border-r border-[#252525] animate-slide-in overflow-hidden"
            style={{ width: '35%', minWidth: 280 }}
          >
            <CodeEditor className="flex-1 overflow-hidden" />
          </div>
        )}

        <div className="flex-1 overflow-hidden" style={{ minWidth: 350 }}>
          <PhonePreview className="h-full" />
        </div>
      </div>

      {restoreConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setRestoreConfirm(null)}
        >
          <div
            className="bg-[#222222] border border-[#3a3a3a] rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#f0f0f5] text-sm font-semibold mb-2">Restore version?</h3>
            <p className="text-[#6b7080] text-xs mb-5 leading-relaxed">
              This will overwrite all current files. Any unsaved AI changes will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRestoreConfirm(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#6b7080] hover:text-[#f0f0f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreSnapshot(restoreConfirm)}
                className="px-3 py-1.5 rounded-lg text-[#1c1c1c] text-xs font-medium transition-colors"
                style={{ background: '#ffffff' }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({
  initialPrompt,
  projectId,
}: {
  initialPrompt?: string;
  projectId?: string;
}) {
  return (
    <VFSProvider initialFiles={INITIAL_FILES}>
      <PreviewProvider>
        <Layout initialPrompt={initialPrompt} projectId={projectId} />
      </PreviewProvider>
    </VFSProvider>
  );
}
