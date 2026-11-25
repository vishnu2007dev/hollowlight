import Phaser from 'phaser';

export type PickupKind = 'gem' | 'heart' | 'wisp';

export class Gem {
  active = false;
  kind: PickupKind = 'gem';
  x = 0;
  y = 0;
  value = 1;
  /** true once the player's magnet has grabbed it; it then homes in */
  pulled = false;
  speed = 0;
  /** seconds left before it fades (wisps only) */
  life = Infinity;
  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'gem').setDepth(5).setVisible(false);
  }

  drop(kind: PickupKind, x: number, y: number, value: number): this {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.value = value;
    this.pulled = false;
    this.speed = 0;
    this.life = Infinity;
    this.sprite.setTexture(kind).setPosition(x, y).setVisible(true).setScale(kind === 'gem' ? gemScale(value) : 1)
      .setAlpha(1)
      .setBlendMode(kind === 'wisp' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    return this;
  }

  addValue(v: number): void {
    this.value += v;
    this.sprite.setScale(gemScale(this.value));
  }
}

function gemScale(value: number): number {
  return Math.min(2, 0.8 + Math.log2(value + 1) * 0.25);
}
