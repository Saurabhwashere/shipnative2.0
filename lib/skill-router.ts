import { NATIVE_UI_SKILL } from './skills/native-ui';
import { PIXEL_ART_SKILL } from './skills/pixel-art';

// ── Keyword sets per skill ────────────────────────────────────────────────────

const PIXEL_ART_KEYWORDS = [
  'pixel art', 'pixel-art', 'sprite', 'aseprite', '8-bit', '8bit', '16-bit', '16bit',
  'retro', 'pixel character', 'pixel animation', 'pixel game', 'tilemap', 'tile map',
  'pixel scene', 'pixelated', 'game boy', 'gameboy', 'nes ', 'pico-8', 'pico8',
  'chiptune', 'pixel icon', 'pixel logo', 'arcade', 'pixel art style',
];

// ── Message extraction ────────────────────────────────────────────────────────

type Message = {
  role: string;
  parts?: Array<{ type: string; text?: string }>;
  content?: string | Array<{ type: string; text?: string }>;
};

function extractText(messages: Message[]): string {
  return messages
    .map((m) => {
      if (Array.isArray(m.parts)) {
        return m.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text ?? '')
          .join(' ');
      }
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .filter((p) => p.type === 'text')
          .map((p) => p.text ?? '')
          .join(' ');
      }
      return '';
    })
    .join(' ')
    .toLowerCase();
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

// ── Router ────────────────────────────────────────────────────────────────────

/**
 * Given the conversation messages, returns the skill blocks that should be
 * injected into the system prompt for this request.
 *
 * native-ui  → always included (every app build needs it)
 * pixel-art  → only when the conversation mentions pixel art keywords
 */
export function routeSkills(messages: Message[]): string {
  const text = extractText(messages);
  const sections: string[] = [];

  // Always-on: native UI design system
  sections.push(`
══════════════════════════════════════════════
NATIVE UI SKILL — REQUIRED FOR EVERY APP
══════════════════════════════════════════════
${NATIVE_UI_SKILL}`);

  // Conditional: pixel art
  if (hasKeyword(text, PIXEL_ART_KEYWORDS)) {
    sections.push(`
══════════════════════════════════════════════
PIXEL ART SKILL — ACTIVATED
══════════════════════════════════════════════
${PIXEL_ART_SKILL}`);
  }

  return sections.join('\n');
}
