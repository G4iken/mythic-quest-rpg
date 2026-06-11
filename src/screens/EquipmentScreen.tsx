import type { GameSave } from '../types';
import { ITEMS } from '../data/items';
import { equipItem, getEquippedStats } from '../systems/inventory';
import { getCharacter } from '../data/characters';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
}

export function EquipmentScreen({ save, updateSave }: Props) {
  const stats = getEquippedStats(save);
  const character = getCharacter(save.player.characterId);
  const weapons = save.inventory.filter(s => ITEMS[s.itemId].type === 'Weapon');
  const armor = save.inventory.filter(s => ITEMS[s.itemId].type === 'Armor');
  return (
    <section className="equipment-screen upgraded-equipment">
      <div className="screen-heading"><p className="eyebrow">Blacksmith + Hero Build</p><h1>Equipment</h1><p>{character.icon} {character.name} • {character.role} • {character.skillName}</p></div>
      <div className="panel stat-sheet hero-build-sheet">
        <h2>Current Build</h2>
        <div className="stat-grid"><span>HP {stats.maxHp}</span><span>Mana {stats.maxMana}</span><span>ATK {stats.attack}</span><span>DEF {stats.defense}</span></div>
        <p>Weapon: {ITEMS[save.player.equippedWeaponId].icon} {ITEMS[save.player.equippedWeaponId].name}</p>
        <p>Armor: {ITEMS[save.player.equippedArmorId].icon} {ITEMS[save.player.equippedArmorId].name}</p>
        <p className="muted">Hero bonus: {character.hpBonus >= 0 ? '+' : ''}{character.hpBonus} HP • {character.attackBonus >= 0 ? '+' : ''}{character.attackBonus} ATK • {character.defenseBonus >= 0 ? '+' : ''}{character.defenseBonus} DEF</p>
      </div>
      <div className="two-col">
        <div className="panel"><h2>Weapons</h2>{weapons.map(s => <button key={s.itemId} className={save.player.equippedWeaponId === s.itemId ? 'wide-choice active' : 'wide-choice'} onClick={() => updateSave(equipItem(save, s.itemId), true)}>{ITEMS[s.itemId].icon} <strong>{ITEMS[s.itemId].name}</strong><small>+{ITEMS[s.itemId].attackBonus ?? 0} ATK • {ITEMS[s.itemId].rarity}</small></button>)}</div>
        <div className="panel"><h2>Armor</h2>{armor.map(s => <button key={s.itemId} className={save.player.equippedArmorId === s.itemId ? 'wide-choice active' : 'wide-choice'} onClick={() => updateSave(equipItem(save, s.itemId), true)}>{ITEMS[s.itemId].icon} <strong>{ITEMS[s.itemId].name}</strong><small>+{ITEMS[s.itemId].defenseBonus ?? 0} DEF • {ITEMS[s.itemId].rarity}</small></button>)}</div>
      </div>
    </section>
  );
}
