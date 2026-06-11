# Mythic Quest — Expanded Portfolio Upgrade Roadmap

## Implemented in this build

1. Real GLB/GLTF model support path in `public/models/` with procedural fallback models so the game still runs on phones.
2. Cinematic boss intro camera paths before each boss arena fight.
3. Animated skill VFX, slash arcs, burst particles, hit flashes, screen shake, and reduced-motion support.
4. Enemy elemental weaknesses and resistance labels.
5. Enemy variants: Normal, Elite, Swift, and Armored.
6. Crafting and material farming through monster drops, crates, and shop crafting recipes.
7. Cloud leaderboard support for fastest stage clears.
8. Photo mode for GitHub screenshots and portfolio previews.
9. Touch tutorial on first launch.
10. Difficulty options: Normal, Hard, Nightmare.
11. Accessibility settings: reduced motion, bigger UI, haptics toggle, colorblind bars, and damage-number toggle.
12. More monsters per stage: every area now has 5 normal enemy types plus a boss.
13. Three new late-game stages: Frost Harbor, Sunken Forge, and Astral Throne.
14. Companion pet system with unlockable pets and passive bonuses.
15. Artifact system with permanent upgrade levels and account power progression.
16. Expanded shop tabs: Potions, Weapons, Armor, Heroes, Pets, Artifacts, Upgrade, Craft, and Sell.
17. More craftable endgame gear including Glacier Halberd, Tidebreaker Armor, Starforged Blade, and Astral Plate.
18. Daily dungeon rotation data system.
19. Weekly challenge goals data system.
20. Local telemetry profile stats: total kills, defeats, coins earned, potions used, and play time.
21. NPC/guild affinity progression values for future relationship rewards.
22. Additional unlockable heroes: Mira the Moon Ranger, Vex the Void Duelist, and Terra the Beastmaster.
23. Mobile graphics quality setting: Low, Medium, High.
24. Camera assist and auto-potion assist settings.
25. Endgame achievements for pets, materials, Nightmare readiness, and Astral Throne clear.

## More recommended improvements to make it stronger

1. Replace procedural heroes with optimized GLB models using Mixamo animations: idle, run, jump, dash, slash, cast, hurt, victory.
2. Add a downloadable asset-pack workflow so models can be swapped without editing code.
3. Add full NPC dialogue trees with relationship levels and gift preferences.
4. Add a bounty board in the 3D village for daily/weekly challenge entry.
5. Add companion pet animations and pet-specific ultimate assist moves.
6. Add artifact set bonuses when multiple artifacts reach certain levels.
7. Add boss practice mode with no save rewards for testing mechanics.
8. Add challenge room mutators such as low gravity, poison fog, healing ban, elite swarm, and timed gates.
9. Add cloud achievements synced per user account.
10. Add guild audit logs for purchases, upgrades, crafting, and leaderboard submissions.
11. Add more stage props: destructible barrels, traps, bridges, doors, switches, and moving platforms.
12. Add minimap markers for enemies, chests, boss gates, NPCs, and daily challenge portals.
13. Add performance auto-detection for old Android phones.
14. Add controller remapping UI for keyboard/gamepad players.
15. Add a portfolio landing page before the game with feature cards, screenshots, tech stack, and GitHub link.
16. Add screenshot export button in Photo Mode.
17. Add save import/export JSON for debugging internship demos.
18. Add Firebase Cloud Functions for anti-cheat leaderboard validation.
19. Add seasonal event areas such as Harvest Rift, Snowfall Gate, and Anniversary Arena.
20. Add multiplayer ghost runs where the player races a saved leaderboard replay.

## Added in latest realistic UI/VFX build

- Separated HUD/control zones to prevent overlap.
- Hero + pet companion status panel.
- Enemy/boss radar status panel.
- Improved action buttons with keyboard hints.
- Dungeon architecture, torches, banners, and stage lighting.
- Hero cape, aura, dash trail, and shield VFX.
- Pet orbit glow and point-light effects.
- Enemy elemental aura rings and boss horn/rage telegraph.
- More realistic shop/card spacing.

## Additional recommended future upgrades

1. Use GLB characters with skeletal animation clips.
2. Add room-by-room dungeon generation.
3. Add loot rarity beams and animated reward chest opening.
4. Add boss attack pattern libraries.
5. Add pet active skills and pet evolution.
6. Add guild reputation shop discounts.
7. Add weapon element infusion.
8. Add dungeon minimap and fog-of-war.
9. Add optional lock-on targeting for mobile.
10. Add performance profiles for low-end phones.
