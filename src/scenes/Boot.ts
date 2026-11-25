import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';

/**
 * Generates every texture procedurally, so the repo ships zero image assets.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Soft radial glow used for lights, gems and particles.
    this.radial(g, 'glow', 64, 0xffffff);

    // Player: a bright lantern core with a halo ring.
    g.clear();
    g.fillStyle(0xffc35c, 0.25).fillCircle(24, 24, 22);
    g.fillStyle(0xffd88a, 0.6).fillCircle(24, 24, 15);
    g.fillStyle(0xfff4d6, 1).fillCircle(24, 24, 10);
    g.lineStyle(2, 0xffffff, 0.9).strokeCircle(24, 24, 12);
    g.generateTexture('player', 48, 48);

    // Shadow creatures: dark bodies with glowing eyes.
    this.creature(g, 'chaser', 28, 0x2b1f47, 0x5b3f8c, 0xff6b8b, 'blob');
    this.creature(g, 'runner', 22, 0x1f2a47, 0x3f6a8c, 0x7dfcff, 'spike');
    this.creature(g, 'brute', 46, 0x3a1730, 0x6e2a55, 0xffa34d, 'square');
    this.creature(g, 'spitter', 30, 0x173a2a, 0x2f7a52, 0xb6ff6b, 'diamond');
    this.creature(g, 'boss', 96, 0x2a0d1f, 0x7a1f4a, 0xff3355, 'boss');

    // Bolt: elongated light streak (points right; rotated at runtime).
    g.clear();
    g.fillStyle(0xffd479, 0.35).fillEllipse(14, 6, 28, 12);
    g.fillStyle(0xfff4d6, 1).fillEllipse(16, 6, 18, 6);
    g.generateTexture('bolt', 28, 12);

    // Orbit blade: crescent-ish sliver.
    g.clear();
    g.fillStyle(0x9fe8ff, 0.35).fillCircle(12, 12, 12);
    g.fillStyle(0xe6fbff, 1).fillTriangle(4, 12, 12, 2, 20, 12).fillTriangle(4, 12, 12, 22, 20, 12);
    g.generateTexture('blade', 24, 24);

    // XP gem.
    g.clear();
    g.fillStyle(COLORS.xp, 0.3).fillCircle(9, 9, 9);
    g.fillStyle(COLORS.xp, 1).fillTriangle(9, 2, 15, 9, 3, 9).fillTriangle(3, 9, 15, 9, 9, 16);
    g.fillStyle(0xffffff, 0.9).fillTriangle(9, 4, 12, 9, 6, 9);
    g.generateTexture('gem', 18, 18);

    // Wisp: rare pink score orb with a four-point sparkle.
    g.clear();
    g.fillStyle(COLORS.wisp, 0.25).fillCircle(14, 14, 14);
    g.fillStyle(COLORS.wisp, 0.55).fillCircle(14, 14, 9);
    g.fillStyle(0xffd6f3, 1).fillCircle(14, 14, 5);
    g.fillStyle(0xffffff, 1).fillTriangle(14, 3, 16, 14, 12, 14).fillTriangle(14, 25, 16, 14, 12, 14);
    g.fillTriangle(3, 14, 14, 12, 14, 16).fillTriangle(25, 14, 14, 12, 14, 16);
    g.generateTexture('wisp', 28, 28);

    // Enemy shot.
    g.clear();
    g.fillStyle(0xb6ff6b, 0.35).fillCircle(8, 8, 8);
    g.fillStyle(0xe8ffcc, 1).fillCircle(8, 8, 4);
    g.generateTexture('spit', 16, 16);

    g.clear();
    g.fillStyle(0xff3355, 0.35).fillCircle(9, 9, 9);
    g.fillStyle(0xffccd6, 1).fillCircle(9, 9, 4.5);
    g.generateTexture('bossShot', 18, 18);

    // Ember patch.
    this.radial(g, 'ember', 32, 0xff6a3d);

    // Nova ring.
    g.clear();
    g.lineStyle(6, 0xffffff, 1).strokeCircle(64, 64, 60);
    g.generateTexture('ring', 128, 128);

    // Particle spark.
    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
    g.generateTexture('spark', 4, 4);

    // Heart pickup (dropped by bosses).
    g.clear();
    g.fillStyle(0xff5c6c, 1).fillCircle(7, 8, 6).fillCircle(17, 8, 6).fillTriangle(1, 10, 23, 10, 12, 22);
    g.generateTexture('heart', 24, 24);

    // Ground tile: dark floor with a few faint dots and cracks.
    g.clear();
    g.fillStyle(COLORS.ground, 1).fillRect(0, 0, 128, 128);
    g.fillStyle(COLORS.groundDot, 1);
    const dots = [
      [12, 20], [70, 8], [100, 44], [38, 64], [90, 96], [20, 110], [60, 118], [118, 80],
    ];
    for (const [x, y] of dots) g.fillCircle(x, y, 1.5);
    g.lineStyle(1, COLORS.groundDot, 0.6).lineBetween(30, 30, 46, 40).lineBetween(80, 70, 96, 66);
    g.generateTexture('ground', 128, 128);

    g.destroy();
    this.scene.start(SCENES.menu);
  }

  private radial(g: Phaser.GameObjects.Graphics, key: string, size: number, color: number): void {
    g.clear();
    const r = size / 2;
    const steps = 16;
    for (let i = steps; i > 0; i--) {
      const t = i / steps;
      g.fillStyle(color, 0.08 + (1 - t) * 0.12).fillCircle(r, r, r * t);
    }
    g.generateTexture(key, size, size);
  }

  private creature(
    g: Phaser.GameObjects.Graphics,
    key: string,
    size: number,
    body: number,
    rim: number,
    eye: number,
    shape: 'blob' | 'spike' | 'square' | 'diamond' | 'boss',
  ): void {
    g.clear();
    const c = size / 2;
    const r = size / 2 - 2;
    g.fillStyle(rim, 1);
    switch (shape) {
      case 'blob':
        g.fillCircle(c, c, r);
        g.fillStyle(body, 1).fillCircle(c, c + 1, r - 3);
        break;
      case 'spike':
        g.fillTriangle(c, 1, size - 1, size - 2, 1, size - 2);
        g.fillStyle(body, 1).fillTriangle(c, 5, size - 5, size - 4, 5, size - 4);
        break;
      case 'square':
        g.fillRoundedRect(2, 2, size - 4, size - 4, 8);
        g.fillStyle(body, 1).fillRoundedRect(5, 5, size - 10, size - 10, 6);
        break;
      case 'diamond':
        g.fillTriangle(c, 1, size - 1, c, c, size - 1).fillTriangle(c, 1, 1, c, c, size - 1);
        g.fillStyle(body, 1).fillTriangle(c, 5, size - 5, c, c, size - 5).fillTriangle(c, 5, 5, c, c, size - 5);
        break;
      case 'boss': {
        const spikes = 10;
        for (let i = 0; i < spikes; i++) {
          const a = (i / spikes) * Math.PI * 2;
          const a1 = a - 0.18;
          const a2 = a + 0.18;
          g.fillTriangle(
            c + Math.cos(a) * r, c + Math.sin(a) * r,
            c + Math.cos(a1) * r * 0.7, c + Math.sin(a1) * r * 0.7,
            c + Math.cos(a2) * r * 0.7, c + Math.sin(a2) * r * 0.7,
          );
        }
        g.fillCircle(c, c, r * 0.75);
        g.fillStyle(body, 1).fillCircle(c, c, r * 0.68);
        break;
      }
    }
    // Eyes.
    const eyeR = Math.max(2, size * 0.09);
    const ex = size * 0.17;
    const ey = shape === 'spike' ? c + size * 0.12 : c - size * 0.04;
    g.fillStyle(eye, 0.35).fillCircle(c - ex, ey, eyeR * 2).fillCircle(c + ex, ey, eyeR * 2);
    g.fillStyle(eye, 1).fillCircle(c - ex, ey, eyeR).fillCircle(c + ex, ey, eyeR);
    g.generateTexture(key, size, size);
  }
}
