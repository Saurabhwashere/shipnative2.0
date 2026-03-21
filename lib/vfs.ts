import { ProjectFile } from './types';

export type VFSEventType = 'create' | 'change' | 'delete';

export interface VFSEvent {
  type: VFSEventType;
  path: string;
  timestamp: number;
}

export interface SerializedVFS {
  files: Array<{ path: string; content: string; lastModified: number }>;
}

export class VirtualFS {
  private files: Map<string, ProjectFile> = new Map();
  private listeners: Set<(event: VFSEvent) => void> = new Set();

  writeFile(path: string, content: string): void {
    const exists = this.files.has(path);
    const lastModified = Date.now();
    this.files.set(path, { path, content, lastModified });
    this.emit({ type: exists ? 'change' : 'create', path, timestamp: lastModified });
  }

  readFile(path: string): string {
    const file = this.files.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file.content;
  }

  deleteFile(path: string): void {
    if (this.files.delete(path)) {
      this.emit({ type: 'delete', path, timestamp: Date.now() });
    }
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  listFiles(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  getFile(path: string): ProjectFile {
    const file = this.files.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file;
  }

  getAllFiles(): ProjectFile[] {
    return Array.from(this.files.values());
  }

  /** Subscribe to file changes. Returns an unsubscribe function. */
  onChange(callback: (event: VFSEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  toJSON(): SerializedVFS {
    return {
      files: Array.from(this.files.values()).map(({ path, content, lastModified }) => ({
        path,
        content,
        lastModified,
      })),
    };
  }

  fromJSON(data: SerializedVFS): void {
    this.files.clear();
    for (const file of data.files) {
      this.files.set(file.path, file);
    }
  }

  private emit(event: VFSEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[VFS] Listener error:', e);
      }
    }
  }
}
