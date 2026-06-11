# Mythic Quest Responsive Real-Time Adventure Upgrade

## Goal

Turn Mythic Quest into a unified real-time 3D adventure RPG for web and mobile. Exploration, quests, enemies, pets, loot, secrets, and bosses must happen in the same playable world. The UI must use the approved tactical HUD direction while preserving the center of the playfield and preventing controls or status panels from overlapping at any supported viewport.

## Product Direction

The game will no longer present a separate turn-based battle mode. The primary loop is:

1. Enter an explorable area.
2. Follow a main objective or optional quest.
3. Discover enemies, materials, chests, hazards, and secrets.
4. Fight enemies with real-time movement and abilities.
5. Use the active pet ability and exploit elemental weaknesses.
6. Complete area objectives to unlock the boss encounter.
7. Defeat a multi-phase boss and collect unique rewards.
8. Return to the village to equip, craft, upgrade, and choose the next destination.

Existing save slots, Firebase cloud saves, heroes, inventory, equipment, crafting, artifacts, quests, shops, difficulty, accessibility, photo mode, and leaderboard systems remain part of the game.

## Navigation And Combat Consolidation

- Remove the turn-based battle screen from normal navigation and area entry.
- Route all normal and boss encounters into `Stage3DActionScreen`.
- Update map and village actions so they launch the correct real-time area and objective.
- Remove obsolete turn-based state and callbacks from `App.tsx` after no remaining screen depends on them.
- Preserve old save compatibility. Existing area progress, defeated bosses, inventory, and quest progress must load without migration loss.
- Remove `BattleScreen`, `BattleStage3D`, `battleEngine`, turn-based state, and turn-based types after all references are replaced and the production build passes.

## Responsive Tactical HUD

### Shared Rules

- The playfield center and lower-middle must remain clear.
- Every persistent HUD element owns a reserved layout zone.
- No panel may occupy the joystick or action-control zones.
- HUD positioning must use CSS grid/flex layout, safe-area insets, `clamp()`, and bounded dimensions instead of accumulating viewport-specific absolute overrides.
- Primary touch targets must be at least 48 by 48 CSS pixels.
- Text must truncate or collapse before controls overlap.
- Cooldowns, disabled states, selected targets, and press feedback must remain visible without relying only on color.

### Desktop And Tablet Landscape

- Top-left: hero and active pet party panel with HP, mana, pet assist charge, level, and elemental stance.
- Top-center: boss bar when a boss is active; otherwise a compact area status strip.
- Top-right: minimap and active objective tracker.
- Right-middle: contextual target information only while lock-on is active.
- Bottom-left: movement joystick on touch devices; keyboard hints replace it on pointer/keyboard devices.
- Bottom-center: concise objective, combo, and elapsed-time strip.
- Bottom-right: a three-column action grid for attack, dash, jump, skill, pet, potion, lock-on, ultimate, and more.

### Mobile Landscape

- Use the same five reserved zones with reduced typography and shorter labels.
- Collapse long quest details to one objective line.
- Hide secondary target details before reducing primary control size.
- Keep six primary combat actions visible.
- Put lower-priority actions inside a `More` control or contextual radial panel.
- At very short heights, hide descriptive sublabels and optional statistics, not the health bars or primary actions.

### Mobile Portrait

- Use a purpose-built narrow layout rather than scaling the desktop HUD.
- Hero and pet status share a compact top row.
- Boss health uses a full-width bar below the party row.
- The minimap becomes a small circular control and the active quest becomes a separate one-line chip.
- The bottom area is split between movement on the left and six primary actions on the right.
- Lock-on, potion, settings, and other secondary actions move under `More`.
- Respect top, bottom, left, and right safe-area insets.

### Menus And Non-Combat Screens

- Replace the current long bottom navigation row with a responsive navigation system:
  - Desktop: compact side rail or bounded bottom bar.
  - Mobile landscape: horizontally scrollable bar with fixed minimum button widths.
  - Mobile portrait: five primary destinations plus a `More` drawer.
- Inventory, equipment, shop, pets, quests, and settings must use responsive grids with intrinsic minimum widths.
- Buttons must wrap text and remain inside their parent cards.
- Sticky tabs must not cover headings or first-row content.

## Character Presentation

- Upgrade the hero status area with a framed portrait, class/role label, level, HP, mana, and current element.
- Add clearer combat feedback to the 3D hero:
  - directional slash arcs
  - dash trail
  - skill aura
  - ultimate charge and release effect
  - hit flash and brief invulnerability shield
  - low-health screen-edge warning
- Use the existing procedural models as reliable fallbacks. The design must not require external GLB files to function.
- Keep graphics quality settings capable of reducing shadows, lights, and particles on mobile.

## Pet System Upgrade

Pets become active combat companions rather than passive stat icons.

Each pet receives:

- an assist charge meter
- one active ability
- a distinct color and VFX language
- an in-world attack or support animation
- an ability cooldown
- a clear ready state in the HUD
- levels 1 through 10, with pet experience awarded from completed stages and successful active assists

Initial abilities:

- Ember Sprite: fire burst that damages nearby enemies.
- Mender Fairy: healing pulse and short regeneration buff.
- Gold Mimic: loot magnet and temporary treasure reveal.
- Storm Hawk: chain lightning and faster ultimate gain.
- Void Cub: void strike that increases weakness damage.

Pet abilities must use the existing save model with backward-compatible optional fields for pet level and experience. Pet levels improve ability strength and cooldown at fixed data-defined milestones; missing legacy values default to level 1 and zero experience.

## Enemy Improvements

- Give enemy archetypes distinct silhouettes, movement, and attack behavior:
  - slimes: leap or body-slam
  - beasts: charge and retreat
  - casters: ranged projectile and reposition
  - golems: slow armored attacks and stagger windows
  - spirits: teleport or phase movement
  - dragons: sweeping cone attacks
- Preserve normal, swift, armored, and elite variants while making their differences visible.
- Add lock-on support with a target ring, target card, range, weakness, resistance, and armor/stagger state.
- Telegraph heavy attacks with ground shapes and timing cues.
- Add hit sparks, elemental bursts, damage numbers, critical feedback, weakness/resistance labels, death dissolves, and rarity-colored loot beams.
- Reduce particle density and light count under reduced-motion or low-quality settings.

## Boss Improvements

Boss encounters use an intro, multiple phases, and arena mechanics.

- Phase 1 teaches the boss's main pattern.
- Phase 2 begins at a configured health threshold and adds speed, attacks, or hazards.
- Bosses marked with a rage configuration enter a final rage state at 25% health.
- Boss attacks must have readable telegraphs and dodge windows.
- Boss HUD shows name, phase, element, weakness, rage or stagger state, and health.
- Camera movement, screen shake, sound, and particles reinforce phase changes while respecting accessibility settings.
- Boss rewards include guaranteed thematic loot plus a chance at rare materials.
- New boss behavior should be data-driven enough to vary by boss archetype without placing all logic in one render function.

## Exploration, Quests, And Content

- Add compact in-world objectives for combat, collection, discovery, and interaction.
- Add optional area secrets:
  - hidden chests
  - breakable containers
  - lore markers
  - elite encounters
  - timed challenge shrines
- Add a minimap with player, enemies, boss gate, objectives, chests, and discoveries.
- Hide undiscovered secrets until the player approaches them or uses a reveal ability.
- Add four reusable area objective types: break seals, activate switches, defend a point, and collect keys. Each area receives one objective type from area data, while hidden chests and elite encounters remain optional.
- Keep quest updates synchronized with the existing quest engine and save service.

## Visual Direction

- Use dark fantasy glass-and-metal HUD surfaces with warm gold borders, restrained blur, and area-specific elemental accents.
- Make UI panels feel embedded in the game world rather than like a generic dashboard.
- Reserve strong glow, shake, and large particles for danger, rewards, pet assists, skills, and boss transitions.
- Use consistent panel radii, border strength, typography, spacing, and button states through shared CSS variables and component classes.
- Correct currently corrupted visible icon/text encoding when touching affected UI.

## Architecture

### Component Boundaries

- `Stage3DActionScreen`: orchestration, runtime state, save integration, and phase transitions.
- `AdventureHud`: responsive HUD composition and breakpoint variants.
- `PartyStatus`: hero and pet status.
- `BossStatus`: boss health, phase, and warnings.
- `QuestTracker`: objective and discovery progress.
- `AdventureMinimap`: normalized markers rendered from runtime positions.
- `ActionControls`: input actions, cooldowns, keyboard labels, and mobile `More` state.
- `TargetStatus`: lock-on target information.
- `PetCompanion`: pet movement, active ability animation, and ability events.
- Enemy and boss behavior helpers: movement, telegraphs, attacks, projectiles, and phase configuration.
- VFX helpers: pooled or bounded transient effects with graphics-quality limits.

`Stage3DActionScreen.tsx` is currently too large and mixes gameplay, rendering, input, HUD, and effects. The implementation should extract focused modules only where they directly support this upgrade.

### Data Flow

- React state owns menus, pause state, selected target, responsive HUD state, and save-facing progression.
- The runtime ref owns high-frequency combat positions, cooldowns, particles, enemies, and hazards.
- HUD receives a small serializable snapshot derived from the runtime at a controlled update rate.
- Input maps keyboard and touch actions to one shared command interface. The interface remains controller-compatible, but controller support is outside this delivery.
- Save updates occur at clear checkpoints, rewards, settings changes, and explicit player actions rather than every frame.

## Error Handling And Fallbacks

- If WebGL fails, show a readable error surface with return and retry actions.
- If optional assets fail to load, use procedural models and effects.
- If cloud saving fails, preserve local progress and notify the player.
- Clamp invalid or missing legacy save fields to safe defaults.
- Prevent duplicate reward grants if a clear transition is triggered more than once.
- Pause combat input while menus, guides, or overlays are open.

## Performance

- Cap active enemies, floating text, particles, point lights, and simultaneous projectiles.
- Reuse materials and geometry where practical.
- Keep HUD updates below the render-frame rate.
- Use graphics quality to control device pixel ratio, shadow resolution, particle count, and dynamic lights.
- Test on short mobile landscape dimensions, portrait phones, tablets, and common desktop sizes.

## Verification

### Functional

- No turn-based battle route remains reachable.
- Every unlocked area launches real-time gameplay.
- Main objective, enemies, pet ability, boss gate, boss phases, rewards, quest progress, and save persistence work.
- Lock-on, potion, skill, pet ability, ultimate, pause, and `More` controls update real game state.
- Legacy saves load without losing progression.

### Responsive

- Verify at 360x800, 390x844, 412x915, 800x360, 844x390, 915x412, 1024x768, 1280x720, 1366x768, and 1920x1080.
- No button, tracker, minimap, boss bar, objective, joystick, toast, or safe area overlaps another control.
- Primary mobile actions remain at least 48px.
- No horizontal page overflow appears.
- Text remains readable and truncates intentionally.

### Visual And Accessibility

- Capture representative screenshots for exploration, crowded combat, pet ability, boss phase transition, loot drop, desktop, mobile landscape, and mobile portrait.
- Confirm reduced motion lowers non-essential animation and removes aggressive camera motion.
- Confirm colorblind bars include patterns or symbols.
- Confirm larger UI mode does not reintroduce overlap.
- Confirm low graphics mode preserves combat readability.

### Build And Regression

- Run TypeScript and Vite production builds.
- Exercise local save, guest mode, area entry, reward collection, inventory, pet selection, crafting, settings, and return-to-village flows.
- Check browser console for React, WebGL, and asset errors.

## Delivery Scope

The implementation includes:

- unified real-time adventure routing
- responsive tactical HUD for web and mobile
- overlap fixes across game and menu controls
- active pet abilities and progression scaffolding
- improved enemy behaviors and combat feedback
- multi-phase boss framework
- minimap, lock-on, telegraphs, and loot effects
- four reusable exploration objective types, hidden chests, and elite encounters
- responsive and accessibility verification

External production GLB models, full voice acting, multiplayer, procedural dungeon generation, and a complete narrative rewrite are outside this upgrade. The code will preserve clear extension points for those additions.
