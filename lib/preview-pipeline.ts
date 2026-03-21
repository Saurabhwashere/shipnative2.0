import { VirtualFS, VFSEvent } from './vfs';
import { loadBabel, transformCode, toJsPath, normalizePath, makeErrorModule } from './transformer';

export interface PipelineCallbacks {
  onReady: () => void;
  onError: (err: Error) => void;
  onRefresh: () => void;
}

export class PreviewPipeline {
  private vfs: VirtualFS;
  private callbacks: PipelineCallbacks;

  private swRegistration: ServiceWorkerRegistration | null = null;
  private swReady = false;
  private unsubscribeVFS: (() => void) | null = null;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingWrites = new Map<string, () => void>();

  constructor(vfs: VirtualFS, callbacks: PipelineCallbacks) {
    this.vfs = vfs;
    this.callbacks = callbacks;
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator)) {
      throw new Error(
        'Service Workers are not supported in this browser.\nPlease use Chrome, Firefox, or Edge.',
      );
    }

    // Listen for write confirmations from the SW
    navigator.serviceWorker.addEventListener('message', this.handleSWMessage);

    // Register the SW
    this.swRegistration = await navigator.serviceWorker.register('/preview-sw.js', {
      scope: '/',
    });

    // Wait for an active SW in this registration
    await navigator.serviceWorker.ready;

    // Wait for it to actually be controlling this page
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        });
      });
    }

    this.swReady = true;
    console.log('[Pipeline] Service Worker ready');

    // Load Babel (CDN, ~3 MB – do this while SW is activating)
    await loadBabel();
    console.log('[Pipeline] Babel ready');

    // Transform and push every VFS file to the SW
    await this.processAllFiles();

    // Subscribe to future VFS changes
    this.unsubscribeVFS = this.vfs.onChange(this.handleVFSChange.bind(this));

    this.callbacks.onReady();
    console.log('[Pipeline] Ready');
  }

  destroy(): void {
    this.unsubscribeVFS?.();
    navigator.serviceWorker.removeEventListener('message', this.handleSWMessage);
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();
    this.pendingWrites.clear();
  }

  // ── File processing ─────────────────────────────────────────────────────────

  async processFile(path: string): Promise<void> {
    const content = this.vfs.readFile(path);
    let transformed: string;

    try {
      transformed = await transformCode(content, path);
    } catch (err) {
      console.warn('[Pipeline] Compile error in', path, err);
      transformed = makeErrorModule(String(err));
    }

    // Send transformed code to SW under the .js path
    const jsPath = '/' + toJsPath(path);
    const originalPath = '/' + normalizePath(path);

    await this.sendFileToSW(jsPath, transformed);
    // Also store under the original extension so imports like './Foo.jsx' still resolve
    if (jsPath !== originalPath) {
      await this.sendFileToSW(originalPath, transformed);
    }
  }

  async processAllFiles(): Promise<void> {
    const files = this.vfs.getAllFiles();
    // Process in parallel for speed
    await Promise.all(files.map((f) => this.processFile(f.path)));
  }

  // ── Service Worker communication ────────────────────────────────────────────

  async sendFileToSW(path: string, content: string): Promise<void> {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      console.warn('[Pipeline] SW not controlling yet, skipping write for', path);
      return;
    }

    const id = Math.random().toString(36).slice(2);
    return new Promise<void>((resolve) => {
      // Store resolver keyed by id
      this.pendingWrites.set(id, resolve);
      controller.postMessage({ type: 'write-file', path, content, id });

      // Timeout safety valve — never hang indefinitely
      setTimeout(() => {
        if (this.pendingWrites.delete(id)) resolve();
      }, 3000);
    });
  }

  private handleSWMessage = (event: MessageEvent): void => {
    const { type, id } = event.data ?? {};
    if (type === 'file-written' && id) {
      const resolve = this.pendingWrites.get(id);
      if (resolve) {
        this.pendingWrites.delete(id);
        resolve();
      }
    }
  };

  // ── VFS change handler (debounced) ──────────────────────────────────────────

  private handleVFSChange(event: VFSEvent): void {
    if (event.type === 'delete') return;
    const { path } = event;

    // Only process code files
    if (!/\.(jsx?|tsx?)$/.test(path)) return;

    // Debounce rapid changes (AI streaming writes many small edits)
    const existing = this.debounceTimers.get(path);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      path,
      setTimeout(async () => {
        this.debounceTimers.delete(path);
        try {
          await this.processFile(path);
          // SW will broadcast hmr-update → preview.html will window.location.reload()
        } catch (err) {
          console.error('[Pipeline] Error processing file:', path, err);
        }
      }, 150),
    );
  }

  // ── Preview control ─────────────────────────────────────────────────────────

  /** Tells the context to bump the iframe version (forces full reload) */
  refreshPreview(): void {
    this.callbacks.onRefresh();
  }

  getPreviewUrl(): string {
    return '/preview.html';
  }

  isReady(): boolean {
    return this.swReady;
  }
}
