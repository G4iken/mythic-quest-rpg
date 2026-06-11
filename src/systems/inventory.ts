import type { GameSave, ItemStack } from '../types';
import { ITEMS } from '../data/items';
import { getCharacter } from '../data/characters';
import { getPet } from '../data/pets';
import { ARTIFACTS } from '../data/artifacts';

export function getQuantity(inventory: ItemStack[], itemId: string) {
  return inventory.find(stack => stack.itemId === itemId)?.quantity ?? 0;
}

export function addItem(inventory: ItemStack[], itemId: string, quantity = 1): ItemStack[] {
  if (quantity <= 0) return inventory;
  const existing = inventory.find(stack => stack.itemId === itemId);
  if (existing) {
    return inventory.map(stack => stack.itemId === itemId ? { ...stack, quantity: stack.quantity + quantity } : stack);
  }
  return [...inventory, { itemId, quantity }];
}

export function removeItem(inventory: ItemStack[], itemId: string, quantity = 1): ItemStack[] {
  return inventory
    .map(stack => stack.itemId === itemId ? { ...stack, quantity: stack.quantity - quantity } : stack)
    .filter(stack => stack.quantity > 0);
}

export function addRewardItems(save: GameSave, items: Array<{ itemId: string; quantity: number }> = []) {
  return items.reduce((next, reward) => ({ ...next, inventory: addItem(next.inventory, reward.itemId, reward.quantity) }), save);
}

export function getEquippedStats(save: GameSave) {
  const weapon = ITEMS[save.player.equippedWeaponId];
  const armor = ITEMS[save.player.equippedArmorId];
  const character = getCharacter(save.player.characterId);
  const weaponLevel = save.player.equipmentLevels?.[save.player.equippedWeaponId] ?? 0;
  const armorLevel = save.player.equipmentLevels?.[save.player.equippedArmorId] ?? 0;
  const path = save.player.skillTree?.activePath ?? 'blade';
  const bladeBoost = path === 'blade' ? 4 + (save.player.skillTree?.unlockedNodes.length ?? 0) : 0;
  const magicBoost = path === 'magic' ? 12 : 0;
  const guardianBoost = path === 'guardian' ? 18 : 0;
  const pet = getPet(save.player.activePetId);
  const artifactBonus = Object.entries(save.player.artifacts ?? {}).reduce((bonus, [artifactId, level]) => {
    const artifact = ARTIFACTS[artifactId];
    if (!artifact) return bonus;
    return {
      maxHp: bonus.maxHp + (artifact.statPerLevel.maxHp ?? 0) * level,
      maxMana: bonus.maxMana + (artifact.statPerLevel.maxMana ?? 0) * level,
      attack: bonus.attack + (artifact.statPerLevel.attack ?? 0) * level,
      defense: bonus.defense + (artifact.statPerLevel.defense ?? 0) * level
    };
  }, { maxHp: 0, maxMana: 0, attack: 0, defense: 0 });
  return {
    maxHp: Math.max(1, save.player.baseStats.maxHp + character.hpBonus + guardianBoost + (pet.statBonus.maxHp ?? 0) + artifactBonus.maxHp),
    maxMana: Math.max(1, save.player.baseStats.maxMana + character.manaBonus + magicBoost + (pet.statBonus.maxMana ?? 0) + artifactBonus.maxMana),
    attack: save.player.baseStats.attack + (weapon?.attackBonus ?? 0) + character.attackBonus + weaponLevel * 3 + bladeBoost + (pet.statBonus.attack ?? 0) + artifactBonus.attack,
    defense: save.player.baseStats.defense + (armor?.defenseBonus ?? 0) + character.defenseBonus + armorLevel * 3 + (path === 'guardian' ? 3 : 0) + (pet.statBonus.defense ?? 0) + artifactBonus.defense
  };
}

export function equipItem(save: GameSave, itemId: string): GameSave {
  const item = ITEMS[itemId];
  if (!item || getQuantity(save.inventory, itemId) <= 0) return save;
  if (item.type === 'Weapon') return { ...save, player: { ...save.player, equippedWeaponId: itemId } };
  if (item.type === 'Armor') return { ...save, player: { ...save.player, equippedArmorId: itemId } };
  return save;
}
