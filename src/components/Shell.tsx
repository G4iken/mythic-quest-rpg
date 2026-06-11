import type { ReactNode } from 'react';
import type { GameSave, Screen } from '../types';
import { getArea } from '../data/areas';
import { StatBar } from './Bars';
import { getEquippedStats } from '../systems/inventory';
import { getCharacter } from '../data/characters';

interface ShellProps {
  save: GameSave;
  screen: Screen;
  children: ReactNode;
  go: (screen: Screen) => void;
  onManualSave: () => void;
  onLogout: () => void;
}

const nav: Array<{ screen: Screen; label: string; icon: string }> = [
  { screen: 'village', label: 'Village', icon: '🏡' },
  { screen: 'map', label: 'Map', icon: '🗺️' },
  { screen: 'inventory', label: 'Bag', icon: '🎒' },
  { screen: 'quests', label: 'Quests', icon: '📜' },
  { screen: 'shop', label: 'Shop', icon: '🛒' },
  { screen: 'skills', label: 'Skills', icon: '✨' },
  { screen: 'settings', label: 'Settings', icon: '⚙️' }
];

export function Shell({ save, screen, children, go, onManualSave, onLogout }: ShellProps) {
  const area = getArea(save.player.currentAreaId);
  const stats = getEquippedStats(save);
  const character = getCharacter(save.player.characterId);
  return (
    <div className="game-shell">
      <div className="rotate-device"><strong>Rotate your phone</strong><span>Mythic Quest is now optimized for landscape play.</span></div>
      <header className="top-hud safe-top">
        <button className="avatar" onClick={() => go('profile')} aria-label="Open profile">{character.icon}</button>
        <div className="hud-main">
          <div className="hud-title"><strong>{save.player.name}</strong><span>Lv {save.player.level} • {area.name}</span></div>
          <StatBar label="HP" value={save.player.hp} max={stats.maxHp} tone="hp" />
          <StatBar label="XP" value={save.player.xp} max={save.player.xpToNextLevel} tone="xp" />
        </div>
        <div className="hud-coins"><span>🪙</span>{save.player.coins}</div>
      </header>
      <main className="screen-frame">{children}</main>
      <footer className="bottom-nav safe-bottom">
        {nav.map(item => (
          <button key={item.screen} title={item.label} className={screen === item.screen ? 'active' : ''} onClick={() => go(item.screen)}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
        <button title="Save" onClick={onManualSave}><span>💾</span>Save</button>
        <button title="Exit" onClick={onLogout}><span>🚪</span>Exit</button>
      </footer>
    </div>
  );
}
