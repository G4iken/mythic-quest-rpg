import { AREAS } from './areas';

export interface ChallengeRoom {
  id: string;
  title: string;
  description: string;
  areaId: string;
  modifier: string;
  rewardCoins: number;
}

export function dailyDungeonSeed(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyDungeon(date = new Date()): ChallengeRoom {
  const seed = dailyDungeonSeed(date);
  const dayNumber = Number(seed.replace(/-/g, ''));
  const area = AREAS[dayNumber % AREAS.length];
  const modifiers = ['Elite Swarm', 'Low Gravity', 'Crate Jackpot', 'Hazard Storm', 'Mana Surge', 'Boss Rage'];
  const modifier = modifiers[dayNumber % modifiers.length];
  return {
    id: `daily-${seed}`,
    title: `${area.name} Daily Rift`,
    description: `Daily dungeon rotation: ${modifier}. Clear it for bonus materials and leaderboard practice.`,
    areaId: area.id,
    modifier,
    rewardCoins: 250 + area.requiredLevel * 35
  };
}

export const WEEKLY_CHALLENGES = [
  { id: 'weekly-boss-hunter', title: 'Boss Hunter', description: 'Defeat 3 bosses this week.', goal: 3, rewardCoins: 900 },
  { id: 'weekly-crafter', title: 'Master Crafter', description: 'Craft 2 items this week.', goal: 2, rewardCoins: 650 },
  { id: 'weekly-flawless', title: 'Flawless Runner', description: 'Clear any stage without using potions.', goal: 1, rewardCoins: 700 },
  { id: 'weekly-speedrun', title: 'Speedrunner', description: 'Clear a stage in under 45 seconds.', goal: 1, rewardCoins: 750 },
  { id: 'weekly-combo-master', title: 'Combo Master', description: 'Achieve a 15+ hit combo.', goal: 1, rewardCoins: 800 },
  { id: 'weekly-elite-slayer', title: 'Elite Slayer', description: 'Defeat 5 elite enemies.', goal: 5, rewardCoins: 950 },
  { id: 'weekly-tower-climber', title: 'Tower Climber', description: 'Reach floor 10 in the tower.', goal: 10, rewardCoins: 1200 },
  { id: 'weekly-collection', title: 'Collector', description: 'Collect 200 total items this week.', goal: 200, rewardCoins: 600 }
];
