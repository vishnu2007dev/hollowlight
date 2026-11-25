/** XP required to advance from `level` to `level + 1`. Level starts at 1. */
export function xpToNext(level: number): number {
  if (level < 1) throw new RangeError('level must be >= 1');
  const n = level - 1;
  return Math.round(5 + 4 * n + 0.6 * n * n);
}

export interface XpState {
  level: number;
  /** XP accumulated toward the next level. */
  xp: number;
}

export interface XpGainResult extends XpState {
  levelsGained: number;
}

/** Adds XP, rolling over into as many levels as the amount covers. */
export function addXp(state: XpState, amount: number): XpGainResult {
  if (amount < 0) throw new RangeError('amount must be >= 0');
  let { level, xp } = state;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
    levelsGained++;
  }
  return { level, xp, levelsGained };
}
