import type { CharacterData, GameSave } from '../types';

export const CHARACTERS: Record<string, CharacterData> = {
  wanderer: {
    id: 'wanderer', name: 'Ari', title: 'Village Wanderer', role: 'Balanced', unlockMethod: 'starter', unlockLevel: 1, price: 0,
    description: 'Balanced hero with safe stats, fast recovery, and reliable sword combos.', icon: '🧙', className: 'char-wanderer',
    hpBonus: 0, manaBonus: 0, attackBonus: 0, defenseBonus: 0, speedBonus: 0, jumpBonus: 0,
    skillName: 'Arc Flash', skillDescription: 'Short-range burst that hits nearby enemies.'
  },
  nyx: {
    id: 'nyx', name: 'Nyx', title: 'Shadow Rogue', role: 'Assassin', unlockMethod: 'shop', unlockLevel: 2, price: 350,
    description: 'Fast movement, longer dash, higher combo damage, but lower defense.', icon: '🥷', className: 'char-nyx',
    hpBonus: -12, manaBonus: 8, attackBonus: 4, defenseBonus: -2, speedBonus: 45, jumpBonus: 28,
    skillName: 'Shadow Step', skillDescription: 'Dash-slash through enemies and refresh combo faster.'
  },
  lyra: {
    id: 'lyra', name: 'Lyra', title: 'Crystal Mage', role: 'Mage', unlockMethod: 'shop', unlockLevel: 4, price: 650,
    description: 'High mana, stronger skill attacks, and better potion healing.', icon: '🧝', className: 'char-lyra',
    hpBonus: -8, manaBonus: 28, attackBonus: 8, defenseBonus: -1, speedBonus: -8, jumpBonus: 0,
    skillName: 'Crystal Nova', skillDescription: 'Wide magic burst that damages every enemy near the hero.'
  },
  borin: {
    id: 'borin', name: 'Borin', title: 'Iron Guardian', role: 'Tank', unlockMethod: 'shop', unlockLevel: 6, price: 900,
    description: 'Heavy hero with high HP and defense, perfect for boss fights.', icon: '🛡️', className: 'char-borin',
    hpBonus: 42, manaBonus: -6, attackBonus: 2, defenseBonus: 8, speedBonus: -28, jumpBonus: -16,
    skillName: 'Iron Guard', skillDescription: 'Heavy strike with extra stagger and reduced incoming damage.'
  },
  kaida: {
    id: 'kaida', name: 'Kaida', title: 'Flame Samurai', role: 'Samurai', unlockMethod: 'story', unlockLevel: 11, price: 0,
    description: 'Unlocked after Lava Mountain. Great attack, fire ultimate, and long slash range.', icon: '🔥', className: 'char-kaida',
    hpBonus: 12, manaBonus: 10, attackBonus: 14, defenseBonus: 2, speedBonus: 18, jumpBonus: 8,
    skillName: 'Flame Crescent', skillDescription: 'A burning crescent wave that punishes bosses.'
  },
  zeph: {
    id: 'zeph', name: 'Zeph', title: 'Storm Knight', role: 'Storm', unlockMethod: 'story', unlockLevel: 17, price: 0,
    description: 'Unlocked near Sky Temple. Fast aerial movement and high ultimate charge.', icon: '🌩️', className: 'char-zeph',
    hpBonus: 18, manaBonus: 22, attackBonus: 18, defenseBonus: 5, speedBonus: 34, jumpBonus: 38,
    skillName: 'Storm Breaker', skillDescription: 'Lightning dash that pierces multiple enemies.'
  }
  ,
  mira: {
    id: 'mira', name: 'Mira', title: 'Moon Ranger', role: 'Ranger', unlockMethod: 'shop', unlockLevel: 9, price: 1450,
    description: 'Fast ranged-style hero with high mobility, safer spacing, and bonus weak-hit rewards.', icon: '🏹', className: 'char-mira',
    hpBonus: 4, manaBonus: 14, attackBonus: 11, defenseBonus: 0, speedBonus: 42, jumpBonus: 20,
    skillName: 'Lunar Volley', skillDescription: 'A wide cone burst that clears groups and charges ultimate quickly.'
  },
  vex: {
    id: 'vex', name: 'Vex', title: 'Void Duelist', role: 'Void', unlockMethod: 'story', unlockLevel: 20, price: 0,
    description: 'Unlocked after the Void Librarian. Converts mana into high-risk void burst damage.', icon: '🟣', className: 'char-vex',
    hpBonus: -10, manaBonus: 36, attackBonus: 22, defenseBonus: -4, speedBonus: 20, jumpBonus: 12,
    skillName: 'Null Spiral', skillDescription: 'Void spiral that punishes resistant enemies and melts elites.'
  },
  terra: {
    id: 'terra', name: 'Terra', title: 'Beastmaster', role: 'Beastmaster', unlockMethod: 'shop', unlockLevel: 13, price: 2200,
    description: 'Pet-focused hero with stronger companion bonuses, high HP, and stable Nightmare runs.', icon: '🐾', className: 'char-terra',
    hpBonus: 32, manaBonus: 8, attackBonus: 9, defenseBonus: 7, speedBonus: 6, jumpBonus: 6,
    skillName: 'Pack Command', skillDescription: 'Commands companion energy to strike nearby enemies and heal slightly.'
  }

};

export const CHARACTER_ORDER = Object.values(CHARACTERS);

export function getCharacter(id?: string) {
  return CHARACTERS[id ?? 'wanderer'] ?? CHARACTERS.wanderer;
}

export function getUnlockedCharacterIds(save: GameSave) {
  const ids = save.player.unlockedCharacterIds?.length ? save.player.unlockedCharacterIds : ['wanderer'];
  const storyUnlocks = new Set(ids);
  if (save.player.bossesDefeated.includes('lava-dragon')) storyUnlocks.add('kaida');
  if (save.player.bossesDefeated.includes('storm-titan')) storyUnlocks.add('zeph');
  if (save.player.bossesDefeated.includes('void-librarian')) storyUnlocks.add('vex');
  return Array.from(storyUnlocks);
}

export function canUseCharacter(save: GameSave, characterId: string) {
  return getUnlockedCharacterIds(save).includes(characterId);
}
