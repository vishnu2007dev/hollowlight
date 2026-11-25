import type { PassiveId } from '../data/passives';

export const BASE_PLAYER = {
  maxHp: 100,
  speed: 170,
  magnet: 70,
};

export interface PlayerStats {
  maxHp: number;
  /** px/s */
  speed: number;
  /** gem pickup attraction radius (px) */
  magnet: number;
  /** multiplier applied to weapon cooldowns (lower is faster) */
  cooldownMult: number;
  /** multiplier applied to weapon damage */
  damageMult: number;
  /** HP regenerated per second */
  regen: number;
}

/** Derives player stats from passive levels. Pure, so balance changes are testable. */
export function playerStats(passives: Record<PassiveId, number>): PlayerStats {
  return {
    maxHp: BASE_PLAYER.maxHp + 20 * passives.maxHp,
    speed: BASE_PLAYER.speed * (1 + 0.08 * passives.speed),
    magnet: BASE_PLAYER.magnet * (1 + 0.3 * passives.magnet),
    cooldownMult: Math.max(0.4, 1 - 0.08 * passives.haste),
    damageMult: 1 + 0.12 * passives.might,
    regen: 0.5 * passives.regen,
  };
}

/** Normalised direction from (x1,y1) to (x2,y2); zero vector if the points coincide. */
export function direction(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  return len === 0 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
}

/** Circle overlap test. */
export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}
