import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('produces floats in [0, 1)', () => {
    const r = new Rng(1);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() is inclusive on both ends', () => {
    const r = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('weighted() never picks zero-weight items and roughly respects weights', () => {
    const r = new Rng(123);
    const counts = { a: 0, b: 0, never: 0 };
    const weights = { a: 3, b: 1, never: 0 };
    const keys = Object.keys(weights) as (keyof typeof weights)[];
    for (let i = 0; i < 20_000; i++) counts[r.weighted(keys, (k) => weights[k])]++;
    expect(counts.never).toBe(0);
    expect(counts.a / counts.b).toBeGreaterThan(2.6);
    expect(counts.a / counts.b).toBeLessThan(3.4);
  });

  it('weighted() throws when nothing has positive weight', () => {
    expect(() => new Rng(1).weighted(['x'], () => 0)).toThrow();
  });
});
