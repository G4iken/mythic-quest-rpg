import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Difficulty, ElementType, GameSave, LeaderboardRun, Screen, Toast } from '../types';
import { AREAS, getArea } from '../data/areas';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { CHARACTER_ORDER, canUseCharacter, getCharacter, getUnlockedCharacterIds } from '../data/characters';
import { getPet } from '../data/pets';
import { Joystick, type StickVector } from '../components/Joystick';
import { addRewardItems, getEquippedStats, removeItem } from '../systems/inventory';
import { awardXp } from '../systems/progression';
import { progressQuest } from '../systems/questEngine';
import { audio } from '../services/audioService';
import { submitLeaderboardRun } from '../services/leaderboard';

interface Props {
  save: GameSave;
  go: (screen: Screen) => void;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
  notify: (message: string, kind?: Toast['kind']) => void;
  initialAreaId?: string;
  autoStart?: boolean;
  returnScreen?: Screen;
  towerMode?: boolean;
  practiceMode?: boolean;
}

type Phase = 'menu' | 'explore' | 'bossIntro' | 'boss' | 'clear' | 'defeat';
type ControlKey = 'attack' | 'jump' | 'dash' | 'skill' | 'ultimate' | 'potion';
type PickupKind = 'coin' | 'heart' | 'mana' | 'potion';
type EnemyKind = 'slime' | 'beast' | 'caster' | 'golem' | 'spirit' | 'dragon' | 'boss';

interface Fighter3D {
  id: string;
  sourceId: string;
  name: string;
  kind: EnemyKind;
  x: number;
  z: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackCd: number;
  hurt: number;
  telegraph: number;
  alive: boolean;
  variant: 'normal' | 'elite' | 'swift' | 'armored';
  element: ElementType;
  weakness: ElementType;
  resistance: ElementType;
}

interface Pickup3D {
  id: string;
  kind: PickupKind;
  x: number;
  z: number;
  taken: boolean;
}

interface Hazard3D {
  id: string;
  x: number;
  z: number;
  radius: number;
  tone: 'spikes' | 'fire' | 'rift';
  cooldown: number;
}

interface Crate3D {
  id: string;
  x: number;
  z: number;
  hp: number;
  broken: boolean;
}

interface FloatText3D {
  id: string;
  x: number;
  z: number;
  y: number;
  text: string;
  tone: 'damage' | 'heal' | 'coin' | 'system';
  life: number;
}

interface VfxParticle3D {
  id: string;
  x: number;
  z: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  kind: 'spark' | 'ring' | 'trail' | 'burst';
}

interface Runtime3D {
  phase: Phase;
  areaId: string;
  size: { halfX: number; halfZ: number };
  message: string;
  bannerTimer: number;
  stageTime: number;
  characterId: string;
  towerFloor: number;
  player: {
    x: number;
    z: number;
    y: number;
    vy: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    speed: number;
    facing: number;
    slashTimer: number;
    dashTimer: number;
    dashCd: number;
    skillCd: number;
    ultimate: number;
    invuln: number;
    combo: number;
    maxCombo: number;
    comboTimer: number;
  };
  enemies: Fighter3D[];
  boss: Fighter3D | null;
  pickups: Pickup3D[];
  hazards: Hazard3D[];
  crates: Crate3D[];
  floats: FloatText3D[];
  vfx: VfxParticle3D[];
  kills: number;
  rewardXp: number;
  rewardCoins: number;
  rewardLoot: Array<{ itemId: string; quantity: number }>;
  finishedSaved: boolean;
  potionsUsed: number;
  bossWarned: boolean;
  bossIntroTimer: number;
  bossPhase: 1 | 2;
  cameraShake: number;
  difficulty: Difficulty;
  petId: string;
}

const themeColors: Record<string, { ground: string; fog: string; accent: string; emissive: string; label: string }> = {
  'green-village': { ground: '#2f6f39', fog: '#10271b', accent: '#64d66b', emissive: '#0a5d2e', label: 'Emerald Fields' },
  'forest-path': { ground: '#1f5535', fog: '#08160f', accent: '#2eff89', emissive: '#0d7a3d', label: 'Moonlit Forest' },
  'crystal-cave': { ground: '#183c5f', fog: '#07111d', accent: '#66ddff', emissive: '#115e8a', label: 'Crystal Cavern' },
  'old-ruins': { ground: '#534838', fog: '#17120d', accent: '#ffd37b', emissive: '#6e4d1b', label: 'Ancient Ruins' },
  'lava-mountain': { ground: '#4a1d14', fog: '#1a0503', accent: '#ff5b2e', emissive: '#aa1b0b', label: 'Lava Mountain' },
  'sky-temple': { ground: '#617f93', fog: '#09121c', accent: '#bfeaff', emissive: '#2b83a6', label: 'Sky Temple' },
  'moon-graveyard': { ground: '#36364f', fog: '#0b0b16', accent: '#d9dbff', emissive: '#5961c9', label: 'Moon Graveyard' },
  'abyssal-library': { ground: '#251b48', fog: '#090612', accent: '#a986ff', emissive: '#4d1fc5', label: 'Abyssal Library' },
  'dragon-citadel': { ground: '#4a2419', fog: '#130907', accent: '#ff9a44', emissive: '#9f3214', label: 'Dragon Citadel' },
  'ethereal-gate': { ground: '#2e214a', fog: '#08040e', accent: '#ffc9ff', emissive: '#b44dff', label: 'Ethereal Gate' },
  'frost-harbor': { ground: '#355a72', fog: '#06121c', accent: '#a9f4ff', emissive: '#3fb2ff', label: 'Frost Harbor' },
  'sunken-forge': { ground: '#285456', fog: '#061312', accent: '#67ffd4', emissive: '#2ea895', label: 'Sunken Forge' },
  'astral-throne': { ground: '#2e2558', fog: '#060511', accent: '#ffd6ff', emissive: '#9a62ff', label: 'Astral Throne' }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rng(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function uid() {
  return Math.random().toString(16).slice(2);
}

function dist2(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}


function difficultyConfig(difficulty: Difficulty = 'normal') {
  if (difficulty === 'nightmare') return { hp: 1.65, attack: 1.45, xp: 1.55, coins: 1.5, label: 'Nightmare' };
  if (difficulty === 'hard') return { hp: 1.28, attack: 1.22, xp: 1.25, coins: 1.25, label: 'Hard' };
  return { hp: 1, attack: 1, xp: 1, coins: 1, label: 'Normal' };
}

function elementIcon(element: ElementType) {
  return ({ physical: '⚔️', fire: '🔥', ice: '❄️', storm: '🌩️', earth: '🪨', void: '🟣', light: '✨' } as Record<ElementType, string>)[element];
}

function elementColor(element: ElementType) {
  return ({ physical: '#ffe091', fire: '#ff6732', ice: '#7be7ff', storm: '#e8d75b', earth: '#8cd26a', void: '#b568ff', light: '#fff4a8' } as Record<ElementType, string>)[element];
}

function enemyElementProfile(enemyId: string, areaId: string): { element: ElementType; weakness: ElementType; resistance: ElementType } {
  const text = `${enemyId} ${areaId}`;
  if (text.includes('lava') || text.includes('fire') || text.includes('dragon')) return { element: 'fire', weakness: 'ice', resistance: 'fire' };
  if (text.includes('crystal') || text.includes('cave')) return { element: 'ice', weakness: 'earth', resistance: 'ice' };
  if (text.includes('sky') || text.includes('storm') || text.includes('wind')) return { element: 'storm', weakness: 'earth', resistance: 'storm' };
  if (text.includes('ruin') || text.includes('golem') || text.includes('guardian')) return { element: 'earth', weakness: 'fire', resistance: 'earth' };
  if (text.includes('abyss') || text.includes('void') || text.includes('ether')) return { element: 'void', weakness: 'light', resistance: 'void' };
  if (text.includes('moon')) return { element: 'light', weakness: 'void', resistance: 'light' };
  return { element: 'physical', weakness: 'fire', resistance: 'earth' };
}

function heroElement(characterId: string, path: string): ElementType {
  if (characterId === 'lyra') return 'ice';
  if (characterId === 'kaida') return 'fire';
  if (characterId === 'zeph') return 'storm';
  if (path === 'magic') return 'void';
  if (path === 'guardian') return 'earth';
  return 'physical';
}

function elementMultiplier(attackElement: ElementType, target: Pick<Fighter3D, 'weakness' | 'resistance'>) {
  if (attackElement === target.weakness) return 1.35;
  if (attackElement === target.resistance) return .72;
  return 1;
}

function variantFor(index: number, areaId: string, difficulty: Difficulty = 'normal'): Fighter3D['variant'] {
  const eliteChance = difficulty === 'nightmare' ? 0.35 : difficulty === 'hard' ? 0.2 : 0.1;
  const seed = Math.sin(index * 12.9898 + areaIndex(areaId) * 78.233) * 43758.5453 % 1;
  if (seed < eliteChance && areaIndex(areaId) >= 1) return 'elite';
  if (index % 5 === 0) return 'swift';
  if (index % 4 === 0) return 'armored';
  return 'normal';
}

function applyVariantAndDifficulty(enemy: Fighter3D, areaId: string, index: number, difficulty: Difficulty, towerFloor: number = 1): Fighter3D {
  const variant = variantFor(index, areaId, difficulty);
  const element = enemyElementProfile(enemy.sourceId, areaId);
  const diff = difficultyConfig(difficulty);
  const hpVariant = variant === 'elite' ? 1.35 : variant === 'armored' ? 1.18 : 1;
  const atkVariant = variant === 'elite' ? 1.22 : variant === 'swift' ? 1.08 : 1;
  const speedVariant = variant === 'swift' ? 1.35 : variant === 'armored' ? .82 : 1;
  return {
    ...enemy,
    variant,
    ...element,
    hp: Math.round(enemy.hp * diff.hp * hpVariant),
    maxHp: Math.round(enemy.maxHp * diff.hp * hpVariant),
    attack: Math.round(enemy.attack * diff.attack * atkVariant),
    speed: enemy.speed * speedVariant
  };
}

function materialForElement(element: ElementType) {
  return ({ physical: 'slime-gel', fire: 'dragon-scale', ice: 'crystal-shard', storm: 'wolf-fang', earth: 'crystal-shard', void: 'void-ink', light: 'moon-essence' } as Record<ElementType, string>)[element];
}

function areaIndex(areaId: string) {
  return Math.max(0, AREAS.findIndex(area => area.id === areaId));
}

function enemyKind(enemyId: string): EnemyKind {
  if (ENEMIES[enemyId]?.isBoss) return 'boss';
  if (enemyId.includes('dragon') || enemyId.includes('drake')) return 'dragon';
  if (enemyId.includes('golem') || enemyId.includes('guardian') || enemyId.includes('knight')) return 'golem';
  if (enemyId.includes('mage') || enemyId.includes('spirit') || enemyId.includes('wraith') || enemyId.includes('ether')) return 'caster';
  if (enemyId.includes('beast') || enemyId.includes('wolf') || enemyId.includes('rat')) return 'beast';
  return 'slime';
}

function makeEnemy(enemyId: string, x: number, z: number, index: number): Fighter3D {
  const data = ENEMIES[enemyId];
  const boss = data.isBoss;
  const scale = boss ? 1.45 : .9;
  return {
    id: `${enemyId}-${index}-${uid()}`,
    sourceId: enemyId,
    name: data.name,
    kind: boss ? 'boss' : enemyKind(enemyId),
    x,
    z,
    y: 0,
    hp: Math.max(1, Math.round(data.maxHp * scale)),
    maxHp: Math.max(1, Math.round(data.maxHp * scale)),
    attack: data.attack,
    defense: data.defense,
    speed: boss ? 3.8 : rng(3.8, 5.4),
    attackCd: rng(.4, 1.4),
    hurt: 0,
    telegraph: 0,
    alive: true,
    variant: 'normal',
    element: 'physical',
    weakness: 'storm',
    resistance: 'earth'
  };
}

function pickLoot(enemyId: string) {
  const enemy = ENEMIES[enemyId];
  const loot: Array<{ itemId: string; quantity: number }> = [];
  enemy.lootTable.forEach(drop => {
    if (Math.random() <= drop.chance) loot.push({ itemId: drop.itemId, quantity: Math.floor(rng(drop.min, drop.max + 1)) });
  });
  return loot;
}

function mergeLoot(loot: Array<{ itemId: string; quantity: number }>) {
  return loot.reduce<Array<{ itemId: string; quantity: number }>>((items, item) => {
    const existing = items.find(next => next.itemId === item.itemId);
    if (existing) existing.quantity += item.quantity;
    else items.push({ ...item });
    return items;
  }, []);
}

function getUsablePotion(save: GameSave) {
  const potionIds = ['phoenix-elixir', 'large-health-potion', 'swift-tonic', 'medium-health-potion', 'small-health-potion'];
  return potionIds.find(id => (save.inventory.find(item => item.itemId === id)?.quantity ?? 0) > 0);
}

function gradeRun(time: number, hpPercent: number, combo: number) {
  let score = 0;
  if (time < 105) score += 2;
  else if (time < 150) score += 1;
  if (hpPercent > .7) score += 2;
  else if (hpPercent > .35) score += 1;
  if (combo >= 12) score += 2;
  else if (combo >= 7) score += 1;
  return score >= 5 ? 'S' : score >= 4 ? 'A' : score >= 2 ? 'B' : 'C';
}

function createRuntime(save: GameSave, forcedAreaId?: string, towerFloor = 1): Runtime3D {
  const areaId = forcedAreaId ?? save.player.currentAreaId ?? 'green-village';
  const difficulty = save.settings.difficulty ?? 'normal';
  const area = getArea(areaId);
  const idx = areaIndex(areaId);
  const stats = getEquippedStats(save);
  const character = getCharacter(save.player.characterId);
  const pet = getPet(save.player.activePetId);
  const towerScale = Math.max(1, Math.min(3, 1 + towerFloor * 0.14));
  const baseMult = difficulty === 'nightmare' ? 1.75 : difficulty === 'hard' ? 1.375 : 1;
  const enemyCount = Math.min(26, Math.floor((8 + Math.floor(idx * 1.45) + Math.floor(towerFloor / 2)) * baseMult));
  const spreadX = 11 + idx * .65 + towerFloor * .12;
  const enemies = Array.from({ length: enemyCount }, (_, index) => {
    const enemyId = area.normalEnemyIds[index % area.normalEnemyIds.length];
    const row = index % 3 - 1;
    return applyVariantAndDifficulty(makeEnemy(enemyId, rng(-spreadX, spreadX) + (index % 2 ? 2.5 : -2.5), row * 4.2 + rng(-.6, .6), index), areaId, index, difficulty, towerFloor);
  });
  const pickups = Array.from({ length: 6 + Math.min(5, idx) }, (_, index) => ({
    id: `pickup-${index}-${uid()}`,
    kind: (['coin', 'heart', 'mana', index % 3 === 0 ? 'potion' : 'coin'] as PickupKind[])[index % 4],
    x: rng(-14, 14),
    z: rng(-8, 8),
    taken: false
  }));
  const crates = Array.from({ length: 4 + Math.min(5, Math.floor(idx / 2)) }, (_, index) => ({
    id: `crate-${index}-${uid()}`,
    x: rng(-15, 15),
    z: rng(-8.5, 8.5),
    hp: 2,
    broken: false
  }));
  const hazards = Array.from({ length: idx > 1 ? Math.min(8, 2 + Math.floor(idx / 2)) : 0 }, (_, index) => ({
    id: `hazard-${index}-${uid()}`,
    x: rng(-14, 14),
    z: rng(-8, 8),
    radius: rng(1.05, 1.6),
    tone: idx > 7 ? 'rift' as const : idx > 3 ? 'fire' as const : 'spikes' as const,
    cooldown: 0
  }));
  return {
    phase: 'menu',
    areaId,
    size: { halfX: 19.5 + towerFloor * .75, halfZ: 11.2 + towerFloor * .4 },
    message: towerFloor > 1 ? `Tower Floor ${towerFloor} ready. Survive stronger foes and advance.` : '3D action stage ready. Clear monsters, open the boss gate, then return to village.',
    bannerTimer: 2.8,
    stageTime: 0,
    characterId: character.id,
    player: {
      x: -15,
      z: 0,
      y: 0,
      vy: 0,
      hp: Math.min(save.player.hp, stats.maxHp),
      maxHp: stats.maxHp,
      mana: Math.min(save.player.mana, stats.maxMana),
      maxMana: stats.maxMana,
      attack: stats.attack,
      defense: stats.defense,
      speed: 6.2 + character.speedBonus / 48 + (pet.statBonus.speed ?? 0),
      facing: 0,
      slashTimer: 0,
      dashTimer: 0,
      dashCd: 0,
      skillCd: 0,
      ultimate: 0,
      invuln: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0
    },
    enemies,
    boss: null,
    pickups,
    hazards,
    crates,
    floats: [],
    vfx: [],
    kills: 0,
    rewardXp: 0,
    rewardCoins: 0,
    rewardLoot: [],
    finishedSaved: false,
    potionsUsed: 0,
    bossWarned: false,
    bossIntroTimer: 0,
    bossPhase: 1,
    cameraShake: 0,
    towerFloor,
    difficulty,
    petId: pet.id
  };
}

function pct(current: number, max: number) {
  return `${Math.round(clamp(current / Math.max(1, max), 0, 1) * 100)}%`;
}

function controlLabel(key: ControlKey) {
  if (key === 'attack') return 'SLASH';
  if (key === 'jump') return 'JUMP';
  if (key === 'dash') return 'DASH';
  if (key === 'skill') return 'SKILL';
  if (key === 'ultimate') return 'ULT';
  return 'POTION';
}

function getGatePosition() {
  return { x: 17.1, z: 0 };
}

export function Stage3DActionScreen({ save, go, updateSave, notify, initialAreaId, autoStart = false, returnScreen = 'village', towerMode = false, practiceMode = false }: Props) {
  const startingAreaId = initialAreaId ?? save.player.currentAreaId ?? 'green-village';
  const [selectedAreaId, setSelectedAreaId] = useState(startingAreaId);
  const runtimeRef = useRef<Runtime3D>(createRuntime(save, startingAreaId, towerMode ? (save.player.towerBestFloor ? save.player.towerBestFloor + 1 : 1) : 1));
  const stickRef = useRef<StickVector>({ x: 0, y: 0 });
  const keyboardRef = useRef<StickVector>({ x: 0, y: 0 });
  const actionRef = useRef<(key: ControlKey) => void>(() => undefined);
  const [, forceRender] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showGuide, setShowGuide] = useState(!(save.settings.touchTutorialSeen ?? false));
  const [photoMode, setPhotoMode] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const runtime = runtimeRef.current;
  const area = getArea(runtime.areaId);
  const theme = themeColors[runtime.areaId] ?? themeColors['green-village'];
  const character = getCharacter(runtime.characterId);
  const pet = getPet(runtime.petId);
  const reduceMotion = save.settings.reduceMotion;
  const unlockedAreas = useMemo(() => AREAS.filter(next => save.player.unlockedAreaIds.includes(next.id)), [save.player.unlockedAreaIds]);
  const unlockedCharacterIds = useMemo(() => getUnlockedCharacterIds(save), [save]);
  const potionId = getUsablePotion(save);
  const livingEnemies = runtime.enemies.filter(enemy => enemy.alive).length;
  const bossPct = runtime.boss ? pct(runtime.boss.hp, runtime.boss.maxHp) : '0%';
  const gateOpen = livingEnemies === 0 && runtime.phase !== 'boss';

  useEffect(() => {
    const nextAreaId = initialAreaId ?? save.player.currentAreaId ?? selectedAreaId;
    const floor = towerMode ? (save.player.towerBestFloor ? save.player.towerBestFloor + 1 : 1) : 1;
    const nextRuntime = createRuntime(save, nextAreaId, towerMode ? floor : 1);
    if (autoStart) {
      nextRuntime.phase = 'explore';
      if (towerMode) {
        nextRuntime.message = `Tower Floor ${nextRuntime.towerFloor}: survive the gauntlet and beat the guardian boss.`;
      } else if (practiceMode) {
        nextRuntime.message = `Practice ${getArea(nextAreaId).name}: test builds and learn the boss pattern. No rewards are saved.`;
      } else {
        const difficulty = save.settings.difficulty ?? 'normal';
        const diffLabel = difficultyConfig(difficulty).label;
        const eliteChance = difficulty === 'nightmare' ? 35 : difficulty === 'hard' ? 20 : 10;
        nextRuntime.message = `${getArea(nextAreaId).name} • ${diffLabel} (${eliteChance}% elite): clear monsters, collect loot, then enter the boss gate.`;
      }
      nextRuntime.bannerTimer = 3;
      audio.startMusic('battle');
    }
    runtimeRef.current = nextRuntime;
    setSelectedAreaId(nextAreaId);
    forceRender(value => value + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.saveSlotId, save.player.characterId, initialAreaId, autoStart, towerMode, practiceMode, save.player.towerBestFloor]);

  actionRef.current = action;

  useEffect(() => {
    const pressed = new Set<string>();
    const movementCodes = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const actionCodes: Partial<Record<string, ControlKey>> = {
      Space: 'jump',
      KeyJ: 'attack',
      KeyK: 'dash',
      KeyL: 'skill',
      KeyU: 'ultimate',
      KeyP: 'potion'
    };

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    }

    function recalc() {
      const x = Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft'));
      const y = Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
      const len = Math.hypot(x, y);
      keyboardRef.current = len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    }

    function resetMovement() {
      pressed.clear();
      keyboardRef.current = { x: 0, y: 0 };
    }

    function down(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (movementCodes.has(event.code)) {
        event.preventDefault();
        pressed.add(event.code);
        recalc();
        return;
      }

      const mappedAction = actionCodes[event.code];
      if (mappedAction) {
        event.preventDefault();
        if (!event.repeat) actionRef.current(mappedAction);
        return;
      }

      if (event.code === 'Escape') {
        event.preventDefault();
        setPhotoMode(false);
        setPaused(value => !value);
      }
    }

    function up(event: KeyboardEvent) {
      if (!movementCodes.has(event.code)) return;
      event.preventDefault();
      pressed.delete(event.code);
      recalc();
    }

    function visibilityReset() {
      if (document.hidden) resetMovement();
    }

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', resetMovement);
    document.addEventListener('visibilitychange', visibilityReset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', resetMovement);
      document.removeEventListener('visibilitychange', visibilityReset);
    };
  }, []);

  function addFloat(x: number, z: number, y: number, text: string, tone: FloatText3D['tone'] = 'damage') {
    runtimeRef.current.floats.push({ id: uid(), x, z, y, text, tone, life: 1 });
  }

  function setMessage(message: string, seconds = 1.75) {
    const r = runtimeRef.current;
    r.message = message;
    r.bannerTimer = seconds;
  }

  function addCombo(amount = 1) {
    const p = runtimeRef.current.player;
    p.combo = Math.min(99, p.combo + amount);
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    p.comboTimer = 2.2;
  }

  function chargeUltimate(amount: number) {
    const p = runtimeRef.current.player;
    const multiplier = character.id === 'zeph' ? 1.25 : 1;
    p.ultimate = Math.min(100, p.ultimate + amount * multiplier);
  }

  function addVfx(x: number, z: number, color: string, kind: VfxParticle3D['kind'] = 'spark', amount = 8) {
    const r = runtimeRef.current;
    if (reduceMotion) amount = Math.min(amount, 4);
    Array.from({ length: amount }).forEach(() => r.vfx.push({ id: uid(), x: x + rng(-.55, .55), z: z + rng(-.55, .55), y: rng(.3, 2.2), radius: rng(.08, .25), color, life: rng(.35, .9), kind }));
  }

  function damageEnemy(enemy: Fighter3D, amount: number, critical = false, attackElement: ElementType = 'physical') {
    const r = runtimeRef.current;
    if (!enemy.alive) return;
    const multiplier = elementMultiplier(attackElement, enemy);
    const damage = Math.max(1, Math.round(amount * multiplier - enemy.defense * .36));
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hurt = .28;
    r.cameraShake = Math.max(r.cameraShake, critical ? .22 : .12);
    addFloat(enemy.x, enemy.z, 2.4, multiplier > 1 ? `WEAK ${damage}` : multiplier < 1 ? `RESIST ${damage}` : critical ? `CRIT ${damage}` : `${damage}`, multiplier > 1 || critical ? 'coin' : 'damage');
    addVfx(enemy.x, enemy.z, elementColor(attackElement), multiplier > 1 ? 'burst' : 'spark', critical ? 14 : 8);
    chargeUltimate(critical ? 8 : 5);
    addCombo(1);
    if (enemy.hp <= 0) {
      enemy.alive = false;
      const data = ENEMIES[enemy.sourceId];
      const loot = pickLoot(enemy.sourceId);
      const petBonus = getPet(r.petId).statBonus.lootFind ?? 0;
      const eliteBonus = enemy.variant === 'elite' ? 1.5 : 1;
      r.kills += enemy.kind === 'boss' ? 0 : 1;
      const diff = difficultyConfig(r.difficulty);
      r.rewardXp += Math.round(data.xpReward * diff.xp * eliteBonus);
      r.rewardCoins += Math.round(data.coinReward * diff.coins * eliteBonus);
      if (Math.random() < Math.min(.95, (enemy.variant === 'elite' ? .85 : .45) + petBonus)) loot.push({ itemId: materialForElement(enemy.element), quantity: enemy.kind === 'boss' ? 2 : 1 });
      if (enemy.variant === 'elite' && Math.random() < .35) loot.push({ itemId: materialForElement(enemy.element), quantity: 1 });
      r.rewardLoot = mergeLoot([...r.rewardLoot, ...loot]);
      chargeUltimate(enemy.kind === 'boss' ? 40 : 15);
      audio.playSfx(enemy.kind === 'boss' ? 'victory' : 'kill');
      const msg = enemy.variant === 'elite' ? `+${Math.round(data.xpReward * eliteBonus)} XP (ELITE)` : `+${data.xpReward} XP`;
      addFloat(enemy.x, enemy.z, 3.0, msg, 'system');
      if (enemy.kind !== 'boss' && r.enemies.every(next => !next.alive)) setMessage('All monsters cleared. The 3D boss gate is open!', 2.5);
    }
  }

  function playerDamage(amount: number, sourceX: number, sourceZ: number) {
    const r = runtimeRef.current;
    const p = r.player;
    if (p.invuln > 0 || r.phase === 'clear' || r.phase === 'defeat') return;
    const guardBonus = character.id === 'borin' ? .82 : 1;
    const damage = Math.max(2, Math.round((amount - p.defense * .42) * guardBonus));
    p.hp = Math.max(0, p.hp - damage);
    p.invuln = .7;
    p.combo = 0;
    const angle = Math.atan2(p.z - sourceZ, p.x - sourceX);
    p.x = clamp(p.x + Math.cos(angle) * .85, -r.size.halfX, r.size.halfX);
    p.z = clamp(p.z + Math.sin(angle) * .85, -r.size.halfZ, r.size.halfZ);
    r.cameraShake = .26;
    addFloat(p.x, p.z, 2.4, `-${damage}`, 'damage');
    if ((save.settings.hapticsEnabled ?? true) && 'vibrate' in navigator) navigator.vibrate?.(35);
    audio.playSfx('enemyAttack');
    if (p.hp <= 0) {
      r.phase = 'defeat';
      setMessage('Defeated. Return to the 3D village, upgrade, and try again.', 3);
      audio.playSfx('defeat');
    }
  }

  function startStage(areaId = selectedAreaId) {
    const target = getArea(areaId);
    if (!save.player.unlockedAreaIds.includes(areaId) || save.player.level < target.requiredLevel) {
      notify(`Locked: ${target.unlockCondition}`, 'warning');
      return;
    }
    const floor = towerMode ? (save.player.towerBestFloor ? save.player.towerBestFloor + 1 : 1) : 1;
    const difficulty = save.settings.difficulty ?? 'normal';
    const diffLabel = difficultyConfig(difficulty).label;
    const eliteChance = difficulty === 'nightmare' ? 35 : difficulty === 'hard' ? 20 : 10;
    runtimeRef.current = createRuntime(save, areaId, floor);
    runtimeRef.current.phase = 'explore';
    runtimeRef.current.message = towerMode
      ? `Tower Floor ${floor}: test your build and beat the guardian boss.`
      : practiceMode
        ? `${target.name} Practice: no rewards are saved, only patterns and combos.`
        : `${target.name} • ${diffLabel} (${eliteChance}% elite): clear monsters, collect loot, then enter the boss gate.`;
    setSelectedAreaId(areaId);
    setPaused(false);
    audio.startMusic('battle');
    audio.playSfx('click');
    forceRender(value => value + 1);
  }

  function returnToVillage() {
    setPaused(false);
    stickRef.current = { x: 0, y: 0 };
    keyboardRef.current = { x: 0, y: 0 };
    audio.startMusic('village');
    go(autoStart ? returnScreen : 'village');
  }

  function chooseCharacter(characterId: string) {
    if (!canUseCharacter(save, characterId)) return notify('Unlock this hero in the shop or later in the story first.', 'warning');
    const next = { ...save, player: { ...save.player, characterId } };
    updateSave(next, true);
    runtimeRef.current = createRuntime(next, selectedAreaId);
    notify(`${getCharacter(characterId).name} selected.`, 'success');
  }

  function usePotion() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'explore' && r.phase !== 'boss') return;
    if (!potionId) return setMessage('No healing potion in your bag.', 1.3);
    if (p.hp >= p.maxHp && p.mana >= p.maxMana) return setMessage('HP and mana are already full.', 1.2);
    r.potionsUsed += 1;
    const item = ITEMS[potionId];
    const healBoost = character.id === 'lyra' ? 1.22 : 1;
    const restoreHp = Math.round((item.hpRestore ?? 35) * healBoost);
    const restoreMp = item.manaRestore ?? 0;
    p.hp = Math.min(p.maxHp, p.hp + restoreHp);
    p.mana = Math.min(p.maxMana, p.mana + restoreMp);
    addFloat(p.x, p.z, 2.3, `+${restoreHp}`, 'heal');
    audio.playSfx('heal');
    updateSave({ ...save, inventory: removeItem(save.inventory, potionId, 1), player: { ...save.player, hp: p.hp, mana: p.mana } }, false);
  }

  function slashAttack() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'explore' && r.phase !== 'boss') return;
    if (p.slashTimer > .08) return;
    p.slashTimer = .26;
    const range = character.id === 'kaida' ? 3.4 : character.id === 'borin' ? 2.4 : 2.9;
    const base = p.attack * rng(.88, 1.22) + p.combo * (character.id === 'nyx' ? 3 : 2);
    const critical = Math.random() < (character.id === 'nyx' ? .24 : .16);
    const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
    let hit = false;
    targets.forEach(enemy => {
      if (!enemy.alive) return;
      const dx = enemy.x - p.x;
      const dz = enemy.z - p.z;
      const distance = Math.hypot(dx, dz);
      const angleToEnemy = Math.atan2(dz, dx);
      const facingDifference = Math.abs(Math.atan2(Math.sin(angleToEnemy - p.facing), Math.cos(angleToEnemy - p.facing)));
      if (distance < (critical ? range + .65 : range) && facingDifference < Math.PI * .67) {
        hit = true;
        damageEnemy(enemy, base * (critical ? 1.85 : 1), critical);
      }
    });
    r.crates.forEach(crate => {
      if (crate.broken) return;
      if (dist2(crate, p) < range) {
        hit = true;
        crate.hp -= 1;
        addFloat(crate.x, crate.z, 1.8, 'CRACK', 'system');
        if (crate.hp <= 0) {
          crate.broken = true;
          r.pickups.push({ id: `crate-loot-${uid()}`, kind: Math.random() < .5 ? 'coin' : 'heart', x: crate.x, z: crate.z, taken: false });
          audio.playSfx('coin');
        }
      }
    });
    audio.playSfx(hit ? 'attack' : 'defend');
  }

  function castSkill() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'explore' && r.phase !== 'boss') return;
    if (p.skillCd > 0) return setMessage('Skill is cooling down.', 1.1);
    const cost = character.id === 'lyra' ? 10 : 12;
    if (p.mana < cost) return setMessage('Not enough mana.', 1.1);
    p.mana -= cost;
    p.skillCd = character.id === 'nyx' ? 1.35 : 2;
    p.slashTimer = .42;
    const radius = character.id === 'lyra' ? 6.4 : character.id === 'zeph' ? 7 : character.id === 'borin' ? 4.8 : 5.5;
    const multiplier = character.id === 'kaida' ? 2.75 : character.id === 'lyra' ? 2.6 : character.id === 'borin' ? 2.1 : 2.25;
    const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
    let hits = 0;
    targets.forEach(enemy => {
      if (!enemy.alive) return;
      if (dist2(enemy, p) < radius) {
        hits += 1;
        damageEnemy(enemy, p.attack * multiplier, true, heroElement(character.id, save.player.skillTree?.activePath ?? 'blade'));
      }
    });
    addFloat(p.x, p.z, 3.2, hits ? `${elementIcon(heroElement(character.id, save.player.skillTree?.activePath ?? 'blade'))} ${character.skillName.toUpperCase()}` : 'MISS', hits ? 'system' : 'damage');
    addVfx(p.x, p.z, elementColor(heroElement(character.id, save.player.skillTree?.activePath ?? 'blade')), 'ring', 18);
    r.cameraShake = .2;
    if ((save.settings.hapticsEnabled ?? true) && 'vibrate' in navigator) navigator.vibrate?.([18, 30, 18]);
    audio.playSfx('skill');
  }

  function ultimate() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'explore' && r.phase !== 'boss') return;
    if (p.ultimate < 100) return setMessage('Ultimate is not ready yet.', 1.1);
    p.ultimate = 0;
    p.invuln = 1.1;
    p.slashTimer = .62;
    const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
    targets.forEach(enemy => {
      if (!enemy.alive) return;
      if (dist2(enemy, p) < 11 || r.phase === 'boss') damageEnemy(enemy, p.attack * 4.5, true, character.id === 'zeph' ? 'storm' : 'light');
    });
    addFloat(p.x, p.z, 3.5, `${character.skillName} MAX`, 'coin');
    addVfx(p.x, p.z, elementColor(character.id === 'zeph' ? 'storm' : 'light'), 'burst', 30);
    setMessage(`${character.name}'s ultimate fills the 3D arena!`, 1.9);
    r.cameraShake = .5;
    if ((save.settings.hapticsEnabled ?? true) && 'vibrate' in navigator) navigator.vibrate?.([30, 30, 50]);
    audio.playSfx('levelUp');
  }

  function dash() {
    const r = runtimeRef.current;
    const p = r.player;
    if (p.dashCd > 0 || (r.phase !== 'explore' && r.phase !== 'boss')) return;
    const dashBoost = character.id === 'nyx' ? 1.25 : 1;
    p.dashTimer = .2;
    p.dashCd = character.id === 'nyx' ? .55 : .78;
    p.invuln = Math.max(p.invuln, .22);
    p.x = clamp(p.x + Math.cos(p.facing) * 3.6 * dashBoost, -r.size.halfX, r.size.halfX);
    p.z = clamp(p.z + Math.sin(p.facing) * 3.6 * dashBoost, -r.size.halfZ, r.size.halfZ);
    audio.playSfx('defend');
  }

  function jump() {
    const r = runtimeRef.current;
    if (r.phase !== 'explore' && r.phase !== 'boss') return;
    const p = r.player;
    if (p.y > .05 || Math.abs(p.vy) > .01) return;
    p.vy = 8 + getCharacter(r.characterId).jumpBonus / 45;
    audio.playSfx('click');
  }

  function action(key: ControlKey) {
    if (pausedRef.current) return;
    if (key === 'attack') slashAttack();
    if (key === 'jump') jump();
    if (key === 'dash') dash();
    if (key === 'skill') castSkill();
    if (key === 'ultimate') ultimate();
    if (key === 'potion') usePotion();
  }

  function finishClear() {
    const r = runtimeRef.current;
    if (r.finishedSaved) return;
    const stageArea = getArea(r.areaId);
    const isTower = towerMode;
    const isPractice = practiceMode;
    r.finishedSaved = true;
    const grade = gradeRun(r.stageTime, r.player.hp / Math.max(1, r.player.maxHp), r.player.maxCombo);
    const stars = { noPotion: r.potionsUsed === 0, sRank: grade === 'S', comboMaster: r.player.maxCombo >= 12 };
    let next: GameSave = save;

    if (isPractice) {
      next = {
        ...save,
        player: {
          ...save.player,
          practiceModeClears: {
            ...(save.player.practiceModeClears ?? {}),
            [r.areaId]: (save.player.practiceModeClears?.[r.areaId] ?? 0) + 1
          },
          telemetry: {
            ...(save.player.telemetry ?? { deaths: 0, potionsUsed: 0, totalKills: 0, totalCoins: 0, totalPlaySeconds: 0, bossPracticeClears: 0, challengeClears: 0 }),
            bossPracticeClears: (save.player.telemetry?.bossPracticeClears ?? 0) + 1
          }
        }
      };
      updateSave(next, false);
      notify(`Practice clear recorded for ${stageArea.name}. No rewards saved.`, 'info');
    } else {
      next = {
        ...save,
        player: {
          ...save.player,
          hp: Math.max(1, Math.round(r.player.hp)),
          mana: Math.max(0, Math.round(r.player.mana)),
          coins: save.player.coins + r.rewardCoins,
          currentAreaId: isTower ? save.player.currentAreaId : r.areaId,
          bossesDefeated: isTower
            ? save.player.bossesDefeated
            : save.player.bossesDefeated.includes(stageArea.bossId) ? save.player.bossesDefeated : [...save.player.bossesDefeated, stageArea.bossId],
          unlockedAreaIds: isTower
            ? save.player.unlockedAreaIds
            : stageArea.nextAreaId && !save.player.unlockedAreaIds.includes(stageArea.nextAreaId) ? [...save.player.unlockedAreaIds, stageArea.nextAreaId] : save.player.unlockedAreaIds,
          bestStageScores: { ...(save.player.bestStageScores ?? {}), [r.areaId]: { grade, clearTime: Math.round(r.stageTime), kills: r.kills, combo: r.player.maxCombo } },
          starObjectives: { ...(save.player.starObjectives ?? {}), [r.areaId]: stars },
          storyFlags: [...new Set([...(save.player.storyFlags ?? []), `cleared-${r.areaId}`])],
          telemetry: {
            ...(save.player.telemetry ?? { deaths: 0, potionsUsed: 0, totalKills: 0, totalCoins: 0, totalPlaySeconds: 0, bossPracticeClears: 0, challengeClears: 0 }),
            potionsUsed: (save.player.telemetry?.potionsUsed ?? 0) + r.potionsUsed,
            totalKills: (save.player.telemetry?.totalKills ?? 0) + r.kills + 1,
            totalCoins: (save.player.telemetry?.totalCoins ?? 0) + r.rewardCoins,
            totalPlaySeconds: (save.player.telemetry?.totalPlaySeconds ?? 0) + Math.round(r.stageTime),
            challengeClears: (save.player.telemetry?.challengeClears ?? 0) + (r.areaId.includes('daily') ? 1 : 0),
            deaths: save.player.telemetry?.deaths ?? 0,
            bossPracticeClears: save.player.telemetry?.bossPracticeClears ?? 0
          },
          guildAffinity: { ...(save.player.guildAffinity ?? {}), blacksmith: (save.player.guildAffinity?.blacksmith ?? 0) + 1, elder: (save.player.guildAffinity?.elder ?? 0) + 1 },
          towerBestFloor: isTower ? Math.max(save.player.towerBestFloor ?? 0, r.towerFloor) : save.player.towerBestFloor
        },
        areaProgress: save.areaProgress.map(progress => progress.areaId === r.areaId ? { ...progress, normalWins: progress.normalWins + 1, bossDefeated: true } : progress)
      };
      next = addRewardItems(next, r.rewardLoot);
      next = progressQuest(next, 'defeat_enemy', r.kills);
      r.rewardLoot.forEach(item => { next = progressQuest(next, 'collect_item', item.quantity, item.itemId); });
      next = progressQuest(next, 'defeat_boss', 1, stageArea.bossId);
      const xpResult = awardXp(next, r.rewardXp);
      next = xpResult.save;
      updateSave(next, true);
      if (xpResult.leveledUp) audio.playSfx('levelUp');
      if (stageArea.bossId === 'lava-dragon') notify('Story hero unlocked: Kaida the Flame Samurai.', 'success');
      if (stageArea.bossId === 'storm-titan') notify('Story hero unlocked: Zeph the Storm Knight.', 'success');
      if (stageArea.bossId === 'void-librarian') notify('Story hero unlocked: Vex the Void Duelist.', 'success');
      if (!isPractice) {
        const boardRun: LeaderboardRun = { id: `${save.accountId}-${r.areaId}-${Date.now()}`, areaId: r.areaId, playerName: save.player.name, heroName: character.name, grade, clearTime: Math.round(r.stageTime), combo: r.player.maxCombo, kills: r.kills, difficulty: r.difficulty, createdAt: new Date().toISOString() };
        void submitLeaderboardRun(boardRun).catch(() => undefined);
      }
      notify(`3D stage cleared! Grade ${grade} • Stars ${Object.values(stars).filter(Boolean).length}/3 • +${r.rewardXp} XP • +${r.rewardCoins} coins`, 'success');
    }
  }

  return (
    <section className={`all3d-stage-screen theme-${runtime.areaId} ${photoMode ? 'photo-mode' : ''} ${save.settings.biggerUi ? 'access-bigger-ui' : ''} ${save.settings.colorblindBars ? 'access-colorblind-bars' : ''} ${reduceMotion ? 'access-reduced-motion' : ''}`}> 
      {runtime.phase === 'menu' ? (
        <div className="all3d-stage-menu">
          <p className="eyebrow">Full 3D Action RPG</p>
          <h1>Choose a 3D Gate</h1>
          <p>All gameplay is now 3D: hub, stages, enemies, boss gates, pickups, and combat.</p>
          <div className="all3d-area-grid">
            {unlockedAreas.map(nextArea => (
              <button key={nextArea.id} className={selectedAreaId === nextArea.id ? 'active' : ''} onClick={() => setSelectedAreaId(nextArea.id)}>
                <span>{nextArea.name}</span><small>Lv {nextArea.requiredLevel}</small>
              </button>
            ))}
          </div>
          <div className="all3d-hero-strip">
            {CHARACTER_ORDER.map(hero => (
              <button key={hero.id} className={(save.player.characterId ?? 'wanderer') === hero.id ? 'active' : ''} disabled={!unlockedCharacterIds.includes(hero.id)} onClick={() => chooseCharacter(hero.id)}>
                <span>{hero.icon}</span><small>{hero.name}</small>
              </button>
            ))}
          </div>
          <div className="all3d-menu-actions">
            <button className="primary" onClick={() => startStage(selectedAreaId)}>Enter 3D Stage</button>
            <button onClick={() => go('shop')}>Shop / Heroes</button>
            <button onClick={() => go('village')}>Back to 3D Village</button>
          </div>
        </div>
      ) : (
        <>
          <div className="all3d-canvas-wrap">
            <Canvas shadows camera={{ position: [0, 12, 15], fov: 48 }} dpr={[1, 1.55]}>
              <StageScene runtimeRef={runtimeRef} stickRef={stickRef} keyboardRef={keyboardRef} pausedRef={pausedRef} forceRender={forceRender} addFloat={addFloat} setMessage={setMessage} playerDamage={playerDamage} damageEnemy={damageEnemy} finishClear={finishClear} reduceMotion={reduceMotion} />
            </Canvas>
          </div>

          {!photoMode && <div className="all3d-hud safe-top">
            <div className="all3d-portrait hero-glow"><span>{character.icon}</span></div>
            <div className="all3d-bars">
              <strong>{save.player.name} • {character.name}</strong>
              <div className="all3d-meter hp"><i style={{ width: pct(runtime.player.hp, runtime.player.maxHp) }} /></div>
              <div className="all3d-meter mp"><i style={{ width: pct(runtime.player.mana, runtime.player.maxMana) }} /></div>
              <div className="all3d-meter ult"><i style={{ width: `${Math.round(runtime.player.ultimate)}%` }} /></div>
            </div>
            <div className="all3d-stage-meta"><b>{area.name}</b><small>{difficultyConfig(runtime.difficulty).label} • {theme.label} • Combo {runtime.player.combo} • 🪙 {runtime.rewardCoins}</small></div>
            <button onClick={() => setShowGuide(true)}>Help</button>
            <button onClick={() => setPhotoMode(true)}>Photo</button>
            <button onClick={() => setPaused(true)}>Pause</button>
          </div>}

          {!photoMode && <div className="all3d-companion-panel">
            <div className="all3d-mini-avatar hero">{character.icon}</div>
            <div><b>{character.name}</b><span>{character.title}</span></div>
            <div className="all3d-mini-avatar pet">{pet.icon}</div>
            <div><b>{pet.name}</b><span>{pet.passive}</span></div>
          </div>}

          {!photoMode && <div className="all3d-radar-panel">
            <b>{runtime.phase === 'boss' && runtime.boss ? `${runtime.boss.name}` : `${livingEnemies} monsters left`}</b>
            <span>{runtime.phase === 'boss' && runtime.boss ? `Weak ${elementIcon(runtime.boss.weakness)} • Res ${elementIcon(runtime.boss.resistance)}` : gateOpen ? 'Gate is open' : `Next goal: clear ${area.name}`}</span>
          </div>}
          {!photoMode && towerMode && <div className="all3d-tower-panel">
            <b>Tower Challenge</b>
            <span>Floor {runtime.towerFloor}</span>
            <span>Best Floor: {save.player.towerBestFloor ?? 0}</span>
          </div>}
          {!photoMode && <div className="all3d-minimap">
            <div className="all3d-minimap-title">Minimap</div>
            <div className="all3d-minimap-grid">
              <div className="all3d-minimap-player" style={{ left: `${clamp((runtime.player.x + runtime.size.halfX) / (runtime.size.halfX * 2), 0, 1) * 100}%`, top: `${clamp((runtime.player.z + runtime.size.halfZ) / (runtime.size.halfZ * 2), 0, 1) * 100}%` }} />
              {runtime.boss && <div className="all3d-minimap-boss" style={{ left: `${clamp((runtime.boss.x + runtime.size.halfX) / (runtime.size.halfX * 2), 0, 1) * 100}%`, top: `${clamp((runtime.boss.z + runtime.size.halfZ) / (runtime.size.halfZ * 2), 0, 1) * 100}%` }} />}
              <div className="all3d-minimap-gate" style={{ left: `${clamp((17.1 + runtime.size.halfX) / (runtime.size.halfX * 2), 0, 1) * 100}%`, top: `${clamp((0 + runtime.size.halfZ) / (runtime.size.halfZ * 2), 0, 1) * 100}%` }} />
            </div>
          </div>}

          {!photoMode && (runtime.phase === 'boss' || runtime.phase === 'bossIntro') && runtime.boss && <div className="all3d-boss-bar"><span>{elementIcon(runtime.boss.element)} {runtime.boss.name} • Phase {runtime.bossPhase}{runtime.bossPhase === 2 ? ' (Enraged)' : ''}</span><div><i style={{ width: bossPct }} /></div></div>}
          {!photoMode && runtime.bannerTimer > 0 && <div className="all3d-banner">{runtime.message}</div>}
          {!photoMode && <div className="all3d-objective"><span>{runtime.phase === 'bossIntro' ? 'Boss Intro' : runtime.phase === 'boss' ? 'Boss Fight' : gateOpen ? 'Gate Open' : `Defeat ${livingEnemies} Monsters`}</span><b>{runtime.phase.toUpperCase()}</b><em>{Math.round(runtime.stageTime)}s • Max Combo {runtime.player.maxCombo}</em></div>}

          {!photoMode && <Joystick onMove={vector => { stickRef.current = vector; }} disabled={paused || runtime.phase === 'clear' || runtime.phase === 'defeat'} />}
          {!photoMode && <div className="all3d-action-pad safe-bottom">
            {(['jump', 'attack', 'dash', 'skill', 'ultimate', 'potion'] as ControlKey[]).map(key => <button key={key} className={`${key === 'ultimate' && runtime.player.ultimate >= 100 ? 'ready' : ''}`} onPointerDown={() => action(key)}><span>{controlLabel(key)}</span><small>{key === 'attack' ? 'J' : key === 'dash' ? 'K' : key === 'skill' ? 'L' : key === 'ultimate' ? 'U' : key === 'potion' ? 'P' : 'SPACE'}</small></button>)}
          </div>}

          {photoMode && <div className="photo-mode-tip"><b>Photo Mode</b><span>Press ESC or tap Exit Photo to return.</span><button onClick={() => setPhotoMode(false)}>Exit Photo</button></div>}

          {showGuide && <div className="all3d-overlay-card"><h2>3D Controls</h2><p>Move with joystick or WASD. Rotate your attack direction by moving. Clear all monsters, walk into the glowing gate, defeat the boss, and return to the 3D village.</p><div className="all3d-guide-grid"><span>WASD</span><b>Move</b><span>J</span><b>Slash</b><span>K</span><b>Dash</b><span>L</span><b>Skill</b><span>U</span><b>Ultimate</b><span>P</span><b>Potion</b></div><button className="primary" onClick={() => { setShowGuide(false); if (!(save.settings.touchTutorialSeen ?? false)) updateSave({ ...save, settings: { ...save.settings, touchTutorialSeen: true } }, true); }}>OKAY</button></div>}
          {paused && <div className="all3d-overlay-card"><h2>Paused</h2><p>{area.name} • {livingEnemies} monsters remaining • {character.name}</p><button className="primary" onClick={() => setPaused(false)}>Resume</button><button onClick={returnToVillage}>Return to 3D Village</button><button onClick={() => go('shop')}>Upgrade Shop</button><button onClick={() => go('settings')}>Settings</button><button onClick={() => { setPaused(false); setPhotoMode(true); }}>Photo Mode</button></div>}
          {(runtime.phase === 'clear' || runtime.phase === 'defeat') && <div className="all3d-overlay-card result"><h2>{runtime.phase === 'clear' ? (towerMode ? `Tower Floor ${runtime.towerFloor} Clear!` : '3D Stage Clear!') : 'Defeated'}</h2><p>{runtime.phase === 'clear' ? `Rewards: ${runtime.rewardXp} XP • ${runtime.rewardCoins} coins • Max Combo ${runtime.player.maxCombo}` : 'Return to village, upgrade gear, and try again.'}</p>{runtime.rewardLoot.length > 0 && <small>Loot: {runtime.rewardLoot.map(item => `${ITEMS[item.itemId]?.name ?? item.itemId} x${item.quantity}`).join(', ')}</small>}<div><button className="primary" onClick={returnToVillage}>Back to 3D Village</button><button onClick={() => go('shop')}>Upgrade</button></div></div>}
        </>
      )}
    </section>
  );
}

interface SceneProps {
  runtimeRef: MutableRefObject<Runtime3D>;
  stickRef: MutableRefObject<StickVector>;
  keyboardRef: MutableRefObject<StickVector>;
  pausedRef: MutableRefObject<boolean>;
  forceRender: Dispatch<SetStateAction<number>>;
  addFloat: (x: number, z: number, y: number, text: string, tone?: FloatText3D['tone']) => void;
  setMessage: (message: string, seconds?: number) => void;
  playerDamage: (amount: number, sourceX: number, sourceZ: number) => void;
  damageEnemy: (enemy: Fighter3D, amount: number, critical?: boolean) => void;
  finishClear: () => void;
  reduceMotion: boolean;
}

function StageScene({ runtimeRef, stickRef, keyboardRef, pausedRef, forceRender, addFloat, setMessage, playerDamage, damageEnemy, finishClear, reduceMotion }: SceneProps) {
  const { camera } = useThree();
  const playerGroup = useRef<THREE.Group | null>(null);
  const clock = useRef(0);
  const renderTick = useRef(0);

  useFrame((_, dtRaw) => {
    const dt = Math.min(.033, dtRaw);
    clock.current += dt;
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase === 'bossIntro' && r.boss && !pausedRef.current) {
      r.bossIntroTimer = Math.max(0, r.bossIntroTimer - dt);
      r.cameraShake = Math.max(r.cameraShake, .08);
      r.boss.y = .2 + Math.sin(clock.current * 4) * .12;
      if (r.bossIntroTimer <= 0) {
        r.phase = 'boss';
        setMessage(`${r.boss.name} is vulnerable. Use ${elementIcon(r.boss.weakness)} attacks!`, 1.8);
      }
    }

    const active = (r.phase === 'explore' || r.phase === 'boss') && !pausedRef.current;

    if (active) {
      r.stageTime += dt;
      const moveX = clamp(stickRef.current.x + keyboardRef.current.x, -1, 1);
      const moveZ = clamp(stickRef.current.y + keyboardRef.current.y, -1, 1);
      const len = Math.hypot(moveX, moveZ);
      if (len > .05) {
        const nx = moveX / len;
        const nz = -moveZ / len;
        p.facing = Math.atan2(nz, nx);
        const speed = p.dashTimer > 0 ? p.speed * 1.55 : p.speed;
        p.x = clamp(p.x + nx * speed * dt, -r.size.halfX, r.size.halfX);
        p.z = clamp(p.z + nz * speed * dt, -r.size.halfZ, r.size.halfZ);
      }
      p.vy -= 22 * dt;
      p.y += p.vy * dt;
      if (p.y <= 0) { p.y = 0; p.vy = 0; }
      p.slashTimer = Math.max(0, p.slashTimer - dt);
      p.dashTimer = Math.max(0, p.dashTimer - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.skillCd = Math.max(0, p.skillCd - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.comboTimer = Math.max(0, p.comboTimer - dt);
      if (p.comboTimer <= 0) p.combo = 0;
      p.mana = Math.min(p.maxMana, p.mana + dt * (getCharacter(r.characterId).id === 'lyra' ? 2.6 : 1.8));
      const pet = getPet(r.petId);
      if ((pet.statBonus.regen ?? 0) > 0 && p.hp > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + dt * (pet.statBonus.regen ?? 0));

      r.pickups.forEach(pickup => {
        const pickupRange = r.petId === 'gold-mimic' ? 2.45 : 1.3;
        if (pickup.taken || dist2(pickup, p) > pickupRange) return;
        pickup.taken = true;
        if (pickup.kind === 'coin') { r.rewardCoins += 18 + areaIndex(r.areaId) * 6; addFloat(p.x, p.z, 2.3, '+coins', 'coin'); audio.playSfx('coin'); }
        if (pickup.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 26 + areaIndex(r.areaId) * 3); addFloat(p.x, p.z, 2.3, '+HP', 'heal'); audio.playSfx('heal'); }
        if (pickup.kind === 'mana') { p.mana = Math.min(p.maxMana, p.mana + 20); addFloat(p.x, p.z, 2.3, '+MP', 'heal'); audio.playSfx('heal'); }
        if (pickup.kind === 'potion') { r.rewardLoot = mergeLoot([...r.rewardLoot, { itemId: 'small-health-potion', quantity: 1 }]); addFloat(p.x, p.z, 2.3, '+Potion', 'system'); audio.playSfx('coin'); }
      });

      r.hazards.forEach(hazard => {
        hazard.cooldown = Math.max(0, hazard.cooldown - dt);
        if (hazard.cooldown <= 0 && dist2(hazard, p) < hazard.radius) {
          hazard.cooldown = 1.1;
          playerDamage(18 + areaIndex(r.areaId) * 7, hazard.x, hazard.z);
          addFloat(p.x, p.z, 2.4, hazard.tone.toUpperCase(), 'damage');
        }
      });

      const fighters = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
      fighters.forEach(enemy => {
        if (!enemy.alive) return;
        enemy.attackCd = Math.max(0, enemy.attackCd - dt);
        enemy.hurt = Math.max(0, enemy.hurt - dt);
        enemy.telegraph = Math.max(0, enemy.telegraph - dt);
        const distance = dist2(enemy, p);
        const bossRage = r.phase === 'boss' && enemy.hp < enemy.maxHp * .4;
        if (bossRage && !r.bossWarned) {
          r.bossWarned = true;
          r.bossPhase = 2;
          enemy.speed *= 1.18;
          setMessage(`${enemy.name} entered phase 2. Heavy attacks incoming!`, 2.2);
          addFloat(enemy.x, enemy.z, 3.3, 'ENRAGED', 'coin');
        }
        if (distance > (enemy.kind === 'boss' ? 2.7 : 1.75)) {
          const angle = Math.atan2(p.z - enemy.z, p.x - enemy.x);
          const speed = enemy.speed * (bossRage ? 1.22 : 1);
          enemy.x = clamp(enemy.x + Math.cos(angle) * speed * dt, -r.size.halfX, r.size.halfX);
          enemy.z = clamp(enemy.z + Math.sin(angle) * speed * dt, -r.size.halfZ, r.size.halfZ);
        } else if (enemy.attackCd <= 0) {
          const heavy = enemy.kind === 'boss' && bossRage && Math.random() < .6;
          enemy.attackCd = heavy ? 1.25 : rng(.85, 1.35);
          enemy.telegraph = heavy ? .45 : .18;
          if (heavy) setMessage(`${enemy.name} telegraphs a heavy strike. Dash away!`, 1.15);
          playerDamage(enemy.attack * (heavy ? 1.75 : 1), enemy.x, enemy.z);
          addFloat(enemy.x, enemy.z, 2.6, heavy ? 'HEAVY' : 'HIT', heavy ? 'coin' : 'damage');
        }
      });

      const gate = getGatePosition();
      if (r.phase === 'explore' && r.enemies.every(enemy => !enemy.alive) && dist2(gate, p) < 2.2) {
        let boss = makeEnemy(getArea(r.areaId).bossId, 11, 0, 99);
        boss = applyVariantAndDifficulty(boss, r.areaId, 99, r.difficulty);
        boss.hp = Math.round(boss.maxHp * 1.25);
        boss.maxHp = boss.hp;
        boss.speed += areaIndex(r.areaId) * .1;
        r.boss = boss;
        r.phase = 'bossIntro';
        r.bossPhase = 1;
        r.bossIntroTimer = reduceMotion ? .7 : 2.4;
        r.bossWarned = false;
        setMessage(`Cinematic boss intro: ${boss.name} emerges. Weakness ${elementIcon(boss.weakness)}.`, 3);
        audio.playSfx('enemyAttack');
      }
      if (r.phase === 'boss' && r.boss && !r.boss.alive) {
        r.phase = 'clear';
        r.message = 'Boss defeated! Stage clear. Return to the 3D village.';
        r.bannerTimer = 3;
        finishClear();
      }
    }

    r.floats = r.floats.map(float => ({ ...float, life: float.life - dt, y: float.y + dt * 1.2 })).filter(float => float.life > 0);
    r.vfx = r.vfx.map(vfx => ({ ...vfx, life: vfx.life - dt, y: vfx.y + dt * .8, radius: vfx.radius + dt * .45 })).filter(vfx => vfx.life > 0);
    r.bannerTimer = Math.max(0, r.bannerTimer - dt);
    r.cameraShake = Math.max(0, r.cameraShake - dt);

    const shakeX = r.cameraShake > 0 ? (Math.random() - .5) * r.cameraShake : 0;
    const shakeY = r.cameraShake > 0 ? (Math.random() - .5) * r.cameraShake : 0;
    const target = new THREE.Vector3(p.x, 0, p.z);
    if (r.phase === 'bossIntro' && r.boss) {
      const t = 1 - clamp(r.bossIntroTimer / (reduceMotion ? .7 : 2.4), 0, 1);
      const orbit = t * Math.PI * 1.1;
      const camTarget = new THREE.Vector3(r.boss.x + Math.cos(orbit) * 5 + shakeX, 4.3 + Math.sin(t * Math.PI) * 1.8 + shakeY, r.boss.z + 5.5 + Math.sin(orbit) * 4);
      camera.position.lerp(camTarget, .12);
      camera.lookAt(r.boss.x, 1.4, r.boss.z);
    } else {
      const camTarget = new THREE.Vector3(p.x - 5.8, 8.5 + shakeY, p.z + 11.5 + shakeX);
      camera.position.lerp(camTarget, .08);
      camera.lookAt(target.x + 2.2, 1.2, target.z);
    }

    if (playerGroup.current) {
      playerGroup.current.position.set(p.x, p.y + .07, p.z);
      playerGroup.current.rotation.y = -p.facing + Math.PI / 2;
    }

    renderTick.current += dt;
    if (renderTick.current >= .08) {
      renderTick.current = 0;
      forceRender(value => (value + 1) % 100000);
    }
  });

  const r = runtimeRef.current;
  const theme = themeColors[r.areaId] ?? themeColors['green-village'];
  return (
    <>
      <color attach="background" args={[theme.fog]} />
      <fog attach="fog" args={[theme.fog, 16, 54]} />
      <ambientLight intensity={0.78} />
      <directionalLight position={[4, 12, 5]} intensity={2.2} castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} />
      <pointLight position={[0, 4, 0]} intensity={2.4} color={theme.accent} distance={20} />
      <StageEnvironment areaId={r.areaId} />
      <Player3D player={r.player} characterId={r.characterId} groupRef={playerGroup} />
      <PetCompanion player={r.player} petId={r.petId} />
      {r.enemies.map(enemy => <Enemy3D key={enemy.id} enemy={enemy} player={r.player} />)}
      {r.boss && <Enemy3D enemy={r.boss} player={r.player} boss />}
      {r.pickups.map(pickup => <PickupMesh key={pickup.id} pickup={pickup} />)}
      {r.hazards.map(hazard => <HazardMesh key={hazard.id} hazard={hazard} />)}
      {r.crates.map(crate => <CrateMesh key={crate.id} crate={crate} />)}
      <GateMesh open={r.enemies.every(enemy => !enemy.alive)} active={r.phase === 'boss' || r.phase === 'clear'} areaId={r.areaId} />
      {r.vfx.map(vfx => <VfxMesh key={vfx.id} vfx={vfx} />)}
      {r.floats.map(float => <FloatLabel key={float.id} float={float} />)}
    </>
  );
}

function StageEnvironment({ areaId }: { areaId: string }) {
  const theme = themeColors[areaId] ?? themeColors['green-village'];
  const idx = areaIndex(areaId);
  const trees = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: rng(-20, 20), z: i % 2 ? rng(-13, -9.8) : rng(9.8, 13), s: rng(.8, 1.45) })), [areaId]);
  const stones = useMemo(() => Array.from({ length: 18 }, () => ({ x: rng(-18, 18), z: rng(-9, 9), s: rng(.45, 1.2) })), [areaId]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 30, 24, 16]} />
        <meshStandardMaterial color={theme.ground} roughness={.96} metalness={0.02} />
      </mesh>
      <mesh position={[0, .018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[6.2, 6.5, 72]} />
        <meshStandardMaterial color={theme.accent} transparent opacity={.18} emissive={theme.emissive} emissiveIntensity={.2} />
      </mesh>
      <mesh position={[0, .02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 64]} />
        <meshStandardMaterial color={theme.accent} transparent opacity={.12} emissive={theme.emissive} emissiveIntensity={.25} />
      </mesh>
      <DungeonArchitecture areaId={areaId} />
      {trees.map((tree, i) => idx === 4 ? <LavaRock key={i} position={[tree.x, 0, tree.z]} scale={tree.s} /> : <Tree key={i} position={[tree.x, 0, tree.z]} scale={tree.s} color={idx > 6 ? '#423269' : '#1e7a3b'} />)}
      {stones.map((stone, i) => <Rock key={i} position={[stone.x, .12, stone.z]} scale={stone.s} color={idx === 2 ? '#5cd7ff' : idx > 6 ? '#7b58d8' : '#877b6d'} />)}
      <Ruins areaId={areaId} />
      <Text position={[0, .08, -12.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.1} anchorX="center" color={theme.accent} outlineWidth={0.025} outlineColor="#000000">
        {theme.label}
      </Text>
    </group>
  );
}


function DungeonArchitecture({ areaId }: { areaId: string }) {
  const theme = themeColors[areaId] ?? themeColors['green-village'];
  const idx = areaIndex(areaId);
  const torchColor = idx === 4 ? '#ff5c2f' : idx === 2 ? '#66ddff' : idx > 7 ? '#b96bff' : '#ffc05a';
  const tileColor = idx === 2 ? '#2d5a74' : idx === 4 ? '#643024' : idx > 7 ? '#30224d' : '#3d3a34';
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => <mesh key={`tile-x-${i}`} position={[-18 + i * 4.5, .026, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[4.15, 22]} /><meshStandardMaterial color={i % 2 ? theme.ground : tileColor} transparent opacity={.18} roughness={.98} /></mesh>)}
      {[-11.4, 11.4].map(z => <mesh key={`wall-${z}`} position={[0, 1.15, z]} receiveShadow castShadow><boxGeometry args={[42, 2.3, .85]} /><meshStandardMaterial color="#40372e" roughness={.92} emissive={theme.emissive} emissiveIntensity={.04} /></mesh>)}
      {[-19.8, 19.8].map(x => <mesh key={`side-wall-${x}`} position={[x, .95, 0]} receiveShadow castShadow><boxGeometry args={[.85, 1.9, 23]} /><meshStandardMaterial color="#40372e" roughness={.92} emissive={theme.emissive} emissiveIntensity={.04} /></mesh>)}
      {[-14, -7, 7, 14].map(x => [-10.7, 10.7].map(z => <Torch key={`${x}-${z}`} position={[x, 1.05, z]} color={torchColor} />))}
      {[-11, 0, 11].map(x => <mesh key={`banner-${x}`} position={[x, 1.6, -10.88]} rotation={[0, 0, 0]}><planeGeometry args={[1.2, 1.9]} /><meshStandardMaterial color={theme.accent} emissive={theme.emissive} emissiveIntensity={.25} transparent opacity={.7} side={THREE.DoubleSide} /></mesh>)}
    </group>
  );
}

function Torch({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[.08, .12, .75, 10]} /><meshStandardMaterial color="#382311" roughness={.8} /></mesh>
      <mesh position={[0, .55, 0]}><sphereGeometry args={[.22, 14, 10]} /><meshBasicMaterial color={color} transparent opacity={.75} /></mesh>
      <pointLight color={color} intensity={1.1} distance={5.5} />
    </group>
  );
}

function Tree({ position, scale, color }: { position: [number, number, number]; scale: number; color: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, .55, 0]} castShadow><cylinderGeometry args={[.11, .18, 1.1, 8]} /><meshStandardMaterial color="#6d3c1c" roughness={.9} /></mesh>
      <mesh position={[0, 1.25, 0]} castShadow><coneGeometry args={[.58, 1.28, 12]} /><meshStandardMaterial color={color} roughness={.88} /></mesh>
      <mesh position={[0, 1.75, 0]} castShadow><coneGeometry args={[.42, .96, 12]} /><meshStandardMaterial color={color} roughness={.88} /></mesh>
    </group>
  );
}

function LavaRock({ position, scale }: { position: [number, number, number]; scale: number }) {
  return <mesh position={position} scale={[scale * 1.2, scale * .45, scale]} castShadow><dodecahedronGeometry args={[.7, 0]} /><meshStandardMaterial color="#4c1b14" emissive="#ff2c08" emissiveIntensity={.18} roughness={.78} /></mesh>;
}

function Rock({ position, scale, color }: { position: [number, number, number]; scale: number; color: string }) {
  return <mesh position={position} scale={[scale, scale * .55, scale * .8]} castShadow receiveShadow><dodecahedronGeometry args={[.5, 0]} /><meshStandardMaterial color={color} roughness={.9} /></mesh>;
}

function Ruins({ areaId }: { areaId: string }) {
  const theme = themeColors[areaId] ?? themeColors['green-village'];
  return (
    <group>
      {[-10, 10].map(x => <mesh key={x} position={[x, 1.1, -10]} castShadow><boxGeometry args={[1.1, 2.2, 1.1]} /><meshStandardMaterial color="#5e5144" roughness={.9} emissive={theme.emissive} emissiveIntensity={.06} /></mesh>)}
      {[-15, 15].map(x => <mesh key={x} position={[x, .8, 8.8]} rotation={[0, .3, 0]} castShadow><boxGeometry args={[.9, 1.6, .9]} /><meshStandardMaterial color="#5e5144" roughness={.9} /></mesh>)}
      <mesh position={[0, .7, -10]} castShadow><boxGeometry args={[6, .7, 1]} /><meshStandardMaterial color="#6a5b4c" roughness={.88} /></mesh>
    </group>
  );
}

function Player3D({ player, characterId, groupRef }: { player: Runtime3D['player']; characterId: string; groupRef: RefObject<THREE.Group | null> }) {
  const character = getCharacter(characterId);
  const runBob = Math.sin(performance.now() / 90) * .04;
  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]}>
      <mesh position={[0, .72 + runBob, 0]} castShadow>
        <capsuleGeometry args={[.34, .84, 8, 16]} />
        <meshStandardMaterial color={characterId === 'nyx' ? '#4b46a8' : characterId === 'lyra' ? '#65d5f5' : characterId === 'borin' ? '#8c8a7e' : characterId === 'kaida' ? '#e95826' : characterId === 'zeph' ? '#63f0d5' : '#3279ff'} roughness={.72} metalness={.08} />
      </mesh>
      <mesh position={[0, 1.45 + runBob, 0]} castShadow><sphereGeometry args={[.27, 22, 22]} /><meshStandardMaterial color="#f1c28d" roughness={.8} /></mesh>
      <mesh position={[.35, .98, .03]} rotation={[0, 0, player.slashTimer > 0 ? -1.15 : -.35]} castShadow><boxGeometry args={[.07, 1.05, .08]} /><meshStandardMaterial color="#ffe091" metalness={.55} roughness={.32} /></mesh>
      <mesh position={[.52, .45, 0]} rotation={[0, 0, -.2]} castShadow><boxGeometry args={[.14, .72, .14]} /><meshStandardMaterial color="#23314d" /></mesh>
      <mesh position={[-.52, .45, 0]} rotation={[0, 0, .2]} castShadow><boxGeometry args={[.14, .72, .14]} /><meshStandardMaterial color="#23314d" /></mesh>
      {player.slashTimer > 0 && <mesh position={[1.0, .95, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.8, .025, 8, 32, Math.PI * 1.2]} /><meshStandardMaterial color="#ffe699" emissive="#ffbe44" emissiveIntensity={1.4} transparent opacity={.8} /></mesh>}
      <mesh position={[-.04, .88, -.36]} rotation={[.28, 0, 0]} castShadow><planeGeometry args={[.72, 1.1]} /><meshStandardMaterial color={characterId === 'lyra' ? '#7de6ff' : characterId === 'kaida' ? '#ff6b36' : '#3b2460'} roughness={.7} transparent opacity={.72} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, .08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.74, .82, 40]} /><meshStandardMaterial color={elementColor(heroElement(characterId, 'blade'))} emissive={elementColor(heroElement(characterId, 'blade'))} emissiveIntensity={.7} transparent opacity={.26} /></mesh>
      {player.dashTimer > 0 && <mesh position={[-.62, .72, 0]} rotation={[0, Math.PI / 2, 0]}><coneGeometry args={[.18, 1.8, 14]} /><meshBasicMaterial color="#b9f7ff" transparent opacity={.55} /></mesh>}
      {player.invuln > 0 && <mesh position={[0, .9, 0]}><sphereGeometry args={[1.15, 24, 12]} /><meshStandardMaterial color="#ffffff" transparent opacity={.15} emissive="#96c7ff" emissiveIntensity={.4} /></mesh>}
      <Text position={[0, 2.12, 0]} fontSize={.22} anchorX="center" outlineWidth={.018} outlineColor="#000000">{character.name}</Text>
    </group>
  );
}

function Enemy3D({ enemy, player, boss = false }: { enemy: Fighter3D; player: Runtime3D['player']; boss?: boolean }) {
  if (!enemy.alive) return null;
  const angle = Math.atan2(player.z - enemy.z, player.x - enemy.x);
  const scale = boss ? 1.8 : enemy.kind === 'golem' || enemy.kind === 'dragon' ? 1.25 : 1;
  const color = boss ? '#8b2dff' : enemy.element !== 'physical' ? elementColor(enemy.element) : enemy.kind === 'slime' ? '#79e35b' : enemy.kind === 'beast' ? '#b37638' : enemy.kind === 'caster' ? '#73e6ff' : enemy.kind === 'dragon' ? '#ff6a2c' : '#aa9b86';
  return (
    <group position={[enemy.x, enemy.y, enemy.z]} rotation={[0, -angle + Math.PI / 2, 0]} scale={scale}>
      <mesh position={[0, .55 + Math.sin(performance.now() / 210 + enemy.x) * .04, 0]} castShadow>
        {enemy.kind === 'slime' ? <sphereGeometry args={[.55, 22, 14]} /> : enemy.kind === 'dragon' || boss ? <capsuleGeometry args={[.48, 1.05, 8, 18]} /> : <capsuleGeometry args={[.36, .78, 8, 16]} />}
        <meshStandardMaterial color={color} roughness={.78} emissive={enemy.hurt > 0 ? '#ff0000' : enemy.variant === 'elite' ? color : '#000000'} emissiveIntensity={enemy.hurt > 0 ? .7 : enemy.variant === 'elite' ? .35 : .04} />
      </mesh>
      <mesh position={[.22, .86, .34]}><sphereGeometry args={[.07, 10, 10]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[-.22, .86, .34]}><sphereGeometry args={[.07, 10, 10]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]}><ringGeometry args={[boss ? 1.35 : .7, boss ? 1.48 : .78, 42]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={boss ? .75 : .32} transparent opacity={boss ? .42 : .18} /></mesh>
      {enemy.variant === 'elite' && <mesh rotation={[-Math.PI / 2, 0, performance.now() / 600]} position={[0, .04, 0]}><ringGeometry args={[.95, 1.1, 32]} /><meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1.2} transparent opacity={.45} /></mesh>}
      {boss && <><mesh position={[.38, 1.18, .04]} rotation={[0,0,-.55]} castShadow><coneGeometry args={[.1, .48, 10]} /><meshStandardMaterial color="#ffe6a0" emissive="#ffbb55" emissiveIntensity={.25} /></mesh><mesh position={[-.38, 1.18, .04]} rotation={[0,0,.55]} castShadow><coneGeometry args={[.1, .48, 10]} /><meshStandardMaterial color="#ffe6a0" emissive="#ffbb55" emissiveIntensity={.25} /></mesh></>}
      {(enemy.telegraph > 0 || (boss && enemy.hp < enemy.maxHp * .42)) && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .045, 0]}><ringGeometry args={[1.05, 1.55, 56]} /><meshStandardMaterial color="#ff342b" emissive="#ff1900" emissiveIntensity={1.6} transparent opacity={.58} /></mesh>}
      <mesh position={[0, 1.55, 0]}><boxGeometry args={[1.1, .08, .08]} /><meshBasicMaterial color="#271015" /></mesh>
      <mesh position={[-.55 + (enemy.hp / enemy.maxHp) * .55, 1.55, .01]}><boxGeometry args={[Math.max(.01, enemy.hp / enemy.maxHp) * 1.1, .08, .09]} /><meshBasicMaterial color={boss ? '#ff4b75' : '#ffcc58'} /></mesh>
      <Text position={[0, 1.82, 0]} fontSize={boss ? .18 : .14} anchorX="center" outlineWidth={.012} outlineColor="#000000">{elementIcon(enemy.element)} {enemy.variant !== 'normal' ? `${enemy.variant.toUpperCase()} ` : ''}{enemy.name}</Text>
      <Text position={[0, 2.08, 0]} fontSize={.11} anchorX="center" color="#ffe9a6" outlineWidth={.01} outlineColor="#000000">Weak {elementIcon(enemy.weakness)} • Res {elementIcon(enemy.resistance)}</Text>
    </group>
  );
}



function PetCompanion({ player, petId }: { player: Runtime3D['player']; petId: string }) {
  const pet = getPet(petId);
  const color = petId === 'mender-fairy' ? '#86ffb4' : petId === 'gold-mimic' ? '#ffd65c' : petId === 'storm-hawk' ? '#9be9ff' : petId === 'void-cub' ? '#b56bff' : '#ff8c55';
  const orbit = performance.now() / 900;
  const x = player.x + Math.cos(orbit) * 1.22;
  const z = player.z + Math.sin(orbit) * 1.22;
  const y = player.y + 1.15 + Math.sin(orbit * 1.7) * .2;
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[Math.PI / 2, 0, orbit]}><torusGeometry args={[.38, .018, 8, 28]} /><meshBasicMaterial color={color} transparent opacity={.55} /></mesh>
      <mesh castShadow><sphereGeometry args={[.24, 22, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.72} roughness={.38} /></mesh>
      <mesh position={[0, -.45, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.26, .34, 28]} /><meshBasicMaterial color={color} transparent opacity={.22} /></mesh>
      <pointLight color={color} intensity={.75} distance={3.2} />
      <Text position={[0, .48, 0]} fontSize={.13} anchorX="center" outlineWidth={.01} outlineColor="#000000">{pet.icon}</Text>
    </group>
  );
}

function PickupMesh({ pickup }: { pickup: Pickup3D }) {
  if (pickup.taken) return null;
  const color = pickup.kind === 'coin' ? '#ffd45f' : pickup.kind === 'heart' ? '#ff4778' : pickup.kind === 'mana' ? '#68d8ff' : '#9cff74';
  return <mesh position={[pickup.x, .65 + Math.sin(performance.now() / 220 + pickup.x) * .14, pickup.z]} castShadow><sphereGeometry args={[.28, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.45} roughness={.42} /></mesh>;
}

function HazardMesh({ hazard }: { hazard: Hazard3D }) {
  const color = hazard.tone === 'fire' ? '#ff4a22' : hazard.tone === 'rift' ? '#b660ff' : '#dad2bf';
  return <mesh position={[hazard.x, .05, hazard.z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[hazard.radius, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.45} transparent opacity={.38} /></mesh>;
}

function CrateMesh({ crate }: { crate: Crate3D }) {
  if (crate.broken) return null;
  return <mesh position={[crate.x, .44, crate.z]} castShadow receiveShadow><boxGeometry args={[.82, .82, .82]} /><meshStandardMaterial color="#7c5229" roughness={.86} /></mesh>;
}

function GateMesh({ open, active, areaId }: { open: boolean; active: boolean; areaId: string }) {
  const theme = themeColors[areaId] ?? themeColors['green-village'];
  return (
    <group position={[17.1, 0, 0]}>
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, performance.now() / 1200]} castShadow>
        <torusGeometry args={[1.15, .1, 12, 56]} />
        <meshStandardMaterial color={open || active ? theme.accent : '#777'} emissive={open || active ? theme.accent : '#111'} emissiveIntensity={open || active ? 1.2 : .08} roughness={.28} />
      </mesh>
      <mesh position={[0, .08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.35, 1.65, 48]} /><meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={open ? .7 : .12} transparent opacity={open ? .58 : .22} /></mesh>
      <Text position={[0, 3.05, 0]} fontSize={.28} anchorX="center" outlineWidth={.018} outlineColor="#000000">{active ? 'Boss Gate' : open ? 'Enter Boss Gate' : 'Gate Locked'}</Text>
    </group>
  );
}

function VfxMesh({ vfx }: { vfx: VfxParticle3D }) {
  const opacity = clamp(vfx.life, 0, 1);
  if (vfx.kind === 'ring') {
    return <mesh position={[vfx.x, .08, vfx.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[vfx.radius, vfx.radius + .035, 28]} /><meshBasicMaterial color={vfx.color} transparent opacity={opacity} /></mesh>;
  }
  if (vfx.kind === 'trail') {
    return <mesh position={[vfx.x, vfx.y, vfx.z]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[vfx.radius * 2.5, .035, .035]} /><meshBasicMaterial color={vfx.color} transparent opacity={opacity} /></mesh>;
  }
  return <mesh position={[vfx.x, vfx.y, vfx.z]}><sphereGeometry args={[vfx.radius, 10, 8]} /><meshBasicMaterial color={vfx.color} transparent opacity={opacity} /></mesh>;
}

function FloatLabel({ float }: { float: FloatText3D }) {
  const color = float.tone === 'heal' ? '#80ff9d' : float.tone === 'coin' ? '#ffe082' : float.tone === 'system' ? '#9be7ff' : '#ff738a';
  return <Text position={[float.x, float.y, float.z]} fontSize={.25} anchorX="center" color={color} outlineWidth={.018} outlineColor="#000000">{float.text}</Text>;
}
