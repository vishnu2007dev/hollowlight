export const COLORS = {
  bg: 0x0b0a12,
  ground: 0x13111d,
  groundDot: 0x221e33,
  light: 0xffc35c,
  lightHex: '#ffc35c',
  text: '#f4ead7',
  textDim: '#9a90b0',
  danger: '#ff5c6c',
  xp: 0x6fe3ff,
  wisp: 0xff6ad5,
  wispHex: '#ff6ad5',
  hp: 0xff5c6c,
  panel: 0x1a1726,
  panelEdge: 0x3a3352,
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export const SCENES = {
  boot: 'Boot',
  menu: 'Menu',
  game: 'Game',
  hud: 'Hud',
  levelUp: 'LevelUp',
  gameOver: 'GameOver',
} as const;

/** Reference size the camera zoom is computed against. */
export const DESIGN_SHORT_SIDE = 720;
