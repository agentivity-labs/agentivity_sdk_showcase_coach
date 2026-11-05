// Exercise poses are short lists of key positions on a side view, in pixels of a 300 x 150 sketch.
// `pose` turns one key position into joint points; the engine turns those into a 3D body.
export const L = { to: 46, up: 25, fo: 24, th: 34, sh: 34 };
type Pt = [number, number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Key = Record<string, any>;
const rd = (a: number) => (a * Math.PI) / 180;
const lm = (p: Pt, a: number, l: number): Pt => [p[0] + Math.sin(rd(a)) * l, p[1] + Math.cos(rd(a)) * l];
function ik(a: Pt, b: Pt, l1: number, l2: number, g = 1): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1], D = Math.hypot(dx, dy) || 1, d = Math.min(D, l1 + l2 - 0.3);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(l1 * l1 - x * x, 0));
  return [a[0] + (dx / D) * x + (dy / D) * h * g, a[1] + (dy / D) * x - (dx / D) * h * g];
}
export function pose(k: Key) {
  const hip: Pt = [k.hx, k.hy];
  const nk: Pt = [hip[0] + Math.sin(rd(k.t)) * L.to, hip[1] - Math.cos(rd(k.t)) * L.to];
  const hd: Pt = [nk[0] + Math.sin(rd(k.t + (k.n || 0))) * 15, nk[1] - Math.cos(rd(k.t + (k.n || 0))) * 15];
  let eF: Pt, hF: Pt, eB: Pt, hB: Pt;
  if (k.ey !== undefined) { eF = [k.ex, k.ey]; hF = [k.wx, k.wy]; eB = eF; hB = hF; }
  else if (k.hfx !== undefined) {
    hF = [k.hfx, k.hfy]; hB = [k.hfx - (k.hb || 0), k.hfy];
    eF = ik(nk, hF, L.up, L.fo, k.es || -1); eB = ik(nk, hB, L.up, L.fo, k.es || -1);
  } else {
    eF = lm(nk, k.aF, L.up); hF = lm(eF, k.fF, L.fo);
    eB = lm(nk, k.aB === undefined ? k.aF : k.aB, L.up); hB = lm(eB, k.fB === undefined ? k.fF : k.fB, L.fo);
  }
  const fF: Pt = [k.ffx, k.ffy], fB: Pt = [k.fbx === undefined ? k.ffx : k.fbx, k.fby === undefined ? k.ffy : k.fby];
  return { hip, nk, hd, eF, hF, eB, hB, fF, fB };
}
export function mix(a: Key, b: Key, t: number) {
  const o: Key = {};
  for (const k in a) o[k] = typeof a[k] === 'number' && b[k] !== undefined ? a[k] + (b[k] - a[k]) * t : a[k];
  return o;
}
