import { describe, expect, it } from 'vitest';
import { addXp, xpToNext } from '../../src/core/xp';

describe('xp curve', () => {
  it('starts at 5 XP for level 1 and strictly increases', () => {
    expect(xpToNext(1)).toBe(5);
    for (let l = 1; l < 60; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
  });

  it('rejects invalid levels', () => {
    expect(() => xpToNext(0)).toThrow(RangeError);
  });
});

describe('addXp', () => {
  it('accumulates without levelling below the threshold', () => {
    expect(addXp({ level: 1, xp: 0 }, 4)).toEqual({ level: 1, xp: 4, levelsGained: 0 });
  });

  it('levels up exactly at the threshold and carries the remainder', () => {
    expect(addXp({ level: 1, xp: 3 }, 4)).toEqual({ level: 2, xp: 2, levelsGained: 1 });
  });

  it('can gain several levels from one big pickup', () => {
    const big = xpToNext(1) + xpToNext(2) + xpToNext(3) + 1;
    expect(addXp({ level: 1, xp: 0 }, big)).toEqual({ level: 4, xp: 1, levelsGained: 3 });
  });

  it('rejects negative XP', () => {
    expect(() => addXp({ level: 1, xp: 0 }, -1)).toThrow(RangeError);
  });
});
