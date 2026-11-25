import Phaser from 'phaser';
import './style.css';
import { COLORS } from './config';
import { BootScene } from './scenes/Boot';
import { GameScene } from './scenes/Game';
import { GameOverScene } from './scenes/GameOver';
import { HudScene } from './scenes/Hud';
import { LevelUpScene } from './scenes/LevelUp';
import { MenuScene } from './scenes/Menu';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  input: { activePointers: 3 },
  // Scene order = render order: HUD and LevelUp draw on top of the Game scene.
  scene: [BootScene, MenuScene, GameScene, HudScene, LevelUpScene, GameOverScene],
});

// Handy for debugging in the browser console.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
