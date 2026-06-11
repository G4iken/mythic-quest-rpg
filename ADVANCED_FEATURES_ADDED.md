# Advanced Features Added

This build focuses on making the game feel more like a polished 3D dungeon RPG while keeping the working WebGL-ready base.

## Visual / UI Upgrades

- Realistic 3D action HUD with separated zones for hero, pet, stage info, boss bar, objective, joystick, and action buttons.
- New companion panel showing the active hero and active pet passive.
- New radar/status panel showing monsters remaining or boss weakness/resistance.
- Better action button layout with visible keyboard hints.
- Smaller landscape-safe layout so buttons do not overlap on web preview or Android landscape.
- Realistic shop/card styling with better text wrapping and fixed button placement.

## 3D Scene Upgrades

- Added dungeon architecture inside every 3D stage:
  - side walls
  - stone floor strips
  - torches
  - glowing banners
  - environmental lighting
- Improved hero presentation:
  - glowing hero ring
  - cape plane
  - dash trail
  - invulnerability shield
- Improved pet visuals:
  - orbiting ring
  - glowing point light
  - companion shadow ring
- Improved enemy/boss visuals:
  - elemental aura ring
  - boss horns
  - boss rage telegraph ring
  - visible weakness/resistance labels
- Improved skill feedback:
  - stronger ultimate burst
  - skill ring effects
  - damage float text
  - screen shake support

## Gameplay Features Preserved

- Firebase Authentication and Firestore cloud saves.
- Local saves and guest mode.
- 3D village hub.
- 3D stage action gameplay.
- Expanded monsters and bosses.
- Heroes, pets, artifacts, crafting, upgrades, shop, difficulty, accessibility, photo mode, and leaderboard hooks.

## More Recommended Improvements To Add Later

1. Replace capsule/primitive characters with real GLB models using Blender or Mixamo animations.
2. Add animation states: idle, walk, sprint, slash, hit, death, skill, and victory pose.
3. Add real collision walls and blocked paths using a small physics system or navmesh-like grid.
4. Add enemy projectile patterns for mages and bosses.
5. Add boss phase cutscenes with camera rails and dialogue.
6. Add dungeon minimap with rooms, boss gate, chests, and player marker.
7. Add loot rarity beams for rare/epic/legendary drops.
8. Add a blacksmith upgrade animation with sparks and hammer hits.
9. Add pet active abilities instead of only passive bonuses.
10. Add story dialogue choices and NPC affinity rewards.
11. Add daily login calendar with 7-day streak rewards.
12. Add save backup export/import for portfolio demos.
13. Add performance settings for low-end Android phones: low shadows, low particles, fixed 30 FPS.
14. Add controller support UI icons for Xbox/PlayStation gamepads.
15. Add accessibility presets: large text, high contrast, reduced particles, no camera shake.
