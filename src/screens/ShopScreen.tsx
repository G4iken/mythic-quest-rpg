import { useMemo, useState } from 'react';
import type { GameSave } from '../types';
import { ITEMS, SHOP_STOCK } from '../data/items';
import { CHARACTER_ORDER, canUseCharacter, getCharacter, getUnlockedCharacterIds } from '../data/characters';
import { PET_ORDER, getPet, getUnlockedPetIds } from '../data/pets';
import { ARTIFACT_ORDER } from '../data/artifacts';
import { addItem, removeItem, getQuantity } from '../systems/inventory';
import { CRAFTING_RECIPES, canCraft, craftItem } from '../systems/crafting';
import { audio } from '../services/audioService';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
  notify: (message: string, kind?: 'info' | 'success' | 'warning' | 'danger') => void;
}

type ShopTab = 'Potions' | 'Weapons' | 'Armor' | 'Heroes' | 'Pets' | 'Artifacts' | 'Upgrade' | 'Craft' | 'Sell';
const tabs: ShopTab[] = ['Potions', 'Weapons', 'Armor', 'Heroes', 'Pets', 'Artifacts', 'Upgrade', 'Craft', 'Sell'];

export function ShopScreen({ save, updateSave, notify }: Props) {
  const [tab, setTab] = useState<ShopTab>('Potions');
  const unlockedCharacters = useMemo(() => getUnlockedCharacterIds(save), [save]);
  const unlockedPets = useMemo(() => getUnlockedPetIds(save), [save]);
  const currentCharacter = getCharacter(save.player.characterId);
  const currentPet = getPet(save.player.activePetId);

  function buy(itemId: string, price: number) {
    if (save.player.coins < price) {
      notify('Not enough coins.', 'warning');
      return;
    }
    updateSave({ ...save, player: { ...save.player, coins: save.player.coins - price }, inventory: addItem(save.inventory, itemId, 1) }, true);
    audio.playSfx('coin');
    notify(`Bought ${ITEMS[itemId].name}.`, 'success');
  }

  function buyCharacter(characterId: string) {
    const character = getCharacter(characterId);
    if (canUseCharacter(save, characterId)) {
      updateSave({ ...save, player: { ...save.player, characterId } }, true);
      notify(`${character.name} is now your active hero.`, 'success');
      audio.playSfx('levelUp');
      return;
    }
    if (character.unlockMethod === 'story') {
      notify(`${character.name} is unlocked through the story later.`, 'warning');
      return;
    }
    if (save.player.level < character.unlockLevel) {
      notify(`${character.name} requires Level ${character.unlockLevel}.`, 'warning');
      return;
    }
    if (save.player.coins < character.price) {
      notify(`Need ${character.price} coins to unlock ${character.name}.`, 'warning');
      return;
    }
    const ids = save.player.unlockedCharacterIds?.length ? save.player.unlockedCharacterIds : ['wanderer'];
    updateSave({
      ...save,
      player: {
        ...save.player,
        coins: save.player.coins - character.price,
        characterId,
        unlockedCharacterIds: [...ids, characterId]
      }
    }, true);
    audio.playSfx('levelUp');
    notify(`Unlocked ${character.name}!`, 'success');
  }


  function buyPet(petId: string) {
    const pet = getPet(petId);
    const owned = unlockedPets.includes(petId);
    if (owned) {
      updateSave({ ...save, player: { ...save.player, activePetId: petId } }, true);
      audio.playSfx('levelUp');
      notify(`${pet.name} is now following you.`, 'success');
      return;
    }
    if (save.player.level < pet.unlockLevel) {
      notify(`${pet.name} requires Level ${pet.unlockLevel}.`, 'warning');
      return;
    }
    if (save.player.coins < pet.price) {
      notify(`Need ${pet.price} coins to unlock ${pet.name}.`, 'warning');
      return;
    }
    updateSave({
      ...save,
      player: {
        ...save.player,
        coins: save.player.coins - pet.price,
        activePetId: petId,
        unlockedPetIds: [...new Set([...(save.player.unlockedPetIds ?? ['ember-sprite']), petId])]
      }
    }, true);
    audio.playSfx('levelUp');
    notify(`Unlocked companion: ${pet.name}.`, 'success');
  }

  function upgradeArtifact(artifactId: string) {
    const artifact = ARTIFACT_ORDER.find(next => next.id === artifactId);
    if (!artifact) return;
    const level = save.player.artifacts?.[artifactId] ?? 0;
    if (level >= artifact.maxLevel) {
      notify(`${artifact.name} is already max level.`, 'warning');
      return;
    }
    const cost = artifact.price + level * 320;
    if (save.player.coins < cost) {
      notify(`Need ${cost} coins to upgrade ${artifact.name}.`, 'warning');
      return;
    }
    updateSave({
      ...save,
      player: {
        ...save.player,
        coins: save.player.coins - cost,
        artifacts: { ...(save.player.artifacts ?? {}), [artifactId]: level + 1 }
      }
    }, true);
    audio.playSfx('levelUp');
    notify(`${artifact.name} upgraded to Lv ${level + 1}.`, 'success');
  }

  function upgradeEquipped(kind: 'weapon' | 'armor') {
    const itemId = kind === 'weapon' ? save.player.equippedWeaponId : save.player.equippedArmorId;
    const level = save.player.equipmentLevels?.[itemId] ?? 0;
    if (level >= 10) {
      notify('This item is already at +10.', 'warning');
      return;
    }
    const cost = 90 + level * 85 + (kind === 'armor' ? 20 : 0);
    if (save.player.coins < cost) {
      notify(`Need ${cost} coins for this upgrade.`, 'warning');
      return;
    }
    updateSave({
      ...save,
      player: {
        ...save.player,
        coins: save.player.coins - cost,
        equipmentLevels: { ...(save.player.equipmentLevels ?? {}), [itemId]: level + 1 }
      }
    }, true);
    audio.playSfx('levelUp');
    notify(`${ITEMS[itemId].name} upgraded to +${level + 1}.`, 'success');
  }

  function reforgeBuild(path: 'blade' | 'magic' | 'guardian') {
    const cost = 160;
    if (save.player.coins < cost) {
      notify(`Need ${cost} coins to reforge your build.`, 'warning');
      return;
    }
    updateSave({
      ...save,
      player: {
        ...save.player,
        coins: save.player.coins - cost,
        skillTree: { activePath: path, unlockedNodes: save.player.skillTree?.unlockedNodes ?? ['blade-1'] }
      }
    }, true);
    audio.playSfx('skill');
    notify(`Build reforged to ${path.toUpperCase()} path.`, 'success');
  }

  function craft(recipeId: string) {
    const recipe = CRAFTING_RECIPES.find(next => next.id === recipeId);
    if (!recipe) return;
    if (!canCraft(save, recipe)) {
      notify('Missing materials, level, or coins for this recipe.', 'warning');
      return;
    }
    updateSave(craftItem(save, recipe), true);
    audio.playSfx('levelUp');
    notify(`Crafted ${ITEMS[recipe.resultItemId].name}.`, 'success');
  }

  function sell(itemId: string) {
    const item = ITEMS[itemId];
    if (item.type === 'Quest') {
      notify('Quest items cannot be sold.', 'warning');
      return;
    }
    if (save.player.equippedWeaponId === itemId || save.player.equippedArmorId === itemId) {
      notify('This item is equipped. Equip another item first.', 'warning');
      return;
    }
    updateSave({ ...save, player: { ...save.player, coins: save.player.coins + item.sellPrice }, inventory: removeItem(save.inventory, itemId, 1) }, true);
    audio.playSfx('coin');
    notify(`Sold ${item.name}.`, 'success');
  }

  const stock = SHOP_STOCK.filter(stock => stock.category === tab);

  return (
    <section className="shop-screen upgraded-shop">
      <div className="screen-heading">
        <p className="eyebrow">Merchant Guild</p>
        <h1>Gate Market</h1>
        <p>Coins: {save.player.coins} 🪙 • Active Hero: {currentCharacter.icon} {currentCharacter.name} • Pet: {currentPet.icon} {currentPet.name}</p>
      </div>

      <div className="shop-tabs">
        {tabs.map(next => <button key={next} className={tab === next ? 'active' : ''} onClick={() => setTab(next)}>{next}</button>)}
      </div>

      {tab !== 'Heroes' && tab !== 'Pets' && tab !== 'Artifacts' && tab !== 'Sell' && tab !== 'Upgrade' && tab !== 'Craft' && (
        <div className="shop-grid">
          {stock.map(stockItem => {
            const item = ITEMS[stockItem.itemId];
            return (
              <article key={stockItem.itemId} className={`shop-card rarity-${item.rarity.toLowerCase()}`}>
                <div className="shop-icon">{item.icon}</div>
                <div>
                  <small>{item.rarity} {item.type}</small>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                  <div className="shop-stat-line">
                    {item.attackBonus ? <span>+{item.attackBonus} ATK</span> : null}
                    {item.defenseBonus ? <span>+{item.defenseBonus} DEF</span> : null}
                    {item.hpRestore ? <span>+{item.hpRestore} HP</span> : null}
                    {item.manaRestore ? <span>+{item.manaRestore} MP</span> : null}
                  </div>
                </div>
                <button className="primary" onClick={() => buy(stockItem.itemId, stockItem.price)}>{stockItem.price} 🪙</button>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'Heroes' && (
        <div className="hero-shop-grid">
          {CHARACTER_ORDER.map(character => {
            const owned = unlockedCharacters.includes(character.id);
            const active = (save.player.characterId ?? 'wanderer') === character.id;
            const lockedStory = character.unlockMethod === 'story' && !owned;
            return (
              <article key={character.id} className={`hero-shop-card ${character.className} ${active ? 'active' : ''}`}>
                <div className="hero-shop-avatar"><span>{character.icon}</span></div>
                <div className="hero-shop-info">
                  <small>{character.role} • {owned ? 'Owned' : lockedStory ? 'Story Unlock' : `${character.price} Coins`}</small>
                  <h2>{character.name}</h2>
                  <p>{character.title}</p>
                  <p>{character.description}</p>
                  <div className="shop-stat-line">
                    <span>{character.hpBonus >= 0 ? '+' : ''}{character.hpBonus} HP</span>
                    <span>{character.attackBonus >= 0 ? '+' : ''}{character.attackBonus} ATK</span>
                    <span>{character.defenseBonus >= 0 ? '+' : ''}{character.defenseBonus} DEF</span>
                    <span>{character.speedBonus >= 0 ? '+' : ''}{character.speedBonus} SPD</span>
                  </div>
                  <b>{character.skillName}</b>
                  <p>{character.skillDescription}</p>
                </div>
                <button className={active ? 'secondary' : 'primary'} onClick={() => buyCharacter(character.id)}>
                  {active ? 'Equipped' : owned ? 'Use Hero' : lockedStory ? `Reach story` : `Unlock ${character.price}🪙`}
                </button>
              </article>
            );
          })}
        </div>
      )}


      {tab === 'Pets' && (
        <div className="hero-shop-grid companion-grid">
          {PET_ORDER.map(pet => {
            const owned = unlockedPets.includes(pet.id);
            const active = (save.player.activePetId ?? 'ember-sprite') === pet.id;
            return (
              <article key={pet.id} className={`hero-shop-card pet-card ${active ? 'active' : ''}`}>
                <div className="hero-shop-avatar"><span>{pet.icon}</span></div>
                <div className="hero-shop-info">
                  <small>Companion • Lv {pet.unlockLevel}+ • {owned ? 'Owned' : `${pet.price} Coins`}</small>
                  <h2>{pet.name}</h2>
                  <p>{pet.title}</p>
                  <p>{pet.description}</p>
                  <div className="shop-stat-line"><span>{pet.passive}</span></div>
                </div>
                <button className={active ? 'secondary' : 'primary'} onClick={() => buyPet(pet.id)}>{active ? 'Following' : owned ? 'Use Pet' : `Unlock ${pet.price}🪙`}</button>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'Artifacts' && (
        <div className="shop-grid artifact-grid">
          {ARTIFACT_ORDER.map(artifact => {
            const level = save.player.artifacts?.[artifact.id] ?? 0;
            const cost = artifact.price + level * 320;
            return (
              <article key={artifact.id} className="shop-card artifact-card">
                <div className="shop-icon">{artifact.icon}</div>
                <div>
                  <small>Artifact • Lv {level}/{artifact.maxLevel}</small>
                  <h2>{artifact.name}</h2>
                  <p>{artifact.description}</p>
                  <div className="shop-stat-line">
                    {artifact.statPerLevel.maxHp ? <span>+{artifact.statPerLevel.maxHp}/Lv HP</span> : null}
                    {artifact.statPerLevel.maxMana ? <span>+{artifact.statPerLevel.maxMana}/Lv MP</span> : null}
                    {artifact.statPerLevel.attack ? <span>+{artifact.statPerLevel.attack}/Lv ATK</span> : null}
                    {artifact.statPerLevel.defense ? <span>+{artifact.statPerLevel.defense}/Lv DEF</span> : null}
                  </div>
                  <p className="muted">{artifact.special}</p>
                </div>
                <button className="primary" disabled={level >= artifact.maxLevel} onClick={() => upgradeArtifact(artifact.id)}>{level >= artifact.maxLevel ? 'MAX' : `${cost} 🪙`}</button>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'Upgrade' && (
        <div className="upgrade-grid">
          {(['weapon', 'armor'] as const).map(kind => {
            const itemId = kind === 'weapon' ? save.player.equippedWeaponId : save.player.equippedArmorId;
            const item = ITEMS[itemId];
            const level = save.player.equipmentLevels?.[itemId] ?? 0;
            const cost = 90 + level * 85 + (kind === 'armor' ? 20 : 0);
            return (
              <article key={kind} className="shop-card upgrade-card">
                <div className="shop-icon">{item.icon}</div>
                <div>
                  <small>{kind === 'weapon' ? 'Weapon Forge' : 'Armor Forge'}</small>
                  <h2>{item.name} +{level}</h2>
                  <p>Each upgrade adds +3 {kind === 'weapon' ? 'ATK' : 'DEF'}. Max level +10.</p>
                  <div className="shop-stat-line"><span>Current +{level * 3}</span><span>Next +{Math.min(10, level + 1) * 3}</span></div>
                </div>
                <button className="primary" disabled={level >= 10} onClick={() => upgradeEquipped(kind)}>{level >= 10 ? 'MAX' : `${cost} 🪙`}</button>
              </article>
            );
          })}
          <article className="shop-card upgrade-card build-card">
            <div className="shop-icon">🌳</div>
            <div>
              <small>Reforge Skill Build</small>
              <h2>Active Path: {(save.player.skillTree?.activePath ?? 'blade').toUpperCase()}</h2>
              <p>Switch your combat style. Blade adds attack, Magic adds mana, Guardian adds HP and defense.</p>
              <div className="shop-stat-line"><span>Blade DPS</span><span>Magic MP</span><span>Guardian Tank</span></div>
            </div>
            <div className="reforge-actions"><button onClick={() => reforgeBuild('blade')}>Blade</button><button onClick={() => reforgeBuild('magic')}>Magic</button><button onClick={() => reforgeBuild('guardian')}>Guardian</button></div>
          </article>
        </div>
      )}


      {tab === 'Craft' && (
        <div className="shop-grid craft-grid">
          {CRAFTING_RECIPES.map(recipe => {
            const result = ITEMS[recipe.resultItemId];
            const ready = canCraft(save, recipe);
            return (
              <article key={recipe.id} className={`shop-card rarity-${result.rarity.toLowerCase()}`}>
                <div className="shop-icon">{result.icon}</div>
                <div>
                  <small>Crafting • Lv {recipe.requiredLevel}+ • {result.rarity}</small>
                  <h2>{recipe.name}</h2>
                  <p>{recipe.description}</p>
                  <div className="craft-materials">
                    {recipe.materials.map(material => {
                      const item = ITEMS[material.itemId];
                      const owned = getQuantity(save.inventory, material.itemId);
                      return <span key={material.itemId} className={owned >= material.quantity ? 'ready' : 'missing'}>{item.icon} {owned}/{material.quantity}</span>;
                    })}
                  </div>
                </div>
                <button className="primary" disabled={!ready} onClick={() => craft(recipe.id)}>{ready ? `Craft ${recipe.coinCost}🪙` : 'Missing'}</button>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'Sell' && (
        <div className="shop-grid">
          {save.inventory.map(stack => {
            const item = ITEMS[stack.itemId];
            return (
              <article key={stack.itemId} className="shop-card">
                <div className="shop-icon">{item.icon}</div>
                <div><small>{item.type}</small><h2>{item.name} x{stack.quantity}</h2><p>{item.description}</p></div>
                <button disabled={item.type === 'Quest'} onClick={() => sell(stack.itemId)}>Sell {item.sellPrice}🪙</button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
