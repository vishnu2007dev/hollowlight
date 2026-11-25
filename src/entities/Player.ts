import Phaser from 'phaser';
import { COLORS } from '../config';

export const PLAYER_RADIUS = 13;
/** ms of invulnerability after taking a hit */
export const INVULN_MS = 550;

export class Player {
  x = 0;
  y = 0;
  /** last non-zero movement direction, used for aiming fallbacks */
  faceX = 1;
  faceY = 0;
  invuln = 0;
  readonly sprite: Phaser.GameObjects.Image;
  readonly light: Phaser.GameObjects.Image;
  private bob = 0;

  constructor(scene: Phaser.Scene) {
    // A big additive glow: the player's lantern lighting up the dark floor.
    this.light = scene.add
      .image(0, 0, 'glow')
      .setTint(COLORS.light)
      .setScale(9)
      .setAlpha(0.35)
      .setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.sprite = scene.add.image(0, 0, 'player').setDepth(20);
  }

  move(dx: number, dy: number, speed: number, dt: number): void {
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const m = Math.min(1, len); // joystick can be partial
      this.x += (dx / len) * m * speed * dt;
      this.y += (dy / len) * m * speed * dt;
      this.faceX = dx / len;
      this.faceY = dy / len;
    }
  }

  update(dt: number): void {
    this.bob += dt * 6;
    if (this.invuln > 0) this.invuln -= dt * 1000;
    const flicker = this.invuln > 0 ? (Math.floor(this.invuln / 70) % 2 === 0 ? 0.35 : 1) : 1;
    this.sprite.setPosition(this.x, this.y).setAlpha(flicker).setScale(1 + Math.sin(this.bob) * 0.04);
    this.light.setPosition(this.x, this.y).setAlpha(0.32 + Math.sin(this.bob * 0.7) * 0.03);
  }
}
