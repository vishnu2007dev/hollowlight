import Phaser from 'phaser';

const MAX_DIST = 56;

/**
 * Floating virtual joystick: press anywhere, drag to move.
 * Works for touch and mouse; rendered in screen space.
 */
export class Joystick {
  x = 0;
  y = 0;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  constructor(private readonly scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, MAX_DIST, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.25);
    this.knob = scene.add.circle(0, 0, 22, 0xffc35c, 0.45);
    for (const o of [this.base, this.knob]) o.setScrollFactor(0).setDepth(100).setVisible(false);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    this.pointerId = p.id;
    this.originX = p.x;
    this.originY = p.y;
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.knob.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    let dx = p.x - this.originX;
    let dy = p.y - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > MAX_DIST) {
      dx = (dx / len) * MAX_DIST;
      dy = (dy / len) * MAX_DIST;
    }
    this.knob.setPosition(this.originX + dx, this.originY + dy);
    // Small dead zone so a tap doesn't nudge the player.
    const mag = Math.hypot(dx, dy) / MAX_DIST;
    this.x = mag < 0.12 ? 0 : dx / MAX_DIST;
    this.y = mag < 0.12 ? 0 : dy / MAX_DIST;
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.reset();
  }

  reset(): void {
    this.pointerId = null;
    this.x = this.y = 0;
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
  }
}
