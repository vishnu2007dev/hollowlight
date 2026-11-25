import Phaser from 'phaser';
import { FONT } from '../config';

const MAX_NUMBERS = 48;
const MAX_NUMBERS_PER_FRAME = 6;

/** Particles, floating damage numbers and screen shake. */
export class Effects {
  private emitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();
  private numbers: Phaser.GameObjects.Text[] = [];
  private numbersThisFrame = 0;
  shakeEnabled = true;

  constructor(private readonly scene: Phaser.Scene) {}

  beginFrame(): void {
    this.numbersThisFrame = 0;
  }

  burst(x: number, y: number, color: number, count = 10): void {
    this.emitter(color).explode(count, x, y);
  }

  damageNumber(x: number, y: number, amount: number, color = '#ffffff'): void {
    if (this.numbersThisFrame >= MAX_NUMBERS_PER_FRAME) return;
    this.numbersThisFrame++;
    let text = this.numbers.find((t) => !t.visible);
    if (!text) {
      if (this.numbers.length >= MAX_NUMBERS) return;
      text = this.scene.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(50);
      this.numbers.push(text);
    }
    const t = text;
    t.setText(String(Math.round(amount)))
      .setColor(color)
      .setPosition(x + Phaser.Math.Between(-6, 6), y - 10)
      .setAlpha(1)
      .setScale(1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: t,
      y: t.y - 26,
      alpha: 0,
      scale: 0.8,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => t.setVisible(false),
    });
  }

  /** Bigger floating label for score events; not subject to the per-frame damage-number cap. */
  floatText(x: number, y: number, label: string, color: string, size = 20): void {
    const t = this.scene.add
      .text(x, y, label, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(55);
    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  shake(duration: number, intensity: number): void {
    if (this.shakeEnabled) this.scene.cameras.main.shake(duration, intensity);
  }

  /** Expanding additive ring (Nova, boss arrival, level-up). */
  ring(x: number, y: number, radius: number, color: number, duration = 380): void {
    const ring = this.scene.add
      .image(x, y, 'ring')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(18)
      .setScale(0.1)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / 60,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private emitter(color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    let e = this.emitters.get(color);
    if (!e) {
      e = this.scene.add.particles(0, 0, 'spark', {
        speed: { min: 60, max: 220 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 250, max: 550 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      e.setDepth(30);
      this.emitters.set(color, e);
    }
    return e;
  }
}
