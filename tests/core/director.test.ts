import { describe, expect, it } from 'vitest';
import {
  BOSS_TIMES,
  bossesDue,
  enemyHpScale,
  formatTime,
  isRunLength,
  RUN_LENGTH_IDS,
  RUN_LENGTHS,
  spawnPlan,
  WIN_TIME,
} from '../../src/core/director';
import { playerStats } from '../../src/core/combat';
import { startingLoadout } from '../../src/core/upgrades';

describe('director', () => {
  it('opens with chasers only', () => {
    const w = spawnPlan(0).weights;
    expect(w.chaser).toBeGreaterThan(0);
    expect(w.runner + w.brute + w.spitter).toBe(0);
  });

  it('introduces every enemy type before the first boss', () => {
    const w = spawnPlan(BOSS_TIMES[0]).weights;
    expect(w.runner).toBeGreaterThan(0);
    expect(w.brute).toBeGreaterThan(0);
    expect(w.spitter).toBeGreaterThan(0);
  });

  it('only ever gets harder', () => {
    let prev = spawnPlan(0);
    for (let t = 5; t <= WIN_TIME; t += 5) {
      const cur = spawnPlan(t);
      expect(cur.interval).toBeLessThanOrEqual(prev.interval);
      expect(cur.batch).toBeGreaterThanOrEqual(prev.batch);
      expect(cur.maxAlive).toBeGreaterThanOrEqual(prev.maxAlive);
      expect(enemyHpScale(t)).toBeGreaterThanOrEqual(enemyHpScale(t - 5));
      prev = cur;
    }
  });

  it('keeps the swarm within the performance budget', () => {
    for (let t = 0; t <= WIN_TIME * 2; t += 10) {
      expect(spawnPlan(t).maxAlive).toBeLessThanOrEqual(320);
      expect(spawnPlan(t).interval).toBeGreaterThanOrEqual(260);
    }
  });

  it('reports each boss exactly once as time passes', () => {
    const seen: number[] = [];
    for (let t = 0; t < WIN_TIME; t += 1 / 60) seen.push(...bossesDue(t, t + 1 / 60));
    expect(seen).toEqual([...BOSS_TIMES]);
  });

  it('formats times as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('playerStats', () => {
  it('has sane base stats', () => {
    const s = playerStats(startingLoadout().passives);
    expect(s).toMatchObject({ maxHp: 100, cooldownMult: 1, damageMult: 1, regen: 0 });
  });

  it('applies passives and clamps cooldown reduction', () => {
    const p = { ...startingLoadout().passives, maxHp: 2, haste: 20, might: 5 };
    const s = playerStats(p);
    expect(s.maxHp).toBe(140);
    expect(s.cooldownMult).toBe(0.4);
    expect(s.damageMult).toBeCloseTo(1.6);
  });

  it('every run length ends after its last boss, with all enemy types already in play', () => {
    for (const id of RUN_LENGTH_IDS) {
      const { seconds, bossTimes } = RUN_LENGTHS[id];
      expect(bossTimes.length).toBeGreaterThan(0);
      for (const bt of bossTimes) expect(bt).toBeLessThan(seconds);
      const w = spawnPlan(bossTimes[0]).weights;
      expect(w.runner * w.brute * w.spitter).toBeGreaterThan(0);
    }
    expect(RUN_LENGTHS.long.seconds).toBe(WIN_TIME);
    expect(RUN_LENGTHS.short.seconds).toBeLessThan(RUN_LENGTHS.long.seconds);
  });

  it('fires custom boss schedules exactly once each', () => {
    const times = RUN_LENGTHS.short.bossTimes;
    const seen: number[] = [];
    for (let t = 0; t < RUN_LENGTHS.short.seconds; t += 1 / 60) seen.push(...bossesDue(t, t + 1 / 60, times));
    expect(seen).toEqual([...times]);
    expect(isRunLength('short')).toBe(true);
    expect(isRunLength('medium')).toBe(false);
  });
});
