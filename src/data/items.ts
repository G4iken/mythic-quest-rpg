import type { ItemData } from '../types';

export const ITEMS: Record<string, ItemData> = {
  'wooden-sword': {
    id: 'wooden-sword', name: 'Wooden Sword', description: 'A reliable starter blade carved by the village carpenter.',
    type: 'Weapon', rarity: 'Common', attackBonus: 3, sellPrice: 8, icon: '🪵'
  },
  'iron-blade': {
    id: 'iron-blade', name: 'Iron Blade', description: 'A balanced sword forged by the village blacksmith.',
    type: 'Weapon', rarity: 'Uncommon', attackBonus: 8, sellPrice: 38, icon: '⚔️'
  },
  'crystal-saber': {
    id: 'crystal-saber', name: 'Crystal Saber', description: 'A sharp saber humming with cave crystal energy.',
    type: 'Weapon', rarity: 'Rare', attackBonus: 15, sellPrice: 92, icon: '💎'
  },
  'ruin-greatsword': {
    id: 'ruin-greatsword', name: 'Ruin Greatsword', description: 'Ancient steel that glows near forgotten ruins.',
    type: 'Weapon', rarity: 'Epic', attackBonus: 25, sellPrice: 170, icon: '🗡️'
  },
  'flame-katana': {
    id: 'flame-katana', name: 'Flame Katana', description: 'A volcanic blade with a red-hot edge.',
    type: 'Weapon', rarity: 'Epic', attackBonus: 34, sellPrice: 260, icon: '🔥'
  },
  'skybreaker-sword': {
    id: 'skybreaker-sword', name: 'Skybreaker Sword', description: 'A legendary sword said to split storm clouds.',
    type: 'Weapon', rarity: 'Legendary', attackBonus: 48, sellPrice: 500, icon: '🌩️'
  },
  'cloth-tunic': {
    id: 'cloth-tunic', name: 'Cloth Tunic', description: 'Simple village clothing. Better than nothing.',
    type: 'Armor', rarity: 'Common', defenseBonus: 2, sellPrice: 6, icon: '👕'
  },
  'leather-armor': {
    id: 'leather-armor', name: 'Leather Armor', description: 'Flexible armor for forest travel.',
    type: 'Armor', rarity: 'Uncommon', defenseBonus: 7, sellPrice: 30, icon: '🥋'
  },
  'crystal-mail': {
    id: 'crystal-mail', name: 'Crystal Mail', description: 'Light armor reinforced with cave crystals.',
    type: 'Armor', rarity: 'Rare', defenseBonus: 13, sellPrice: 85, icon: '🛡️'
  },
  'ancient-plate': {
    id: 'ancient-plate', name: 'Ancient Plate', description: 'Heavy ruins armor etched with old royal marks.',
    type: 'Armor', rarity: 'Epic', defenseBonus: 22, sellPrice: 160, icon: '🏰'
  },
  'flame-guard': {
    id: 'flame-guard', name: 'Flame Guard', description: 'Heat-resistant armor made near Lava Mountain.',
    type: 'Armor', rarity: 'Epic', defenseBonus: 31, sellPrice: 250, icon: '🌋'
  },
  'sky-temple-armor': {
    id: 'sky-temple-armor', name: 'Sky Temple Armor', description: 'Legendary armor blessed by wind spirits.',
    type: 'Armor', rarity: 'Legendary', defenseBonus: 44, sellPrice: 500, icon: '☁️'
  },
  'small-health-potion': {
    id: 'small-health-potion', name: 'Small Health Potion', description: 'Restores 30 HP during battle.',
    type: 'Potion', rarity: 'Common', hpRestore: 30, sellPrice: 5, icon: '🧪'
  },
  'medium-health-potion': {
    id: 'medium-health-potion', name: 'Medium Health Potion', description: 'Restores 70 HP during battle.',
    type: 'Potion', rarity: 'Uncommon', hpRestore: 70, sellPrice: 15, icon: '🍷'
  },
  'large-health-potion': {
    id: 'large-health-potion', name: 'Large Health Potion', description: 'Restores 140 HP during battle.',
    type: 'Potion', rarity: 'Rare', hpRestore: 140, sellPrice: 40, icon: '💖'
  },
  'mana-potion': {
    id: 'mana-potion', name: 'Mana Potion', description: 'Restores 40 mana during battle.',
    type: 'Potion', rarity: 'Uncommon', manaRestore: 40, sellPrice: 18, icon: '🔮'
  },
  herb: {
    id: 'herb', name: 'Village Herb', description: 'A quest herb used by the Village Elder.',
    type: 'Quest', rarity: 'Common', sellPrice: 2, icon: '🌿'
  },
  'slime-gel': {
    id: 'slime-gel', name: 'Slime Gel', description: 'Sticky monster loot used for beginner quests.',
    type: 'Quest', rarity: 'Common', sellPrice: 3, icon: '🟢'
  },
  'wolf-fang': {
    id: 'wolf-fang', name: 'Wolf Fang', description: 'A sharp fang from Forest Path wolves.',
    type: 'Quest', rarity: 'Uncommon', sellPrice: 7, icon: '🦷'
  },
  'crystal-shard': {
    id: 'crystal-shard', name: 'Crystal Shard', description: 'A shining cave shard with faint magic.',
    type: 'Quest', rarity: 'Rare', sellPrice: 18, icon: '🔷'
  },
  'swift-tonic': {
    id: 'swift-tonic', name: 'Swift Tonic', description: 'Restores HP and gives a short burst of momentum in action stages.',
    type: 'Potion', rarity: 'Rare', hpRestore: 95, manaRestore: 20, sellPrice: 35, icon: '💨'
  },
  'phoenix-elixir': {
    id: 'phoenix-elixir', name: 'Phoenix Elixir', description: 'Premium potion for late-game boss runs. Restores a large amount of HP and mana.',
    type: 'Potion', rarity: 'Epic', hpRestore: 230, manaRestore: 80, sellPrice: 120, icon: '🧡'
  },
  'moonblade': {
    id: 'moonblade', name: 'Moonblade', description: 'A silver blade that glows during night stages.',
    type: 'Weapon', rarity: 'Epic', attackBonus: 58, sellPrice: 620, icon: '🌙'
  },
  'void-scepter': {
    id: 'void-scepter', name: 'Void Scepter', description: 'A dark magic weapon that empowers skill damage.',
    type: 'Weapon', rarity: 'Legendary', attackBonus: 72, sellPrice: 980, icon: '🪄'
  },
  'etherblade': {
    id: 'etherblade', name: 'Etherblade', description: 'Final gate weapon forged from dimensional light.',
    type: 'Weapon', rarity: 'Legendary', attackBonus: 92, sellPrice: 1500, icon: '🌌'
  },
  'moonveil-cloak': {
    id: 'moonveil-cloak', name: 'Moonveil Cloak', description: 'Light armor that helps agile heroes survive graveyard fights.',
    type: 'Armor', rarity: 'Epic', defenseBonus: 52, sellPrice: 560, icon: '🧥'
  },
  'dragonlord-armor': {
    id: 'dragonlord-armor', name: 'Dragonlord Armor', description: 'Heavy armor from the citadel throne room.',
    type: 'Armor', rarity: 'Legendary', defenseBonus: 70, sellPrice: 1100, icon: '🐲'
  },
  'seraph-plate': {
    id: 'seraph-plate', name: 'Seraph Plate', description: 'Final armor that shines near the Ethereal Gate.',
    type: 'Armor', rarity: 'Legendary', defenseBonus: 92, sellPrice: 1600, icon: '🪽'
  },
  'moon-essence': {
    id: 'moon-essence', name: 'Moon Essence', description: 'Rare graveyard material used by hero guild quests.',
    type: 'Quest', rarity: 'Epic', sellPrice: 60, icon: '🌕'
  },
  'void-ink': {
    id: 'void-ink', name: 'Void Ink', description: 'Forbidden ink dropped from abyssal books.',
    type: 'Quest', rarity: 'Epic', sellPrice: 75, icon: '🖤'
  },
  'dragon-scale': {
    id: 'dragon-scale', name: 'Dragon Scale', description: 'A hot scale from the Dragon Citadel army.',
    type: 'Quest', rarity: 'Legendary', sellPrice: 120, icon: '🐉'
  },
  'ether-core': {
    id: 'ether-core', name: 'Ether Core', description: 'Final-stage material from rift monsters.',
    type: 'Quest', rarity: 'Legendary', sellPrice: 150, icon: '💠'
  }
  ,
  'bronze-token': { id: 'bronze-token', name: 'Bronze Token', description: 'Guild token used for early upgrades and affinity gifts.', type: 'Material', rarity: 'Common', sellPrice: 6, icon: '🟤' },
  'venom-sac': { id: 'venom-sac', name: 'Venom Sac', description: 'Poison material used for rogue gear and challenge crafts.', type: 'Material', rarity: 'Uncommon', sellPrice: 16, icon: '🧪' },
  'living-bark': { id: 'living-bark', name: 'Living Bark', description: 'Wood that still pulses with forest magic.', type: 'Material', rarity: 'Uncommon', sellPrice: 18, icon: '🪵' },
  'glow-dust': { id: 'glow-dust', name: 'Glow Dust', description: 'Sparkling cave powder used for mage upgrades.', type: 'Material', rarity: 'Uncommon', sellPrice: 22, icon: '✨' },
  'echo-claw': { id: 'echo-claw', name: 'Echo Claw', description: 'A claw that vibrates with cave sound waves.', type: 'Material', rarity: 'Rare', sellPrice: 34, icon: '🦴' },
  'relic-dust': { id: 'relic-dust', name: 'Relic Dust', description: 'Powder scraped from cursed ruins.', type: 'Material', rarity: 'Rare', sellPrice: 38, icon: '⌛' },
  'ancient-rune': { id: 'ancient-rune', name: 'Ancient Rune', description: 'A carved rune used for artifacts and legendary reforges.', type: 'Material', rarity: 'Epic', sellPrice: 75, icon: '🔣' },
  'ember-ore': { id: 'ember-ore', name: 'Ember Ore', description: 'Hot ore from Lava Mountain.', type: 'Material', rarity: 'Rare', sellPrice: 55, icon: '🪨' },
  'obsidian-chip': { id: 'obsidian-chip', name: 'Obsidian Chip', description: 'Sharp black stone used for defensive gear.', type: 'Material', rarity: 'Rare', sellPrice: 58, icon: '⬛' },
  'storm-feather': { id: 'storm-feather', name: 'Storm Feather', description: 'A charged feather from Sky Temple creatures.', type: 'Material', rarity: 'Epic', sellPrice: 82, icon: '🪶' },
  'storm-charm': { id: 'storm-charm', name: 'Storm Charm', description: 'Crackling charm used for speed and ultimate builds.', type: 'Material', rarity: 'Epic', sellPrice: 95, icon: '🌩️' },
  'silver-flame': { id: 'silver-flame', name: 'Silver Flame', description: 'Cold fire that burns in the Moon Graveyard.', type: 'Material', rarity: 'Epic', sellPrice: 100, icon: '🕯️' },
  'phase-claw': { id: 'phase-claw', name: 'Phase Claw', description: 'A claw from a creature that moves between dimensions.', type: 'Material', rarity: 'Legendary', sellPrice: 170, icon: '👁️' },
  'frost-core': { id: 'frost-core', name: 'Frost Core', description: 'Frozen power source from Frost Harbor monsters.', type: 'Material', rarity: 'Epic', sellPrice: 145, icon: '❄️' },
  'glacier-shell': { id: 'glacier-shell', name: 'Glacier Shell', description: 'Heavy shell fragment from frozen sea creatures.', type: 'Material', rarity: 'Epic', sellPrice: 155, icon: '🦀' },
  'forge-pearl': { id: 'forge-pearl', name: 'Forge Pearl', description: 'Pearl heated by underwater vents.', type: 'Material', rarity: 'Legendary', sellPrice: 220, icon: '⚪' },
  'rusted-scale': { id: 'rusted-scale', name: 'Rusted Scale', description: 'Scale hardened by ancient forge water.', type: 'Material', rarity: 'Epic', sellPrice: 160, icon: '🐍' },
  'star-core': { id: 'star-core', name: 'Star Core', description: 'A cosmic core used for the strongest endgame crafts.', type: 'Material', rarity: 'Legendary', sellPrice: 300, icon: '⭐' },
  'glacier-halberd': { id: 'glacier-halberd', name: 'Glacier Halberd', description: 'Late-game ice weapon for crowd control and elite waves.', type: 'Weapon', rarity: 'Legendary', attackBonus: 108, sellPrice: 1900, icon: '❄️' },
  'abyssal-anvil': { id: 'abyssal-anvil', name: 'Abyssal Anvil', description: 'A legendary crafting catalyst from the Sunken Forge.', type: 'Material', rarity: 'Legendary', sellPrice: 650, icon: '⚒️' },
  'tidebreaker-armor': { id: 'tidebreaker-armor', name: 'Tidebreaker Armor', description: 'Endgame armor forged beneath the sea.', type: 'Armor', rarity: 'Legendary', defenseBonus: 112, sellPrice: 2100, icon: '🌊' },
  'starforged-blade': { id: 'starforged-blade', name: 'Starforged Blade', description: 'Final arc weapon forged from astral cores.', type: 'Weapon', rarity: 'Legendary', attackBonus: 135, sellPrice: 2800, icon: '🌠' },
  'astral-plate': { id: 'astral-plate', name: 'Astral Plate', description: 'Armor that bends gravity around the hero.', type: 'Armor', rarity: 'Legendary', defenseBonus: 135, sellPrice: 2800, icon: '🪐' },
  'ranger-bow': { id: 'ranger-bow', name: 'Ranger Bow', description: 'Weapon for players who prefer fast stage clears and safe spacing.', type: 'Weapon', rarity: 'Epic', attackBonus: 68, sellPrice: 900, icon: '🏹' },
  'void-robe': { id: 'void-robe', name: 'Void Robe', description: 'Mage armor that supports mana-heavy builds.', type: 'Armor', rarity: 'Epic', defenseBonus: 62, sellPrice: 820, icon: '🖤' }

};

export const SHOP_STOCK = [
  { itemId: 'small-health-potion', price: 15, category: 'Potions' },
  { itemId: 'medium-health-potion', price: 45, category: 'Potions' },
  { itemId: 'large-health-potion', price: 110, category: 'Potions' },
  { itemId: 'mana-potion', price: 55, category: 'Potions' },
  { itemId: 'swift-tonic', price: 130, category: 'Potions' },
  { itemId: 'phoenix-elixir', price: 420, category: 'Potions' },
  { itemId: 'iron-blade', price: 120, category: 'Weapons' },
  { itemId: 'crystal-saber', price: 420, category: 'Weapons' },
  { itemId: 'ruin-greatsword', price: 760, category: 'Weapons' },
  { itemId: 'flame-katana', price: 1100, category: 'Weapons' },
  { itemId: 'moonblade', price: 1800, category: 'Weapons' },
  { itemId: 'void-scepter', price: 2600, category: 'Weapons' },
  { itemId: 'leather-armor', price: 100, category: 'Armor' },
  { itemId: 'crystal-mail', price: 380, category: 'Armor' },
  { itemId: 'ancient-plate', price: 720, category: 'Armor' },
  { itemId: 'flame-guard', price: 1050, category: 'Armor' },
  { itemId: 'moonveil-cloak', price: 1600, category: 'Armor' },
  { itemId: 'dragonlord-armor', price: 3000, category: 'Armor' }
  ,{ itemId: 'ranger-bow', price: 2400, category: 'Weapons' },
  { itemId: 'glacier-halberd', price: 4200, category: 'Weapons' },
  { itemId: 'starforged-blade', price: 6800, category: 'Weapons' },
  { itemId: 'void-robe', price: 2100, category: 'Armor' },
  { itemId: 'tidebreaker-armor', price: 4600, category: 'Armor' },
  { itemId: 'astral-plate', price: 7200, category: 'Armor' }

];
