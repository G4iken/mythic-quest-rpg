# Responsive Tactical UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved tactical HUD and responsive shell so web, tablet, mobile landscape, and mobile portrait remain readable and overlap-free.

**Architecture:** A dedicated `AdventureHud` composes focused status components from a small snapshot. CSS grid areas reserve non-overlapping zones and media queries collapse information before controls shrink. The shell navigation uses a responsive primary/More model rather than an unbounded button row.

**Tech Stack:** React 19, TypeScript, CSS grid/container queries, Testing Library, Image Gen assets, React Three Fiber host integration.

---

### Task 1: Generate And Store The HUD Portrait Assets

**Files:**
- Create: `public/ui/portraits/hero-party.webp`
- Create: `public/ui/portraits/pet-party.webp`
- Create: `public/ui/portraits/boss-party.webp`
- Create: `public/ui/portraits/README.md`

- [ ] **Step 1: Use the imagegen skill**

Generate three coordinated transparent-background portrait sheets:

```text
Hero sheet: nine dark-fantasy RPG portrait medallions matching Ari, Nyx, Lyra, Borin, Kaida, Zeph, Mira, Vex, and Terra; realistic painterly game UI art; consistent warm rim light; square cells; no text.

Pet sheet: five companion portrait medallions matching Ember Sprite, Mender Fairy, Gold Mimic, Storm Hawk, and Void Cub; realistic fantasy game UI art; consistent framing; square cells; no text.

Boss sheet: seven archetype medallions for slime, beast, caster, golem, spirit, dragon, and final boss; threatening realistic fantasy UI portraits; consistent framing; square cells; no text.
```

Save the outputs under `public/ui/portraits/`.

- [ ] **Step 2: Document crop coordinates**

Create `public/ui/portraits/README.md` with each sheet's dimensions and the left-to-right cell order. Use CSS `object-position` or background positioning from that documented order.

- [ ] **Step 3: Inspect generated assets**

Use `view_image` on all three sheets.

Expected: consistent lighting, readable faces/silhouettes at 48px, no embedded text, and no cropped focal features.

- [ ] **Step 4: Commit**

```powershell
git add public/ui/portraits
git commit -m "feat: add tactical hud portrait assets"
```

### Task 2: Define The HUD Snapshot Contract

**Files:**
- Create: `src/features/adventure/hudTypes.ts`
- Create: `src/features/adventure/hudTypes.test.ts`

- [ ] **Step 1: Write the failing snapshot test**

Create `src/features/adventure/hudTypes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createHudSnapshot } from './hudTypes';

describe('createHudSnapshot', () => {
  it('clamps percentages and preserves tactical labels', () => {
    const snapshot = createHudSnapshot({
      hero: { name: 'Ari', className: 'Flame Samurai', hp: 150, maxHp: 100, mana: -5, maxMana: 40, ultimate: 120, element: 'fire' },
      pet: { id: 'ember-sprite', name: 'Ember Sprite', charge: 82, ready: false, level: 2 },
      area: { name: 'Lava Mountain', objective: 'Break the final seal', progress: '2/3', elapsedSeconds: 161, combo: 18 },
      boss: null,
      target: null,
      minimap: []
    });

    expect(snapshot.hero.hpPercent).toBe(100);
    expect(snapshot.hero.manaPercent).toBe(0);
    expect(snapshot.hero.ultimatePercent).toBe(100);
    expect(snapshot.area.elapsedLabel).toBe('02:41');
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

```powershell
npm.cmd run test:run -- src/features/adventure/hudTypes.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the contract**

Create `src/features/adventure/hudTypes.ts`:

```ts
import type { ElementType } from '../../types';

export interface MinimapMarker {
  id: string;
  kind: 'player' | 'enemy' | 'elite' | 'boss' | 'gate' | 'chest' | 'objective';
  x: number;
  y: number;
}

export interface HudSnapshotInput {
  hero: {
    name: string;
    className: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    ultimate: number;
    element: ElementType;
  };
  pet: {
    id: string;
    name: string;
    charge: number;
    ready: boolean;
    level: number;
  };
  area: {
    name: string;
    objective: string;
    progress: string;
    elapsedSeconds: number;
    combo: number;
  };
  boss: null | {
    name: string;
    hp: number;
    maxHp: number;
    phase: number;
    element: ElementType;
    weakness: ElementType;
    rage: boolean;
  };
  target: null | {
    name: string;
    range: number;
    weakness: ElementType;
    resistance: ElementType;
    staggerPercent: number;
  };
  minimap: MinimapMarker[];
}

function percent(value: number, max: number) {
  return Math.round(Math.max(0, Math.min(1, value / Math.max(1, max))) * 100);
}

function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function createHudSnapshot(input: HudSnapshotInput) {
  return {
    ...input,
    hero: {
      ...input.hero,
      hpPercent: percent(input.hero.hp, input.hero.maxHp),
      manaPercent: percent(input.hero.mana, input.hero.maxMana),
      ultimatePercent: percent(input.hero.ultimate, 100)
    },
    pet: {
      ...input.pet,
      chargePercent: percent(input.pet.charge, 100)
    },
    boss: input.boss ? {
      ...input.boss,
      hpPercent: percent(input.boss.hp, input.boss.maxHp)
    } : null,
    area: {
      ...input.area,
      elapsedLabel: timeLabel(input.area.elapsedSeconds)
    }
  };
}

export type HudSnapshot = ReturnType<typeof createHudSnapshot>;
```

- [ ] **Step 4: Run the test**

```powershell
npm.cmd run test:run -- src/features/adventure/hudTypes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/adventure/hudTypes.ts src/features/adventure/hudTypes.test.ts
git commit -m "feat: define tactical hud snapshot"
```

### Task 3: Build The Tactical HUD Components

**Files:**
- Create: `src/features/adventure/AdventureHud.tsx`
- Create: `src/features/adventure/AdventureHud.test.tsx`
- Create: `src/features/adventure/adventureHud.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the failing HUD behavior test**

Create `src/features/adventure/AdventureHud.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdventureHud } from './AdventureHud';
import { createHudSnapshot } from './hudTypes';

const snapshot = createHudSnapshot({
  hero: { name: 'Ari', className: 'Flame Samurai', hp: 90, maxHp: 100, mana: 30, maxMana: 40, ultimate: 92, element: 'fire' },
  pet: { id: 'ember-sprite', name: 'Ember Sprite', charge: 100, ready: true, level: 2 },
  area: { name: 'Lava Mountain', objective: 'Break the final seal', progress: '2/3', elapsedSeconds: 161, combo: 18 },
  boss: { name: 'Ashen Wyrm', hp: 640, maxHp: 1000, phase: 2, element: 'fire', weakness: 'ice', rage: false },
  target: null,
  minimap: []
});

describe('AdventureHud', () => {
  it('keeps primary actions visible and reveals secondary actions under More', () => {
    const onAction = vi.fn();
    render(<AdventureHud snapshot={snapshot} onAction={onAction} paused={false} />);

    expect(screen.getByRole('button', { name: 'Attack' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Lock on' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lock on' }));
    expect(onAction).toHaveBeenCalledWith('lock');
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

```powershell
npm.cmd run test:run -- src/features/adventure/AdventureHud.test.tsx
```

Expected: FAIL because `AdventureHud` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/features/adventure/AdventureHud.tsx` with:

```tsx
import { useState } from 'react';
import type { HudSnapshot } from './hudTypes';
import './adventureHud.css';

export type AdventureAction = 'attack' | 'dash' | 'jump' | 'skill' | 'pet' | 'ultimate' | 'potion' | 'lock';

interface Props {
  snapshot: HudSnapshot;
  onAction: (action: AdventureAction) => void;
  paused: boolean;
}

const primaryActions: Array<{ id: AdventureAction; label: string }> = [
  { id: 'attack', label: 'Attack' },
  { id: 'dash', label: 'Dash' },
  { id: 'jump', label: 'Jump' },
  { id: 'skill', label: 'Skill' },
  { id: 'pet', label: 'Pet assist' },
  { id: 'ultimate', label: 'Ultimate' }
];

const secondaryActions: Array<{ id: AdventureAction; label: string }> = [
  { id: 'potion', label: 'Potion' },
  { id: 'lock', label: 'Lock on' }
];

export function AdventureHud({ snapshot, onAction, paused }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className={`adventure-hud ${paused ? 'is-paused' : ''}`}>
      <section className="adventure-party" aria-label="Party status">
        <div className="party-portrait hero-portrait" aria-hidden="true" />
        <div className="party-copy">
          <strong>{snapshot.hero.name} · {snapshot.hero.className}</strong>
          <div className="hud-meter hp"><i style={{ width: `${snapshot.hero.hpPercent}%` }} /></div>
          <div className="hud-meter mana"><i style={{ width: `${snapshot.hero.manaPercent}%` }} /></div>
        </div>
        <div className="party-portrait pet-portrait" aria-hidden="true" />
        <div className="party-copy">
          <strong>{snapshot.pet.name} · Lv {snapshot.pet.level}</strong>
          <div className="hud-meter pet-charge"><i style={{ width: `${snapshot.pet.chargePercent}%` }} /></div>
        </div>
      </section>

      {snapshot.boss && (
        <section className="adventure-boss" aria-label="Boss status">
          <strong>{snapshot.boss.name} · Phase {snapshot.boss.phase}</strong>
          <div className="hud-meter boss-hp"><i style={{ width: `${snapshot.boss.hpPercent}%` }} /></div>
          <small>{snapshot.boss.element} · weak to {snapshot.boss.weakness}</small>
        </section>
      )}

      <section className="adventure-tracker" aria-label="Objective tracker">
        <div className="adventure-minimap" aria-label="Minimap">
          {snapshot.minimap.map(marker => (
            <i key={marker.id} className={`marker marker-${marker.kind}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />
          ))}
        </div>
        <div>
          <strong>{snapshot.area.name}</strong>
          <span>{snapshot.area.objective} · {snapshot.area.progress}</span>
        </div>
      </section>

      {snapshot.target && (
        <section className="adventure-target" aria-label="Locked target">
          <strong>{snapshot.target.name}</strong>
          <span>{snapshot.target.range.toFixed(1)}m · weak {snapshot.target.weakness}</span>
        </section>
      )}

      <section className="adventure-objective">
        {snapshot.area.progress} · Combo {snapshot.area.combo} · {snapshot.area.elapsedLabel}
      </section>

      <section className="adventure-actions" aria-label="Combat actions">
        {primaryActions.map(action => (
          <button
            key={action.id}
            className={`action-${action.id}`}
            disabled={paused}
            onPointerDown={() => onAction(action.id)}
          >
            {action.label}
          </button>
        ))}
        <button aria-label="More actions" onClick={() => setMoreOpen(value => !value)}>More</button>
      </section>

      {moreOpen && (
        <section className="adventure-more" aria-label="More combat actions">
          {secondaryActions.map(action => (
            <button key={action.id} onClick={() => { onAction(action.id); setMoreOpen(false); }}>
              {action.label}
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the reserved-zone CSS**

Create `src/features/adventure/adventureHud.css` with:

```css
.adventure-hud {
  --hud-gap: clamp(6px, 1vw, 12px);
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
  display: grid;
  grid-template-columns: minmax(230px, 30vw) 1fr minmax(210px, 25vw);
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "party boss tracker"
    ". . target"
    "move objective actions";
  gap: var(--hud-gap);
  padding:
    max(10px, env(safe-area-inset-top))
    max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
}

.adventure-hud > * {
  pointer-events: auto;
  min-width: 0;
}

.adventure-party,
.adventure-boss,
.adventure-tracker,
.adventure-target,
.adventure-objective,
.adventure-more {
  border: 1px solid rgba(245, 207, 129, .28);
  background: linear-gradient(180deg, rgba(24, 17, 31, .88), rgba(8, 6, 13, .8));
  box-shadow: 0 14px 34px rgba(0, 0, 0, .34);
  backdrop-filter: blur(13px);
}

.adventure-party {
  grid-area: party;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 6px 8px;
  padding: 8px;
  border-radius: 18px;
}

.party-portrait {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background-size: cover;
  border: 1px solid rgba(255, 255, 255, .14);
}

.hero-portrait { background-image: url('/ui/portraits/hero-party.webp'); }
.pet-portrait { background-image: url('/ui/portraits/pet-party.webp'); }
.party-copy { min-width: 0; }
.party-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .76rem; }

.hud-meter {
  height: 6px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
}

.hud-meter i { display: block; height: 100%; border-radius: inherit; }
.hud-meter.hp i { background: linear-gradient(90deg, #ff3c59, #ff9f54); }
.hud-meter.mana i { background: linear-gradient(90deg, #3b9cff, #9d71ff); }
.hud-meter.pet-charge i { background: linear-gradient(90deg, #55da89, #ffe273); }
.hud-meter.boss-hp i { background: linear-gradient(90deg, #f32661, #ff9666); box-shadow: 0 0 14px rgba(255, 54, 105, .7); }

.adventure-boss { grid-area: boss; align-self: start; padding: 8px 12px; border-radius: 16px; text-align: center; }
.adventure-boss small { display: block; margin-top: 3px; color: #d3c3ae; }
.adventure-tracker { grid-area: tracker; display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 8px; padding: 8px; border-radius: 18px; }
.adventure-tracker span { display: block; color: #d3c3ae; font-size: .68rem; }
.adventure-minimap { position: relative; width: 64px; height: 64px; border: 1px solid rgba(245, 207, 129, .45); border-radius: 50%; background: rgba(4, 4, 9, .82); overflow: hidden; }
.marker { position: absolute; width: 6px; height: 6px; border-radius: 50%; transform: translate(-50%, -50%); }
.marker-player { background: #6aff8b; }
.marker-enemy, .marker-elite, .marker-boss { background: #ff4a68; }
.marker-gate, .marker-objective { background: #f3c76c; }
.marker-chest { background: #b979ff; }
.adventure-target { grid-area: target; align-self: start; justify-self: end; padding: 8px 10px; border-radius: 14px; }
.adventure-objective { grid-area: objective; align-self: end; justify-self: center; padding: 8px 12px; border-radius: 14px; font-size: .72rem; }
.adventure-actions { grid-area: actions; align-self: end; display: grid; grid-template-columns: repeat(3, minmax(64px, 1fr)); gap: 7px; width: min(360px, 32vw); }
.adventure-actions button, .adventure-more button { min-width: 0; min-height: 48px; border: 1px solid rgba(245, 207, 129, .28); border-radius: 15px; color: #fff0d6; background: linear-gradient(180deg, rgba(35, 24, 43, .94), rgba(10, 7, 15, .94)); font-weight: 900; }
.adventure-actions .action-attack { color: #211306; background: linear-gradient(#ffe398, #bd7b23); }
.adventure-actions .action-pet { border-color: rgba(99, 232, 141, .55); }
.adventure-actions .action-ultimate { border-color: rgba(188, 108, 255, .7); }
.adventure-more { position: absolute; right: max(12px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 168px); display: grid; gap: 7px; width: 150px; padding: 8px; border-radius: 16px; }

@media (orientation: portrait), (max-width: 700px) {
  .adventure-hud {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto 1fr auto;
    grid-template-areas:
      "party tracker"
      "boss boss"
      ". target"
      "move actions";
  }
  .adventure-party { grid-template-columns: 34px minmax(0, 1fr) 34px minmax(0, 1fr); }
  .party-portrait { width: 34px; height: 34px; }
  .adventure-tracker { grid-template-columns: 48px; padding: 6px; }
  .adventure-tracker > div:last-child { display: none; }
  .adventure-minimap { width: 48px; height: 48px; }
  .adventure-objective { position: absolute; top: 126px; left: max(10px, env(safe-area-inset-left)); }
  .adventure-actions { width: min(54vw, 330px); grid-template-columns: repeat(3, 1fr); }
  .adventure-actions button { min-height: 54px; }
}

@media (orientation: landscape) and (max-height: 500px) {
  .party-copy strong, .adventure-boss small, .adventure-target span { font-size: .6rem; }
  .adventure-tracker > div:last-child, .adventure-objective { display: none; }
  .adventure-actions button { min-height: 48px; }
}
```

- [ ] **Step 5: Import the stylesheet**

Add to `src/main.tsx` after `styles.css`:

```ts
import './features/adventure/adventureHud.css';
```

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/AdventureHud.test.tsx
npm.cmd run build
```

Expected: HUD test and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/features/adventure src/main.tsx
git commit -m "feat: add responsive tactical adventure hud"
```

### Task 4: Integrate The HUD Into The 3D Stage

**Files:**
- Modify: `src/screens/Stage3DActionScreen.tsx`
- Modify: `src/features/adventure/AdventureHud.tsx`

- [ ] **Step 1: Extend action support**

Change the stage action type to:

```ts
type ControlKey = 'attack' | 'jump' | 'dash' | 'skill' | 'pet' | 'ultimate' | 'potion' | 'lock';
```

Add `pet` and `lock` branches to `action`; they may initially show an informative banner until Phase 3 implements their mechanics:

```ts
if (key === 'pet') setMessage(`${pet.name} assist will be available after companion training.`, 1.4);
if (key === 'lock') setMessage('Lock-on will be available after combat targeting training.', 1.4);
```

- [ ] **Step 2: Derive the snapshot**

Import:

```ts
import { AdventureHud, type AdventureAction } from '../features/adventure/AdventureHud';
import { createHudSnapshot } from '../features/adventure/hudTypes';
```

Before the stage return, create:

```ts
const hudSnapshot = createHudSnapshot({
  hero: {
    name: save.player.name,
    className: character.title,
    hp: runtime.player.hp,
    maxHp: runtime.player.maxHp,
    mana: runtime.player.mana,
    maxMana: runtime.player.maxMana,
    ultimate: runtime.player.ultimate,
    element: heroElement(character.id, save.player.skillTree?.activePath ?? 'blade')
  },
  pet: {
    id: pet.id,
    name: pet.name,
    charge: 0,
    ready: false,
    level: save.player.petProgress?.[pet.id]?.level ?? 1
  },
  area: {
    name: area.name,
    objective: gateOpen ? 'Enter the boss gate' : `Defeat ${livingEnemies} monsters`,
    progress: gateOpen ? 'Gate open' : `${livingEnemies} left`,
    elapsedSeconds: runtime.stageTime,
    combo: runtime.player.combo
  },
  boss: runtime.boss ? {
    name: runtime.boss.name,
    hp: runtime.boss.hp,
    maxHp: runtime.boss.maxHp,
    phase: runtime.boss.hp < runtime.boss.maxHp * .4 ? 2 : 1,
    element: runtime.boss.element,
    weakness: runtime.boss.weakness,
    rage: runtime.boss.hp < runtime.boss.maxHp * .25
  } : null,
  target: null,
  minimap: []
});
```

- [ ] **Step 3: Replace old HUD markup**

Delete:

```text
all3d-hud
all3d-companion-panel
all3d-radar-panel
all3d-boss-bar
all3d-objective
all3d-action-pad
```

Render:

```tsx
{!photoMode && (
  <AdventureHud
    snapshot={hudSnapshot}
    paused={paused || runtime.phase === 'clear' || runtime.phase === 'defeat'}
    onAction={nextAction => action(nextAction as AdventureAction)}
  />
)}
```

Keep `Joystick` as a sibling so it occupies the CSS-reserved movement zone.

- [ ] **Step 4: Run tests and build**

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: all tests and build pass.

- [ ] **Step 5: Commit**

```powershell
git add src/screens/Stage3DActionScreen.tsx src/features/adventure/AdventureHud.tsx
git commit -m "refactor: integrate tactical hud with action stage"
```

### Task 5: Replace The Overlapping Shell Navigation

**Files:**
- Create: `src/components/AppNavigation.tsx`
- Create: `src/components/AppNavigation.test.tsx`
- Create: `src/components/appNavigation.css`
- Modify: `src/components/Shell.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the navigation test**

Create `src/components/AppNavigation.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppNavigation } from './AppNavigation';

describe('AppNavigation', () => {
  it('places secondary destinations under More', () => {
    const go = vi.fn();
    render(<AppNavigation screen="village" go={go} onSave={() => undefined} onExit={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Village' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(go).toHaveBeenCalledWith('settings');
  });
});
```

- [ ] **Step 2: Implement navigation**

Create `src/components/AppNavigation.tsx`:

```tsx
import { useState } from 'react';
import type { Screen } from '../types';
import './appNavigation.css';

interface Props {
  screen: Screen;
  go: (screen: Screen) => void;
  onSave: () => void;
  onExit: () => void;
}

const primary: Array<{ screen: Screen; label: string; icon: string }> = [
  { screen: 'village', label: 'Village', icon: 'Home' },
  { screen: 'map', label: 'Map', icon: 'Map' },
  { screen: 'inventory', label: 'Bag', icon: 'Bag' },
  { screen: 'quests', label: 'Quests', icon: 'Quest' },
  { screen: 'shop', label: 'Shop', icon: 'Shop' }
];

const secondary: Array<{ screen: Screen; label: string }> = [
  { screen: 'skills', label: 'Skills' },
  { screen: 'equipment', label: 'Equipment' },
  { screen: 'profile', label: 'Profile' },
  { screen: 'settings', label: 'Settings' }
];

export function AppNavigation({ screen, go, onSave, onExit }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <nav className="app-navigation safe-bottom" aria-label="Game navigation">
      {primary.map(item => (
        <button key={item.screen} className={screen === item.screen ? 'active' : ''} onClick={() => go(item.screen)}>
          <span aria-hidden="true">{item.icon}</span>{item.label}
        </button>
      ))}
      <button aria-label="More navigation" onClick={() => setMoreOpen(value => !value)}>More</button>
      {moreOpen && (
        <div className="navigation-more">
          {secondary.map(item => <button key={item.screen} onClick={() => { go(item.screen); setMoreOpen(false); }}>{item.label}</button>)}
          <button onClick={onSave}>Save</button>
          <button onClick={onExit}>Exit</button>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 3: Add responsive navigation CSS**

Create `src/components/appNavigation.css`:

```css
.app-navigation {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(6, minmax(70px, 1fr));
  gap: 7px;
  padding: 8px 10px;
  background: rgba(8, 5, 12, .92);
  border-top: 1px solid rgba(245, 200, 106, .22);
}

.app-navigation > button,
.navigation-more button {
  min-width: 0;
  min-height: 48px;
  border-radius: 14px;
  color: #dbcbaa;
  background: rgba(255, 255, 255, .05);
  border: 1px solid transparent;
  font-weight: 800;
}

.app-navigation > button.active {
  color: #211408;
  background: linear-gradient(180deg, #ffe08d, #d4962e);
}

.navigation-more {
  position: absolute;
  right: max(10px, env(safe-area-inset-right));
  bottom: calc(100% + 8px);
  width: min(240px, calc(100vw - 20px));
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgba(245, 200, 106, .25);
  border-radius: 16px;
  background: rgba(18, 11, 24, .97);
  box-shadow: 0 18px 50px rgba(0, 0, 0, .45);
}

@media (orientation: landscape) and (max-height: 620px) {
  .app-navigation {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(6, minmax(42px, 1fr));
    padding: 6px;
    border-top: 0;
    border-right: 1px solid rgba(245, 200, 106, .22);
  }
}

@media (orientation: portrait), (max-width: 700px) {
  .app-navigation {
    grid-template-columns: repeat(6, minmax(54px, 1fr));
    overflow-x: auto;
  }
  .app-navigation > button { min-height: 52px; font-size: .68rem; }
}
```

- [ ] **Step 4: Integrate with Shell**

Import `AppNavigation`, remove the local `nav` array, delete the portrait-only rotate blocker, and replace the footer with:

```tsx
<AppNavigation
  screen={screen}
  go={go}
  onSave={onManualSave}
  onExit={onLogout}
/>
```

- [ ] **Step 5: Import CSS and test**

Add to `src/main.tsx`:

```ts
import './components/appNavigation.css';
```

Run:

```powershell
npm.cmd run test:run -- src/components/AppNavigation.test.tsx
npm.cmd run build
```

Expected: navigation test and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/components/AppNavigation.tsx src/components/AppNavigation.test.tsx src/components/appNavigation.css src/components/Shell.tsx src/main.tsx
git commit -m "feat: add responsive game navigation"
```

### Task 6: Responsive Browser Verification

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Remove superseded stage and navigation overrides**

Delete duplicate definitions of:

```text
.all3d-hud
.all3d-companion-panel
.all3d-radar-panel
.all3d-action-pad
.all3d-objective
.all3d-boss-bar
.bottom-nav
.rotate-device
```

Keep unrelated screen styles. Ensure `styles.css` no longer overrides `.adventure-*` or `.app-navigation`.

- [ ] **Step 2: Run automated checks**

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: all tests and build pass.

- [ ] **Step 3: Verify viewport matrix**

Use Browser screenshots at:

```text
360x800
390x844
412x915
800x360
844x390
915x412
1024x768
1280x720
1366x768
1920x1080
```

At each viewport confirm:

- no HUD element intersects another HUD element
- joystick and action controls remain separate
- boss bar never covers party or tracker
- primary touch buttons are at least 48px
- `More` is reachable
- no horizontal page overflow
- portrait mode remains playable

- [ ] **Step 4: Verify accessibility variants**

Repeat `390x844` and `844x390` with:

- Bigger UI enabled
- Reduced Motion enabled
- Colorblind-Friendly Bars enabled

Expected: no overlap returns and the state remains readable without color alone.

- [ ] **Step 5: Commit**

```powershell
git add src/styles.css
git commit -m "fix: remove conflicting responsive ui overrides"
```
