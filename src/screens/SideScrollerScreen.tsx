import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameSave, Screen, Toast } from '../types';
import { AREAS, getArea } from '../data/areas';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { CHARACTER_ORDER, canUseCharacter, getCharacter, getUnlockedCharacterIds } from '../data/characters';
import { addRewardItems, getEquippedStats, removeItem } from '../systems/inventory';
import { awardXp } from '../systems/progression';
import { progressQuest } from '../systems/questEngine';
import { audio } from '../services/audioService';

interface Props {
  save: GameSave;
  go: (screen: Screen) => void;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
  notify: (message: string, kind?: Toast['kind']) => void;
  initialAreaId?: string;
  autoStart?: boolean;
  returnScreen?: Screen;
}

type Phase = 'menu' | 'stage' | 'boss' | 'clear' | 'defeat';
type ControlKey = 'left' | 'right' | 'jump' | 'attack' | 'dash' | 'skill' | 'ultimate' | 'potion';
type FighterKind = 'slime' | 'rat' | 'wolf' | 'goblin' | 'bat' | 'golem' | 'skeleton' | 'guardian' | 'imp' | 'beast' | 'spirit' | 'sentinel' | 'wraith' | 'knight' | 'mimic' | 'mage' | 'dragon' | 'rift' | 'boss';
type PickupKind = 'coin' | 'heart' | 'mana' | 'potion';

interface Fighter {
  id: string;
  sourceId: string;
  name: string;
  kind: FighterKind;
  x: number;
  y: number;
  vx: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  facing: 1 | -1;
  attackCd: number;
  hurt: number;
  alive: boolean;
}

interface FloatText {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: 'damage' | 'heal' | 'coin' | 'system';
  life: number;
}

interface Pickup {
  id: string;
  kind: PickupKind;
  x: number;
  y: number;
  taken: boolean;
}

interface Crate {
  id: string;
  x: number;
  hp: number;
  broken: boolean;
}

interface Hazard {
  id: string;
  x: number;
  width: number;
  tone: 'spikes' | 'fire' | 'rift';
  cooldown: number;
}

interface Runtime {
  phase: Phase;
  areaId: string;
  stageWidth: number;
  cameraX: number;
  message: string;
  bannerTimer: number;
  stageTime: number;
  characterId: string;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    moveSpeed: number;
    jumpPower: number;
    facing: 1 | -1;
    onGround: boolean;
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
  enemies: Fighter[];
  boss: Fighter | null;
  pickups: Pickup[];
  crates: Crate[];
  hazards: Hazard[];
  floats: FloatText[];
  kills: number;
  rewardXp: number;
  rewardCoins: number;
  rewardLoot: Array<{ itemId: string; quantity: number }>;
  finishedSaved: boolean;
  potionsUsed: number;
  bossWarned: boolean;
}

const stageThemes: Record<string, { label: string; className: string }> = {
  'green-village': { label: 'Verdant Mountains', className: 'theme-verdant' },
  'forest-path': { label: 'Moonlit Forest', className: 'theme-forest' },
  'crystal-cave': { label: 'Violet Hollow', className: 'theme-violet' },
  'old-ruins': { label: 'Ancient Gate', className: 'theme-ruins' },
  'lava-mountain': { label: 'Crimson Wasteland', className: 'theme-crimson' },
  'sky-temple': { label: 'Pale Sky Temple', className: 'theme-sky' },
  'moon-graveyard': { label: 'Moon Graveyard', className: 'theme-moon' },
  'abyssal-library': { label: 'Abyssal Library', className: 'theme-abyss' },
  'dragon-citadel': { label: 'Dragon Citadel', className: 'theme-citadel' },
  'ethereal-gate': { label: 'Final Ethereal Gate', className: 'theme-ether' }
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

function areaIndex(areaId: string) {
  return Math.max(0, AREAS.findIndex(area => area.id === areaId));
}

function enemyKind(enemyId: string): FighterKind {
  if (enemyId.includes('rat')) return 'rat';
  if (enemyId.includes('wolf')) return 'wolf';
  if (enemyId.includes('goblin')) return 'goblin';
  if (enemyId.includes('bat')) return 'bat';
  if (enemyId.includes('golem')) return 'golem';
  if (enemyId.includes('skeleton')) return 'skeleton';
  if (enemyId.includes('guardian')) return 'guardian';
  if (enemyId.includes('imp')) return 'imp';
  if (enemyId.includes('beast')) return 'beast';
  if (enemyId.includes('spirit')) return 'spirit';
  if (enemyId.includes('sentinel')) return 'sentinel';
  if (enemyId.includes('wraith')) return 'wraith';
  if (enemyId.includes('knight')) return 'knight';
  if (enemyId.includes('mimic') || enemyId.includes('book')) return 'mimic';
  if (enemyId.includes('mage')) return 'mage';
  if (enemyId.includes('dragon') || enemyId.includes('drake')) return 'dragon';
  if (enemyId.includes('rift') || enemyId.includes('ether')) return 'rift';
  if (ENEMIES[enemyId]?.isBoss) return 'boss';
  return 'slime';
}

function makeEnemy(enemyId: string, x: number, index: number): Fighter {
  const data = ENEMIES[enemyId];
  const boss = data.isBoss;
  const hpScale = boss ? 1 : .82;
  return {
    id: `${enemyId}-${index}-${uid()}`,
    sourceId: enemyId,
    name: data.name,
    kind: boss ? 'boss' : enemyKind(enemyId),
    x,
    y: 0,
    vx: 0,
    hp: Math.max(1, Math.round(data.maxHp * hpScale)),
    maxHp: Math.max(1, Math.round(data.maxHp * hpScale)),
    attack: data.attack,
    defense: data.defense,
    speed: boss ? 86 : rng(74, 112),
    facing: -1,
    attackCd: rng(.4, 1.6),
    hurt: 0,
    alive: true
  };
}

function pickLoot(enemyId: string) {
  const enemy = ENEMIES[enemyId];
  const loot: Array<{ itemId: string; quantity: number }> = [];
  enemy.lootTable.forEach(drop => {
    if (Math.random() <= drop.chance) {
      loot.push({ itemId: drop.itemId, quantity: Math.floor(rng(drop.min, drop.max + 1)) });
    }
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

function createRuntime(save: GameSave, forcedAreaId?: string): Runtime {
  const areaId = forcedAreaId ?? save.player.currentAreaId ?? 'green-village';
  const area = getArea(areaId);
  const idx = areaIndex(areaId);
  const stats = getEquippedStats(save);
  const character = getCharacter(save.player.characterId);
  const enemyCount = Math.min(11, 4 + Math.floor(idx * 1.1));
  const spacing = 420;
  const enemies = Array.from({ length: enemyCount }, (_, index) => {
    const enemyId = area.normalEnemyIds[index % area.normalEnemyIds.length];
    return makeEnemy(enemyId, 620 + index * spacing + rng(-80, 80), index);
  });
  const stageWidth = Math.max(2850, 2300 + enemyCount * 420 + idx * 300);
  const pickups = Array.from({ length: 5 + Math.min(4, idx) }, (_, index) => ({
    id: `pickup-${index}-${uid()}`,
    kind: (['coin', 'heart', 'mana', index % 3 === 0 ? 'potion' : 'coin'] as PickupKind[])[index % 4],
    x: 520 + index * 480 + rng(-60, 60),
    y: index % 2 ? 92 : 150,
    taken: false
  }));
  const crates = Array.from({ length: 3 + Math.min(4, Math.floor(idx / 2)) }, (_, index) => ({ id: `crate-${index}-${uid()}`, x: 760 + index * 740 + rng(-90, 90), hp: 2, broken: false }));
  const hazards = Array.from({ length: idx > 1 ? Math.min(6, 1 + Math.floor(idx / 2)) : 0 }, (_, index) => ({
    id: `hazard-${index}-${uid()}`,
    x: 980 + index * 650 + rng(-70, 70),
    width: 74 + Math.floor(rng(0, 32)),
    tone: idx > 7 ? 'rift' as const : idx > 3 ? 'fire' as const : 'spikes' as const,
    cooldown: 0
  }));
  return {
    phase: 'menu',
    areaId,
    stageWidth,
    cameraX: 0,
    message: 'Press Start, chain combos, break crates, collect orbs, open the boss gate.',
    bannerTimer: 2.5,
    stageTime: 0,
    characterId: character.id,
    player: {
      x: 180,
      y: 0,
      vx: 0,
      vy: 0,
      hp: Math.min(save.player.hp, stats.maxHp),
      maxHp: stats.maxHp,
      mana: Math.min(save.player.mana, stats.maxMana),
      maxMana: stats.maxMana,
      attack: stats.attack,
      defense: stats.defense,
      moveSpeed: 250 + character.speedBonus,
      jumpPower: 515 + character.jumpBonus,
      facing: 1,
      onGround: true,
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
    crates,
    hazards,
    floats: [],
    kills: 0,
    rewardXp: 0,
    rewardCoins: 0,
    rewardLoot: [],
    finishedSaved: false,
    potionsUsed: 0,
    bossWarned: false
  };
}

function getUsablePotion(save: GameSave) {
  const potionIds = ['phoenix-elixir', 'large-health-potion', 'swift-tonic', 'medium-health-potion', 'small-health-potion'];
  return potionIds.find(id => (save.inventory.find(item => item.itemId === id)?.quantity ?? 0) > 0);
}

function hpPct(current: number, max: number) {
  return `${Math.round(clamp(current / Math.max(1, max), 0, 1) * 100)}%`;
}

function keyLabel(key: ControlKey) {
  switch (key) {
    case 'left': return '◀';
    case 'right': return '▶';
    case 'jump': return 'JUMP';
    case 'attack': return 'SLASH';
    case 'dash': return 'DASH';
    case 'skill': return 'SKILL';
    case 'ultimate': return 'ULT';
    case 'potion': return 'POTION';
    default: return key;
  }
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

export function SideScrollerScreen({ save, go, updateSave, notify, initialAreaId, autoStart = false, returnScreen = 'village' }: Props) {
  const startingAreaId = initialAreaId ?? save.player.currentAreaId ?? 'green-village';
  const [selectedAreaId, setSelectedAreaId] = useState(startingAreaId);
  const runtimeRef = useRef<Runtime>(createRuntime(save, startingAreaId));
  const controlsRef = useRef<Record<ControlKey, boolean>>({ left: false, right: false, jump: false, attack: false, dash: false, skill: false, ultimate: false, potion: false });
  const viewportRef = useRef({ width: 1280, height: 720 });
  const [, forceRender] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const runtime = runtimeRef.current;
  const area = getArea(runtime.areaId);
  const character = getCharacter(runtime.characterId);
  const stageTheme = stageThemes[runtime.areaId] ?? stageThemes['green-village'];
  const unlockedAreas = useMemo(() => AREAS.filter(next => save.player.unlockedAreaIds.includes(next.id)), [save.player.unlockedAreaIds]);
  const unlockedCharacterIds = useMemo(() => getUnlockedCharacterIds(save), [save]);
  const potionId = getUsablePotion(save);

  useEffect(() => {
    const nextAreaId = initialAreaId ?? save.player.currentAreaId ?? selectedAreaId;
    const nextRuntime = createRuntime(save, nextAreaId);
    if (autoStart) {
      const target = getArea(nextAreaId);
      nextRuntime.phase = 'stage';
      nextRuntime.message = `${target.name}: clear monsters, collect loot, and enter the boss gate.`;
      nextRuntime.bannerTimer = 2.4;
      audio.startMusic('battle');
    }
    runtimeRef.current = nextRuntime;
    setSelectedAreaId(nextAreaId);
    forceRender(value => value + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.saveSlotId, save.player.characterId, initialAreaId, autoStart]);

  useEffect(() => {
    function resize() {
      viewportRef.current = { width: window.innerWidth, height: window.innerHeight };
      const r = runtimeRef.current;
      r.cameraX = clamp(r.player.x - viewportRef.current.width * .42, 0, Math.max(0, r.stageWidth - viewportRef.current.width));
      forceRender(value => value + 1);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function addFloat(x: number, y: number, text: string, tone: FloatText['tone'] = 'damage') {
    const r = runtimeRef.current;
    r.floats.push({ id: uid(), x, y, text, tone, life: .9 });
  }

  function setMessage(message: string, seconds = 1.65) {
    const r = runtimeRef.current;
    r.message = message;
    r.bannerTimer = seconds;
  }

  function addCombo(amount = 1) {
    const p = runtimeRef.current.player;
    p.combo = Math.min(99, p.combo + amount);
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    p.comboTimer = 2.1;
  }

  function chargeUltimate(amount: number) {
    const p = runtimeRef.current.player;
    const multiplier = character.id === 'zeph' ? 1.25 : 1;
    p.ultimate = Math.min(100, p.ultimate + amount * multiplier);
  }

  function damageEnemy(enemy: Fighter, amount: number, critical = false) {
    const r = runtimeRef.current;
    if (!enemy.alive) return;
    const damage = Math.max(1, Math.round(amount - enemy.defense * .36));
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hurt = .22;
    addFloat(enemy.x, 150 + enemy.y, critical ? `CRIT ${damage}` : `${damage}`, critical ? 'coin' : 'damage');
    chargeUltimate(critical ? 8 : 5);
    addCombo(1);
    if (enemy.hp <= 0) {
      enemy.alive = false;
      const data = ENEMIES[enemy.sourceId];
      const loot = pickLoot(enemy.sourceId);
      r.kills += enemy.kind === 'boss' ? 0 : 1;
      r.rewardXp += data.xpReward;
      r.rewardCoins += data.coinReward;
      r.rewardLoot = mergeLoot([...r.rewardLoot, ...loot]);
      chargeUltimate(enemy.kind === 'boss' ? 40 : 14);
      audio.playSfx(enemy.kind === 'boss' ? 'victory' : 'kill');
      addFloat(enemy.x, 200, `+${data.xpReward} XP`, 'system');
      if (enemy.kind !== 'boss' && r.enemies.every(next => !next.alive)) {
        setMessage('Gate opened! Run to the glowing portal and face the boss.', 2.3);
      }
    }
  }

  function playerDamage(amount: number, sourceX: number) {
    const r = runtimeRef.current;
    const p = r.player;
    if (p.invuln > 0 || r.phase === 'clear' || r.phase === 'defeat') return;
    const guardBonus = character.id === 'borin' ? .82 : 1;
    const damage = Math.max(2, Math.round((amount - p.defense * .42) * guardBonus));
    p.hp = Math.max(0, p.hp - damage);
    p.invuln = .65;
    p.combo = 0;
    p.vx += sourceX < p.x ? 170 : -170;
    addFloat(p.x, 180 + p.y, `-${damage}`, 'damage');
    if ('vibrate' in navigator) navigator.vibrate?.(35);
    audio.playSfx('enemyAttack');
    if (p.hp <= 0) {
      r.phase = 'defeat';
      setMessage('Defeated. Return to the gate and try again.', 3);
      audio.playSfx('defeat');
    }
  }

  function chooseCharacter(characterId: string) {
    if (!canUseCharacter(save, characterId)) {
      notify('Unlock this hero in the shop or later in the story first.', 'warning');
      return;
    }
    const next = { ...save, player: { ...save.player, characterId } };
    updateSave(next, true);
    runtimeRef.current = createRuntime(next, selectedAreaId);
    notify(`${getCharacter(characterId).name} selected.`, 'success');
  }

  function startStage(areaId = selectedAreaId) {
    const target = getArea(areaId);
    if (!save.player.unlockedAreaIds.includes(areaId) || save.player.level < target.requiredLevel) {
      notify(`Locked: ${target.unlockCondition}`, 'warning');
      return;
    }
    runtimeRef.current = createRuntime(save, areaId);
    runtimeRef.current.phase = 'stage';
    runtimeRef.current.message = `${target.name}: chain combos, collect orbs, defeat monsters, then open the boss gate.`;
    setSelectedAreaId(areaId);
    setPaused(false);
    audio.startMusic('battle');
    audio.playSfx('click');
    forceRender(value => value + 1);
  }

  function returnToGate() {
    setPaused(false);
    controlsRef.current = { left: false, right: false, jump: false, attack: false, dash: false, skill: false, ultimate: false, potion: false };
    if (autoStart) {
      audio.startMusic('village');
      go(returnScreen);
      return;
    }
    runtimeRef.current = createRuntime(save, selectedAreaId);
    audio.startMusic('title');
    forceRender(value => value + 1);
  }

  function usePotion() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'stage' && r.phase !== 'boss') return;
    if (!potionId) return setMessage('No healing potion in your bag.', 1.3);
    r.potionsUsed += 1;
    if (p.hp >= p.maxHp && p.mana >= p.maxMana) return setMessage('HP and mana are already full.', 1.2);
    const item = ITEMS[potionId];
    const healBoost = character.id === 'lyra' ? 1.22 : 1;
    const restoreHp = Math.round((item.hpRestore ?? 35) * healBoost);
    const restoreMp = item.manaRestore ?? 0;
    p.hp = Math.min(p.maxHp, p.hp + restoreHp);
    p.mana = Math.min(p.maxMana, p.mana + restoreMp);
    addFloat(p.x, 205 + p.y, `+${restoreHp}`, 'heal');
    audio.playSfx('heal');
    const nextSave = { ...save, inventory: removeItem(save.inventory, potionId, 1), player: { ...save.player, hp: p.hp, mana: p.mana } };
    updateSave(nextSave, false);
  }

  function slashAttack() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'stage' && r.phase !== 'boss') return;
    if (p.slashTimer > .08) return;
    p.slashTimer = .22;
    const baseRange = character.id === 'kaida' ? 178 : character.id === 'borin' ? 118 : 132;
    const base = p.attack * rng(.86, 1.22) + p.combo * (character.id === 'nyx' ? 3 : 2);
    const critical = Math.random() < (character.id === 'nyx' ? .24 : .16);
    const range = critical ? baseRange + 28 : baseRange;
    const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
    let hit = false;
    targets.forEach(enemy => {
      if (!enemy.alive) return;
      const dx = (enemy.x - p.x) * p.facing;
      if (dx > -35 && dx < range && Math.abs(enemy.y - p.y) < 90) {
        hit = true;
        damageEnemy(enemy, base * (critical ? 1.85 : 1), critical);
      }
    });
    r.crates.forEach(crate => {
      if (crate.broken) return;
      const dx = (crate.x - p.x) * p.facing;
      if (dx > -35 && dx < range) {
        hit = true;
        crate.hp -= 1;
        addFloat(crate.x, 150, 'CRACK', 'system');
        if (crate.hp <= 0) {
          crate.broken = true;
          r.pickups.push({ id: `crate-loot-${uid()}`, kind: Math.random() < .5 ? 'coin' : 'heart', x: crate.x, y: 120, taken: false });
          audio.playSfx('coin');
        }
      }
    });
    audio.playSfx(hit ? 'attack' : 'defend');
  }

  function castSkill() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'stage' && r.phase !== 'boss') return;
    if (p.skillCd > 0) return setMessage('Skill is cooling down.', 1.1);
    const cost = character.id === 'lyra' ? 10 : 12;
    if (p.mana < cost) return setMessage('Not enough mana.', 1.1);
    p.mana -= cost;
    p.skillCd = character.id === 'nyx' ? 1.45 : 2.1;
    p.slashTimer = .32;
    const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
    let hits = 0;
    const radius = character.id === 'lyra' ? 360 : character.id === 'zeph' ? 420 : character.id === 'borin' ? 245 : 285;
    const multiplier = character.id === 'kaida' ? 2.75 : character.id === 'lyra' ? 2.6 : character.id === 'borin' ? 2.1 : 2.25;
    targets.forEach(enemy => {
      if (!enemy.alive) return;
      const dx = Math.abs(enemy.x - p.x);
      if (dx < radius) {
        hits += 1;
        damageEnemy(enemy, p.attack * multiplier, true);
      }
    });
    addFloat(p.x, 220 + p.y, hits ? character.skillName.toUpperCase() : 'MISS', hits ? 'system' : 'damage');
    if ('vibrate' in navigator) navigator.vibrate?.([18, 30, 18]);
    audio.playSfx('skill');
  }

  function ultimate() {
    const r = runtimeRef.current;
    const p = r.player;
    if (r.phase !== 'stage' && r.phase !== 'boss') return;
    if (p.ultimate < 100) return setMessage('Ultimate is not ready yet.', 1.1);
    p.ultimate = 0;
    p.invuln = 1.1;
    p.slashTimer = .6;
    const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
    targets.forEach(enemy => {
      if (!enemy.alive) return;
      if (Math.abs(enemy.x - p.x) < 620 || r.phase === 'boss') damageEnemy(enemy, p.attack * 4.4, true);
    });
    addFloat(p.x, 250 + p.y, `${character.skillName} MAX`, 'coin');
    setMessage(`${character.name}'s ultimate unleashed!`, 1.8);
    if ('vibrate' in navigator) navigator.vibrate?.([30, 30, 50]);
    audio.playSfx('levelUp');
  }

  function dash() {
    const r = runtimeRef.current;
    const p = r.player;
    if (p.dashCd > 0 || (r.phase !== 'stage' && r.phase !== 'boss')) return;
    const dashBoost = character.id === 'nyx' ? 1.26 : 1;
    p.dashTimer = .18;
    p.dashCd = character.id === 'nyx' ? .55 : .75;
    p.invuln = Math.max(p.invuln, .22);
    p.vx = p.facing * 560 * dashBoost;
    audio.playSfx('defend');
  }

  function jump() {
    const p = runtimeRef.current.player;
    if (!p.onGround) return;
    p.vy = p.jumpPower;
    p.onGround = false;
    audio.playSfx('click');
  }

  function action(key: ControlKey) {
    if (key === 'jump') jump();
    if (key === 'attack') slashAttack();
    if (key === 'dash') dash();
    if (key === 'skill') castSkill();
    if (key === 'ultimate') ultimate();
    if (key === 'potion') usePotion();
  }

  function finishClear() {
    const r = runtimeRef.current;
    if (r.finishedSaved) return;
    const stageArea = getArea(r.areaId);
    r.finishedSaved = true;
    const grade = gradeRun(r.stageTime, r.player.hp / Math.max(1, r.player.maxHp), r.player.maxCombo);
    const stars = { noPotion: r.potionsUsed === 0, sRank: grade === 'S', comboMaster: r.player.maxCombo >= 12 };

    let next: GameSave = {
      ...save,
      player: {
        ...save.player,
        hp: Math.max(1, Math.round(r.player.hp)),
        mana: Math.max(0, Math.round(r.player.mana)),
        coins: save.player.coins + r.rewardCoins,
        currentAreaId: r.areaId,
        bossesDefeated: save.player.bossesDefeated.includes(stageArea.bossId) ? save.player.bossesDefeated : [...save.player.bossesDefeated, stageArea.bossId],
        unlockedAreaIds: stageArea.nextAreaId && !save.player.unlockedAreaIds.includes(stageArea.nextAreaId)
          ? [...save.player.unlockedAreaIds, stageArea.nextAreaId]
          : save.player.unlockedAreaIds,
        bestStageScores: {
          ...(save.player.bestStageScores ?? {}),
          [r.areaId]: { grade, clearTime: Math.round(r.stageTime), kills: r.kills, combo: r.player.maxCombo }
        },
        starObjectives: {
          ...(save.player.starObjectives ?? {}),
          [r.areaId]: stars
        },
        storyFlags: [...new Set([...(save.player.storyFlags ?? []), `cleared-${r.areaId}`])]
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
    if ('vibrate' in navigator) navigator.vibrate?.([45, 30, 90]);
    notify(`Stage cleared! Grade ${grade} • Stars ${Object.values(stars).filter(Boolean).length}/3 • +${r.rewardXp} XP • +${r.rewardCoins} coins`, 'success');
  }

  function spawnBossIfNeeded() {
    const r = runtimeRef.current;
    if (r.phase !== 'stage') return;
    const gateX = r.stageWidth - 220;
    if (r.enemies.some(enemy => enemy.alive)) return;
    if (r.player.x < gateX - 70) return;
    const boss = makeEnemy(getArea(r.areaId).bossId, gateX - 220, 99);
    boss.hp = Math.round(boss.maxHp * 1.2);
    boss.maxHp = boss.hp;
    boss.speed = 78 + areaIndex(r.areaId) * 2;
    r.boss = boss;
    r.phase = 'boss';
    r.bossWarned = true;
    setMessage(`Cutscene: ${boss.name} guards the gate. Watch for red telegraphs before heavy attacks!`, 3);
    audio.playSfx('enemyAttack');
  }

  function collectPickups() {
    const r = runtimeRef.current;
    const p = r.player;
    r.pickups.forEach(pickup => {
      if (pickup.taken) return;
      if (Math.abs(pickup.x - p.x) < 58 && Math.abs(pickup.y - (p.y + 105)) < 105) {
        pickup.taken = true;
        if (pickup.kind === 'coin') { r.rewardCoins += 18 + areaIndex(r.areaId) * 6; addFloat(p.x, 190, '+coins', 'coin'); audio.playSfx('coin'); }
        if (pickup.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 26 + areaIndex(r.areaId) * 3); addFloat(p.x, 190, '+HP', 'heal'); audio.playSfx('heal'); }
        if (pickup.kind === 'mana') { p.mana = Math.min(p.maxMana, p.mana + 20); addFloat(p.x, 190, '+MP', 'heal'); audio.playSfx('heal'); }
        if (pickup.kind === 'potion') { r.rewardLoot = mergeLoot([...r.rewardLoot, { itemId: 'small-health-potion', quantity: 1 }]); addFloat(p.x, 190, '+Potion', 'system'); audio.playSfx('coin'); }
      }
    });
  }

  function updateHazards(dt: number) {
    const r = runtimeRef.current;
    const p = r.player;
    r.hazards.forEach(hazard => {
      hazard.cooldown = Math.max(0, hazard.cooldown - dt);
      if (hazard.cooldown <= 0 && p.y < 34 && p.x > hazard.x && p.x < hazard.x + hazard.width) {
        hazard.cooldown = 1.1;
        playerDamage(18 + areaIndex(r.areaId) * 7, hazard.x);
        addFloat(p.x, 160, hazard.tone.toUpperCase(), 'damage');
      }
    });
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(.033, (now - last) / 1000);
      last = now;
      const r = runtimeRef.current;
      const p = r.player;
      const controls = controlsRef.current;
      const active = r.phase === 'stage' || r.phase === 'boss';
      const activeCharacter = getCharacter(r.characterId);

      if (active && !pausedRef.current) {
        r.stageTime += dt;
        const accel = p.onGround ? 2300 : 1420;
        const maxSpeed = p.dashTimer > 0 ? 600 : p.moveSpeed;
        let move = 0;
        if (controls.left) move -= 1;
        if (controls.right) move += 1;
        if (move !== 0) {
          p.vx += move * accel * dt;
          p.facing = move > 0 ? 1 : -1;
        } else if (p.onGround) {
          p.vx *= Math.pow(.0008, dt);
        }
        p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
        p.x = clamp(p.x + p.vx * dt, 70, r.stageWidth - 80);
        p.vy -= 1450 * dt;
        p.y += p.vy * dt;
        if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
        p.slashTimer = Math.max(0, p.slashTimer - dt);
        p.dashTimer = Math.max(0, p.dashTimer - dt);
        p.dashCd = Math.max(0, p.dashCd - dt);
        p.skillCd = Math.max(0, p.skillCd - dt);
        p.invuln = Math.max(0, p.invuln - dt);
        p.comboTimer = Math.max(0, p.comboTimer - dt);
        if (p.comboTimer <= 0) p.combo = 0;
        p.mana = Math.min(p.maxMana, p.mana + dt * (activeCharacter.id === 'lyra' ? 2.6 : 1.8));

        collectPickups();
        updateHazards(dt);

        const fighters = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
        fighters.forEach(enemy => {
          if (!enemy.alive) return;
          const dx = p.x - enemy.x;
          enemy.facing = dx > 0 ? 1 : -1;
          enemy.attackCd = Math.max(0, enemy.attackCd - dt);
          enemy.hurt = Math.max(0, enemy.hurt - dt);
          const bossRage = r.phase === 'boss' && enemy.hp < enemy.maxHp * .4;
          if (bossRage && !r.bossWarned) {
            r.bossWarned = true;
            setMessage(`${enemy.name} entered rage phase. Heavy attack incoming!`, 2);
            addFloat(enemy.x, 245, 'WARNING', 'coin');
          }
          if (Math.abs(dx) > 78) {
            enemy.vx = enemy.facing * enemy.speed * (bossRage ? 1.35 : 1);
            enemy.x = clamp(enemy.x + enemy.vx * dt, 110, r.stageWidth - 110);
          } else if (enemy.attackCd <= 0) {
            const heavy = enemy.kind === 'boss' && bossRage && Math.random() < .58;
            enemy.attackCd = heavy ? 1.2 : rng(.82, 1.32);
            if (heavy) {
              setMessage(`${enemy.name} telegraphs a heavy strike! Dash away!`, 1.1);
              addFloat(enemy.x, 245, '!!!', 'coin');
            }
            playerDamage(enemy.attack * (heavy ? 1.7 : 1), enemy.x);
            addFloat(enemy.x, 205, heavy ? 'HEAVY' : 'HIT', heavy ? 'coin' : 'damage');
          }
        });

        spawnBossIfNeeded();
        if (r.phase === 'boss' && r.boss && !r.boss.alive) {
          r.phase = 'clear';
          r.message = 'Boss defeated! Gate sealed. Stage cleared.';
          r.bannerTimer = 3;
          finishClear();
        }
      }

      r.floats = r.floats.map(float => ({ ...float, life: float.life - dt, y: float.y + 60 * dt })).filter(float => float.life > 0);
      r.bannerTimer = Math.max(0, r.bannerTimer - dt);
      r.cameraX = clamp(p.x - viewportRef.current.width * .42, 0, Math.max(0, r.stageWidth - viewportRef.current.width));
      forceRender(value => (value + 1) % 100000);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') controlsRef.current.left = true;
      if (key === 'd' || key === 'arrowright') controlsRef.current.right = true;
      if (key === 'w' || key === ' ' || key === 'arrowup') action('jump');
      if (key === 'j') action('attack');
      if (key === 'k') action('dash');
      if (key === 'l') action('skill');
      if (key === 'u') action('ultimate');
      if (key === 'p') action('potion');
      if (key === 'escape') setPaused(value => !value);
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') controlsRef.current.left = false;
      if (key === 'd' || key === 'arrowright') controlsRef.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });


  useEffect(() => {
    let raf = 0;
    let lastButtons: Record<string, boolean> = {};
    function pollGamepad() {
      const pad = navigator.getGamepads?.().find(Boolean);
      if (pad) {
        const axisX = Math.abs(pad.axes[0] ?? 0) > .22 ? pad.axes[0] ?? 0 : 0;
        controlsRef.current.left = axisX < -0.22;
        controlsRef.current.right = axisX > 0.22;
        const mapping = [
          ['jump', 0], ['attack', 2], ['dash', 1], ['skill', 3], ['ultimate', 5], ['potion', 4]
        ] as Array<[ControlKey, number]>;
        mapping.forEach(([key, index]) => {
          const pressed = Boolean(pad.buttons[index]?.pressed);
          if (pressed && !lastButtons[key]) action(key);
          lastButtons[key] = pressed;
        });
      }
      raf = requestAnimationFrame(pollGamepad);
    }
    raf = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(raf);
  });

  const cameraX = runtime.cameraX;
  const livingEnemies = runtime.enemies.filter(enemy => enemy.alive).length;
  const gateOpen = runtime.enemies.every(enemy => !enemy.alive);
  const bossPct = runtime.boss ? hpPct(runtime.boss.hp, runtime.boss.maxHp) : '0%';

  return (
    <section className={`eg-game eg-video-upgrade ${stageTheme.className} ${character.className}`}>
      {runtime.phase === 'menu' ? (
        <div className="eg-title-screen eg-video-title-screen">
          <div className="eg-title-art">
            <div className="eg-title-ruin left" />
            <div className="eg-title-ruin right" />
            <div className="eg-campfire"><i /><b /><span /></div>
            <div className="eg-portal-idle" />
            <div className="eg-title-hero-preview"><span>{character.icon}</span><i /></div>
          </div>
          <div className="eg-title-copy">
            <p className="eg-mini">VIDEO-STYLE 2.5D ACTION RPG</p>
            <h1>Ethereal Gate</h1>
            <p>Side-scroll through monsters, break crates, collect orbs, open the gate, and defeat cinematic bosses.</p>
            <div className="eg-area-pills">
              {unlockedAreas.map(nextArea => (
                <button key={nextArea.id} className={selectedAreaId === nextArea.id ? 'active' : ''} onClick={() => { setSelectedAreaId(nextArea.id); runtimeRef.current = createRuntime(save, nextArea.id); forceRender(value => value + 1); }}>
                  {nextArea.name}<small>Lv {nextArea.requiredLevel}</small>
                </button>
              ))}
            </div>
            <div className="eg-hero-select-strip">
              {CHARACTER_ORDER.map(hero => (
                <button key={hero.id} className={(save.player.characterId ?? 'wanderer') === hero.id ? 'active' : ''} disabled={!unlockedCharacterIds.includes(hero.id)} onClick={() => chooseCharacter(hero.id)} title={hero.description}>
                  <span>{hero.icon}</span><small>{hero.name}</small>
                </button>
              ))}
            </div>
            <div className="eg-title-actions">
              <button className="eg-start" onClick={() => startStage(selectedAreaId)}>START GAME</button>
              <button onClick={() => setShowGuide(true)}>HOW TO PLAY</button>
              <button onClick={() => go('shop')}>HERO SHOP</button>
              <button onClick={() => go('village')}>3D VILLAGE</button>
            </div>
            <div className="eg-title-version">{stageTheme.label} • {character.name}: {character.skillName}</div>
          </div>
          {showGuide && (
            <div className="eg-guide-card">
              <h2>How to Play</h2>
              <p>Move left/right, jump, slash, dash through danger, cast skills, charge ultimate, and enter the glowing gate after clearing monsters.</p>
              <div className="eg-guide-grid">
                <span>A/D</span><b>Move</b><span>W/Space</span><b>Jump</b><span>J</span><b>Slash</b><span>K</span><b>Dash</b><span>L</span><b>Skill</b><span>U</span><b>Ultimate</b><span>P</span><b>Potion</b>
              </div>
              <button className="eg-start" onClick={() => setShowGuide(false)}>OKAY</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="eg-stage-hud safe-top">
            <div className={`eg-portrait ${character.className}`}><span>{character.icon}</span></div>
            <div className="eg-bars">
              <strong>{save.player.name}</strong>
              <div className="eg-meter hp"><i style={{ width: hpPct(runtime.player.hp, runtime.player.maxHp) }} /></div>
              <div className="eg-meter mp"><i style={{ width: hpPct(runtime.player.mana, runtime.player.maxMana) }} /></div>
              <div className="eg-meter ult"><i style={{ width: `${Math.round(runtime.player.ultimate)}%` }} /></div>
            </div>
            <div className="eg-stage-info">
              <b>{area.name}</b>
              <small>{livingEnemies} monsters • {runtime.kills} kills • Combo {runtime.player.combo} • 🪙 {runtime.rewardCoins}</small>
            </div>
            <button onClick={() => go('village')}>Village</button><button onClick={() => setPaused(true)}>Pause</button>
          </div>

          {runtime.phase === 'boss' && runtime.boss && <div className="eg-boss-bar"><span>{runtime.boss.name}</span><div><i style={{ width: bossPct }} /></div></div>}
          {runtime.bannerTimer > 0 && <div className="eg-banner">{runtime.message}</div>}

          <div className="eg-objective-strip">
            <span>{gateOpen ? 'Gate Open' : `Defeat ${livingEnemies} Monsters`}</span>
            <b>{runtime.phase === 'boss' ? 'Boss Fight' : runtime.phase === 'clear' ? 'Stage Clear' : runtime.phase === 'defeat' ? 'Defeated' : 'Explore'}</b>
            <em>{Math.round(runtime.stageTime)}s • Max Combo {runtime.player.maxCombo}</em>
          </div>
          <div className="eg-minimap"><i style={{ width: `${Math.round(clamp(runtime.player.x / Math.max(1, runtime.stageWidth), 0, 1) * 100)}%` }} /><b /></div>

          <div className="eg-viewport">
            <div className="eg-parallax sky" style={{ transform: `translateX(${-cameraX * .08}px)` }} />
            <div className="eg-parallax moons" style={{ transform: `translateX(${-cameraX * .12}px)` }} />
            <div className="eg-parallax mountains" style={{ transform: `translateX(${-cameraX * .18}px)` }} />
            <div className="eg-parallax trees" style={{ transform: `translateX(${-cameraX * .38}px)` }} />
            <div className="eg-world" style={{ width: runtime.stageWidth, transform: `translateX(${-cameraX}px)` }}>
              <div className="eg-ground" />
              <div className="eg-floor-deco one" />
              <div className="eg-floor-deco two" />
              <div className="eg-floor-deco three" />

              <div className={`eg-gate ${gateOpen ? 'open' : 'locked'}`} style={{ left: runtime.stageWidth - 260 }}><i /><b>{runtime.phase === 'boss' || runtime.phase === 'clear' ? 'Boss Gate' : gateOpen ? 'Enter Gate' : 'Locked'}</b></div>

              {runtime.hazards.map(hazard => <div key={hazard.id} className={`eg-hazard ${hazard.tone}`} style={{ left: hazard.x, width: hazard.width }}><i /></div>)}
              {runtime.crates.map(crate => <div key={crate.id} className={`eg-crate ${crate.broken ? 'broken' : ''}`} style={{ left: crate.x }}><i /></div>)}
              {runtime.pickups.map(pickup => <div key={pickup.id} className={`eg-pickup ${pickup.kind} ${pickup.taken ? 'taken' : ''}`} style={{ left: pickup.x, bottom: pickup.y }}>{pickup.kind === 'coin' ? '🪙' : pickup.kind === 'heart' ? '❤' : pickup.kind === 'mana' ? '◆' : '🧪'}</div>)}

              {runtime.enemies.map(enemy => (
                <div key={enemy.id} className={`eg-actor eg-enemy eg-${enemy.kind} ${enemy.alive ? '' : 'dead'} ${enemy.hurt > 0 ? 'hurt' : ''}`} style={{ left: enemy.x, bottom: 88 + enemy.y, transform: `translateX(-50%) scaleX(${enemy.facing})` }}>
                  {enemy.alive && <div className="eg-actor-bar"><i style={{ width: hpPct(enemy.hp, enemy.maxHp) }} /></div>}
                  <div className="eg-sprite"><i /><b /><span /></div>
                  <em>{enemy.name}</em>
                </div>
              ))}

              {runtime.boss && (
                <div className={`eg-actor eg-enemy eg-boss ${runtime.boss.alive ? '' : 'dead'} ${runtime.boss.hurt > 0 ? 'hurt' : ''}`} style={{ left: runtime.boss.x, bottom: 90 + runtime.boss.y, transform: `translateX(-50%) scaleX(${runtime.boss.facing})` }}>
                  <div className="eg-sprite"><i /><b /><span /></div><em>{runtime.boss.name}</em>
                </div>
              )}

              <div className={`eg-actor eg-player ${character.className} ${runtime.player.slashTimer > 0 ? 'slashing' : ''} ${runtime.player.dashTimer > 0 ? 'dashing' : ''} ${runtime.player.invuln > 0 ? 'invuln' : ''}`} style={{ left: runtime.player.x, bottom: 92 + runtime.player.y, transform: `translateX(-50%) scaleX(${runtime.player.facing})` }}>
                <div className="eg-sprite"><i /><b /><span /></div><div className="eg-sword" /><div className="eg-slash" />
              </div>

              {runtime.player.combo > 1 && <div className="eg-combo" style={{ left: runtime.player.x, bottom: 210 + runtime.player.y }}>COMBO x{runtime.player.combo}</div>}
              {runtime.floats.map(float => <div key={float.id} className={`eg-float ${float.tone}`} style={{ left: float.x, bottom: float.y, opacity: clamp(float.life, 0, 1) }}>{float.text}</div>)}
            </div>
          </div>

          <div className="eg-mobile-controls safe-bottom">
            <div className="eg-move-buttons">
              {(['left', 'right'] as ControlKey[]).map(key => <button key={key} onPointerDown={() => { controlsRef.current[key] = true; }} onPointerUp={() => { controlsRef.current[key] = false; }} onPointerCancel={() => { controlsRef.current[key] = false; }} onPointerLeave={() => { controlsRef.current[key] = false; }}>{keyLabel(key)}</button>)}
            </div>
            <div className="eg-action-buttons">
              {(['jump', 'attack', 'dash', 'skill', 'ultimate', 'potion'] as ControlKey[]).map(key => <button key={key} className={`eg-${key} ${key === 'ultimate' && runtime.player.ultimate >= 100 ? 'ready' : ''}`} onPointerDown={() => action(key)}>{keyLabel(key)}</button>)}
            </div>
          </div>

          {showGuide && <div className="eg-guide-card"><h2>How to Play</h2><p>Defeat enemies, collect power-ups, avoid hazards, charge ultimate, then enter the gate for the boss.</p><div className="eg-guide-grid"><span>A / D</span><b>Move</b><span>W / Space</span><b>Jump</b><span>J</span><b>Slash</b><span>K</span><b>Dash</b><span>L</span><b>Skill</b><span>U</span><b>Ultimate</b><span>P</span><b>Potion</b></div><button className="eg-start" onClick={() => setShowGuide(false)}>OKAY</button></div>}

          {paused && <div className="eg-pause-card"><h2>Paused</h2><p>{area.name} • {livingEnemies} monsters remaining • {character.name}</p><button className="eg-start" onClick={() => setPaused(false)}>Resume</button><button onClick={returnToGate}>{autoStart ? 'Return to 3D Village' : 'Return to Gate'}</button><button onClick={() => go('shop')}>Hero Shop</button><button onClick={() => go('settings')}>Settings</button></div>}

          {(runtime.phase === 'clear' || runtime.phase === 'defeat') && (
            <div className="eg-result-card">
              <h2>{runtime.phase === 'clear' ? 'Stage Clear!' : 'Defeated'}</h2>
              <p>{runtime.phase === 'clear' ? `Rewards: ${runtime.rewardXp} XP • ${runtime.rewardCoins} coins • Max Combo ${runtime.player.maxCombo}` : 'Return to the gate, upgrade gear, and try again.'}</p>
              {runtime.rewardLoot.length > 0 && <small>Loot: {runtime.rewardLoot.map(item => `${ITEMS[item.itemId]?.name ?? item.itemId} x${item.quantity}`).join(', ')}</small>}
              <div><button className="eg-start" onClick={returnToGate}>{autoStart ? 'Back to 3D Village' : 'Continue'}</button><button onClick={() => go('shop')}>Upgrade</button><button onClick={() => go('map')}>Map</button></div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
