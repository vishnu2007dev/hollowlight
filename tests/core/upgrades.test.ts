import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import {
  applyCard,
  availableCards,
  describeCard,
  drawCards,
  startingLoadout,
  type Loadout,
} from '../../src/core/upgrades';
import { MAX_PASSIVE_LEVEL, PASSIVE_IDS } from '../../src/data/passives';
import { MAX_WEAPON_LEVEL, WEAPON_IDS } from '../../src/data/weapons';

function maxedLoadout(): Loadout {
  const l = startingLoadout();
  for (const id of WEAPON_IDS) l.weapons[id] = MAX_WEAPON_LEVEL;
  for (const id of PASSIVE_IDS) l.passives[id] = MAX_PASSIVE_LEVEL;
  return l;
}

const key = (c: ReturnType<typeof drawCards>[number]): string => (c.kind === 'heal' ? 'heal' : `${c.kind}:${c.id}`);

describe('upgrades', () => {
  it('starts with a level 1 Lantern Bolt and nothing else', () => {
    const l = startingLoadout();
    expect(l.weapons).toEqual({ bolt: 1, orbit: 0, nova: 0, trail: 0 });
    expect(Object.values(l.passives).every((v) => v === 0)).toBe(true);
  });

  it('draws 3 distinct cards', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 200; i++) {
      const cards = drawCards(startingLoadout(), rng, 3);
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map(key)).size).toBe(3);
    }
  });

  it('never offers an item that is already at max level', () => {
    const l = startingLoadout();
    l.weapons.bolt = MAX_WEAPON_LEVEL;
    l.passives.might = MAX_PASSIVE_LEVEL;
    const rng = new Rng(11);
    for (let i = 0; i < 500; i++) {
      for (const c of drawCards(l, rng)) {
        expect(key(c)).not.toBe('weapon:bolt');
        expect(key(c)).not.toBe('passive:might');
      }
    }
  });

  it('offers fewer cards when the pool runs low', () => {
    const l = maxedLoadout();
    l.passives.regen = 4;
    expect(drawCards(l, new Rng(1), 3)).toEqual([{ kind: 'passive', id: 'regen', nextLevel: 5 }]);
  });

  it('falls back to a heal card when everything is maxed', () => {
    const cards = drawCards(maxedLoadout(), new Rng(1));
    expect(cards).toHaveLength(1);
    expect(cards[0].kind).toBe('heal');
  });

  it('applyCard is immutable and caps at max level', () => {
    const l = startingLoadout();
    const next = applyCard(l, { kind: 'weapon', id: 'orbit', nextLevel: 1 });
    expect(next.weapons.orbit).toBe(1);
    expect(l.weapons.orbit).toBe(0);
    const capped = applyCard(next, { kind: 'weapon', id: 'orbit', nextLevel: 99 });
    expect(capped.weapons.orbit).toBe(MAX_WEAPON_LEVEL);
  });

  it('availableCards lists every non-maxed item', () => {
    expect(availableCards(startingLoadout())).toHaveLength(WEAPON_IDS.length + PASSIVE_IDS.length);
  });

  it('describes every possible card with non-empty text', () => {
    const l = startingLoadout();
    for (const id of WEAPON_IDS) {
      for (let lvl = 1; lvl <= MAX_WEAPON_LEVEL; lvl++) {
        const d = describeCard({ kind: 'weapon', id, nextLevel: lvl });
        expect(d.title.length).toBeGreaterThan(0);
        expect(d.body.length).toBeGreaterThan(0);
      }
    }
    for (const c of availableCards(l)) expect(describeCard(c).body.length).toBeGreaterThan(0);
  });
});
