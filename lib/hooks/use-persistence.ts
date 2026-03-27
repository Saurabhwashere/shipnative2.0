'use client';

import { useState, useCallback, useRef } from 'react';

export interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: { type: 'text'; text: string }[];
}

interface SnapshotMeta {
  id: string;
  label: string;
  file_count: number;
  created_at: string;
}

interface PersistenceState {
  projectId: string | null;
  conversationId: string | null;
  snapshots: SnapshotMeta[];
  initialFiles: { path: string; content: string }[];
  initialMessages: PersistedMessage[];
  ready: boolean;
  loading: boolean;
}

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_PERSISTENCE === 'true';

export function usePersistence(projectId?: string) {
  const [state, setState] = useState<PersistenceState>({
    projectId: null,
    conversationId: null,
    snapshots: [],
    initialFiles: [],
    initialMessages: [],
    ready: false,
    loading: !!projectId, // start in loading state if we have a projectId to load
  });
  const initCalledRef = useRef(false);
  const persistedMsgIdsRef = useRef(new Set<string>());

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  const init = useCallback(async (onNewProject?: (projectId: string) => void) => {
    if (!ENABLED || initCalledRef.current) return;
    initCalledRef.current = true;

    try {
      // Ensure user row exists
      await fetch('/api/user/sync', { method: 'POST' });

      if (projectId) {
        // ── LOAD existing project ──────────────────────────────────────────
        const [filesRes, snapsRes, convRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/files`),
          fetch(`/api/projects/${projectId}/snapshots`),
          fetch(`/api/projects/${projectId}/conversations/active`),
        ]);

        const [files, snapshots, conversation] = await Promise.all([
          filesRes.json(),
          snapsRes.json(),
          convRes.ok ? convRes.json() : null,
        ]);

        // Load messages for the active conversation
        let initialMessages: PersistedMessage[] = [];
        if (conversation?.id) {
          const msgsRes = await fetch(`/api/conversations/${conversation.id}/messages`);
          const dbMessages = msgsRes.ok ? await msgsRes.json() : [];

          // Reconstruct AI SDK message format from DB rows
          initialMessages = dbMessages
            .filter((m: any) => m.content?.trim())
            .map((m: any) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
            }));

          // Mark existing messages as already persisted
          dbMessages.forEach((m: any) => persistedMsgIdsRef.current.add(m.id));
        }

        setState({
          projectId,
          conversationId: conversation?.id ?? null,
          snapshots: Array.isArray(snapshots) ? snapshots : [],
          initialFiles: Array.isArray(files) ? files.map((f: any) => ({ path: f.path, content: f.content })) : [],
          initialMessages,
          ready: true,
          loading: false,
        });
      } else {
        // ── CREATE new project ─────────────────────────────────────────────
        const projRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Untitled App' }),
        });
        const project = await projRes.json();

        const convRes = await fetch(`/api/projects/${project.id}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Conversation 1' }),
        });
        const conversation = await convRes.json();

        setState({
          projectId: project.id,
          conversationId: conversation.id,
          snapshots: [],
          initialFiles: [],
          initialMessages: [],
          ready: true,
          loading: false,
        });

        // Tell AppShell to redirect to /studio/[projectId]
        onNewProject?.(project.id);
      }
    } catch (err) {
      console.error('[persistence] init failed:', err);
      setState((prev) => ({ ...prev, ready: true, loading: false }));
    }
  }, [projectId]);

  // ── Sync VFS files to DB ───────────────────────────────────────────────────
  const syncFiles = useCallback(
    async (files: { path: string; content: string }[]) => {
      if (!ENABLED || !state.projectId) return;
      try {
        await fetch(`/api/projects/${state.projectId}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files }),
        });
      } catch (err) {
        console.error('[persistence] syncFiles failed:', err);
      }
    },
    [state.projectId]
  );

  // ── Sync new messages to DB ────────────────────────────────────────────────
  const syncMessages = useCallback(
    async (messages: { id: string; role: string; parts: unknown[] }[]) => {
      if (!ENABLED || !state.conversationId) return;

      const newMsgs = messages.filter((m) => !persistedMsgIdsRef.current.has(m.id));
      if (newMsgs.length === 0) return;

      const rows = newMsgs.map((m) => {
        const parts = m.parts as { type: string; text?: string; toolName?: string; input?: unknown; output?: unknown }[];
        const textContent = parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('');
        const toolPart = parts.find((p) => p.type === 'dynamic-tool' || p.type === 'tool-invocation');
        return {
          role: m.role,
          content: textContent,
          toolName: toolPart?.toolName ?? null,
          toolInput: toolPart?.input ?? null,
          toolResult: toolPart?.output ?? null,
        };
      });

      try {
        await fetch(`/api/conversations/${state.conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: rows }),
        });
        newMsgs.forEach((m) => persistedMsgIdsRef.current.add(m.id));
      } catch (err) {
        console.error('[persistence] syncMessages failed:', err);
      }
    },
    [state.conversationId]
  );

  // ── Save snapshot ──────────────────────────────────────────────────────────
  const saveSnapshotToDb = useCallback(
    async (label: string, files: { path: string; content: string }[]) => {
      if (!ENABLED || !state.projectId) return null;
      try {
        const res = await fetch(`/api/projects/${state.projectId}/snapshots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label, files, conversationId: state.conversationId, triggeredBy: 'user' }),
        });
        const snap = await res.json();
        setState((prev) => ({ ...prev, snapshots: [snap, ...prev.snapshots].slice(0, 20) }));
        return snap;
      } catch (err) {
        console.error('[persistence] saveSnapshot failed:', err);
        return null;
      }
    },
    [state.projectId, state.conversationId]
  );

  // ── Load snapshot files for restore ───────────────────────────────────────
  const loadSnapshotFiles = useCallback(async (snapshotId: string) => {
    if (!ENABLED) return [];
    try {
      const res = await fetch(`/api/snapshots/${snapshotId}`);
      const data = await res.json();
      return (data.files ?? []) as { path: string; content: string }[];
    } catch (err) {
      console.error('[persistence] loadSnapshotFiles failed:', err);
      return [];
    }
  }, []);

  // ── Delete snapshot ────────────────────────────────────────────────────────
  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    if (!ENABLED) return;
    try {
      await fetch(`/api/snapshots/${snapshotId}`, { method: 'DELETE' });
      setState((prev) => ({ ...prev, snapshots: prev.snapshots.filter((s) => s.id !== snapshotId) }));
    } catch (err) {
      console.error('[persistence] deleteSnapshot failed:', err);
    }
  }, []);

  return {
    ...state,
    init,
    syncFiles,
    syncMessages,
    saveSnapshotToDb,
    loadSnapshotFiles,
    deleteSnapshot,
  };
}
