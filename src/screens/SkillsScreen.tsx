import type { GameSave } from '../types';
import { SKILL_UNLOCK_ORDER } from '../data/skills';
import { audio } from '../services/audioService';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
}

const paths = [
  { id: 'blade', name: 'Blade Path', icon: '⚔️', description: '+ATK, faster stage clears, better combo pressure.' },
  { id: 'magic', name: 'Magic Path', icon: '🔮', description: '+Mana, more skill uptime, stronger ranged-style play.' },
  { id: 'guardian', name: 'Guardian Path', icon: '🛡️', description: '+HP/DEF, safer boss attempts and survival runs.' }
] as const;

export function SkillsScreen({ save, updateSave }: Props) {
  const activePath = save.player.skillTree?.activePath ?? 'blade';
  const unlockedNodes = save.player.skillTree?.unlockedNodes ?? ['blade-1'];

  function selectPath(path: typeof paths[number]['id']) {
    updateSave({
      ...save,
      player: {
        ...save.player,
        skillTree: { activePath: path, unlockedNodes: [...new Set([...unlockedNodes, `${path}-1`])] }
      }
    }, true);
    audio.playSfx('skill');
  }

  function unlockNode(path: typeof paths[number]['id']) {
    const nodeId = `${path}-${Math.min(3, unlockedNodes.filter(node => node.startsWith(path)).length + 1)}`;
    if (unlockedNodes.includes(nodeId)) return;
    const cost = 120 + unlockedNodes.length * 60;
    if (save.player.coins < cost) return;
    updateSave({
      ...save,
      player: {
        ...save.player,
        coins: save.player.coins - cost,
        skillTree: { activePath: path, unlockedNodes: [...unlockedNodes, nodeId] }
      }
    }, true);
    audio.playSfx('levelUp');
  }

  return (
    <section className="skills-screen upgraded-skills">
      <div className="screen-heading"><p className="eyebrow">Skill Tree</p><h1>Hero Techniques</h1><p>Coins: {save.player.coins} 🪙 • Active Build: {activePath.toUpperCase()}</p></div>
      <div className="path-grid">
        {paths.map(path => {
          const ownedNodes = unlockedNodes.filter(node => node.startsWith(path.id)).length;
          const nextCost = 120 + unlockedNodes.length * 60;
          return (
            <article key={path.id} className={`panel path-card ${activePath === path.id ? 'active' : ''}`}>
              <span>{path.icon}</span>
              <h2>{path.name}</h2>
              <p>{path.description}</p>
              <div className="skill-node-row"><i className={ownedNodes >= 1 ? 'on' : ''} /><i className={ownedNodes >= 2 ? 'on' : ''} /><i className={ownedNodes >= 3 ? 'on' : ''} /></div>
              <div className="path-actions"><button className="primary" onClick={() => selectPath(path.id)}>Use Path</button><button className="secondary" disabled={ownedNodes >= 3 || save.player.coins < nextCost} onClick={() => unlockNode(path.id)}>{ownedNodes >= 3 ? 'Max' : `Unlock ${nextCost}🪙`}</button></div>
            </article>
          );
        })}
      </div>
      <div className="skill-road">
        {SKILL_UNLOCK_ORDER.map(skill => {
          const unlocked = save.player.unlockedSkillIds.includes(skill.id);
          return (
            <article key={skill.id} className={`panel skill-card ${unlocked ? 'unlocked' : 'locked'}`}>
              <span className="skill-icon">{skill.icon}</span>
              <h2>{skill.name}</h2>
              <p>{skill.description}</p>
              <p className="muted">Required Level {skill.requiredLevel} • {skill.manaCost} Mana</p>
              <strong>{unlocked ? 'Unlocked' : `Locked until Lv ${skill.requiredLevel}`}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}
