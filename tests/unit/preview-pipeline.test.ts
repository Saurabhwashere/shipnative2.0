import { afterEach, describe, expect, it, vi } from 'vitest';
import { VirtualFS } from '../../lib/vfs';
import {
  PreviewPipeline,
  findFirstInvalidBundledModule,
  rewriteSourceForSucraseCompatibility,
} from '../../lib/preview-pipeline';
import { buildApiRoutesEntry, createExpoWebPlugin } from '../../lib/reactnative-run-preview';
import { BLANK_INDEX_SOURCE, BLANK_LAYOUT_SOURCE } from '../../lib/preview-placeholders';

type WorkerMessage =
  | { type: 'watch-ready'; code: string; apiBundle?: string | null }
  | { type: 'watch-rebuild'; code: string; apiBundle?: string | null }
  | {
      type: 'hmr-update';
      update: {
        requiresReload: boolean;
        updatedModules: Record<string, string>;
        removedModules: string[];
        reverseDepsMap?: Record<string, string[]>;
      };
      bundle: string;
      apiBundle?: string | null;
    }
  | { type: 'error'; message: string }
  | { type: 'idle' };

let blobUrlCounter = 0;
vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:http://localhost:3000/mock-${++blobUrlCounter}`);
vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

class MockWorker {
  static instances: MockWorker[] = [];
  static nextResponses: {
    start?: WorkerMessage;
    update?: WorkerMessage;
    force?: WorkerMessage;
  } = {};

  readonly postMessage = vi.fn((message: { type: string }) => {
    if (message.type === 'watch-start' && MockWorker.nextResponses.start) {
      this.emitMessage(MockWorker.nextResponses.start);
    }
    if (message.type === 'watch-update' && MockWorker.nextResponses.update) {
      this.emitMessage(MockWorker.nextResponses.update);
    }
    if (message.type === 'force-rebuild' && MockWorker.nextResponses.force) {
      this.emitMessage(MockWorker.nextResponses.force);
    }
  });

  readonly terminate = vi.fn();

  private listeners = {
    message: new Set<(event: MessageEvent<WorkerMessage>) => void>(),
    error: new Set<(event: ErrorEvent) => void>(),
  };

  constructor(_url: URL, _options: WorkerOptions) {
    MockWorker.instances.push(this);
  }

  addEventListener(type: 'message' | 'error', listener: (event: MessageEvent<WorkerMessage> | ErrorEvent) => void) {
    if (type === 'message') this.listeners.message.add(listener as (event: MessageEvent<WorkerMessage>) => void);
    if (type === 'error') this.listeners.error.add(listener as (event: ErrorEvent) => void);
  }

  removeEventListener(type: 'message' | 'error', listener: (event: MessageEvent<WorkerMessage> | ErrorEvent) => void) {
    if (type === 'message') this.listeners.message.delete(listener as (event: MessageEvent<WorkerMessage>) => void);
    if (type === 'error') this.listeners.error.delete(listener as (event: ErrorEvent) => void);
  }

  emitMessage(message: WorkerMessage) {
    const event = { data: message } as MessageEvent<WorkerMessage>;
    for (const listener of this.listeners.message) listener(event);
  }

  emitError(message: string) {
    const event = { message } as ErrorEvent;
    for (const listener of this.listeners.error) listener(event);
  }
}

vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

afterEach(() => {
  vi.clearAllMocks();
  MockWorker.instances = [];
  MockWorker.nextResponses = {};
});

describe('rewriteSourceForSucraseCompatibility', () => {
  it('rewrites indexed typeof type expressions that Sucrase misparses', () => {
    const src = [
      'const TABS = [{ id: "home" }] as const;',
      'type Tab = (typeof TABS)[number];',
      'type TabId = typeof TABS[number]["id"];',
    ].join('\n');

    const out = rewriteSourceForSucraseCompatibility(src, 'app/home.tsx');

    expect(out).toContain('type Tab = any;');
    expect(out).toContain('type TabId = any;');
  });

  it('strips hook generics that contain indexed or typeof-based type args', () => {
    const src = [
      'import { useRef } from "react";',
      'const TABS = [{ id: "home" }] as const;',
      'const refA = useRef<Animated.Value | null>(null);',
      'const refB = useRef<(typeof TABS)[number] | null>(null);',
    ].join('\n');

    const out = rewriteSourceForSucraseCompatibility(src, 'app/home.tsx');

    expect(out).toContain('const refA = useRef(null);');
    expect(out).toContain('const refB = useRef<any | null>(null);');
  });
});

describe('findFirstInvalidBundledModule', () => {
  it('returns the first invalid local module path and syntax error', () => {
    const invalid = findFirstInvalidBundledModule({
      '/ok.js': 'module.exports = 1;',
      '/broken.js': 'const x = ;',
    });

    expect(invalid?.id).toBe('/broken.js');
    expect(invalid?.message).toContain('Unexpected token');
  });

  it('ignores npm package modules when validating bundled code', () => {
    const invalid = findFirstInvalidBundledModule({
      'expo-router': 'import.meta.env',
      '/App.js': 'module.exports = 1;',
    });

    expect(invalid).toBeNull();
  });
});

describe('createExpoWebPlugin', () => {
  it('ships the expo-router shim with useFocusEffect', () => {
    const plugin = createExpoWebPlugin();
    expect(plugin.shimModules()['expo-router']).toContain('exports.useFocusEffect');
  });

  it('treats _Layout route files as layouts in the expo-router shim', () => {
    const plugin = createExpoWebPlugin();
    const shim = plugin.shimModules()['expo-router'];
    expect(shim).toContain("if (/^_layout$/i.test(segment)) return '_layout';");
  });
});

describe('buildApiRoutesEntry', () => {
  it('creates a route map for static and dynamic api files', () => {
    const entry = buildApiRoutesEntry([
      '/app/api/hello+api.ts',
      '/app/api/users/[id]+api.ts',
      '/app/index.tsx',
    ]);

    expect(entry).toContain('"/api/hello": require("./app/api/hello+api")');
    expect(entry).toContain('"/api/users/[id]": require("./app/api/users/[id]+api")');
    expect(entry).toContain('window.__API_ROUTES__');
  });
});

describe('PreviewPipeline', () => {
  it('calls onReady with a blob URL after worker watch-start', async () => {
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'export default function App() {}');
    const onReady = vi.fn();

    const pipeline = new PreviewPipeline(vfs, { onReady, onError: vi.fn(), onRefresh: vi.fn() });
    await pipeline.initialize();

    expect(onReady).toHaveBeenCalledWith(expect.stringContaining('blob:'));
    const worker = MockWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'watch-start',
        files: expect.objectContaining({
          '/App.jsx': expect.objectContaining({ content: 'export default function App() {}' }),
        }),
      }),
    );
    pipeline.destroy();
  });

  it('prefers the first real Expo route over the scaffold blank index on initial load', async () => {
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    const vfs = new VirtualFS();
    vfs.writeFile('app/_layout.tsx', BLANK_LAYOUT_SOURCE);
    vfs.writeFile('app/index.tsx', BLANK_INDEX_SOURCE);
    vfs.writeFile('app/(tabs)/planning.tsx', 'export default function Planning() { return null; }');
    const onReady = vi.fn();

    const pipeline = new PreviewPipeline(vfs, { onReady, onError: vi.fn(), onRefresh: vi.fn() });
    await pipeline.initialize();

    expect(onReady).toHaveBeenCalledWith(expect.stringContaining('#/planning'));
    pipeline.destroy();
  });

  it('isReady() is false before initialize and true after', async () => {
    MockWorker.nextResponses.start = { type: 'idle' };
    const pipeline = new PreviewPipeline(new VirtualFS(), { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    expect(pipeline.isReady()).toBe(false);
    await pipeline.initialize();
    expect(pipeline.isReady()).toBe(true);
    pipeline.destroy();
  });

  it('forwards worker errors to onError', async () => {
    MockWorker.nextResponses.start = { type: 'error', message: 'No entry file found' };
    const onError = vi.fn();
    const pipeline = new PreviewPipeline(new VirtualFS(), { onReady: vi.fn(), onError, onRefresh: vi.fn() });

    await pipeline.initialize();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'No entry file found' }));
    pipeline.destroy();
  });

  it('sends hmr-update postMessage when worker emits a hot update', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = {
      type: 'hmr-update',
      update: {
        requiresReload: false,
        updatedModules: { '/App.jsx': '/* updated */' },
        removedModules: [],
        reverseDepsMap: {},
      },
      bundle: '/* bundle */',
    };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'v0');
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    await pipeline.initialize();

    const fakeWindow = { postMessage: vi.fn() } as unknown as Window;
    pipeline.setTargetWindow(fakeWindow);

    vfs.writeFile('App.jsx', 'v1');
    vi.advanceTimersByTime(200);

    expect(fakeWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'hmr-update' }),
      '*',
    );

    pipeline.destroy();
    vi.useRealTimers();
  });

  it('falls back to full reload when worker emits a rebuild', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = { type: 'watch-rebuild', code: '/* new bundle */' };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'v0');
    const onRefresh = vi.fn();
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh });
    await pipeline.initialize();

    vfs.writeFile('App.jsx', 'v1');
    vi.advanceTimersByTime(200);

    expect(onRefresh).toHaveBeenCalledWith(expect.stringContaining('blob:'));
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('preserves the current route as a hash fragment on full reloads', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = { type: 'watch-rebuild', code: '/* new bundle */' };

    const vfs = new VirtualFS();
    vfs.writeFile('app/_layout.tsx', BLANK_LAYOUT_SOURCE);
    vfs.writeFile('app/index.tsx', BLANK_INDEX_SOURCE);
    vfs.writeFile('app/(tabs)/planning.tsx', 'export default function Planning() { return null; }');
    const onRefresh = vi.fn();
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh });
    await pipeline.initialize();

    pipeline.setTargetWindow({ __ROUTER_SHIM_HASH__: '/planning' } as unknown as Window);
    vfs.writeFile('app/(tabs)/planning.tsx', 'export default function Planning() { return "updated"; }');
    vi.advanceTimersByTime(200);

    expect(onRefresh).toHaveBeenCalledWith(expect.stringContaining('#/planning'));
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('falls back to full reload when no iframe target is registered', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = {
      type: 'hmr-update',
      update: {
        requiresReload: false,
        updatedModules: { '/App.jsx': '/* updated */' },
        removedModules: [],
        reverseDepsMap: {},
      },
      bundle: '/* fallback bundle */',
    };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'v0');
    const onRefresh = vi.fn();
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh });
    await pipeline.initialize();

    vfs.writeFile('App.jsx', 'v1');
    vi.advanceTimersByTime(200);

    expect(onRefresh).toHaveBeenCalledWith(expect.stringContaining('blob:'));
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('falls back to full reload when hmr update also includes an api bundle', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = {
      type: 'hmr-update',
      update: {
        requiresReload: false,
        updatedModules: { '/App.jsx': '/* updated */' },
        removedModules: [],
        reverseDepsMap: {},
      },
      bundle: '/* fallback bundle */',
      apiBundle: '/* api bundle */',
    };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'v0');
    const onRefresh = vi.fn();
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh });
    await pipeline.initialize();

    const fakeWindow = { postMessage: vi.fn() } as unknown as Window;
    pipeline.setTargetWindow(fakeWindow);

    vfs.writeFile('App.jsx', 'v1');
    vi.advanceTimersByTime(200);

    expect(fakeWindow.postMessage).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledWith(expect.stringContaining('blob:'));
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('falls back to full reload when hmr update removes the api bundle', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */', apiBundle: '/* api bundle */' };
    MockWorker.nextResponses.update = {
      type: 'hmr-update',
      update: {
        requiresReload: false,
        updatedModules: { '/App.jsx': '/* updated */' },
        removedModules: [],
        reverseDepsMap: {},
      },
      bundle: '/* fallback bundle */',
      apiBundle: null,
    };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'v0');
    const onRefresh = vi.fn();
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh });
    await pipeline.initialize();

    const fakeWindow = { postMessage: vi.fn() } as unknown as Window;
    pipeline.setTargetWindow(fakeWindow);

    vfs.writeFile('App.jsx', 'v1');
    vi.advanceTimersByTime(200);

    expect(fakeWindow.postMessage).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledWith(expect.stringContaining('blob:'));
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('debounces rapid changes into one watch-update message', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = { type: 'watch-rebuild', code: '/* new bundle */' };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'v0');
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    await pipeline.initialize();
    const worker = MockWorker.instances[0];
    vi.clearAllMocks();

    vfs.writeFile('App.jsx', 'v1');
    vfs.writeFile('App.jsx', 'v2');
    vfs.writeFile('App.jsx', 'v3');

    expect(worker.postMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'watch-update',
        changes: [
          expect.objectContaining({ path: '/App.jsx', type: 'update', content: 'v3' }),
        ],
      }),
    );

    pipeline.destroy();
    vi.useRealTimers();
  });

  it('tracks delete events in watch-update messages', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.update = { type: 'watch-rebuild', code: '/* new bundle */' };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'x');
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    await pipeline.initialize();
    const worker = MockWorker.instances[0];
    vi.clearAllMocks();

    vfs.deleteFile('App.jsx');
    vi.advanceTimersByTime(200);

    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'watch-update',
        changes: [expect.objectContaining({ path: '/App.jsx', type: 'delete' })],
      }),
    );

    pipeline.destroy();
    vi.useRealTimers();
  });

  it('skips non-code files', async () => {
    vi.useFakeTimers();
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };

    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'x');
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    await pipeline.initialize();
    const worker = MockWorker.instances[0];
    vi.clearAllMocks();

    vfs.writeFile('logo.png', 'binary');
    vi.advanceTimersByTime(200);

    expect(worker.postMessage).not.toHaveBeenCalled();
    pipeline.destroy();
    vi.useRealTimers();
  });

  it('forceRefresh posts force-rebuild and resolves after rebuild', async () => {
    MockWorker.nextResponses.start = { type: 'watch-ready', code: '/* bundle */' };
    MockWorker.nextResponses.force = { type: 'watch-rebuild', code: '/* refreshed */' };
    MockWorker.nextResponses.update = { type: 'watch-rebuild', code: '/* updated */' };
    const vfs = new VirtualFS();
    vfs.writeFile('App.jsx', 'x');
    const onRefresh = vi.fn();
    const pipeline = new PreviewPipeline(vfs, { onReady: vi.fn(), onError: vi.fn(), onRefresh });
    await pipeline.initialize();

    const worker = MockWorker.instances[0];
    vi.clearAllMocks();
    vfs.writeFile('App.jsx', 'y');
    await pipeline.forceRefresh();

    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'watch-update',
        changes: [expect.objectContaining({ path: '/App.jsx', type: 'update', content: 'y' })],
      }),
    );
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'force-rebuild' });
    expect(onRefresh).toHaveBeenCalledWith(expect.stringContaining('blob:'));
    pipeline.destroy();
  });

  it('does nothing on forceRefresh before initialize', async () => {
    const pipeline = new PreviewPipeline(new VirtualFS(), { onReady: vi.fn(), onError: vi.fn(), onRefresh: vi.fn() });
    await expect(pipeline.forceRefresh()).resolves.toBeUndefined();
    pipeline.destroy();
  });
});
