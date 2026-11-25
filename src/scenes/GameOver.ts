import Phaser from 'phaser';
import { COLORS, FONT, SCENES } from '../config';
import { formatTime } from '../core/director';
import type { ScoreBreakdown } from '../core/score';
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
      .text(cx, scoreY + 32, data.newBest ? '★ NEW HIGH SCORE ★' : `High score (${data.mode}): ${fmt(data.bestScore)}`, {
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

    const y = height * 0.8;
    this.button(cx - 100, y, 'Play again', () => this.go(SCENES.game));
    this.button(cx + 100, y, 'Menu', () => this.go(SCENES.menu));
    this.add
      .text(cx, y + 44, 'Enter: play again  ·  Esc: menu', { fontFamily: FONT, fontSize: '13px', color: COLORS.textDim })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => this.go(SCENES.game));
    this.input.keyboard!.once('keydown-ESC', () => this.go(SCENES.menu));
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const b = this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: COLORS.text,
        backgroundColor: '#2a2440',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setBackgroundColor('#3a3352'));
    b.on('pointerout', () => b.setBackgroundColor('#2a2440'));
    b.on('pointerup', onClick);
  }

  private go(key: string): void {
    Sound.play('select');
    this.scene.start(key);
  }
}
