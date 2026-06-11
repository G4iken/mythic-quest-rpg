import type { PetData } from '../types';

export const PETS: Record<string, PetData> = {
  'ember-sprite': {
    id: 'ember-sprite', name: 'Ember Sprite', title: 'Starter Companion', icon: '🔥', unlockLevel: 1, price: 0,
    description: 'A tiny flame spirit that helps new adventurers hit harder.',
    passive: '+2 ATK and small bonus coin drops from monsters.',
    statBonus: { attack: 2, lootFind: 0.06 }
  },
  'mender-fairy': {
    id: 'mender-fairy', name: 'Mender Fairy', title: 'Village Healer', icon: '🧚', unlockLevel: 3, price: 420,
    description: 'A gentle fairy that slowly restores HP during long 3D stages.',
    passive: '+12 HP and passive HP regeneration in stages.',
    statBonus: { maxHp: 12, regen: 0.9 }
  },
  'gold-mimic': {
    id: 'gold-mimic', name: 'Gold Mimic', title: 'Treasure Finder', icon: '🪙', unlockLevel: 5, price: 760,
    description: 'A friendly mimic that detects coins, crates, and rare materials.',
    passive: '+14% loot find and coin pickups magnetize from farther away.',
    statBonus: { lootFind: 0.14, speed: 0.15 }
  },
  'storm-hawk': {
    id: 'storm-hawk', name: 'Storm Hawk', title: 'Sky Scout', icon: '🦅', unlockLevel: 10, price: 1350,
    description: 'A fast scouting hawk that improves speed and ultimate charge rhythm.',
    passive: '+0.35 speed, +5 ATK, and faster ultimate charge from combos.',
    statBonus: { attack: 5, speed: 0.35 }
  },
  'void-cub': {
    id: 'void-cub', name: 'Void Cub', title: 'Rift Familiar', icon: '🐾', unlockLevel: 18, price: 2600,
    description: 'A strange rift creature that increases mana and weak-hit burst damage.',
    passive: '+20 MP, +6 ATK, and stronger skill burst rewards.',
    statBonus: { maxMana: 20, attack: 6, lootFind: 0.08 }
  }
};

export const PET_ORDER = Object.values(PETS);

export function getPet(id?: string) {
  return PETS[id ?? 'ember-sprite'] ?? PETS['ember-sprite'];
}

export function getUnlockedPetIds(save: { player: { unlockedPetIds?: string[] } }) {
  const ids = save.player.unlockedPetIds?.length ? save.player.unlockedPetIds : ['ember-sprite'];
  return Array.from(new Set(['ember-sprite', ...ids]));
}
