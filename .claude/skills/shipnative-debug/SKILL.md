# ShipNative Debug & Fix Reference

Use this skill whenever diagnosing or fixing issues with the ShipNative preview engine, bundler integration, HMR, Expo Router routing, API routes, shims, or iframe rendering.

**Primary reference (local)**: `/Users/saurabhsingh/Desktop/reactnative-run/reactnative-run/`
**Repo**: https://github.com/RapidNative/reactnative-run
**Docs**: https://www.reactnative.run/docs

---

## Local Source Layout

```
browser-metro/src/
  incremental-bundler.ts   ← IncrementalBundler class (core)
  bundler.ts               ← Bundler class (one-shot)
  fs.ts                    ← VirtualFS class
  hmr-runtime.ts           ← HMR_RUNTIME_TEMPLATE + emitHmrBundle()
  resolver.ts              ← Resolver (Node-style, tsconfig paths support)
  dependency-graph.ts      ← DependencyGraph (forward + reverse edges, orphan detection)
  module-cache.ts          ← ModuleCache (content-hash keyed)
  utils.ts                 ← findRequires, rewriteRequires, buildBundlePreamble, buildRouterShim, hashDeps
  transforms/
    typescript.ts          ← typescriptTransformer (Sucrase)
    react-refresh.ts       ← reactRefreshTransformer (wraps typescript, adds HMR accept + Refresh)
  plugins/
    data-bx-path.ts        ← createDataBxPathPlugin() (injects data-bx-path on JSX elements)
  types.ts                 ← All exported types
  index.ts                 ← Public API exports

browser-metro/example/src/
  editor-fs.ts             ← EditorFS reference: how to properly sync changes to the bundler

reactnative-esm/src/
  index.ts                 ← Express server: /pkg/* (individual) + /bundle-deps (batch)
```

---

## Exact Types (from source)

```ts
// fs.ts
interface FileEntry { content: string; isExternal: boolean; }
type FileMap = { [path: string]: FileEntry };   // ← constructor takes this, NOT plain strings

// types.ts
interface FileChange  { path: string; type: 'create' | 'update' | 'delete'; }
interface ContentChange { path: string; type: 'create' | 'update' | 'delete'; content?: string; } // content omitted for delete

interface HmrUpdate {
  updatedModules: Record<string, string>;  // moduleId → code
  removedModules: string[];
  requiresReload: boolean;
  reloadReason?: string;
  reverseDepsMap?: Record<string, string[]>;
}

interface IncrementalBuildResult {
  bundle: string;
  hmrUpdate: HmrUpdate | null;    // null on initial build()
  type: 'full' | 'incremental';
  rebuiltModules: string[];       // local file paths only
  removedModules: string[];
  buildTime: number;              // ms
}

interface BundlerConfig {
  resolver: ResolverConfig;                     // { sourceExts, paths? }
  transformer: Transformer;
  server: { packageServerUrl: string };
  hmr?: { enabled: boolean; reactRefresh?: boolean };
  plugins?: BundlerPlugin[];
  env?: Record<string, string>;               // only EXPO_PUBLIC_* / NEXT_PUBLIC_* injected
  routerShim?: boolean;                       // virtualizes History/URL APIs in the bundle
  assetPublicPath?: string;
}
```

---

## VirtualFS API (actual source)

```ts
// VirtualFS constructor takes FileMap ({ [path]: { content, isExternal } })
// NOT plain strings — pass {} and use write() to add files safely
const metroVFS = new VirtualFS({});
metroVFS.write('/app/home.tsx', source);   // wraps as { content, isExternal: false }
metroVFS.read('/app/home.tsx');            // string | undefined
metroVFS.delete('/app/home.tsx');          // boolean — MUST call before rebuild({type:'delete'})
metroVFS.exists('/app/home.tsx');          // boolean
metroVFS.list();                           // string[]
metroVFS.toFileMap();                      // FileMap copy
metroVFS.diff(newFileMap);                 // FileChange[] — compare and compute delta
metroVFS.replaceAll(newFileMap);           // replace all files atomically
metroVFS.getEntryFile();                   // checks /index.{js,ts,tsx,jsx}, /App.{js,ts,tsx,jsx}, package.json "main"
metroVFS.isExternalAsset(path);            // true if file was marked isExternal: true
```

**Critical**: `vfs.delete()` must be called on MetroVFS BEFORE passing `{type:'delete'}` to `rebuild()`, otherwise the file still exists in the VFS and won't be removed from the module map.

---

## IncrementalBundler — What Actually Happens

### `build(entryFile)`
1. Reads `/package.json` from VFS for dep versions (used for batch prefetch + version pinning)
2. Calls `prefetchDependencies()` → `GET /bundle-deps/:hash` then `POST /bundle-deps` — **only works if `/package.json` is in VFS**
3. `walkDeps(entryFile)` — BFS from entry, processes every reachable file
4. Fetches missing npm packages from ESM server (individually if batch failed)
5. Resolves transitive npm deps (subpath requires like `react-dom/client`)
6. Injects alias shim modules and inline shim modules
7. Emits HMR bundle via `emitHmrBundle()` (if `hmr.enabled`) or standard IIFE

### `rebuild(changes: FileChange[])`
- `type: 'create'` and `type: 'update'` are **handled identically** — both just invalidate cache and reprocess
- `type: 'delete'` → removes from graph, cache, moduleMap; adds dependents to reprocess set
- After reprocessing: orphan detection via `graph.findOrphans(entryFile)` removes unreachable modules
- If `/package.json` changed AND deps differ → full `build()` re-triggered
- `hmrUpdate.requiresReload = true` ONLY when the entry file itself is in `rebuiltModules`
- New npm packages introduced in this rebuild are included in `updatedModules` so the running iframe's module closure has them

### Auto-detection for tsconfig paths
`IncrementalBundler` reads `/tsconfig.json` from VFS on construction:
```ts
const paths = IncrementalBundler.readTsconfigPaths(fs);
// Used for path alias resolution: "@/*" → "/*" etc.
```
If no `/tsconfig.json` in VFS → no path alias support → `@/components/...` imports break.

---

## HMR Runtime (from `hmr-runtime.ts`)

The bundle IIFE signature:
```js
HMR_RUNTIME_TEMPLATE(modules, reverseDeps, entryId, reactRefreshEnabled)
```

Key behavior:
- `window.__BUNDLER_HMR__` — exposed globally for debugging: `{ applyUpdate, modules, cache, hotState }`
- Listens for `{ type: 'hmr-update', updatedModules, removedModules, reverseDepsMap }` from parent
- No accept boundary found → `window.parent.postMessage({ type: 'hmr-full-reload' }, '*')`
- Error during module re-execution → also sends `hmr-full-reload`
- `module.hot.accept()` marks a module as an accept boundary
- `module.hot.decline()` forces `hmr-full-reload` when that module changes
- **Phase 5 (critical)**: ALL caches cleared in one pass BEFORE any re-execution — prevents stale requires

### React Refresh Transformer (from `react-refresh.ts`)
- Only applies to `.tsx` and `.jsx` files
- Detects component names (uppercase functions/consts)
- Adds `module.hot.accept()` to every transformed file → every component is its own HMR boundary
- Patches `React.createContext` on HMR re-execution to return the **same context object** (keyed by `moduleId:ctx:N`) — prevents "must be used within Provider" errors after hot reload
- Hook signatures tracked to force remount when hooks are added/removed (uses full ordered sequence, not deduped Set)

---

## Router Shim (from `utils.ts buildRouterShim()`)

When `routerShim: true`, the bundle preamble virtualizes the History API inside the iframe:
- Reads `location.hash` for the initial route (blob URLs encode route as `#/path`)
- Overrides `history.pushState`, `history.replaceState`, `history.go`, `history.back`, `history.forward`
- Wraps the `URL` constructor so `new URL(location.href)` returns the virtual pathname, not the blob UUID
- Stores current route in `window.__ROUTER_SHIM_HASH__` — readable by parent via `iframe.contentWindow.__ROUTER_SHIM_HASH__`
- Parent uses this to restore route after full blob reload

ShipNative reads this in `pipeline.getCurrentRoute()`:
```ts
(this.targetWindow as any)?.__ROUTER_SHIM_HASH__ ?? ''
```
Then appends it to the new blob URL: `this.currentHtmlUrl + route`

---

## ESM Package Server (`reactnative-esm/src/index.ts`)

### Endpoints
- `GET /pkg/:specifier` — individual package, unpkg-style URL
- `GET /bundle-deps/:hash` — cached batch bundle (CDN-cacheable, immutable)
- `POST /bundle-deps` — build batch bundle for all `package.json` deps

### Per-package bundling logic
1. Parses specifier → pkgName, version, subpath
2. Checks disk cache (exact version first, then resolves semver range via `npm view`)
3. `npm install pkgName@version --legacy-peer-deps` in temp dir
4. Reads `package.json` to detect React Native / Expo package and collect externals
5. For RN/Expo packages: adds implicit externals:
   ```
   react-native, react, react-dom, expo, expo-modules-core,
   expo-modules-autolinking, expo-constants, expo-linking,
   expo-status-bar, expo-splash-screen, expo-font, expo-asset
   ```
6. esbuild with `format: "iife"`, `globalName: "__module"`, `platform: "browser"`
7. For RN packages: `.web.*` extension priority, `.js` loader as `jsx`, font/image as `dataurl`
8. Filters `.android.*` / `.ios.*` / `.windows.*` files (empty modules)
9. Stubs Node.js built-ins (`buffer`, `stream`, `path`, `fs`, etc.) as `{}`
10. Response: `// @externals {...}\n<IIFE code>\nif (typeof __module !== "undefined") { module.exports = __module; }`
11. `X-Externals` header → bundler reads this to pin transitive dep versions

### Batch prefetch (`/bundle-deps`)
Only used when `/package.json` exists in MetroVFS. Bundles all deps in a single npm install + esbuild run, then serves as one file. Much faster first-build experience.

---

## Reference: EditorFS Pattern (from `browser-metro/example/src/editor-fs.ts`)

The canonical pattern for syncing editor changes to the bundler. ShipNative's `handleVFSChange` diverges from this in key ways:

```ts
// EditorFS.write() — what the reference does:
write(path, content) {
  const existed = path in this.files;
  this.files[path] = { content, isExternal: false };
  this.dirty.set(path, {
    path,
    type: existed ? 'update' : 'create',  // ← correct type tracking
    content,
  });
  this.scheduleFlush(); // GLOBAL debounce, not per-path
}

// EditorFS.delete()
delete(path) {
  delete this.files[path];
  this.dirty.set(path, { path, type: 'delete' });  // ← tracked
  this.scheduleFlush();
}

// EditorFS.flush() — sends ALL accumulated changes in ONE message
flush() {
  const changes = [...this.dirty.values()];
  this.dirty.clear();
  worker.postMessage({ type: 'watch-update', changes }); // one rebuild call
}
```

Key differences from ShipNative:
| | EditorFS (reference) | ShipNative `handleVFSChange` |
|---|---|---|
| Debounce | Global single timer | Per-path timer |
| Batching | All dirty changes in one `rebuild()` | One file per `rebuild()` |
| Deletes | Tracked, sent as `{type:'delete'}` | Dropped (`return` immediately) |
| MetroVFS sync | `vfs.write()` from content in change | `metroVFS.write()` from `readFile()` |

---

## Known ShipNative Issues

### 🔴 Bug: File Deletions Silently Dropped
```ts
// preview-pipeline.ts:350
if (event.type === 'delete') return;
```
MetroVFS keeps deleted files forever. Deleted modules still resolve (return stale content). Deleted route files remain in `/__expo_ctx.js`. Dependents of deleted modules aren't reprocessed. The `rebuild()` orphan cleanup (`graph.findOrphans()`) can't run because the file was never passed as a delete change.

**Fix**:
```ts
if (event.type === 'delete') {
  this.metroVFS.delete(metroPath);  // remove from VFS FIRST
  if (this.hasBundled) {
    await this.bundler.rebuild([{ path: metroPath, type: 'delete' }]);
  }
  return;
}
```

### 🟠 Per-path Debounce = N Rebuilds for N Files
When the AI writes 10 files rapidly, each gets its own 150ms timer → 10 sequential `rebuild()` calls. The reference EditorFS uses a global debounce that batches all changes into one call. This is the largest performance gap, especially noticeable on first-build of a multi-file app.

### 🟠 No `package.json` in MetroVFS → No Batch Prefetch
`prefetchDependencies()` reads `/package.json` from VFS. Since ShipNative never writes a `package.json` to MetroVFS, batch prefetching never runs. Every npm package is fetched individually during the build walk. This makes the first build significantly slower for apps with many dependencies.

**Fix**: Write a minimal `package.json` to MetroVFS with the expected dependencies before `build()`.

### 🟠 No `tsconfig.json` in MetroVFS → `@/` Imports Break
`IncrementalBundler` reads `/tsconfig.json` on construction to set up path aliases. Without it, `@/components/NavBar` fails to resolve. AI-generated code should use relative imports, but this is a silent foot-gun if tsconfig paths are used.

**Fix**: Write a minimal `tsconfig.json` to MetroVFS:
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

### 🟡 Dead Code: `lib/native-ui-skill.ts`
Exports `NATIVE_UI_SKILL_PROMPT` but nothing imports it. Active skill is `lib/skills/native-ui.ts` (imported by `lib/skill-router.ts`). The old file has a web-only GlassView (CSS backdropFilter); the active file uses `expo-blur` BlurView.

### 🟡 `hmr-full-reload` Triggers Expensive `forceRefresh()`
When the HMR runtime can't find an accept boundary, it posts `hmr-full-reload`. PhonePreview calls `refreshPreview()` → `forceRefresh()` → full `bundler.build()` (refetches all packages). The last good `result.bundle` could be re-served instead.

---

## Common Issues & Fixes

### Preview stays black after AI finishes writing
**Cause**: `isReady` never set to `true`. Both `onReady` AND `onRefresh` must set it.
```ts
onReady:   (url) => { setPreviewUrl(url); setIsReady(true); },
onRefresh: (url) => { setPreviewUrl(url); setPreviewError(null); setIsReady(true); },
```

### Expo Router app never builds during AI streaming
**By design**: `handleVFSChange` skips `app/` files while entry is still `MOUNT_SOURCE_APP`. The switch to Expo mode is deferred to `forceRefresh()` (called 300ms after AI turn ends). This ensures the full route context is populated before the first Expo build.

### HMR causes blank screen
Check `hmrUpdate.requiresReload` before hot-patching. `requiresReload: true` only fires when the **entry file itself** is in `rebuiltModules`. Fall back to full blob reload in that case.

### Module not found for native-only package
Add a `shimModules()` entry in the expo-web plugin. The ESM server adds native packages as implicit externals — they'll be fetched on demand, but some (like `react-native-reanimated`) have native API calls that crash on web. Provide minimal stubs.

### `__DEV__` or `global` undefined
The `transformOutput` hook adds them, but also add them to the HTML shell `<script>` preamble as a belt-and-suspenders guard.

### `@/` imports fail to resolve
Write `/tsconfig.json` to MetroVFS with `compilerOptions.paths`. Without it, the Resolver has no alias map.

### Route context keys wrong → routes not found
Keys must be relative to `/app/` WITH extension (`"./home.tsx"`), require paths relative from root WITHOUT extension (`"./app/home"`). A mismatch silently skips the route.

### Deleted file still resolves after AI removes it
File deletions aren't propagated to MetroVFS (known bug). `metroVFS.delete(path)` is never called. The stale module stays in the bundle until `forceRefresh()` does a clean rebuild.

### Context lost after hot reload ("must be used within Provider")
React Refresh transformer patches `React.createContext` to return the same context object across HMR re-executions (keyed by `moduleId:ctx:index`, stored in `window.__HMR_CONTEXTS__`). This is automatic. If it still breaks, the context file may not be a `.tsx`/`.jsx` file and won't get the React Refresh preamble.

---

## Debugging Checklist

1. `[Pipeline]` logs in DevTools console — shows build start/errors
2. Check `bundler.build()` rejection message — usually "Module not found: X" or a Sucrase syntax error
3. Check `window.__BUNDLER_HMR__` in iframe console — inspect `modules`, `cache`, `hotState`
4. `metroVFS.list()` — verify all expected paths exist with leading `/`
5. Verify `/__expo_ctx.js` key format: `"./home.tsx"` not `"/app/home.tsx"`
6. Check `hmrUpdate.requiresReload` + `reloadReason` for HMR failures
7. Verify `previewUrl` is a `blob:` URL and `isReady === true`
8. For "Module not found": check `https://esm.reactnative.run/pkg/<name>` availability

---

## Reference Links

| Resource | Path / URL |
|----------|------------|
| IncrementalBundler source | `browser-metro/src/incremental-bundler.ts` |
| VirtualFS source | `browser-metro/src/fs.ts` |
| HMR runtime source | `browser-metro/src/hmr-runtime.ts` |
| Router shim source | `browser-metro/src/utils.ts` → `buildRouterShim()` |
| React Refresh transformer | `browser-metro/src/transforms/react-refresh.ts` |
| ESM server source | `reactnative-esm/src/index.ts` |
| EditorFS reference pattern | `browser-metro/example/src/editor-fs.ts` |
| Repo | https://github.com/RapidNative/reactnative-run |
| Docs home | https://www.reactnative.run/docs |
| Architecture | https://reactnative.run/docs/architecture |
| HMR & React Refresh | https://reactnative.run/docs/hmr |
| Expo Router | https://reactnative.run/docs/expo-router |
| API Routes | https://reactnative.run/docs/api-routes |
| Shims & Polyfills | https://reactnative.run/docs/shims |
| ESM Server | https://reactnative.run/docs/esm-server |
| IncrementalBundler API | https://www.reactnative.run/docs/api/incremental-bundler |
| VirtualFS API | https://www.reactnative.run/docs/api/virtual-fs |
| Plugins API | https://www.reactnative.run/docs/api/plugins |
