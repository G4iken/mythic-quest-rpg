import type { BattleMode, BattleState, GameSave } from '../types';
import { AREAS, getArea } from '../data/areas';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { getEquippedStats, addItem, removeItem } from './inventory';
import { awardXp } from './progression';
import { progressQuest, syncCollectionQuests } from './questEngine';

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickLoot(enemyId: string) {
  const enemy = ENEMIES[enemyId];
  const loot: Array<{ itemId: string; quantity: number }> = [];
  enemy.lootTable.forEach(entry => {
    if (Math.random() <= entry.chance) {
      loot.push({ itemId: entry.itemId, quantity: randomBetween(entry.min, entry.max) });
    }
  });
  return loot;
}

export function createBattle(save: GameSave, areaId: string, mode: BattleMode): BattleState {
  const area = getArea(areaId);
  const enemyId = mode === 'boss'
    ? area.bossId
    : area.normalEnemyIds[Math.floor(Math.random() * area.normalEnemyIds.length)];
  const enemy = ENEMIES[enemyId];
  const stats = getEquippedStats(save);
  return {
    areaId,
    mode,
    enemyId,
    player: {
      name: save.player.name,
      level: save.player.level,
      hp: Math.max(1, Math.min(save.player.hp, stats.maxHp)),
      maxHp: stats.maxHp,
      mana: Math.max(0, Math.min(save.player.mana, stats.maxMana)),
      maxMana: stats.maxMana,
      attack: stats.attack,
      defense: stats.defense,
      icon: '🧙'
    },
    enemy: {
      name: enemy.name,
      level: enemy.level,
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      mana: 0,
      maxMana: 0,
      attack: enemy.attack,
      defense: enemy.defense,
      icon: enemy.icon
    },
    isPlayerDefending: false,
    turn: 'player',
    log: [mode === 'boss' ? `⚠️ ${enemy.name} blocks the path!` : `${enemy.name} appears in ${area.name}.`],
    damagePopups: []
  };
}

export function calculateDamage(attackerAttack: number, defenderDefense: number, multiplier = 1) {
  const base = Math.max(1, attackerAttack * multiplier - defenderDefense * 0.55);
  const variance = 0.85 + Math.random() * 0.3;
  const critical = Math.random() < 0.12;
  const damage = Math.floor(base * variance * (critical ? 1.65 : 1));
  return { damage: Math.max(1, damage), critical };
}

export function enemyTurn(state: BattleState): BattleState {
  if (state.enemy.hp <= 0) return { ...state, turn: 'won' };
  const bossLowHp = state.mode === 'boss' && state.enemy.hp / state.enemy.maxHp < 0.35;
  const roll = Math.random();
  const multiplier = bossLowHp ? 1.75 : state.mode === 'boss' && roll > .62 ? 1.45 : roll > .78 ? 1.3 : 1;
  const moveName = bossLowHp ? 'desperate special attack' : multiplier > 1.35 ? 'heavy attack' : multiplier > 1 ? 'strong attack' : 'basic attack';
  const { damage, critical } = calculateDamage(state.enemy.attack, state.player.defense, multiplier);
  const finalDamage = state.isPlayerDefending ? Math.ceil(damage * .45) : damage;
  const playerHp = Math.max(0, state.player.hp - finalDamage);
  return {
    ...state,
    player: { ...state.player, hp: playerHp },
    isPlayerDefending: false,
    turn: playerHp <= 0 ? 'lost' : 'player',
    log: [`${state.enemy.name} used ${moveName} for ${finalDamage} damage${critical ? ' — critical!' : ''}.`, ...state.log].slice(0, 9),
    damagePopups: [`-${finalDamage} HP`, ...state.damagePopups].slice(0, 4)
  };
}

export function playerAttack(state: BattleState, multiplier = 1, label = 'Attack'): BattleState {
  const { damage, critical } = calculateDamage(state.player.attack, state.enemy.defense, multiplier);
  const hp = Math.max(0, state.enemy.hp - damage);
  const next = {
    ...state,
    enemy: { ...state.enemy, hp },
    log: [`${state.player.name} used ${label} for ${damage} damage${critical ? ' — critical!' : ''}.`, ...state.log].slice(0, 9),
    damagePopups: [`-${damage}`, ...state.damagePopups].slice(0, 4)
  };
  return hp <= 0
    ? { ...next, turn: 'won' }
    : { ...next, turn: 'enemy', log: [`${state.enemy.name} is preparing a counterattack...`, ...next.log].slice(0, 9) };
}

export function playerDefend(state: BattleState): BattleState {
  return {
    ...state,
    isPlayerDefending: true,
    turn: 'enemy',
    log: [`${state.enemy.name} looks for an opening...`, `${state.player.name} braces behind their guard.`, ...state.log].slice(0, 9)
  };
}

export function usePotion(state: BattleState, save: GameSave, itemId: string) {
  const item = ITEMS[itemId];
  if (!item || item.type !== 'Potion') return { state, save };
  const owned = save.inventory.find(stack => stack.itemId === itemId)?.quantity ?? 0;
  if (owned <= 0) return { state: { ...state, log: [`No ${item.name} left.`, ...state.log].slice(0, 9) }, save };
  const healedHp = item.hpRestore ? Math.min(state.player.maxHp, state.player.hp + item.hpRestore) : state.player.hp;
  const healedMana = item.manaRestore ? Math.min(state.player.maxMana, state.player.mana + item.manaRestore) : state.player.mana;
  const usedSave = { ...save, inventory: removeItem(save.inventory, itemId, 1) };
  const next: BattleState = {
    ...state,
    player: { ...state.player, hp: healedHp, mana: healedMana },
    turn: 'enemy',
    log: [`${state.enemy.name} is preparing a counterattack...`, `Used ${item.name}.`, ...state.log].slice(0, 9)
  };
  return { state: next, save: usedSave };
}

export function resolveVictory(save: GameSave, state: BattleState) {
  const enemy = ENEMIES[state.enemyId];
  const loot = pickLoot(state.enemyId);
  let next: GameSave = {
    ...save,
    player: {
      ...save.player,
      hp: Math.max(1, state.player.hp),
      mana: Math.min(state.player.maxMana, state.player.mana + 8),
      coins: save.player.coins + enemy.coinReward,
      currentAreaId: state.areaId,
      bossesDefeated: enemy.isBoss && !save.player.bossesDefeated.includes(enemy.id)
        ? [...save.player.bossesDefeated, enemy.id]
        : save.player.bossesDefeated
    },
    areaProgress: save.areaProgress.map(area => area.areaId === state.areaId
      ? { ...area, normalWins: area.normalWins + (enemy.isBoss ? 0 : 1), bossDefeated: area.bossDefeated || enemy.isBoss }
      : area)
  };
  loot.forEach(entry => { next = { ...next, inventory: addItem(next.inventory, entry.itemId, entry.quantity) }; });

  const area = AREAS.find(a => a.id === state.areaId);
  if (enemy.isBoss && area?.nextAreaId && !next.player.unlockedAreaIds.includes(area.nextAreaId)) {
    next = { ...next, player: { ...next.player, unlockedAreaIds: [...next.player.unlockedAreaIds, area.nextAreaId] } };
  }

  next = progressQuest(next, enemy.isBoss ? 'defeat_boss' : 'defeat_enemy', 1, enemy.id);
  next = progressQuest(next, 'reach_level', next.player.level);
  next = syncCollectionQuests(next);
  const xpResult = awardXp(next, enemy.xpReward);
  next = progressQuest(xpResult.save, 'reach_level', xpResult.save.player.level);
  return { save: next, xp: enemy.xpReward, coins: enemy.coinReward, loot, leveledUp: xpResult.leveledUp, unlockedSkills: xpResult.unlockedSkills };
}

export function resolveDefeat(save: GameSave) {
  const lostCoins = Math.floor(save.player.coins * 0.1);
  return {
    ...save,
    player: {
      ...save.player,
      coins: Math.max(0, save.player.coins - lostCoins),
      hp: Math.ceil(save.player.baseStats.maxHp * .55),
      mana: Math.ceil(save.player.baseStats.maxMana * .5),
      currentAreaId: 'green-village'
    }
  };
}
