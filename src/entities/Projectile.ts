import Phaser from 'phaser';

/** Used for both the player's bolts and enemy shots (see `hostile`). */
export class Projectile {
  active = false;
  hostile = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius = 6;
  damage = 0;
  /** remaining enemies this bolt may pass through */
  pierce = 0;
  /** ms to live */
  life = 0;
  /** enemy ids already hit (so a piercing bolt doesn't hit the same one twice) */
  readonly hit = new Set<number>();
  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'bolt').setDepth(15).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
  }

  fire(opts: {
    texture: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    hostile: boolean;
    pierce?: number;
    radius?: number;
    life?: number;
  }): this {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.damage = opts.damage;
    this.hostile = opts.hostile;
    this.pierce = opts.pierce ?? 0;
    this.radius = opts.radius ?? 6;
    this.life = opts.life ?? 1600;
    this.hit.clear();
    this.sprite
      .setTexture(opts.texture)
      .setPosition(this.x, this.y)
      .setRotation(Math.atan2(this.vy, this.vx))
      .setVisible(true);
    return this;
  }
}
