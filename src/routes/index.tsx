import { createFileRoute } from "@tanstack/react-router";
import arm from "@/assets/ur5e_arm.png.asset.json";
import { MinJerkPlot, OptimizerLoop, Pipeline, Playground, ProblemDemo } from "@/components/legibility/visuals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "How the Legibility Optimizer Works — UR5e Legible Motion" },
      { name: "description", content: "Interactive explainer of the legibility optimizer and the UR5e motion planning pipeline for our HRI study." },
      { property: "og:title", content: "How the Legibility Optimizer Works" },
      { property: "og:description", content: "Same start, same goal, same duration — only the shape changes. See how a robot's intent becomes readable." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const NAV = [
  ["problem", "Problem"], ["paths", "Paths"], ["timing", "Timing"], ["inference", "Inference"],
  ["optimizer", "Optimizer"], ["robot", "Robot"], ["lab", "Lab"], ["safety", "Safety"],
];

function Formula({ children }: { children: React.ReactNode }) {
  return <pre className="overflow-x-auto rounded-sm border-l-2 border-accent bg-muted px-4 py-3 font-mono text-sm">{children}</pre>;
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-border py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">§ {n}</p>
      <h2 className="mt-2 font-display text-4xl md:text-5xl">{title}</h2>
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  );
}

function Index() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-6 py-3 font-mono text-xs uppercase tracking-widest">
          <span className="text-foreground">Legible Motion</span>
          {NAV.map(([id, l]) => <a key={id} href={`#${id}`} className="text-muted-foreground hover:text-accent">{l}</a>)}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6">
        <header className="grid items-center gap-10 py-16 md:grid-cols-[3fr_2fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">UR5e · HRI study · Dragan et al. 2013</p>
            <h1 className="mt-4 font-display text-6xl leading-[0.95] md:text-8xl">
              Making a robot's <em className="text-accent">intent</em> readable.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Same start, same goal, same duration, same speed profile. Only the shape of the reach changes — so a person can tell which cube the arm wants, earlier.
            </p>
          </div>
          <div className="paper-grid rounded-sm border border-border p-6">
            <img src={arm.url} alt="Universal Robots UR5e arm" className="mx-auto max-h-80 mix-blend-multiply" />
          </div>
        </header>

        <Section id="problem" n="1" title="A straight line hides the goal">
          <p className="max-w-2xl text-muted-foreground">Four cubes sit in a row. The efficient straight reach is predictable, but an observer can't tell which neighbouring cube it is heading for until the very end.</p>
          <ProblemDemo />
        </Section>

        <Section id="paths" n="2" title="Two paths, one parameter">
          <p className="max-w-2xl text-muted-foreground">Both paths are functions of progress s ∈ [0,1]. The legible path adds a lateral bend that is zero at both ends and largest halfway.</p>
          <Formula>{`baseline:  p(s) = start + s·(goal − start)
legible:   p(s) = start + s·(goal − start) + bend·sin(πs)`}</Formula>
          <Playground />
          <p className="text-sm text-muted-foreground">Tip: the score rises when the bend leans away from the cubes it could be confused with — but bending too far points at another cube instead. Cube positions are the real B1–B4 layout from experiment.yaml (0.45 m arc around the start pose); default bend is the 0.20 m used in the "legible" condition.</p>
        </Section>

        <Section id="timing" n="3" title="Identical timing: minimum jerk">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <Formula>{`s(τ) = 10τ³ − 15τ⁴ + 6τ⁵ ,  τ = t / T`}</Formula>
              <p className="text-muted-foreground">Zero velocity and acceleration at both ends. Since s is proportional to arc length and both motions use the same time law and duration, any difference participants perceive comes from shape alone — not speed.</p>
            </div>
            <MinJerkPlot />
          </div>
        </Section>

        <Section id="inference" n="4" title="How an observer guesses the goal">
          <p className="max-w-2xl text-muted-foreground">We model the observer as rational: a goal becomes more likely the more the gripper has closed in on it since the start. β controls how sharply they commit.</p>
          <Formula>{`P(g | ξ₀→t)  ∝  exp( β · ( ‖g − start‖ − ‖g − p(t)‖ ) )     // softmax over cubes`}</Formula>
          <Formula>{`Legibility = Σ P(target | p(tᵢ)) · w(tᵢ) · Δt  /  Σ w(tᵢ) · Δt ,   w(t) = (T − t) / T`}</Formula>
          <p className="max-w-2xl text-muted-foreground">The weight w(t) rewards confidence that arrives <em>early</em> — being right at the end is free; being right halfway is what counts. Use the playground above to watch both numbers move.</p>
        </Section>

        <Section id="optimizer" n="5" title="The optimizer">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-display text-2xl">Cartesian (used in trials)</h3>
              <p className="text-muted-foreground">Search the bend vector in the table plane that maximises the legibility score for the chosen cube. Start, end, height z and duration stay fixed; only x–y differ. The playground's “Run optimizer” button does a simplified 1-D version of this.</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-2xl">Joint space (optional, SLSQP)</h3>
              <p className="text-muted-foreground">Decision variables are the interior joint waypoints. q₀ and q_N are pinned. Gripper position comes from analytic UR5e forward kinematics (DH parameters).</p>
              <Formula>{`min  −Legibility(FK(q)) + λ‖q − q_base‖²
s.t. Σ‖Δq‖²/Δt ≤ cost_ratio · baseline_cost
     q_min ≤ q ≤ q_max`}</Formula>
            </div>
          </div>
          <OptimizerLoop />
        </Section>

        <Section id="robot" n="6" title="From optimizer to real robot">
          <p className="max-w-2xl text-muted-foreground">Over ROS, test_motion.py and the optimizer node trade trajectories on two topics. MoveIt only has to solve IK at each sample, because samples are already uniform in time under min-jerk.</p>
          <Pipeline />
        </Section>

        <Section id="lab" n="7" title="Ran this for real">
          <p className="max-w-2xl text-muted-foreground">
            A pilot session on the actual UR5e: the arm, the participant's "which cube?" display
            cycling through trial rounds, and the operator's terminal.
          </p>
          <video
            controls
            preload="metadata"
            className="w-full max-w-sm rounded-sm border border-border"
            src="/pilot-session.mp4"
          >
            Your browser doesn't support embedded video.
          </video>
          <p className="max-w-2xl text-sm text-muted-foreground">
            This is a handheld walkthrough clip, not a fixed camera on one clean reach — so unlike
            the panels above, nothing here is synced frame-by-frame to the optimizer's output.
            It's included as evidence the pipeline runs end to end on real hardware with a real
            participant, not a claim about what the model predicted at any instant in this clip.
          </p>
        </Section>

        <Section id="safety" n="8" title="Safety & experiment notes">
          <ul className="grid gap-3 md:grid-cols-2">
            {[
              "Every trajectory passes workspace, speed and joint-jump checks before it is shown or sent.",
              "--execute requires a person at an interactive terminal typing 'go'.",
              "The robot is checked to be at the start pose before each reach.",
              "Teach-pendant speed slider must be 100 %, or the reach won't take the planned time.",
              "Tool orientation is held from the start pose; only x–y of the path change.",
              "The return move is checked at planning time and re-planned after the reach.",
            ].map((t) => <li key={t} className="rounded-sm border border-border bg-card p-4 text-sm">{t}</li>)}
          </ul>
        </Section>
      </main>
      <footer className="border-t border-border py-8 text-center font-mono text-xs text-muted-foreground">UR5e Legible Motion · HRI study</footer>
    </div>
  );
}
