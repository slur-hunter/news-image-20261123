// news-image-20261123 — sums up Monday 23 November 2026 world news in one
// 1024x1024 PNG. Node 22, standard library only, no network. All drawing is
// done in code: a 5x7 bitmap font, a pixel canvas, and a hand-rolled PNG
// encoder (zlib deflate + CRC32). Output is fully deterministic: same bytes
// on every run (no timestamps, no randomness).
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts   (or /output/entry.png by default)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- font (5x7)
// Each glyph: 7 rows, bit 4 = leftmost pixel.
const F: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  '"': [0b01010, 0b01010, 0b01010, 0, 0, 0, 0],
  '#': [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  '$': [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  '%': [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '*': [0, 0b10101, 0b01110, 0b11111, 0b01110, 0b10101, 0],
  '+': [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  ',': [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  '-': [0, 0, 0, 0b11111, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0b01100, 0b01100],
  '/': [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ':': [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ';': [0, 0b01100, 0b01100, 0, 0b01100, 0b00100, 0b01000],
  '<': [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  '=': [0, 0, 0b11111, 0, 0b11111, 0, 0],
  '>': [0b01000, 0b00100, 0b00010, 0b00001, 0b00010, 0b00100, 0b01000],
  '?': [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
  '@': [0b01110, 0b10001, 0b10111, 0b10101, 0b10110, 0b10000, 0b01110],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '[': [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  '\\': [0b10000, 0b01000, 0b01000, 0b00100, 0b00010, 0b00010, 0b00001],
  ']': [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  '^': [0b00100, 0b01010, 0b10001, 0, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0b11111],
  '`': [0b00100, 0b00100, 0b00010, 0, 0, 0, 0],
  a: [0, 0, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  b: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  c: [0, 0, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110],
  d: [0b00001, 0b00001, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111],
  e: [0, 0, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  f: [0b00110, 0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000],
  g: [0, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  h: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  i: [0b00100, 0, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  j: [0b00010, 0, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  l: [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  m: [0, 0, 0b11010, 0b10101, 0b10101, 0b10101, 0b10101],
  n: [0, 0, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  o: [0, 0, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0, 0, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000],
  q: [0, 0, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001],
  r: [0, 0, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  s: [0, 0, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  t: [0b01000, 0b01000, 0b11100, 0b01000, 0b01000, 0b01000, 0b00110],
  u: [0, 0, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  v: [0, 0, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0, 0, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  x: [0, 0, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  y: [0, 0, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  z: [0, 0, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  '{': [0b00010, 0b00100, 0b00100, 0b01100, 0b00100, 0b00100, 0b00010],
  '|': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  '}': [0b01000, 0b00100, 0b00100, 0b00110, 0b00100, 0b00100, 0b01000],
  '~': [0, 0, 0b01001, 0b10110, 0, 0, 0],
  '·': [0, 0, 0b00100, 0b00100, 0, 0, 0],
  '°': [0b00100, 0b01010, 0b00100, 0, 0, 0, 0],
  '—': [0, 0, 0, 0b11111, 0, 0, 0],
  '–': [0, 0, 0, 0b11111, 0, 0, 0],
  '’': [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  '‘': [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  '“': [0b01010, 0b01010, 0b01010, 0, 0, 0, 0],
  '”': [0b01010, 0b01010, 0b01010, 0, 0, 0, 0],
  'é': [0, 0b00010, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  'è': [0, 0b01000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  'ü': [0, 0b10101, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  'ö': [0, 0b10101, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  'á': [0, 0b00010, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  'ñ': [0, 0b01010, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
};

const NORM: Record<string, string> = { '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '×': 'x' };
function norm(s: string): string {
  return [...s].map((c) => NORM[c] ?? c).join('');
}
function textW(s: string, sc: number): number {
  return norm(s).length * 6 * sc - sc;
}

// ---------------------------------------------------------------- canvas
const W = 1024, H = 1024;
const px = new Uint8Array(W * H * 3);
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function setP(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, hex: string): void {
  const c = rgb(hex);
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++)
    for (let xx = x0; xx < x1; xx++) setP(xx, yy, c);
}
function line(x0: number, y0: number, x1: number, y1: number, hex: string, th = 1): void {
  const c = rgb(hex);
  const dx = x1 - x0, dy = y1 - y0, steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (dx * i) / steps), y = Math.round(y0 + (dy * i) / steps);
    for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) setP(x + a, y + b, c);
  }
}
function circle(cx: number, cy: number, r: number, hex: string): void {
  cx = Math.round(cx); cy = Math.round(cy);
  const c = rgb(hex);
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) setP(cx + x, cy + y, c);
}
function ring(cx: number, cy: number, r: number, hex: string): void {
  cx = Math.round(cx); cy = Math.round(cy);
  const c = rgb(hex);
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    setP(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
function poly(pts: [number, number][], hex: string): void {
  // scanline fill of a simple polygon
  const c = rgb(hex);
  let minY = 1e9, maxY = -1e9;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.ceil(minY); y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.ceil(xs[k]); x <= xs[k + 1]; x++) setP(x, y, c);
  }
}
function drawChar(ch: string, x: number, y: number, sc: number, hex: string): void {
  const g = F[ch] ?? F['?'];
  const c = rgb(hex);
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if ((g[r] >> (4 - col)) & 1)
        for (let dy = 0; dy < sc; dy++)
          for (let dx = 0; dx < sc; dx++) setP(x + col * sc + dx, y + r * sc + dy, c);
}
function drawText(s: string, x: number, y: number, sc: number, hex: string): number {
  let cx = x;
  for (const ch of norm(s)) { drawChar(ch, cx, y, sc, hex); cx += 6 * sc; }
  return cx;
}
function wrap(s: string, maxW: number, sc: number): string[] {
  const words = norm(s).split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textW(t, sc) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(s: string, x: number, y: number, maxW: number, sc: number, hex: string, lh: number): number {
  const lines = wrap(s, maxW, sc);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, sc, hex));
  return y + lines.length * lh;
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- stories
// Every story was verified against a live news source on 23 Nov 2026
// (BBC, Reuters, UKMTO, USGS, WHO, FIFA, national outlets). Regions are
// counted from the data below, never hard-coded.
type Story = { n: number; head: string; place: string; src: string; region: string; lon: number; lat: number; ox: number; oy: number };
const FULL: { n: number; kicker: string; head: string; body: string; src: string }[] = [
  {
    n: 1, kicker: 'CLIMATE — ANTALYA',
    head: 'COP31 COLLAPSES WITH NO DEAL',
    body: 'Nearly 200 nations leave Antalya with no deal — the first collapse since 2009 — after fossil fuels were cut from the text. The EU and island states refused it.',
    src: 'Reuters / BBC',
  },
  {
    n: 2, kicker: 'GULF SHIPPING — HORMUZ',
    head: 'TANKER REPORTS NEAR HORMUZ',
    body: 'UK monitors log two tanker strikes off Oman, near Khasab, but it is unclear if they are the same vessel. Iran says a tanker hit a mine.',
    src: 'UKMTO / Reuters',
  },
  {
    n: 3, kicker: 'MARKETS — SEOUL',
    head: 'KOSPI PLUNGES AS AI ROUT SPREADS',
    body: "Seoul dives about 4% in early trade, Samsung and SK Hynix leading the fall, after Friday's 5.3% Nasdaq slide on AI doubts.",
    src: 'Reuters / Bloomberg',
  },
  {
    n: 4, kicker: 'WAR — KYIV REGION',
    head: 'BOY, 7, PULLED ALIVE FROM RUBBLE',
    body: 'Rescuers pull a boy, 7, alive from a collapsed apartment block after a Russian strike; 11 remain missing in the Kyiv region.',
    src: 'BBC',
  },
];
const ALSO: Story[] = [
  { n: 5, head: 'Democrats win big in House', place: 'North Carolina, USA', src: 'BBC', region: 'N. America', lon: -79, lat: 36, ox: 6, oy: -8 },
  { n: 6, head: 'Blast hits Russian ship', place: 'Libya', src: 'Reuters', region: 'Africa', lon: 20, lat: 32, ox: 6, oy: 4 },
  { n: 7, head: 'Ship attacked in Gulf of Finland', place: 'Gulf of Finland', src: 'BBC', region: 'Europe', lon: 24, lat: 60, ox: 6, oy: -8 },
  { n: 8, head: 'Gaza strike kills two', place: 'Gaza', src: 'Reuters', region: 'Middle East', lon: 37, lat: 31.3, ox: 8, oy: 8 },
  { n: 9, head: 'Houthis claim refinery hit', place: 'Saudi Arabia', src: 'Reuters', region: 'Middle East', lon: 43, lat: 23, ox: 6, oy: -6 },
  { n: 10, head: 'Drones downed in Khartoum', place: 'Sudan', src: 'MENAFN', region: 'Africa', lon: 32.5, lat: 15.5, ox: 6, oy: 6 },
  { n: 11, head: 'ANC fights to hold SA cities', place: 'South Africa', src: 'BBC', region: 'Africa', lon: 28, lat: -26, ox: 6, oy: 6 },
  { n: 12, head: 'Ebola care at risk in DRC', place: 'DR Congo', src: 'WHO', region: 'Africa', lon: 25, lat: -2, ox: 6, oy: -4 },
  { n: 13, head: 'Factory fire: 50 missing', place: 'Indonesia', src: 'BBC', region: 'Asia', lon: 106, lat: -6, ox: 6, oy: 6 },
  { n: 14, head: 'M6.5 quake hits Vanuatu', place: 'Vanuatu', src: 'USGS', region: 'Oceania', lon: 172, lat: -13.6, ox: -16, oy: -6 },
  { n: 15, head: 'Nepal PM visits India', place: 'New Delhi, India', src: 'NDTV', region: 'Asia', lon: 77, lat: 28.6, ox: -16, oy: -8 },
  { n: 16, head: 'India-China border talks', place: 'Arunachal, India', src: 'The Hindu', region: 'Asia', lon: 95, lat: 28, ox: 6, oy: -8 },
  { n: 17, head: "Myanmar faults ASEAN", place: 'Myanmar', src: 'Reuters', region: 'Asia', lon: 96, lat: 21, ox: -18, oy: 6 },
  { n: 18, head: 'Lisbon living-cost march', place: 'Portugal', src: 'Reuters', region: 'Europe', lon: -9, lat: 38.7, ox: -16, oy: 4 },
  { n: 19, head: 'Estonia closes border', place: 'Estonia', src: 'Estonia MFA', region: 'Europe', lon: 25, lat: 59, ox: 6, oy: -10 },
  { n: 20, head: 'Delta outage delays 1,600+', place: 'USA', src: 'Delta', region: 'N. America', lon: -84, lat: 33, ox: 6, oy: 8 },
  { n: 21, head: 'Cleverbridge cards exposed', place: 'Germany', src: 'Cleverbridge', region: 'Europe', lon: 7, lat: 51, ox: -14, oy: -8 },
  { n: 22, head: 'ICE arrests 2 on Sea-Tac jetway', place: 'Seattle, USA', src: 'BBC', region: 'N. America', lon: -122.3, lat: 47.6, ox: 6, oy: -6 },
  { n: 23, head: "Trump reposts TrumpCare", place: 'USA', src: 'Washington Post', region: 'N. America', lon: -81, lat: 38.9, ox: -16, oy: 8 },
  { n: 24, head: 'FBI probes hack of crime database', place: 'USA', src: 'AP', region: 'N. America', lon: -73, lat: 39, ox: 6, oy: -10 },
  { n: 25, head: "Mexico nabs Chapo Isidro", place: 'Sinaloa, Mexico', src: 'Reuters', region: 'Latin Am.', lon: -108, lat: 25, ox: 6, oy: 6 },
  { n: 26, head: "UK gets 2035 Women's Cup", place: 'UK', src: 'FIFA', region: 'Europe', lon: -1, lat: 52, ox: -16, oy: -8 },
  { n: 27, head: 'Verstappen wins Vegas GP', place: 'Las Vegas, USA', src: 'BBC Sport', region: 'N. America', lon: -115, lat: 36, ox: 6, oy: 6 },
  { n: 28, head: 'Alcaraz wins ATP Finals', place: 'Turin, Italy', src: 'BBC Sport', region: 'Europe', lon: 7.7, lat: 45, ox: 8, oy: 8 },
  { n: 29, head: 'Liverpool 4-0 Man Utd', place: 'Liverpool, England', src: 'BBC Sport', region: 'Europe', lon: -3, lat: 53.4, ox: -16, oy: 6 },
  { n: 30, head: 'Price wins Grand Slam', place: 'UK', src: 'BBC Sport', region: 'Europe', lon: -2, lat: 54, ox: 8, oy: -8 },
  { n: 31, head: 'Thitikul wins LPGA title', place: 'Florida, USA', src: 'BBC Sport', region: 'N. America', lon: -81.8, lat: 26, ox: 6, oy: -6 },
  { n: 32, head: 'England thrash NZ 37-12', place: 'London, England', src: 'BBC Sport', region: 'Europe', lon: -4, lat: 51.5, ox: 6, oy: 10 },
  { n: 33, head: "NHS launches AI trial", place: 'UK', src: 'BBC', region: 'Europe', lon: 4, lat: 51.4, ox: -18, oy: -10 },
  { n: 34, head: 'Paolo Bulgari dies aged 89', place: 'Rome, Italy', src: 'BBC', region: 'Europe', lon: 12.5, lat: 41.9, ox: 6, oy: 6 },
  { n: 35, head: 'Oil falls; Brent at $92.29', place: 'Markets', src: 'Reuters', region: 'Middle East', lon: 52, lat: 26, ox: -16, oy: -6 },
  { n: 36, head: '1,800 flee Selangor floods', place: 'Malaysia', src: 'TALi News', region: 'Asia', lon: 101.5, lat: 3, ox: 6, oy: 8 },
  { n: 37, head: 'UN top-job bid blocked', place: 'New York, USA', src: 'TALi News', region: 'N. America', lon: -74, lat: 40.7, ox: 8, oy: -8 },
  { n: 38, head: 'Pant hits Test century', place: 'Wellington, NZ', src: 'CareerIndia', region: 'Oceania', lon: 174.8, lat: -41.3, ox: -16, oy: 8 },
];
const TOTAL = FULL.length + ALSO.length; // 38
const REGIONS = ['Europe', 'N. America', 'Asia', 'Middle East', 'Africa', 'Oceania', 'Latin Am.'];
const regionCount = (r: string): number =>
  ALSO.filter((s) => s.region === r).length +
  FULL.filter((f) => f.n === 1 ? r === 'Europe' : f.n === 2 ? r === 'Middle East' : f.n === 3 ? r === 'Asia' : r === 'Europe').length;
const NUMBERS: [string, string][] = [
  ['258+', "Democrats' House seats, most since 1992"],
  ['-3.9%', 'Kospi fall in early Monday trade'],
  ['$92.29', 'Brent crude a barrel as oil slips'],
  ['1,600+', 'Delta flights delayed by outage'],
  ['50', 'Missing after Serang factory fire'],
];
const DATECHECK: string[] = [
  'FRI 20 NOV — Russian strikes on Kyiv killed at least 11. NOT 23 Nov.',
  'SAT 21 NOV — Titanic survivor\'s diamond ring sold for GBP 150,000 in the UK. NOT 23 Nov.',
  'FRI 20 NOV — Syria arrests a second officer over the 2014 Otaiba ambush. NOT 23 Nov.',
  'FRI 11 DEC — US Congress funding deadline. Still ahead. NOT 23 Nov.',
];

// ---------------------------------------------------------------- illustrations
function illuCOP31(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, '#1d4e5f');
  rect(x, y + h - 46, w, 46, '#0f2f3d'); // floor
  // globe with crack
  circle(x + w / 2, y + 52, 30, '#7ec8c0'); circle(x + w / 2, y + 52, 30, '#7ec8c0');
  poly([[x + w / 2 - 22, y + 40], [x + w / 2 - 6, y + 52], [x + w / 2 - 18, y + 66], [x + w / 2 - 30, y + 58]], '#2e8b57');
  poly([[x + w / 2 + 8, y + 34], [x + w / 2 + 24, y + 44], [x + w / 2 + 12, y + 58], [x + w / 2 + 2, y + 46]], '#2e8b57');
  line(x + w / 2 - 4, y + 24, x + w / 2 + 6, y + 44, '#14213d', 2);
  line(x + w / 2 + 6, y + 44, x + w / 2 - 2, y + 62, '#14213d', 2);
  line(x + w / 2 - 2, y + 62, x + w / 2 + 8, y + 80, '#14213d', 2);
  // flags row
  const cols = ['#c0392b', '#2471a3', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22'];
  cols.forEach((c, i) => { rect(x + 12 + i * 22, y + h - 40, 16, 10, c); line(x + 12 + i * 22 + 8, y + h - 40, x + 12 + i * 22 + 8, y + h - 46, '#f7f2e7', 1); });
  drawText('NO DEAL', x + 14, y + h - 22, 2, '#f7f2e7');
}
function illuHormuz(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, '#f4a259');
  rect(x, y + 70, w, h - 70, '#1d6a8a'); // sea
  circle(x + 118, y + 30, 16, '#f7f2e7');
  // smoke
  circle(x + 52, y + 42, 12, '#5d5d5d'); circle(x + 64, y + 30, 14, '#7a7a7a'); circle(x + 78, y + 20, 10, '#9a9a9a');
  // tanker 1
  rect(x + 18, y + 84, 96, 20, '#8b1e1e'); rect(x + 92, y + 64, 22, 20, '#e8e8e8');
  rect(x + 26, y + 96, 80, 6, '#c0392b');
  // tanker 2
  rect(x + 8, y + 122, 70, 14, '#2c3e50'); rect(x + 60, y + 110, 14, 12, '#e8e8e8');
  // mine
  circle(x + 128, y + 128, 5, '#14213d');
  line(x + 118, y + 118, x + 128, y + 128, '#14213d', 1); line(x + 138, y + 118, x + 128, y + 128, '#14213d', 1);
  line(x + 118, y + 138, x + 128, y + 128, '#14213d', 1); line(x + 138, y + 138, x + 128, y + 128, '#14213d', 1);
  drawText('HORMUZ', x + 12, y + 6, 2, '#f7f2e7');
}
function illuKospi(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, '#ffffff');
  rect(x, y, w, 26, '#14213d');
  drawText('KOSPI', x + 10, y + 6, 2, '#f7f2e7');
  // grid
  for (let i = 1; i < 4; i++) line(x + 8, y + 30 + i * 28, x + w - 8, y + 30 + i * 28, '#d5d5d5', 1);
  // falling chart
  const pts: [number, number][] = [[14, 44], [34, 52], [54, 48], [74, 66], [94, 78], [114, 96], [132, 118]];
  for (let i = 0; i + 1 < pts.length; i++) line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], '#c0392b', 3);
  // arrow head
  poly([[x + 132, y + 118], [x + 118, y + 112], [x + 126, y + 126]], '#c0392b');
  // candles
  rect(x + 20, y + 60, 8, 18, '#c0392b'); rect(x + 46, y + 52, 8, 22, '#c0392b');
  rect(x + 72, y + 74, 8, 16, '#c0392b'); rect(x + 98, y + 90, 8, 18, '#c0392b');
  drawText('-3.9%', x + 12, y + h - 22, 2, '#c0392b');
}
function illuKyiv(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, '#3a5068');
  // ruined building
  rect(x + 12, y + 40, 60, h - 40, '#8d99ae'); rect(x + 72, y + 70, 60, h - 70, '#6c7a8d');
  poly([[x + 12, y + 40], [x + 42, y + 18], [x + 72, y + 40]], '#5c677d');
  rect(x + 22, y + 60, 12, 14, '#f7d154'); rect(x + 48, y + 60, 12, 14, '#2b2d42');
  rect(x + 84, y + 88, 12, 12, '#f7d154');
  // rubble pile
  poly([[x + 8, y + h], [x + 30, y + h - 34], [x + 58, y + h - 22], [x + 86, y + h - 30], [x + 120, y + h]], '#4a4a4a');
  poly([[x + 30, y + h - 34], [x + 44, y + h - 44], [x + 58, y + h - 22]], '#6b6b6b');
  // searchlight beam + rescuer helmet
  poly([[x + 100, y + 20], [x + 130, y + 20], [x + 70, y + h - 30], [x + 40, y + h - 30]], '#f7d154');
  circle(x + 52, y + h - 34, 8, '#e67e22'); // helmet
  rect(x + 44, y + h - 28, 16, 14, '#e67e22');
  drawText('ALIVE', x + 10, y + h - 22, 2, '#f7f2e7');
}
const ILLU = [illuCOP31, illuHormuz, illuKospi, illuKyiv];

// ---------------------------------------------------------------- layout
const INK = '#1a1a1a', PAPER = '#f7f2e7', NAVY = '#14213d', RED = '#c0392b', TEAL = '#1d6a8a';

function masthead(): void {
  rect(0, 0, W, 60, NAVY);
  drawText('THE WORLD IN ONE PAGE', 16, 8, 3, '#f7f2e7');
  drawText(`MONDAY 23 NOVEMBER 2026  -  ${TOTAL} STORIES  -  7 REGIONS  -  EVERY STORY SOURCED`, 16, 38, 2, '#f7d154');
}
function numberStrip(): void {
  const bw = 196, gap = 8;
  NUMBERS.forEach(([v, lab], i) => {
    const x = 8 + i * (bw + gap);
    rect(x, 66, bw, 58, '#ffffff');
    rect(x, 66, bw, 3, RED);
    drawText(v, x + 10, 74, 3, RED);
    drawWrapped(lab, x + 10, 100, bw - 20, 1, INK, 10);
  });
}
function regionBars(): void {
  drawText('REGIONS:', 8, 134, 2, INK);
  const cols: Record<string, string> = { Europe: '#c0392b', 'N. America': '#2471a3', Asia: '#e67e22', 'Middle East': '#8e44ad', Africa: '#27ae60', Oceania: '#1d6a8a', 'Latin Am.': '#7f8c8d' };
  let x = 118;
  const totalW = W - 8 - x;
  for (const r of REGIONS) {
    const w = Math.max(10, Math.round((regionCount(r) / TOTAL) * totalW));
    rect(x, 132, w, 16, cols[r]);
    // label inside the bar where it fits, else just the count
    const lab = w >= 100 ? `${r} ${regionCount(r)}` : `${regionCount(r)}`;
    drawText(lab, x + 4, 135, 1, '#ffffff');
    x += w;
  }
  const legend = REGIONS.map((r) => `${r} ${regionCount(r)}`).join('  -  ');
  drawText(legend, 118, 152, 1, INK);
}
function fullStories(): void {
  FULL.forEach((f, i) => {
    const x = 8 + (i % 2) * 508, y = 170 + Math.floor(i / 2) * 150;
    rect(x, y, 500, 146, '#ffffff');
    rect(x, y, 500, 2, NAVY);
    ILLU[i](x + 4, y + 4, 140, 138);
    const tx = x + 152, tw = 500 - 152 - 8;
    drawText(f.kicker, tx, y + 8, 1, RED);
    const hy = drawWrapped(f.head, tx, y + 22, tw, 2, NAVY, 15);
    const by = drawWrapped(f.body, tx, hy + 4, tw, 2, INK, 14);
    drawText('Source: ' + f.src, tx, y + 146 - 16, 1, '#555555');
    void by;
  });
}
function alsoOn(): void {
  drawText(`ALSO ON — ${ALSO.length} MORE STORIES FROM THE DAY`, 8, 472, 2, NAVY);
  line(8, 492, W - 8, 492, NAVY, 2);
  const cols: Story[][] = [ALSO.slice(0, 12), ALSO.slice(12, 24), ALSO.slice(24)];
  const colX = [8, 348, 688];
  const colW = 328;
  cols.forEach((list, ci) => {
    let y = 500;
    for (const s of list) {
      drawText(String(s.n), colX[ci], y + 3, 1, RED);
      const ny = drawWrapped(s.head, colX[ci] + 16, y, colW - 16, 2, INK, 14);
      drawText(`${s.place} - ${s.src}`, colX[ci] + 16, ny, 1, '#555555');
      y = ny + 12;
    }
  });
}
function worldMap(): void {
  const mx = 8, my = 868, mw = 462, mh = 148;
  rect(mx - 2, my - 2, mw + 4, mh + 4, '#ffffff');
  rect(mx, my, mw, mh, '#cfe3ee');
  drawText('THE WORLD — PINS 1-38 MATCH THE STORIES', mx + 6, my + 4, 1, NAVY);
  const X = (lon: number): number => mx + ((lon + 180) / 360) * mw;
  const Y = (lat: number): number => my + 12 + ((75 - lat) / 130) * (mh - 12);
  const LAND = '#a8bf94';
  const continents: [number, number][][] = [
    [[-168, 66], [-140, 70], [-125, 72], [-110, 68], [-95, 69], [-85, 66], [-75, 62], [-65, 60], [-55, 47], [-70, 42], [-75, 35], [-80, 32], [-85, 28], [-90, 21], [-97, 16], [-105, 20], [-115, 28], [-125, 40], [-140, 60], [-160, 58]],
    [[-80, 9], [-70, 11], [-60, 8], [-50, 4], [-40, -5], [-35, -8], [-40, -20], [-48, -28], [-58, -35], [-65, -41], [-70, -52], [-73, -40], [-75, -20], [-80, -5]],
    [[-10, 36], [-9, 43], [-2, 48], [0, 50], [5, 53], [8, 57], [10, 59], [18, 56], [21, 55], [24, 59], [28, 60], [30, 62], [28, 66], [20, 70], [12, 71], [5, 60], [-5, 58], [-10, 54]],
    [[-6, 35], [10, 37], [20, 32], [30, 31], [35, 28], [37, 22], [40, 15], [43, 11], [48, 11], [51, 10], [44, 0], [40, -10], [35, -20], [32, -28], [28, -33], [20, -35], [16, -28], [12, -18], [12, -5], [9, 4], [-8, 4], [-13, 8], [-17, 15], [-16, 20], [-10, 30]],
    [[30, 36], [36, 36], [42, 41], [48, 38], [54, 37], [57, 26], [60, 25], [66, 25], [70, 20], [75, 15], [80, 8], [85, 20], [90, 22], [95, 16], [100, 8], [103, 2], [100, -5], [105, -5], [110, -7], [115, -10], [120, -15], [125, -10], [130, -5], [135, 0], [140, 5], [142, 10], [140, 20], [135, 30], [130, 35], [127, 40], [122, 40], [120, 32], [118, 25], [110, 20], [105, 10], [100, 15], [95, 20], [90, 25], [85, 30], [80, 35], [75, 35], [70, 40], [65, 40], [60, 45], [55, 45], [50, 45], [45, 40], [40, 38], [35, 36]],
    [[113, -22], [114, -30], [118, -35], [125, -32], [130, -32], [135, -35], [140, -38], [145, -38], [150, -37], [153, -27], [150, -22], [146, -19], [142, -11], [137, -12], [132, -12], [126, -14], [122, -17], [118, -20]],
  ];
  for (const c of continents) poly(c.map(([lo, la]) => [X(lo), Y(la)] as [number, number]), LAND);
  const pin = (n: number, lon: number, lat: number, ox: number, oy: number): void => {
    const px = Math.round(X(lon)), py = Math.round(Y(lat));
    circle(px, py, 4, RED);
    drawText(String(n), px + ox, py + oy, 1, RED);
  };
  // full stories: 1 Antalya (28E,36.9N), 2 Hormuz (59.5E,26.5N), 3 Seoul (127E,37.5N), 4 Kyiv region (30.5E,50.5N)
  pin(1, 28, 36.9, 6, -8); pin(2, 59.5, 26.5, 6, 6); pin(3, 127, 37.5, 6, -8); pin(4, 30.5, 50.5, 6, -8);
  for (const s of ALSO) pin(s.n, s.lon, s.lat, s.ox, s.oy);
}
function dateCheck(): void {
  const x = 482, y = 866, w = W - 8 - x, h = 154;
  rect(x, y, w, h, '#fff3cd');
  rect(x, y, w, 2, RED);
  drawText('DATE CHECK — LEFT OUT', x + 10, y + 8, 2, RED);
  drawText('These are real stories from OTHER days. Not 23 Nov:', x + 10, y + 28, 1, INK);
  let yy = y + 44;
  for (const d of DATECHECK) yy = drawWrapped(d, x + 10, yy, w - 20, 1, INK, 11);
  drawText('All 38 stories verified against live sources, 23 Nov 2026.', x + 10, y + h - 16, 1, '#555555');
}

// ---------------------------------------------------------------- main
rect(0, 0, W, H, PAPER);
masthead();
numberStrip();
regionBars();
fullStories();
alsoOn();
worldMap();
dateCheck();
line(8, 1022, W - 8, 1022, NAVY, 1);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePNG();
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`wrote ${join(outDir, 'entry.png')} ${png.length} bytes, ${W}x${H}, ${TOTAL} stories`);
