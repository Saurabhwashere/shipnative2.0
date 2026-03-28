import type { VirtualFS, VFSEvent } from './vfs';
export {
  createExpoWebPlugin,
  findFirstInvalidBundledModule,
  rewriteSourceForSucraseCompatibility,
} from './reactnative-run-preview';
import { filePathToRoute, isRouteModuleFile } from './reactnative-run-preview';
import { BLANK_INDEX_SOURCE } from './preview-placeholders';

type PreviewWorkerMessage =
  | { type: 'watch-ready'; code: string; apiBundle?: string | null }
  | { type: 'watch-rebuild'; code: string; apiBundle?: string | null }
  | {
      type: 'hmr-update';
      update: {
        updatedModules: Record<string, string>;
        removedModules: string[];
        requiresReload: boolean;
        reverseDepsMap?: Record<string, string[]>;
      };
      bundle: string;
      apiBundle?: string | null;
    }
  | { type: 'error'; message: string }
  | { type: 'idle' };

type PreviewWorkerRequest =
  | {
      type: 'watch-start';
      files: Record<string, { content: string; isExternal: boolean }>;
      packageServerUrl: string;
    }
  | {
      type: 'watch-update';
      changes: Array<{ path: string; type: 'create' | 'update' | 'delete'; content?: string }>;
    }
  | { type: 'force-rebuild' }
  | { type: 'watch-stop' };

function makeShellHtml(jsUrl: string, apiJsUrl?: string): string {
  const apiScripts = apiJsUrl ? `
  <script src=${JSON.stringify(apiJsUrl)}></script>
  <script>
    (function() {
      var api = window.__API_ROUTES__;
      if (!api || typeof window.fetch !== 'function') return;
      var _origFetch = window.fetch;
      window.fetch = function(input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';
        var pathname = url;
        if (url.indexOf('://') !== -1) {
          try { pathname = new URL(url).pathname; } catch(_) {}
        } else if (url.indexOf('?') !== -1) {
          pathname = url.split('?')[0];
        }
        var match = api.match(pathname);
        if (!match) return _origFetch.apply(this, arguments);
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        var handler = match.handler && match.handler[method];
        if (!handler) return Promise.resolve(new Response('Method not allowed', { status: 405 }));
        var request = input instanceof Request ? input : new Request('http://localhost' + pathname, init);
        try {
          var result = handler(request);
          return result instanceof Promise ? result : Promise.resolve(result);
        } catch (err) {
          var message = err && err.message ? err.message : String(err);
          return Promise.resolve(new Response(JSON.stringify({ error: message }), { status: 500 }));
        }
      };
    })();
  </script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body, #root { height: 100%; margin: 0; }
    body { overflow: hidden; }
    #root { display: flex; flex-direction: column; }
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #52525b; }
    ::-webkit-scrollbar-corner { background: transparent; }
    * { scrollbar-color: #3f3f46 transparent; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    if (typeof __DEV__ === 'undefined') globalThis.__DEV__ = true;
    if (typeof global === 'undefined') globalThis.global = globalThis;
    function _fwdErr(msg) {
      try { window.parent.postMessage({ type: 'preview-error', message: String(msg) }, '*'); } catch(_) {}
    }
    window.onerror = function(_msg, _src, _line, _col, err) {
      _fwdErr(err ? (err.message || String(err)) : String(_msg));
      return true;
    };
    window.addEventListener('unhandledrejection', function(e) {
      _fwdErr(e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection');
    });
  </script>
  ${apiScripts}
  <script>
    (function() {
      var s = document.createElement('script');
      s.src = ${JSON.stringify(jsUrl)};
      s.onerror = function() { _fwdErr('Failed to load bundle (parse or network error)'); };
      document.body.appendChild(s);
    })();
  </script>
</body>
</html>`;
}

export interface PipelineCallbacks {
  onReady: (blobUrl: string) => void;
  onError: (err: Error) => void;
  onRefresh: (blobUrl: string) => void;
}

export class PreviewPipeline {
  private vfs: VirtualFS;
  private callbacks: PipelineCallbacks;
  private unsubscribeVFS: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges = new Map<string, 'create' | 'update' | 'delete'>();
  private currentJsUrl: string | null = null;
  private currentHtmlUrl: string | null = null;
  private currentApiJsUrl: string | null = null;
  private targetWindow: Window | null = null;
  private worker: Worker | null = null;
  private pendingForceRefreshResolvers: Array<() => void> = [];
  private lastApiBundleCode: string | null = null;

  constructor(vfs: VirtualFS, callbacks: PipelineCallbacks) {
    this.vfs = vfs;
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.worker = new Worker(new URL('./preview-worker.ts', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', this.handleWorkerMessage);
    this.worker.addEventListener('error', this.handleWorkerError);

    this.unsubscribeVFS = this.vfs.onChange(this.handleVFSChange.bind(this));

    this.postToWorker({
      type: 'watch-start',
      files: this.toWorkerFileMap(),
      packageServerUrl: process.env.NEXT_PUBLIC_PACKAGE_SERVER_URL || 'https://esm.reactnative.run',
    });
  }

  destroy(): void {
    this.unsubscribeVFS?.();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges.clear();
    this.resolvePendingForceRefreshes();
    this.revokeBlobUrls();
    this.targetWindow = null;
    if (this.worker) {
      this.postToWorker({ type: 'watch-stop' });
      this.worker.removeEventListener('message', this.handleWorkerMessage);
      this.worker.removeEventListener('error', this.handleWorkerError);
      this.worker.terminate();
      this.worker = null;
    }
  }

  setTargetWindow(win: Window | null): void {
    this.targetWindow = win;
  }

  async forceRefresh(): Promise<void> {
    if (!this.worker) return;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.flushChanges();
    await new Promise<void>((resolve) => {
      this.pendingForceRefreshResolvers.push(resolve);
      this.postToWorker({ type: 'force-rebuild' });
    });
  }

  isReady(): boolean {
    return this.worker !== null;
  }

  private toWorkerFileMap(): Record<string, { content: string; isExternal: boolean }> {
    const fileMap: Record<string, { content: string; isExternal: boolean }> = {};
    for (const file of this.vfs.getAllFiles()) {
      const path = file.path.startsWith('/') ? file.path : '/' + file.path;
      fileMap[path] = { content: file.content, isExternal: false };
    }
    return fileMap;
  }

  private postToWorker(message: PreviewWorkerRequest): void {
    this.worker?.postMessage(message);
  }

  private handleWorkerMessage = (event: MessageEvent<PreviewWorkerMessage>): void => {
    const message = event.data;

    if (message.type === 'idle') {
      this.resolvePendingForceRefreshes();
      return;
    }

    if (message.type === 'error') {
      this.resolvePendingForceRefreshes();
      this.callbacks.onError(new Error(message.message));
      return;
    }

    if (message.type === 'watch-ready') {
      if (message.apiBundle !== undefined) this.lastApiBundleCode = message.apiBundle ?? null;
      const route = this.getCurrentRoute();
      const url = this.makeBlobUrl(message.code, route || this.getDefaultRoute() || undefined);
      this.resolvePendingForceRefreshes();
      this.callbacks.onReady(url);
      return;
    }

    if (message.type === 'watch-rebuild') {
      if (message.apiBundle !== undefined) this.lastApiBundleCode = message.apiBundle ?? null;
      const route = this.getCurrentRoute();
      const url = this.makeBlobUrl(message.code, route || undefined);
      this.resolvePendingForceRefreshes();
      this.callbacks.onRefresh(url);
      return;
    }

    if (message.type === 'hmr-update') {
      const apiBundleUpdated = message.apiBundle !== undefined;
      if (apiBundleUpdated) this.lastApiBundleCode = message.apiBundle ?? null;
      this.resolvePendingForceRefreshes();

      if (!message.update.requiresReload && !apiBundleUpdated && this.targetWindow) {
        this.targetWindow.postMessage({
          type: 'hmr-update',
          updatedModules: message.update.updatedModules,
          removedModules: message.update.removedModules,
          reverseDepsMap: message.update.reverseDepsMap,
        }, '*');
        return;
      }

      const route = this.getCurrentRoute();
      const url = this.makeBlobUrl(message.bundle, route || undefined);
      this.callbacks.onRefresh(url);
    }
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    this.resolvePendingForceRefreshes();
    this.callbacks.onError(new Error(event.message || 'Preview worker failed'));
  };

  private resolvePendingForceRefreshes(): void {
    const resolvers = [...this.pendingForceRefreshResolvers];
    this.pendingForceRefreshResolvers = [];
    for (const resolve of resolvers) resolve();
  }

  private getCurrentRoute(): string {
    try {
      return (this.targetWindow as { __ROUTER_SHIM_HASH__?: string } | null)?.__ROUTER_SHIM_HASH__ ?? '';
    } catch {
      return '';
    }
  }

  private getDefaultRoute(): string {
    const routeFiles = this.vfs
      .getAllFiles()
      .filter((file) => {
        const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
        return isRouteModuleFile(path) && !/_layout\.(jsx?|tsx?)$/.test(path);
      });

    if (routeFiles.length === 0) return '';

    const meaningfulRoutes = routeFiles.filter((file) => {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
      return !(path === '/app/index.tsx' && file.content.trim() === BLANK_INDEX_SOURCE.trim());
    });

    const candidates = meaningfulRoutes.length > 0 ? meaningfulRoutes : routeFiles;
    const scored = candidates
      .map((file) => {
        const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
        const route = filePathToRoute(path);
        const score =
          route === '/' ? 0 :
          /^\/(home|today|planning|dashboard)\b/.test(route) ? 1 :
          route.split('/').length;
        return { route, score };
      })
      .sort((a, b) => a.score - b.score || a.route.localeCompare(b.route));

    return scored[0]?.route ?? '';
  }

  private makeBlobUrl(code: string, route?: string): string {
    this.revokeBlobUrls();
    const jsBlob = new Blob([code], { type: 'application/javascript' });
    this.currentJsUrl = URL.createObjectURL(jsBlob);
    if (this.lastApiBundleCode) {
      const apiBlob = new Blob([this.lastApiBundleCode], { type: 'application/javascript' });
      this.currentApiJsUrl = URL.createObjectURL(apiBlob);
    }
    const htmlBlob = new Blob([makeShellHtml(this.currentJsUrl, this.currentApiJsUrl ?? undefined)], { type: 'text/html' });
    this.currentHtmlUrl = URL.createObjectURL(htmlBlob);
    if (!route) return this.currentHtmlUrl;
    const normalizedRoute = route.startsWith('#') ? route : `#${route.startsWith('/') ? route : `/${route}`}`;
    return `${this.currentHtmlUrl}${normalizedRoute}`;
  }

  private revokeBlobUrls(): void {
    if (this.currentJsUrl) {
      URL.revokeObjectURL(this.currentJsUrl);
      this.currentJsUrl = null;
    }
    if (this.currentHtmlUrl) {
      URL.revokeObjectURL(this.currentHtmlUrl);
      this.currentHtmlUrl = null;
    }
    if (this.currentApiJsUrl) {
      URL.revokeObjectURL(this.currentApiJsUrl);
      this.currentApiJsUrl = null;
    }
  }

  private handleVFSChange(event: VFSEvent): void {
    if (!/\.(jsx?|tsx?)$/.test(event.path)) return;

    const vfsPath = event.path;
    if (event.type === 'delete') {
      this.pendingChanges.set(vfsPath, 'delete');
    } else {
      const prev = this.pendingChanges.get(vfsPath);
      this.pendingChanges.set(vfsPath, prev === 'delete' ? 'create' : 'update');
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flushChanges(), 150);
  }

  private flushChanges(): void {
    this.debounceTimer = null;
    if (!this.worker || this.pendingChanges.size === 0) return;

    const batch = new Map(this.pendingChanges);
    this.pendingChanges.clear();

    const changes = [...batch.entries()].map(([path, type]) => {
      const workerPath = path.startsWith('/') ? path : '/' + path;
      if (type === 'delete') return { path: workerPath, type } as const;
      return {
        path: workerPath,
        type,
        content: this.vfs.readFile(path),
      } as const;
    });

    this.postToWorker({ type: 'watch-update', changes });
  }
}
