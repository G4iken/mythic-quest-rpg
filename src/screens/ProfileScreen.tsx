import { useEffect, useState } from 'react';
import type { GameSave, LeaderboardRun, Toast } from '../types';
import { getArea } from '../data/areas';
import { getEquippedStats } from '../systems/inventory';
import { ITEMS } from '../data/items';
import { getCharacter, getUnlockedCharacterIds } from '../data/characters';
import { getPet, getUnlockedPetIds } from '../data/pets';
import { ARTIFACT_ORDER } from '../data/artifacts';
import { getDailyDungeon, WEEKLY_CHALLENGES } from '../data/challenges';
import { audio } from '../services/audioService';
import { getCloudLeaderboard, getLocalLeaderboard } from '../services/leaderboard';

interface Props {
  save: GameSave;
  updateSave: (save: GameSave, autoSave?: boolean) => void;
  notify: (message: string, kind?: Toast['kind']) => void;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function computeAchievements(save: GameSave) {
  const scores = save.player.bestStageScores ?? {};
  const stars = save.player.starObjectives ?? {};
  const unlockedHeroes = getUnlockedCharacterIds(save).length;
  const unlockedPets = getUnlockedPetIds(save).length;
  const sRanks = Object.values(scores).filter(score => score.grade === 'S').length;
  const starCount = Object.values(stars).reduce((total, star) => total + Number(star.noPotion) + Number(star.sRank) + Number(star.comboMaster), 0);
  return [
    { id: 'first-clear', icon: '🏁', title: 'First Gate Clear', done: Object.keys(scores).length >= 1 },
    { id: 'combo-master', icon: '🔥', title: 'Combo Master', done: Object.values(scores).some(score => score.combo >= 12) },
    { id: 's-ranker', icon: '⭐', title: 'S Rank Hunter', done: sRanks >= 1 },
    { id: 'collector', icon: '🎒', title: 'Loot Collector', done: save.inventory.length >= 12 },
    { id: 'hero-guild', icon: '👥', title: 'Hero Guild', done: unlockedHeroes >= 4 },
    { id: 'star-chaser', icon: '🌟', title: 'Star Chaser', done: starCount >= 9 },
    { id: 'pet-keeper', icon: '🐾', title: 'Pet Keeper', done: unlockedPets >= 3 },
    { id: 'endgame', icon: '👑', title: 'Astral Challenger', done: save.player.bossesDefeated.includes('astral-emperor') },
    { id: 'nightmare', icon: '💀', title: 'Nightmare Ready', done: (save.settings.difficulty ?? 'normal') === 'nightmare' && Object.keys(scores).length >= 3 },
    { id: 'material-farmer', icon: '⛏️', title: 'Material Farmer', done: save.inventory.filter(item => ITEMS[item.itemId]?.type === 'Material' || ITEMS[item.itemId]?.type === 'Quest').reduce((total, item) => total + item.quantity, 0) >= 50 }
  ];
}

export function ProfileScreen({ save, updateSave, notify }: Props) {
  const stats = getEquippedStats(save);
  const character = getCharacter(save.player.characterId);
  const pet = getPet(save.player.activePetId);
  const dailyDungeon = getDailyDungeon();
  const unlocked = getUnlockedCharacterIds(save);
  const scores = save.player.bestStageScores ?? {};
  const stars = save.player.starObjectives ?? {};
  const achievements = computeAchievements(save);
  const daily = save.player.dailyLogin ?? { lastClaimDate: '', streak: 0 };
  const canClaimDaily = daily.lastClaimDate !== todayKey();
  const [leaderboard, setLeaderboard] = useState<LeaderboardRun[]>([]);
  const difficulty = save.settings.difficulty ?? 'normal';

  useEffect(() => {
    let active = true;
    const local = getLocalLeaderboard(save.player.currentAreaId, difficulty);
    setLeaderboard(local);
    void getCloudLeaderboard(save.player.currentAreaId).then(cloud => { if (active && cloud.length) setLeaderboard(cloud); }).catch(() => undefined);
    return () => { active = false; };
  }, [save.player.currentAreaId, difficulty]);

  function claimDaily() {
    if (!canClaimDaily) {
      notify('Daily reward already claimed today.', 'info');
      return;
    }
    const last = daily.lastClaimDate ? new Date(daily.lastClaimDate) : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const continues = last?.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
    const streak = continues ? daily.streak + 1 : 1;
    const coins = 120 + Math.min(7, streak) * 35;
    const potion = streak % 3 === 0 ? 'medium-health-potion' : 'small-health-potion';
    updateSave({
      ...save,
      player: { ...save.player, coins: save.player.coins + coins, dailyLogin: { lastClaimDate: todayKey(), streak } },
      inventory: save.inventory.some(item => item.itemId === potion)
        ? save.inventory.map(item => item.itemId === potion ? { ...item, quantity: item.quantity + 1 } : item)
        : [...save.inventory, { itemId: potion, quantity: 1 }]
    }, true);
    audio.playSfx('coin');
    notify(`Daily reward claimed: ${coins} coins + ${ITEMS[potion].name}.`, 'success');
  }

  return (
    <section className="profile-screen upgraded-profile">
      <div className="panel profile-card hero-profile-card">
        <span className={`profile-avatar ${character.className}`}>{character.icon}</span>
        <p className="eyebrow">Player Profile</p>
        <h1>{save.player.name}</h1>
        <p>{character.title} • Level {save.player.level} • {getArea(save.player.currentAreaId).name}</p>
        <div className="stat-grid"><span>HP {stats.maxHp}</span><span>Mana {stats.maxMana}</span><span>ATK {stats.attack}</span><span>DEF {stats.defense}</span></div>
        <p>Weapon: {ITEMS[save.player.equippedWeaponId].icon} {ITEMS[save.player.equippedWeaponId].name} +{save.player.equipmentLevels?.[save.player.equippedWeaponId] ?? 0}</p>
        <p>Armor: {ITEMS[save.player.equippedArmorId].icon} {ITEMS[save.player.equippedArmorId].name} +{save.player.equipmentLevels?.[save.player.equippedArmorId] ?? 0}</p>
        <p>Heroes unlocked: {unlocked.length} • Pet: {pet.icon} {pet.name}</p>
        <p>Build path: {(save.player.skillTree?.activePath ?? 'blade').toUpperCase()}</p>
        <p>Telemetry: {save.player.telemetry?.totalKills ?? 0} kills • {save.player.telemetry?.deaths ?? 0} defeats • {Math.round((save.player.telemetry?.totalPlaySeconds ?? 0) / 60)} min played</p>
        <p className="muted">Last saved: {new Date(save.updatedAt).toLocaleString()}</p>
      </div>

      <div className="panel profile-card daily-card">
        <p className="eyebrow">Daily Login</p>
        <h2>Reward Streak: {daily.streak}</h2>
        <p>{canClaimDaily ? 'Claim today’s coins and potion before entering the gate.' : 'Come back tomorrow for the next streak reward.'}</p>
        <button className="primary" disabled={!canClaimDaily} onClick={claimDaily}>{canClaimDaily ? 'Claim Daily Reward' : 'Claimed Today'}</button>
      </div>


      <div className="panel profile-card daily-card">
        <p className="eyebrow">Daily Dungeon Rotation</p>
        <h2>{dailyDungeon.title}</h2>
        <p>{dailyDungeon.description}</p>
        <div className="stat-grid"><span>{dailyDungeon.modifier}</span><span>{dailyDungeon.rewardCoins} bonus coins</span><span>{getArea(dailyDungeon.areaId).name}</span></div>
      </div>

      <div className="panel profile-card">
        <p className="eyebrow">Artifacts</p>
        <h2>Permanent Account Power</h2>
        <div className="record-list">
          {ARTIFACT_ORDER.map(artifact => <div key={artifact.id}><b>{artifact.icon} {artifact.name}</b><span>Lv {save.player.artifacts?.[artifact.id] ?? 0}/{artifact.maxLevel} • {artifact.special}</span></div>)}
        </div>
      </div>

      <div className="panel profile-card">
        <p className="eyebrow">Weekly Challenges</p>
        <h2>Portfolio Replayability Goals</h2>
        <div className="record-list">
          {WEEKLY_CHALLENGES.map(challenge => <div key={challenge.id}><b>{challenge.title}</b><span>{challenge.description} • Reward {challenge.rewardCoins} coins</span></div>)}
        </div>
      </div>

      <div className="panel profile-card">
        <p className="eyebrow">Achievements</p>
        <h2>Badges</h2>
        <div className="badge-grid">
          {achievements.map(badge => <span key={badge.id} className={badge.done ? 'done' : ''}>{badge.icon}<b>{badge.title}</b></span>)}
        </div>
      </div>

      <div className="panel profile-card">
        <p className="eyebrow">Best Stage Records</p>
        <h2>Clear Grades & Star Objectives</h2>
        {Object.keys(scores).length === 0 ? <p className="muted">Clear a stage to record grades, time, kills, max combo, and star objectives.</p> : (
          <div className="record-list">
            {Object.entries(scores).map(([areaId, score]) => {
              const stageStars = stars[areaId];
              const starText = stageStars ? `${Number(stageStars.noPotion) + Number(stageStars.sRank) + Number(stageStars.comboMaster)}/3 stars` : '0/3 stars';
              return <div key={areaId}><b>{getArea(areaId).name}</b><span>Grade {score.grade} • {score.clearTime}s • {score.kills} kills • Combo {score.combo} • {starText}</span></div>;
            })}
          </div>
        )}
      </div>

      <div className="panel profile-card leaderboard-card">
        <p className="eyebrow">Cloud Leaderboard</p>
        <h2>{getArea(save.player.currentAreaId).name} Fastest Clears</h2>
        {leaderboard.length === 0 ? <p className="muted">Clear a 3D stage while logged in to submit a run. Guest mode keeps local leaderboard records only.</p> : (
          <div className="record-list leaderboard-list">
            {leaderboard.slice(0, 8).map((run, index) => <div key={run.id}><b>#{index + 1} {run.playerName}</b><span>{run.heroName} • {run.difficulty.toUpperCase()} • {run.clearTime}s • Grade {run.grade} • Combo {run.combo}</span></div>)}
          </div>
        )}
      </div>

    </section>
  );
}
