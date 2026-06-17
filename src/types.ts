export type Screen =
  | 'splash'
  | 'auth'
  | 'saves'
  | 'village'
  | 'stage'
  | 'map'
  | 'battle'
  | 'inventory'
  | 'equipment'
  | 'quests'
  | 'skills'
  | 'shop'
  | 'settings'
  | 'profile';

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type ItemType = 'Weapon' | 'Armor' | 'Potion' | 'Quest' | 'Consumable' | 'Material' | 'Artifact';
export type QuestType = 'Main' | 'Side' | 'Daily';
export type ObjectiveType = 'defeat_enemy' | 'defeat_boss' | 'collect_item' | 'open_chest' | 'reach_level';
export type BattleMode = 'normal' | 'boss';
export type CharacterRole = 'Balanced' | 'Assassin' | 'Mage' | 'Tank' | 'Samurai' | 'Storm' | 'Ranger' | 'Void' | 'Beastmaster';
export type ElementType = 'physical' | 'fire' | 'ice' | 'storm' | 'earth' | 'void' | 'light';
export type Difficulty = 'normal' | 'hard' | 'nightmare';
export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface AppUser {
  uid: string;
  email: string | null;
  isGuest: boolean;
}

export interface Stats {
  maxHp: number;
  maxMana: number;
  attack: number;
  defense: number;
}

export interface CharacterData {
  id: string;
  name: string;
  title: string;
  role: CharacterRole;
  description: string;
  unlockMethod: 'starter' | 'shop' | 'story';
  unlockLevel: number;
  price: number;
  icon: string;
  className: string;
  hpBonus: number;
  manaBonus: number;
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  jumpBonus: number;
  skillName: string;
  skillDescription: string;
}

export interface ItemData {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  attackBonus?: number;
  defenseBonus?: number;
  hpRestore?: number;
  manaRestore?: number;
  sellPrice: number;
  icon: string;
}

export interface PetData {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  price: number;
  unlockLevel: number;
  passive: string;
  statBonus: Partial<Stats> & { speed?: number; lootFind?: number; regen?: number };
}

export interface ArtifactData {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  maxLevel: number;
  statPerLevel: Partial<Stats>;
  special: string;
}

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export interface SkillData {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  manaCost: number;
  damageMultiplier: number;
  healPercent?: number;
  icon: string;
}

export interface EnemyData {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  coinReward: number;
  lootTable: Array<{ itemId: string; chance: number; min: number; max: number }>;
  enemyType: string;
  isBoss: boolean;
  icon: string;
}

export interface AreaData {
  id: string;
  name: string;
  requiredLevel: number;
  normalEnemyIds: string[];
  questObjective: string;
  treasureReward: Array<{ itemId: string; quantity: number }>;
  bossId: string;
  unlockCondition: string;
  theme: string;
  background: string;
  nextAreaId?: string;
}

export interface QuestData {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  objectiveType: ObjectiveType;
  targetId?: string;
  requiredAmount: number;
  rewards: {
    xp: number;
    coins: number;
    items?: Array<{ itemId: string; quantity: number }>;
    unlockAreaId?: string;
  };
}

export interface QuestProgress {
  questId: string;
  currentProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface PlayerData {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  hp: number;
  mana: number;
  baseStats: Stats;
  equippedWeaponId: string;
  equippedArmorId: string;
  currentAreaId: string;
  unlockedAreaIds: string[];
  unlockedSkillIds: string[];
  bossesDefeated: string[];
  openedChests: string[];
  characterId?: string;
  unlockedCharacterIds?: string[];
  bestStageScores?: Record<string, { grade: string; clearTime: number; kills: number; combo: number }>;
  starObjectives?: Record<string, { noPotion: boolean; sRank: boolean; comboMaster: boolean }>;
  equipmentLevels?: Record<string, number>;
  skillTree?: { activePath: 'blade' | 'magic' | 'guardian'; unlockedNodes: string[] };
  dailyLogin?: { lastClaimDate: string; streak: number };
  storyFlags?: string[];
  unlockedPetIds?: string[];
  activePetId?: string;
  artifacts?: Record<string, number>;
  guildAffinity?: Record<string, number>;
  telemetry?: {
    deaths: number;
    potionsUsed: number;
    totalKills: number;
    totalCoins: number;
    totalPlaySeconds: number;
    bossPracticeClears: number;
    challengeClears: number;
  };
  weeklyChallenges?: Record<string, { progress: number; claimed: boolean }>;
  lastChallengeSeed?: string;
  towerBestFloor?: number;
  practiceModeClears?: Record<string, number>;
  ghostRuns?: Record<string, string>;
}

export interface AreaProgress {
  areaId: string;
  normalWins: number;
  bossDefeated: boolean;
  chestOpened: boolean;
}

export interface GameSave {
  schemaVersion: number;
  saveSlotId: string;
  accountId: string;
  player: PlayerData;
  inventory: ItemStack[];
  quests: QuestProgress[];
  areaProgress: AreaProgress[];
  settings: {
    soundEnabled: boolean;
    reduceMotion: boolean;
    difficulty?: Difficulty;
    hapticsEnabled?: boolean;
    touchTutorialSeen?: boolean;
    biggerUi?: boolean;
    colorblindBars?: boolean;
    graphicsQuality?: GraphicsQuality;
    cameraAssist?: boolean;
    showDamageNumbers?: boolean;
    autoPotion?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SaveSummary {
  slotId: string;
  source: 'local' | 'cloud';
  playerName: string;
  level: number;
  currentAreaId: string;
  updatedAt: string;
}

export interface BattleActor {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  icon: string;
}

export interface BattleState {
  areaId: string;
  mode: BattleMode;
  enemyId: string;
  player: BattleActor;
  enemy: BattleActor;
  isPlayerDefending: boolean;
  turn: 'player' | 'enemy' | 'won' | 'lost';
  log: string[];
  damagePopups: string[];
}

export interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'danger';
}


export interface LeaderboardRun {
  id: string;
  areaId: string;
  playerName: string;
  heroName: string;
  grade: string;
  clearTime: number;
  combo: number;
  kills: number;
  difficulty: Difficulty;
  createdAt: string;
}
