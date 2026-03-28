/// <reference lib="webworker" />

import {
  Bundler,
  IncrementalBundler,
  VirtualFS,
  typescriptTransformer,
  reactRefreshTransformer,
  createDataBxPathPlugin,
} from 'browser-metro';
import type { FileChange } from 'browser-metro';
import {
  EXPO_CTX_PATH,
  MOUNT_ENTRY,
  MOUNT_SOURCE_APP,
  MOUNT_SOURCE_EXPO,
  RESOLVER_SOURCE_EXTS,
  ROOT_ENTRY_CANDIDATES,
  buildApiRoutesEntry,
  buildExpoRouteCtx,
  createExpoWebPlugin,
  findFirstInvalidBundledModule,
  isApiRouteFile,
  isRouteModuleFile,
} from './reactnative-run-preview';

type FileMap = Record<string, { content: string; isExternal: boolean }>;
type ContentChange = { path: string; type: 'create' | 'update' | 'delete'; content?: string };

type WatchStartRequest = {
  type: 'watch-start';
  files: FileMap;
  packageServerUrl: string;
};

type WatchUpdateRequest = {
  type: 'watch-update';
  changes: ContentChange[];
};

type ForceRebuildRequest = {
  type: 'force-rebuild';
};

type WatchStopRequest = {
  type: 'watch-stop';
};

type WorkerRequest =
  | WatchStartRequest
  | WatchUpdateRequest
  | ForceRebuildRequest
  | WatchStopRequest;

const DEFAULT_PACKAGE_SERVER_URL = 'https://esm.reactnative.run';
const DEFAULT_PREVIEW_DEPENDENCIES: Record<string, string> = {
  react: '19.1.0',
  'react-dom': '19.1.0',
  'react-native': '0.81.5',
  'react-native-web': '~0.21.0',
  expo: '~54.0.33',
  'expo-router': '~6.0.23',
  'expo-constants': '~18.0.13',
  'expo-font': '~14.0.11',
  'expo-linking': '~8.0.11',
  'expo-splash-screen': '~31.0.13',
  'expo-status-bar': '~3.0.9',
  'expo-asset': '~12.0.12',
  'expo-linear-gradient': '~14.1.5',
  nativewind: 'latest',
};

let watchFS: VirtualFS | null = null;
let incrementalBundler: IncrementalBundler | null = null;
let watchPackageServerUrl = DEFAULT_PACKAGE_SERVER_URL;
let currentEntryFile: string | null = null;
let lastBundle = '';
let lastApiBundle: string | null = null;
let hasBundled = false;

function postMessageSafe(message: unknown) {
  self.postMessage(message);
}

function postError(err: unknown) {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  postMessageSafe({ type: 'error', message });
}

function validateBundledModules() {
  const invalid = findFirstInvalidBundledModule(
    (incrementalBundler as unknown as { moduleMap?: Record<string, string> } | null)?.moduleMap,
  );
  if (invalid) throw new Error(`Syntax error in ${invalid.id}: ${invalid.message}`);
}

function buildPreviewPackageJson(vfs: VirtualFS, usesExpoRouter: boolean): string {
  let pkg: Record<string, unknown> = {};
  const raw = vfs.read('/package.json');
  if (raw) {
    try {
      pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      pkg = {};
    }
  }

  const nextPkg: Record<string, unknown> = {
    ...pkg,
    dependencies: {
      ...DEFAULT_PREVIEW_DEPENDENCIES,
      ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
    },
  };

  if (usesExpoRouter) nextPkg.main = 'expo-router/entry';
  else if (nextPkg.main === 'expo-router/entry') delete nextPkg.main;

  return JSON.stringify(nextPkg);
}

function findDirectEntryFile(vfs: VirtualFS): string | null {
  for (const candidate of ROOT_ENTRY_CANDIDATES) {
    if (vfs.exists(candidate)) return candidate;
  }

  const main = vfs.getPackageMain();
  if (typeof main === 'string' && (main.startsWith('.') || main.startsWith('/'))) {
    const base = main.replace(/^\.\//, '/').replace(/^([^/])/, '/$1');
    if (vfs.exists(base)) return base;
    for (const ext of ['.js', '.ts', '.tsx', '.jsx']) {
      if (vfs.exists(base + ext)) return base + ext;
    }
  }

  return null;
}

function maybeDeleteSynthetic(vfs: VirtualFS, path: string, expectedContent?: string): boolean {
  const current = vfs.read(path);
  if (current === undefined) return false;
  if (expectedContent !== undefined && current !== expectedContent) return false;
  return vfs.delete(path);
}

function syncPreviewScaffolding(vfs: VirtualFS): {
  entryFile: string | null;
  changedPaths: string[];
  requiresFullBuild: boolean;
} {
  const changedPaths: string[] = [];
  const usesExpoRouter = vfs.list().some((path) => isRouteModuleFile(path));

  const desiredPackageJson = buildPreviewPackageJson(vfs, usesExpoRouter);
  if (vfs.read('/package.json') !== desiredPackageJson) {
    vfs.write('/package.json', desiredPackageJson);
    changedPaths.push('/package.json');
  }

  if (usesExpoRouter) {
    const nextCtx = buildExpoRouteCtx(vfs.list());
    if (vfs.read(EXPO_CTX_PATH) !== nextCtx) {
      vfs.write(EXPO_CTX_PATH, nextCtx);
      changedPaths.push(EXPO_CTX_PATH);
    }
    if (vfs.read(MOUNT_ENTRY) !== MOUNT_SOURCE_EXPO) {
      vfs.write(MOUNT_ENTRY, MOUNT_SOURCE_EXPO);
      changedPaths.push(MOUNT_ENTRY);
    }
    return {
      entryFile: MOUNT_ENTRY,
      changedPaths,
      requiresFullBuild:
        currentEntryFile !== MOUNT_ENTRY ||
        changedPaths.includes('/package.json') ||
        changedPaths.includes(MOUNT_ENTRY),
    };
  }

  maybeDeleteSynthetic(vfs, EXPO_CTX_PATH);

  const directEntry = findDirectEntryFile(vfs);
  if (directEntry && directEntry !== MOUNT_ENTRY) {
    maybeDeleteSynthetic(vfs, MOUNT_ENTRY, MOUNT_SOURCE_APP);
    return {
      entryFile: directEntry,
      changedPaths,
      requiresFullBuild:
        currentEntryFile !== directEntry ||
        changedPaths.includes('/package.json'),
    };
  }

  const hasRootApp = vfs.exists('/App.jsx') || vfs.exists('/App.tsx');
  if (hasRootApp) {
    if (vfs.read(MOUNT_ENTRY) !== MOUNT_SOURCE_APP) {
      vfs.write(MOUNT_ENTRY, MOUNT_SOURCE_APP);
      changedPaths.push(MOUNT_ENTRY);
    }
    return {
      entryFile: MOUNT_ENTRY,
      changedPaths,
      requiresFullBuild:
        currentEntryFile !== MOUNT_ENTRY ||
        changedPaths.includes('/package.json') ||
        changedPaths.includes(MOUNT_ENTRY),
    };
  }

  maybeDeleteSynthetic(vfs, MOUNT_ENTRY, MOUNT_SOURCE_APP);

  return {
    entryFile: directEntry,
    changedPaths,
    requiresFullBuild:
      currentEntryFile !== directEntry ||
      changedPaths.includes('/package.json'),
  };
}

function createBundler(vfs: VirtualFS): IncrementalBundler {
  return new IncrementalBundler(vfs, {
    resolver: { sourceExts: RESOLVER_SOURCE_EXTS },
    transformer: reactRefreshTransformer,
    server: { packageServerUrl: watchPackageServerUrl },
    hmr: { enabled: true, reactRefresh: true },
    routerShim: true,
    plugins: [
      createDataBxPathPlugin(),
      createExpoWebPlugin(),
    ],
  });
}

async function buildApiBundle(vfs: VirtualFS): Promise<string | null> {
  const apiEntry = buildApiRoutesEntry(vfs.list());
  if (!apiEntry) return null;

  vfs.write('/__api_routes.js', apiEntry);
  const bundler = new Bundler(vfs, {
    resolver: { sourceExts: RESOLVER_SOURCE_EXTS },
    transformer: typescriptTransformer,
    server: { packageServerUrl: watchPackageServerUrl },
    plugins: [createDataBxPathPlugin()],
  });

  return bundler.bundle('/__api_routes.js');
}

async function fullBuild(messageType: 'watch-ready' | 'watch-rebuild') {
  if (!watchFS || !incrementalBundler) return;

  const scaffold = syncPreviewScaffolding(watchFS);
  currentEntryFile = scaffold.entryFile;

  if (!currentEntryFile) {
    hasBundled = false;
    postMessageSafe({ type: 'idle' });
    return;
  }

  incrementalBundler.updateFS(watchFS);
  const result = await incrementalBundler.build(currentEntryFile);
  validateBundledModules();
  lastBundle = result.bundle;
  lastApiBundle = await buildApiBundle(watchFS);
  hasBundled = true;
  postMessageSafe({ type: messageType, code: result.bundle, apiBundle: lastApiBundle });
}

async function handleWatchStart(data: WatchStartRequest) {
  watchPackageServerUrl = data.packageServerUrl || DEFAULT_PACKAGE_SERVER_URL;
  watchFS = new VirtualFS(data.files);
  currentEntryFile = null;
  lastBundle = '';
  lastApiBundle = null;
  hasBundled = false;
  incrementalBundler = createBundler(watchFS);
  await fullBuild('watch-ready');
}

async function handleWatchUpdate(data: WatchUpdateRequest) {
  if (!watchFS || !incrementalBundler) {
    postMessageSafe({ type: 'idle' });
    return;
  }

  for (const change of data.changes) {
    if (change.type === 'delete') watchFS.delete(change.path);
    else watchFS.write(change.path, change.content ?? '');
  }

  const hasApiChange = data.changes.some((change) => isApiRouteFile(change.path));
  const scaffold = syncPreviewScaffolding(watchFS);
  const entryChanged = currentEntryFile !== scaffold.entryFile;
  currentEntryFile = scaffold.entryFile;

  if (!currentEntryFile) {
    hasBundled = false;
    postMessageSafe({ type: 'idle' });
    return;
  }

  incrementalBundler.updateFS(watchFS);

  if (!hasBundled || scaffold.requiresFullBuild || entryChanged) {
    const result = await incrementalBundler.build(currentEntryFile);
    validateBundledModules();
    lastBundle = result.bundle;
    lastApiBundle = await buildApiBundle(watchFS);
    hasBundled = true;
    postMessageSafe({ type: 'watch-rebuild', code: result.bundle, apiBundle: lastApiBundle });
    return;
  }

  const clientChanges: FileChange[] = data.changes
    .filter((change) => !isApiRouteFile(change.path))
    .map((change) => ({
    path: change.path,
    type: change.type,
    }));

  for (const path of scaffold.changedPaths) {
    if (path !== '/package.json') {
      clientChanges.push({ path, type: 'update' });
    }
  }

  if (hasApiChange) {
    lastApiBundle = await buildApiBundle(watchFS);
  }

  if (clientChanges.length === 0 && hasApiChange) {
    postMessageSafe({ type: 'watch-rebuild', code: lastBundle, apiBundle: lastApiBundle });
    return;
  }

  const result = await incrementalBundler.rebuild(clientChanges);
  validateBundledModules();
  lastBundle = result.bundle;
  hasBundled = true;

  if (result.type === 'full' || !result.hmrUpdate || result.hmrUpdate.requiresReload) {
    postMessageSafe({ type: 'watch-rebuild', code: result.bundle, apiBundle: hasApiChange ? lastApiBundle : undefined });
    return;
  }

  postMessageSafe({
    type: 'hmr-update',
    update: result.hmrUpdate,
    bundle: result.bundle,
    apiBundle: hasApiChange ? lastApiBundle : undefined,
  });
}

function handleWatchStop() {
  watchFS = null;
  incrementalBundler = null;
  currentEntryFile = null;
  lastBundle = '';
  lastApiBundle = null;
  hasBundled = false;
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  (async () => {
    try {
      switch (data.type) {
        case 'watch-start':
          await handleWatchStart(data);
          break;
        case 'watch-update':
          await handleWatchUpdate(data);
          break;
        case 'force-rebuild':
          await fullBuild('watch-rebuild');
          break;
        case 'watch-stop':
          handleWatchStop();
          break;
        default:
          postMessageSafe({ type: 'error', message: `Unknown preview worker message: ${(data as { type?: string }).type ?? 'unknown'}` });
      }
    } catch (err) {
      postError(err);
    }
  })();
});

export {};
