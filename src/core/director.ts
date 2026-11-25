import type { EnemyKind } from '../data/enemies';

/** Length of a winning run, in seconds. */
export const WIN_TIME = 600;

/** Seconds into the run at which a boss appears. */
export const BOSS_TIMES: readonly number[] = [300, 540];

export type RunLength = 'short' | 'long';

export const RUN_LENGTH_IDS: readonly RunLength[] = ['short', 'long'];

export interface RunLengthDef {
  label: string;
  /** seconds until dawn (a win) */
  seconds: number;
  /** seconds at which bosses appear */
  bossTimes: readonly number[];
}

/**
 * A short run plays the first half of the same difficulty curve, so the opening feels identical;
 * its single boss arrives a minute before dawn as the finale.
 */
export const RUN_LENGTHS: Record<RunLength, RunLengthDef> = {
  short: { label: '5 min', seconds: 300, bossTimes: [240] },
  long: { label: '10 min', seconds: WIN_TIME, bossTimes: BOSS_TIMES },
};

export function isRunLength(v: unknown): v is RunLength {
  return typeof v === 'string' && (RUN_LENGTH_IDS as readonly string[]).includes(v);
}

export interface SpawnPlan {
  /** ms between spawn waves */
  interval: number;
  /** enemies per wave */
  batch: number;
  /** hard cap on living (non-boss) enemies */
  maxAlive: number;
  /** relative spawn weights by kind */
  weights: Record<Exclude<EnemyKind, 'boss'>, number>;
}

const ramp = (t: number, start: number, perSecond: number, max: number): number =>
  t < start ? 0 : Math.min(max, (t - start) * perSecond);

/**
 * The difficulty curve: a pure function of elapsed run time (seconds).
 * Early game is chasers only; runners, brutes and spitters phase in over time.
 */
export function spawnPlan(t: number): SpawnPlan {
  const time = Math.max(0, t);
  return {
    interval: Math.max(260, 1150 - time * 1.5),
    batch: 1 + Math.floor(time / 75),
    maxAlive: Math.min(320, Math.round(30 + time * 0.55)),
    weights: {
      chaser: 10,
      runner: ramp(time, 40, 1 / 25, 6),
      brute: ramp(time, 140, 1 / 60, 4),
      spitter: ramp(time, 200, 1 / 50, 4),
    },
  };
}

/** Enemy HP multiplier at time t (seconds). Linear: 1x at start, 4x at the 10 minute mark. */
export function enemyHpScale(t: number): number {
  return 1 + Math.max(0, t) / 200;
}

/** Bosses whose spawn time falls in (prevT, t]. */
export function bossesDue(prevT: number, t: number, times: readonly number[] = BOSS_TIMES): number[] {
  return times.filter((bt) => bt > prevT && bt <= t);
}

/** "m:ss" for HUD and results. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
