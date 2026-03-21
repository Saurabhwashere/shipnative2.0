'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PreviewPipeline } from '@/lib/preview-pipeline';
import { useVFS } from './VFSContext';

interface PreviewContextValue {
  pipeline: PreviewPipeline | null;
  isReady: boolean;
  previewUrl: string;
  previewError: string | null;
  refreshPreview: () => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const { vfs } = useVFS();
  const [isReady, setIsReady]       = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const pipelineRef = useRef<PreviewPipeline | null>(null);

  useEffect(() => {
    const pipeline = new PreviewPipeline(vfs, {
      onReady:   () => setIsReady(true),
      onError:   (err) => setPreviewError(err.message),
      onRefresh: () => setRefreshKey((k) => k + 1),
    });
    pipelineRef.current = pipeline;

    pipeline.initialize().catch((err) => {
      console.error('[PreviewContext] Init failed:', err);
      setPreviewError(err.message ?? String(err));
    });

    return () => {
      pipeline.destroy();
      pipelineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only once; vfs is a stable ref

  const previewUrl = `/preview.html?v=${refreshKey}`;

  const refreshPreview = () => setRefreshKey((k) => k + 1);

  return (
    <PreviewContext.Provider
      value={{
        pipeline: pipelineRef.current,
        isReady,
        previewUrl,
        previewError,
        refreshPreview,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error('usePreview must be used within PreviewProvider');
  return ctx;
}
