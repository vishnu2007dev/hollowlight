import Phaser from 'phaser';
import { COLORS, FONT, SCENES } from '../config';
import { DIFFICULTIES, DIFFICULTY_IDS, type Difficulty } from '../core/difficulty';
import { formatTime, RUN_LENGTH_IDS, RUN_LENGTHS, type RunLength } from '../core/director';
import { Sound } from '../systems/Audio';
import { Save } from '../systems/Save';

export class MenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    this.started = false;
    const { width, height } = this.scale;
    const save = Save.load();
    Sound.enabled = save.sound;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // Drifting embers in the background.
    this.add.particles(0, 0, 'glow', {
      x: { min: 0, max: width },
      y: height + 20,
      speedY: { min: -60, max: -25 },
      speedX: { min: -10, max: 10 },
      lifespan: 9000,
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xffc35c, 0xff8a4c, 0xffe0a0],
      frequency: 140,
      blendMode: Phaser.BlendModes.ADD,
    });

    const cx = width / 2;
    const glow = this.add.image(cx, height * 0.3, 'glow').setScale(6).setTint(COLORS.light).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.45, scale: 6.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(cx, height * 0.3, 'player').setScale(1.6);

    this.add
      .text(cx, height * 0.3 + 70, 'HOLLOWLIGHT', {
        fontFamily: FONT,
        fontSize: `${Math.min(64, width / 9)}px`,
        fontStyle: 'bold',
        color: COLORS.lightHex,
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.3 + 118, 'Hold back the dark until dawn.', { fontFamily: FONT, fontSize: '17px', color: COLORS.textDim })
      .setOrigin(0.5);

    const start = this.add
      .text(cx, height * 0.62, '▶  PLAY', {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: COLORS.text,
        backgroundColor: '#2a2440',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: start, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    start.on('pointerup', () => this.startGame());

    this.add
      .text(cx, height * 0.62 + 58, "WASD / Arrows or drag to move  ·  weapons fire automatically  ·  Esc to pause\nChain kills for a combo  ·  grab pink wisps for big points  ·  don't get hit", {
        fontFamily: FONT,
        fontSize: '14px',
        color: COLORS.textDim,
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5, 0);

    const records = this.add
      .text(cx, height * 0.62 + 112, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.lightHex, align: 'center', wordWrap: { width: width - 40 } })
      .setOrigin(0.5, 0);
    let mode: Difficulty = save.difficulty;
    let length: RunLength = save.runLength;
    const showRecords = (): void => {
      const r = Save.load().records[mode][length];
      const name = `${DIFFICULTIES[mode].label} · ${RUN_LENGTHS[length].label}`;
      records.setText(
        r.runs > 0
          ? `${name} high score: ${r.bestScore.toLocaleString('en-US')}  ·  Best time: ${formatTime(r.bestTime)}  ·  Dawns: ${r.wins}`
          : '',
      );
    };

    // Difficulty and run length pickers: one row on wide screens, stacked on phones.
    const playY = height * 0.62;
    const stacked = width < 440;
    const modePicker = this.makePicker(
      DIFFICULTY_IDS.map((id) => ({ id, label: DIFFICULTIES[id].label })),
      mode,
      (next) => {
        mode = next;
        Save.update({ difficulty: next });
        showRecords();
      },
    );
    const lengthPicker = this.makePicker(
      RUN_LENGTH_IDS.map((id) => ({ id, label: RUN_LENGTHS[id].label })),
      length,
      (next) => {
        length = next;
        Save.update({ runLength: next });
        showRecords();
      },
    );
    if (stacked) {
      modePicker.place(cx, playY - 104);
      lengthPicker.place(cx, playY - 64);
    } else {
      const groupGap = 28;
      const total = modePicker.width + groupGap + lengthPicker.width;
      modePicker.place(cx - total / 2 + modePicker.width / 2, playY - 66);
      lengthPicker.place(cx + total / 2 - lengthPicker.width / 2, playY - 66);
    }
    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => modePicker.step(-1));
    kb.on('keydown-RIGHT', () => modePicker.step(1));
    kb.on('keydown-UP', () => lengthPicker.step(-1));
    kb.on('keydown-DOWN', () => lengthPicker.step(1));
    showRecords();

    this.makeToggle(width - 16, height - 16, 'Sound', save.sound, (on) => {
      Sound.enabled = on;
      Save.update({ sound: on });
    });
    this.makeToggle(width - 16, height - 44, 'Screen shake', save.shake, (on) => Save.update({ shake: on }));

    this.add
      .text(16, height - 16, 'Open source · MIT', { fontFamily: FONT, fontSize: '12px', color: COLORS.textDim })
      .setOrigin(0, 1);

    this.input.keyboard!.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard!.once('keydown-SPACE', () => this.startGame());
  }

  private makeToggle(x: number, y: number, label: string, initial: boolean, onChange: (on: boolean) => void): void {
    let on = initial;
    const text = this.add
      .text(x, y, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.textDim })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true });
    const render = (): void => {
      text.setText(`${label}: ${on ? 'ON' : 'OFF'}`);
    };
    render();
    text.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      on = !on;
      render();
      onChange(on);
    });
  }

  /** A segmented selector. Returns its width plus helpers to position it and step through options. */
  private makePicker<T extends string>(
    options: { id: T; label: string }[],
    initial: T,
    onChange: (id: T) => void,
  ): { width: number; place: (x: number, y: number) => void; step: (dir: number) => void } {
    let current = initial;
    const gap = 8;
    const buttons = options.map((o) =>
      this.add
        .text(0, 0, o.label, { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', padding: { x: 16, y: 7 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true }),
    );
    const width = buttons.reduce((sum, b) => sum + b.width, 0) + gap * (buttons.length - 1);
    const render = (): void => {
      buttons.forEach((b, i) => {
        const on = options[i].id === current;
        b.setColor(on ? '#1a1526' : COLORS.textDim).setBackgroundColor(on ? COLORS.lightHex : '#211c33');
      });
    };
    const select = (next: T): void => {
      if (next === current) return;
      current = next;
      render();
      Sound.unlock();
      Sound.play('select');
      onChange(next);
    };
    buttons.forEach((b, i) =>
      b.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        select(options[i].id);
      }),
    );
    render();
    return {
      width,
      place: (x, y) => {
        let left = x - width / 2;
        for (const b of buttons) {
          b.setPosition(left + b.width / 2, y);
          left += b.width + gap;
        }
      },
      step: (dir) => {
        const i = options.findIndex((o) => o.id === current) + dir;
        if (i >= 0 && i < options.length) select(options[i].id);
      },
    };
  }

  private startGame(): void {
    if (this.started) return;
    this.started = true;
    Sound.unlock();
    Sound.play('select');
    this.cameras.main.fadeOut(250, 11, 10, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.game));
  }
}
