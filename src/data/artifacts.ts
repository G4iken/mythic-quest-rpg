import type { ArtifactData } from '../types';

export const ARTIFACTS: Record<string, ArtifactData> = {
  'hero-medal': {
    id: 'hero-medal', name: 'Hero Medal', icon: '🏅', price: 500, maxLevel: 8,
    description: 'Village medal awarded to gate defenders. Good all-around starter artifact.',
    statPerLevel: { maxHp: 5, attack: 1, defense: 1 },
    special: 'Improves survivability and early boss consistency.'
  },
  'rift-compass': {
    id: 'rift-compass', name: 'Rift Compass', icon: '🧭', price: 900, maxLevel: 7,
    description: 'Points toward hidden crates, bonus rooms, and unstable gates.',
    statPerLevel: { maxMana: 4, attack: 2 },
    special: 'Improves magic builds and bonus-room clear speed.'
  },
  'ancient-core': {
    id: 'ancient-core', name: 'Ancient Core', icon: '🔆', price: 1400, maxLevel: 6,
    description: 'A warm core from a forgotten machine guardian.',
    statPerLevel: { defense: 3, maxHp: 8 },
    special: 'Great for Hard and Nightmare runs.'
  },
  'seraph-feather': {
    id: 'seraph-feather', name: 'Seraph Feather', icon: '🪽', price: 2200, maxLevel: 5,
    description: 'A radiant feather that resonates with final-gate light.',
    statPerLevel: { attack: 4, maxMana: 6 },
    special: 'Late-game artifact for fast S-rank clears.'
  }
};

export const ARTIFACT_ORDER = Object.values(ARTIFACTS);
