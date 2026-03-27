export const PIXEL_ART_SKILL = `
═══════════════════════════════════════════
PIXEL ART SKILL — CANVAS-BASED SPRITES
═══════════════════════════════════════════

Generate all pixel art as self-contained React Native canvas components.
Zero external libraries. Zero image files. Works in the preview today.

─── CORE PRIMITIVES ──────────────────────

SC = scale multiplier. 3 = each virtual pixel → 3×3 real pixels.

\`\`\`js
const SC = 3;

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SC, y * SC, SC, SC);
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SC, y * SC, w * SC, h * SC);
}
\`\`\`

─── SPRITE DEFINITION SYSTEM ────────────

Define sprites as string arrays. Each character = one pixel color key.
'.' = transparent (skip drawing that pixel).

\`\`\`js
const PAL = {
  H: '#2a1505', // hair / dark
  S: '#f0c890', // skin
  E: '#1a0a00', // eyes
  B: '#2255aa', // shirt / body
  P: '#112255', // pants / legs
  X: '#111111', // shoes
  R: '#cc3333', // red accent
  G: '#33aa55', // green accent
  W: '#ffffff', // white highlight
};

const SPRITE = [
  '..HH..',
  '.SSSS.',
  '.SSES.',
  '..BB..',
  '.BBBB.',
  '.PPPP.',
  'PP..PP',
  'X....X',
];

function drawSprite(ctx, frame, cx, cy, palette) {
  for (let r = 0; r < frame.length; r++) {
    for (let c = 0; c < frame[r].length; c++) {
      const ch = frame[r][c];
      if (ch !== '.' && palette[ch]) px(ctx, cx + c, cy + r, palette[ch]);
    }
  }
}
\`\`\`

─── ANIMATION LOOP ───────────────────────

\`\`\`js
export default function PixelSprite() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // CRITICAL — crisp pixels

    let raf;
    let lastTime = 0;
    let elapsed = 0;
    let frameIndex = 0;
    const FRAME_MS = 150;

    function draw(now) {
      const delta = now - lastTime;
      lastTime = now;
      elapsed += delta;
      if (elapsed >= FRAME_MS) {
        frameIndex = (frameIndex + 1) % FRAMES.length;
        elapsed = 0;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSprite(ctx, FRAMES[frameIndex], 10, 10, PAL);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={VW * SC}
      height={VH * SC}
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
    />
  );
}
\`\`\`

CRITICAL: imageRendering: 'pixelated' on the canvas style element.
CRITICAL: ctx.imageSmoothingEnabled = false before any drawing.
Without both, the art looks blurry.

─── REACT NATIVE WRAPPER ────────────────

\`\`\`js
import { View } from 'react-native';

export default function PixelArtComponent({ width = 200, height = 200 }) {
  const canvasRef = useRef(null);
  // ... animation useEffect ...
  return (
    <View style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}
      />
    </View>
  );
}
\`\`\`

─── COMMON SPRITE PATTERNS ──────────────

Character walk cycle (4 frames):
  Frame 0 & 2: neutral (legs together)
  Frame 1:     left step (left leg forward)
  Frame 3:     right step (right leg forward)

Idle breathing (2 frames):
  Frame 0: normal
  Frame 1: body 1px lower, head same position

Coin spin (4 frames):
  Frame 0: full width   '####'
  Frame 1: compressed   '.##.'
  Frame 2: edge-on      '..#.'
  Frame 3: compressed   '.##.'

Explosion (5 frames, expanding then clearing):
  Frame 0 → single pixel → small cross → starburst → sparse ring → empty

─── TILE MAP SYSTEM ─────────────────────

\`\`\`js
const TILE_SIZE = 16;
const MAP = [
  'GGGGGGGG',
  'GGGWWGGG',
  'GGWWWWGG',
];
const TILES = { G: drawGrass, W: drawWater };

function drawMap(ctx) {
  for (let row = 0; row < MAP.length; row++)
    for (let col = 0; col < MAP[row].length; col++) {
      const fn = TILES[MAP[row][col]];
      if (fn) fn(ctx, col * TILE_SIZE, row * TILE_SIZE);
    }
}
\`\`\`

─── PALETTE PRESETS ─────────────────────

Game Boy (4):   '#0f380f' '#306230' '#8bac0f' '#9bbc0f'
NES subset (8): '#000000' '#fcfcfc' '#f83800' '#0058f8' '#00a800' '#b8b8b8' '#787878' '#fcbc3c'
PICO-8 (16):    '#000000' '#1d2b53' '#7e2553' '#008751' '#ab5236' '#5f574f' '#c2c3c7' '#fff1e8'
                '#ff004d' '#ffa300' '#ffec27' '#00e436' '#29adff' '#83769c' '#ff77a8' '#ffccaa'
CGA magenta (4):'#000000' '#ff55ff' '#55ffff' '#ffffff'

─── ANTI-PATTERNS ───────────────────────

  ✗ Using <Image> with a placeholder URL for pixel art — generate it in canvas
  ✗ Forgetting imageRendering: 'pixelated' — art will look blurry
  ✗ Forgetting ctx.imageSmoothingEnabled = false — same blurry result
  ✗ SC values > 6 on full-screen canvases — excessive memory usage
  ✗ Inline color strings instead of a named palette object
  ✗ Not storing the raf handle in a variable before cleanup
`;
