/**
 * Small, fast, seedable PRNG (mulberry32).
 * Deterministic for a given seed, which keeps game logic unit-testable.
 */
export class Rng {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[Math.floor(this.next() * items.length)];
  }

  /** Picks an item with probability proportional to its weight. Zero/negative weights are never picked. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    let total = 0;
    for (const item of items) total += Math.max(0, weightOf(item));
    if (total <= 0) throw new Error('Rng.weighted: no positive weights');
    let roll = this.next() * total;
    for (const item of items) {
      const w = Math.max(0, weightOf(item));
      if (w === 0) continue;
      roll -= w;
      if (roll < 0) return item;
    }
    // Floating point fallback: return the last positively weighted item.
    for (let i = items.length - 1; i >= 0; i--) {
      if (weightOf(items[i]) > 0) return items[i];
    }
    throw new Error('unreachable');
  }
}
