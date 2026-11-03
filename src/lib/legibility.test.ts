import { describe, expect, it } from "vitest";
import { bestBend, goalPosterior, legiblePoint, legibilityScore, minJerk, samplePath, type Vec } from "./legibility";

const start: Vec = [0, 0];
const goals: Vec[] = [[-0.3, 0.5], [-0.1, 0.5], [0.1, 0.5], [0.3, 0.5]];

describe("legibility math", () => {
  it("min-jerk maps 0→0, 0.5→0.5, 1→1", () => {
    expect(minJerk(0)).toBe(0);
    expect(minJerk(0.5)).toBeCloseTo(0.5);
    expect(minJerk(1)).toBe(1);
  });
  it("legible path keeps start and goal", () => {
    const b: Vec = [0.2, 0];
    expect(legiblePoint(start, goals[1], b, 0)).toEqual(start);
    const end = legiblePoint(start, goals[1], b, 1);
    expect(end[0]).toBeCloseTo(-0.1);
    expect(end[1]).toBeCloseTo(0.5);
  });
  it("posterior sums to 1", () => {
    const p = goalPosterior([0.05, 0.2], start, goals, 4);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("optimized bend beats the straight line", () => {
    const straight = legibilityScore(samplePath((s) => legiblePoint(start, goals[1], [0, 0], s)), goals, 1, 8);
    expect(bestBend(start, goals[1], goals, 1, 8).score).toBeGreaterThan(straight);
  });
});
