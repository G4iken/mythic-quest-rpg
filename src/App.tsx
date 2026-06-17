import { useEffect, useMemo, useState } from 'react';
import type { AppUser, BattleMode, BattleState, GameSave, SaveSummary, Screen, Toast } from './types';
import { Modal } from './components/Modal';
import { Shell } from './components/Shell';
import { SplashScreen } from './screens/SplashScreen';
import { AuthScreen } from './screens/AuthScreen';
import { SaveSlotScreen } from './screens/SaveSlotScreen';
import { VillageScreen } from './screens/VillageScreen';
import { Stage3DActionScreen } from './screens/Stage3DActionScreen';
import { MapScreen } from './screens/MapScreen';
import { BattleScreen } from './screens/BattleScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { EquipmentScreen } from './screens/EquipmentScreen';
import { QuestScreen } from './screens/QuestScreen';
import { SkillsScreen } from './screens/SkillsScreen';
import { ShopScreen } from './screens/ShopScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { createGuestUser, listenForAuth, loginWithEmail, logoutFromFirebase, registerWithEmail } from './services/authService';
import { downloadCloud, getNewestSave, listCloudSaves, listLocalSaves, loadLocal, saveLocal, uploadCloud } from './services/saveService';
import { createNewSave } from './systems/gameFactory';
import { createBattle, resolveDefeat, resolveVictory } from './systems/battleEngine';
import { addRewardItems } from './systems/inventory';
import { progressQuest } from './systems/questEngine';
import { getArea } from './data/areas';
import { ITEMS } from './data/items';
import { SKILLS } from './data/skills';
import { audio } from './services/audioService';

interface ConflictState {
  slotId: string;
  local: GameSave;
  cloud: GameSave;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<AppUser | null>(null);
  const [currentSave, setCurrentSave] = useState<GameSave | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [playerName, setPlayerName] = useState('Adventurer');
  const [localSummaries, setLocalSummaries] = useState<SaveSummary[]>([]);
  const [cloudSummaries, setCloudSummaries] = useState<SaveSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [stageAreaId, setStageAreaId] = useState('green-village');
  const [towerMode, setTowerMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [victory, setVictory] = useState<null | { xp: number; coins: number; loot: Array<{ itemId: string; quantity: number }>; leveledUp: boolean; unlockedSkills: string[] }>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => listenForAuth(authUser => {
    if (authUser) setUser(authUser);
  }), []);

  useEffect(() => {
    const unlock = () => void audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    audio.setEnabled(currentSave?.settings?.soundEnabled ?? true);
  }, [currentSave?.settings?.soundEnabled]);

  useEffect(() => {
    if (screen === 'battle') audio.startMusic('battle');
    else if (screen === 'village' || screen === 'map') audio.startMusic('village');
    else if (screen === 'stage') audio.startMusic('battle');
    else if (screen === 'splash' || screen === 'auth' || screen === 'saves') audio.startMusic('title');
    else audio.startMusic('village');
  }, [screen]);

  useEffect(() => {
    const onClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button')) audio.playSfx('click');
    };
    window.addEventListener('pointerdown', onClick, { passive: true, capture: true });
    return () => window.removeEventListener('pointerdown', onClick, { capture: true } as AddEventListenerOptions);
  }, []);

  const accountId = user?.uid ?? 'guest';

  function notify(message: string, kind: Toast['kind'] = 'info') {
    const toast = { id: crypto.randomUUID(), message, kind };
    setToasts(prev => [toast, ...prev].slice(0, 3));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 3200);
  }

  async function refreshSaves(nextUser = user) {
    if (!nextUser) return;
    setLoading(true);
    setLocalSummaries(listLocalSaves(nextUser.uid));
    try {
      setCloudSummaries(await listCloudSaves(nextUser.uid));
    } catch (error) {
      console.warn(error);
      setCloudSummaries([]);
      if (!nextUser.isGuest) notify('Cloud save unavailable. Local saves still work.', 'warning');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(email: string, password: string) {
    setLoading(true);
    setAuthError('');
    try {
      const appUser = await loginWithEmail(email.trim(), password);
      setUser(appUser);
      await refreshSaves(appUser);
      setScreen('saves');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(email: string, password: string, name: string) {
    setLoading(true);
    setAuthError('');
    try {
      setPlayerName(name || 'Adventurer');
      const appUser = await registerWithEmail(email.trim(), password);
      setUser(appUser);
      await refreshSaves(appUser);
      setScreen('saves');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Register failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleGuest(name: string) {
    const guest = createGuestUser();
    setPlayerName(name || 'Adventurer');
    setUser(guest);
    setCloudSummaries([]);
    setLocalSummaries(listLocalSaves(guest.uid));
    setScreen('saves');
    notify('Guest mode uses local offline saves only.', 'info');
  }

  async function handleLogout() {
    setCurrentSave(null);
    setBattle(null);
    setVictory(null);
    setScreen('auth');
    if (!user?.isGuest) await logoutFromFirebase();
    setUser(null);
    notify('Returned to title.', 'info');
  }

  async function commitSave(save: GameSave, shouldCloudSync = false) {
    const stamped = saveLocal(save.accountId, save);
    setCurrentSave(stamped);
    setLocalSummaries(listLocalSaves(save.accountId));
    if (shouldCloudSync && user && !user.isGuest) {
      try {
        const cloudSave = await uploadCloud(user.uid, stamped);
        setCurrentSave(cloudSave);
        setCloudSummaries(await listCloudSaves(user.uid));
      } catch (error) {
        console.warn(error);
        notify('Saved locally. Cloud upload failed.', 'warning');
      }
    }
  }

  async function manualSave() {
    if (!currentSave) return;
    await commitSave(currentSave, true);
    audio.playSfx('save');
    notify('Game saved.', 'success');
  }

  async function loadSlot(slotId: string) {
    if (!user) return;
    setLoading(true);
    try {
      const local = loadLocal(user.uid, slotId);
      let cloud: GameSave | null = null;
      try { cloud = await downloadCloud(user.uid, slotId); } catch { cloud = null; }
      if (local && cloud && local.updatedAt !== cloud.updatedAt) {
        setConflict({ slotId, local, cloud });
        return;
      }
      const save = getNewestSave(local, cloud);
      if (!save) {
        notify('That save slot is empty.', 'warning');
        return;
      }
      const secured = { ...save, accountId: user.uid };
      setCurrentSave(secured);
      saveLocal(user.uid, secured);
      setScreen('village');
    } finally {
      setLoading(false);
    }
  }

  async function newGame(slotId: string) {
    if (!user) return;
    const confirmed = window.confirm(`Start a new game in ${slotId}? This overwrites the existing local slot.`);
    if (!confirmed) return;
    const fresh = createNewSave(user.uid, slotId, playerName);
    await commitSave(fresh, !user.isGuest);
    setScreen('village');
    notify('New adventure created.', 'success');
  }

  async function useConflict(choice: 'local' | 'cloud') {
    if (!conflict || !user) return;
    const chosen = choice === 'local' ? conflict.local : conflict.cloud;
    const secured = { ...chosen, accountId: user.uid };
    setCurrentSave(secured);
    saveLocal(user.uid, secured);
    if (choice === 'local' && !user.isGuest) {
      try { await uploadCloud(user.uid, secured); } catch { notify('Loaded local save, but cloud upload failed.', 'warning'); }
    }
    setConflict(null);
    setScreen('village');
  }

  function updateSave(save: GameSave, autoSave = false) {
    void commitSave(save, autoSave && Boolean(user && !user.isGuest));
  }


  function enterActionStage(areaId: string) {
    if (!currentSave) return;
    const area = getArea(areaId);
    if (!currentSave.player.unlockedAreaIds.includes(areaId) || currentSave.player.level < area.requiredLevel) {
      notify(`Locked: ${area.unlockCondition}`, 'warning');
      return;
    }
    setTowerMode(false);
    setPracticeMode(false);
    const next = { ...currentSave, player: { ...currentSave.player, currentAreaId: areaId } };
    setStageAreaId(areaId);
    updateSave(next, false);
    setScreen('stage');
    audio.startMusic('battle');
    audio.playSfx('click');
  }

  function enterPracticeStage(areaId: string) {
    if (!currentSave) return;
    const area = getArea(areaId);
    if (!currentSave.player.unlockedAreaIds.includes(areaId) || currentSave.player.level < area.requiredLevel) {
      notify(`Locked: ${area.unlockCondition}`, 'warning');
      return;
    }
    setTowerMode(false);
    setPracticeMode(true);
    setStageAreaId(areaId);
    setScreen('stage');
    audio.startMusic('battle');
    audio.playSfx('click');
  }

  function enterBattle(areaId: string, mode: BattleMode) {
    if (!currentSave) return;
    const area = getArea(areaId);
    if (!currentSave.player.unlockedAreaIds.includes(areaId) || currentSave.player.level < area.requiredLevel) {
      notify(`Locked: ${area.unlockCondition}`, 'warning');
      return;
    }
    const nextBattle = createBattle(currentSave, areaId, mode);
    setBattle(nextBattle);
    setScreen('battle');
    audio.playSfx(mode === 'boss' ? 'enemyAttack' : 'attack');
  }

  function enterTower() {
    if (!currentSave) return;
    setTowerMode(true);
    setStageAreaId('green-village');
    setScreen('stage');
    audio.startMusic('battle');
    audio.playSfx('click');
  }

  function openChest(areaId: string) {
    if (!currentSave) return;
    const area = getArea(areaId);
    if (currentSave.player.openedChests.includes(areaId)) return;
    let next: GameSave = {
      ...currentSave,
      player: { ...currentSave.player, openedChests: [...currentSave.player.openedChests, areaId] },
      areaProgress: currentSave.areaProgress.map(p => p.areaId === areaId ? { ...p, chestOpened: true } : p)
    };
    next = addRewardItems(next, area.treasureReward);
    next = progressQuest(next, 'open_chest', 1);
    updateSave(next, true);
    audio.playSfx('coin');
    notify(`Opened ${area.name} chest: ${area.treasureReward.map(r => `${ITEMS[r.itemId].name} x${r.quantity}`).join(', ')}`, 'success');
  }

  function handleVictory(winningBattle: BattleState) {
    if (!currentSave) return;
    const result = resolveVictory(currentSave, winningBattle);
    setBattle(null);
    setVictory({ xp: result.xp, coins: result.coins, loot: result.loot, leveledUp: result.leveledUp, unlockedSkills: result.unlockedSkills });
    updateSave(result.save, true);
    audio.playSfx(result.leveledUp ? 'levelUp' : 'victory');
  }

  function handleDefeat() {
    if (!currentSave) return;
    setBattle(null);
    const next = resolveDefeat(currentSave);
    updateSave(next, true);
    setScreen('village');
    audio.playSfx('defeat');
    notify('Defeated. You returned to Green Village and lost 10% coins.', 'danger');
  }

  const content = useMemo(() => {
    if (screen === 'splash') return <SplashScreen onStart={() => setScreen('auth')} />;
    if (screen === 'auth') return <AuthScreen user={user} loading={loading} error={authError} onLogin={handleLogin} onRegister={handleRegister} onGuest={handleGuest} continueToSaves={() => { void refreshSaves(); setScreen('saves'); }} />;
    if (screen === 'saves') return <SaveSlotScreen local={localSummaries} cloud={cloudSummaries} loading={loading} onRefresh={() => void refreshSaves()} onLoad={slot => void loadSlot(slot)} onNew={slot => void newGame(slot)} onBack={() => setScreen('auth')} />;
    if (!currentSave) return <SplashScreen onStart={() => setScreen('auth')} />;

    return (
      <Shell save={currentSave} screen={screen} go={setScreen} onManualSave={() => void manualSave()} onLogout={() => void handleLogout()}>
        {screen === 'village' && <VillageScreen save={currentSave} go={setScreen} onEnterStage={enterActionStage} onOpenChest={openChest} onEnterTower={enterTower} onEnterPractice={enterPracticeStage} />}
        {screen === 'stage' && <Stage3DActionScreen save={currentSave} go={setScreen} updateSave={updateSave} notify={notify} initialAreaId={stageAreaId || currentSave.player.currentAreaId} autoStart returnScreen="village" towerMode={towerMode} practiceMode={practiceMode} />}
        {screen === 'map' && <MapScreen save={currentSave} onBattle={enterBattle} onOpenChest={openChest} />}
        {screen === 'battle' && battle && <BattleScreen battle={battle} save={currentSave} setBattle={setBattle} setSaveDuringBattle={save => setCurrentSave(save)} onVictory={handleVictory} onDefeat={handleDefeat} onRun={() => { setBattle(null); setScreen('map'); audio.playSfx('defend'); notify('You escaped safely.', 'info'); }} />}
        {screen === 'inventory' && <InventoryScreen save={currentSave} updateSave={updateSave} />}
        {screen === 'equipment' && <EquipmentScreen save={currentSave} updateSave={updateSave} />}
        {screen === 'quests' && <QuestScreen save={currentSave} updateSave={updateSave} />}
        {screen === 'skills' && <SkillsScreen save={currentSave} updateSave={updateSave} />}
        {screen === 'shop' && <ShopScreen save={currentSave} updateSave={updateSave} notify={notify} />}
        {screen === 'profile' && <ProfileScreen save={currentSave} updateSave={updateSave} notify={notify} />}
        {screen === 'settings' && <SettingsScreen save={currentSave} updateSave={updateSave} />}
      </Shell>
    );
  }, [screen, user, loading, authError, localSummaries, cloudSummaries, currentSave, battle, accountId, stageAreaId, practiceMode]);

  return (
    <>
      {content}
      <div className="toast-stack safe-top">
        {toasts.map(toast => <div key={toast.id} className={`toast ${toast.kind}`}>{toast.message}</div>)}
      </div>
      {conflict && (
        <Modal title="Cloud Save Conflict" onClose={() => setConflict(null)}>
          <p>Both local and cloud saves exist for this slot. Choose which one to continue.</p>
          <div className="conflict-grid">
            <button className="wide-choice" onClick={() => void useConflict('local')}>
              <strong>Use Local</strong><small>Lv {conflict.local.player.level} • {new Date(conflict.local.updatedAt).toLocaleString()}</small>
            </button>
            <button className="wide-choice" onClick={() => void useConflict('cloud')}>
              <strong>Use Cloud</strong><small>Lv {conflict.cloud.player.level} • {new Date(conflict.cloud.updatedAt).toLocaleString()}</small>
            </button>
          </div>
        </Modal>
      )}
      {victory && (
        <Modal title={victory.leveledUp ? 'Victory + Level Up!' : 'Victory!'} onClose={() => { setVictory(null); setScreen('map'); }}>
          <div className="reward-pop">
            <p>Rewards: {victory.xp} XP • {victory.coins} Coins</p>
            {victory.loot.length > 0 ? <p>Loot: {victory.loot.map(l => `${ITEMS[l.itemId].icon} ${ITEMS[l.itemId].name} x${l.quantity}`).join(', ')}</p> : <p>No loot dropped this time.</p>}
            {victory.unlockedSkills.length > 0 && <p>New skills: {victory.unlockedSkills.map(id => SKILLS[id].name).join(', ')}</p>}
            <button className="primary" onClick={() => { setVictory(null); setScreen('map'); }}>Continue</button>
          </div>
        </Modal>
      )}
    </>
  );
}
