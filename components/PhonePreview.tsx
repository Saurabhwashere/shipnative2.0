'use client';

import { useEffect, useRef, useState } from 'react';
import IPhoneFrame from './IPhoneFrame';
import { usePreview } from '@/contexts/PreviewContext';
import { useVFS } from '@/contexts/VFSContext';
import PixelVillage from './PixelVillage';

interface PhonePreviewProps {
  className?: string;
}

const INJECTED_CSS = `
  html {
    width: 100vw !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: none !important;
    background: transparent !important;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    min-height: 100% !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior-y: contain !important;
    -webkit-overflow-scrolling: touch !important;
    position: relative !important;
    background: transparent !important;
  }
  #root, [data-reactroot], body > div:first-child {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100% !important;
    overflow-x: hidden !important;
  }
  ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
  * {
    scrollbar-width: none !important;
    box-sizing: border-box !important;
    -webkit-tap-highlight-color: transparent;
  }
  img, video, canvas, iframe { max-width: 100% !important; }
`;

const SELECT_CSS = `
  .__sn_h {
    outline: 2px solid rgba(255,255,255,0.7) !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
    border-radius: 3px !important;
  }
`;

const SELECT_JS = `
(function () {
  if (window.__sn_sel) return;
  window.__sn_sel = true;
  var cur = null;
  function over(e) {
    if (cur) cur.classList.remove('__sn_h');
    cur = e.target;
    if (cur) cur.classList.add('__sn_h');
  }
  function click(e) {
    e.stopPropagation();
    e.preventDefault();
    var el = e.target;
    var text = (el.innerText || el.textContent || '').trim().slice(0, 300);
    window.parent.postMessage({ type: 'sn-sel', text: text }, '*');
  }
  document.addEventListener('mouseover', over, true);
  document.addEventListener('click', click, true);
})();
`;

export default function PhonePreview({ className = '' }: PhonePreviewProps) {
  const { isReady, previewUrl, previewError, refreshPreview, registerIframe } = usePreview();
  const { vfs } = useVFS();
  const [showVillage, setShowVillage] = useState(true);
  const [showNeonGlow, setShowNeonGlow] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [frameMode, setFrameMode] = useState<'device' | 'canvas'>('device');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState<{ text: string } | null>(null);
  const [selectPrompt, setSelectPrompt] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selectModeRef = useRef(false);
  const selectPromptRef = useRef<HTMLInputElement>(null);

  useEffect(() => { selectModeRef.current = selectMode; }, [selectMode]);

  // Unregister iframe window on unmount so the pipeline doesn't hold a stale reference
  useEffect(() => () => registerIframe(null), []);

  // Hide village as soon as AI writes the first file to the VFS
  useEffect(() => {
    if (!showVillage) return;
    const unsub = vfs.onChange(() => {
      setShowVillage(false);
    });
    return unsub;
  }, [vfs, showVillage]);

  // Track build status from ChatPanel for neon glow
  useEffect(() => {
    function onBuildStatus(e: Event) {
      const building = (e as CustomEvent<{ building: boolean }>).detail.building;
      setShowNeonGlow(building);
      setIsBuilding(building);
    }
    window.addEventListener('build-status', onBuildStatus);
    return () => window.removeEventListener('build-status', onBuildStatus);
  }, []);

  function injectSelectHandler(enable: boolean) {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc?.head) return;
      doc.getElementById('_sn_sel_css')?.remove();
      doc.getElementById('_sn_sel_js')?.remove();
      if (!enable) {
        doc.querySelectorAll('.__sn_h').forEach((el) => el.classList.remove('__sn_h'));
        return;
      }
      const style = doc.createElement('style');
      style.id = '_sn_sel_css';
      style.textContent = SELECT_CSS;
      doc.head.appendChild(style);
      const script = doc.createElement('script');
      script.id = '_sn_sel_js';
      script.textContent = SELECT_JS;
      doc.body.appendChild(script);
    } catch {
      // cross-origin — nothing we can do
    }
  }

  function injectStyles() {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || !doc.head) return;

      let meta = doc.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = doc.createElement('meta') as HTMLMetaElement;
        meta.name = 'viewport';
        doc.head.insertBefore(meta, doc.head.firstChild);
      }
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

      doc.getElementById('_shipnative_css')?.remove();
      const style = doc.createElement('style');
      style.id = '_shipnative_css';
      style.textContent = INJECTED_CSS;
      doc.head.appendChild(style);

      if (selectModeRef.current) injectSelectHandler(true);
    } catch {
      // Cross-origin — nothing we can do
    }
  }

  useEffect(() => {
    injectSelectHandler(selectMode);
    if (!selectMode) setSelectedEl(null);
  }, [selectMode]);

  // Focus the prompt input when an element is selected
  useEffect(() => {
    if (selectedEl) {
      setTimeout(() => selectPromptRef.current?.focus(), 50);
    }
  }, [selectedEl]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'hmr-full-reload') {
        refreshPreview();
      }
      if (event.data?.type === 'preview-error') {
        const message: string = event.data.message ?? 'Unknown error';
        setIframeError(message);
        // Clear the registered iframe window so the pipeline cannot attempt an
        // HMR patch to a dead iframe (one whose bundle failed to parse/execute).
        // The next rebuild will fall through to a full blob reload instead.
        registerIframe(null);
        window.dispatchEvent(
          new CustomEvent('preview-error', { detail: { message } }),
        );
      }
      if (event.data?.type === 'sn-sel') {
        setSelectedEl({ text: event.data.text });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  function handleReload() {
    setIframeError(null);
    refreshPreview();
  }

  function handleToggleSelect() {
    setSelectMode((v) => !v);
    setSelectedEl(null);
    setSelectPrompt('');
  }

  function handleSubmitPrompt() {
    if (!selectPrompt.trim() || !selectedEl) return;
    window.dispatchEvent(
      new CustomEvent('element-edit-request', {
        detail: { element: selectedEl.text, prompt: selectPrompt.trim() },
      }),
    );
    setSelectMode(false);
    setSelectedEl(null);
    setSelectPrompt('');
  }

  function handlePromptKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmitPrompt();
    if (e.key === 'Escape') { setSelectMode(false); setSelectedEl(null); setSelectPrompt(''); }
  }

  const displayError = previewError ?? iframeError;

  const loadingSlot = (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-4 text-center bg-[#1c1c1c]">
      {displayError ? (
        <>
          <div className="w-10 h-10 rounded-2xl bg-[--color-red]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[--color-red]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[--color-red] mb-1">Preview Error</p>
            <p className="text-[10px] text-[--color-text-dim] font-mono leading-relaxed">{displayError}</p>
          </div>
        </>
      ) : (
        <>
          <div
            className="w-7 h-7 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #ffffff, #34d399, #ffffff)',
              animation: 'spin 1s linear infinite',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 0)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 0)',
            }}
          />
          <p className="text-[11px] text-[--color-text-dim]">Starting preview engine…</p>
        </>
      )}
    </div>
  );

  const iframeSlot = (
    <iframe
      ref={iframeRef}
      src={previewUrl ?? ''}
      title="App Preview"
      sandbox="allow-scripts allow-same-origin"
      onLoad={() => {
        setIframeError(null); // clear previous runtime error on successful reload
        injectStyles();
        registerIframe(iframeRef.current?.contentWindow ?? null);
      }}
      onError={() => registerIframe(null)}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${className}`}
      style={{ background: 'var(--color-deep)' }}
    >
      <style>{`
        @keyframes neonCycle {
          0%   { box-shadow: 0 0 18px 3px #00f5ff, 0 0 50px 12px #00f5ff44, 0 0 90px 24px #00f5ff18; }
          25%  { box-shadow: 0 0 18px 3px #bf5fff, 0 0 50px 12px #bf5fff44, 0 0 90px 24px #bf5fff18; }
          50%  { box-shadow: 0 0 18px 3px #ff2d78, 0 0 50px 12px #ff2d7844, 0 0 90px 24px #ff2d7818; }
          75%  { box-shadow: 0 0 18px 3px #00ffb3, 0 0 50px 12px #00ffb344, 0 0 90px 24px #00ffb318; }
          100% { box-shadow: 0 0 18px 3px #00f5ff, 0 0 50px 12px #00f5ff44, 0 0 90px 24px #00f5ff18; }
        }
        @keyframes neonFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div className="flex-1 min-h-0 overflow-auto px-4 pt-5 pb-3">
        <div className="flex min-h-full flex-col items-center justify-center gap-4">
        <div
          className={`pointer-events-none transition-all duration-300 ${isBuilding ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
          aria-hidden={!isBuilding}
        >
          <div
            className="rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.22em] uppercase"
            style={{
              color: 'rgba(240,240,245,0.9)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.24)',
            }}
          >
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
              <span className="animate-build-label">Building Your App ...</span>
            </span>
          </div>
        </div>
        <div className="relative" style={{ filter: frameMode === 'device' ? 'drop-shadow(0 32px 64px rgba(0,0,0,0.58))' : 'none' }}>
          {/* Neon glow — visible while tasks are pending */}
          {showNeonGlow && (
            <div
              className="absolute pointer-events-none"
              style={{
                inset: -2,
                borderRadius: 54,
                zIndex: 5,
                animation: 'neonFadeIn 0.8s ease forwards, neonCycle 4s linear infinite',
              }}
            />
          )}

          {/* Select mode ring */}
          {selectMode && (
            <div
              className="absolute inset-0 rounded-[52px] pointer-events-none z-10"
              style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.4)', borderRadius: 52 }}
            />
          )}
          <IPhoneFrame mode={frameMode}>
            {showVillage && !displayError
              ? <PixelVillage />
              : displayError
                ? loadingSlot
                : isReady
                  ? iframeSlot
                  : loadingSlot}
          </IPhoneFrame>

          {/* Selection action bar — floats over bottom of phone */}
          {selectedEl && (
            <div
              className="absolute left-3 right-3 bottom-10 z-20 rounded-2xl overflow-hidden animate-fade-in"
              style={{ background: 'rgba(15,17,23,0.96)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            >
              {/* Selected element label */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span className="text-[10px] text-white font-medium truncate flex-1">{selectedEl.text || 'Element selected'}</span>
                <button
                  onClick={() => { setSelectedEl(null); }}
                  className="text-[#3d4055] hover:text-[#6b7080] transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* AI input */}
              <div className="border-t border-[#1f2133]/60 mx-3" />
              <div className="flex items-center gap-2 bg-[--color-editor] border border-[--color-border] rounded-lg px-3 py-1.5 mx-3 mb-2.5 mt-1.5">
                <input
                  ref={selectPromptRef}
                  value={selectPrompt}
                  onChange={(e) => setSelectPrompt(e.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Ask AI to change this…"
                  className="flex-1 bg-transparent text-[12px] text-[#f0f0f5] placeholder-[#3d4055] outline-none"
                />
                <button
                  onClick={handleSubmitPrompt}
                  disabled={!selectPrompt.trim()}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all disabled:opacity-30"
                  style={{ background: selectPrompt.trim() ? '#ffffff' : '#1f2133' }}
                >
                  <svg className="w-3 h-3 text-[#1c1c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      <div
        className="shrink-0 px-4 pb-3 pt-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center">
        <div
          className="flex items-center gap-1"
          style={{
            background: 'rgba(38,38,38,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
            padding: '7px 6px',
          }}
        >
          {/* Status dot */}
          <div className="flex items-center justify-center w-7 h-7">
            {displayError ? (
              <div className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
            ) : !isReady ? (
              <div className="w-1.5 h-1.5 rounded-full bg-[#6b7080] animate-pulse" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-white/[0.07] mx-0.5" />

          {/* Device / Canvas toggle */}
          <div className="flex items-center rounded-2xl bg-[#2a2a2a] p-0.5">
            <button
              onClick={() => setFrameMode('device')}
              className={`rounded-[14px] px-3 py-1 text-[11px] font-medium transition-colors ${
                frameMode === 'device' ? 'bg-[#484848] text-[#f0f0f5]' : 'text-[#6b7080] hover:text-[#9a9a9a]'
              }`}
            >
              Device
            </button>
            <button
              onClick={() => setFrameMode('canvas')}
              className={`rounded-[14px] px-3 py-1 text-[11px] font-medium transition-colors ${
                frameMode === 'canvas' ? 'bg-[#484848] text-[#f0f0f5]' : 'text-[#6b7080] hover:text-[#9a9a9a]'
              }`}
            >
              Canvas
            </button>
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-white/[0.07] mx-0.5" />

          {/* Select */}
          <button
            onClick={handleToggleSelect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs font-medium transition-all"
            style={
              selectMode
                ? { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }
                : { color: '#6b7080' }
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
            Select
          </button>

          {/* Reload */}
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-[#6b7080] hover:text-[#f0f0f5] text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
