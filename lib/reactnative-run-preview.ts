export const EXPO_CTX_PATH = '/__expo_ctx.js';
export const MOUNT_ENTRY = '/index.tsx';
export const RESOLVER_SOURCE_EXTS = ['web.ts', 'web.tsx', 'web.js', 'web.jsx', 'ts', 'tsx', 'js', 'jsx'];
export const ROOT_ENTRY_CANDIDATES = ['/index.js', '/index.ts', '/index.tsx', '/index.jsx'];

export const MOUNT_SOURCE_EXPO = `import { createRoot } from 'react-dom/client';
import { ExpoRoot } from 'expo-router';
import React from 'react';

const ctx = require('./__expo_ctx');
const container = document.getElementById('root');

function reportPreviewError(error) {
  try {
    var message = error && error.message ? error.message : String(error);
    window.parent.postMessage({ type: 'preview-error', message: message }, '*');
  } catch (_) {}
}

function App() {
  return React.createElement(ExpoRoot, { context: ctx });
}

if (container && !window.__EXPO_ROOT_REGISTERED) {
  createRoot(container, {
    onCaughtError: reportPreviewError,
    onUncaughtError: reportPreviewError,
  }).render(React.createElement(App, null));
  window.__EXPO_ROOT_REGISTERED = true;
}
`;

export const MOUNT_SOURCE_APP = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
const container = document.getElementById('root');
function reportPreviewError(error) {
  try {
    var message = error && error.message ? error.message : String(error);
    window.parent.postMessage({ type: 'preview-error', message: message }, '*');
  } catch (_) {}
}
if (container) {
  createRoot(container, {
    onCaughtError: reportPreviewError,
    onUncaughtError: reportPreviewError,
  }).render(React.createElement(App, null));
}
`;

export function isApiRouteFile(path: string): boolean {
  return /\+api\.(ts|tsx|js|jsx)$/.test(path);
}

export function isRouteModuleFile(path: string): boolean {
  return path.startsWith('/app/') && /\.(tsx?|jsx?)$/.test(path) && !isApiRouteFile(path);
}

export function filePathToRoute(filePath: string): string {
  const withoutApp = filePath.replace(/^\/app\//, '').replace(/\.[^.]+$/, '');
  const parts = withoutApp.split('/').filter(Boolean);
  const visible = parts.filter((part) => !/^_layout$/i.test(part) && !/^index$/i.test(part) && !/^\(.*\)$/.test(part));
  return visible.length ? `/${visible.join('/')}` : '/';
}

export function filePathToApiRoute(filePath: string): string {
  let route = filePath.slice('/app'.length).replace(/\+api\.(tsx?|jsx?|js)$/, '');
  if (route.endsWith('/')) route = route.slice(0, -1);
  if (route.endsWith('/index')) route = route.slice(0, -'/index'.length);
  return route || '/';
}

export function buildApiRoutesEntry(metroFilePaths: string[]): string | null {
  const apiFiles = metroFilePaths
    .filter((path) => path.startsWith('/app/') && isApiRouteFile(path))
    .map((filePath) => ({
      filePath,
      urlPath: filePathToApiRoute(filePath),
    }));

  if (apiFiles.length === 0) return null;

  const routeEntries = apiFiles.map((route) => {
    const requirePath = '.' + route.filePath.replace(/\.[^.]+$/, '');
    return `  ${JSON.stringify(route.urlPath)}: require(${JSON.stringify(requirePath)}),`;
  }).join('\n');

  return `var routes = {
${routeEntries}
};

function match(pathname) {
  if (routes[pathname]) return { handler: routes[pathname], params: {} };
  var keys = Object.keys(routes);
  for (var i = 0; i < keys.length; i++) {
    var pattern = keys[i];
    if (pattern.indexOf('[') === -1) continue;
    var patternParts = pattern.split('/');
    var pathParts = pathname.split('/');
    if (patternParts.length !== pathParts.length) continue;
    var params = {};
    var matched = true;
    for (var j = 0; j < patternParts.length; j++) {
      if (patternParts[j].startsWith('[') && patternParts[j].endsWith(']')) {
        params[patternParts[j].slice(1, -1)] = pathParts[j];
      } else if (patternParts[j] !== pathParts[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: routes[pattern], params: params };
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.__API_ROUTES__ = { routes: routes, match: match };
}

module.exports = { routes: routes, match: match };
`;
}

export function buildExpoRouteCtx(metroFilePaths: string[]): string {
  const routeFiles = metroFilePaths.filter((p) => isRouteModuleFile(p));
  const entries = routeFiles.map((p) => {
    const key = './' + p.replace(/^\/app\//, '');
    const requirePath = '.' + p.replace(/\.[^.]+$/, '');
    return `  map[${JSON.stringify(key)}] = require(${JSON.stringify(requirePath)});`;
  }).join('\n');
  return `var map = {};\n${entries}\nfunction ctx(key) { return map[key]; }\nctx.keys = function() { return Object.keys(map); };\nctx.resolve = function(key) { return key; };\nctx.id = '/__expo_ctx.js';\nmodule.exports = ctx;`;
}

const GLOBALS_PREAMBLE =
  "if(typeof __DEV__==='undefined')globalThis.__DEV__=true;\n" +
  "if(typeof global==='undefined')globalThis.global=globalThis;\n";

const EXPO_LINEAR_GRADIENT_SHIM = `
var React = require('react');
var RN = require('react-native');
exports.LinearGradient = function LinearGradient(props) {
  var colors = props.colors || ['transparent', 'transparent'];
  var start = props.start || { x: 0, y: 0 };
  var end = props.end || { x: 0, y: 1 };
  var angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
  var gradient = 'linear-gradient(' + angle.toFixed(0) + 'deg, ' + colors.join(', ') + ')';
  return React.createElement(RN.View, {
    style: [props.style, { backgroundImage: gradient }],
  }, props.children);
};
`.trim();

const EXPO_BLUR_SHIM = `
var React = require('react');
var RN = require('react-native');
exports.BlurView = function BlurView(props) {
  var intensity = props.intensity != null ? props.intensity : 50;
  var tint = props.tint || 'default';
  var bg = tint === 'dark'
    ? 'rgba(18,18,18,' + (intensity / 200).toFixed(2) + ')'
    : tint === 'light'
    ? 'rgba(255,255,255,' + (intensity / 200).toFixed(2) + ')'
    : 'rgba(128,128,128,' + (intensity / 300).toFixed(2) + ')';
  var blurPx = (intensity * 0.35).toFixed(1) + 'px';
  var children = props.children;
  return React.createElement(RN.View, {
    style: [props.style, {
      backdropFilter: 'blur(' + blurPx + ')',
      WebkitBackdropFilter: 'blur(' + blurPx + ')',
      backgroundColor: bg,
    }],
  }, children);
};
`.trim();

const NATIVEWIND_SHIM = `
var RN = require('react-native');
var _scheme = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
exports.useColorScheme = function() {
  var React = require('react');
  var s = React.useState(_scheme);
  React.useEffect(function() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var fn = function(e) { s[1](e.matches ? 'dark' : 'light'); };
    mq.addEventListener('change', fn);
    return function() { mq.removeEventListener('change', fn); };
  }, []);
  return { colorScheme: s[0] };
};
exports.vars = function(obj) { return { __cssVars: obj }; };
exports.cssInterop = function(c) { return c; };
exports.remapProps = function(c) { return c; };
exports.createStyleSheet = function(s) { return RN.StyleSheet.create(s); };
`.trim();

const EXPO_ROUTER_SHIM = `
var React = require('react');
var RN = require('react-native');
var NavigationContext = React.createContext({ pathname: '/', params: {} });
var SlotContext = React.createContext(null);
function toPathString(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && typeof input.pathname === 'string') return input.pathname;
  return '/';
}
function normalizePath(input) {
  var raw = toPathString(input);
  var hashIndex = raw.indexOf('#');
  if (hashIndex >= 0) raw = raw.slice(hashIndex + 1);
  var queryIndex = raw.indexOf('?');
  if (queryIndex >= 0) raw = raw.slice(0, queryIndex);
  if (!raw) raw = '/';
  if (raw.charAt(0) !== '/') raw = '/' + raw;
  var parts = raw.split('/').filter(Boolean);
  var visible = [];
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (/^\\(.*\\)$/.test(part)) continue;
    if (part === 'index') continue;
    visible.push(part);
  }
  var joined = '/' + visible.join('/');
  return joined === '/' ? '/' : joined.replace(/\\/+$/, '') || '/';
}
function readCurrentPath() {
  try {
    if (typeof window !== 'undefined' && typeof window.__ROUTER_SHIM_HASH__ === 'string' && window.__ROUTER_SHIM_HASH__) {
      return normalizePath(window.__ROUTER_SHIM_HASH__);
    }
  } catch (_) {}
  if (typeof location !== 'undefined') return normalizePath(location.pathname + (location.hash || ''));
  return '/';
}
function emitNavigation() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (_) {
    var ev = document.createEvent('Event');
    ev.initEvent('popstate', true, true);
    window.dispatchEvent(ev);
  }
}
function navigate(method, href) {
  var path = normalizePath(href);
  try { window.__ROUTER_SHIM_HASH__ = path; } catch (_) {}
  try {
    if (window.history && typeof window.history[method + 'State'] === 'function') {
      window.history[method + 'State']({}, '', path);
    } else if (typeof location !== 'undefined') {
      location.hash = '#' + path;
    }
  } catch (_) {
    if (typeof location !== 'undefined') location.hash = '#' + path;
  }
  emitNavigation();
}
var router = {
  push: function(href) { navigate('push', href); },
  replace: function(href) { navigate('replace', href); },
  back: function() {
    try { window.history.back(); } catch (_) {}
    emitNavigation();
  },
};
function stripExtension(key) {
  return String(key || '').replace(/\\.[^.]+$/, '');
}
function normalizeRouteSegment(segment) {
  if (/^_layout$/i.test(segment)) return '_layout';
  if (/^index$/i.test(segment)) return 'index';
  return segment;
}
function splitRouteKey(key) {
  return stripExtension(key).replace(/^\\.\\//, '').split('/').filter(Boolean).map(normalizeRouteSegment);
}
function routePathFromSegments(segments) {
  var visible = [];
  for (var i = 0; i < segments.length; i++) {
    var part = segments[i];
    if (/^_layout$/i.test(part) || /^index$/i.test(part) || /^\\(.*\\)$/.test(part)) continue;
    visible.push(part);
  }
  return visible.length ? '/' + visible.join('/') : '/';
}
function buildRecords(context) {
  var keys = context && typeof context.keys === 'function' ? context.keys() : [];
  var pages = [];
  var layouts = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var segments = splitRouteKey(key);
    var record = {
      key: key,
      segments: segments,
      path: routePathFromSegments(segments),
      isLayout: segments[segments.length - 1] === '_layout',
      load: (function(routeKey) { return function() { return context(routeKey); }; })(key),
    };
    if (record.isLayout) layouts.push(record);
    else pages.push(record);
  }
  return { pages: pages, layouts: layouts };
}
function matchPage(records, pathname) {
  for (var i = 0; i < records.length; i++) if (records[i].path === pathname) return records[i];
  for (var j = 0; j < records.length; j++) if (records[j].path === '/') return records[j];
  return records[0] || null;
}
function getLayoutsForPage(layouts, page) {
  if (!page) return [];
  var matches = [];
  for (var i = 0; i < layouts.length; i++) {
    var layout = layouts[i];
    var layoutDir = layout.segments.slice(0, -1);
    if (layoutDir.length > page.segments.length - 1) continue;
    var samePrefix = true;
    for (var j = 0; j < layoutDir.length; j++) {
      if (layoutDir[j] !== page.segments[j]) { samePrefix = false; break; }
    }
    if (samePrefix) matches.push(layout);
  }
  matches.sort(function(a, b) { return a.segments.length - b.segments.length; });
  return matches;
}
function getExportedComponent(mod) {
  if (mod && mod.__esModule && mod.default) return mod.default;
  if (mod && mod.default) return mod.default;
  if (typeof mod === 'function') return mod;
  return function MissingRoute() {
    return React.createElement(RN.View, {
      style: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#111111' },
    }, React.createElement(RN.Text, {
      style: { color: '#ffffff', textAlign: 'center' },
    }, 'Route not found'));
  };
}
function Slot() { return React.useContext(SlotContext); }
function createNavigator() {
  function Navigator(props) {
    var slot = React.useContext(SlotContext);
    var children = props && props.children ? props.children : null;
    var tabBar = props && typeof props.tabBar === 'function' ? props.tabBar(props) : null;
    return React.createElement(React.Fragment, null, children, slot, tabBar);
  }
  Navigator.Screen = function Screen() { return null; };
  return Navigator;
}
var Stack = createNavigator();
var Tabs = createNavigator();
function Link(props) {
  var href = props && props.href ? props.href : '/';
  var child = props && props.children ? props.children : null;
  var onPress = function(event) {
    if (props && typeof props.onPress === 'function') props.onPress(event);
    if (props && props.replace) router.replace(href);
    else router.push(href);
  };
  if (typeof child === 'string') child = React.createElement(RN.Text, null, child);
  return React.createElement(RN.Pressable, Object.assign({}, props, {
    href: undefined,
    replace: undefined,
    onPress: onPress,
  }), child);
}
function Redirect(props) {
  React.useEffect(function() {
    if (props && props.href) router.replace(props.href);
  }, [props && props.href]);
  return null;
}
function ExpoRoot(props) {
  var context = props.context;
  var state = React.useState(readCurrentPath());
  var pathname = state[0];
  var setPathname = state[1];
  React.useEffect(function() {
    function handleNavigation() { setPathname(readCurrentPath()); }
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return function() {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);
  var records = buildRecords(context);
  var page = matchPage(records.pages, pathname);
  var layouts = getLayoutsForPage(records.layouts, page);
  var routeNode = React.createElement(getExportedComponent(page ? page.load() : null), null);
  for (var i = layouts.length - 1; i >= 0; i--) {
    routeNode = React.createElement(
      SlotContext.Provider,
      { value: routeNode },
      React.createElement(getExportedComponent(layouts[i].load()), null)
    );
  }
  return React.createElement(
    NavigationContext.Provider,
    { value: { pathname: pathname, params: {} } },
    routeNode
  );
}
exports.ExpoRoot = ExpoRoot;
exports.Link = Link;
exports.Redirect = Redirect;
exports.Slot = Slot;
exports.Stack = Stack;
exports.Tabs = Tabs;
exports.router = router;
exports.useLocalSearchParams = function() { return React.useContext(NavigationContext).params; };
exports.useFocusEffect = function(effect) {
  React.useEffect(function() {
    if (typeof effect !== 'function') return undefined;
    var cleanup = effect();
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [effect]);
};
exports.usePathname = function() { return React.useContext(NavigationContext).pathname; };
exports.useRouter = function() { return router; };
exports.useSegments = function() {
  var pathname = React.useContext(NavigationContext).pathname;
  return pathname.split('/').filter(Boolean);
};
`.trim();

const TYPEOF_MEMBER_OR_INDEX_ACCESS_RE = /\btypeof\s+[A-Z]\w*(?:\.\w+|\[[^[\]]+\])+/g;
const PARENTHESIZED_TYPEOF_INDEX_ACCESS_RE = /\(\s*typeof\s+[A-Z]\w*(?:\.\w+|\[[^[\]]+\])*\s*\)(?:\[[^[\]]+\])+/g;
const HOOK_GENERIC_RE = /\b(use[A-Z][a-zA-Z0-9]*)<([^>()]*)>/g;

export function rewriteSourceForSucraseCompatibility(src: string, filename: string): string {
  if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) return src;
  let out = src;
  out = out.replace(PARENTHESIZED_TYPEOF_INDEX_ACCESS_RE, 'any');
  out = out.replace(TYPEOF_MEMBER_OR_INDEX_ACCESS_RE, 'any');
  out = out.replace(HOOK_GENERIC_RE, (match, hook, typeArg) =>
    /(?:\.|\[|\btypeof\b)/.test(typeArg) ? hook : match,
  );
  return out;
}

export function findFirstInvalidBundledModule(
  moduleMap: Record<string, string> | null | undefined,
): { id: string; message: string } | null {
  if (!moduleMap) return null;
  for (const [id, code] of Object.entries(moduleMap)) {
    if (!id.startsWith('/')) continue;
    try {
      // eslint-disable-next-line no-new-func
      new Function('module', 'exports', 'require', code);
    } catch (err) {
      return { id, message: err instanceof Error ? err.message : String(err) };
    }
  }
  return null;
}

export function createExpoWebPlugin() {
  return {
    name: 'expo-web',
    moduleAliases(): Record<string, string> {
      return { 'react-native': 'react-native-web' };
    },
    shimModules(): Record<string, string> {
      return {
        'react-native-css-interop': 'module.exports = {};',
        'nativewind': NATIVEWIND_SHIM,
        'expo-router': EXPO_ROUTER_SHIM,
        'expo-blur': EXPO_BLUR_SHIM,
        'expo-linear-gradient': EXPO_LINEAR_GRADIENT_SHIM,
      };
    },
    transformSource({ src, filename }: { src: string; filename: string }) {
      let out = rewriteSourceForSucraseCompatibility(src, filename);
      if ((filename.endsWith('.tsx') || filename.endsWith('.jsx')) && !/\bimport\s+React\b/.test(out)) {
        out = 'import React from "react";\n' + out;
      }
      return out !== src ? { src: out } : null;
    },
    transformOutput({ code }: { code: string }) {
      return { code: GLOBALS_PREAMBLE + code };
    },
  };
}
