import type { GameSave } from '../types';
import { QUESTS } from '../data/quests';
import { ITEMS } from '../data/items';
import { claimQuest, syncCollectionQuests } from '../systems/questEngine';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
}

export function QuestScreen({ save, updateSave }: Props) {
  const synced = syncCollectionQuests(save);
  if (synced !== save) setTimeout(() => updateSave(synced, false), 0);
  return (
    <section className="quest-screen">
      <div className="screen-heading"><p className="eyebrow">Quest Board</p><h1>Active Quests</h1></div>
      <div className="quest-list">
        {QUESTS.map(quest => {
          const progress = save.quests.find(q => q.questId === quest.id);
          const percent = Math.min(100, ((progress?.currentProgress ?? 0) / quest.requiredAmount) * 100);
          return (
            <article key={quest.id} className={`panel quest-card ${progress?.isClaimed ? 'claimed' : ''}`}>
              <div className="quest-head"><span>{quest.type}</span><span>{progress?.isClaimed ? 'Claimed' : progress?.isCompleted ? 'Complete' : 'Active'}</span></div>
              <h2>{quest.title}</h2>
              <p>{quest.description}</p>
              <div className="bar-track xp"><span style={{ width: `${percent}%` }} /></div>
              <p className="muted">Progress: {progress?.currentProgress ?? 0} / {quest.requiredAmount}</p>
              <div className="reward-line">
                <span>{quest.rewards.xp} XP</span><span>{quest.rewards.coins}🪙</span>
                {quest.rewards.items?.map(item => <span key={item.itemId}>{ITEMS[item.itemId].icon} x{item.quantity}</span>)}
              </div>
              <button className="primary" disabled={!progress?.isCompleted || progress?.isClaimed} onClick={() => updateSave(claimQuest(save, quest.id), true)}>Claim Reward</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
