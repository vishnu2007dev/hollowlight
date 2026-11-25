/**
 * Generic object pool. Keeps hundreds of enemies, bolts and gems
 * from allocating (and garbage-collecting) every frame.
 */
export class Pool<T extends { active: boolean }> {
  readonly items: T[] = [];
  private free: T[] = [];

  constructor(private readonly create: () => T) {}

  acquire(): T {
    let item = this.free.pop();
    if (!item) {
      item = this.create();
      this.items.push(item);
    }
    item.active = true;
    return item;
  }

  release(item: T): void {
    if (!item.active) return;
    item.active = false;
    this.free.push(item);
  }

  /** Calls fn for every active item. Safe to release items during iteration. */
  forEachActive(fn: (item: T) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.active) fn(item);
    }
  }

  get activeCount(): number {
    return this.items.length - this.free.length;
  }
}
