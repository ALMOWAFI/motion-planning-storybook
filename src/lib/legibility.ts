// TS port of legibility_optimizer.py (planar x-y), used for live visuals.
export type Vec = [number, number];

export const minJerk = (tau: number) => {
  const t = Math.min(1, Math.max(0, tau));
  return 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5;
};
export const minJerkVel = (tau: number) => {
  const t = Math.min(1, Math.max(0, tau));
  return 30 * t ** 2 - 60 * t ** 3 + 30 * t ** 4;
};

export const baselinePoint = (a: Vec, b: Vec, s: number): Vec => [
  a[0] + s * (b[0] - a[0]),
  a[1] + s * (b[1] - a[1]),
];

export const legiblePoint = (a: Vec, b: Vec, bend: Vec, s: number): Vec => {
  const k = Math.sin(Math.PI * s);
  const p = baselinePoint(a, b, s);
  return [p[0] + bend[0] * k, p[1] + bend[1] * k];
};

const dist = (p: Vec, q: Vec) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Softmax over goals of beta * (d_start - d_curr). Sums to 1. */
export function goalPosterior(ee: Vec, start: Vec, goals: Vec[], beta = 4): number[] {
  const logits = goals.map((g) => beta * (dist(g, start) - dist(g, ee)));
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m));
  const z = e.reduce((x, y) => x + y, 0);
  return e.map((v) => v / z);
}

/** Sample a path under min-jerk timing: n+1 points uniform in time. */
export function samplePath(path: (s: number) => Vec, n = 100): Vec[] {
  return Array.from({ length: n + 1 }, (_, i) => path(minJerk(i / n)));
}

/** Time-weighted average of P(target) — earlier moments count more (Dragan 2013). */
export function legibilityScore(xyz: Vec[], goals: Vec[], target: number, beta = 4): number {
  const n = xyz.length - 1;
  if (n < 1) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const w = (n - i) / n; // (T - t_i) / T, uniform dt
    num += (goalPosterior(xyz[i]!, xyz[0]!, goals, beta)[target] ?? 0) * w;
    den += w;
  }
  return num / den;
}

/** Brute-force best lateral bend (what the optimizer node does, simplified). */
export function bestBend(a: Vec, b: Vec, goals: Vec[], target: number, beta: number, maxBend = 0.25) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const perp: Vec = [-dy / L, dx / L];
  let best = { amount: 0, score: -1 };
  for (let k = -40; k <= 40; k++) {
    const amt = (k / 40) * maxBend;
    const bend: Vec = [perp[0] * amt, perp[1] * amt];
    const sc = legibilityScore(samplePath((s) => legiblePoint(a, b, bend, s), 60), goals, target, beta);
    if (sc > best.score) best = { amount: amt, score: sc };
  }
  return { ...best, perp };
}
