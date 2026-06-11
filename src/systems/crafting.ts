import type { GameSave } from '../types';
import { addItem, getQuantity, removeItem } from './inventory';

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  resultItemId: string;
  resultQuantity: number;
  coinCost: number;
  materials: Array<{ itemId: string; quantity: number }>;
  requiredLevel: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft-crystal-saber',
    name: 'Crystal Saber Forge',
    description: 'Turn cave shards and monster gel into a sharp rare blade.',
    resultItemId: 'crystal-saber',
    resultQuantity: 1,
    coinCost: 160,
    requiredLevel: 3,
    materials: [{ itemId: 'crystal-shard', quantity: 3 }, { itemId: 'slime-gel', quantity: 5 }]
  },
  {
    id: 'craft-flame-katana',
    name: 'Flame Katana Tempering',
    description: 'Use dragon scale heat to craft an epic fire weapon.',
    resultItemId: 'flame-katana',
    resultQuantity: 1,
    coinCost: 360,
    requiredLevel: 6,
    materials: [{ itemId: 'dragon-scale', quantity: 2 }, { itemId: 'wolf-fang', quantity: 4 }]
  },
  {
    id: 'craft-moonveil',
    name: 'Moonveil Cloak Weaving',
    description: 'A graveyard cloak for dodging elemental strikes.',
    resultItemId: 'moonveil-cloak',
    resultQuantity: 1,
    coinCost: 420,
    requiredLevel: 8,
    materials: [{ itemId: 'moon-essence', quantity: 3 }, { itemId: 'void-ink', quantity: 2 }]
  },
  {
    id: 'craft-etherblade',
    name: 'Etherblade Awakening',
    description: 'A final-gate legendary weapon forged from rift materials.',
    resultItemId: 'etherblade',
    resultQuantity: 1,
    coinCost: 900,
    requiredLevel: 10,
    materials: [{ itemId: 'ether-core', quantity: 3 }, { itemId: 'dragon-scale', quantity: 2 }, { itemId: 'void-ink', quantity: 2 }]
  },
  {
    id: 'craft-phoenix-elixir',
    name: 'Phoenix Elixir Brewing',
    description: 'Late-game potion crafted for Nightmare boss fights.',
    resultItemId: 'phoenix-elixir',
    resultQuantity: 2,
    coinCost: 180,
    requiredLevel: 5,
    materials: [{ itemId: 'herb', quantity: 4 }, { itemId: 'moon-essence', quantity: 1 }]
  }
  ,
  { id: 'craft-ranger-bow', name: 'Ranger Bow Stringing', description: 'Craft an agile bow from living bark and storm feathers.', resultItemId: 'ranger-bow', resultQuantity: 1, coinCost: 520, requiredLevel: 9, materials: [{ itemId: 'living-bark', quantity: 4 }, { itemId: 'storm-feather', quantity: 3 }, { itemId: 'venom-sac', quantity: 2 }] },
  { id: 'craft-void-robe', name: 'Void Robe Stitching', description: 'Late-game mage armor made from void ink and moon essence.', resultItemId: 'void-robe', resultQuantity: 1, coinCost: 680, requiredLevel: 15, materials: [{ itemId: 'void-ink', quantity: 5 }, { itemId: 'moon-essence', quantity: 3 }, { itemId: 'silver-flame', quantity: 2 }] },
  { id: 'craft-glacier-halberd', name: 'Glacier Halberd Forging', description: 'Endgame ice weapon from Frost Harbor materials.', resultItemId: 'glacier-halberd', resultQuantity: 1, coinCost: 1200, requiredLevel: 30, materials: [{ itemId: 'frost-core', quantity: 5 }, { itemId: 'glacier-shell', quantity: 3 }, { itemId: 'storm-charm', quantity: 2 }] },
  { id: 'craft-tidebreaker', name: 'Tidebreaker Armor Forge', description: 'Underwater forge armor for Hard and Nightmare bosses.', resultItemId: 'tidebreaker-armor', resultQuantity: 1, coinCost: 1600, requiredLevel: 34, materials: [{ itemId: 'forge-pearl', quantity: 6 }, { itemId: 'rusted-scale', quantity: 4 }, { itemId: 'abyssal-anvil', quantity: 1 }] },
  { id: 'craft-starforged-blade', name: 'Starforged Blade Awakening', description: 'The strongest craftable weapon in the Astral Throne arc.', resultItemId: 'starforged-blade', resultQuantity: 1, coinCost: 2500, requiredLevel: 38, materials: [{ itemId: 'star-core', quantity: 8 }, { itemId: 'ether-core', quantity: 5 }, { itemId: 'abyssal-anvil', quantity: 1 }] },
  { id: 'craft-astral-plate', name: 'Astral Plate Alignment', description: 'Final arc armor for players pushing leaderboard runs.', resultItemId: 'astral-plate', resultQuantity: 1, coinCost: 2500, requiredLevel: 38, materials: [{ itemId: 'star-core', quantity: 8 }, { itemId: 'seraph-plate', quantity: 1 }, { itemId: 'forge-pearl', quantity: 5 }] }

];

export function canCraft(save: GameSave, recipe: CraftingRecipe) {
  return save.player.level >= recipe.requiredLevel
    && save.player.coins >= recipe.coinCost
    && recipe.materials.every(material => getQuantity(save.inventory, material.itemId) >= material.quantity);
}

export function craftItem(save: GameSave, recipe: CraftingRecipe): GameSave {
  if (!canCraft(save, recipe)) return save;
  let inventory = save.inventory;
  recipe.materials.forEach(material => { inventory = removeItem(inventory, material.itemId, material.quantity); });
  inventory = addItem(inventory, recipe.resultItemId, recipe.resultQuantity);
  return {
    ...save,
    inventory,
    player: { ...save.player, coins: save.player.coins - recipe.coinCost }
  };
}
