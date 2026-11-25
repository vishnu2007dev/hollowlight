import Phaser from 'phaser';
import { COLORS, FONT, SCENES } from '../config';
import { Rng } from '../core/rng';
import { describeCard, drawCards, type UpgradeCard } from '../core/upgrades';
import { WEAPONS } from '../data/weapons';
import { RUN_KEY, type RunState } from '../game/RunState';
import { Sound } from '../systems/Audio';

const rng = new Rng();

/** Pauses the run and offers three upgrade cards (click, tap, or press 1/2/3). */
export class LevelUpScene extends Phaser.Scene {
  private chosen = false;

  constructor() {
    super(SCENES.levelUp);
  }

  create(): void {
    this.chosen = false;
    const run = this.registry.get(RUN_KEY) as RunState;
    const cards = drawCards(run.loadout, rng, 3);
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.72).setOrigin(0);
    this.add
      .text(width / 2, height * 0.16, `LEVEL ${run.level}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: COLORS.lightHex,
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.16 + 38, 'Choose a blessing', { fontFamily: FONT, fontSize: '16px', color: COLORS.textDim })
      .setOrigin(0.5);

    // Lay cards out in a row, or a column on narrow (portrait) screens.
    const vertical = width < 640;
    const cw = vertical ? Math.min(340, width - 40) : Math.min(230, (width - 80) / 3);
    const ch = vertical ? 96 : 220;
    const gap = 16;
    const total = cards.length * (vertical ? ch : cw) + (cards.length - 1) * gap;

    cards.forEach((card, i) => {
      const x = vertical ? width / 2 : width / 2 - total / 2 + cw / 2 + i * (cw + gap);
      const y = vertical ? height * 0.3 + ch / 2 + i * (ch + gap) : height * 0.55;
      this.makeCard(card, i, x, y, cw, ch, vertical);
    });

    const keys = ['ONE', 'TWO', 'THREE'];
    cards.forEach((card, i) => this.input.keyboard!.once(`keydown-${keys[i]}`, () => this.choose(card)));
  }

  private makeCard(card: UpgradeCard, index: number, x: number, y: number, w: number, h: number, compact: boolean): void {
    const info = describeCard(card);
    const accent = card.kind === 'weapon' ? WEAPONS[card.id].color : card.kind === 'heal' ? 0xff5c6c : 0x6fe3ff;

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, COLORS.panel, 0.96).setStrokeStyle(2, COLORS.panelEdge);
    const bar = this.add.rectangle(0, -h / 2 + 3, w, 6, accent);
    const tag = this.add
      .text(-w / 2 + 14, -h / 2 + 16, info.tag, { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#' + accent.toString(16).padStart(6, '0') })
      .setOrigin(0, 0);
    const key = this.add
      .text(w / 2 - 14, -h / 2 + 14, String(index + 1), { fontFamily: FONT, fontSize: '13px', color: COLORS.textDim })
      .setOrigin(1, 0);
    const title = this.add
      .text(-w / 2 + 14, -h / 2 + (compact ? 32 : 40), info.title, {
        fontFamily: FONT,
        fontSize: compact ? '18px' : '20px',
        fontStyle: 'bold',
        color: COLORS.text,
        wordWrap: { width: w - 28 },
      })
      .setOrigin(0, 0);
    const body = this.add
      .text(-w / 2 + 14, -h / 2 + (compact ? 58 : 76), info.body, {
        fontFamily: FONT,
        fontSize: '14px',
        color: COLORS.textDim,
        wordWrap: { width: w - 28 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    container.add([bg, bar, tag, key, title, body]);

    container.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 220, delay: index * 70, ease: 'Back.easeOut' });

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, accent);
      this.tweens.add({ targets: container, scale: 1.04, duration: 100 });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, COLORS.panelEdge);
      this.tweens.add({ targets: container, scale: 1, duration: 100 });
    });
    bg.on('pointerup', () => this.choose(card));
  }

  private choose(card: UpgradeCard): void {
    if (this.chosen) return;
    this.chosen = true;
    Sound.play('select');
    this.scene.get(SCENES.game).events.emit('card', card);
  }
}
