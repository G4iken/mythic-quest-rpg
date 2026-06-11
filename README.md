# Mythic Quest — Ethereal Gate 3D Village + 2.5D Action RPG

A no-Unity mobile/web RPG built with Vite, React, TypeScript, React Three Fiber, Three.js, Firebase, and Capacitor.

## Major features

- Firebase login/register and guest offline mode
- Local saves and Firebase cloud saves
- 3D Green Village hub with joystick/WASD roaming
- 3D NPCs for quests, shop, equipment, skills, and profile records
- 3D portals for all stages
- 2.5D side-scrolling action stages
- Jump, dash, slash, skill, ultimate, and potion controls
- Enemies chase and attack the player
- Boss gate opens after all monsters are defeated
- Boss phase with cutscene-style warning and heavy attack telegraph
- Stage clear grade and 3-star objectives
- Daily login reward and streak
- Achievement badges
- Unlockable heroes
- Expanded shop with potions, weapons, armor, heroes, sell, gear upgrades, and build reforge
- Skill tree paths: Blade, Magic, Guardian
- Haptic feedback where supported
- Basic web gamepad support
- Android landscape setup via Capacitor

## Run web

```bash
npm install
npm run dev
```

## Build web

```bash
npm run build
```

## Android / Capacitor

First time only:

```bash
npm run android:setup
```

After code changes:

```bash
npm run build
npx cap sync android
npx cap open android
```

Then select your phone/emulator in Android Studio and press Run.

## Firebase

Copy `.env.example` to `.env.local` and paste your Firebase web config.

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Firestore rules

Use `firestore.rules` in Firebase Console to protect cloud saves per account.

## Main gameplay flow

1. Login/Register or play guest.
2. Choose or create a save slot.
3. Spawn in the 3D village hub.
4. Walk to NPCs to upgrade, buy, check quests, or train skills.
5. Walk to a 3D portal and enter the 2.5D stage.
6. Defeat monsters, collect pickups, avoid hazards, enter boss gate.
7. Defeat boss, collect rewards, return to village.

## Full 3D Upgrade

This version converts the game flow into a full 3D action RPG experience:

- 3D Green Village hub with roaming, NPCs, and portals.
- Full 3D combat stages instead of 2.5D stages.
- 3D enemies chase, attack, telegraph boss hits, and react to damage.
- 3D player slash, dash, skill, ultimate, jump, pickups, crates, hazards, and boss gate.
- Stage clear returns the player to the 3D village.
- Shop UI and small-screen layout were tightened to prevent overlapping buttons/text.

Web test:

```bash
npm install
npm run dev
```

Android update:

```bash
npm run build
npx cap sync android
npx cap open android
```


## Latest portfolio systems

This build includes the 3D village, full 3D action stages, boss intro camera paths, elemental enemy weaknesses, crafting/material farming, cloud leaderboard support, photo mode, first-launch tutorial, difficulty settings, and accessibility options.

To enable cloud leaderboards, publish the included `firestore.rules` file in Firebase Console. Logged-in users can submit leaderboard records, while guest players keep local records only.

For real character models, place optimized `.glb` files in `public/models/` and follow `public/models/README.md`. The procedural fallback models remain so the game still works without external assets.

## Expanded content update

This build adds a larger portfolio-grade feature set: 13 total stages, 5 normal enemy types per stage, 3 new late-game regions, pets, artifacts, daily dungeon data, weekly challenge data, expanded crafting, extra heroes, more materials, telemetry stats, and mobile graphics/accessibility settings.

New late-game progression:

1. Frost Harbor — ice pirate / kraken arc
2. Sunken Forge — underwater forge arc
3. Astral Throne — final cosmic throne arc

New shop systems:

- Pets tab for companion unlocks and passive bonuses
- Artifacts tab for permanent account upgrade levels
- Craft tab for endgame gear and potion recipes

The game remains Firebase-ready. Copy your `.env.local` from the older project into this new folder before testing cloud save or leaderboard features.

## Latest realistic UI + VFX upgrade

This version includes a polished 3D dungeon RPG presentation pass:

- Separated HUD, objective, companion, radar, joystick, and action-button zones.
- New hero + pet companion status panel.
- New enemy/boss radar panel.
- Dungeon architecture props: walls, torches, banners, floor strips, and stronger lighting.
- Hero cape, aura ring, dash trail, slash arc, shield, and ultimate VFX.
- Pet orbit glow with point-light effects.
- Enemy/boss elemental aura, boss horns, rage telegraph, weakness/resistance labels.
- Shop/card overlap fixes for mobile landscape and web preview.
- Build-tested with `npm run build`.

If the 3D scene is blank, check `chrome://gpu` and make sure WebGL/WebGL2 are enabled.
