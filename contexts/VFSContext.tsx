'use client';

import React, { createContext, useContext, useRef } from 'react';
import { VirtualFS } from '@/lib/vfs';

interface VFSContextValue {
  vfs: VirtualFS;
}

const VFSContext = createContext<VFSContextValue | null>(null);

interface VFSProviderProps {
  children: React.ReactNode;
  initialFiles?: Array<{ path: string; content: string }>;
}

export function VFSProvider({ children, initialFiles }: VFSProviderProps) {
  const vfsRef = useRef<VirtualFS | null>(null);

  // Initialize synchronously so seed files exist before any child effects run
  if (!vfsRef.current) {
    vfsRef.current = new VirtualFS();
    if (initialFiles) {
      for (const { path, content } of initialFiles) {
        vfsRef.current.writeFile(path, content);
      }
    }
  }

  return (
    <VFSContext.Provider value={{ vfs: vfsRef.current }}>
      {children}
    </VFSContext.Provider>
  );
}

export function useVFS(): VFSContextValue {
  const ctx = useContext(VFSContext);
  if (!ctx) throw new Error('useVFS must be used within VFSProvider');
  return ctx;
}
