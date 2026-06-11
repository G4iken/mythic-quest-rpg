import type { AreaProgress, GameSave } from '../types';
import { AREAS } from '../data/areas';
import { xpForLevel } from './progression';
import { createQuestProgress } from './questEngine';

export function createAreaProgress(): AreaProgress[] {
  return AREAS.map(area => ({ areaId: area.id, normalWins: 0, bossDefeated: false, chestOpened: false }));
}

export function createNewSave(accountId: string, slotId: string, playerName: string): GameSave {
  const now = new Date().toISOString();
  return {
    schemaVersion: 3,
    saveSlotId: slotId,
    accountId,
    player: {
      name: playerName.trim() || 'Adventurer',
      level: 1,
      xp: 0,
      xpToNextLevel: xpForLevel(1),
      coins: 120,
      hp: 115,
      mana: 35,
      baseStats: { maxHp: 115, maxMana: 35, attack: 14, defense: 6 },
      equippedWeaponId: 'wooden-sword',
      equippedArmorId: 'cloth-tunic',
      currentAreaId: 'green-village',
      unlockedAreaIds: ['green-village'],
      unlockedSkillIds: [],
      bossesDefeated: [],
      openedChests: [],
      characterId: 'wanderer',
      unlockedCharacterIds: ['wanderer'],
      bestStageScores: {},
      starObjectives: {},
      equipmentLevels: {},
      skillTree: { activePath: 'blade', unlockedNodes: ['blade-1'] },
      dailyLogin: { lastClaimDate: '', streak: 0 },
      storyFlags: [],
      unlockedPetIds: ['ember-sprite'],
      activePetId: 'ember-sprite',
      artifacts: {},
      guildAffinity: { elder: 0, blacksmith: 0, merchant: 0, ranger: 0 },
      telemetry: { deaths: 0, potionsUsed: 0, totalKills: 0, totalCoins: 0, totalPlaySeconds: 0, bossPracticeClears: 0, challengeClears: 0 },
      weeklyChallenges: {},
      lastChallengeSeed: ''
    },
    inventory: [
      { itemId: 'wooden-sword', quantity: 1 },
      { itemId: 'cloth-tunic', quantity: 1 },
      { itemId: 'small-health-potion', quantity: 4 },
      { itemId: 'mana-potion', quantity: 1 }
    ],
    quests: createQuestProgress(),
    areaProgress: createAreaProgress(),
    settings: { soundEnabled: true, reduceMotion: false, difficulty: 'normal', hapticsEnabled: true, touchTutorialSeen: false, biggerUi: false, colorblindBars: false, graphicsQuality: 'medium', cameraAssist: true, showDamageNumbers: true, autoPotion: false },
    createdAt: now,
    updatedAt: now
  };
}
