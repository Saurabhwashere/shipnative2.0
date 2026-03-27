'use client';

import { useEffect, useRef } from 'react';

// ── scale & virtual dimensions ─────────────────────────────────────────────────
const SC = 3;         // each virtual pixel = 3×3 real pixels
const VW = 114;       // virtual width  (114 × 3 = 342)
const VH = 234;       // virtual height (234 × 3 = 702)
const GROUND = 170;   // virtual y where ground starts
const CYCLE = 36_000; // ms for one full day/night cycle

// ── helpers ────────────────────────────────────────────────────────────────────
function px(ctx: CanvasRenderingContext2D, x: number, y: number, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(x * SC, y * SC, SC, SC);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(x * SC, y * SC, w * SC, h * SC);
}

// ── sky colour stops [fraction, r, g, b] ──────────────────────────────────────
const SKY: [number, number, number, number][] = [
  [0.00,  8,  5, 32],
  [0.18, 30, 12, 60],
  [0.28, 60, 25, 85],
  [0.33, 190, 85, 40],
  [0.43, 230, 150, 60],
  [0.50, 100, 160, 230],
  [0.68, 80, 145, 220],
  [0.76, 210, 105, 55],
  [0.85, 110, 35, 75],
  [0.93, 22,  9, 48],
  [1.00,  8,  5, 32],
];

function skyColor(phase: number): string {
  let i = 0;
  while (i < SKY.length - 1 && SKY[i + 1][0] <= phase) i++;
  const [t0, r0, g0, b0] = SKY[i];
  const [t1, r1, g1, b1] = SKY[Math.min(i + 1, SKY.length - 1)];
  const tt = t1 > t0 ? (phase - t0) / (t1 - t0) : 0;
  const lp = (a: number, b: number) => Math.round(a + (b - a) * Math.max(0, Math.min(1, tt)));
  return `rgb(${lp(r0, r1)},${lp(g0, g1)},${lp(b0, b1)})`;
}

// ── stars (deterministic pseudo-random positions) ─────────────────────────────
const STARS = Array.from({ length: 26 }, (_, i) => ({
  x: Math.floor(((i * 7919 + 31) % 112) + 1),
  y: Math.floor(((i * 3571 + 17) % 128) + 4),
  phase: (i * 0.618033) % 1,
  speed: 0.5 + (i % 5) * 0.25,
  big: i % 7 === 0,
}));

// ── character sprite (6 wide × 10 tall, 4 walk frames) ────────────────────────
const CP: Record<string, string> = {
  H: '#2a1505', // hair
  S: '#f0c890', // skin
  E: '#1a0a00', // eye
  B: '#2255aa', // shirt
  P: '#112255', // pants
  X: '#111111', // shoes
};

const WALK = [
  ['..HH..', '.SSSS.', '.SSES.', '..BB..', '.BBBB.', '.BBBB.', '.PPPP.', 'PP..PP', 'PP..PP', 'X....X'],
  ['..HH..', '.SSSS.', '.SSES.', '..BB..', '.BBBB.', '.BBBB.', '.PPPP.', '.PP.PP', '.PP.PP', '.X..XX'],
  ['..HH..', '.SSSS.', '.SSES.', '..BB..', '.BBBB.', '.BBBB.', '.PPPP.', 'PP..PP', 'PP..PP', 'X....X'],
  ['..HH..', '.SSSS.', '.SSES.', '..BB..', '.BBBB.', '.BBBB.', '.PPPP.', 'PP.PP.', 'PP.PP.', 'XX..X.'],
];

function drawChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number) {
  const rows = WALK[frame % 4];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch !== '.') px(ctx, cx + c, cy + r, CP[ch] ?? '#000');
    }
  }
}

// ── house drawing ──────────────────────────────────────────────────────────────
function drawHouse(
  ctx: CanvasRenderingContext2D,
  x: number, ground: number,
  bw: number, bh: number,
  wallCol: string, roofCol: string, roofShade: string,
  winCol: string, doorCol: string,
  chimneyX: number,
  twoWindows: boolean,
) {
  const bodyY = ground - bh;
  const chimneyH = 12;

  // Chimney (drawn behind roof)
  rect(ctx, x + chimneyX, bodyY - chimneyH, 3, chimneyH, '#5a4030');
  rect(ctx, x + chimneyX - 1, bodyY - chimneyH - 1, 5, 2, '#3a2010');

  // Roof (triangle built row-by-row)
  const roofH = Math.round(bw * 0.42);
  const hx = Math.floor(bw / 2);
  for (let ry = 0; ry < roofH; ry++) {
    const rw = 2 + Math.round((bw - 2) * ry / roofH);
    const rx = x + hx - Math.floor(rw / 2);
    rect(ctx, rx, bodyY - roofH + ry, rw, 1, ry === 0 ? roofShade : roofCol);
    // dark edge pixels
    px(ctx, rx, bodyY - roofH + ry, 'rgba(0,0,0,0.25)');
    px(ctx, rx + rw - 1, bodyY - roofH + ry, 'rgba(0,0,0,0.25)');
  }

  // Body
  rect(ctx, x, bodyY, bw, bh, wallCol);
  // Right shadow
  rect(ctx, x + bw - 1, bodyY + 1, 1, bh - 1, 'rgba(0,0,0,0.15)');
  // Bottom shadow
  rect(ctx, x + 1, bodyY + bh - 1, bw - 1, 1, 'rgba(0,0,0,0.12)');

  // Windows
  if (twoWindows) {
    rect(ctx, x + 2, bodyY + 4, 5, 4, winCol);
    rect(ctx, x + bw - 7, bodyY + 4, 5, 4, winCol);
    rect(ctx, x + 4, bodyY + 4, 1, 4, 'rgba(0,0,0,0.3)');
    rect(ctx, x + 2, bodyY + 6, 5, 1, 'rgba(0,0,0,0.3)');
    rect(ctx, x + bw - 5, bodyY + 4, 1, 4, 'rgba(0,0,0,0.3)');
    rect(ctx, x + bw - 7, bodyY + 6, 5, 1, 'rgba(0,0,0,0.3)');
  } else {
    const wx = x + Math.floor(bw / 2) - 3;
    rect(ctx, wx, bodyY + 4, 6, 5, winCol);
    rect(ctx, wx + 2, bodyY + 4, 1, 5, 'rgba(0,0,0,0.3)');
    rect(ctx, wx, bodyY + 6, 6, 1, 'rgba(0,0,0,0.3)');
  }

  // Door
  const dw = 4, dh = Math.min(8, bh - 2);
  const dx = x + Math.floor(bw / 2) - Math.floor(dw / 2);
  rect(ctx, dx, ground - dh, dw, dh, doorCol);
  px(ctx, dx + dw - 2, ground - Math.floor(dh / 2), '#c8a020');
}

// ── tree drawing ───────────────────────────────────────────────────────────────
function drawTree(ctx: CanvasRenderingContext2D, cx: number, ground: number, h: number) {
  const trunkH = Math.max(3, Math.floor(h * 0.32));
  const fw = Math.round(h * 0.72);
  const fh = h - trunkH;
  const fx = cx - Math.floor(fw / 2) + 1;

  // Trunk
  rect(ctx, cx, ground - trunkH, 2, trunkH, '#6B4423');
  px(ctx, cx - 1, ground - 1, '#5a3818');
  px(ctx, cx + 2, ground - 1, '#5a3818');

  // Foliage layers
  rect(ctx, fx, ground - trunkH - Math.floor(fh * 0.55), fw, Math.floor(fh * 0.65), '#1A4A0A');
  const mw = Math.floor(fw * 0.78);
  rect(ctx, cx - Math.floor(mw / 2) + 1, ground - trunkH - Math.floor(fh * 0.78), mw, Math.floor(fh * 0.48), '#2A6A14');
  const tw = Math.floor(fw * 0.54);
  rect(ctx, cx - Math.floor(tw / 2) + 1, ground - trunkH - fh + 1, tw, Math.floor(fh * 0.38), '#3a8a20');

  // Light fleck
  px(ctx, cx, ground - trunkH - fh + 2, '#5CB030');
}

// ── main component ─────────────────────────────────────────────────────────────
export default function PixelVillage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const t0Ref     = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    ctx.imageSmoothingEnabled = false;
    t0Ref.current = performance.now();

    // House configs: [x, bw, bh, wallCol, roofCol, roofShade, doorCol, chimneyX, twoWindows]
    const HOUSES: [number, number, number, string, string, string, string, number, boolean][] = [
      [10,  22, 18, '#C8A46E', '#8B2020', '#6a1010', '#5a3818', 16, true],
      [50,  18, 20, '#D4B896', '#405080', '#2a3560', '#4a3028', 2,  false],
      [88,  20, 15, '#E8E0D0', '#2A5A30', '#1a3a20', '#3a2818', 14, true],
    ];

    const SMOKE_ORIGINS = HOUSES.map(([hx, , bh, , , , , chX]) => ({
      cx: hx + chX + 1,
      baseY: GROUND - bh - 13,
    }));

    function draw(now: number) {
      const elapsed = now - t0Ref.current;
      const phase   = (elapsed % CYCLE) / CYCLE;

      const nightAlpha = phase < 0.28
        ? Math.max(0, 1 - phase / 0.24)
        : phase > 0.80
          ? Math.max(0, (phase - 0.80) / 0.18)
          : 0;

      // ── sky ────────────────────────────────────────────────────────────
      rect(ctx, 0, 0, VW, GROUND, skyColor(phase));

      // ── stars ──────────────────────────────────────────────────────────
      if (nightAlpha > 0.04) {
        STARS.forEach((s) => {
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin((elapsed / 900) * s.speed + s.phase * Math.PI * 2));
          ctx.fillStyle = `rgba(255,255,240,${(nightAlpha * twinkle).toFixed(2)})`;
          const sz = s.big ? 2 : 1;
          ctx.fillRect(s.x * SC, s.y * SC, sz * SC, sz * SC);
        });
      }

      // ── sun ────────────────────────────────────────────────────────────
      if (phase > 0.29 && phase < 0.80) {
        const sp  = (phase - 0.30) / 0.49;
        const sx  = sp * (VW + 10) - 5;
        const sy  = GROUND - 90 * Math.sin(sp * Math.PI);
        const vis = Math.min(1, Math.min((phase - 0.30) / 0.06, (0.79 - phase) / 0.05));

        ctx.globalAlpha = vis;
        const noon = sp < 0.5 ? sp * 2 : (1 - sp) * 2;
        const sc_r = Math.round(255);
        const sc_g = Math.round(180 + 75 * noon);
        const sc_b = Math.round(40 + 60 * noon);
        ctx.fillStyle = `rgb(${sc_r},${sc_g},${sc_b})`;
        ctx.beginPath();
        ctx.arc(sx * SC, sy * SC, 5 * SC, 0, Math.PI * 2);
        ctx.fill();

        const grd = ctx.createRadialGradient(sx * SC, sy * SC, 3 * SC, sx * SC, sy * SC, 14 * SC);
        grd.addColorStop(0, 'rgba(255,220,80,0.35)');
        grd.addColorStop(1, 'rgba(255,220,80,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx * SC, sy * SC, 14 * SC, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── moon ───────────────────────────────────────────────────────────
      if (nightAlpha > 0.08) {
        const mp  = ((phase + 0.50) % 1 - 0.30) / 0.49;
        if (mp >= 0 && mp <= 1) {
          const mx  = mp * (VW + 10) - 5;
          const my  = GROUND - 75 * Math.sin(mp * Math.PI);
          ctx.globalAlpha = nightAlpha * 0.9;
          ctx.fillStyle = '#e8e0c8';
          ctx.beginPath();
          ctx.arc(mx * SC, my * SC, 4 * SC, 0, Math.PI * 2);
          ctx.fill();
          // Crescent cutout
          ctx.fillStyle = skyColor(phase);
          ctx.beginPath();
          ctx.arc((mx + 2) * SC, (my - 1) * SC, 3.5 * SC, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ── horizon ────────────────────────────────────────────────────────
      rect(ctx, 0, GROUND - 6, VW, 3, skyColor(Math.max(0, phase - 0.03)));

      // ── ground ─────────────────────────────────────────────────────────
      rect(ctx, 0, GROUND - 3, VW, VH - GROUND + 3, '#1E4A0E');
      rect(ctx, 0, GROUND - 3, VW, 3, '#3CB83C');
      rect(ctx, 0, GROUND - 1, VW, 1, '#50D050');

      // Grass tufts
      for (let gx = 2; gx < VW; gx += 8) {
        px(ctx, gx,     GROUND - 4, '#50D050');
        px(ctx, gx + 4, GROUND - 5, '#3CB83C');
      }

      // Dirt path
      rect(ctx, 35, GROUND - 2, 50, 3, '#7a5a30');
      rect(ctx, 35, GROUND - 1, 50, 1, '#9a7a50');

      // ── trees (drawn behind houses) ────────────────────────────────────
      drawTree(ctx, 3,   GROUND - 1, 23);
      drawTree(ctx, 45,  GROUND - 1, 25);
      drawTree(ctx, 80,  GROUND - 1, 21);
      drawTree(ctx, 110, GROUND - 1, 24);

      // ── houses ─────────────────────────────────────────────────────────
      const winCol = nightAlpha > 0.3
        ? `rgba(255, 210, 100, ${(0.65 + 0.35 * Math.sin(elapsed / 2200 + 0.5)).toFixed(2)})`
        : '#b8d8e8';

      HOUSES.forEach(([hx, bw, bh, wall, roof, rShade, door, chX, twoW]) => {
        drawHouse(ctx, hx, GROUND - 1, bw, bh, wall, roof, rShade, winCol, door, chX, twoW);
      });

      // ── chimney smoke ──────────────────────────────────────────────────
      SMOKE_ORIGINS.forEach(({ cx, baseY }) => {
        for (let s = 0; s < 5; s++) {
          const t     = ((elapsed / 1400 + s * 0.2) % 1);
          const sy    = baseY - Math.round(t * 10);
          const drift = Math.round(Math.sin(elapsed / 1000 + s) * 1.2);
          const alpha = (1 - t) * 0.38;
          ctx.fillStyle = `rgba(190,185,180,${alpha.toFixed(2)})`;
          ctx.fillRect((cx + drift) * SC, sy * SC, SC, SC);
        }
      });

      // ── character ──────────────────────────────────────────────────────
      const speed  = 16; // virtual px / second
      const charX  = Math.floor((elapsed / 1000 * speed) % (VW + 10)) - 5;
      const wFrame = Math.floor(elapsed / 160) % 4;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect((charX + 1) * SC, (GROUND - 2) * SC, 5 * SC, SC);
      drawChar(ctx, charX, GROUND - 11, wFrame);

      // ── bottom bar + text ──────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, (VH - 26) * SC, VW * SC, 26 * SC);

      const dots = ['', '.', '..', '...'][Math.floor(elapsed / 480) % 4];
      ctx.font        = `bold ${5 * SC}px "Courier New", monospace`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle   = 'rgba(255,255,255,0.85)';
      ctx.fillText(`Building your app${dots}`, (VW / 2) * SC, (VH - 13) * SC);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={VW * SC}
      height={VH * SC}
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}
    />
  );
}
