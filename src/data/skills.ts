import type { SkillData } from '../types';

export const SKILLS: Record<string, SkillData> = {
  'power-slash': {
    id: 'power-slash', name: 'Power Slash', requiredLevel: 2, manaCost: 5, damageMultiplier: 1.5,
    description: 'A heavy blade strike that deals 150% attack damage.', icon: '⚡'
  },
  'guard-break': {
    id: 'guard-break', name: 'Guard Break', requiredLevel: 4, manaCost: 8, damageMultiplier: 1.9,
    description: 'A piercing strike that crushes enemy defense.', icon: '🪓'
  },
  'healing-light': {
    id: 'healing-light', name: 'Healing Light', requiredLevel: 6, manaCost: 10, damageMultiplier: 0,
    healPercent: 0.3, description: 'Restores 30% of max HP.', icon: '✨'
  },
  'flame-strike': {
    id: 'flame-strike', name: 'Flame Strike', requiredLevel: 8, manaCost: 15, damageMultiplier: 2.6,
    description: 'A burning strike that deals massive damage.', icon: '🔥'
  },
  'heros-wrath': {
    id: 'heros-wrath', name: "Hero's Wrath", requiredLevel: 10, manaCost: 20, damageMultiplier: 3.5,
    description: 'A heroic ultimate skill built for boss battles.', icon: '🌟'
  }
};

export const SKILL_UNLOCK_ORDER = Object.values(SKILLS).sort((a, b) => a.requiredLevel - b.requiredLevel);
