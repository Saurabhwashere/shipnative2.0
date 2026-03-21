/**
 * Service Worker Logic Tests
 *
 * We test the SW logic by extracting its pure functions into testable units.
 * The actual SW file (preview-sw.js) runs in a browser context, so we
 * test the logic by recreating the key behaviours in a Node-compatible way.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Extract and test the getContentType helper ───────────────────────────────

function getContentType(path: string): string {
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

describe('getContentType', () => {
  it('.js → application/javascript', () => {
    expect(getContentType('/App.js')).toBe('application/javascript; charset=utf-8');
  });

  it('.mjs → application/javascript', () => {
    expect(getContentType('/module.mjs')).toBe('application/javascript; charset=utf-8');
  });

  it('.html → text/html', () => {
    expect(getContentType('/preview.html')).toBe('text/html; charset=utf-8');
  });

  it('.css → text/css', () => {
    expect(getContentType('/styles.css')).toBe('text/css; charset=utf-8');
  });

  it('.json → application/json', () => {
    expect(getContentType('/data.json')).toBe('application/json; charset=utf-8');
  });

  it('unknown extension → text/plain', () => {
    expect(getContentType('/file.xyz')).toBe('text/plain; charset=utf-8');
  });
});

// ─── Simulate SW message handler logic ───────────────────────────────────────

class MockSW {
  files = new Map<string, string>();
  clients: { postMessage: ReturnType<typeof vi.fn> }[] = [];
  sourceMessages: { type: string; path?: string; id?: string }[] = [];

  handleMessage(data: { type: string; path?: string; content?: string; id?: string }) {
    const source = {
      postMessage: vi.fn((msg: any) => this.sourceMessages.push(msg)),
    };

    switch (data.type) {
      case 'write-file': {
        const { path, content, id } = data as { path: string; content: string; id: string };
        this.files.set(path, content);
        source.postMessage({ type: 'file-written', path, id });
        // Broadcast to all clients
        for (const client of this.clients) {
          client.postMessage({ type: 'hmr-update', path });
        }
        break;
      }
      case 'clear-files': {
        this.files.clear();
        source.postMessage({ type: 'files-cleared' });
        break;
      }
      case 'ping': {
        source.postMessage({ type: 'pong' });
        break;
      }
    }
    return source;
  }

  handleFetch(url: string, origin = 'http://localhost:3000'): Response | null {
    const parsedUrl = new URL(url, origin);
    if (parsedUrl.origin !== origin) return null; // not same-origin

    const path = parsedUrl.pathname;
    if (this.files.has(path)) {
      return new Response(this.files.get(path)!, {
        status: 200,
        headers: {
          'Content-Type': getContentType(path),
          'Cache-Control': 'no-store',
        },
      });
    }
    return null; // fall through
  }
}

describe('SW – write-file message', () => {
  let sw: MockSW;

  beforeEach(() => {
    sw = new MockSW();
  });

  it('stores file in the files Map', () => {
    sw.handleMessage({ type: 'write-file', path: '/App.js', content: 'const x = 1;', id: '1' });
    expect(sw.files.get('/App.js')).toBe('const x = 1;');
  });

  it('sends file-written confirmation back to source', () => {
    const source = sw.handleMessage({ type: 'write-file', path: '/App.js', content: 'code', id: 'abc' });
    expect(source.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'file-written', id: 'abc' }),
    );
  });

  it('broadcasts hmr-update to all clients', () => {
    const client = { postMessage: vi.fn() };
    sw.clients.push(client);
    sw.handleMessage({ type: 'write-file', path: '/App.js', content: 'code', id: '1' });
    expect(client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'hmr-update', path: '/App.js' }),
    );
  });

  it('broadcasts to all clients, not just the sender', () => {
    const c1 = { postMessage: vi.fn() };
    const c2 = { postMessage: vi.fn() };
    sw.clients.push(c1, c2);
    sw.handleMessage({ type: 'write-file', path: '/App.js', content: 'code', id: '1' });
    expect(c1.postMessage).toHaveBeenCalled();
    expect(c2.postMessage).toHaveBeenCalled();
  });
});

describe('SW – clear-files message', () => {
  let sw: MockSW;

  beforeEach(() => {
    sw = new MockSW();
  });

  it('empties the files Map', () => {
    sw.handleMessage({ type: 'write-file', path: '/App.js', content: 'code', id: '1' });
    sw.handleMessage({ type: 'clear-files' });
    expect(sw.files.size).toBe(0);
  });

  it('sends files-cleared confirmation', () => {
    const source = sw.handleMessage({ type: 'clear-files' });
    expect(source.postMessage).toHaveBeenCalledWith({ type: 'files-cleared' });
  });
});

describe('SW – fetch interception', () => {
  let sw: MockSW;

  beforeEach(() => {
    sw = new MockSW();
    sw.handleMessage({ type: 'write-file', path: '/App.js', content: '/* app code */', id: '1' });
    sw.handleMessage({ type: 'write-file', path: '/preview.html', content: '<html/>', id: '2' });
  });

  it('returns file from Map for known path', () => {
    const response = sw.handleFetch('http://localhost:3000/App.js');
    expect(response).not.toBeNull();
    expect(response!.status).toBe(200);
  });

  it('serves correct content for known path', async () => {
    const response = sw.handleFetch('http://localhost:3000/App.js');
    const text = await response!.text();
    expect(text).toBe('/* app code */');
  });

  it('returns null (fall through) for unknown path', () => {
    const response = sw.handleFetch('http://localhost:3000/unknown.js');
    expect(response).toBeNull();
  });

  it('query string is stripped — /App.js?t=123 resolves /App.js', () => {
    // URL.pathname strips the query string automatically
    const url = new URL('http://localhost:3000/App.js?t=123');
    expect(url.pathname).toBe('/App.js');
    const response = sw.handleFetch('http://localhost:3000/App.js?t=123');
    expect(response).not.toBeNull();
  });

  it('does not intercept cross-origin requests', () => {
    const response = sw.handleFetch('https://esm.sh/react', 'http://localhost:3000');
    expect(response).toBeNull();
  });

  it('sets correct Content-Type for .js file', async () => {
    const response = sw.handleFetch('http://localhost:3000/App.js');
    expect(response!.headers.get('Content-Type')).toContain('application/javascript');
  });

  it('sets no-store Cache-Control', () => {
    const response = sw.handleFetch('http://localhost:3000/App.js');
    expect(response!.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('SW – ping / pong', () => {
  it('responds with pong to ping message', () => {
    const sw = new MockSW();
    const source = sw.handleMessage({ type: 'ping' });
    expect(source.postMessage).toHaveBeenCalledWith({ type: 'pong' });
  });
});
