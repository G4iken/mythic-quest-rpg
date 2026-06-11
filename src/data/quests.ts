import type { QuestData } from '../types';

export const QUESTS: QuestData[] = [
  {
    id: 'main-protect-village', title: 'Protect Green Village', type: 'Main',
    description: 'Defeat 3 Slimes or Rats around the village farms.',
    objectiveType: 'defeat_enemy', requiredAmount: 3,
    rewards: { xp: 55, coins: 45, items: [{ itemId: 'small-health-potion', quantity: 2 }] }
  },
  {
    id: 'main-giant-slime', title: 'The First Boss', type: 'Main',
    description: 'Defeat the Giant Slime and open the path to Forest Path.',
    objectiveType: 'defeat_boss', targetId: 'giant-slime', requiredAmount: 1,
    rewards: { xp: 90, coins: 90, unlockAreaId: 'forest-path' }
  },
  {
    id: 'side-slime-gel', title: 'Sticky Problem', type: 'Side',
    description: 'Collect 3 Slime Gel for the Village Elder.',
    objectiveType: 'collect_item', targetId: 'slime-gel', requiredAmount: 3,
    rewards: { xp: 50, coins: 70, items: [{ itemId: 'medium-health-potion', quantity: 1 }] }
  },
  {
    id: 'side-open-chest', title: 'Treasure Hunter', type: 'Side',
    description: 'Open any 2 treasure chests in unlocked areas.',
    objectiveType: 'open_chest', requiredAmount: 2,
    rewards: { xp: 110, coins: 120, items: [{ itemId: 'mana-potion', quantity: 1 }] }
  },
  {
    id: 'daily-monster-cleanup', title: 'Daily Monster Cleanup', type: 'Daily',
    description: 'Win 3 normal battles today.',
    objectiveType: 'defeat_enemy', requiredAmount: 3,
    rewards: { xp: 70, coins: 85, items: [{ itemId: 'small-health-potion', quantity: 1 }] }
  },
  {
    id: 'main-forest-troll', title: 'Forest Road Reopened', type: 'Main',
    description: 'Defeat the Forest Troll to unlock Crystal Cave.',
    objectiveType: 'defeat_boss', targetId: 'forest-troll', requiredAmount: 1,
    rewards: { xp: 180, coins: 160, unlockAreaId: 'crystal-cave' }
  },
  {
    id: 'side-reach-level-5', title: 'Apprentice Hero', type: 'Side',
    description: 'Reach Level 5 to prove your growth.',
    objectiveType: 'reach_level', requiredAmount: 5,
    rewards: { xp: 90, coins: 160, items: [{ itemId: 'crystal-shard', quantity: 2 }] }
  },
  {
    id: 'main-sky-temple', title: 'Storm Above the Clouds', type: 'Main',
    description: 'Defeat the Storm Titan and open the Moon Graveyard path.',
    objectiveType: 'defeat_boss', targetId: 'storm-titan', requiredAmount: 1,
    rewards: { xp: 900, coins: 900, unlockAreaId: 'moon-graveyard', items: [{ itemId: 'swift-tonic', quantity: 2 }] }
  },
  {
    id: 'main-moon-reaper', title: 'The Moon Opens', type: 'Main',
    description: 'Defeat the Moon Reaper and unlock the Abyssal Library.',
    objectiveType: 'defeat_boss', targetId: 'moon-reaper', requiredAmount: 1,
    rewards: { xp: 1500, coins: 1400, unlockAreaId: 'abyssal-library', items: [{ itemId: 'moon-essence', quantity: 3 }] }
  },
  {
    id: 'main-void-librarian', title: 'Forbidden Pages', type: 'Main',
    description: 'Defeat the Void Librarian and reveal the Dragon Citadel.',
    objectiveType: 'defeat_boss', targetId: 'void-librarian', requiredAmount: 1,
    rewards: { xp: 2200, coins: 2100, unlockAreaId: 'dragon-citadel', items: [{ itemId: 'void-ink', quantity: 4 }] }
  },
  {
    id: 'main-final-gate', title: 'Close the Ethereal Gate', type: 'Main',
    description: 'Defeat the Gate Seraph and finish the current story arc.',
    objectiveType: 'defeat_boss', targetId: 'gate-seraph', requiredAmount: 1,
    rewards: { xp: 5000, coins: 5000, items: [{ itemId: 'ether-core', quantity: 6 }, { itemId: 'phoenix-elixir', quantity: 2 }] }
  },
  {
    id: 'daily-combo-master', title: 'Daily Combo Master', type: 'Daily',
    description: 'Defeat 10 monsters in action stages to practice combos.',
    objectiveType: 'defeat_enemy', requiredAmount: 10,
    rewards: { xp: 400, coins: 450, items: [{ itemId: 'swift-tonic', quantity: 1 }] }
  },
  {
    id: 'side-reach-level-20', title: 'Elite Gatewalker', type: 'Side',
    description: 'Reach Level 20 and become ready for late-game stages.',
    objectiveType: 'reach_level', requiredAmount: 20,
    rewards: { xp: 1500, coins: 1800, items: [{ itemId: 'phoenix-elixir', quantity: 1 }] }
  }
];
