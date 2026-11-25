import Phaser from 'phaser';
import { COLORS, FONT, SCENES } from '../config';
import { formatTime } from '../core/director';
import type { ScoreBreakdown } from '../core/score';
import { shareText } from '../core/share';
import { Sound } from '../systems/Audio';

export interface GameOverData {
  won: boolean;
  time: number;
  kills: number;
  level: number;
  newBest: boolean;
  score: ScoreBreakdown;
  wisps: number;
  bestChain: number;
  bestScore: number;
  mode: string;
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.gameOver);
  }

  create(data: GameOverData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.cameras.main.setBackgroundColor(COLORS.bg).fadeIn(400, 11, 10, 18);

    this.add
      .text(cx, height * 0.24, data.won ? 'DAWN BREAKS' : 'THE LIGHT GOES OUT', {
        fontFamily: FONT,
        fontSize: `${Math.min(52, width / 12)}px`,
        fontStyle: 'bold',
        color: data.won ? COLORS.lightHex : COLORS.danger,
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.24 + 50, data.won ? 'You held back the dark.' : 'The shadows close in…', {
        fontFamily: FONT,
        fontSize: '18px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    // Headline score, counting up.
    const scoreY = height * 0.24 + 100;
    const scoreText = this.add
      .text(cx, scoreY, '0', { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: COLORS.text, stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5);
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: data.score.total,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: () => scoreText.setText(fmt(counter.v)),
    });
    this.add
      .text(cx, scoreY + 38, data.newBest ? '★ NEW HIGH SCORE ★' : `High score (${data.mode}): ${fmt(data.bestScore)}`, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: data.newBest ? 'bold' : 'normal',
        color: data.newBest ? COLORS.lightHex : COLORS.textDim,
      })
      .setOrigin(0.5);

    // Where the points came from.
    const s = data.score;
    const rows: [string, string, string?][] = [
      ['Kills', fmt(s.kills)],
      [`Wisps ×${data.wisps}`, fmt(s.wisps), COLORS.wispHex],
      [`Survival ${formatTime(data.time)}`, fmt(s.survival)],
      ['Dawn bonus', s.dawn ? fmt(s.dawn) : '—', s.dawn ? COLORS.lightHex : undefined],
    ];
    if (s.multiplier !== 1) rows.push([`${data.mode} mode`, `×${s.multiplier}`]);
    const rowsY = scoreY + 66;
    rows.forEach(([label, value, color], i) => {
      const y = rowsY + i * 24;
      this.add.text(cx - 10, y, label, { fontFamily: FONT, fontSize: '15px', color: color ?? COLORS.textDim }).setOrigin(1, 0.5);
      this.add
        .text(cx + 10, y, value, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: color ?? COLORS.text })
        .setOrigin(0, 0.5);
    });
    this.add
      .text(cx, rowsY + rows.length * 24 + 6, `${data.mode}  ·  ${data.kills} kills  ·  level ${data.level}  ·  best combo ${data.bestChain}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: COLORS.textDim,
        align: 'center',
        wordWrap: { width: width - 30 },
      })
      .setOrigin(0.5, 0);

    // Buttons in one centred row; the font shrinks a little on narrow (phone) screens.
    const y = height * 0.8;
    const message = shareText({ score: data.score.total, won: data.won, time: data.time, mode: data.mode, newBest: data.newBest });
    const share = this.button('Share score', () => void this.share(share, message), true);
    const buttons = [share, this.button('Play again', () => this.go(SCENES.game)), this.button('Menu', () => this.go(SCENES.menu))];
    const gap = 12;
    const rowWidth = (): number => buttons.reduce((w, b) => w + b.width, 0) + gap * (buttons.length - 1);
    if (rowWidth() > width - 20) buttons.forEach((b) => b.setFontSize(16));
    let left = cx - rowWidth() / 2;
    for (const b of buttons) {
      b.setPosition(left + b.width / 2, y);
      left += b.width + gap;
    }
    // Keyboard shortcuts only mean something on devices with a keyboard.
    if (!(this.sys.game.device.input.touch && width < 600)) {
      this.add
        .text(cx, y + 44, 'Enter: play again  ·  S: share  ·  Esc: menu', { fontFamily: FONT, fontSize: '13px', color: COLORS.textDim })
        .setOrigin(0.5);
    }

    this.input.keyboard!.once('keydown-ENTER', () => this.go(SCENES.game));
    this.input.keyboard!.once('keydown-ESC', () => this.go(SCENES.menu));
    this.input.keyboard!.on('keydown-S', () => void this.share(share, message));
  }

  private button(label: string, onClick: () => void, primary = false): Phaser.GameObjects.Text {
    const bg = primary ? COLORS.lightHex : '#2a2440';
    const hover = primary ? '#ffd68a' : '#3a3352';
    const b = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: primary ? '#1a1526' : COLORS.text,
        backgroundColor: bg,
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setBackgroundColor(hover));
    b.on('pointerout', () => b.setBackgroundColor(bg));
    b.on('pointerup', onClick);
    return b;
  }

  /** Native share sheet where available (phones), otherwise copy to the clipboard. */
  private async share(button: Phaser.GameObjects.Text, text: string): Promise<void> {
    Sound.play('select');
    const label = 'Share score';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Hollowlight', text });
        return;
      } catch (err) {
        // Closing the share sheet isn't an error; anything else falls back to the clipboard.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      button.setText('Copied! ✓');
    } catch {
      // Clipboard blocked (old browser, embedded frame): show the text so it can be copied by hand.
      window.prompt('Copy your score to share it:', text);
      return;
    }
    this.time.delayedCall(2000, () => button.active && button.setText(label));
  }

  private go(key: string): void {
    Sound.play('select');
    this.scene.start(key);
  }
}
