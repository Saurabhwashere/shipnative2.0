'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type DynamicToolUIPart, type TextUIPart } from 'ai';
import { useVFS } from '@/contexts/VFSContext';
import ToolCallCard from './ToolCallCard';

function resizeImageToDataUrl(
  file: File,
  maxPx = 1200,
  quality = 0.85,
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), mimeType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

const MAX_AUTO_RETRIES = 3;

// Generates a temporary App.jsx that renders a single screen in isolation.
function makeScreenPreview(componentName: string, importPath: string): string {
  return `import React from 'react';
import { View } from 'react-native';
import ${componentName} from './${importPath}';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <${componentName} />
    </View>
  );
}
`;
}

const SUGGESTION_CHIPS = [
  { category: 'FITNESS', label: 'Workout tracker with charts', prompt: 'Build a fitness tracker app with workout logging and progress charts' },
  { category: 'PRODUCTIVITY', label: 'Todo list with categories', prompt: 'Build a todo list app with categories and priority levels' },
  { category: 'LIFESTYLE', label: 'Recipe book & favorites', prompt: 'Build a recipe book app where you can browse and save recipes' },
  { category: 'WELLNESS', label: 'Habit tracker with streaks', prompt: 'Build a habit tracker app with streaks and daily reminders' },
];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

interface ChatPanelProps {
  className?: string;
  onBeforeSend?: (label: string) => void;
  onTurnComplete?: (messages: ReturnType<typeof useChat>['messages']) => void;
  initialPrompt?: string;
  initialMessages?: { id: string; role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] }[];
}

export default function ChatPanel({ className = '', onBeforeSend, onTurnComplete, initialPrompt, initialMessages }: ChatPanelProps) {
  const { vfs } = useVFS();
  const [input, setInput] = useState('');
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [referenceImage, setReferenceImage] = useState<{
    dataUrl: string; mimeType: string; fileName: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const writtenToolCallsRef = useRef(new Set<string>());
  const realAppWrittenRef = useRef(false); // true once AI writes the real App.jsx
  const autoRetryCountRef = useRef(0);
  const lastAutoErrorRef = useRef<string | null>(null);
  const [autoFixToast, setAutoFixToast] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskLabel, setEditingTaskLabel] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgTimestampsRef = useRef<Map<string, number>>(new Map());

  // ── Stable VFS ref ────────────────────────────────────────────────────────
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  // ── Stable reference image ref (mirrors vfsRef pattern) ──────────────────
  const referenceImageRef = useRef<{ dataUrl: string; mimeType: string; fileName: string; } | null>(null);
  referenceImageRef.current = referenceImage;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transport = useRef(
    new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ body, messages }) => ({
        body: {
          ...body,
          messages,
          projectFiles: vfsRef.current.getAllFiles().map((f) => ({
            path: f.path,
            content:
              f.content.length > 12000
                ? f.content.slice(0, 12000) + '\n... (truncated)'
                : f.content,
          })),
          referenceImage: referenceImageRef.current
            ? { dataUrl: referenceImageRef.current.dataUrl, mimeType: referenceImageRef.current.mimeType }
            : null,
        },
      }),
    }),
  ).current;

  const { messages, sendMessage, stop, status, error, clearError } = useChat({
    transport,
    ...(initialMessages && initialMessages.length > 0 ? { messages: initialMessages as any } : {}),
    onToolCall({ toolCall }) {
      const tc = toolCall as { toolName: string; input: unknown; dynamic?: boolean };
      if (tc.toolName === 'writeFile') {
        const { path, code } = tc.input as { path: string; code: string };
        if (path && code) vfsRef.current.writeFile(path.replace(/^\/+/, ''), code);
      } else if (tc.toolName === 'fixError') {
        const { filePath, correctedCode } = tc.input as { filePath: string; correctedCode: string };
        if (filePath && correctedCode) vfsRef.current.writeFile(filePath.replace(/^\/+/, ''), correctedCode);
      }
    },
  });

  // Track message timestamps
  useEffect(() => {
    for (const msg of messages) {
      if (!msgTimestampsRef.current.has(msg.id)) {
        msgTimestampsRef.current.set(msg.id, Date.now());
      }
    }
  }, [messages]);

  // ── Sync writeFile + fixError tool inputs → VFS ───────────────────────────
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      for (const part of msg.parts) {
        if (part.type !== 'dynamic-tool') continue;
        const tp = part as DynamicToolUIPart;
        if (tp.state !== 'input-available' && tp.state !== 'output-available') continue;
        if (writtenToolCallsRef.current.has(tp.toolCallId)) continue;
        if (tp.toolName === 'writeFile') {
          const input = tp.input as { path?: string; code?: string } | undefined;
          if (!input?.path || !input?.code) continue;
          writtenToolCallsRef.current.add(tp.toolCallId);
          const normalizedPath = input.path.replace(/^\/+/, '');
          vfs.writeFile(normalizedPath, input.code);

          // Progressive preview: wrap each screen in isolation until App.jsx is ready
          const isApp = /^app\.(jsx?|tsx?)$/i.test(normalizedPath.split('/').pop() ?? '');
          if (isApp) {
            realAppWrittenRef.current = true;
          } else if (!realAppWrittenRef.current) {
            const fileName = normalizedPath.split('/').pop() ?? '';
            const isComponent = /^[A-Z]/.test(fileName) && /\.(jsx?|tsx?)$/.test(fileName);
            if (isComponent) {
              const importName = fileName.replace(/\.(jsx?|tsx?)$/, '');
              const importPath = normalizedPath.replace(/\.(jsx?|tsx?)$/, '');
              vfs.writeFile('App.jsx', makeScreenPreview(importName, importPath));
            }
          }
        } else if (tp.toolName === 'fixError') {
          const input = tp.input as { filePath?: string; correctedCode?: string } | undefined;
          if (!input?.filePath || !input?.correctedCode) continue;
          writtenToolCallsRef.current.add(tp.toolCallId);
          vfs.writeFile(input.filePath.replace(/^\/+/, ''), input.correctedCode);
        }
      }
    }
  }, [messages, vfs]);

  // ── Auto-recovery ─────────────────────────────────────────────────────────
  useEffect(() => {
    function handlePreviewError(e: Event) {
      const message = (e as CustomEvent<{ message: string }>).detail.message;
      if (!message) return;
      if (message === lastAutoErrorRef.current) return;
      if (autoRetryCountRef.current >= MAX_AUTO_RETRIES) return;
      if (status !== 'ready') return;
      lastAutoErrorRef.current = message;
      autoRetryCountRef.current++;
      setAutoFixToast(`Fixing preview error (attempt ${autoRetryCountRef.current}/${MAX_AUTO_RETRIES})…`);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setAutoFixToast(null), 4000);
      sendMessage({ text: `Runtime error in the preview: "${message}". Please examine the code and fix the bug using the fixError tool.` });
    }
    window.addEventListener('preview-error', handlePreviewError);
    return () => window.removeEventListener('preview-error', handlePreviewError);
  }, [status, sendMessage]);


  // ── Smart auto-scroll ─────────────────────────────────────────────────────
  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  useEffect(() => {
    if (isAtBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // ── Notify parent when a turn completes so it can sync files + messages ───
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== 'ready' && status === 'ready') {
      onTurnComplete?.(messages);
    }
    prevStatusRef.current = status;
  }, [status, onTurnComplete, messages]);

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 168) + 'px'; }
  };

  const doSend = useCallback((text: string) => {
    const hasImage = !!referenceImageRef.current;
    if ((!text.trim() && !hasImage) || status === 'submitted' || status === 'streaming') return;
    autoRetryCountRef.current = 0;
    lastAutoErrorRef.current = null;
    onBeforeSend?.(text.trim());
    sendMessage({ text: text.trim() || ' ' });
    // NOTE: do NOT clear referenceImage here — it must persist across all API calls
    // in the workflow (askQuestions → proposePlan → writeFiles). It is cleared automatically
    // once files have been written (see useEffect below).
  }, [status, sendMessage, onBeforeSend]);

  // ── Auto-fire initial prompt from landing page ────────────────────────────
  // Only fires when there are NO existing messages — prevents re-sending on reload.
  const initialPromptFiredRef = useRef(false);
  useEffect(() => {
    if (!initialPrompt || initialPromptFiredRef.current || status !== 'ready') return;
    if (messages.length > 0) return; // existing conversation restored — don't re-send
    initialPromptFiredRef.current = true;
    // Clean up the ?prompt= from the URL so refresh doesn't re-trigger this
    window.history.replaceState(null, '', window.location.pathname);
    doSend(initialPrompt);
  }, [initialPrompt, status, doSend, messages.length]);

  // ── Element select-and-edit requests from the preview ────────────────────
  useEffect(() => {
    function handleElementEdit(e: Event) {
      const { element, prompt } = (e as CustomEvent<{ element: string; prompt: string }>).detail;
      const elementContext = element ? ` The selected element contains the text: "${element}".` : '';
      doSend(`Please make this change to the app:${elementContext} ${prompt}`);
    }
    window.addEventListener('element-edit-request', handleElementEdit);
    return () => window.removeEventListener('element-edit-request', handleElementEdit);
  }, [doSend]);

  const handleSend = useCallback(() => {
    doSend(input);
    setInput('');
    const ta = textareaRef.current;
    if (ta) ta.style.height = '64px';
  }, [input, doSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!file) return;
      try {
        const { dataUrl, mimeType } = await resizeImageToDataUrl(file);
        setReferenceImage({ dataUrl, mimeType, fileName: file.name });
      } catch { /* silently ignore */ }
    },
    [],
  );

  const isLoading = status === 'submitted' || status === 'streaming';

  // ── Build plan tracking ───────────────────────────────────────────────────
  const { approvedPlanSteps, approvalIndex } = useMemo(() => {
    let approvalIndex = -1;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        const textPart = msg.parts.find((p): p is TextUIPart => p.type === 'text');
        if (textPart?.text?.toLowerCase().includes('plan approved')) approvalIndex = i;
      }
    }
    if (approvalIndex === -1) return { approvedPlanSteps: null, approvalIndex: -1 };
    for (let i = approvalIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;
      for (const part of msg.parts) {
        if (part.type !== 'dynamic-tool') continue;
        const tp = part as DynamicToolUIPart;
        if (tp.toolName !== 'proposePlan') continue;
        const inp = tp.input as { buildSteps?: Array<{ id: string; label: string; files: string[] }> } | undefined;
        if (inp?.buildSteps) return { approvedPlanSteps: inp.buildSteps, approvalIndex };
      }
    }
    return { approvedPlanSteps: null, approvalIndex: -1 };
  }, [messages]);

  const writtenFiles = useMemo(() => {
    const files: string[] = [];
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      for (const part of msg.parts) {
        if (part.type !== 'dynamic-tool') continue;
        const tp = part as DynamicToolUIPart;
        if (tp.toolName !== 'writeFile' || tp.state !== 'output-available') continue;
        const inp = tp.input as { path?: string } | undefined;
        if (inp?.path) files.push(inp.path.replace(/^\/+/, ''));
      }
    }
    return files;
  }, [messages]);

  // Auto-clear design reference once the first file is written — the design DNA has been applied.
  useEffect(() => {
    if (writtenFiles.length > 0 && referenceImageRef.current) {
      setReferenceImage(null);
    }
  }, [writtenFiles.length]);

  const showBuildProgress = useMemo(() => {
    if (!approvedPlanSteps || approvalIndex === -1) return false;
    const allDone = approvedPlanSteps.every(
      (step) => step.files.length === 0 || step.files.some((f) => writtenFiles.includes(f)),
    );
    if (!allDone) return true;
    const hasFollowUp = messages.slice(approvalIndex + 1).some((msg) => {
      if (msg.role !== 'user') return false;
      const textPart = msg.parts.find((p): p is TextUIPart => p.type === 'text');
      return textPart?.text && !textPart.text.toLowerCase().includes('plan approved');
    });
    return !hasFollowUp;
  }, [approvedPlanSteps, approvalIndex, writtenFiles, messages]);

  const pendingTasks = useMemo(() => {
    if (!approvedPlanSteps) return [];
    return approvedPlanSteps.filter(
      (step) => step.files.length > 0 && !step.files.some((f) => writtenFiles.includes(f)),
    );
  }, [approvedPlanSteps, writtenFiles]);

  // ── Broadcast build status so PhonePreview can drive neon glow ────────────
  useEffect(() => {
    const building = !!approvedPlanSteps && (pendingTasks.length > 0 || isLoading);
    window.dispatchEvent(new CustomEvent('build-status', { detail: { building } }));
  }, [approvedPlanSteps, pendingTasks.length, isLoading]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col bg-[#1c1c1c] ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Message list ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ padding: '24px 20px' }}
      >
        {/* Empty / welcome state */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-4">
            <div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow-pulse"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 0 20px rgba(255,255,255,0.05)',
                }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-[#f0f0f5] text-base font-semibold mb-1">What do you want to build?</p>
              <p className="text-[#6b7080] text-xs leading-relaxed">Describe your app — ShipNative plans, writes, and previews it in seconds.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => doSend(chip.prompt)}
                  className="px-3 py-2.5 rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] hover:border-white/20 hover:bg-white/5 transition-all text-left"
                >
                  <p className="text-[10px] text-[--color-accent] font-medium uppercase tracking-wide mb-0.5">{chip.category}</p>
                  <p className="text-xs text-[--color-text-dim] leading-snug">{chip.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => {
          const ts = msgTimestampsRef.current.get(message.id);

          // ── User message ──
          if (message.role === 'user') {
            const textPart = message.parts.find((p): p is TextUIPart => p.type === 'text');
            return (
              <div key={message.id} className="flex justify-end mb-5 animate-fade-in">
                <div style={{ maxWidth: '72%' }}>
                  <div
                    className="rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{ background: 'var(--color-hover)', color: '#f0f0f5', border: '1px solid var(--color-tool-border)' }}
                  >
                    {textPart?.text ?? ''}
                  </div>
                  {ts && (
                    <p className="text-[10px] text-right mt-1" style={{ color: '#3d4055' }}>
                      {formatTime(ts)}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          // ── Assistant message ──
          if (message.role === 'assistant') {
            const hasText = message.parts.some((p) => p.type === 'text' && (p as TextUIPart).text);
            return (
              <div key={message.id} className="mb-5 animate-fade-in flex items-start gap-2">
                {/* AI avatar dot */}
                <div
                  className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                {message.parts.map((part, i) => {
                  if (part.type === 'text') {
                    const tp = part as TextUIPart;
                    if (!tp.text) return null;
                    return (
                      <p
                        key={i}
                        className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {tp.text}
                      </p>
                    );
                  }
                  if (part.type === 'dynamic-tool') {
                    return <ToolCallCard key={`${message.id}-${i}`} part={part as DynamicToolUIPart} onSend={doSend} />;
                  }
                  return null;
                })}

                {/* Reaction row */}
                {hasText && (
                  <div className="flex items-center gap-3 mt-2">
                    {/* Reply */}
                    <button className="transition-colors" style={{ color: '#3d4055' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#6b7080')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3d4055')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    </button>
                    {/* Thumbs up */}
                    <button className="transition-colors" style={{ color: '#3d4055' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3d4055')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    {/* Thumbs down */}
                    <button className="transition-colors" style={{ color: '#3d4055' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3d4055')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                    {ts && (
                      <span className="ml-auto text-[10px]" style={{ color: '#3d4055' }}>
                        {formatTime(ts)}
                      </span>
                    )}
                  </div>
                )}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Streaming status */}
        {isLoading && (
          <div className="mb-4 animate-fade-in flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/30">Working</span>
              <span className="flex gap-1 items-center">
                <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(255,255,255,0.3)', animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(255,255,255,0.3)', animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(255,255,255,0.3)', animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {/* API error */}
        {error && (
          <div
            className="my-3 p-3 rounded-xl animate-fade-in"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium mb-0.5" style={{ color: '#f87171' }}>API Error</p>
                <p className="text-[10px] font-mono break-words" style={{ color: '#6b7080' }}>{error.message}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => { clearError(); handleSend(); }}
                  className="text-[10px] font-medium transition-colors px-1.5 py-0.5 rounded"
                  style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)' }}
                >
                  Retry
                </button>
                <button onClick={clearError} style={{ color: '#6b7080' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Design reference chip ── */}
      {referenceImage && (
        <div className="mx-4 mb-1 animate-fade-in" style={{ paddingTop: 6 }}>
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <img
              src={referenceImage.dataUrl}
              alt="Design reference"
              className="rounded-md object-cover shrink-0"
              style={{ width: 48, height: 48 }}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                {isLoading ? 'Applying style…' : 'Design reference'}
              </span>
              <span className="text-[11px] truncate max-w-[140px]" style={{ color: 'var(--color-text-dim)' }}>
                {referenceImage.fileName}
              </span>
            </div>
            <button
              onClick={() => setReferenceImage(null)}
              className="shrink-0 transition-colors"
              style={{ color: '#3d4055' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3d4055')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Auto-fix toast ── */}
      {autoFixToast && (
        <div
          className="mx-3 mb-1 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-fade-in"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <svg className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[11px]" style={{ color: '#fbbf24' }}>{autoFixToast}</p>
        </div>
      )}

      {/* ── Tasks toggle panel — above input ── */}
      {showBuildProgress && approvedPlanSteps && (
        <div style={{ borderTop: '1px solid #3a3a3a', background: 'rgba(38,38,38,0.85)' }}>
          {/* Header */}
          <button
            className="w-full flex items-center gap-2 px-4 py-3 transition-colors text-left"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => setTasksExpanded((v) => !v)}
          >
            {/* Status dot */}
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: pendingTasks.length > 0 ? '#fbbf24' : '#34d399',
                boxShadow: pendingTasks.length > 0 ? '0 0 6px rgba(251,191,36,0.4)' : 'none',
              }}
            />
            <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Tasks</span>
            {pendingTasks.length > 0 && (
              <span className="text-xs" style={{ color: '#6b7080' }}>(Action Required)</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {pendingTasks.length > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-md border"
                  style={{
                    background: 'rgba(251,191,36,0.1)',
                    borderColor: 'rgba(251,191,36,0.25)',
                    color: '#fbbf24',
                  }}
                >
                  {pendingTasks.length} pending
                </span>
              )}
              {/* Chevron */}
              <svg
                className="w-4 h-4 transition-transform"
                style={{ color: '#6b7080', transform: tasksExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </button>

          {/* Task rows */}
          {tasksExpanded && (
            <div style={{ borderTop: '1px solid #3a3a3a' }}>
              {approvedPlanSteps.map((step, i) => {
                const isDone = step.files.length === 0 || step.files.some((f) => writtenFiles.includes(f));
                const isActive = isLoading && !isDone && approvedPlanSteps.findIndex(
                  (s) => s.files.length > 0 && !s.files.some((f) => writtenFiles.includes(f))
                ) === i;
                const isPending = !isDone && !isActive;
                const isEditing = editingTaskId === step.id;
                const canEdit = isPending && !isLoading;

                return (
                  <div
                    key={step.id}
                    className="px-4 py-2.5"
                    style={{
                      borderBottom: '1px solid rgba(58,58,58,0.6)',
                      background: isActive ? 'rgba(255,255,255,0.03)' : isEditing ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    {isEditing ? (
                      /* ── Edit mode ── */
                      <div className="flex flex-col gap-2">
                        <textarea
                          autoFocus
                          value={editingTaskLabel}
                          onChange={(e) => setEditingTaskLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (editingTaskLabel.trim()) {
                                doSend(editingTaskLabel.trim());
                                setEditingTaskId(null);
                                setEditingTaskLabel('');
                              }
                            }
                            if (e.key === 'Escape') {
                              setEditingTaskId(null);
                              setEditingTaskLabel('');
                            }
                          }}
                          rows={2}
                          className="w-full text-xs resize-none outline-none leading-relaxed rounded-lg px-3 py-2"
                          style={{
                            background: '#1c1c1c',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#f0f0f5',
                            caretColor: '#ffffff',
                          }}
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setEditingTaskId(null); setEditingTaskLabel(''); }}
                            className="px-2.5 py-1 rounded-md text-[11px] transition-colors"
                            style={{ color: '#6b7080', background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f5')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6b7080')}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editingTaskLabel.trim()) {
                                doSend(editingTaskLabel.trim());
                                setEditingTaskId(null);
                                setEditingTaskLabel('');
                              }
                            }}
                            disabled={!editingTaskLabel.trim()}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all disabled:opacity-40"
                            style={{ background: '#ffffff', color: '#1c1c1c' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
                            </svg>
                            Send
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal row ── */
                      <div className="group flex items-center gap-2.5">
                        {/* Status indicator */}
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {isDone ? (
                            <svg className="w-3.5 h-3.5" style={{ color: '#34d399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <svg className="w-3.5 h-3.5 animate-spin" style={{ color: '#ffffff' }} fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3d4055' }} />
                          )}
                        </div>

                        <span
                          className={`text-xs flex-1 leading-snug ${isDone ? 'opacity-50 line-through' : ''}`}
                          style={{ color: isDone ? 'var(--color-text-dim)' : isActive ? '#f0f0f5' : 'var(--color-text-secondary)' }}
                        >
                          {step.label}
                        </span>

                        {/* Edit button — only on pending tasks when not loading */}
                        {canEdit && (
                          <button
                            onClick={() => { setEditingTaskId(step.id); setEditingTaskLabel(step.label); }}
                            className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors opacity-0 group-hover:opacity-100"
                            style={{ color: '#3d4055' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f5')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#3d4055')}
                            title="Edit task"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        {/* Locked icon — when task is pending but AI is running */}
                        {isPending && isLoading && (
                          <svg className="w-3 h-3 shrink-0 opacity-30" style={{ color: '#6b7080' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{ borderTop: '1px solid #3a3a3a', padding: '12px 16px' }}>
        <div
          className="rounded-xl transition-all"
          style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
          onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
          onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3a3a3a'; }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            rows={2}
            disabled={isLoading}
            className="w-full bg-transparent text-sm resize-none outline-none leading-relaxed disabled:opacity-60"
            style={{
              color: '#f0f0f5',
              caretColor: '#ffffff',
              padding: '14px 14px 6px',
              height: '64px',
              maxHeight: '168px',
              overflow: 'hidden',
            }}
          />
          {/* Bottom bar */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <div className="flex items-center gap-2">
              {/* Image upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ color: referenceImage ? 'var(--color-accent)' : '#3d4055' }}
                onMouseEnter={e => (e.currentTarget.style.color = referenceImage ? '#f0f0f5' : '#6b7080')}
                onMouseLeave={e => (e.currentTarget.style.color = referenceImage ? 'var(--color-accent)' : '#3d4055')}
                title="Attach design reference screenshot"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" ry="3" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.8} />
                  <polyline points="21 15 16 10 5 21" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isLoading ? (
                <button
                  onClick={stop}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                  style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}
                  title="Stop"
                >
                  <svg className="w-3 h-3" style={{ color: '#f87171' }} fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && !referenceImage}
                  className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: (input.trim() || referenceImage) ? '#ffffff' : '#3a3a3a',
                    color: (input.trim() || referenceImage) ? '#1c1c1c' : '#6b7080',
                    boxShadow: 'none',
                  }}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
