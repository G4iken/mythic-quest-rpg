# Exploration Content And QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable objectives, discoveries, minimap markers, loot presentation, performance safeguards, encoding cleanup, and complete cross-device verification.

**Architecture:** Area data selects one objective definition. A pure objective reducer tracks progress, while runtime entities expose normalized minimap markers. Discovery state persists only at meaningful checkpoints. VFX budgets derive from graphics and accessibility settings.

**Tech Stack:** TypeScript, Vitest, React, React Three Fiber, Three.js, CSS, Browser plugin.

---

### Task 1: Add Data-Driven Area Objectives

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/areas.ts`
- Create: `src/features/adventure/objectives.ts`
- Create: `src/features/adventure/objectives.test.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Add objective types**

Add to `src/types.ts`:

```ts
export type AdventureObjectiveType = 'break_seals' | 'activate_switches' | 'defend_point' | 'collect_keys';

export interface AdventureObjectiveData {
  type: AdventureObjectiveType;
  required: number;
  label: string;
}
```

Add to `AreaData`:

```ts
adventureObjective: AdventureObjectiveData;
```

- [ ] **Step 2: Assign objectives to every area**

Use this repeating data pattern in `AREAS`:

```ts
'green-village': { type: 'defend_point', required: 30, label: 'Defend the village beacon' }
'forest-path': { type: 'activate_switches', required: 3, label: 'Activate the forest waystones' }
'crystal-cave': { type: 'collect_keys', required: 3, label: 'Collect crystal keys' }
'old-ruins': { type: 'break_seals', required: 3, label: 'Break the ruin seals' }
'lava-mountain': { type: 'break_seals', required: 3, label: 'Break the flame seals' }
'sky-temple': { type: 'activate_switches', required: 4, label: 'Activate storm pylons' }
'moon-graveyard': { type: 'defend_point', required: 45, label: 'Defend the moon lantern' }
'abyssal-library': { type: 'collect_keys', required: 4, label: 'Collect forbidden pages' }
'dragon-citadel': { type: 'break_seals', required: 4, label: 'Break dragon wards' }
'ethereal-gate': { type: 'activate_switches', required: 4, label: 'Stabilize the rift anchors' }
'frost-harbor': { type: 'collect_keys', required: 4, label: 'Collect frozen sigils' }
'sunken-forge': { type: 'defend_point', required: 50, label: 'Defend the forge ignition' }
'astral-throne': { type: 'break_seals', required: 5, label: 'Break the astral seals' }
```

- [ ] **Step 3: Write reducer tests**

Create `src/features/adventure/objectives.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createObjectiveState, progressObjective } from './objectives';

describe('adventure objectives', () => {
  it('completes break seals at the required count', () => {
    let state = createObjectiveState({ type: 'break_seals', required: 2, label: 'Break seals' });
    state = progressObjective(state, { type: 'seal_broken', amount: 1 });
    state = progressObjective(state, { type: 'seal_broken', amount: 1 });
    expect(state.completed).toBe(true);
    expect(state.progress).toBe(2);
  });

  it('ignores unrelated events', () => {
    const state = progressObjective(
      createObjectiveState({ type: 'collect_keys', required: 3, label: 'Collect keys' }),
      { type: 'seal_broken', amount: 1 }
    );
    expect(state.progress).toBe(0);
  });
});
```

- [ ] **Step 4: Implement objective state**

Create `src/features/adventure/objectives.ts`:

```ts
import type { AdventureObjectiveData } from '../../types';

export type ObjectiveEvent =
  | { type: 'seal_broken'; amount: number }
  | { type: 'switch_activated'; amount: number }
  | { type: 'key_collected'; amount: number }
  | { type: 'defense_second'; amount: number };

export interface ObjectiveState extends AdventureObjectiveData {
  progress: number;
  completed: boolean;
}

const eventForObjective = {
  break_seals: 'seal_broken',
  activate_switches: 'switch_activated',
  collect_keys: 'key_collected',
  defend_point: 'defense_second'
} as const;

export function createObjectiveState(data: AdventureObjectiveData): ObjectiveState {
  return { ...data, progress: 0, completed: false };
}

export function progressObjective(state: ObjectiveState, event: ObjectiveEvent): ObjectiveState {
  if (state.completed || event.type !== eventForObjective[state.type]) return state;
  const progress = Math.min(state.required, state.progress + event.amount);
  return { ...state, progress, completed: progress >= state.required };
}
```

- [ ] **Step 5: Integrate into runtime**

Add `objective: ObjectiveState` to runtime and initialize from `area.adventureObjective`.

Spawn interactable objective entities:

- seal meshes for `break_seals`
- switch meshes for `activate_switches`
- key pickups for `collect_keys`
- one defense circle for `defend_point`

Set `gateOpen` only when:

```ts
const gateOpen = livingEnemies === 0 && runtime.objective.completed && runtime.phase !== 'boss';
```

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/objectives.test.ts
npm.cmd run build
```

Expected: tests and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/types.ts src/data/areas.ts src/features/adventure/objectives.ts src/features/adventure/objectives.test.ts src/screens/Stage3DActionScreen.tsx
git commit -m "feat: add reusable area objectives"
```

### Task 2: Add Discoveries And Minimap Markers

**Files:**
- Create: `src/features/adventure/minimap.ts`
- Create: `src/features/adventure/minimap.test.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`
- Modify: `src/features/adventure/AdventureHud.tsx`

- [ ] **Step 1: Write marker normalization tests**

Create `src/features/adventure/minimap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeMarker } from './minimap';

describe('normalizeMarker', () => {
  it('maps world bounds to zero through one hundred', () => {
    expect(normalizeMarker({ x: 0, z: 0 }, { halfX: 20, halfZ: 10 })).toEqual({ x: 50, y: 50 });
    expect(normalizeMarker({ x: 20, z: -10 }, { halfX: 20, halfZ: 10 })).toEqual({ x: 100, y: 0 });
  });
});
```

- [ ] **Step 2: Implement marker normalization**

Create `src/features/adventure/minimap.ts`:

```ts
export function normalizeMarker(
  point: { x: number; z: number },
  size: { halfX: number; halfZ: number }
) {
  return {
    x: Math.round(((point.x + size.halfX) / (size.halfX * 2)) * 100),
    y: Math.round(((point.z + size.halfZ) / (size.halfZ * 2)) * 100)
  };
}
```

- [ ] **Step 3: Add secret runtime entities**

Add:

```ts
interface Discovery3D {
  id: string;
  kind: 'hidden-chest' | 'lore-marker' | 'elite-encounter';
  x: number;
  z: number;
  discovered: boolean;
  collected: boolean;
}
```

Initialize two hidden chests, one lore marker, and one elite encounter per area. A discovery becomes visible when the player is within 6 units or `Treasure Sense` is active.

- [ ] **Step 4: Derive minimap markers**

Build markers for:

- player
- living enemies
- elite variants
- boss
- gate
- objective entities
- discovered, uncollected chests

Normalize them with `normalizeMarker` and pass them to `createHudSnapshot`.

- [ ] **Step 5: Persist discoveries**

On stage clear and chest collection, update:

```ts
areaDiscoveries: {
  ...(save.player.areaDiscoveries ?? {}),
  [r.areaId]: {
    hiddenChests: r.discoveries.filter(item => item.kind === 'hidden-chest' && item.collected).map(item => item.id),
    loreMarkers: r.discoveries.filter(item => item.kind === 'lore-marker' && item.discovered).map(item => item.id),
    eliteEncounters: r.discoveries.filter(item => item.kind === 'elite-encounter' && item.collected).map(item => item.id)
  }
}
```

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/minimap.test.ts
npm.cmd run build
```

Expected: minimap test and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/features/adventure/minimap.ts src/features/adventure/minimap.test.ts src/screens/Stage3DActionScreen.tsx src/features/adventure/AdventureHud.tsx
git commit -m "feat: add discoveries and tactical minimap"
```

### Task 3: Add Loot Beams, Death Effects, And Quality Budgets

**Files:**
- Create: `src/features/adventure/effectBudget.ts`
- Create: `src/features/adventure/effectBudget.test.ts`
- Modify: `src/features/adventure/runtimeTypes.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Write budget tests**

Create `src/features/adventure/effectBudget.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getEffectBudget } from './effectBudget';

describe('getEffectBudget', () => {
  it('uses the smallest budget for low quality', () => {
    expect(getEffectBudget('low', false).particles).toBe(48);
  });

  it('reduces high quality when reduced motion is enabled', () => {
    expect(getEffectBudget('high', true).particles).toBeLessThan(getEffectBudget('high', false).particles);
  });
});
```

- [ ] **Step 2: Implement budgets**

Create `src/features/adventure/effectBudget.ts`:

```ts
import type { GraphicsQuality } from '../../types';

export function getEffectBudget(quality: GraphicsQuality, reducedMotion: boolean) {
  const base = quality === 'low'
    ? { particles: 48, floats: 18, projectiles: 18, lights: 3 }
    : quality === 'high'
      ? { particles: 160, floats: 50, projectiles: 44, lights: 8 }
      : { particles: 96, floats: 32, projectiles: 30, lights: 5 };
  if (!reducedMotion) return base;
  return {
    particles: Math.round(base.particles * .45),
    floats: base.floats,
    projectiles: base.projectiles,
    lights: Math.max(2, Math.round(base.lights * .6))
  };
}
```

- [ ] **Step 3: Add loot beam runtime data**

Add:

```ts
interface LootBeam3D {
  id: string;
  x: number;
  z: number;
  rarity: Rarity;
  life: number;
}
```

Push a beam when a rare or better item drops. Render beam colors:

```ts
const rarityColor = {
  Common: '#d8d8d8',
  Uncommon: '#67e58d',
  Rare: '#62b8ff',
  Epic: '#b96cff',
  Legendary: '#ffd45f'
};
```

- [ ] **Step 4: Add death dissolve state**

Replace immediate enemy removal with `deathTimer: .65`. During the timer, scale the enemy down, increase emissive intensity, and emit a bounded burst. Mark it non-collidable immediately.

- [ ] **Step 5: Apply budgets**

Use `getEffectBudget(save.settings.graphicsQuality ?? 'medium', reduceMotion)` once per render and slice transient arrays to the returned limits.

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/effectBudget.test.ts
npm.cmd run build
```

Expected: budget tests and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/features/adventure/effectBudget.ts src/features/adventure/effectBudget.test.ts src/features/adventure/runtimeTypes.ts src/screens/Stage3DActionScreen.tsx
git commit -m "feat: add bounded combat and loot effects"
```

### Task 4: Add WebGL Recovery And Pause Input Safety

**Files:**
- Modify: `src/components/ErrorBoundary.tsx`
- Create: `src/components/WebGLRecovery.tsx`
- Create: `src/components/WebGLRecovery.test.tsx`
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Write recovery test**

Create `src/components/WebGLRecovery.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebGLRecovery } from './WebGLRecovery';

describe('WebGLRecovery', () => {
  it('offers retry and return actions', () => {
    const retry = vi.fn();
    const back = vi.fn();
    render(<WebGLRecovery onRetry={retry} onReturn={back} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry 3D' }));
    fireEvent.click(screen.getByRole('button', { name: 'Return to village' }));
    expect(retry).toHaveBeenCalled();
    expect(back).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement recovery surface**

Create `src/components/WebGLRecovery.tsx`:

```tsx
interface Props {
  onRetry: () => void;
  onReturn: () => void;
}

export function WebGLRecovery({ onRetry, onReturn }: Props) {
  return (
    <div className="all3d-overlay-card" role="alert">
      <h2>3D renderer unavailable</h2>
      <p>Mythic Quest could not start WebGL. Retry the scene or return to the village.</p>
      <button className="primary" onClick={onRetry}>Retry 3D</button>
      <button onClick={onReturn}>Return to village</button>
    </div>
  );
}
```

- [ ] **Step 3: Catch context loss**

Attach `onCreated` to Canvas:

```tsx
<Canvas
  onCreated={({ gl }) => {
    gl.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      setWebglLost(true);
      setPaused(true);
    });
  }}
>
```

Render `WebGLRecovery` when `webglLost` is true. Retry remounts Canvas by incrementing a `canvasKey`.

- [ ] **Step 4: Gate all input under overlays**

Compute:

```ts
const inputBlocked = paused || showGuide || photoMode || webglLost || runtime.phase === 'clear' || runtime.phase === 'defeat';
```

Use it for keyboard actions, joystick disabled state, and `AdventureHud` paused state.

- [ ] **Step 5: Run tests and build**

```powershell
npm.cmd run test:run -- src/components/WebGLRecovery.test.tsx
npm.cmd run build
```

Expected: recovery test and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/components/WebGLRecovery.tsx src/components/WebGLRecovery.test.tsx src/components/ErrorBoundary.tsx src/screens/Stage3DActionScreen.tsx
git commit -m "fix: recover from webgl loss and gate input"
```

### Task 5: Clean Visible Encoding And Responsive Menu Content

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Shell.tsx`
- Modify: `src/screens/MapScreen.tsx`
- Modify: `src/screens/VillageScreen.tsx`
- Modify: `src/screens/ShopScreen.tsx`
- Modify: `src/data/characters.ts`
- Modify: `src/data/pets.ts`
- Modify: `src/data/enemies.ts`
- Modify: `README.md`

- [ ] **Step 1: Find corrupted visible strings**

Run:

```powershell
rg -n "ðŸ|â€¢|â€”|â†|ï¸|âš|ðŸ" src README.md
```

Expected: a list of mojibake strings.

- [ ] **Step 2: Replace each visible string with valid UTF-8**

Use actual symbols only in data and UI where they improve recognition. Examples:

```text
â€¢ -> •
â€” -> —
â† -> ←
ðŸª™ -> 🪙
âœ¨ -> ✨
âš™ï¸ -> ⚙️
```

For navigation and critical controls, prefer text or CSS/asset icons rather than emoji-only accessible names.

- [ ] **Step 3: Verify responsive cards**

At `360x800`, `800x360`, and `1280x720`, inspect:

- shop tabs
- pet cards
- inventory cards
- settings controls
- map action buttons
- village interaction buttons

Correct wrapping with:

```css
min-width: 0;
overflow-wrap: anywhere;
white-space: normal;
```

Use intrinsic grids:

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
```

- [ ] **Step 4: Run checks**

```powershell
rg -n "ðŸ|â€¢|â€”|â†|ï¸|âš" src README.md
npm.cmd run test:run
npm.cmd run build
```

Expected: no mojibake matches, all tests pass, and build succeeds.

- [ ] **Step 5: Commit**

```powershell
git add src README.md
git commit -m "fix: clean game text and responsive cards"
```

### Task 6: Final Cross-Device And Gameplay Verification

**Files:**
- Modify: `ADVANCED_FEATURES_ADDED.md`
- Modify: `RECOMMENDED_IMPROVEMENTS.md`

- [ ] **Step 1: Run the complete automated suite**

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: all tests pass and production build succeeds.

- [ ] **Step 2: Verify core gameplay**

Using a fresh guest save:

1. enter Green Village adventure
2. complete its data-driven objective
3. defeat normal enemies
4. use the Ember Sprite active ability
5. lock onto an enemy
6. collect a hidden chest
7. enter the boss gate
8. trigger phase two and rage where configured
9. defeat the boss
10. confirm XP, coins, loot, pet XP, quest progress, area unlock, and discovery persistence
11. reload the save and confirm progress remains

- [ ] **Step 3: Verify representative visuals**

Capture screenshots for:

```text
desktop exploration at 1366x768
desktop boss at 1920x1080
mobile landscape combat at 844x390
mobile portrait combat at 390x844
pet ability effect
boss phase transition
rare loot beam
shop pet card
```

Use `view_image` on each screenshot and confirm:

- no overlaps
- readable hierarchy
- playfield remains visible
- consistent portrait assets
- primary controls are reachable
- effects do not hide telegraphs

- [ ] **Step 4: Verify settings combinations**

Test:

```text
Low graphics + reduced motion
Medium graphics default
High graphics + photo mode
Bigger UI + colorblind bars
```

Expected: all combinations remain playable and overlap-free.

- [ ] **Step 5: Update feature documentation**

In `ADVANCED_FEATURES_ADDED.md`, document completed:

- responsive tactical HUD
- real-time-only routing
- active pet abilities and levels
- enemy archetypes and projectiles
- lock-on
- boss phases
- area objectives
- minimap and discoveries
- quality-bounded VFX

Remove these completed items from `RECOMMENDED_IMPROVEMENTS.md` and retain only genuinely future work such as skeletal GLB animation, controller remapping, multiplayer ghost runs, and seasonal areas.

- [ ] **Step 6: Final status check**

```powershell
git status --short
git diff --check
```

Expected: no accidental or malformed changes.

- [ ] **Step 7: Commit**

```powershell
git add ADVANCED_FEATURES_ADDED.md RECOMMENDED_IMPROVEMENTS.md
git commit -m "docs: record responsive adventure upgrade"
```
