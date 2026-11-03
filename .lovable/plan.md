# Legible Motion Optimizer — explainer page

A single long-form explainer page at `/` (with in-page section jumps) that walks through how the legibility optimizer works and how it drives the UR5e, using interactive visuals built from the real math in `legibility_optimizer.py` and `test_motion.py`.

## Visual direction
Technical lab-notebook look: warm off-white paper, ink-dark text, one signal color (UR blue, matching the uploaded arm photo) plus one accent (orange) for the "legible" path. Serif display headings + monospace for formulas/labels. The UR5e photo is used in the hero.

## Sections
1. **Hero** — "Making a robot's intent readable", UR5e photo, one-line summary: same start, same goal, same duration, only the shape changes.
2. **The problem** — Top-down table with 4 colored cubes (orange/red/yellow/green). Straight reach animates; a live bar chart shows how ambiguous the observer's guess stays.
3. **Two paths** — Interactive canvas: baseline `p(s)=start+s(goal−start)` vs legible `+ bend·sin(πs)`. Slider for bend magnitude/direction, picker for target cube.
4. **Timing: minimum-jerk** — Plot of `s(τ)=10τ³−15τ⁴+6τ⁵` with velocity curve; explain why both motions share identical speed profile.
5. **Goal inference (Dragan et al. 2013)** — Formula for softmax posterior `P(g|ξ) ∝ exp(β(d_start−d_curr))`; animated stacked probability bars over time for both paths, β slider.
6. **Legibility score** — Time-weighted integral of P(target) explained; live score readout for baseline vs legible as you tweak bend.
7. **Optimizer** — How the bend is chosen / optional joint-space SLSQP: decision variables, objective (maximize legibility), cost constraint (path length budget), joint bounds. Diagram of the optimization loop.
8. **Robot pipeline** — Flow diagram: test_motion.py → publish predictable reach on `/hri/predictable_reach` → optimizer node → `/hri/legible_reach` → MoveIt IK per min-jerk sample → safety checks (workspace, speed, joint jumps) → RViz preview → operator types "go" → UR5e executes → planned return.
9. **Safety & experiment notes** — Speed slider 100%, start-pose check, only x–y differ, orientation fixed.

## Technical details
- All math ported to a small TS module (`src/lib/legibility.ts`): baseline/legible path, min_jerk, goal_posterior, legibility_score — computed client-side so visuals are live.
- Visuals: SVG + `requestAnimationFrame` (no heavy libs); formulas via KaTeX.
- Cube positions/start pose are illustrative defaults (I'll mark them as such); can swap for your `experiment.yaml` values.
- UR5e image uploaded as a CDN asset; head() metadata for the page; design tokens in `src/styles.css`.
- Small vitest tests for the TS math (min-jerk endpoints, posterior sums to 1, legible path endpoints match start/goal).
