import { describe, it, expect } from 'vitest';
import { routeSkills } from '../../lib/skill-router';

type Msg = {
  role: string;
  parts?: Array<{ type: string; text?: string }>;
  content?: string | Array<{ type: string; text?: string }>;
};

// ── Native UI (always-on) ──────────────────────────────────────────────────

describe('routeSkills – native UI skill', () => {
  it('always includes native UI skill with empty messages', () => {
    const result = routeSkills([]);
    expect(result).toContain('NATIVE UI SKILL');
  });

  it('includes native UI skill with unrelated messages', () => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'build me a todo app' }] },
    ];
    expect(routeSkills(msgs)).toContain('NATIVE UI SKILL');
  });

  it('includes native UI skill when pixel art is requested too', () => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'make a pixel art game' }] },
    ];
    const result = routeSkills(msgs);
    expect(result).toContain('NATIVE UI SKILL');
    expect(result).toContain('PIXEL ART SKILL');
  });
});

// ── Pixel Art (conditional) ────────────────────────────────────────────────

describe('routeSkills – pixel art skill NOT included', () => {
  it('absent for generic app request', () => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'build a fitness tracker' }] },
    ];
    expect(routeSkills(msgs)).not.toContain('PIXEL ART SKILL');
  });

  it('absent when message has no text parts', () => {
    const msgs: Msg[] = [{ role: 'user', parts: [] }];
    expect(routeSkills(msgs)).not.toContain('PIXEL ART SKILL');
  });

  it('absent for chat app request', () => {
    const msgs: Msg[] = [
      { role: 'assistant', parts: [{ type: 'text', text: 'I will build a chat app for you' }] },
    ];
    expect(routeSkills(msgs)).not.toContain('PIXEL ART SKILL');
  });
});

describe('routeSkills – pixel art skill triggered by keywords', () => {
  const pixelKeywordCases: [string, string][] = [
    ['pixel art', 'pixel art'],
    ['pixel-art', 'pixel-art'],
    ['sprite', 'sprite'],
    ['8-bit', '8-bit'],
    ['8bit', '8bit'],
    ['16-bit', '16-bit'],
    ['retro game', 'retro'],
    ['aseprite', 'aseprite'],
    ['tilemap', 'tilemap'],
    ['tile map', 'tile map'],
    ['pixelated', 'pixelated'],
    ['game boy', 'game boy'],
    ['gameboy', 'gameboy'],
    ['pico-8', 'pico-8'],
    ['arcade game', 'arcade'],
    ['pixel art style', 'pixel art style'],
  ];

  it.each(pixelKeywordCases)('keyword "%s" activates pixel art skill', (text) => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text }] },
    ];
    expect(routeSkills(msgs)).toContain('PIXEL ART SKILL');
  });

  it('detects keyword in assistant message', () => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'make me a game' }] },
      { role: 'assistant', parts: [{ type: 'text', text: 'I can make a pixel art game' }] },
    ];
    expect(routeSkills(msgs)).toContain('PIXEL ART SKILL');
  });

  it('detects keyword in content array format', () => {
    const msgs: Msg[] = [
      { role: 'user', content: [{ type: 'text', text: 'I want sprites and pixel art' }] },
    ];
    expect(routeSkills(msgs)).toContain('PIXEL ART SKILL');
  });

  it('detects keyword in string content format', () => {
    const msgs: Msg[] = [
      { role: 'user', content: 'make a retro pixel game' },
    ];
    expect(routeSkills(msgs)).toContain('PIXEL ART SKILL');
  });

  it('is case-insensitive for keyword detection', () => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'PIXEL ART please' }] },
    ];
    expect(routeSkills(msgs)).toContain('PIXEL ART SKILL');
  });
});

// ── Output structure ───────────────────────────────────────────────────────

describe('routeSkills – output structure', () => {
  it('returns a non-empty string', () => {
    expect(routeSkills([])).toBeTruthy();
  });

  it('pixel art section appears after native UI section', () => {
    const msgs: Msg[] = [
      { role: 'user', parts: [{ type: 'text', text: 'make a pixel art game' }] },
    ];
    const result = routeSkills(msgs);
    expect(result.indexOf('NATIVE UI SKILL')).toBeLessThan(result.indexOf('PIXEL ART SKILL'));
  });
});
