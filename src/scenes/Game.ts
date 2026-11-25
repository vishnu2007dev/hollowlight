import Phaser from 'phaser';
import { COLORS, DESIGN_SHORT_SIDE, SCENES } from '../config';
import { playerStats } from '../core/combat';
import { DIFFICULTIES } from '../core/difficulty';
import { bossesDue, RUN_LENGTHS } from '../core/director';
import { Rng } from '../core/rng';
import {
  breakCombo,
  finalScore,
  MAX_WISPS,
  scoreKill,
  scoreWisp,
  tickCombo,
  WISP_DROP_CHANCE,
  WISP_LIFETIME,
  WISP_SPAWN_MAX,
  WISP_SPAWN_MIN,
} from '../core/score';
import { SpatialHash } from '../core/spatialHash';
import { applyCard, type UpgradeCard } from '../core/upgrades';
import { addXp, xpToNext } from '../core/xp';
import type { Enemy } from '../entities/Enemy';
import { Gem } from '../entities/Gem';
import { INVULN_MS, Player, PLAYER_RADIUS } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { newRun, RUN_KEY, type RunState } from '../game/RunState';
import { MAX_ENEMY_RADIUS, type FireOptions, type World } from '../game/World';
import { Sound } from '../systems/Audio';
import { Effects } from '../systems/Effects';
import { EnemySystem } from '../systems/EnemySystem';
import { Pool } from '../systems/Pool';
import { Save } from '../systems/Save';
import { WeaponSystem } from '../systems/WeaponSystem';
import type { HudScene } from './Hud';

const MAX_GEMS = 320;
const GEM_COLLECT_DIST = 18;
const HEART_HEAL = 0.3;
/** wisps ignore the magnet until you're this close: you have to go and get them */
const WISP_PULL_DIST = 34;
const WISP_FIRST_SPAWN = 14;

const KILL_COLORS: Record<string, number> = {
  chaser: 0xb07cff,
  runner: 0x7dfcff,
  brute: 0xffa34d,
  spitter: 0xb6ff6b,
  boss: 0xff3355,
};

export class GameScene extends Phaser.Scene implements World {
  run!: RunState;
  player!: Player;
  hash!: SpatialHash<Enemy>;
  effects!: Effects;
  now = 0;

  private rng!: Rng;
  private enemies!: EnemySystem;
  private weapons!: WeaponSystem;
  private projectiles!: Pool<Projectile>;
  private gems!: Pool<Gem>;
  private ground!: Phaser.GameObjects.TileSprite;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private scratch: Enemy[] = [];
  private activeBoss: Enemy | null = null;
  private wispTimer = 0;
  private wispHinted = false;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    const save = Save.load();
    this.run = newRun(save.difficulty, save.runLength);
    this.registry.set(RUN_KEY, this.run);
    this.now = 0;
    this.activeBoss = null;
    this.wispTimer = WISP_FIRST_SPAWN;
    this.wispHinted = false;
    this.rng = new Rng();
    this.hash = new SpatialHash<Enemy>(64);
    this.effects = new Effects(this);
    this.effects.shakeEnabled = save.shake;

    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.ground = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, 'ground')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);

    this.player = new Player(this);
    this.enemies = new EnemySystem(this, this.rng);
    this.weapons = new WeaponSystem(this);
    this.projectiles = new Pool(() => new Projectile(this));
    this.gems = new Pool(() => new Gem(this));

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D,
    }) as typeof this.keys;

    this.events.on('card', this.onCardChosen, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      this.events.off('card', this.onCardChosen, this);
    });

    this.scene.launch(SCENES.hud);
  }

  override update(_time: number, delta: number): void {
    if (this.run.over) return;
    const dt = Math.min(delta, 50) / 1000;
    const prev = this.run.elapsed;
    this.run.elapsed += dt;
    this.now += dt * 1000;
    this.effects.beginFrame();

    bossesDue(prev, this.run.elapsed, this.run.bossTimes).forEach(() => this.spawnBoss());

    tickCombo(this.run.score, dt);
    this.spawnWisps(dt);
    this.updatePlayer(dt);
    this.enemies.update(dt, this);
    this.weapons.update(dt, this);
    this.updateProjectiles(dt);
    this.updateGems(dt);

    this.run.boss = this.activeBoss?.active
      ? { hp: this.activeBoss.hp, maxHp: this.activeBoss.maxHp }
      : null;

    // Scroll the floor with the camera to fake an infinite world.
    const cam = this.cameras.main;
    this.ground.setTilePosition(cam.worldView.x, cam.worldView.y);

    if (this.run.elapsed >= this.run.winTime) this.endRun(true);
  }

  // ---- World interface -------------------------------------------------------------------------

  damageEnemy(e: Enemy, amount: number, srcX: number, srcY: number, knock: number): void {
    if (!e.active) return;
    e.hp -= amount;
    e.flash = 70;
    e.sprite.setTintFill(0xffffff);
    if (knock > 0 && e.def.knockback > 0) {
      const dx = e.x - srcX;
      const dy = e.y - srcY;
      const len = Math.hypot(dx, dy) || 1;
      e.kbX += (dx / len) * knock * e.def.knockback;
      e.kbY += (dy / len) * knock * e.def.knockback;
    }
    this.effects.damageNumber(e.x, e.y - e.radius, amount);
    Sound.play('hit');
    if (e.hp <= 0) this.killEnemy(e);
  }

  fire(opts: FireOptions): Projectile {
    return this.projectiles.acquire().fire(opts);
  }

  hurtPlayer(amount: number): void {
    if (this.player.invuln > 0 || this.run.over) return;
    this.run.hp -= amount * DIFFICULTIES[this.run.difficulty].damageTaken;
    breakCombo(this.run.score);
    this.player.invuln = INVULN_MS;
    this.effects.shake(120, 0.006);
    this.effects.burst(this.player.x, this.player.y, 0xff5c6c, 8);
    this.cameras.main.flash(90, 120, 20, 30);
    Sound.play('hurt');
    if (this.run.hp <= 0) {
      this.run.hp = 0;
      this.endRun(false);
    }
  }

  // ---- internals -------------------------------------------------------------------------------

  private fitCamera(): void {
    const { width, height } = this.scale;
    const zoom = Phaser.Math.Clamp(Math.min(width, height) / DESIGN_SHORT_SIDE, 0.55, 1.3);
    this.cameras.main.setZoom(zoom);
    // The floor is screen-space, so size it to cover the zoomed-out view.
    this.ground.setSize(width / zoom + 4, height / zoom + 4);
    this.ground.setScale(1);
    this.ground.setPosition((width - width / zoom) / 2 - 2, (height - height / zoom) / 2 - 2);
  }

  private readInput(): { x: number; y: number } {
    const k = this.keys;
    let x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const hud = this.scene.get(SCENES.hud) as HudScene | undefined;
    const stick = hud?.joystick;
    if (x === 0 && y === 0 && stick) {
      x = stick.x;
      y = stick.y;
    }
    return { x, y };
  }

  private updatePlayer(dt: number): void {
    const input = this.readInput();
    this.player.move(input.x, input.y, this.run.stats.speed, dt);
    this.player.update(dt);
    if (this.run.stats.regen > 0) {
      this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + this.run.stats.regen * dt);
    }
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    this.projectiles.forEachActive((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt * 1000;
      b.sprite.setPosition(b.x, b.y);
      if (b.life <= 0) return this.releaseProjectile(b);

      if (b.hostile) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const r = b.radius + PLAYER_RADIUS;
        if (dx * dx + dy * dy <= r * r) {
          this.hurtPlayer(b.damage);
          this.releaseProjectile(b);
        }
        return;
      }

      this.scratch.length = 0;
      for (const e of this.hash.queryRadius(b.x, b.y, b.radius + MAX_ENEMY_RADIUS, this.scratch)) {
        if (!e.active || b.hit.has(e.id)) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const r = b.radius + e.radius;
        if (dx * dx + dy * dy > r * r) continue;
        b.hit.add(e.id);
        this.damageEnemy(e, b.damage, b.x - b.vx, b.y - b.vy, 60);
        if (b.pierce-- <= 0) {
          this.releaseProjectile(b);
          return;
        }
      }
    });
  }

  private releaseProjectile(b: Projectile): void {
    b.sprite.setVisible(false);
    this.projectiles.release(b);
  }

  private updateGems(dt: number): void {
    const p = this.player;
    const magnet = this.run.stats.magnet;
    this.gems.forEachActive((g) => {
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy);
      if (g.kind === 'wisp') {
        g.life -= dt;
        if (g.life <= 0) {
          this.effects.burst(g.x, g.y, COLORS.wisp, 8);
          g.sprite.setVisible(false);
          this.gems.release(g);
          return;
        }
        // Gentle pulse, then a quick blink in the last 3 seconds as a warning.
        const blink = g.life < 3 ? (Math.sin(g.life * 18) > 0 ? 1 : 0.25) : 1;
        g.sprite.setScale(1 + Math.sin(this.now / 160) * 0.12).setAlpha(blink);
      }
      if (!g.pulled && d < (g.kind === 'wisp' ? WISP_PULL_DIST : magnet)) g.pulled = true;
      if (g.pulled) {
        g.speed = Math.min(720, g.speed + 1400 * dt);
        const step = Math.min(d, g.speed * dt);
        if (d > 0) {
          g.x += (dx / d) * step;
          g.y += (dy / d) * step;
        }
        g.sprite.setPosition(g.x, g.y);
      }
      if (d < GEM_COLLECT_DIST) this.collect(g);
    });
  }

  private collect(g: Gem): void {
    g.sprite.setVisible(false);
    this.gems.release(g);
    if (g.kind === 'heart') {
      this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + this.run.stats.maxHp * HEART_HEAL);
      this.effects.burst(this.player.x, this.player.y, 0xff5c6c, 14);
      Sound.play('levelUp');
      return;
    }
    if (g.kind === 'wisp') {
      const pts = scoreWisp(this.run.score);
      this.effects.burst(this.player.x, this.player.y, COLORS.wisp, 18);
      this.effects.ring(this.player.x, this.player.y, 90, COLORS.wisp, 400);
      this.effects.floatText(this.player.x, this.player.y - 30, `+${pts}`, COLORS.wispHex, 22);
      Sound.play('wisp');
      return;
    }
    Sound.play('pickup');
    const res = addXp(this.run, g.value);
    this.run.level = res.level;
    this.run.xp = res.xp;
    this.run.xpNext = xpToNext(res.level);
    if (res.levelsGained > 0) {
      this.run.pendingLevelUps += res.levelsGained;
      this.openLevelUp();
    }
  }

  private dropGem(x: number, y: number, value: number): void {
    if (this.gems.activeCount >= MAX_GEMS) {
      // Too many on the floor: fold the XP into an existing gem instead of spawning more.
      const target = this.gems.items.find((g) => g.active && g.kind === 'gem');
      if (target) return target.addValue(value);
    }
    this.gems.acquire().drop('gem', x, y, value);
  }

  private killEnemy(e: Enemy): void {
    this.run.kills++;
    const pts = scoreKill(this.run.score, e.kind);
    this.effects.burst(e.x, e.y, KILL_COLORS[e.kind] ?? 0xffffff, e.kind === 'boss' ? 60 : 9);
    Sound.play('kill');
    this.dropGem(e.x, e.y, e.def.xp);
    if (e.kind !== 'boss' && this.rng.next() < WISP_DROP_CHANCE) this.dropWisp(e.x + 14, e.y - 14);
    if (e.kind === 'boss') {
      this.effects.floatText(e.x, e.y - 50, `+${pts}`, COLORS.lightHex, 28);
      this.dropWisp(e.x - 30, e.y);
      this.gems.acquire().drop('heart', e.x + 30, e.y, 0);
      this.effects.shake(400, 0.015);
      this.effects.ring(e.x, e.y, 260, 0xffc35c, 700);
      this.events.emit('banner', 'The great shadow fades', '#ffc35c');
      this.activeBoss = null;
    }
    this.enemies.kill(e);
  }

  /** Wisps appear every so often somewhere on screen, away from the player. */
  private spawnWisps(dt: number): void {
    this.wispTimer -= dt;
    if (this.wispTimer > 0) return;
    this.wispTimer = this.rng.range(WISP_SPAWN_MIN, WISP_SPAWN_MAX);
    const cam = this.cameras.main;
    const reach = Math.min(cam.width, cam.height) / cam.zoom / 2 - 40;
    const a = this.rng.range(0, Math.PI * 2);
    const d = this.rng.range(Math.max(120, reach * 0.55), Math.max(160, reach));
    this.dropWisp(this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d);
  }

  private dropWisp(x: number, y: number): void {
    let active = 0;
    this.gems.forEachActive((g) => {
      if (g.kind === 'wisp') active++;
    });
    if (active >= MAX_WISPS) return;
    const w = this.gems.acquire().drop('wisp', x, y, 0);
    w.life = WISP_LIFETIME;
    if (!this.wispHinted) {
      this.wispHinted = true;
      this.events.emit('banner', 'A wisp! Grab it before it fades', COLORS.wispHex);
    }
    this.effects.ring(x, y, 60, COLORS.wisp, 450);
  }

  private spawnBoss(): void {
    this.activeBoss = this.enemies.spawnBoss(this);
    Sound.play('boss');
    this.effects.shake(600, 0.008);
    this.events.emit('banner', 'A great shadow approaches…', '#ff5c6c');
  }

  private openLevelUp(): void {
    if (this.run.levelUpOpen || this.run.over || this.run.pendingLevelUps <= 0) return;
    this.run.levelUpOpen = true;
    Sound.play('levelUp');
    this.effects.ring(this.player.x, this.player.y, 140, 0x6fe3ff, 500);
    (this.scene.get(SCENES.hud) as HudScene | undefined)?.joystick?.reset();
    this.scene.pause();
    this.scene.launch(SCENES.levelUp);
  }

  private onCardChosen(card: UpgradeCard): void {
    const run = this.run;
    if (card.kind === 'heal') {
      run.hp = Math.min(run.stats.maxHp, run.hp + run.stats.maxHp * card.amount);
    } else {
      run.loadout = applyCard(run.loadout, card);
      const before = run.stats.maxHp;
      run.stats = playerStats(run.loadout.passives);
      // Max HP upgrades also heal by the amount gained.
      run.hp += Math.max(0, run.stats.maxHp - before);
    }
    run.pendingLevelUps--;
    if (run.pendingLevelUps > 0) {
      // Several levels banked at once: re-deal the cards (launch restarts a running scene).
      Sound.play('levelUp');
      this.scene.launch(SCENES.levelUp);
      return;
    }
    run.levelUpOpen = false;
    this.scene.stop(SCENES.levelUp);
    this.scene.resume();
  }

  private endRun(won: boolean): void {
    if (this.run.over) return;
    this.run.over = true;
    const run = this.run;
    const score = finalScore(run.score, { elapsed: run.elapsed, won, runLength: run.runLength, difficulty: run.difficulty });
    const { record, newBest } = Save.recordRun(run.difficulty, run.runLength, score.total, run.elapsed, run.kills, won);
    if (won) {
      Sound.play('win');
      this.enemies.pool.forEachActive((e) => {
        this.effects.burst(e.x, e.y, 0xffc35c, 6);
        this.enemies.kill(e);
      });
      this.effects.ring(this.player.x, this.player.y, 900, 0xffc35c, 1200);
      this.cameras.main.flash(500, 255, 220, 150);
    } else {
      Sound.play('lose');
      this.effects.burst(this.player.x, this.player.y, 0xffc35c, 50);
      this.player.sprite.setVisible(false);
      this.tweens.add({ targets: this.player.light, alpha: 0, scale: 2, duration: 1200 });
      this.effects.shake(300, 0.01);
    }
    this.time.delayedCall(1600, () => {
      this.scene.stop(SCENES.hud);
      this.scene.start(SCENES.gameOver, {
        won,
        time: this.run.elapsed,
        kills: this.run.kills,
        level: this.run.level,
        newBest,
        score,
        wisps: run.score.wisps,
        bestChain: run.score.bestChain,
        bestScore: record.bestScore,
        mode: `${DIFFICULTIES[this.run.difficulty].label} · ${RUN_LENGTHS[this.run.runLength].label}`,
      });
    });
  }
}
