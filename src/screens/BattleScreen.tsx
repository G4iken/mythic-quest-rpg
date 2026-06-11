import { useEffect, useMemo, useState } from 'react';
import type { BattleState, GameSave, SkillData } from '../types';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import { StatBar } from '../components/Bars';
import { BattleStage3D } from '../components/BattleStage3D';
import { enemyTurn, playerAttack, playerDefend, usePotion } from '../systems/battleEngine';
import { getQuantity } from '../systems/inventory';
import { audio } from '../services/audioService';

interface Props {
  battle: BattleState;
  save: GameSave;
  setBattle: (battle: BattleState) => void;
  setSaveDuringBattle: (save: GameSave) => void;
  onVictory: (battle: BattleState) => void;
  onDefeat: () => void;
  onRun: () => void;
}

export function BattleScreen({ battle, save, setBattle, setSaveDuringBattle, onVictory, onDefeat, onRun }: Props) {
  const [panel, setPanel] = useState<'actions' | 'skills' | 'items'>('actions');
  const skills = useMemo(() => save.player.unlockedSkillIds.map(id => SKILLS[id]).filter(Boolean), [save.player.unlockedSkillIds]);
  const potions = save.inventory.filter(stack => ITEMS[stack.itemId]?.type === 'Potion');

  function finishAware(next: BattleState) {
    setBattle(next);
    if (next.turn === 'won') setTimeout(() => onVictory(next), 220);
    if (next.turn === 'lost') setTimeout(onDefeat, 220);
  }

  function queueEnemyTurn(next: BattleState) {
    finishAware({
      ...next,
      turn: 'enemy',
      log: [`${next.enemy.name} is preparing a counterattack...`, ...next.log].slice(0, 9)
    });
  }

  useEffect(() => {
    if (battle.turn !== 'enemy') return;
    const timer = window.setTimeout(() => {
      const next = enemyTurn(battle);
      audio.playSfx(next.turn === 'lost' ? 'defeat' : 'enemyAttack');
      finishAware(next);
    }, 760);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle]);

  function castSkill(skill: SkillData) {
    if (battle.turn !== 'player') return;
    if (battle.player.mana < skill.manaCost) {
      setBattle({ ...battle, log: [`Not enough mana for ${skill.name}.`, ...battle.log].slice(0, 9) });
      return;
    }
    let next: BattleState = {
      ...battle,
      player: { ...battle.player, mana: battle.player.mana - skill.manaCost }
    };
    if (skill.healPercent) {
      const heal = Math.ceil(battle.player.maxHp * skill.healPercent);
      next = {
        ...next,
        player: { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + heal) },
        log: [`${skill.icon} ${skill.name} restored ${heal} HP.`, ...next.log].slice(0, 9)
      };
      audio.playSfx('heal');
      queueEnemyTurn(next);
      setPanel('actions');
      return;
    }
    const resolved = playerAttack(next, skill.damageMultiplier, `${skill.icon} ${skill.name}`);
    audio.playSfx(resolved.turn === 'won' ? 'kill' : 'skill');
    finishAware(resolved);
    setPanel('actions');
  }

  function consumePotion(itemId: string) {
    if (battle.turn !== 'player') return;
    const result = usePotion(battle, save, itemId);
    setSaveDuringBattle(result.save);
    audio.playSfx('heal');
    finishAware(result.state);
    setPanel('actions');
  }

  const canAct = battle.turn === 'player';
  const turnLabel = battle.turn === 'player' ? 'Your Turn' : battle.turn === 'enemy' ? 'Enemy Turn' : battle.turn === 'won' ? 'Victory' : 'Defeat';

  return (
    <section className={`battle-screen battle-turn-${battle.turn}`}>
      <div className="battle-main-grid">
        <div className="battle-visual-card">
          <div className="turn-pill">{turnLabel}</div>
          <BattleStage3D battle={battle} />
        </div>

        <div className="battle-side-panel panel">
          <div className="battle-arena compact">
            <div className="combatant player-side">
              <span className="combatant-tag">Hero</span>
              <h2>{battle.player.name}</h2>
              <StatBar label="HP" value={battle.player.hp} max={battle.player.maxHp} tone="hp" />
              <StatBar label="Mana" value={battle.player.mana} max={battle.player.maxMana} tone="mana" />
            </div>
            <div className="versus">VS</div>
            <div className="combatant enemy-side">
              <span className="combatant-tag">{battle.mode === 'boss' ? 'Boss' : 'Enemy'}</span>
              <h2>{battle.enemy.name} <small>Lv {battle.enemy.level}</small></h2>
              <StatBar label="Enemy HP" value={battle.enemy.hp} max={battle.enemy.maxHp} tone="enemy" />
              {battle.damagePopups.map((pop, i) => <span key={i} className="damage-pop">{pop}</span>)}
            </div>
          </div>

          <div className="battle-command">
            {panel === 'actions' && (
              <div className="command-grid">
                <button className="primary" disabled={!canAct} onClick={() => { const next = playerAttack(battle); audio.playSfx(next.turn === 'won' ? 'kill' : 'attack'); finishAware(next); }}>Attack</button>
                <button className="secondary" disabled={!canAct} onClick={() => setPanel('skills')}>Skill</button>
                <button className="secondary" disabled={!canAct} onClick={() => setPanel('items')}>Item</button>
                <button className="ghost" disabled={!canAct} onClick={() => { audio.playSfx('defend'); finishAware(playerDefend(battle)); }}>Defend</button>
                <button className="danger-btn" disabled={!canAct || battle.mode === 'boss'} onClick={onRun}>Run</button>
              </div>
            )}
            {panel === 'skills' && (
              <div className="list-panel battle-picker">
                <button className="ghost small" onClick={() => setPanel('actions')}>← Back</button>
                {skills.length === 0 && <p className="muted">No skills yet. Level 2 unlocks Power Slash.</p>}
                {skills.map(skill => (
                  <button key={skill.id} className="wide-choice" onClick={() => castSkill(skill)} disabled={!canAct || battle.player.mana < skill.manaCost}>
                    <span>{skill.icon}</span><strong>{skill.name}</strong><small>{skill.manaCost} Mana • {skill.description}</small>
                  </button>
                ))}
              </div>
            )}
            {panel === 'items' && (
              <div className="list-panel battle-picker">
                <button className="ghost small" onClick={() => setPanel('actions')}>← Back</button>
                {potions.length === 0 && <p className="muted">No potions available.</p>}
                {potions.map(stack => {
                  const item = ITEMS[stack.itemId];
                  return (
                    <button key={stack.itemId} className="wide-choice" disabled={!canAct || getQuantity(save.inventory, stack.itemId) <= 0} onClick={() => consumePotion(stack.itemId)}>
                      <span>{item.icon}</span><strong>{item.name} x{stack.quantity}</strong><small>{item.description}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="battle-log panel">
        {battle.log.map((line, i) => <p key={i}>{line}</p>)}
      </div>
    </section>
  );
}
