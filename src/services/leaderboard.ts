import { collection, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import type { Difficulty, LeaderboardRun } from '../types';
import { firestoreDb } from './firebase';

function localKey(areaId: string, difficulty: Difficulty) {
  return `mythic-quest:leaderboard:${areaId}:${difficulty}`;
}

function leaderboardCollection(areaId: string) {
  if (!firestoreDb) throw new Error('Firestore is not configured.');
  return collection(firestoreDb, 'publicLeaderboards', areaId, 'runs');
}

export async function submitLeaderboardRun(run: LeaderboardRun) {
  const localRuns = getLocalLeaderboard(run.areaId, run.difficulty);
  localStorage.setItem(localKey(run.areaId, run.difficulty), JSON.stringify([...localRuns, run].sort((a, b) => a.clearTime - b.clearTime).slice(0, 20)));
  if (!firestoreDb) return;
  await setDoc(doc(leaderboardCollection(run.areaId), run.id), run, { merge: false });
}

export function getLocalLeaderboard(areaId: string, difficulty: Difficulty): LeaderboardRun[] {
  try {
    const raw = localStorage.getItem(localKey(areaId, difficulty));
    return raw ? JSON.parse(raw) as LeaderboardRun[] : [];
  } catch {
    return [];
  }
}

export async function getCloudLeaderboard(areaId: string): Promise<LeaderboardRun[]> {
  if (!firestoreDb) return [];
  const snapshot = await getDocs(query(leaderboardCollection(areaId), orderBy('clearTime', 'asc'), limit(10)));
  return snapshot.docs.map(docSnap => docSnap.data() as LeaderboardRun);
}
