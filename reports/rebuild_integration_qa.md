# REBUILD integration and QA report

## Audit summary

- **Module 1 – Clean Water:** Strongest visual baseline. Preserved its sedimentation, filter-order, boiling, Rio dialogue, star feedback and restart flow.
- **Module 2 – Power for Palampur:** Preserved circuit building, current-flow activity, conductor sorting, check-up and restart flow. It shared the original component language but had a simpler skin; the shared navigation now makes its place in the journey clear.
- **Module 3 – Fair Rations:** Preserved ration sharing, fraction balance, five-day planning, bonus coin loop, check-up and restart flow.

## Integrated changes

- Added a responsive **Module Map** at `modules/index.html` with the three learning chapters.
- Imported the supplied original module files unchanged apart from targeted consistency/integration patches.
- Added one shared navigation shell: **Module map** is available in every module, and a contextual next-module link appears after a recognised completion screen.
- Unified the grade label to **STEM · Class 6** across all three modules.
- Kept Fredoka/Nunito typography, rounded cream panels, wood outlines, green action buttons and gold feedback as the common visual identity.
- Replaced deprecated Three.js soft-shadow setup in Modules 2 and 3 with the supported `PCFShadowMap` flag.
- Added an entry-point link from the existing REBUILD sphere screen to the Module Map.

## Browser checks performed

| Area | Result |
|---|---|
| Module 1 functionality | Pass — loaded, title flow started, HUD and water-yard scene rendered |
| Module 2 functionality | Pass — loaded, title flow started, HUD and power scene rendered |
| Module 3 functionality | Pass — loaded, title flow started, HUD, Rio dialogue and ration scene rendered |
| Visual consistency | Pass — shared REBUILD map, typography, Class 6 label and persistent navigation |
| Navigation | Pass — Module Map launched each module and every module returned to the map |
| Gameplay interactions | Not tested end-to-end — all supplied puzzle mechanics were deliberately preserved |
| Responsive design | Not tested on physical device viewports — the new map uses a mobile one-column breakpoint |
| Console errors | Pass for tested launch flows — no new errors/warnings after the shadow compatibility fix |
| Cross-module integration | Pass — local relative paths and return navigation verified |
| Regression testing | Not tested end-to-end — full puzzle completion/restart loops remain to be play-tested |

## Remaining QA recommendation

Complete each puzzle once manually on desktop and touch devices before release. This is the appropriate final check for the supplied games' long interactive lessons, drag targets and completion-state progression.
