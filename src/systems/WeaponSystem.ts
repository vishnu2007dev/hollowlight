import Phaser from 'phaser';
import { circlesOverlap, direction } from '../core/combat';
import { WEAPONS, weaponLevel, type WeaponId } from '../data/weapons';
import type { Enemy } from '../entities/Enemy';
import { MAX_ENEMY_RADIUS, type World } from '../game/World';
import { Sound } from './Audio';

const BOLT_SPEED = 470;
const BOLT_RANGE = 540;
const BLADE_RADIUS = 12;
const EMBER_TICK_MS = 300;
const MAX_EMBERS = 48;

interface Ember {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  damage: number;
  sprite: Phaser.GameObjects.Image;
}

/** Runs every auto-firing weapon the player owns. */
export class WeaponSystem {
  private timers: Record<WeaponId, number> = { bolt: 300, orbit: 0, nova: 1500, trail: 0 };
  private blades: Phaser.GameObjects.Image[] = [];
  private bladeAngle = 0;
  /** enemy id → run time (ms) when this blade set may hit it again */
  private bladeHits = new Map<number, number>();
  private embers: Ember[] = [];
  private emberTick = 0;
  private scratch: Enemy[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  update(dt: number, w: World): void {
    const ms = dt * 1000;
    const lv = w.run.loadout.weapons;
    if (lv.bolt > 0) this.updateBolt(ms, w, lv.bolt);
    this.updateOrbit(dt, w, lv.orbit);
    if (lv.nova > 0) this.updateNova(ms, w, lv.nova);
    this.updateTrail(ms, w, lv.trail);
  }

  private dmg(w: World, base: number): number {
    return base * w.run.stats.damageMult;
  }

  private cd(w: World, base: number): number {
    return base * w.run.stats.cooldownMult;
  }

  private updateBolt(ms: number, w: World, level: number): void {
    this.timers.bolt -= ms;
    if (this.timers.bolt > 0) return;
    const L = weaponLevel('bolt', level);
    const { x, y } = w.player;
    const targets = w.hash.nearest(x, y, BOLT_RANGE, L.count, (e) => e.active);
    if (targets.length === 0) {
      this.timers.bolt = 0; // fire as soon as something is in range
      return;
    }
    for (let i = 0; i < L.count; i++) {
      const t = targets[i % targets.length];
      const d = direction(x, y, t.x, t.y);
      // Spread duplicate shots at the same target slightly.
      const spread = i >= targets.length ? (i % 2 === 0 ? 0.18 : -0.18) : 0;
      const a = Math.atan2(d.y, d.x) + spread;
      w.fire({
        texture: 'bolt',
        x,
        y,
        vx: Math.cos(a) * BOLT_SPEED,
        vy: Math.sin(a) * BOLT_SPEED,
        damage: this.dmg(w, L.damage),
        hostile: false,
        pierce: L.pierce,
        radius: 7,
        life: 1300,
      });
    }
    Sound.play('shoot');
    this.timers.bolt = this.cd(w, L.cooldown);
  }

  private updateOrbit(dt: number, w: World, level: number): void {
    if (level === 0) return;
    const L = weaponLevel('orbit', level);
    while (this.blades.length < L.count) {
      this.blades.push(
        this.scene.add.image(0, 0, 'blade').setDepth(16).setBlendMode(Phaser.BlendModes.ADD),
      );
    }
    this.bladeAngle += L.extra * dt;
    const { x, y } = w.player;
    for (let i = 0; i < this.blades.length; i++) {
      const a = this.bladeAngle + (i / this.blades.length) * Math.PI * 2;
      const bx = x + Math.cos(a) * L.radius;
      const by = y + Math.sin(a) * L.radius;
      this.blades[i].setPosition(bx, by).setRotation(a + Math.PI / 2);

      this.scratch.length = 0;
      for (const e of w.hash.queryRadius(bx, by, BLADE_RADIUS + MAX_ENEMY_RADIUS, this.scratch)) {
        if (!e.active || !circlesOverlap(bx, by, BLADE_RADIUS, e.x, e.y, e.radius)) continue;
        if ((this.bladeHits.get(e.id) ?? 0) > w.now) continue;
        this.bladeHits.set(e.id, w.now + L.cooldown);
        w.damageEnemy(e, this.dmg(w, L.damage), x, y, 130);
      }
    }
    // Forget enemies whose cooldown expired so the map can't grow forever.
    if (this.bladeHits.size > 500) {
      for (const [id, t] of this.bladeHits) if (t <= w.now) this.bladeHits.delete(id);
    }
  }

  private updateNova(ms: number, w: World, level: number): void {
    this.timers.nova -= ms;
    if (this.timers.nova > 0) return;
    const L = weaponLevel('nova', level);
    const { x, y } = w.player;
    w.effects.ring(x, y, L.radius, WEAPONS.nova.color);
    Sound.play('nova');
    this.scratch.length = 0;
    for (const e of w.hash.queryRadius(x, y, L.radius + MAX_ENEMY_RADIUS, this.scratch)) {
      if (e.active && circlesOverlap(x, y, L.radius, e.x, e.y, e.radius)) {
        w.damageEnemy(e, this.dmg(w, L.damage), x, y, 380);
      }
    }
    this.timers.nova = this.cd(w, L.cooldown);
  }

  private updateTrail(ms: number, w: World, level: number): void {
    if (level > 0) {
      const L = weaponLevel('trail', level);
      this.timers.trail -= ms;
      if (this.timers.trail <= 0) {
        this.dropEmber(w, L.radius, L.extra, this.dmg(w, L.damage));
        this.timers.trail = this.cd(w, L.cooldown);
      }
    }

    this.emberTick -= ms;
    const tick = this.emberTick <= 0;
    if (tick) this.emberTick = EMBER_TICK_MS;

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const em = this.embers[i];
      em.life -= ms;
      if (em.life <= 0) {
        em.sprite.destroy();
        this.embers.splice(i, 1);
        continue;
      }
      const k = em.life / em.maxLife;
      em.sprite.setAlpha(0.25 + 0.75 * k).setScale((em.radius / 16) * (0.8 + 0.4 * k));
      if (!tick) continue;
      this.scratch.length = 0;
      for (const e of w.hash.queryRadius(em.x, em.y, em.radius + MAX_ENEMY_RADIUS, this.scratch)) {
        if (e.active && circlesOverlap(em.x, em.y, em.radius, e.x, e.y, e.radius)) {
          w.damageEnemy(e, em.damage, em.x, em.y, 0);
        }
      }
    }
  }

  private dropEmber(w: World, radius: number, life: number, damage: number): void {
    if (this.embers.length >= MAX_EMBERS) {
      this.embers.shift()!.sprite.destroy();
    }
    const sprite = this.scene.add
      .image(w.player.x, w.player.y, 'ember')
      .setDepth(4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(radius / 16);
    this.embers.push({ x: w.player.x, y: w.player.y, life, maxLife: life, radius, damage, sprite });
  }
}
