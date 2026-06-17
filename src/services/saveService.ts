import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { AreaProgress, GameSave, SaveSummary } from '../types';
import { AREAS } from '../data/areas';
import { firestoreDb } from './firebase';

const LOCAL_PREFIX = 'mythic-quest:saves';


function migrateSave(raw: GameSave): GameSave {
  const areaProgressById = new Map((raw.areaProgress ?? []).map(progress => [progress.areaId, progress] as const));
  const areaProgress: AreaProgress[] = AREAS.map(area => areaProgressById.get(area.id) ?? { areaId: area.id, normalWins: 0, bossDefeated: false, chestOpened: false });
  const unlockedAreaIds = raw.player.unlockedAreaIds?.length ? raw.player.unlockedAreaIds : ['green-village'];
  const storyFlags = raw.player.storyFlags ?? [];
  const unlockedCharacterIds = raw.player.unlockedCharacterIds?.length ? raw.player.unlockedCharacterIds : ['wanderer'];
  return {
    ...raw,
    schemaVersion: Math.max(raw.schemaVersion ?? 1, 3),
    player: {
      ...raw.player,
      currentAreaId: raw.player.currentAreaId ?? 'green-village',
      unlockedAreaIds,
      unlockedSkillIds: raw.player.unlockedSkillIds ?? [],
      bossesDefeated: raw.player.bossesDefeated ?? [],
      openedChests: raw.player.openedChests ?? [],
      characterId: raw.player.characterId ?? 'wanderer',
      unlockedCharacterIds,
      bestStageScores: raw.player.bestStageScores ?? {},
      starObjectives: raw.player.starObjectives ?? {},
      equipmentLevels: raw.player.equipmentLevels ?? {},
      skillTree: raw.player.skillTree ?? { activePath: 'blade', unlockedNodes: ['blade-1'] },
      dailyLogin: raw.player.dailyLogin ?? { lastClaimDate: '', streak: 0 },
      storyFlags,
      unlockedPetIds: raw.player.unlockedPetIds?.length ? raw.player.unlockedPetIds : ['ember-sprite'],
      activePetId: raw.player.activePetId ?? 'ember-sprite',
      artifacts: raw.player.artifacts ?? {},
      guildAffinity: raw.player.guildAffinity ?? { elder: 0, blacksmith: 0, merchant: 0, ranger: 0 },
      telemetry: raw.player.telemetry ?? { deaths: 0, potionsUsed: 0, totalKills: 0, totalCoins: 0, totalPlaySeconds: 0, bossPracticeClears: 0, challengeClears: 0 },
      weeklyChallenges: raw.player.weeklyChallenges ?? {},
      lastChallengeSeed: raw.player.lastChallengeSeed ?? '',
      practiceModeClears: raw.player.practiceModeClears ?? {},
      ghostRuns: raw.player.ghostRuns ?? {}
    },
    inventory: raw.inventory ?? [],
    areaProgress,
    settings: { ...{ soundEnabled: true, reduceMotion: false, difficulty: 'normal' as const, hapticsEnabled: true, touchTutorialSeen: false, biggerUi: false, colorblindBars: false, graphicsQuality: 'medium' as const, cameraAssist: true, showDamageNumbers: true, autoPotion: false }, ...(raw.settings ?? {}) }
  };
}

function localKey(accountId: string, slotId: string) {
  return `${LOCAL_PREFIX}:${accountId}:${slotId}`;
}

export function summarizeSave(save: GameSave, source: 'local' | 'cloud'): SaveSummary {
  return {
    slotId: save.saveSlotId,
    source,
    playerName: save.player.name,
    level: save.player.level,
    currentAreaId: save.player.currentAreaId,
    updatedAt: save.updatedAt
  };
}

export function stampSave(save: GameSave): GameSave {
  return { ...save, updatedAt: new Date().toISOString() };
}

export function saveLocal(accountId: string, save: GameSave) {
  const stamped = stampSave({ ...save, accountId });
  localStorage.setItem(localKey(accountId, save.saveSlotId), JSON.stringify(stamped));
  return stamped;
}

export function loadLocal(accountId: string, slotId: string): GameSave | null {
  const raw = localStorage.getItem(localKey(accountId, slotId));
  if (!raw) return null;
  try {
    const save = migrateSave(JSON.parse(raw) as GameSave);
    if (save.accountId !== accountId) return null;
    return save;
  } catch {
    return null;
  }
}

export function listLocalSaves(accountId: string): SaveSummary[] {
  return ['slot-1', 'slot-2', 'slot-3']
    .map(slotId => loadLocal(accountId, slotId))
    .filter((save): save is GameSave => Boolean(save))
    .map(save => summarizeSave(save, 'local'));
}

function cloudDoc(userId: string, slotId: string) {
  if (!firestoreDb) throw new Error('Firebase Firestore is not configured.');
  return doc(firestoreDb, 'users', userId, 'saves', slotId);
}

export async function uploadCloud(userId: string, save: GameSave) {
  if (userId === 'guest') throw new Error('Guest saves cannot be uploaded. Login first.');
  const stamped = stampSave({ ...save, accountId: userId });
  await setDoc(cloudDoc(userId, save.saveSlotId), stamped, { merge: false });
  return stamped;
}

export async function downloadCloud(userId: string, slotId: string): Promise<GameSave | null> {
  if (userId === 'guest' || !firestoreDb) return null;
  const snapshot = await getDoc(cloudDoc(userId, slotId));
  if (!snapshot.exists()) return null;
  const save = migrateSave(snapshot.data() as GameSave);
  return save.accountId === userId ? save : null;
}

export async function listCloudSaves(userId: string): Promise<SaveSummary[]> {
  if (userId === 'guest' || !firestoreDb) return [];
  const snaps = await getDocs(collection(firestoreDb, 'users', userId, 'saves'));
  return snaps.docs
    .map(d => migrateSave(d.data() as GameSave))
    .filter(save => save.accountId === userId)
    .map(save => summarizeSave(save, 'cloud'));
}

export function getNewestSave(local: GameSave | null, cloud: GameSave | null) {
  if (local && cloud) return new Date(local.updatedAt) >= new Date(cloud.updatedAt) ? local : cloud;
  return local ?? cloud;
}
