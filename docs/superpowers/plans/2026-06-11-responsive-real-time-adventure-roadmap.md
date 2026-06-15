# Responsive Real-Time Adventure Roadmap

The approved design is implemented through four ordered plans. Each plan leaves the game buildable and testable.

1. `2026-06-11-adventure-foundation-routing.md`
   - Add automated test tooling.
   - normalize legacy saves.
   - route every area into real-time 3D gameplay.
   - remove the obsolete turn-based battle path.

2. `2026-06-11-responsive-tactical-ui.md`
   - Generate the approved portrait/badge asset set.
   - add the responsive tactical adventure HUD.
   - replace overlapping shell navigation.
   - support desktop, tablet, mobile landscape, and mobile portrait.

3. `2026-06-11-real-time-combat-companions.md`
   - extract testable combat runtime modules.
   - add active pet abilities and progression.
   - add lock-on, enemy archetypes, projectiles, boss phases, and combat VFX.

4. `2026-06-11-exploration-content-qa.md`
   - add reusable area objectives, secrets, minimap markers, and loot beams.
   - cap effects by graphics quality.
   - clean visible encoding issues.
   - complete responsive, accessibility, build, and browser verification.

## Execution Gate

Run the plans in order. Do not begin a subsequent plan until the earlier plan's full test and build gates pass. Use a `codex/` feature branch or isolated worktree when execution starts.
