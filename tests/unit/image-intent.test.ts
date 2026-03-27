import { describe, it, expect } from 'vitest';

// ── Image intent detection logic ──────────────────────────────────────────
// Replicates the regex logic from app/api/chat/route.ts so it can be unit
// tested without pulling in the full Next.js / Anthropic SDK dependencies.

function detectImageIntent(userText: string): 'design-reference' | 'asset' | 'element-copy' | 'ambiguous' {
  const t = userText.toLowerCase();

  const isDesignRef =
    /make.{0,20}look like|design.{0,15}like|copy.{0,15}style|match.{0,15}design|inspired.{0,10}by|similar.{0,10}to|use.{0,15}(as|for).{0,15}(design|reference|style|template)|design reference/.test(t);

  const isAsset =
    /use.{0,20}(as|for).{0,20}(background|hero|asset|icon|logo|avatar|image|photo|picture|banner|cover|header image)|add.{0,15}(this|the).{0,15}(image|photo|picture)|background image|splash/.test(t);

  const elementMatch = t.match(
    /copy.{0,20}(card|button|btn|nav|navbar|header|tab|modal|chip|badge|list|row|input|search|icon)/,
  );
  const isElementCopy = !!elementMatch;

  if (isDesignRef) return 'design-reference';
  if (isElementCopy) return 'element-copy';
  if (isAsset) return 'asset';
  return 'ambiguous';
}

function detectElementName(userText: string): string | null {
  const match = userText.toLowerCase().match(
    /copy.{0,20}(card|button|btn|nav|navbar|header|tab|modal|chip|badge|list|row|input|search|icon)/,
  );
  return match ? match[1].trim() : null;
}

// ── Design reference detection ─────────────────────────────────────────────

describe('image intent – design-reference', () => {
  const designRefCases = [
    'make it look like this',
    'make the app look like this design',
    'design like this',
    'copy the style of this screenshot',
    'match this design',
    'match the design in the image',
    'inspired by this',
    'similar to this app',
    'use this as a design reference',
    'use this for reference',
    'use this as style',
    'use this for template',
    'this is a design reference',
    'design reference please',
  ];

  it.each(designRefCases)('"%s" → design-reference', (text) => {
    expect(detectImageIntent(text)).toBe('design-reference');
  });
});

// ── Asset detection ────────────────────────────────────────────────────────

describe('image intent – asset', () => {
  const assetCases = [
    'use this as a background',
    'use this for the hero',
    'use this as an icon',
    'use it as a logo',
    'use this as an avatar',
    'use this as the banner',
    'use this for the cover',
    'add this image to the header',
    'add the photo here',
    'add this picture',
    'background image',
    'use as splash',
  ];

  it.each(assetCases)('"%s" → asset', (text) => {
    expect(detectImageIntent(text)).toBe('asset');
  });
});

// ── Element copy detection ─────────────────────────────────────────────────

describe('image intent – element-copy', () => {
  const elementCases: [string, string][] = [
    ['copy this card', 'card'],
    // Note: "copy the button style" triggers isDesignRef (copy.{0,15}style) → use plain form
    ['copy the button', 'button'],
    ['copy this btn', 'btn'],
    ['copy the nav bar', 'nav'],
    // Note: regex alternation (nav|navbar) matches 'nav' first, so 'navbar' captured as 'nav'
    ['copy this navbar layout', 'nav'],
    ['copy the header', 'header'],
    ['copy the tab', 'tab'],
    ['copy this modal', 'modal'],
    ['copy the chip', 'chip'],
    ['copy this badge', 'badge'],
    ['copy the list item', 'list'],
    ['copy this row layout', 'row'],
    ['copy the input field', 'input'],
    ['copy this search bar', 'search'],
    ['copy the icon', 'icon'],
  ];

  it.each(elementCases)('"%s" → element-copy (element: %s)', (text, expectedElement) => {
    expect(detectImageIntent(text)).toBe('element-copy');
    expect(detectElementName(text)).toBe(expectedElement);
  });
});

// ── Ambiguous detection ────────────────────────────────────────────────────

describe('image intent – ambiguous', () => {
  const ambiguousCases = [
    'here is a screenshot',
    'what do you think of this?',
    'look at this',
    'this is my reference',
    'check this out',
    '',
    'build me an app',
    'something cool like this maybe',
  ];

  it.each(ambiguousCases)('"%s" → ambiguous', (text) => {
    expect(detectImageIntent(text)).toBe('ambiguous');
  });
});

// ── Priority ordering ──────────────────────────────────────────────────────

describe('image intent – priority ordering', () => {
  it('design-reference takes priority over asset when both match', () => {
    // "use this as a design reference" matches both isDesignRef and isAsset pattern
    const text = 'use this as a design reference for the background';
    expect(detectImageIntent(text)).toBe('design-reference');
  });

  it('element-copy takes priority over asset when both might match', () => {
    // "copy this icon" triggers element-copy, while "use this as an icon" triggers asset
    const text = 'copy this icon';
    expect(detectImageIntent(text)).toBe('element-copy');
  });

  it('"copy the button style" → design-reference because copy.{0,15}style matches isDesignRef first', () => {
    // This documents actual priority: isDesignRef is checked before isElementCopy
    expect(detectImageIntent('copy the button style')).toBe('design-reference');
  });
});

// ── modeTag construction ───────────────────────────────────────────────────

describe('image intent – modeTag format', () => {
  function buildModeTag(userText: string): string {
    const intent = detectImageIntent(userText);
    if (intent === 'design-reference') return '[IMG:design-reference]';
    if (intent === 'element-copy') {
      const element = detectElementName(userText) ?? '';
      return `[IMG:element-copy:${element}]`;
    }
    if (intent === 'asset') return '[IMG:asset]';
    return '[IMG:ambiguous]';
  }

  it('design-reference → [IMG:design-reference]', () => {
    expect(buildModeTag('make it look like this')).toBe('[IMG:design-reference]');
  });

  it('asset → [IMG:asset]', () => {
    expect(buildModeTag('use this as a background')).toBe('[IMG:asset]');
  });

  it('element-copy card → [IMG:element-copy:card]', () => {
    expect(buildModeTag('copy this card')).toBe('[IMG:element-copy:card]');
  });

  it('element-copy button → [IMG:element-copy:button]', () => {
    expect(buildModeTag('copy the button')).toBe('[IMG:element-copy:button]');
  });

  it('ambiguous → [IMG:ambiguous]', () => {
    expect(buildModeTag('here is a screenshot')).toBe('[IMG:ambiguous]');
  });
});
