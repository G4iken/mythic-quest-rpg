import type { GameSave, ObjectiveType, QuestProgress } from '../types';
import { QUESTS } from '../data/quests';
import { awardXp } from './progression';
import { addRewardItems } from './inventory';

export function createQuestProgress(): QuestProgress[] {
  return QUESTS.map(q => ({ questId: q.id, currentProgress: 0, isCompleted: false, isClaimed: false }));
}

export function ensureQuestProgress(save: GameSave): GameSave {
  const existing = new Set(save.quests.map(q => q.questId));
  const missing = QUESTS.filter(q => !existing.has(q.id)).map(q => ({ questId: q.id, currentProgress: 0, isCompleted: false, isClaimed: false }));
  return missing.length ? { ...save, quests: [...save.quests, ...missing] } : save;
}

export function progressQuest(save: GameSave, objectiveType: ObjectiveType, amount = 1, targetId?: string): GameSave {
  save = ensureQuestProgress(save);
  const quests = save.quests.map(progress => {
    const quest = QUESTS.find(q => q.id === progress.questId);
    if (!quest || progress.isClaimed || progress.isCompleted) return progress;
    if (quest.objectiveType !== objectiveType) return progress;
    if (quest.targetId && quest.targetId !== targetId) return progress;
    const currentProgress = Math.min(quest.requiredAmount, progress.currentProgress + amount);
    return { ...progress, currentProgress, isCompleted: currentProgress >= quest.requiredAmount };
  });
  return { ...save, quests };
}

export function syncCollectionQuests(save: GameSave): GameSave {
  save = ensureQuestProgress(save);
  let changed = false;
  const quests = save.quests.map(progress => {
    const quest = QUESTS.find(q => q.id === progress.questId);
    if (!quest || quest.objectiveType !== 'collect_item' || !quest.targetId || progress.isClaimed) return progress;
    const owned = save.inventory.find(stack => stack.itemId === quest.targetId)?.quantity ?? 0;
    const currentProgress = Math.min(quest.requiredAmount, owned);
    const isCompleted = currentProgress >= quest.requiredAmount;
    if (currentProgress !== progress.currentProgress || isCompleted !== progress.isCompleted) changed = true;
    return { ...progress, currentProgress, isCompleted };
  });
  return changed ? { ...save, quests } : save;
}

export function claimQuest(save: GameSave, questId: string): GameSave {
  save = ensureQuestProgress(save);
  const progress = save.quests.find(q => q.questId === questId);
  const quest = QUESTS.find(q => q.id === questId);
  if (!progress || !quest || !progress.isCompleted || progress.isClaimed) return save;

  let next: GameSave = {
    ...save,
    player: {
      ...save.player,
      coins: save.player.coins + quest.rewards.coins,
      unlockedAreaIds: quest.rewards.unlockAreaId && !save.player.unlockedAreaIds.includes(quest.rewards.unlockAreaId)
        ? [...save.player.unlockedAreaIds, quest.rewards.unlockAreaId]
        : save.player.unlockedAreaIds
    },
    quests: save.quests.map(q => q.questId === questId ? { ...q, isClaimed: true } : q)
  };
  next = addRewardItems(next, quest.rewards.items ?? []);
  next = awardXp(next, quest.rewards.xp).save;
  return next;
}
