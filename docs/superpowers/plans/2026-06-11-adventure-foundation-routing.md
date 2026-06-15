# Adventure Foundation And Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish automated tests, backward-compatible save defaults, and a single real-time 3D adventure route with no reachable turn-based battle mode.

**Architecture:** Pure access and migration helpers are tested independently. `App.tsx` owns only screen routing and launches `Stage3DActionScreen`; map and village surfaces call the same area-entry callback. Obsolete battle files and types are removed only after their references are gone.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, jsdom, React Three Fiber.

---

### Task 1: Add The Test Harness

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/fixtures.ts`

- [ ] **Step 1: Install test dependencies**

Run:

```powershell
npm.cmd install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` and `package-lock.json` include all four development dependencies.

- [ ] **Step 2: Add test scripts**

Set the `scripts` block in `package.json` to include:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc && vite build",
  "preview": "vite preview --host 0.0.0.0",
  "test": "vitest",
  "test:run": "vitest run",
  "android:add": "cap add android",
  "android:sync": "npm run build && cap sync android && npm run android:landscape",
  "android:open": "cap open android",
  "android:landscape": "node scripts/force-landscape.mjs",
  "android:setup": "npm run build && cap add android && cap sync android && npm run android:landscape && cap open android"
}
```

- [ ] **Step 3: Configure Vitest**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true
  }
});
```

- [ ] **Step 4: Add browser test setup**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock
});
```

- [ ] **Step 5: Add a reusable save fixture**

Create `src/test/fixtures.ts`:

```ts
import type { GameSave } from '../types';
import { createNewSave } from '../systems/gameFactory';

export function makeSave(overrides: Partial<GameSave['player']> = {}): GameSave {
  const save = createNewSave('test-account', 'slot-1', 'Test Hero');
  return {
    ...save,
    player: {
      ...save.player,
      ...overrides
    }
  };
}
```

- [ ] **Step 6: Verify the harness**

Run:

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: Vitest exits successfully with no tests found, and the production build succeeds.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/test/fixtures.ts
git commit -m "test: add vitest browser harness"
```

### Task 2: Add Backward-Compatible Adventure Save Defaults

**Files:**
- Modify: `src/types.ts`
- Modify: `src/systems/gameFactory.ts`
- Modify: `src/services/saveService.ts`
- Create: `src/services/saveService.test.ts`

- [ ] **Step 1: Write the failing migration tests**

Create `src/services/saveService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { migrateSave } from './saveService';
import { makeSave } from '../test/fixtures';

describe('migrateSave', () => {
  it('adds pet progress and adventure discoveries to legacy saves', () => {
    const legacy = makeSave();
    delete legacy.player.petProgress;
    delete legacy.player.areaDiscoveries;

    const migrated = migrateSave(legacy);

    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.player.petProgress?.['ember-sprite']).toEqual({ level: 1, xp: 0 });
    expect(migrated.player.areaDiscoveries).toEqual({});
  });

  it('preserves existing pet progress', () => {
    const save = makeSave();
    save.player.petProgress = { 'ember-sprite': { level: 4, xp: 90 } };

    expect(migrateSave(save).player.petProgress?.['ember-sprite']).toEqual({ level: 4, xp: 90 });
  });
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run:

```powershell
npm.cmd run test:run -- src/services/saveService.test.ts
```

Expected: FAIL because `petProgress`, `areaDiscoveries`, and exported `migrateSave` do not exist.

- [ ] **Step 3: Add save types**

Add to `PlayerData` in `src/types.ts`:

```ts
petProgress?: Record<string, { level: number; xp: number }>;
areaDiscoveries?: Record<string, {
  hiddenChests: string[];
  loreMarkers: string[];
  eliteEncounters: string[];
}>;
```

- [ ] **Step 4: Add new-save defaults**

In `createNewSave`, set:

```ts
schemaVersion: 4,
```

and add these player fields:

```ts
petProgress: { 'ember-sprite': { level: 1, xp: 0 } },
areaDiscoveries: {},
```

- [ ] **Step 5: Export and extend migration**

Change `migrateSave` in `src/services/saveService.ts` to:

```ts
export function migrateSave(raw: GameSave): GameSave {
  const areaProgressById = new Map((raw.areaProgress ?? []).map(progress => [progress.areaId, progress] as const));
  const areaProgress: AreaProgress[] = AREAS.map(area =>
    areaProgressById.get(area.id) ?? { areaId: area.id, normalWins: 0, bossDefeated: false, chestOpened: false }
  );
  const unlockedAreaIds = raw.player.unlockedAreaIds?.length ? raw.player.unlockedAreaIds : ['green-village'];
  const unlockedCharacterIds = raw.player.unlockedCharacterIds?.length ? raw.player.unlockedCharacterIds : ['wanderer'];
  const unlockedPetIds = raw.player.unlockedPetIds?.length ? raw.player.unlockedPetIds : ['ember-sprite'];
  const petProgress = { ...(raw.player.petProgress ?? {}) };

  unlockedPetIds.forEach(petId => {
    petProgress[petId] ??= { level: 1, xp: 0 };
  });

  return {
    ...raw,
    schemaVersion: Math.max(raw.schemaVersion ?? 1, 4),
    player: {
      ...raw.player,
      currentAreaId: raw.player.currentAreaId ?? 'green-village',
      unlockedAreaIds,
      unlockedSkillIds: raw.player.unlockedSkillIds ?? [],
      bossesDefeated: raw.player.bossesDefeated ?? [],
      openedChests: raw.player.openedChests ?? [],
      characterId: raw.player.characterId ?? 'wanderer',
      unlockedCharacterIds,
      bestStageScores: raw.player.bestStageScores ?? {},
      starObjectives: raw.player.starObjectives ?? {},
      equipmentLevels: raw.player.equipmentLevels ?? {},
      skillTree: raw.player.skillTree ?? { activePath: 'blade', unlockedNodes: ['blade-1'] },
      dailyLogin: raw.player.dailyLogin ?? { lastClaimDate: '', streak: 0 },
      storyFlags: raw.player.storyFlags ?? [],
      unlockedPetIds,
      activePetId: raw.player.activePetId ?? 'ember-sprite',
      petProgress,
      areaDiscoveries: raw.player.areaDiscoveries ?? {},
      artifacts: raw.player.artifacts ?? {},
      guildAffinity: raw.player.guildAffinity ?? { elder: 0, blacksmith: 0, merchant: 0, ranger: 0 },
      telemetry: raw.player.telemetry ?? {
        deaths: 0,
        potionsUsed: 0,
        totalKills: 0,
        totalCoins: 0,
        totalPlaySeconds: 0,
        bossPracticeClears: 0,
        challengeClears: 0
      },
      weeklyChallenges: raw.player.weeklyChallenges ?? {},
      lastChallengeSeed: raw.player.lastChallengeSeed ?? ''
    },
    inventory: raw.inventory ?? [],
    areaProgress,
    settings: {
      soundEnabled: true,
      reduceMotion: false,
      difficulty: 'normal',
      hapticsEnabled: true,
      touchTutorialSeen: false,
      biggerUi: false,
      colorblindBars: false,
      graphicsQuality: 'medium',
      cameraAssist: true,
      showDamageNumbers: true,
      autoPotion: false,
      ...(raw.settings ?? {})
    }
  };
}
```

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/services/saveService.test.ts
npm.cmd run build
```

Expected: both migration tests pass and the build succeeds.

- [ ] **Step 7: Commit**

```powershell
git add src/types.ts src/systems/gameFactory.ts src/services/saveService.ts src/services/saveService.test.ts
git commit -m "feat: migrate adventure save progress"
```

### Task 3: Centralize Area Access

**Files:**
- Create: `src/systems/adventureAccess.ts`
- Create: `src/systems/adventureAccess.test.ts`
- Modify: `src/screens/MapScreen.tsx`

- [ ] **Step 1: Write failing access tests**

Create `src/systems/adventureAccess.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getAdventureLockReason } from './adventureAccess';
import { makeSave } from '../test/fixtures';

describe('getAdventureLockReason', () => {
  it('allows an unlocked area at the required level', () => {
    expect(getAdventureLockReason(makeSave(), 'green-village')).toBeNull();
  });

  it('returns the area unlock condition for a locked area', () => {
    expect(getAdventureLockReason(makeSave(), 'forest-path')).toContain('Defeat Giant Slime');
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

```powershell
npm.cmd run test:run -- src/systems/adventureAccess.test.ts
```

Expected: FAIL because `getAdventureLockReason` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/systems/adventureAccess.ts`:

```ts
import type { GameSave } from '../types';
import { getArea } from '../data/areas';

export function getAdventureLockReason(save: GameSave, areaId: string): string | null {
  const area = getArea(areaId);
  if (!save.player.unlockedAreaIds.includes(areaId)) return area.unlockCondition;
  if (save.player.level < area.requiredLevel) return `Reach Level ${area.requiredLevel}`;
  return null;
}
```

- [ ] **Step 4: Replace map battle props**

Change `MapScreen` props to:

```ts
interface Props {
  save: GameSave;
  onEnterStage: (areaId: string) => void;
  onOpenChest: (areaId: string) => void;
}
```

Change the component signature to:

```ts
export function MapScreen({ save, onEnterStage, onOpenChest }: Props) {
```

Replace the unlocked action fragment with:

```tsx
<>
  <button className="primary" onClick={() => onEnterStage(area.id)}>Enter Adventure</button>
  <button
    className="secondary"
    disabled={progress?.chestOpened}
    onClick={() => onOpenChest(area.id)}
  >
    {progress?.chestOpened ? 'Chest Opened' : 'Open Chest'}
  </button>
</>
```

Remove the `BattleMode` import.

- [ ] **Step 5: Run tests and build**

```powershell
npm.cmd run test:run -- src/systems/adventureAccess.test.ts
npm.cmd run build
```

Expected: tests pass and TypeScript reports `App.tsx` still needs the new map prop.

- [ ] **Step 6: Commit**

```powershell
git add src/systems/adventureAccess.ts src/systems/adventureAccess.test.ts src/screens/MapScreen.tsx
git commit -m "refactor: centralize adventure area access"
```

### Task 4: Route All Areas Into Real-Time Gameplay

**Files:**
- Modify: `src/App.tsx`
- Create: `src/screens/MapScreen.test.tsx`

- [ ] **Step 1: Write the map routing test**

Create `src/screens/MapScreen.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MapScreen } from './MapScreen';
import { makeSave } from '../test/fixtures';

describe('MapScreen', () => {
  it('offers one real-time adventure entry action', () => {
    const onEnterStage = vi.fn();
    render(<MapScreen save={makeSave()} onEnterStage={onEnterStage} onOpenChest={() => undefined} />);

    expect(screen.queryByRole('button', { name: 'Boss' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter Adventure' }));
    expect(onEnterStage).toHaveBeenCalledWith('green-village');
  });
});
```

- [ ] **Step 2: Run the routing test**

```powershell
npm.cmd run test:run -- src/screens/MapScreen.test.tsx
```

Expected: PASS after Task 3.

- [ ] **Step 3: Remove turn-based state and imports**

In `src/App.tsx`:

- remove `BattleMode` and `BattleState` from the type import
- remove `BattleScreen`
- remove `createBattle`, `resolveDefeat`, and `resolveVictory`
- remove the `battle` state
- remove the `victory` state
- remove `enterBattle`, `handleVictory`, and `handleDefeat`
- remove the turn-based victory modal
- remove `setBattle` calls from logout and other transitions

- [ ] **Step 4: Use the shared access helper**

Import:

```ts
import { getAdventureLockReason } from './systems/adventureAccess';
```

Replace `enterActionStage` with:

```ts
function enterActionStage(areaId: string) {
  if (!currentSave) return;
  const lockReason = getAdventureLockReason(currentSave, areaId);
  if (lockReason) {
    notify(`Locked: ${lockReason}`, 'warning');
    return;
  }
  const next = {
    ...currentSave,
    player: { ...currentSave.player, currentAreaId: areaId }
  };
  setStageAreaId(areaId);
  updateSave(next, false);
  setScreen('stage');
  audio.startMusic('battle');
  audio.playSfx('click');
}
```

- [ ] **Step 5: Update the map render**

Use:

```tsx
{screen === 'map' && (
  <MapScreen
    save={currentSave}
    onEnterStage={enterActionStage}
    onOpenChest={openChest}
  />
)}
```

Delete the `screen === 'battle'` render block.

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: routing tests pass. The build may still report obsolete battle types referenced only by files removed in Task 5.

- [ ] **Step 7: Commit**

```powershell
git add src/App.tsx src/screens/MapScreen.test.tsx
git commit -m "feat: route map encounters into action stages"
```

### Task 5: Remove Turn-Based Combat Code

**Files:**
- Delete: `src/screens/BattleScreen.tsx`
- Delete: `src/components/BattleStage3D.tsx`
- Delete: `src/systems/battleEngine.ts`
- Modify: `src/types.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Remove battle-only types**

Delete these declarations from `src/types.ts`:

```ts
export type BattleMode = 'normal' | 'boss';
```

Remove `'battle'` from `Screen`, and delete `BattleActor` and `BattleState`.

- [ ] **Step 2: Delete obsolete files**

Delete:

```text
src/screens/BattleScreen.tsx
src/components/BattleStage3D.tsx
src/systems/battleEngine.ts
```

- [ ] **Step 3: Remove battle-only CSS**

Delete selectors that only serve the removed turn-based screen:

```text
.battle-screen
.battle-main-grid
.battle-visual-card
.battle-side-panel
.battle-arena
.battle-command
.battle-log
.battle-picker
.battle-stage-3d
.battle-turn-*
.combatant
.combatant-tag
.versus
.damage-pop
```

Keep shared `.command-grid`, `.list-panel`, and `.wide-choice` rules if other screens still use them.

- [ ] **Step 4: Verify no references remain**

Run:

```powershell
rg -n "BattleScreen|BattleStage3D|battleEngine|BattleMode|BattleState|screen === 'battle'|screen: 'battle'" src
```

Expected: no matches.

- [ ] **Step 5: Run all checks**

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: all tests pass and the production build succeeds.

- [ ] **Step 6: Commit**

```powershell
git add -A src
git commit -m "refactor: remove turn based combat mode"
```

### Task 6: Foundation Smoke Test

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the gameplay description**

Replace references to `2.5D` and separate battles with:

```markdown
- Unified full 3D real-time adventure stages
- One area flow for exploration, enemies, loot, objectives, boss gate, and boss combat
- Responsive web and mobile controls
```

Set the main gameplay flow to:

```markdown
1. Login/Register or play guest.
2. Choose or create a save slot.
3. Spawn in the 3D village.
4. Enter an unlocked area from a portal or the map.
5. Explore, complete the area objective, fight enemies, and collect loot.
6. Enter the boss gate and defeat the boss.
7. Return to the village to upgrade and continue.
```

- [ ] **Step 2: Start the app**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite serves the game at `http://127.0.0.1:5173`.

- [ ] **Step 3: Browser smoke test**

Using the Browser plugin:

1. Open the app.
2. start or load a guest save.
3. open the map.
4. confirm `Enter Adventure` launches the 3D stage.
5. confirm no `Boss` turn-based action exists.
6. return to the village.

Expected: all navigation stays within the real-time flow and the browser console has no routing errors.

- [ ] **Step 4: Final phase checks**

```powershell
npm.cmd run test:run
npm.cmd run build
git status --short
```

Expected: tests and build pass; only intentional changes are present.

- [ ] **Step 5: Commit**

```powershell
git add README.md
git commit -m "docs: describe unified real time adventure"
```
