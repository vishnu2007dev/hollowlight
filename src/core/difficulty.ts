import type { SpawnPlan } from './director';

export type Difficulty = 'easy' | 'normal';

export const DIFFICULTY_IDS: readonly Difficulty[] = ['easy', 'normal'];

export interface DifficultyMods {
  label: string;
  /** multiplies the ms between spawn waves (higher = slower spawns) */
  spawnInterval: number;
  /** multiplies the cap on living enemies */
  maxAlive: number;
  /** multiplies enemy (and boss) HP */
  enemyHp: number;
  /** multiplies all damage the player takes */
  damageTaken: number;
}

/** Normal is the tuned baseline (all 1s); every other mode is expressed relative to it. */
export const DIFFICULTIES: Record<Difficulty, DifficultyMods> = {
  easy: { label: 'Easy', spawnInterval: 1.3, maxAlive: 0.75, enemyHp: 0.75, damageTaken: 0.6 },
  normal: { label: 'Normal', spawnInterval: 1, maxAlive: 1, enemyHp: 1, damageTaken: 1 },
};

export function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && (DIFFICULTY_IDS as readonly string[]).includes(v);
}

/** Applies a mode's modifiers to the director's base spawn plan. */
export function applyDifficulty(plan: SpawnPlan, d: Difficulty): SpawnPlan {
  const m = DIFFICULTIES[d];
  return {
    ...plan,
    interval: plan.interval * m.spawnInterval,
    maxAlive: Math.max(1, Math.round(plan.maxAlive * m.maxAlive)),
  };
}
