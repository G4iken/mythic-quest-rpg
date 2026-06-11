import type { BattleMode, GameSave } from '../types';
import { AREAS } from '../data/areas';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';

interface Props {
  save: GameSave;
  onBattle: (areaId: string, mode: BattleMode) => void;
  onOpenChest: (areaId: string) => void;
}

export function MapScreen({ save, onBattle, onOpenChest }: Props) {
  return (
    <section className="map-screen">
      <div className="screen-heading"><p className="eyebrow">Adventure Map</p><h1>Choose an Area</h1></div>
      <div className="area-grid">
        {AREAS.map(area => {
          const unlocked = save.player.unlockedAreaIds.includes(area.id) && save.player.level >= area.requiredLevel;
          const progress = save.areaProgress.find(p => p.areaId === area.id);
          const boss = ENEMIES[area.bossId];
          return (
            <article key={area.id} className={`area-card ${area.background} ${!unlocked ? 'locked' : ''}`}>
              <div className="area-top"><span>Lv {area.requiredLevel}+</span><span>{progress?.bossDefeated ? '👑 Cleared' : '⚔️ Active'}</span></div>
              <h2>{area.name}</h2>
              <p>{area.questObjective}</p>
              <p className="muted">Unlock: {area.unlockCondition}</p>
              <div className="mini-list">
                <span>Boss: {boss.icon} {boss.name}</span>
                <span>Normal wins: {progress?.normalWins ?? 0}</span>
                <span>Chest: {progress?.chestOpened ? 'Opened' : area.treasureReward.map(r => `${ITEMS[r.itemId].icon}x${r.quantity}`).join(' ')}</span>
              </div>
              <div className="area-actions">
                {unlocked ? (
                  <>
                    <button className="primary" onClick={() => onBattle(area.id, 'normal')}>Explore</button>
                    <button className="danger-btn" onClick={() => onBattle(area.id, 'boss')}>Boss</button>
                    <button className="secondary" disabled={progress?.chestOpened} onClick={() => onOpenChest(area.id)}>{progress?.chestOpened ? 'Chest Opened' : 'Open Chest'}</button>
                  </>
                ) : (
                  <button className="ghost" disabled>Locked</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
