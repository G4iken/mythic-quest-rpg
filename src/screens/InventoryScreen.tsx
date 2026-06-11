import type { GameSave } from '../types';
import { ITEMS } from '../data/items';
import { equipItem } from '../systems/inventory';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
}

export function InventoryScreen({ save, updateSave }: Props) {
  return (
    <section className="inventory-screen">
      <div className="screen-heading"><p className="eyebrow">Inventory</p><h1>Bag and Loot</h1></div>
      <div className="item-grid">
        {save.inventory.map(stack => {
          const item = ITEMS[stack.itemId];
          const equipped = save.player.equippedWeaponId === item.id || save.player.equippedArmorId === item.id;
          return (
            <article key={stack.itemId} className={`item-card rarity-${item.rarity.toLowerCase()}`}>
              <span className="item-icon">{item.icon}</span>
              <div>
                <h3>{item.name} <small>x{stack.quantity}</small></h3>
                <p>{item.description}</p>
                <div className="item-meta"><span>{item.rarity}</span><span>{item.type}</span><span>Sell {item.sellPrice}🪙</span></div>
              </div>
              {(item.type === 'Weapon' || item.type === 'Armor') && (
                <button className={equipped ? 'secondary' : 'primary'} onClick={() => updateSave(equipItem(save, item.id), true)}>{equipped ? 'Equipped' : 'Equip'}</button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
