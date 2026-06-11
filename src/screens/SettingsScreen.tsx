import type { Difficulty, GameSave, GraphicsQuality } from '../types';
import { audio } from '../services/audioService';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
}

export function SettingsScreen({ save, updateSave }: Props) {
  function updateSetting(nextSettings: Partial<GameSave['settings']>) {
    updateSave({ ...save, settings: { ...save.settings, ...nextSettings } }, true);
  }

  return (
    <section className={`settings-screen ${save.settings.biggerUi ? 'access-bigger-ui' : ''}`}>
      <div className="panel settings-panel upgraded-settings">
        <p className="eyebrow">Settings</p>
        <h1>Game Options</h1>
        <p className="muted">These settings affect the web build and the Capacitor Android app after you run build + sync.</p>

        <div className="settings-grid">
          <label className="toggle-row">Sound Enabled
            <input type="checkbox" checked={save.settings.soundEnabled} onChange={e => {
              updateSetting({ soundEnabled: e.target.checked });
              if (e.target.checked) audio.playSfx('victory');
            }} />
          </label>

          <label className="toggle-row">Haptic Feedback
            <input type="checkbox" checked={save.settings.hapticsEnabled ?? true} onChange={e => updateSetting({ hapticsEnabled: e.target.checked })} />
          </label>

          <label className="toggle-row">Reduce Motion
            <input type="checkbox" checked={save.settings.reduceMotion} onChange={e => updateSetting({ reduceMotion: e.target.checked })} />
          </label>

          <label className="toggle-row">Bigger UI
            <input type="checkbox" checked={save.settings.biggerUi ?? false} onChange={e => updateSetting({ biggerUi: e.target.checked })} />
          </label>

          <label className="toggle-row">Colorblind-Friendly Bars
            <input type="checkbox" checked={save.settings.colorblindBars ?? false} onChange={e => updateSetting({ colorblindBars: e.target.checked })} />
          </label>

          <label className="toggle-row">Camera Assist
            <input type="checkbox" checked={save.settings.cameraAssist ?? true} onChange={e => updateSetting({ cameraAssist: e.target.checked })} />
          </label>

          <label className="toggle-row">Show Damage Numbers
            <input type="checkbox" checked={save.settings.showDamageNumbers ?? true} onChange={e => updateSetting({ showDamageNumbers: e.target.checked })} />
          </label>

          <label className="toggle-row">Auto-Potion Assist
            <input type="checkbox" checked={save.settings.autoPotion ?? false} onChange={e => updateSetting({ autoPotion: e.target.checked })} />
          </label>

          <label className="toggle-row">Show Touch Tutorial Again
            <input type="checkbox" checked={!(save.settings.touchTutorialSeen ?? false)} onChange={e => updateSetting({ touchTutorialSeen: !e.target.checked })} />
          </label>
        </div>

        <div className="difficulty-card">
          <p className="eyebrow">Difficulty</p>
          <h2>{(save.settings.difficulty ?? 'normal').toUpperCase()}</h2>
          <p>Hard and Nightmare increase enemy HP/ATK, reward more XP/coins, and make leaderboard runs more impressive.</p>
          <div className="difficulty-buttons">
            {(['normal', 'hard', 'nightmare'] as Difficulty[]).map(difficulty => (
              <button key={difficulty} className={(save.settings.difficulty ?? 'normal') === difficulty ? 'active' : ''} onClick={() => updateSetting({ difficulty })}>
                {difficulty.toUpperCase()}
              </button>
            ))}
          </div>
        </div>


        <div className="difficulty-card">
          <p className="eyebrow">Graphics Preset</p>
          <h2>{(save.settings.graphicsQuality ?? 'medium').toUpperCase()}</h2>
          <p>Low improves phone performance, Medium balances effects, High enables the richest shadows/VFX for screenshots.</p>
          <div className="difficulty-buttons">
            {(['low', 'medium', 'high'] as GraphicsQuality[]).map(quality => (
              <button key={quality} className={(save.settings.graphicsQuality ?? 'medium') === quality ? 'active' : ''} onClick={() => updateSetting({ graphicsQuality: quality })}>
                {quality.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-note-grid">
          <article><b>3D Models</b><span>Drop optimized GLB files in public/models to replace procedural heroes.</span></article>
          <article><b>Photo Mode</b><span>Use the in-stage Photo button to hide HUD and capture GitHub screenshots.</span></article>
          <article><b>Cloud Saves</b><span>Firebase cloud save works when logged in and .env.local is configured.</span></article>
          <article><b>More Content</b><span>New pets, artifacts, daily dungeons, weekly challenges, and expanded monster rosters are active.</span></article>
        </div>
      </div>
    </section>
  );
}
