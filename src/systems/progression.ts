import type { GameSave } from '../types';
import { SKILL_UNLOCK_ORDER } from '../data/skills';
import { addRewardItems } from './inventory';

export function xpForLevel(level: number) {
  return Math.floor(85 + level * level * 30);
}

export function awardXp(save: GameSave, amount: number) {
  let next = { ...save, player: { ...save.player, xp: save.player.xp + amount } };
  const unlockedSkills: string[] = [];
  while (next.player.xp >= next.player.xpToNextLevel) {
    const excess = next.player.xp - next.player.xpToNextLevel;
    const level = next.player.level + 1;
    const baseStats = {
      maxHp: next.player.baseStats.maxHp + 18,
      maxMana: next.player.baseStats.maxMana + 6,
      attack: next.player.baseStats.attack + 4,
      defense: next.player.baseStats.defense + 3
    };
    const newSkillIds = SKILL_UNLOCK_ORDER
      .filter(skill => skill.requiredLevel <= level)
      .map(skill => skill.id)
      .filter(skillId => !next.player.unlockedSkillIds.includes(skillId));

    unlockedSkills.push(...newSkillIds);
    next = {
      ...next,
      player: {
        ...next.player,
        level,
        xp: excess,
        xpToNextLevel: xpForLevel(level),
        baseStats,
        hp: baseStats.maxHp,
        mana: baseStats.maxMana,
        unlockedSkillIds: [...next.player.unlockedSkillIds, ...newSkillIds]
      }
    };
  }
  return { save: next, leveledUp: next.player.level > save.player.level, unlockedSkills };
}

export function giveRewards(save: GameSave, xp: number, coins: number, items = [] as Array<{ itemId: string; quantity: number }>) {
  const withCoins = { ...save, player: { ...save.player, coins: save.player.coins + coins } };
  const withItems = addRewardItems(withCoins, items);
  return awardXp(withItems, xp).save;
}
