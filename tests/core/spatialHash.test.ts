import { describe, expect, it } from 'vitest';
import { SpatialHash, type Point } from '../../src/core/spatialHash';
import { Rng } from '../../src/core/rng';

interface Item extends Point {
  id: number;
}

describe('SpatialHash', () => {
  it('finds items within a radius, including across cell boundaries and negative coords', () => {
    const h = new SpatialHash<Item>(32);
    const items: Item[] = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 31, y: 0 },
      { id: 3, x: 33, y: 0 },
      { id: 4, x: -20, y: -20 },
      { id: 5, x: 500, y: 500 },
    ];
    items.forEach((i) => h.insert(i));
    const ids = h.queryRadius(5, 0, 30).map((i) => i.id).sort();
    // item 4 is ~32px away, just outside the radius.
    expect(ids).toEqual([1, 2, 3]);
    expect(h.queryRadius(-20, -20, 1).map((i) => i.id)).toEqual([4]);
  });

  it('matches a brute-force search on random data', () => {
    const rng = new Rng(99);
    const h = new SpatialHash<Item>(64);
    const items: Item[] = Array.from({ length: 800 }, (_, id) => ({
      id,
      x: rng.range(-2000, 2000),
      y: rng.range(-2000, 2000),
    }));
    items.forEach((i) => h.insert(i));
    for (let q = 0; q < 50; q++) {
      const x = rng.range(-2000, 2000);
      const y = rng.range(-2000, 2000);
      const r = rng.range(10, 300);
      const expected = items.filter((i) => Math.hypot(i.x - x, i.y - y) <= r).map((i) => i.id).sort();
      const actual = h.queryRadius(x, y, r).map((i) => i.id).sort();
      expect(actual).toEqual(expected);
    }
  });

  it('nearest() returns closest first and honours the filter', () => {
    const h = new SpatialHash<Item>(50);
    [
      { id: 1, x: 100, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 50, y: 0 },
    ].forEach((i) => h.insert(i));
    expect(h.nearest(0, 0, 200, 2).map((i) => i.id)).toEqual([2, 3]);
    expect(h.nearest(0, 0, 200, 1, (i) => i.id !== 2).map((i) => i.id)).toEqual([3]);
    expect(h.nearest(0, 0, 5, 1)).toEqual([]);
  });

  it('clear() empties the index', () => {
    const h = new SpatialHash<Item>(32);
    h.insert({ id: 1, x: 0, y: 0 });
    h.clear();
    expect(h.size).toBe(0);
    expect(h.queryRadius(0, 0, 100)).toEqual([]);
  });
});
