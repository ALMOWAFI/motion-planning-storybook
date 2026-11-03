import { useEffect, useMemo, useState } from "react";
import {
  bestBend,
  goalPosterior,
  legiblePoint,
  legibilityScore,
  minJerk,
  minJerkVel,
  samplePath,
  type Vec,
} from "@/lib/legibility";

// Illustrative layout (top-down, metres). Swap for experiment.yaml values.
export const START: Vec = [0, 0];
export const GOALS: Vec[] = [
  [-0.3, 0.5],
  [-0.1, 0.5],
  [0.1, 0.5],
  [0.3, 0.5],
];
export const CUBES = [
  { name: "orange", fill: "fill-cube-orange", bg: "bg-cube-orange" },
  { name: "red", fill: "fill-cube-red", bg: "bg-cube-red" },
  { name: "yellow", fill: "fill-cube-yellow", bg: "bg-cube-yellow" },
  { name: "green", fill: "fill-cube-green", bg: "bg-cube-green" },
];

const X = (x: number) => 200 + x * 400;
const Y = (y: number) => 290 - y * 450;
const toD = (pts: Vec[]) => pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");

/** Looping normalized time 0..1 with a short hold at the end. */
export function useTau(duration = 4) {
  const [tau, setTau] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = ((now - t0) / 1000) % (duration + 1.2);
      setTau(Math.min(1, t / duration));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return tau;
}

function Table({ children }: { children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 400 320" className="w-full rounded-sm border border-border bg-card">
      <defs>
        <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" className="fill-none stroke-grid" />
        </pattern>
      </defs>
      <rect width="400" height="320" fill="url(#g)" />
      {GOALS.map((g, i) => (
        <rect key={i} x={X(g[0]) - 12} y={Y(g[1]) - 12} width="24" height="24" rx="2" className={`${CUBES[i].fill} stroke-foreground/30`} />
      ))}
      <circle cx={X(START[0])} cy={Y(START[1])} r="10" className="fill-foreground/10 stroke-foreground/50" />
      <text x={X(0) + 16} y={Y(0) + 4} className="fill-muted-foreground font-mono text-[10px]">start</text>
      {children}
    </svg>
  );
}

function ProbBars({ probs, target }: { probs: number[]; target: number }) {
  return (
    <div className="flex h-28 items-end gap-3">
      {probs.map((p, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="font-mono text-xs text-muted-foreground">{(p * 100).toFixed(0)}%</span>
          <div className={`w-full rounded-t-sm ${CUBES[i].bg} ${i === target ? "ring-2 ring-foreground" : "opacity-70"}`} style={{ height: `${Math.max(2, p * 90)}px` }} />
        </div>
      ))}
    </div>
  );
}

/** Section 2: straight reach is ambiguous. */
export function ProblemDemo() {
  const tau = useTau();
  const target = 1;
  const pts = useMemo(() => samplePath((s) => legiblePoint(START, GOALS[target], [0, 0], s)), []);
  const p = legiblePoint(START, GOALS[target], [0, 0], minJerk(tau));
  const probs = goalPosterior(p, START, GOALS, 6);
  return (
    <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-center">
      <Table>
        <path d={toD(pts)} className="fill-none stroke-primary" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx={X(p[0])} cy={Y(p[1])} r="7" className="fill-primary" />
      </Table>
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Observer's guess, live</p>
        <ProbBars probs={probs} target={target} />
        <p className="mt-4 text-sm text-muted-foreground">
          Heading for <b className="text-foreground">red</b> in a straight line, the gripper looks equally likely to want orange or red for most of the reach.
        </p>
      </div>
    </div>
  );
}

/** Sections 3, 5, 6: interactive bend / beta playground. */
export function Playground() {
  const [target, setTarget] = useState(1);
  const [bendAmt, setBendAmt] = useState(0.06);
  const [beta, setBeta] = useState(6);
  const tau = useTau();
  const a = START, b = GOALS[target];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const perp: Vec = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  const bend: Vec = [perp[0] * bendAmt, perp[1] * bendAmt];

  const base = useMemo(() => samplePath((s) => legiblePoint(a, b, [0, 0], s)), [target]);
  const leg = useMemo(() => samplePath((s) => legiblePoint(a, b, bend, s)), [target, bendAmt]);
  const sBase = legibilityScore(base, GOALS, target, beta);
  const sLeg = legibilityScore(leg, GOALS, target, beta);
  const opt = useMemo(() => bestBend(a, b, GOALS, target, beta), [target, beta]);

  const s = minJerk(tau);
  const pb = legiblePoint(a, b, [0, 0], s);
  const pl = legiblePoint(a, b, bend, s);
  const mid = legiblePoint(a, b, [0, 0], 0.5);

  return (
    <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
      <Table>
        <path d={toD(base)} className="fill-none stroke-primary" strokeWidth="2" strokeDasharray="4 4" />
        <path d={toD(leg)} className="fill-none stroke-accent" strokeWidth="2.5" />
        <line x1={X(mid[0])} y1={Y(mid[1])} x2={X(mid[0] + bend[0])} y2={Y(mid[1] + bend[1])} className="stroke-foreground/50" strokeDasharray="2 3" />
        <text x={X(mid[0] + bend[0] / 2) + 6} y={Y(mid[1] + bend[1] / 2)} className="fill-muted-foreground font-mono text-[10px]">bend·sin(πs)</text>
        <circle cx={X(pb[0])} cy={Y(pb[1])} r="6" className="fill-primary" />
        <circle cx={X(pl[0])} cy={Y(pl[1])} r="7" className="fill-accent" />
      </Table>
      <div className="space-y-5">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Target cube</p>
          <div className="flex gap-2">
            {CUBES.map((c, i) => (
              <button key={c.name} onClick={() => setTarget(i)} aria-label={c.name}
                className={`h-8 w-8 rounded-sm ${c.bg} ${i === target ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-60"}`} />
            ))}
          </div>
        </div>
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Bend {bendAmt.toFixed(2)} m</span>
          <input type="range" min={-0.25} max={0.25} step={0.01} value={bendAmt} onChange={(e) => setBendAmt(+e.target.value)} className="w-full accent-accent" />
        </label>
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">β (observer rationality) {beta}</span>
          <input type="range" min={1} max={15} step={1} value={beta} onChange={(e) => setBeta(+e.target.value)} className="w-full accent-primary" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Score label="Straight" value={sBase} tone="text-primary" />
          <Score label="Legible" value={sLeg} tone="text-accent" />
        </div>
        <button onClick={() => setBendAmt(+opt.amount.toFixed(2))}
          className="w-full rounded-sm border border-foreground px-3 py-2 font-mono text-xs uppercase tracking-widest hover:bg-foreground hover:text-background">
          Run optimizer → bend {opt.amount.toFixed(2)} m, score {opt.score.toFixed(3)}
        </button>
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Guess along legible path</p>
          <ProbBars probs={goalPosterior(pl, a, GOALS, beta)} target={target} />
        </div>
      </div>
    </div>
  );
}

function Score({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-display text-4xl ${tone}`}>{value.toFixed(3)}</p>
    </div>
  );
}

/** Section 4: min-jerk timing curves. */
export function MinJerkPlot() {
  const tau = useTau();
  const n = 80;
  const W = 400, H = 200;
  const pos = Array.from({ length: n + 1 }, (_, i) => [i / n, minJerk(i / n)]);
  const vel = Array.from({ length: n + 1 }, (_, i) => [i / n, minJerkVel(i / n) / 1.875]);
  const d = (pts: number[][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${20 + x * (W - 40)},${H - 20 - y * (H - 40)}`).join(" ");
  const cx = 20 + tau * (W - 40);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm border border-border bg-card">
      <line x1="20" y1={H - 20} x2={W - 20} y2={H - 20} className="stroke-border" />
      <path d={d(pos)} className="fill-none stroke-foreground" strokeWidth="2" />
      <path d={d(vel)} className="fill-none stroke-accent" strokeWidth="2" strokeDasharray="5 3" />
      <line x1={cx} y1="20" x2={cx} y2={H - 20} className="stroke-primary" />
      <circle cx={cx} cy={H - 20 - minJerk(tau) * (H - 40)} r="5" className="fill-primary" />
      <text x="24" y="16" className="fill-foreground font-mono text-[10px]">s(τ) progress</text>
      <text x="140" y="16" className="fill-accent font-mono text-[10px]">ṡ(τ) speed (normalized)</text>
      <text x={W - 34} y={H - 6} className="fill-muted-foreground font-mono text-[10px]">τ=1</text>
    </svg>
  );
}

const PIPE = [
  ["test_motion.py", "pick cube, build straight reach at 100 Hz"],
  ["/hri/predictable_reach", "CartesianTrajectory published"],
  ["optimizer node", "maximise legibility → bent x-y path"],
  ["/hri/legible_reach", "same start, end, z, duration"],
  ["MoveIt IK", "one IK solve per min-jerk sample"],
  ["safety", "workspace · speed · joint jumps"],
  ["RViz preview", "operator inspects planned path"],
  ["operator types 'go'", "interactive terminal required"],
  ["UR5e executes", "then a planned return to start"],
];

/** Section 8: robot pipeline flow. */
export function Pipeline() {
  return (
    <ol className="relative grid gap-3 md:grid-cols-3">
      {PIPE.map(([t, d], i) => (
        <li key={t} className="rounded-sm border border-border bg-card p-4">
          <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
          <p className={`font-mono text-sm font-semibold ${t.startsWith("/") ? "text-primary" : i === 2 ? "text-accent" : "text-foreground"}`}>{t}</p>
          <p className="mt-1 text-sm text-muted-foreground">{d}</p>
        </li>
      ))}
    </ol>
  );
}

/** Section 7: optimization loop diagram. */
export function OptimizerLoop() {
  const steps = ["interior waypoints q₁…q_{N−1}", "forward kinematics → gripper xy", "goal posterior P(g | ξ)", "score − deviation penalty", "SLSQP update within cost & joint limits"];
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className="rounded-sm border border-foreground/40 bg-card px-3 py-2">{s}</span>
          <span className="text-accent">{i === steps.length - 1 ? "↺" : "→"}</span>
        </div>
      ))}
    </div>
  );
}
