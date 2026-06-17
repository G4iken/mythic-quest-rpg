import { useState } from 'react';
import type { GameSave, Screen } from '../types';
import { Joystick, type StickVector } from '../components/Joystick';
import { World3D, type NearbyTarget } from '../components/World3D';
import { AREAS } from '../data/areas';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';

interface Props {
  save: GameSave;
  go: (screen: Screen) => void;
  onEnterStage: (areaId: string) => void;
  onEnterPractice: (areaId: string) => void;
  onOpenChest: (areaId: string) => void;
  onEnterTower: () => void;
}

export function VillageScreen({ save, go, onEnterStage, onEnterPractice, onOpenChest, onEnterTower }: Props) {
  const [stick, setStick] = useState<StickVector>({ x: 0, y: 0 });
  const [nearby, setNearby] = useState<NearbyTarget | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const area = nearby?.type === 'area' ? AREAS.find(item => item.id === nearby.id) : null;
  const progress = area ? save.areaProgress.find(item => item.areaId === area.id) : null;
  const boss = area ? ENEMIES[area.bossId] : null;
  const unlockedCount = save.player.unlockedAreaIds.length;

  return (
    <section className="world-screen ethereal-village-screen">
      <div className="world-canvas">
        <World3D save={save} stick={stick} onNearbyChange={setNearby} />
      </div>

      <div className="world-top-panel safe-top">
        <div>
          <p className="eyebrow">3D Hub Village</p>
          <h1>Green Village Gate Plaza</h1>
          <small>Roam in 3D, talk to NPCs, enter portals, buy gear, then return here after every stage.</small>
        </div>
        <div className="world-top-actions">
          <span>{unlockedCount}/{AREAS.length} Gates</span>
          <button className="secondary small" onClick={() => setShowHelp(value => !value)}>{showHelp ? 'Hide' : 'Help'}</button>
        </div>
      </div>

      {showHelp && (
        <div className="world-help panel">
          <strong>3D Village Controls</strong>
          <p>Mobile: drag the joystick. Desktop: WASD or arrow keys. Walk to a glowing portal and choose Enter Stage. Pause or clear a stage to come back here.</p>
          <p>The Tower is an endless challenge mode. Each run starts a new floor with stronger monsters and a guardian boss; your best floor is saved between runs.</p>
        </div>
      )}

      <Joystick onMove={setStick} />

      <div className="quick-world-actions safe-bottom">
        <button className="ghost small" onClick={() => go('map')}>Area Cards</button>
        <button className="ghost small" onClick={() => onEnterTower()}>Tower</button>
        <button className="ghost small" onClick={() => go('shop')}>Shop</button>
        <button className="ghost small" onClick={() => go('profile')}>Records</button>
      </div>

      {nearby && (
        <div className={`interaction-card ${nearby.type === 'area' && nearby.locked ? 'locked' : ''}`}>
          {nearby.type === 'npc' && (
            <>
              <p className="eyebrow">Nearby NPC</p>
              <h2>{nearby.label}</h2>
              <p>{nearby.description ?? 'Tap interact to open this village system.'}</p>
              <button className="primary" onClick={() => go(nearby.screen)}>Interact</button>
            </>
          )}

          {nearby.type === 'area' && area && boss && (
            <>
              <p className="eyebrow">Stage Portal</p>
              <h2>{area.name}</h2>
              <p>{nearby.locked ? nearby.reason : area.questObjective}</p>
              <div className="world-area-meta">
                <span>Lv {area.requiredLevel}+</span>
                <span>Boss: {boss.name}</span>
                <span>Record: {save.player.bestStageScores?.[area.id]?.grade ?? '—'}</span>
                <span>Chest: {progress?.chestOpened ? 'Opened' : area.treasureReward.map(r => `${ITEMS[r.itemId].icon}x${r.quantity}`).join(' ')}</span>
              </div>
              {nearby.locked ? (
                <button className="ghost" disabled>Locked</button>
              ) : (
                <div className="interaction-actions">
                  <button className="primary" onClick={() => onEnterStage(area.id)}>Enter Stage</button>
                  <button className="secondary" disabled={progress?.chestOpened} onClick={() => onOpenChest(area.id)}>{progress?.chestOpened ? 'Chest Opened' : 'Open Chest'}</button>
                  <button className="ghost" onClick={() => go('shop')}>Upgrade First</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
