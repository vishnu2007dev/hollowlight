export type WeaponId = 'bolt' | 'orbit' | 'nova' | 'trail';

export interface WeaponLevel {
  damage: number;
  /** ms between activations (Bolt, Nova) or between ember drops (Trail). */
  cooldown: number;
  /** projectiles (Bolt) or blades (Orbit). */
  count: number;
  /** Orbit radius, Nova blast radius, Trail patch radius (px). */
  radius: number;
  /** Bolt: extra enemies a bolt passes through. */
  pierce: number;
  /** Orbit rad/s; Trail patch lifetime in ms. */
  extra: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  description: string;
  color: number;
  levels: readonly WeaponLevel[];
}

const L = (
  damage: number,
  cooldown: number,
  count: number,
  radius: number,
  pierce: number,
  extra: number,
): WeaponLevel => ({ damage, cooldown, count, radius, pierce, extra });

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  bolt: {
    id: 'bolt',
    name: 'Lantern Bolt',
    description: 'Fires bolts of light at the nearest shadows.',
    color: 0xffd479,
    levels: [
      L(10, 900, 1, 0, 0, 0),
      L(12, 800, 1, 0, 0, 0),
      L(14, 720, 2, 0, 1, 0),
      L(17, 640, 2, 0, 1, 0),
      L(21, 540, 3, 0, 2, 0),
    ],
  },
  orbit: {
    id: 'orbit',
    name: 'Orbit Blades',
    description: 'Blades of light circle you, cutting anything they touch.',
    color: 0x9fe8ff,
    levels: [
      L(7, 400, 2, 62, 0, 3.0),
      L(9, 400, 3, 66, 0, 3.2),
      L(11, 380, 3, 72, 0, 3.4),
      L(13, 360, 4, 78, 0, 3.7),
      L(16, 340, 5, 86, 0, 4.0),
    ],
  },
  nova: {
    id: 'nova',
    name: 'Flare Nova',
    description: 'Periodically bursts outward, damaging and pushing back nearby foes.',
    color: 0xffa25c,
    levels: [
      L(16, 2600, 1, 95, 0, 0),
      L(21, 2400, 1, 105, 0, 0),
      L(27, 2200, 1, 118, 0, 0),
      L(34, 2000, 1, 130, 0, 0),
      L(42, 1700, 1, 148, 0, 0),
    ],
  },
  trail: {
    id: 'trail',
    name: 'Ember Trail',
    description: 'Leaves smouldering embers behind you that burn shadows.',
    color: 0xff6a3d,
    levels: [
      L(4, 260, 1, 15, 0, 1300),
      L(5, 250, 1, 17, 0, 1500),
      L(6, 240, 1, 19, 0, 1700),
      L(8, 230, 1, 21, 0, 1900),
      L(10, 210, 1, 25, 0, 2300),
    ],
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const MAX_WEAPON_LEVEL = 5;

export function weaponLevel(id: WeaponId, level: number): WeaponLevel {
  const def = WEAPONS[id];
  return def.levels[Math.min(Math.max(level, 1), def.levels.length) - 1];
}
