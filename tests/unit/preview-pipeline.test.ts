import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VirtualFS } from '../../lib/vfs';
import { PreviewPipeline } from '../../lib/preview-pipeline';

// Stub the browser-only transformer module
vi.mock('../../lib/transformer', () => ({
  loadBabel: vi.fn().mockResolvedValue(undefined),
  transformCode: vi.fn().mockResolvedValue('/* transformed */'),
  toJsPath: (p: string) => p.replace(/\.(tsx?|jsx)$/, '.js'),
  normalizePath: (p: string) => p.replace(/^\/+/, ''),
  makeErrorModule: vi.fn((msg: string) => `/* error: ${msg} */`),
}));

import { transformCode, makeErrorModule } from '../../lib/transformer';

// --- Service Worker mock ------------------------------------------------
function makeSwController() {
  const messageListeners: ((e: MessageEvent) => void)[] = [];
  const controller = {
    postMessage: vi.fn((msg: { type: string; path: string; content: string; id: string }) => {
      // Auto-reply with file-written confirmation
      const event = new MessageEvent('message', {
        data: { type: 'file-written', id: msg.id },
      });
      messageListeners.forEach((l) => l(event));
    }),
  };

  const swScope = {
    controller,
    addEventListener: vi.fn((event: string, cb: (e: MessageEvent) => void) => {
      if (event === 'message') messageListeners.push(cb);
    }),
    removeEventListener: vi.fn(),
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({}),
  };

  return { controller, swScope, messageListeners };
}

function mountSW(swScope: ReturnType<typeof makeSwController>['swScope']) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: swScope,
    writable: true,
    configurable: true,
  });
}

// -----------------------------------------------------------------------

describe('PreviewPipeline – processFile', () => {
  let vfs: VirtualFS;
  let pipeline: PreviewPipeline;
  let callbacks: { onReady: ReturnType<typeof vi.fn>; onError: ReturnType<typeof vi.fn>; onRefresh: ReturnType<typeof vi.fn> };
  let sw: ReturnType<typeof makeSwController>;

  beforeEach(() => {
    vi.clearAllMocks();
    vfs = new VirtualFS();
    callbacks = { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() };
    sw = makeSwController();
    mountSW(sw.swScope);
    pipeline = new PreviewPipeline(vfs, callbacks);
    // Wire up the SW message handler manually (normally done inside initialize())
    // so that sendFileToSW promises resolve when the mock controller replies.
    sw.swScope.addEventListener('message', (pipeline as any).handleSWMessage);
  });

  afterEach(() => {
    pipeline.destroy();
  });

  it('calls transformCode with file content and path', async () => {
    vfs.writeFile('App.jsx', 'const x = 1;');
    await pipeline.processFile('App.jsx');
    expect(transformCode).toHaveBeenCalledWith('const x = 1;', 'App.jsx');
  });

  it('sends transformed content to SW via postMessage', async () => {
    vfs.writeFile('App.jsx', 'code');
    await pipeline.processFile('App.jsx');
    expect(sw.controller.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'write-file', path: '/App.js' }),
    );
  });

  it('falls back to makeErrorModule when transformCode throws', async () => {
    vi.mocked(transformCode).mockRejectedValueOnce(new Error('SyntaxError'));
    vfs.writeFile('App.jsx', 'invalid <<<');
    await pipeline.processFile('App.jsx');
    expect(makeErrorModule).toHaveBeenCalledWith(expect.stringContaining('SyntaxError'));
    // Should still send to SW (error module content)
    expect(sw.controller.postMessage).toHaveBeenCalled();
  });
});

describe('PreviewPipeline – handleVFSChange debounce', () => {
  it('debounces rapid VFS changes — only one transformCode call within 150 ms', async () => {
    vi.useFakeTimers();
    const vfs = new VirtualFS();
    const sw = makeSwController();
    mountSW(sw.swScope);
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });

    // Simulate pipeline being SW-ready so VFS subscription is active
    // Manually subscribe (bypass full initialize)
    const unsub = vfs.onChange((pipeline as any).handleVFSChange.bind(pipeline));

    vi.clearAllMocks();

    vfs.writeFile('App.jsx', 'v1');
    vfs.writeFile('App.jsx', 'v2');
    vfs.writeFile('App.jsx', 'v3');

    // Before debounce fires
    expect(transformCode).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    await Promise.resolve(); // flush microtasks

    expect(transformCode).toHaveBeenCalledTimes(1);

    unsub();
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('skips delete events', () => {
    vi.useFakeTimers();
    const vfs = new VirtualFS();
    const sw = makeSwController();
    mountSW(sw.swScope);
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    const unsub = vfs.onChange((pipeline as any).handleVFSChange.bind(pipeline));

    vfs.writeFile('App.jsx', 'x');
    vi.clearAllMocks();
    vfs.deleteFile('App.jsx');

    vi.advanceTimersByTime(200);
    expect(transformCode).not.toHaveBeenCalled();

    unsub();
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('skips non-code files (.png)', () => {
    vi.useFakeTimers();
    const vfs = new VirtualFS();
    const sw = makeSwController();
    mountSW(sw.swScope);
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    const unsub = vfs.onChange((pipeline as any).handleVFSChange.bind(pipeline));

    vfs.writeFile('logo.png', 'binary');

    vi.advanceTimersByTime(200);
    expect(transformCode).not.toHaveBeenCalled();

    unsub();
    pipeline.destroy();
    vi.useRealTimers();
  });
});

describe('PreviewPipeline – refreshPreview', () => {
  it('calls the onRefresh callback', () => {
    const vfs = new VirtualFS();
    const sw = makeSwController();
    mountSW(sw.swScope);
    const callbacks = { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() };
    const pipeline = new PreviewPipeline(vfs, callbacks);
    pipeline.refreshPreview();
    expect(callbacks.onRefresh).toHaveBeenCalledTimes(1);
    pipeline.destroy();
  });
});

describe('PreviewPipeline – isReady', () => {
  it('returns false before initialization', () => {
    const vfs = new VirtualFS();
    const sw = makeSwController();
    mountSW(sw.swScope);
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    expect(pipeline.isReady()).toBe(false);
    pipeline.destroy();
  });
});

describe('PreviewPipeline – sendFileToSW timeout', () => {
  it('resolves even when SW does not confirm (3 s timeout)', async () => {
    vi.useFakeTimers();
    const vfs = new VirtualFS();

    // SW that never replies
    const silentSw = {
      controller: { postMessage: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({}),
    };
    mountSW(silentSw);

    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    const sendPromise = (pipeline as any).sendFileToSW('/App.js', 'code');

    // Advance past the 3 s timeout
    vi.advanceTimersByTime(3100);
    await sendPromise; // should resolve, not hang

    pipeline.destroy();
    vi.useRealTimers();
  });
});
