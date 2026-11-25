import { MAX_PASSIVE_LEVEL, PASSIVE_IDS, PASSIVES, type PassiveId } from '../data/passives';
import { MAX_WEAPON_LEVEL, WEAPON_IDS, WEAPONS, type WeaponId } from '../data/weapons';
import type { Rng } from './rng';

/** Levels owned. 0 = not owned. */
export interface Loadout {
  weapons: Record<WeaponId, number>;
  passives: Record<PassiveId, number>;
}

export type UpgradeCard =
  | { kind: 'weapon'; id: WeaponId; nextLevel: number }
  | { kind: 'passive'; id: PassiveId; nextLevel: number }
  | { kind: 'heal'; amount: number };

/** Weight for an upgrade to something you already own vs. something new. */
export const OWNED_WEIGHT = 3;
export const NEW_WEIGHT = 2;
export const HEAL_FRACTION = 0.3;

export function startingLoadout(): Loadout {
  const weapons = Object.fromEntries(WEAPON_IDS.map((id) => [id, 0])) as Record<WeaponId, number>;
  const passives = Object.fromEntries(PASSIVE_IDS.map((id) => [id, 0])) as Record<PassiveId, number>;
  weapons.bolt = 1;
  return { weapons, passives };
}

/** All cards that are currently legal to offer (anything below max level). */
export function availableCards(loadout: Loadout): UpgradeCard[] {
  const cards: UpgradeCard[] = [];
  for (const id of WEAPON_IDS) {
    const lvl = loadout.weapons[id];
    if (lvl < MAX_WEAPON_LEVEL) cards.push({ kind: 'weapon', id, nextLevel: lvl + 1 });
  }
  for (const id of PASSIVE_IDS) {
    const lvl = loadout.passives[id];
    if (lvl < MAX_PASSIVE_LEVEL) cards.push({ kind: 'passive', id, nextLevel: lvl + 1 });
  }
  return cards;
}

/**
 * Draws up to `count` distinct cards, weighted toward items already owned.
 * When everything is maxed, offers a single heal card instead.
 */
export function drawCards(loadout: Loadout, rng: Rng, count = 3): UpgradeCard[] {
  const pool = availableCards(loadout);
  if (pool.length === 0) return [{ kind: 'heal', amount: HEAL_FRACTION }];

  const picked: UpgradeCard[] = [];
  while (picked.length < count && pool.length > 0) {
    const card = rng.weighted(pool, (c) => (isOwned(c) ? OWNED_WEIGHT : NEW_WEIGHT));
    picked.push(card);
    pool.splice(pool.indexOf(card), 1);
  }
  return picked;
}

function isOwned(card: UpgradeCard): boolean {
  return card.kind !== 'heal' && card.nextLevel > 1;
}

/** Returns a new loadout with the card applied (heal cards leave the loadout unchanged). */
export function applyCard(loadout: Loadout, card: UpgradeCard): Loadout {
  const next: Loadout = { weapons: { ...loadout.weapons }, passives: { ...loadout.passives } };
  if (card.kind === 'weapon') {
    next.weapons[card.id] = Math.min(MAX_WEAPON_LEVEL, card.nextLevel);
  } else if (card.kind === 'passive') {
    next.passives[card.id] = Math.min(MAX_PASSIVE_LEVEL, card.nextLevel);
  }
  return next;
}

/** Human-readable title + body for an upgrade card. */
export function describeCard(card: UpgradeCard): { title: string; body: string; tag: string } {
  switch (card.kind) {
    case 'weapon': {
      const def = WEAPONS[card.id];
      return {
        title: def.name,
        body: card.nextLevel === 1 ? def.description : weaponLevelUpText(card.id, card.nextLevel),
        tag: card.nextLevel === 1 ? 'NEW WEAPON' : `LEVEL ${card.nextLevel}`,
      };
    }
    case 'passive': {
      const def = PASSIVES[card.id];
      return {
        title: def.name,
        body: def.perLevel,
        tag: card.nextLevel === 1 ? 'NEW' : `LEVEL ${card.nextLevel}`,
      };
    }
    case 'heal':
      return { title: 'Warm Ember', body: `Restore ${Math.round(card.amount * 100)}% HP`, tag: 'HEAL' };
  }
}

function weaponLevelUpText(id: WeaponId, level: number): string {
  const prev = WEAPONS[id].levels[level - 2];
  const next = WEAPONS[id].levels[level - 1];
  const parts: string[] = [];
  if (next.damage !== prev.damage) parts.push(`Damage ${prev.damage} → ${next.damage}`);
  if (next.count !== prev.count) parts.push(`${id === 'orbit' ? 'Blades' : 'Bolts'} +${next.count - prev.count}`);
  if (next.pierce !== prev.pierce) parts.push(`Pierce +${next.pierce - prev.pierce}`);
  if (next.radius !== prev.radius && id !== 'bolt') parts.push(`Area +${Math.round((next.radius / prev.radius - 1) * 100)}%`);
  if (next.cooldown < prev.cooldown && id !== 'orbit') parts.push('Faster');
  return parts.join(' · ');
}
