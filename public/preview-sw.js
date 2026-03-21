/**
 * ShipNative Preview Service Worker
 * Intercepts fetch requests and serves virtual files stored in memory.
 */

/** @type {Map<string, string>} path → transformed JS/HTML content */
const files = new Map();

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Skip waiting so this SW activates immediately without refreshing
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all open clients immediately
  event.waitUntil(self.clients.claim());
});

// ─── Messaging ────────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  switch (data.type) {
    case 'write-file': {
      const { path, content, id } = data;
      files.set(path, content);

      // Confirm write to the sender
      if (event.source) {
        event.source.postMessage({ type: 'file-written', path, id });
      }

      // Broadcast HMR update to all clients (preview iframe will reload)
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'hmr-update', path });
        }
      });
      break;
    }

    case 'clear-files': {
      files.clear();
      if (event.source) {
        event.source.postMessage({ type: 'files-cleared' });
      }
      break;
    }

    case 'ping': {
      if (event.source) {
        event.source.postMessage({ type: 'pong' });
      }
      break;
    }

    default:
      break;
  }
});

// ─── Fetch Interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  // Strip query string for file lookup (handles cache-busting like ?t=12345)
  const path = url.pathname;

  if (files.has(path)) {
    event.respondWith(
      new Response(files.get(path), {
        status: 200,
        headers: {
          'Content-Type': getContentType(path),
          'Cache-Control': 'no-store',
        },
      }),
    );
  }
  // All other requests fall through to the network (Next.js, CDN, etc.)
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContentType(path) {
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}
