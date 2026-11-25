import Phaser from 'phaser';
import { COLORS, FONT, SCENES } from '../config';
import { formatTime } from '../core/director';
import { COMBO_WINDOW, comboMultiplier } from '../core/score';
import { PASSIVE_IDS, PASSIVES } from '../data/passives';
import { WEAPON_IDS, WEAPONS } from '../data/weapons';
import { RUN_KEY, type RunState } from '../game/RunState';
import { Joystick } from '../systems/Joystick';

const PAD = 16;

/** Screen-space overlay: bars, timer, loadout, boss bar, banners, pause and the touch joystick. */
export class HudScene extends Phaser.Scene {
  joystick?: Joystick;
  private gfx!: Phaser.GameObjects.Graphics;
  private timer!: Phaser.GameObjects.Text;
  private level!: Phaser.GameObjects.Text;
  private kills!: Phaser.GameObjects.Text;
  private score!: Phaser.GameObjects.Text;
  private combo!: Phaser.GameObjects.Text;
  private shownScore = 0;
  private lastMult = 1;
  private loadout!: Phaser.GameObjects.Text;
  private fps!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private bossLabel!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private pauseShade!: Phaser.GameObjects.Rectangle;
  private showFps = false;

  constructor() {
    super(SCENES.hud);
  }

  private get run(): RunState {
    return this.registry.get(RUN_KEY) as RunState;
  }

  create(): void {
    const style = { fontFamily: FONT, color: COLORS.text, stroke: '#000', strokeThickness: 4 };
    this.gfx = this.add.graphics();
    this.timer = this.add.text(0, 0, '', { ...style, fontSize: '28px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.level = this.add.text(0, 0, '', { ...style, fontSize: '16px', fontStyle: 'bold' });
    this.kills = this.add.text(0, 0, '', { ...style, fontSize: '16px' }).setOrigin(1, 0);
    this.score = this.add.text(0, 0, '0', { ...style, fontSize: '20px', fontStyle: 'bold', color: COLORS.lightHex }).setOrigin(1, 0);
    this.combo = this.add.text(0, 0, '', { ...style, fontSize: '15px', fontStyle: 'bold', color: COLORS.wispHex }).setOrigin(1, 0);
    this.shownScore = 0;
    this.lastMult = 1;
    this.loadout = this.add.text(0, 0, '', { ...style, fontSize: '13px', color: COLORS.textDim, lineSpacing: 2 });
    this.fps = this.add.text(0, 0, '', { ...style, fontSize: '12px', color: COLORS.textDim }).setOrigin(1, 1);
    this.bossLabel = this.add
      .text(0, 0, 'GREAT SHADOW', { ...style, fontSize: '13px', color: COLORS.danger, fontStyle: 'bold' })
      .setOrigin(0.5, 1);
    this.banner = this.add
      .text(0, 0, '', { ...style, fontSize: '30px', fontStyle: 'bold', strokeThickness: 6 })
      .setOrigin(0.5)
      .setAlpha(0);
    this.pauseShade = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.55).setOrigin(0).setVisible(false);
    this.pauseText = this.add
      .text(0, 0, 'PAUSED\n\nEsc / P to resume', {
        ...style,
        fontSize: '28px',
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.joystick = new Joystick(this);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', this.togglePause, this);
    kb.on('keydown-P', this.togglePause, this);
    kb.on('keydown-F', () => (this.showFps = !this.showFps));

    const game = this.scene.get(SCENES.game);
    const onBanner = (text: string, color: string): void => this.showBanner(text, color);
    game.events.on('banner', onBanner);
    // Auto-pause when the tab loses focus.
    const onBlur = (): void => {
      if (!this.run.userPaused) this.togglePause();
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      game.events.off('banner', onBanner);
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.joystick?.destroy();
      this.joystick = undefined;
    });

    this.showBanner('Survive until dawn', COLORS.lightHex);
  }

  override update(): void {
    const run = this.run;
    if (!run) return;
    const { width, height } = this.scale;
    const g = this.gfx;
    g.clear();

    // XP bar across the very top.
    g.fillStyle(0x000000, 0.5).fillRect(0, 0, width, 8);
    g.fillStyle(COLORS.xp, 1).fillRect(0, 0, width * Math.min(1, run.xp / run.xpNext), 8);

    // HP bar.
    const hpW = Math.min(220, width * 0.35);
    g.fillStyle(0x000000, 0.55).fillRoundedRect(PAD, PAD + 22, hpW, 14, 4);
    g.fillStyle(COLORS.hp, 1).fillRoundedRect(PAD + 2, PAD + 24, (hpW - 4) * Phaser.Math.Clamp(run.hp / run.stats.maxHp, 0, 1), 10, 3);

    // Boss bar.
    this.bossLabel.setVisible(!!run.boss);
    if (run.boss) {
      const bw = Math.min(480, width * 0.7);
      const bx = (width - bw) / 2;
      const by = height - 40;
      g.fillStyle(0x000000, 0.6).fillRoundedRect(bx, by, bw, 14, 4);
      g.fillStyle(0xff3355, 1).fillRoundedRect(bx + 2, by + 2, (bw - 4) * Math.max(0, run.boss.hp / run.boss.maxHp), 10, 3);
      this.bossLabel.setPosition(width / 2, by - 4);
    }

    // Timer counts toward dawn; it turns gold in the last minute.
    this.timer.setText(formatTime(run.elapsed));
    this.timer.setColor(run.winTime - run.elapsed <= 60 ? COLORS.lightHex : COLORS.text);
    this.level.setText(`LV ${run.level}   ${Math.ceil(run.hp)} / ${run.stats.maxHp}`);
    this.kills.setText(`☠ ${run.kills}`);

    // Score rolls up toward the real value; the combo shows its multiplier and a draining timer bar.
    const sc = run.score;
    this.shownScore += (sc.points - this.shownScore) * 0.2;
    if (sc.points - this.shownScore < 1) this.shownScore = sc.points;
    this.score.setText(Math.round(this.shownScore).toLocaleString('en-US'));
    const mult = comboMultiplier(sc.chain);
    this.combo.setVisible(sc.chain > 1);
    if (sc.chain > 1) {
      this.combo.setText(`×${mult.toFixed(1)}  combo ${sc.chain}`);
      const barW = 110;
      const bx = width - PAD - barW;
      const by = this.combo.y + this.combo.height + 1;
      g.fillStyle(0x000000, 0.5).fillRect(bx, by, barW, 4);
      g.fillStyle(COLORS.wisp, 1).fillRect(bx + barW * (1 - sc.comboTimer / COMBO_WINDOW), by, barW * (sc.comboTimer / COMBO_WINDOW), 4);
    }
    if (mult > this.lastMult) {
      this.tweens.killTweensOf(this.combo);
      this.combo.setScale(1.35);
      this.tweens.add({ targets: this.combo, scale: 1, duration: 250, ease: 'Back.easeOut' });
    }
    this.lastMult = mult;

    const lines: string[] = [];
    for (const id of WEAPON_IDS) if (run.loadout.weapons[id]) lines.push(`${WEAPONS[id].name}  ${run.loadout.weapons[id]}`);
    for (const id of PASSIVE_IDS) if (run.loadout.passives[id]) lines.push(`${PASSIVES[id].name}  ${run.loadout.passives[id]}`);
    this.loadout.setText(lines.join('\n'));

    this.fps.setVisible(this.showFps).setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }

  togglePause(): void {
    const run = this.run;
    if (!run || run.over || run.levelUpOpen) return;
    run.userPaused = !run.userPaused;
    if (run.userPaused) {
      this.scene.pause(SCENES.game);
      this.joystick?.reset();
    } else {
      this.scene.resume(SCENES.game);
    }
    this.pauseShade.setVisible(run.userPaused);
    this.pauseText.setVisible(run.userPaused);
  }

  private showBanner(text: string, color: string): void {
    this.banner.setText(text).setColor(color).setAlpha(0).setScale(0.9);
    this.tweens.killTweensOf(this.banner);
    this.tweens.chain({
      targets: this.banner,
      tweens: [
        { alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' },
        { alpha: 0, duration: 600, delay: 1800 },
      ],
    });
  }

  private layout(): void {
    const { width, height } = this.scale;
    // On narrow (phone) screens the timer drops below the HP bar so they don't collide.
    this.timer.setPosition(width / 2, width < 520 ? PAD + 40 : PAD);
    this.level.setPosition(PAD, PAD);
    this.kills.setPosition(width - PAD, PAD);
    this.score.setPosition(width - PAD, PAD + 20);
    this.combo.setPosition(width - PAD, PAD + 46);
    this.loadout.setPosition(PAD, PAD + 46);
    this.fps.setPosition(width - PAD, height - PAD);
    this.banner.setPosition(width / 2, height * 0.3);
    this.pauseShade.setSize(width, height);
    this.pauseText.setPosition(width / 2, height / 2);
  }
}
