import Phaser from 'phaser';
import { ENEMIES, type EnemyDef, type EnemyKind } from '../data/enemies';

let nextId = 1;

export class Enemy {
  active = false;
  id = 0;
  kind: EnemyKind = 'chaser';
  def: EnemyDef = ENEMIES.chaser;
  x = 0;
  y = 0;
  hp = 1;
  maxHp = 1;
  /** knockback velocity, decays every frame */
  kbX = 0;
  kbY = 0;
  /** ms remaining of the white hit flash */
  flash = 0;
  /** ms until next ranged attack (spitter / boss) */
  fireTimer = 0;
  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'chaser').setDepth(10).setVisible(false);
  }

  spawn(kind: EnemyKind, x: number, y: number, hpScale: number): this {
    this.id = nextId++;
    this.kind = kind;
    this.def = ENEMIES[kind];
    this.x = x;
    this.y = y;
    this.maxHp = this.hp = Math.round(this.def.hp * hpScale);
    this.kbX = this.kbY = 0;
    this.flash = 0;
    this.fireTimer = 1000 + Math.random() * 1500;
    this.sprite.setTexture(kind).setPosition(x, y).setVisible(true).clearTint().setAlpha(1).setScale(1);
    this.sprite.setDepth(kind === 'boss' ? 12 : 10);
    return this;
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  get radius(): number {
    return this.def.radius;
  }
}
