import type { EnemyKind } from '../data/enemies';
import type { Difficulty } from './difficulty';
import type { RunLength } from './director';

/**
 * Scoring. Points come from three places, each rewarding a different way of playing:
 *  - kills, multiplied by the combo (keep killing, don't get hit)
 *  - pink wisps, rare orbs that fade fast and ignore your magnet (go get them, even into the swarm)
 *  - survival time and the dawn bonus (stay alive)
 * The total is then scaled by difficulty, so scores compare fairly across modes.
 */

export const KILL_POINTS: Record<EnemyKind, number> = {
  chaser: 10,
  runner: 15,
  spitter: 25,
  brute: 40,
  boss: 1000,
};

export const WISP_POINTS = 250;
/** kills added to the combo chain by collecting a wisp */
export const WISP_CHAIN_BONUS = 10;
/** seconds without a kill before the combo drops */
export const COMBO_WINDOW = 2.5;
/** kills per +0.5 multiplier step */
export const COMBO_STEP = 25;
export const COMBO_MAX = 4;
export const SURVIVAL_POINTS_PER_SECOND = 10;
export const DAWN_BONUS: Record<RunLength, number> = { short: 2500, long: 6000 };
export const DIFFICULTY_SCORE_MULT: Record<Difficulty, number> = { easy: 0.6, normal: 1 };

export interface ScoreState {
  /** points banked during the run (kills + wisps), before end-of-run bonuses */
  points: number;
  killPoints: number;
  wispPoints: number;
  wisps: number;
  /** consecutive kills without the combo dropping */
  chain: number;
  /** seconds left before the combo drops */
  comboTimer: number;
  bestChain: number;
}

export function newScore(): ScoreState {
  return { points: 0, killPoints: 0, wispPoints: 0, wisps: 0, chain: 0, comboTimer: 0, bestChain: 0 };
}

/** x1 to start, +0.5 for every COMBO_STEP kills in a chain, capped at COMBO_MAX. */
export function comboMultiplier(chain: number): number {
  return Math.min(COMBO_MAX, 1 + Math.floor(Math.max(0, chain) / COMBO_STEP) * 0.5);
}

function extendChain(s: ScoreState, by: number): void {
  s.chain += by;
  s.comboTimer = COMBO_WINDOW;
  s.bestChain = Math.max(s.bestChain, s.chain);
}

/** Scores a kill (mutates s) and returns the points awarded. */
export function scoreKill(s: ScoreState, kind: EnemyKind): number {
  extendChain(s, 1);
  const pts = Math.round(KILL_POINTS[kind] * comboMultiplier(s.chain));
  s.points += pts;
  s.killPoints += pts;
  return pts;
}

/** Scores a collected wisp (mutates s) and returns the points awarded. */
export function scoreWisp(s: ScoreState): number {
  extendChain(s, WISP_CHAIN_BONUS);
  const pts = Math.round(WISP_POINTS * comboMultiplier(s.chain));
  s.points += pts;
  s.wispPoints += pts;
  s.wisps++;
  return pts;
}

/** Counts the combo window down; the chain drops to zero when it runs out. */
export function tickCombo(s: ScoreState, dt: number): void {
  if (s.chain === 0) return;
  s.comboTimer -= dt;
  if (s.comboTimer <= 0) breakCombo(s);
}

/** Getting hit ends the combo. */
export function breakCombo(s: ScoreState): void {
  s.chain = 0;
  s.comboTimer = 0;
}

export interface ScoreBreakdown {
  kills: number;
  wisps: number;
  survival: number;
  dawn: number;
  multiplier: number;
  total: number;
}

export function finalScore(
  s: ScoreState,
  opts: { elapsed: number; won: boolean; runLength: RunLength; difficulty: Difficulty },
): ScoreBreakdown {
  const survival = Math.floor(Math.max(0, opts.elapsed)) * SURVIVAL_POINTS_PER_SECOND;
  const dawn = opts.won ? DAWN_BONUS[opts.runLength] : 0;
  const multiplier = DIFFICULTY_SCORE_MULT[opts.difficulty];
  const total = Math.round((s.killPoints + s.wispPoints + survival + dawn) * multiplier);
  return { kills: s.killPoints, wisps: s.wispPoints, survival, dawn, multiplier, total };
}

/** Wisp spawn timing: a new one every 9 to 15 seconds, at most MAX_WISPS on the floor. */
export const WISP_SPAWN_MIN = 9;
export const WISP_SPAWN_MAX = 15;
export const MAX_WISPS = 3;
/** seconds a wisp lasts before fading away */
export const WISP_LIFETIME = 9;
/** chance that a kill drops a wisp */
export const WISP_DROP_CHANCE = 0.01;
