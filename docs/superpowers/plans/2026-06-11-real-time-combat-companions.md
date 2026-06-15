# Real-Time Combat And Companions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add testable active pet abilities, lock-on, differentiated enemy behavior, projectiles, boss phases, and bounded combat VFX to the real-time 3D stage.

**Architecture:** Pure combat modules mutate serializable runtime data and return events. React/Three components consume those events to play audio, haptics, HUD updates, and visual effects. `Stage3DActionScreen` remains the orchestrator but delegates mechanics to focused modules.

**Tech Stack:** TypeScript, Vitest, React Three Fiber, Three.js, React.

---

### Task 1: Extract Shared Adventure Runtime Types

**Files:**
- Create: `src/features/adventure/runtimeTypes.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`
- Create: `src/features/adventure/runtimeTypes.test.ts`

- [ ] **Step 1: Write a runtime invariant test**

Create `src/features/adventure/runtimeTypes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clampRuntimePercent } from './runtimeTypes';

describe('clampRuntimePercent', () => {
  it('clamps combat meters to zero through one hundred', () => {
    expect(clampRuntimePercent(-10)).toBe(0);
    expect(clampRuntimePercent(44)).toBe(44);
    expect(clampRuntimePercent(140)).toBe(100);
  });
});
```

- [ ] **Step 2: Create shared types**

Create `src/features/adventure/runtimeTypes.ts` with the current `Phase`, `ControlKey`, `EnemyKind`, `Fighter3D`, pickup, hazard, crate, float, VFX, player, and runtime interfaces moved from `Stage3DActionScreen`. Extend them with:

```ts
export type Phase = 'menu' | 'explore' | 'bossIntro' | 'boss' | 'clear' | 'defeat';
export type ControlKey = 'attack' | 'jump' | 'dash' | 'skill' | 'pet' | 'ultimate' | 'potion' | 'lock';
export type EnemyArchetype = 'slime' | 'beast' | 'caster' | 'golem' | 'spirit' | 'dragon' | 'boss';

export interface Projectile3D {
  id: string;
  owner: 'enemy' | 'player' | 'pet';
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  element: ElementType;
  life: number;
}

export interface CombatEvent {
  type: 'message' | 'audio' | 'haptic' | 'vfx' | 'loot' | 'phase';
  value: string;
}

export function clampRuntimePercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
```

Add these fields to the moved runtime:

```ts
projectiles: Projectile3D[];
selectedTargetId: string | null;
petCharge: number;
petCooldown: number;
bossPhase: 1 | 2 | 3;
```

- [ ] **Step 3: Update stage imports**

Import the moved types into `Stage3DActionScreen` and delete the local duplicates. Initialize:

```ts
projectiles: [],
selectedTargetId: null,
petCharge: 0,
petCooldown: 0,
bossPhase: 1,
```

- [ ] **Step 4: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/runtimeTypes.test.ts
npm.cmd run build
```

Expected: invariant test and build pass.

- [ ] **Step 5: Commit**

```powershell
git add src/features/adventure/runtimeTypes.ts src/features/adventure/runtimeTypes.test.ts src/screens/Stage3DActionScreen.tsx
git commit -m "refactor: extract adventure runtime types"
```

### Task 2: Add Pet Ability Data And Progression

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/pets.ts`
- Create: `src/systems/petProgression.ts`
- Create: `src/systems/petProgression.test.ts`
- Modify: `src/screens/ShopScreen.tsx`

- [ ] **Step 1: Extend pet data**

Add to `PetData`:

```ts
ability: {
  name: string;
  description: string;
  baseCooldown: number;
  color: string;
  kind: 'damage' | 'heal' | 'reveal' | 'chain' | 'weaken';
};
```

Add these values in `src/data/pets.ts`:

```ts
'ember-sprite': {
  ability: { name: 'Inferno Assist', description: 'Burns nearby enemies.', baseCooldown: 18, color: '#ff8c55', kind: 'damage' }
}
'mender-fairy': {
  ability: { name: 'Mending Pulse', description: 'Heals the hero and grants regeneration.', baseCooldown: 24, color: '#86ffb4', kind: 'heal' }
}
'gold-mimic': {
  ability: { name: 'Treasure Sense', description: 'Reveals secrets and magnetizes loot.', baseCooldown: 28, color: '#ffd65c', kind: 'reveal' }
}
'storm-hawk': {
  ability: { name: 'Chain Tempest', description: 'Chains lightning between enemies.', baseCooldown: 20, color: '#9be9ff', kind: 'chain' }
}
'void-cub': {
  ability: { name: 'Void Mark', description: 'Strikes and increases weakness damage.', baseCooldown: 22, color: '#b56bff', kind: 'weaken' }
}
```

- [ ] **Step 2: Write progression tests**

Create `src/systems/petProgression.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { awardPetXp, petCooldownSeconds } from './petProgression';
import { makeSave } from '../test/fixtures';

describe('pet progression', () => {
  it('levels a pet and carries excess experience', () => {
    const save = makeSave();
    const next = awardPetXp(save, 'ember-sprite', 130);
    expect(next.player.petProgress?.['ember-sprite']).toEqual({ level: 2, xp: 30 });
  });

  it('reduces cooldown without going below sixty percent', () => {
    expect(petCooldownSeconds(20, 10)).toBe(12);
  });
});
```

- [ ] **Step 3: Implement progression**

Create `src/systems/petProgression.ts`:

```ts
import type { GameSave } from '../types';

export function petXpForLevel(level: number) {
  return 100 + (level - 1) * 60;
}

export function petCooldownSeconds(baseCooldown: number, level: number) {
  const multiplier = Math.max(.6, 1 - Math.max(0, level - 1) * .05);
  return Math.round(baseCooldown * multiplier * 10) / 10;
}

export function awardPetXp(save: GameSave, petId: string, amount: number): GameSave {
  const current = save.player.petProgress?.[petId] ?? { level: 1, xp: 0 };
  let level = current.level;
  let xp = current.xp + amount;

  while (level < 10 && xp >= petXpForLevel(level)) {
    xp -= petXpForLevel(level);
    level += 1;
  }

  if (level === 10) xp = Math.min(xp, petXpForLevel(10));

  return {
    ...save,
    player: {
      ...save.player,
      petProgress: {
        ...(save.player.petProgress ?? {}),
        [petId]: { level, xp }
      }
    }
  };
}
```

- [ ] **Step 4: Show ability and progress in the shop**

Inside each pet card render:

```tsx
const progress = save.player.petProgress?.[pet.id] ?? { level: 1, xp: 0 };
```

and add:

```tsx
<p><strong>{pet.ability.name}</strong>: {pet.ability.description}</p>
<div className="shop-stat-line">
  <span>Pet Lv {progress.level}/10</span>
  <span>{progress.xp}/{petXpForLevel(progress.level)} XP</span>
</div>
```

Import `petXpForLevel`.

- [ ] **Step 5: Run tests and build**

```powershell
npm.cmd run test:run -- src/systems/petProgression.test.ts
npm.cmd run build
```

Expected: progression tests and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/types.ts src/data/pets.ts src/systems/petProgression.ts src/systems/petProgression.test.ts src/screens/ShopScreen.tsx
git commit -m "feat: add pet abilities and progression"
```

### Task 3: Implement Active Pet Abilities

**Files:**
- Create: `src/features/adventure/petAbilities.ts`
- Create: `src/features/adventure/petAbilities.test.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Write ability tests**

Create `src/features/adventure/petAbilities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolvePetAbility } from './petAbilities';

const runtime = {
  player: { x: 0, z: 0, hp: 50, maxHp: 100, ultimate: 0 },
  enemies: [
    { id: 'near', x: 2, z: 0, alive: true, hp: 100, maxHp: 100 },
    { id: 'far', x: 20, z: 0, alive: true, hp: 100, maxHp: 100 }
  ]
};

describe('resolvePetAbility', () => {
  it('returns nearby targets for Ember Sprite', () => {
    const result = resolvePetAbility('ember-sprite', 1, runtime);
    expect(result.targetIds).toEqual(['near']);
    expect(result.damageMultiplier).toBeGreaterThan(1);
  });

  it('returns healing for Mender Fairy', () => {
    const result = resolvePetAbility('mender-fairy', 1, runtime);
    expect(result.heal).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement pure ability resolution**

Create `src/features/adventure/petAbilities.ts`:

```ts
interface AbilityRuntime {
  player: { x: number; z: number; hp: number; maxHp: number; ultimate: number };
  enemies: Array<{ id: string; x: number; z: number; alive: boolean; hp: number; maxHp: number }>;
}

export interface PetAbilityResult {
  targetIds: string[];
  damageMultiplier: number;
  heal: number;
  ultimateGain: number;
  revealSeconds: number;
  weaknessBonusSeconds: number;
}

export function resolvePetAbility(petId: string, level: number, runtime: AbilityRuntime): PetAbilityResult {
  const nearby = runtime.enemies
    .filter(enemy => enemy.alive && Math.hypot(enemy.x - runtime.player.x, enemy.z - runtime.player.z) <= 7)
    .map(enemy => enemy.id);
  const levelScale = 1 + Math.max(0, level - 1) * .08;

  if (petId === 'mender-fairy') {
    return { targetIds: [], damageMultiplier: 0, heal: Math.round(runtime.player.maxHp * (.2 + level * .01)), ultimateGain: 0, revealSeconds: 0, weaknessBonusSeconds: 0 };
  }
  if (petId === 'gold-mimic') {
    return { targetIds: [], damageMultiplier: 0, heal: 0, ultimateGain: 0, revealSeconds: 12 + level, weaknessBonusSeconds: 0 };
  }
  if (petId === 'storm-hawk') {
    return { targetIds: nearby.slice(0, 5), damageMultiplier: 1.35 * levelScale, heal: 0, ultimateGain: 18 + level * 2, revealSeconds: 0, weaknessBonusSeconds: 0 };
  }
  if (petId === 'void-cub') {
    return { targetIds: nearby.slice(0, 1), damageMultiplier: 1.8 * levelScale, heal: 0, ultimateGain: 0, revealSeconds: 0, weaknessBonusSeconds: 8 + level };
  }
  return { targetIds: nearby, damageMultiplier: 1.5 * levelScale, heal: 0, ultimateGain: 0, revealSeconds: 0, weaknessBonusSeconds: 0 };
}
```

- [ ] **Step 3: Connect runtime charging**

In the stage update loop:

```ts
r.petCooldown = Math.max(0, r.petCooldown - dt);
if (r.petCooldown <= 0) {
  r.petCharge = Math.min(100, r.petCharge + dt * 7);
}
```

Also add pet charge from combat:

```ts
r.petCharge = Math.min(100, r.petCharge + (critical ? 8 : 4));
```

- [ ] **Step 4: Implement `usePetAbility`**

Add:

```ts
function usePetAbility() {
  const r = runtimeRef.current;
  if (r.petCharge < 100 || r.petCooldown > 0) return setMessage(`${pet.name} is still charging.`, 1.1);
  const level = save.player.petProgress?.[pet.id]?.level ?? 1;
  const result = resolvePetAbility(pet.id, level, {
    player: r.player,
    enemies: r.phase === 'boss' && r.boss ? [r.boss] : r.enemies
  });
  const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;

  result.targetIds.forEach(targetId => {
    const target = targets.find(enemy => enemy.id === targetId);
    if (target) damageEnemy(target, r.player.attack * result.damageMultiplier, true, pet.id === 'storm-hawk' ? 'storm' : pet.id === 'void-cub' ? 'void' : 'fire');
  });

  if (result.heal > 0) {
    r.player.hp = Math.min(r.player.maxHp, r.player.hp + result.heal);
    addFloat(r.player.x, r.player.z, 2.5, `+${result.heal}`, 'heal');
  }

  r.player.ultimate = Math.min(100, r.player.ultimate + result.ultimateGain);
  r.petCharge = 0;
  r.petCooldown = petCooldownSeconds(pet.ability.baseCooldown, level);
  addVfx(r.player.x, r.player.z, pet.ability.color, 'burst', 18);
  setMessage(`${pet.name}: ${pet.ability.name}!`, 1.6);
  audio.playSfx(result.heal > 0 ? 'heal' : 'skill');
}
```

Connect:

```ts
if (key === 'pet') usePetAbility();
```

- [ ] **Step 5: Award pet XP on stage clear**

Before saving stage completion:

```ts
next = awardPetXp(next, pet.id, 35 + r.kills * 2);
```

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/petAbilities.test.ts src/systems/petProgression.test.ts
npm.cmd run build
```

Expected: tests and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/features/adventure/petAbilities.ts src/features/adventure/petAbilities.test.ts src/screens/Stage3DActionScreen.tsx
git commit -m "feat: add active companion abilities"
```

### Task 4: Add Lock-On Targeting

**Files:**
- Create: `src/features/adventure/targeting.ts`
- Create: `src/features/adventure/targeting.test.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`
- Modify: `src/features/adventure/AdventureHud.tsx`

- [ ] **Step 1: Write targeting tests**

Create `src/features/adventure/targeting.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { selectNextTarget } from './targeting';

const enemies = [
  { id: 'behind', x: -2, z: 0, alive: true },
  { id: 'front', x: 4, z: 0, alive: true },
  { id: 'far', x: 30, z: 0, alive: true }
];

describe('selectNextTarget', () => {
  it('selects the nearest living enemy inside lock range', () => {
    expect(selectNextTarget({ x: 0, z: 0 }, enemies, null, 18)).toBe('behind');
  });

  it('cycles to the next candidate', () => {
    expect(selectNextTarget({ x: 0, z: 0 }, enemies, 'behind', 18)).toBe('front');
  });
});
```

- [ ] **Step 2: Implement target selection**

Create `src/features/adventure/targeting.ts`:

```ts
interface Point { x: number; z: number; }
interface Target extends Point { id: string; alive: boolean; }

export function selectNextTarget(player: Point, enemies: Target[], currentId: string | null, maxRange: number) {
  const candidates = enemies
    .filter(enemy => enemy.alive && Math.hypot(enemy.x - player.x, enemy.z - player.z) <= maxRange)
    .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
  if (!candidates.length) return null;
  const currentIndex = candidates.findIndex(enemy => enemy.id === currentId);
  return candidates[(currentIndex + 1) % candidates.length].id;
}
```

- [ ] **Step 3: Connect lock-on**

Add:

```ts
function toggleLockOn() {
  const r = runtimeRef.current;
  const targets = r.phase === 'boss' && r.boss ? [r.boss] : r.enemies;
  r.selectedTargetId = selectNextTarget(r.player, targets, r.selectedTargetId, 18);
  setMessage(r.selectedTargetId ? 'Target locked.' : 'No target in range.', 1);
}
```

Connect:

```ts
if (key === 'lock') toggleLockOn();
```

Clear the target when it dies or leaves 22 units.

- [ ] **Step 4: Populate HUD target data**

Resolve `selectedTarget` from the runtime and pass:

```ts
target: selectedTarget ? {
  name: selectedTarget.name,
  range: dist2(selectedTarget, runtime.player),
  weakness: selectedTarget.weakness,
  resistance: selectedTarget.resistance,
  staggerPercent: selectedTarget.stagger
} : null,
```

Add `stagger` and `maxStagger` to `Fighter3D`, initializing both to `100`.

- [ ] **Step 5: Render a target ring**

In `Enemy3D`, add a `selected` prop and render:

```tsx
{selected && (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .05, 0]}>
    <ringGeometry args={[.9, 1.05, 48]} />
    <meshBasicMaterial color="#ffe08d" transparent opacity={.85} />
  </mesh>
)}
```

- [ ] **Step 6: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/targeting.test.ts
npm.cmd run build
```

Expected: targeting tests and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/features/adventure/targeting.ts src/features/adventure/targeting.test.ts src/screens/Stage3DActionScreen.tsx src/features/adventure/AdventureHud.tsx
git commit -m "feat: add real time target lock"
```

### Task 5: Add Enemy Archetype Behavior And Projectiles

**Files:**
- Create: `src/features/adventure/enemyBehavior.ts`
- Create: `src/features/adventure/enemyBehavior.test.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Write behavior tests**

Create `src/features/adventure/enemyBehavior.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decideEnemyAction } from './enemyBehavior';

describe('decideEnemyAction', () => {
  it('makes casters fire when the player is in ranged distance', () => {
    expect(decideEnemyAction('caster', 7, 0, false)).toBe('projectile');
  });

  it('makes beasts charge from medium distance', () => {
    expect(decideEnemyAction('beast', 5, 0, false)).toBe('charge');
  });

  it('makes golems telegraph at close distance', () => {
    expect(decideEnemyAction('golem', 2, 0, false)).toBe('heavy');
  });
});
```

- [ ] **Step 2: Implement decisions**

Create `src/features/adventure/enemyBehavior.ts`:

```ts
import type { EnemyArchetype } from './runtimeTypes';

export type EnemyAction = 'approach' | 'retreat' | 'melee' | 'heavy' | 'charge' | 'projectile' | 'teleport' | 'cone';

export function decideEnemyAction(kind: EnemyArchetype, distance: number, cooldown: number, rage: boolean): EnemyAction {
  if (cooldown > 0) return distance > 2 ? 'approach' : 'retreat';
  if (kind === 'caster') return distance >= 4 ? 'projectile' : 'retreat';
  if (kind === 'beast') return distance >= 3 ? 'charge' : 'melee';
  if (kind === 'golem') return distance <= 3 ? 'heavy' : 'approach';
  if (kind === 'spirit') return distance >= 5 ? 'teleport' : 'melee';
  if (kind === 'dragon' || kind === 'boss') return rage || distance <= 5 ? 'cone' : 'approach';
  if (kind === 'slime') return distance <= 2.5 ? 'heavy' : 'approach';
  return 'melee';
}
```

- [ ] **Step 3: Replace generic enemy decisions**

In `StageScene`, replace the single chase/attack branch with a switch over `decideEnemyAction`. Add these fields to `Fighter3D` in `runtimeTypes.ts` and initialize them in `makeEnemy`:

```ts
vx: 0,
vz: 0,
facing: 0,
chargeTimer: 0,
heavyTimer: 0,
coneTimer: 0
```

Use this exact branch structure inside the enemy frame loop:

```ts
const angle = Math.atan2(p.z - enemy.z, p.x - enemy.x);
const distance = dist2(enemy, p);
const rage = r.bossPhase === 3;
const action = decideEnemyAction(enemy.kind, distance, enemy.attackCd, rage);
if (action !== 'cone' || enemy.coneTimer === 0) enemy.facing = angle;

if (enemy.chargeTimer > 0) {
  enemy.chargeTimer = Math.max(0, enemy.chargeTimer - dt);
  enemy.x = clamp(enemy.x + enemy.vx * dt, -r.size.halfX, r.size.halfX);
  enemy.z = clamp(enemy.z + enemy.vz * dt, -r.size.halfZ, r.size.halfZ);
  if (distance < 1.8) playerDamage(enemy.attack * 1.25, enemy.x, enemy.z);
  return;
}

if (enemy.heavyTimer > 0) {
  enemy.heavyTimer = Math.max(0, enemy.heavyTimer - dt);
  enemy.telegraph = enemy.heavyTimer;
  if (enemy.heavyTimer === 0 && distance < (enemy.kind === 'boss' ? 3.2 : 2.3)) {
    playerDamage(enemy.attack * 1.65, enemy.x, enemy.z);
    addFloat(enemy.x, enemy.z, 2.6, 'HEAVY', 'coin');
  }
  return;
}

if (enemy.coneTimer > 0) {
  enemy.coneTimer = Math.max(0, enemy.coneTimer - dt);
  enemy.telegraph = enemy.coneTimer;
  const facingDifference = Math.abs(Math.atan2(
    Math.sin(Math.atan2(p.z - enemy.z, p.x - enemy.x) - enemy.facing),
    Math.cos(Math.atan2(p.z - enemy.z, p.x - enemy.x) - enemy.facing)
  ));
  if (enemy.coneTimer === 0 && distance < 5.2 && facingDifference < Math.PI * .35) {
    playerDamage(enemy.attack * 1.45, enemy.x, enemy.z);
    addFloat(enemy.x, enemy.z, 2.8, 'CONE', 'damage');
  }
  return;
}

switch (action) {
  case 'approach':
    enemy.x = clamp(enemy.x + Math.cos(angle) * enemy.speed * dt, -r.size.halfX, r.size.halfX);
    enemy.z = clamp(enemy.z + Math.sin(angle) * enemy.speed * dt, -r.size.halfZ, r.size.halfZ);
    break;
  case 'retreat':
    enemy.x = clamp(enemy.x - Math.cos(angle) * enemy.speed * .7 * dt, -r.size.halfX, r.size.halfX);
    enemy.z = clamp(enemy.z - Math.sin(angle) * enemy.speed * .7 * dt, -r.size.halfZ, r.size.halfZ);
    break;
  case 'melee':
    enemy.attackCd = rng(.85, 1.35);
    playerDamage(enemy.attack, enemy.x, enemy.z);
    addFloat(enemy.x, enemy.z, 2.4, 'HIT', 'damage');
    break;
  case 'heavy':
    enemy.attackCd = 1.35;
    enemy.heavyTimer = .55;
    enemy.telegraph = .55;
    break;
  case 'charge':
    enemy.attackCd = 1.4;
    enemy.chargeTimer = .45;
    enemy.vx = Math.cos(angle) * enemy.speed * 2.2;
    enemy.vz = Math.sin(angle) * enemy.speed * 2.2;
    break;
  case 'projectile':
    enemy.attackCd = 1.6;
    r.projectiles.push({
      id: `projectile-${uid()}`,
      owner: 'enemy',
      x: enemy.x,
      z: enemy.z,
      vx: Math.cos(angle) * 8,
      vz: Math.sin(angle) * 8,
      radius: .35,
      damage: enemy.attack * .85,
      element: enemy.element,
      life: 2.4
    });
    break;
  case 'teleport':
    enemy.attackCd = 1.4;
    enemy.x = clamp(p.x - Math.cos(angle) * 4, -r.size.halfX, r.size.halfX);
    enemy.z = clamp(p.z - Math.sin(angle) * 4, -r.size.halfZ, r.size.halfZ);
    addVfx(enemy.x, enemy.z, elementColor(enemy.element), 'burst', 10);
    break;
  case 'cone':
    enemy.attackCd = 1.7;
    enemy.coneTimer = .65;
    enemy.telegraph = .65;
    break;
}
```

Use the existing `clamp`, `rng`, `uid`, `dist2`, `playerDamage`, `addFloat`, `addVfx`, and `elementColor` helpers.

- [ ] **Step 4: Update projectiles**

Each frame:

```ts
r.projectiles.forEach(projectile => {
  projectile.x += projectile.vx * dt;
  projectile.z += projectile.vz * dt;
  projectile.life -= dt;
  if (projectile.owner === 'enemy' && Math.hypot(projectile.x - p.x, projectile.z - p.z) <= projectile.radius + .55) {
    playerDamage(projectile.damage, projectile.x, projectile.z);
    projectile.life = 0;
  }
});
r.projectiles = r.projectiles.filter(projectile => projectile.life > 0);
```

Render projectiles as emissive spheres with trails.

- [ ] **Step 5: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/enemyBehavior.test.ts
npm.cmd run build
```

Expected: behavior tests and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/features/adventure/enemyBehavior.ts src/features/adventure/enemyBehavior.test.ts src/screens/Stage3DActionScreen.tsx
git commit -m "feat: add enemy archetypes and projectiles"
```

### Task 6: Add Data-Driven Boss Phases

**Files:**
- Create: `src/data/bosses.ts`
- Create: `src/features/adventure/bossPhases.ts`
- Create: `src/features/adventure/bossPhases.test.ts`
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Define boss configuration**

Create `src/data/bosses.ts`:

```ts
export interface BossConfig {
  bossId: string;
  phaseTwoAt: number;
  rageAt?: number;
  phaseTwoMessage: string;
  rageMessage?: string;
  phaseTwoSpeedMultiplier: number;
  phaseTwoAttackMultiplier: number;
  hazard: 'none' | 'fire' | 'rift' | 'storm' | 'ice';
}

export const BOSS_CONFIGS: Record<string, BossConfig> = {
  'giant-slime': { bossId: 'giant-slime', phaseTwoAt: .5, phaseTwoMessage: 'The Giant Slime splits its rhythm!', phaseTwoSpeedMultiplier: 1.2, phaseTwoAttackMultiplier: 1.18, hazard: 'none' },
  'forest-troll': { bossId: 'forest-troll', phaseTwoAt: .55, rageAt: .25, phaseTwoMessage: 'The Forest Troll uproots the arena!', rageMessage: 'The Forest Troll enters a rage!', phaseTwoSpeedMultiplier: 1.18, phaseTwoAttackMultiplier: 1.25, hazard: 'none' },
  'lava-dragon': { bossId: 'lava-dragon', phaseTwoAt: .6, rageAt: .25, phaseTwoMessage: 'Lava floods the arena!', rageMessage: 'The Lava Dragon ignites!', phaseTwoSpeedMultiplier: 1.22, phaseTwoAttackMultiplier: 1.35, hazard: 'fire' },
  'storm-titan': { bossId: 'storm-titan', phaseTwoAt: .6, rageAt: .25, phaseTwoMessage: 'The storm intensifies!', rageMessage: 'The Titan overloads!', phaseTwoSpeedMultiplier: 1.3, phaseTwoAttackMultiplier: 1.28, hazard: 'storm' },
  'void-librarian': { bossId: 'void-librarian', phaseTwoAt: .58, rageAt: .25, phaseTwoMessage: 'Forbidden pages open!', rageMessage: 'The library collapses into the void!', phaseTwoSpeedMultiplier: 1.25, phaseTwoAttackMultiplier: 1.32, hazard: 'rift' },
  'frost-kraken': { bossId: 'frost-kraken', phaseTwoAt: .6, rageAt: .25, phaseTwoMessage: 'The harbor freezes solid!', rageMessage: 'The Kraken shatters the ice!', phaseTwoSpeedMultiplier: 1.2, phaseTwoAttackMultiplier: 1.34, hazard: 'ice' }
};

export function getBossConfig(bossId: string): BossConfig {
  return BOSS_CONFIGS[bossId] ?? {
    bossId,
    phaseTwoAt: .55,
    rageAt: .25,
    phaseTwoMessage: 'The boss changes tactics!',
    rageMessage: 'The boss enters a final rage!',
    phaseTwoSpeedMultiplier: 1.2,
    phaseTwoAttackMultiplier: 1.25,
    hazard: 'rift'
  };
}
```

- [ ] **Step 2: Write phase tests**

Create `src/features/adventure/bossPhases.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveBossPhase } from './bossPhases';
import { getBossConfig } from '../../data/bosses';

describe('resolveBossPhase', () => {
  const config = getBossConfig('lava-dragon');
  it('returns phase one above the threshold', () => expect(resolveBossPhase(.8, config)).toBe(1));
  it('returns phase two below sixty percent', () => expect(resolveBossPhase(.5, config)).toBe(2));
  it('returns rage phase below twenty five percent', () => expect(resolveBossPhase(.2, config)).toBe(3));
});
```

- [ ] **Step 3: Implement phase resolution**

Create `src/features/adventure/bossPhases.ts`:

```ts
import type { BossConfig } from '../../data/bosses';

export function resolveBossPhase(hpRatio: number, config: BossConfig): 1 | 2 | 3 {
  if (config.rageAt !== undefined && hpRatio <= config.rageAt) return 3;
  if (hpRatio <= config.phaseTwoAt) return 2;
  return 1;
}
```

- [ ] **Step 4: Integrate phase transitions**

During boss updates:

```ts
const config = getBossConfig(r.boss.sourceId);
const nextPhase = resolveBossPhase(r.boss.hp / r.boss.maxHp, config);
if (nextPhase !== r.bossPhase) {
  r.bossPhase = nextPhase;
  setMessage(nextPhase === 2 ? config.phaseTwoMessage : config.rageMessage ?? 'Final rage!', 2.4);
  r.cameraShake = reduceMotion ? .08 : .45;
  addVfx(r.boss.x, r.boss.z, elementColor(r.boss.element), 'burst', nextPhase === 3 ? 28 : 18);
}
```

Apply phase multipliers to speed and attack without compounding:

```ts
const phaseSpeed = r.bossPhase >= 2 ? config.phaseTwoSpeedMultiplier : 1;
const phaseAttack = r.bossPhase >= 2 ? config.phaseTwoAttackMultiplier : 1;
```

Spawn a bounded arena hazard every 5 seconds when `config.hazard !== 'none'`.

- [ ] **Step 5: Run tests and build**

```powershell
npm.cmd run test:run -- src/features/adventure/bossPhases.test.ts
npm.cmd run build
```

Expected: phase tests and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/data/bosses.ts src/features/adventure/bossPhases.ts src/features/adventure/bossPhases.test.ts src/screens/Stage3DActionScreen.tsx
git commit -m "feat: add multi phase boss framework"
```

### Task 7: Combat Integration Verification

**Files:**
- Modify: `src/screens/Stage3DActionScreen.tsx`

- [ ] **Step 1: Bound transient effects**

After adding effects:

```ts
r.vfx = r.vfx.slice(-120);
r.floats = r.floats.slice(-40);
r.projectiles = r.projectiles.slice(-36);
```

Use lower caps for `graphicsQuality === 'low'`:

```ts
const caps = save.settings.graphicsQuality === 'low'
  ? { vfx: 48, floats: 18, projectiles: 18 }
  : save.settings.graphicsQuality === 'high'
    ? { vfx: 160, floats: 50, projectiles: 44 }
    : { vfx: 96, floats: 32, projectiles: 30 };
```

- [ ] **Step 2: Run the full automated suite**

```powershell
npm.cmd run test:run
npm.cmd run build
```

Expected: all tests and build pass.

- [ ] **Step 3: Browser combat pass**

Verify:

1. pet charge reaches ready state and the active ability works
2. pet XP is granted exactly once per stage clear
3. lock-on cycles and clears after target death
4. caster projectiles damage the player
5. beast, golem, spirit, and dragon behavior differ visibly
6. boss phase two and rage messages trigger once
7. reduced motion limits shake and burst intensity
8. low graphics limits effects without hiding telegraphs

- [ ] **Step 4: Commit**

```powershell
git add src/screens/Stage3DActionScreen.tsx
git commit -m "fix: bound combat effects and finalize integration"
```
