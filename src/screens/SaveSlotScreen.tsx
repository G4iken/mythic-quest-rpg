import type { SaveSummary } from '../types';
import { getArea } from '../data/areas';

interface Props {
  local: SaveSummary[];
  cloud: SaveSummary[];
  loading: boolean;
  onRefresh: () => void;
  onLoad: (slotId: string) => void;
  onNew: (slotId: string) => void;
  onBack: () => void;
}

function findSlot(list: SaveSummary[], slotId: string) {
  return list.find(s => s.slotId === slotId);
}

export function SaveSlotScreen({ local, cloud, loading, onRefresh, onLoad, onNew, onBack }: Props) {
  const slots = ['slot-1', 'slot-2', 'slot-3'];
  return (
    <section className="save-screen safe-top safe-bottom">
      <div className="screen-title-row">
        <button className="ghost small" onClick={onBack}>← Back</button>
        <div><p className="eyebrow">Save Slots</p><h1>Choose Your Adventure</h1></div>
        <button className="secondary small" onClick={onRefresh}>{loading ? 'Syncing...' : 'Refresh'}</button>
      </div>
      <div className="slot-grid">
        {slots.map((slotId, index) => {
          const localSave = findSlot(local, slotId);
          const cloudSave = findSlot(cloud, slotId);
          const best = cloudSave && localSave
            ? new Date(cloudSave.updatedAt) > new Date(localSave.updatedAt) ? cloudSave : localSave
            : cloudSave ?? localSave;
          return (
            <article key={slotId} className="panel slot-card">
              <div className="slot-number">Slot {index + 1}</div>
              {best ? (
                <>
                  <h2>{best.playerName}</h2>
                  <p>Lv {best.level} • {getArea(best.currentAreaId).name}</p>
                  <p className="muted">Newest: {new Date(best.updatedAt).toLocaleString()}</p>
                  <div className="save-tags">
                    {localSave && <span>Local</span>}
                    {cloudSave && <span>Cloud</span>}
                  </div>
                  <button className="primary" onClick={() => onLoad(slotId)}>Continue</button>
                  <button className="ghost" onClick={() => onNew(slotId)}>New Game</button>
                </>
              ) : (
                <>
                  <h2>Empty Slot</h2>
                  <p className="muted">Start a clean save with separate progress.</p>
                  <button className="primary" onClick={() => onNew(slotId)}>New Game</button>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
