import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VirtualFS } from '../../lib/vfs';

let vfs: VirtualFS;

beforeEach(() => {
  vfs = new VirtualFS();
});

describe('VirtualFS – writeFile', () => {
  it('creates a new file readable by readFile', () => {
    vfs.writeFile('App.jsx', 'const x = 1;');
    expect(vfs.readFile('App.jsx')).toBe('const x = 1;');
  });

  it('emits "create" event for a new file', () => {
    const cb = vi.fn();
    vfs.onChange(cb);
    vfs.writeFile('App.jsx', 'hello');
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'create', path: 'App.jsx' }),
    );
  });

  it('emits "change" event when overwriting an existing file', () => {
    vfs.writeFile('App.jsx', 'v1');
    const cb = vi.fn();
    vfs.onChange(cb);
    vfs.writeFile('App.jsx', 'v2');
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'change', path: 'App.jsx' }),
    );
  });

  it('updates the content on overwrite', () => {
    vfs.writeFile('App.jsx', 'v1');
    vfs.writeFile('App.jsx', 'v2');
    expect(vfs.readFile('App.jsx')).toBe('v2');
  });
});

describe('VirtualFS – readFile', () => {
  it('throws when file does not exist', () => {
    expect(() => vfs.readFile('missing.js')).toThrow('File not found: missing.js');
  });
});

describe('VirtualFS – deleteFile', () => {
  it('removes the file so readFile throws', () => {
    vfs.writeFile('App.jsx', 'x');
    vfs.deleteFile('App.jsx');
    expect(() => vfs.readFile('App.jsx')).toThrow();
  });

  it('emits "delete" event', () => {
    vfs.writeFile('App.jsx', 'x');
    const cb = vi.fn();
    vfs.onChange(cb);
    vfs.deleteFile('App.jsx');
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'delete', path: 'App.jsx' }),
    );
  });

  it('does not emit when file did not exist', () => {
    const cb = vi.fn();
    vfs.onChange(cb);
    vfs.deleteFile('nonexistent.js');
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('VirtualFS – exists', () => {
  it('returns false for missing file', () => {
    expect(vfs.exists('nope.js')).toBe(false);
  });

  it('returns true after writeFile', () => {
    vfs.writeFile('App.jsx', '');
    expect(vfs.exists('App.jsx')).toBe(true);
  });

  it('returns false after deleteFile', () => {
    vfs.writeFile('App.jsx', '');
    vfs.deleteFile('App.jsx');
    expect(vfs.exists('App.jsx')).toBe(false);
  });
});

describe('VirtualFS – listFiles', () => {
  it('returns empty array when no files', () => {
    expect(vfs.listFiles()).toEqual([]);
  });

  it('returns all written file paths (sorted)', () => {
    vfs.writeFile('z.js', '');
    vfs.writeFile('a.js', '');
    expect(vfs.listFiles()).toEqual(['a.js', 'z.js']);
  });

  it('excludes deleted files', () => {
    vfs.writeFile('a.js', '');
    vfs.writeFile('b.js', '');
    vfs.deleteFile('a.js');
    expect(vfs.listFiles()).toEqual(['b.js']);
  });
});

describe('VirtualFS – getAllFiles', () => {
  it('returns ProjectFile objects with path, content, lastModified', () => {
    vfs.writeFile('App.jsx', 'hello');
    const files = vfs.getAllFiles();
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ path: 'App.jsx', content: 'hello' });
    expect(typeof files[0].lastModified).toBe('number');
  });
});

describe('VirtualFS – getFile', () => {
  it('throws for missing file', () => {
    expect(() => vfs.getFile('nope.js')).toThrow('File not found: nope.js');
  });

  it('returns the ProjectFile', () => {
    vfs.writeFile('App.jsx', 'content');
    const f = vfs.getFile('App.jsx');
    expect(f.path).toBe('App.jsx');
    expect(f.content).toBe('content');
  });
});

describe('VirtualFS – toJSON / fromJSON', () => {
  it('serialises and restores all files', () => {
    vfs.writeFile('App.jsx', 'app content');
    vfs.writeFile('Home.jsx', 'home content');
    const json = vfs.toJSON();

    const vfs2 = new VirtualFS();
    vfs2.fromJSON(json);

    expect(vfs2.readFile('App.jsx')).toBe('app content');
    expect(vfs2.readFile('Home.jsx')).toBe('home content');
  });

  it('fromJSON clears existing files before restoring', () => {
    vfs.writeFile('Old.jsx', 'old');
    const snapshot = new VirtualFS();
    snapshot.writeFile('New.jsx', 'new');
    vfs.fromJSON(snapshot.toJSON());

    expect(vfs.exists('Old.jsx')).toBe(false);
    expect(vfs.readFile('New.jsx')).toBe('new');
  });
});

describe('VirtualFS – onChange subscription', () => {
  it('returns an unsubscribe function that stops future events', () => {
    const cb = vi.fn();
    const unsub = vfs.onChange(cb);
    unsub();
    vfs.writeFile('App.jsx', 'x');
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires multiple independent listeners for the same event', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    vfs.onChange(cb1);
    vfs.onChange(cb2);
    vfs.writeFile('App.jsx', 'x');
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('emitted event has correct timestamp shape', () => {
    const cb = vi.fn();
    vfs.onChange(cb);
    const before = Date.now();
    vfs.writeFile('App.jsx', 'x');
    const after = Date.now();
    const event = cb.mock.calls[0][0];
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(after);
  });
});
