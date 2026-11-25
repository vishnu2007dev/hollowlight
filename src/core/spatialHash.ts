export interface Point {
  x: number;
  y: number;
}

/**
 * Uniform-grid spatial hash for fast "who is near me?" queries.
 * Rebuilt every frame: clear() keeps bucket arrays around to avoid GC churn.
 */
export class SpatialHash<T extends Point> {
  private readonly cells = new Map<number, T[]>();
  private readonly inv: number;
  private count = 0;

  constructor(readonly cellSize: number) {
    if (cellSize <= 0) throw new RangeError('cellSize must be > 0');
    this.inv = 1 / cellSize;
  }

  get size(): number {
    return this.count;
  }

  private key(cx: number, cy: number): number {
    // Packs two signed 16-bit cell coords into one number (±32k cells is plenty).
    return ((cx + 32768) << 16) | ((cy + 32768) & 0xffff);
  }

  clear(): void {
    // Drop buckets entirely if the map grew huge (e.g. long runs across the world).
    if (this.cells.size > 4096) this.cells.clear();
    else for (const bucket of this.cells.values()) bucket.length = 0;
    this.count = 0;
  }

  insert(item: T): void {
    const k = this.key(Math.floor(item.x * this.inv), Math.floor(item.y * this.inv));
    let bucket = this.cells.get(k);
    if (!bucket) {
      bucket = [];
      this.cells.set(k, bucket);
    }
    bucket.push(item);
    this.count++;
  }

  /** Collects every item whose position is within `radius` of (x, y). */
  queryRadius(x: number, y: number, radius: number, out: T[] = []): T[] {
    const r2 = radius * radius;
    const minX = Math.floor((x - radius) * this.inv);
    const maxX = Math.floor((x + radius) * this.inv);
    const minY = Math.floor((y - radius) * this.inv);
    const maxY = Math.floor((y + radius) * this.inv);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const bucket = this.cells.get(this.key(cx, cy));
        if (!bucket) continue;
        for (const item of bucket) {
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) out.push(item);
        }
      }
    }
    return out;
  }

  /**
   * Returns up to `k` nearest items within `maxRadius`, closest first.
   * Optional `filter` excludes items (e.g. dead or already-targeted).
   */
  nearest(x: number, y: number, maxRadius: number, k = 1, filter?: (item: T) => boolean): T[] {
    const found = this.queryRadius(x, y, maxRadius).filter((i) => !filter || filter(i));
    found.sort((a, b) => dist2(a, x, y) - dist2(b, x, y));
    return found.slice(0, k);
  }
}

function dist2(p: Point, x: number, y: number): number {
  const dx = p.x - x;
  const dy = p.y - y;
  return dx * dx + dy * dy;
}
