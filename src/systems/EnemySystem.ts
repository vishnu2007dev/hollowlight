import Phaser from 'phaser';
import { circlesOverlap, direction } from '../core/combat';
import { applyDifficulty, DIFFICULTIES } from '../core/difficulty';
import { enemyHpScale, spawnPlan } from '../core/director';
import type { Rng } from '../core/rng';
import { BOSS, SPITTER, type EnemyKind } from '../data/enemies';
import { Enemy } from '../entities/Enemy';
import { PLAYER_RADIUS } from '../entities/Player';
import { MAX_ENEMY_RADIUS, type World } from '../game/World';
import { Pool } from './Pool';

const KB_DECAY = 9; // per second

/** Spawning (driven by the director), movement AI, separation, contact damage and enemy shots. */
export class EnemySystem {
  readonly pool: Pool<Enemy>;
  private spawnTimer = 600;
  private frame = 0;
  private scratch: Enemy[] = [];

  constructor(scene: Phaser.Scene, private readonly rng: Rng) {
    this.pool = new Pool(() => new Enemy(scene));
  }

  get aliveCount(): number {
    return this.pool.activeCount;
  }

  update(dt: number, w: World): void {
    this.frame++;
    this.spawn(dt, w);
    const view = this.spawnRadius(w);

    this.pool.forEachActive((e) => {
      this.think(e, dt, w);
      // Enemies left far behind get recycled to a fresh spot near the player.
      const dx = e.x - w.player.x;
      const dy = e.y - w.player.y;
      if (e.kind !== 'boss' && dx * dx + dy * dy > (view * 1.7) ** 2) {
        const p = this.ringPoint(w, view);
        e.x = p.x;
        e.y = p.y;
      }
    });

    // Rebuild the spatial index, then use it for separation and contact checks.
    w.hash.clear();
    this.pool.forEachActive((e) => w.hash.insert(e));
    this.separate(w);
    this.contact(w);

    this.pool.forEachActive((e) => {
      e.sprite.setPosition(e.x, e.y);
      if (e.flash > 0) {
        e.flash -= dt * 1000;
        if (e.flash <= 0) e.sprite.clearTint();
      }
      // Face the player.
      e.sprite.setFlipX(e.x > w.player.x);
    });
  }

  spawnAt(kind: EnemyKind, x: number, y: number, w: World): Enemy {
    const t = w.run.elapsed;
    const scale = (kind === 'boss' ? 1 + t / 600 : enemyHpScale(t)) * DIFFICULTIES[w.run.difficulty].enemyHp;
    return this.pool.acquire().spawn(kind, x, y, scale);
  }

  spawnBoss(w: World): Enemy {
    const p = this.ringPoint(w, this.spawnRadius(w) * 0.85);
    return this.spawnAt('boss', p.x, p.y, w);
  }

  kill(e: Enemy): void {
    e.hide();
    this.pool.release(e);
  }

  private spawn(dt: number, w: World): void {
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer > 0) return;
    const plan = applyDifficulty(spawnPlan(w.run.elapsed), w.run.difficulty);
    this.spawnTimer = plan.interval;
    const kinds = Object.keys(plan.weights) as (keyof typeof plan.weights)[];
    const radius = this.spawnRadius(w);
    // Waves arrive from one side, so the swarm has a direction you can read.
    const baseAngle = this.rng.range(0, Math.PI * 2);
    for (let i = 0; i < plan.batch && this.aliveCount < plan.maxAlive; i++) {
      const kind = this.rng.weighted(kinds, (k) => plan.weights[k]);
      const a = baseAngle + this.rng.range(-0.6, 0.6);
      this.spawnAt(kind, w.player.x + Math.cos(a) * radius, w.player.y + Math.sin(a) * radius, w);
    }
  }

  private think(e: Enemy, dt: number, w: World): void {
    const p = w.player;
    const d = direction(e.x, e.y, p.x, p.y);
    let mx = d.x;
    let my = d.y;

    if (e.kind === 'spitter') {
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      if (dist < SPITTER.preferredMin) {
        mx = -d.x;
        my = -d.y;
      } else if (dist < SPITTER.preferredMax) {
        // Strafe around the player.
        mx = -d.y * 0.6;
        my = d.x * 0.6;
      }
      e.fireTimer -= dt * 1000;
      if (e.fireTimer <= 0 && dist < SPITTER.preferredMax + 120) {
        e.fireTimer = SPITTER.fireEvery;
        w.fire({
          texture: 'spit',
          x: e.x,
          y: e.y,
          vx: d.x * SPITTER.shotSpeed,
          vy: d.y * SPITTER.shotSpeed,
          damage: SPITTER.shotDamage,
          hostile: true,
          radius: 6,
          life: 3000,
        });
      }
    } else if (e.kind === 'boss') {
      e.fireTimer -= dt * 1000;
      if (e.fireTimer <= 0) {
        const enraged = e.hp < e.maxHp / 2;
        e.fireTimer = BOSS.burstEvery * (enraged ? 0.7 : 1);
        const n = enraged ? BOSS.enragedBurstCount : BOSS.burstCount;
        const offset = this.rng.range(0, Math.PI * 2);
        for (let i = 0; i < n; i++) {
          const a = offset + (i / n) * Math.PI * 2;
          w.fire({
            texture: 'bossShot',
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * BOSS.shotSpeed,
            vy: Math.sin(a) * BOSS.shotSpeed,
            damage: BOSS.shotDamage,
            hostile: true,
            radius: 7,
            life: 4000,
          });
        }
        w.effects.ring(e.x, e.y, 90, 0xff3355, 300);
      }
    }

    e.x += (mx * e.def.speed + e.kbX) * dt;
    e.y += (my * e.def.speed + e.kbY) * dt;
    const decay = Math.max(0, 1 - KB_DECAY * dt);
    e.kbX *= decay;
    e.kbY *= decay;
  }

  /** Soft push-apart so the swarm spreads out instead of stacking into one blob. */
  private separate(w: World): void {
    const parity = this.frame & 1;
    this.pool.forEachActive((e) => {
      if (e.kind === 'boss' || (e.id & 1) !== parity) return;
      this.scratch.length = 0;
      for (const o of w.hash.queryRadius(e.x, e.y, e.radius + MAX_ENEMY_RADIUS, this.scratch)) {
        if (o === e) continue;
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const min = e.radius + o.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const push = (min - d) * (o.kind === 'boss' ? 1 : 0.5);
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      }
    });
  }

  private contact(w: World): void {
    const p = w.player;
    if (p.invuln > 0) return;
    this.scratch.length = 0;
    for (const e of w.hash.queryRadius(p.x, p.y, PLAYER_RADIUS + MAX_ENEMY_RADIUS, this.scratch)) {
      if (circlesOverlap(p.x, p.y, PLAYER_RADIUS, e.x, e.y, e.radius)) {
        w.hurtPlayer(e.def.damage);
        return;
      }
    }
  }

  private spawnRadius(w: World): number {
    // Derived from camera size/zoom (worldView isn't populated until the first render).
    const cam = w.cameras.main;
    return Math.hypot(cam.width / cam.zoom, cam.height / cam.zoom) / 2 + 40;
  }

  private ringPoint(w: World, radius: number): { x: number; y: number } {
    // Bias toward where the player is heading so recycled enemies stay relevant.
    const heading = Math.atan2(w.player.faceY, w.player.faceX);
    const a = heading + this.rng.range(-1.2, 1.2);
    return { x: w.player.x + Math.cos(a) * radius, y: w.player.y + Math.sin(a) * radius };
  }
}
