import { describe, expect, it } from 'vitest';
import { applyDifficulty, DIFFICULTIES, DIFFICULTY_IDS, isDifficulty } from '../../src/core/difficulty';
import { spawnPlan } from '../../src/core/director';

describe('difficulty', () => {
  it('normal leaves the spawn plan untouched', () => {
    for (const t of [0, 120, 300, 600]) expect(applyDifficulty(spawnPlan(t), 'normal')).toEqual(spawnPlan(t));
  });

  it('easy is gentler than normal on every axis', () => {
    const e = DIFFICULTIES.easy;
    const n = DIFFICULTIES.normal;
    expect(e.spawnInterval).toBeGreaterThan(n.spawnInterval);
    expect(e.maxAlive).toBeLessThan(n.maxAlive);
    expect(e.enemyHp).toBeLessThan(n.enemyHp);
    expect(e.damageTaken).toBeLessThan(n.damageTaken);
    for (const t of [0, 200, 599]) {
      const easy = applyDifficulty(spawnPlan(t), 'easy');
      const normal = spawnPlan(t);
      expect(easy.interval).toBeGreaterThan(normal.interval);
      expect(easy.maxAlive).toBeLessThan(normal.maxAlive);
      expect(easy.weights).toEqual(normal.weights);
    }
  });

  it('validates stored values', () => {
    for (const id of DIFFICULTY_IDS) expect(isDifficulty(id)).toBe(true);
    expect(isDifficulty('hard')).toBe(false);
    expect(isDifficulty(undefined)).toBe(false);
  });
});
