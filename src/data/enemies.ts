export type EnemyKind = 'chaser' | 'runner' | 'brute' | 'spitter' | 'boss';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  /** px/s */
  speed: number;
  /** contact damage */
  damage: number;
  /** collision radius (px) */
  radius: number;
  xp: number;
  /** how strongly knockback moves it (0 = immovable) */
  knockback: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  chaser: { kind: 'chaser', hp: 14, speed: 62, damage: 8, radius: 12, xp: 1, knockback: 1 },
  runner: { kind: 'runner', hp: 8, speed: 118, damage: 6, radius: 9, xp: 1, knockback: 1.3 },
  brute: { kind: 'brute', hp: 75, speed: 40, damage: 16, radius: 20, xp: 4, knockback: 0.35 },
  spitter: { kind: 'spitter', hp: 22, speed: 55, damage: 6, radius: 12, xp: 2, knockback: 0.9 },
  boss: { kind: 'boss', hp: 1600, speed: 52, damage: 26, radius: 42, xp: 40, knockback: 0.05 },
};

/** Spitter AI tuning. */
export const SPITTER = {
  preferredMin: 170,
  preferredMax: 250,
  fireEvery: 2400,
  shotSpeed: 190,
  shotDamage: 8,
};

/** Boss AI tuning. */
export const BOSS = {
  burstEvery: 3000,
  burstCount: 12,
  enragedBurstCount: 18,
  shotSpeed: 150,
  shotDamage: 10,
};
