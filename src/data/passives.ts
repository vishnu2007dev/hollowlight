export type PassiveId = 'speed' | 'maxHp' | 'magnet' | 'haste' | 'might' | 'regen';

export interface PassiveDef {
  id: PassiveId;
  name: string;
  /** Short, per-level effect text shown on the upgrade card. */
  perLevel: string;
}

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  speed: { id: 'speed', name: 'Swift Wick', perLevel: '+8% move speed' },
  maxHp: { id: 'maxHp', name: 'Thick Glass', perLevel: '+20 max HP' },
  magnet: { id: 'magnet', name: 'Lodestar', perLevel: '+30% pickup radius' },
  haste: { id: 'haste', name: 'Quickflame', perLevel: '-8% weapon cooldowns' },
  might: { id: 'might', name: 'Bright Oil', perLevel: '+12% damage' },
  regen: { id: 'regen', name: 'Rekindle', perLevel: '+0.5 HP per second' },
};

export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];
export const MAX_PASSIVE_LEVEL = 5;
