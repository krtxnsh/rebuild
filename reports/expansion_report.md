# Village Expansion v2: Completion Report

The approved three-building scene has been expanded **incrementally**:
- eight distinct homes
- a foreground farm and a small community garden
- village-life details
- livelier water, all-green tree foliage, and a cheerful sky and daylight

The approved buildings were not rebuilt or moved. No initialisation script was run.

No screenshot was attached to the expansion directive. The approved hero render (`renders/village_hero.png`, the v1 `CAM_01_Village_Hero`) was used as the composition reference.

## Versions and files
| Item | v1 (approved, preserved) | v2 (this expansion) |
|---|---|---|
| Blender project | `blender/village_master.blend` (unchanged), backup `blender/village_master_v1_approved.blend` | `blender/village_master_v2_expansion.blend` |
| Per-building .blend | `blender/*.blend` + `*_v1_approved.blend` copies | unchanged (geometry identical) |
| Exports | `exports/v1_approved/*.glb` | `exports/village_complete.glb`, `water_treatment.glb`, `electricity_room.glb`, `ration_shop.glb` (re-exported for the upgraded water material), **new** `residential_kit.glb` |
| Metadata | `metadata/v1_approved/*.json` | `metadata/scene_manifest.json` (schema 2.0.0, new `expansion` + updated `navigation`), `interaction_points.json`, `collision_manifest.json` |
| Renders | `renders/*.png` | `renders/v2/village_hero_v2.png` (clean hero), `farm_view_v2.png`, `player_height_sky_v2.png`, `ground_player_v2.png`, `village_topdown_v2.png` |
| Scripts | unchanged v1 modules | **new** `expansion.py`, `residential.py`, `farm.py`, `village_details.py`, `foliage.py`, `water_fx.py`, `sky.py`; extended `layout.py`, `export_assets.py`, `build_village.py`; runtime `preview/index.html` |

## Preserved content (verified)
These checks compare vertex checksums against `reports/expansion_baseline.json`. Full results are in `reports/expansion_preservation_check.json`.
- **Educational buildings:** all three root transforms are identical (matrix compare). Descendant counts are identical: Water 68, Electricity 67, Ration 52. **0 building meshes changed.** Interiors, doors, pivots, interaction IDs and metadata are untouched.
- **Bridges:** all three are geometry- and transform-identical. The river route is unchanged.
- **Mesh objects:** 81 of the 88 v1 mesh objects are vertex-identical. The 7 that changed are listed in the next section, each with its reason.
- **Runtime behaviour matches v1:**
  - load: 0 errors
  - glTF landmarks: exact for all 3 building roots
  - door swings: 100° for the doors that start closed
  - valve rotates; scale beam tilts −0.18 rad; all 9 bulbs toggle
  - roof cutaway works on all 3 buildings; water material replacement works
  - v1 capsule routes still collision-free: exterior 202/202 samples, interiors 100/100

## Targeted edits to v1 content (authorised scope)
| Object | Change | Reason |
|---|---|---|
| `VEG_Trees_*` (4 chunks) | All 25 deciduous canopies recoloured to a cohesive green palette (fresh / medium / deep / cool with light top highlights, chosen per tree). Conifers keep their dark greens; trunks keep wood colours. | Green-foliage requirement. Audit: **0 of 442 canopy components** have red, orange, yellow or brown hues. |
| `VEG_Trees_West` | One tree (with its collider) moved 3.4 m, from (−21, 24) to (−24.3, 23.2). | **Pre-existing v1 defect:** its trunk stood 0.2 m from the Road North centre line and blocked the road. |
| `VEG_GroundCover_*` (4) | −8,400 tris of grass, flowers and shrubs removed under the new footprints, yards, paths, farm and gathering spot. | Stops vegetation poking through floors and paths. |
| `ENV_VillageProps` | A few loose rocks removed under the new content (−100 tris). | Same reason. |
| `TERRAIN_Paths` | The first segments of v1 **Road North** and **Upper Loop** were removed (−326 tris) and replaced by `XPATH_RoadNorth_Fix` / `XPATH_UpperLoop_Fix`. | **Pre-existing v1 defects** found by the v2 capsule test: Road North ran through the Water Plant yard (distribution basin, trough, both clay basins, west fence), and Upper Loop hugged its east fence. Faces shared with other kept paths were preserved. |
| `TERRAIN_Ground` colours | Dirt tint along new paths, the farm and the gathering spot. | Ties the new paths into the ground. The pristine v1 colours are kept in the non-exported attribute `Col_v1`. |
| Water (`WATER_River`, `WATER_Surfaces`, `ELEC_PoolWater`) | Vertex-colour tint only: shallow edges, deeper channel, pools (blue-green). | Livelier water. Geometry is unchanged. |
| `TERRAIN_FarHills`, far trees | Gentle distance haze tint. | Atmospheric depth. |
| `M_Water`, `M_WaterFall`, world, sun | Upgraded material; brighter blue gradient world; warmer, softer sun. | Water, sky and daylight requirements. |

The approved buildings' own vertex colours, textures and materials were not changed, apart from the shared water materials.

## Additions
### Residential homes: 8 homes, 4 designs, controlled variants (`residential.py`)
| Home | Design | Variant | Site (m) | Yaw | Tris (incl. garden) | Character |
|---|---|---|---|---|---|---|
| HOUSE_01 | B timber cottage + porch | b1 | (−17.5, 31.5) | −73° | 4,658 | Warm planks, red shutters, veg bed, barrels; faces Road North |
| HOUSE_02 | A plaster cottage | a2 | (−31.5, 34.5) | 65° | 3,976 | Whitewash, dark terracotta, flower boxes, firewood |
| HOUSE_03 | D farmhouse + side extension | d1 | (−21.0, 43.0) | 20° | 5,072 | Stone base band, lean-to, veg bed, firewood; on the rear-left slope |
| HOUSE_04 | C two-storey family house | c2 | (3.5, 50.0) | −10° | 6,080 | Peach plaster, half-timbered upper floor, mirrored front wing, bench |
| HOUSE_05 | A plaster cottage | a1 | (34.0, 43.0) | −90° | 4,392 | Cream, green shutters, front garden + picket gate, clothesline |
| HOUSE_06 | B timber cottage + porch | b2 | (30.5, 36.0) | −60° | 5,414 | Light weathered planks, muted roof, blue shutters, front garden |
| HOUSE_07 | A plaster cottage | a3 | (−21.25, 6.5) | 122° | 3,496 | Pale yellow, muted roof, veg bed, clothesline; west outer side |
| HOUSE_08 | D farmhouse + side extension | d2 | (23.0, 6.0) | 30° | 5,040 | Yellow plaster, stone base band, crates; beside the farm (east outer) |

How the homes are built:
- **Kit:** walls with real thickness at the openings and recessed windows, plank doors with steps, stone plinths that absorb slopes up to about 1.3 m, chimneys, and course-tiled roofs. The roofs are simpler than the educational buildings' individual tiles.
- **Geometry and runtime nodes:** geometry is merged per area into four region meshes of five primitives each (`EXP_Residential_RearWest`, `_RearEast`, `_WestOuter`, `EXP_Farmstead`). Each home still has its own `HOUSE_xx_ROOT` node carrying metadata, colliders and an entrance marker. No interiors.
- **What was not reused:** no circular-window + waterwheel combination, no tank tower or treatment equipment, and no large striped market awning.

**Settlement layout.** Sites were chosen by a constraint search against the real terrain:
- at least 2.6 m footprint clearance from tree trunks
- clear of existing paths, the stream, the bridges and the educational pads
- slope limit
- **hero-camera keep-out zones** around the water tank and the electricity chimney and roof silhouettes, so no home sits in front of an educational building or merges with its signature outline

The result is a loose rear-left cluster of three homes around Road North with a gathering spot, one rear-centre home, a rear-right pair, and one home on each outer side.

One design change was made during review: HOUSE_07 was originally the two-storey design and competed with the Ration Shop in the hero view, so it became a low cottage.

**Paths.** There are 14 new path segments (`EXP_Paths`). Each home is approached straight through its garden gate, and the paths branch from the existing network. Village paths are 1.5–2.2 m wide; farm plot paths are 1.0–1.2 m.

### Foreground farm (`farm.py`, east bank below the Electricity Room)
- **Plots:** four plots in raised beds: cabbages (15), carrots with green tops (66 tufts), a restrained grain patch (about 40 clumps), and lettuce with two bean-pole teepees.
- **Crops:** merged clusters in `EXP_Farm_Crops`, with no shadows (6,934 tris).
- **Irrigation:** a hand pump at the river feeds a stone-lined channel (`EXP_Farm_Irrigation`). It has plank crossings where paths cross it. It is farm-only and on the opposite bank from the clean-water teaching equipment; nothing drains back.
- **Structures:** a low rail fence with an open west gate and a north gate to the farmhouse, and a lean-to shelter with a tool rack (rake, hoe, spade).
- **Props:** a wheelbarrow with cabbages, baskets, crates, watering cans and a scarecrow.
- **Metadata:** plot zones (`FARM_InteractionZone`) and gate markers are in the manifest.

### Village-life details (`village_details.py`, kept sparse)
- **Gathering spot (rear-left):** a gravel patch, bench, noticeboard with legible "NOTICES" text, lantern post (emissive `EXP_LanternGlass`) and flower pots.
- **Signposts:** three, with legible text: HOMES / BRIDGE / WATER, FARM / BRIDGE / POWER, HOMES / POWER.
- **Community garden:** a small fenced garden on the west bank.
- **Gardens and yards:** front gardens with picket fences, veg beds, firewood stacks (three homes), clotheslines (two yards), and barrels, pots and crates.
- **Riverbanks:** grouped reeds and stones at eight bank spots.

### Livelier water (`water_fx.py`)
**Visible in Blender and in the static glTF:**
- a blue-green depth tint: shallow edges, a deeper channel, pools
- flow-streak texture `T_Water`
- ripple normal map `T_Water_Normal` giving restrained highlights
- thin stylised foam lines around 50 bank rocks, 8 bridge posts and 3 calm riffles (`EXP_WaterFX_Foam`, separate shader target `M_Foam`)
- impact ripple rings where the waterwheel and treatment falls land, plus at the pump intake

**Runtime only (implemented in `preview/index.html`; verified with the motion probe described below):**
- river UV flow along the stream (`map.offset.y += 0.08 * dt`)
- an independent normal-map scroll
- falls scrolling
- a ±15% foam opacity pulse
- still water (tanks, basins, well, wheel pool and flume, farm channel): its own material with an undirected ripple wobble and no flow

No fluid simulation and no dense wave geometry are used. Transparent layers are water (1), falls (1) and foam (1).

### Sky and daylight (`sky.py`)
**In Blender:**
- a cheerful blue gradient world (pale horizon to clear blue zenith)
- warmer sun (energy 4.0, 2.2° soft shadows)
- 20 stylised cloud clusters in one mesh with one material and no shadows (`EXP_Sky_Clouds`, 7,840 tris); the higher clouds are only visible from player height, so the approved hero framing is unchanged
- gentle haze on far hills and trees

**In the runtime:** a gradient sky dome that follows the camera, distance fog, a hemisphere light, sky-derived environment reflections for the water, and slow cloud drift (rotation about +Y).

## Performance
### Budget comparison
| Metric | v1 baseline | v2 | Review threshold |
|---|---|---|---|
| Total triangles (all nodes) | 228,122 | **287,136** (+59,014: +67,840 additions, −8,826 trimmed) | ~350,000 visible |
| Primitives (whole village) | 155 | **181** (+26) | 150 draw calls (main view) |
| Expansion meshes | – | 10 objects, 67,840 tris, 26 primitives | – |
| Materials | 13 | 15 (+`M_Foam`, `M_Cloud`) | 12–20 |
| Textures | 6 × 512² (8.0 MiB decoded) | 8 × 512² (10.7 MiB decoded) | < 64 MiB |
| `village_complete.glb` | 14.85 MB (≈5.0 MB gzip) | 20.22 MB (**6.47 MB gzip**) | ≤ 20 MB compressed download |
| `residential_kit.glb` | – | 1.81 MB (0.75 MB gzip), 15,500 tris, 16 primitives | – |

The houses are 3,496–6,080 tris each, including their gardens.

### Runtime measurements
These were measured with three.js r160 in the Claude built-in Chrome 156 on an **NVIDIA GeForce RTX 5060 Laptop GPU** (ANGLE/D3D11), DPR 1, 1024×768, MSAA, one 2048 PCF shadow sun. Each figure comes from forced synchronous renders (the pane was hidden) with GPU timer queries.

| View | Draw calls | Triangles | CPU+sync ms (median / p95) | GPU ms (median) |
|---|---|---|---|---|
| Village hero / overview | 184 | 288,134 | 2.4 / 5.0 | 0.72 |
| Player height, sky view | 149 | 259,488 | 1.9 / 4.4 | 0.55 |
| Ground-level player (v1 cam) | 108 | 230,690 | 1.8 / 6.0 | 0.55 |
| Farm view | 84 | 165,686 | 1.5 / 4.3 | 0.57 |
| Top-down | 184 | 288,134 | 1.8 / 2.2 | 0.60 |
| Interiors (Elec / Water / Ration) | 72 / 58 / 81 | 150–177k | 1.6–1.7 / 2.0–2.3 | 0.76–0.77 |

**Reading this:**
- The v1 baseline overview was already **over** the 150 draw-call review threshold (157). The expansion adds 27 calls there, giving 184. Gameplay views are at 84–149.
- **Visible triangles stay under 350k in every view.**
- The additions were optimised first: region merging, crops and foam with shadows off, and five shared materials per region. Approved buildings were not simplified.
- Next options if needed:
  - merge the four residential region meshes into two (−10 calls)
  - an impostor or LOD for the rear homes and clouds in far views
  - merge the v1 ground-cover chunks for the overview only
- `renderer.info` may not count shadow-pass draws.

## Navigation and intersections (verified)
- **Capsule sampling** (1.4 m × 0.3 m radius, 0.25 m steps, OBB colliders) in three.js:
  - v1 exterior routes: 202/202 clear
  - v1 interiors: 100/100 clear
  - **all 16 expansion path segments** (homes, gathering spot, farm, repaired v1 segments): **738/738 clear**
- **Blender-side mirror:** the same test over all remaining v1 paths (448 samples) and all expansion paths (474 samples) finds **0 collisions**.
- **New colliders:** house bodies, porch rails, step ramps, garden fences and beds, yard props, farm fence segments, shelter, scarecrow, wheelbarrow and pump. 232 colliders in total, all simple boxes or capsules.
- **Visibility:** every home sits behind the educational buildings relative to the hero camera and outside the tank and chimney keep-out zones (checked by projection during site selection, then confirmed visually in the renders).

## Issues found and fixed during this task
1. **Road North (v1)** passed through the Water Plant yard and its fence. Re-routed around the yard.
2. **Upper Loop (v1)** started flush against the Water Plant's east fence. Re-routed.
3. **A v1 tree** stood on Road North. Moved 3.4 m.
4. **Tooling regression (introduced and fixed during this session):** re-running the sample-animation step while the scene frame was at 52 had drifted the rest poses of four animated pivots (waterwheel, windlass, scale beam, voltmeter needle). The script now always keys from the authored rest rotations and pins frame 1, and the four pivots were restored to their exact v1 values (needle −40°, the others 0°). The runtime confirms the scale beam behaves exactly as in v1 (−0.18 rad).

## Water and cloud motion check (browser)
Run with `preview/index.html?motionprobe=1` (add `&autocheck=1` to run the interaction checks too). Results: `reports/motion_probe_v2.json`. Screenshot of the before/after crops: `renders/v2/motion_probe.jpg`.

The browser pane was hidden, which pauses `requestAnimationFrame`. So the probe drives **the same `stepEffects()` function the live loop calls**, with fixed 1/30 s steps, and renders real frames at t = 0, 2 s and 32 s.

### Bugs found and fixed
All three fixes are runtime-only, in `preview/index.html`; no re-export was needed.
1. **A shared texture made the river run upstream.** GLTFLoader caches textures per glTF texture index, and the export uses one texture for both `M_Water` and `M_WaterFall`. Scrolling each material's map moved that one texture by +0.08 − 0.6 = **−0.52 units/s, so the river would have flowed upstream, 6.5× too fast**. Now the falls get their own texture clone, and each unique texture is scrolled once per frame.
2. **Still water drifted north.** Only `WATER_River` has flow-aligned UVs. The other `M_Water` surfaces (`ELEC_PoolWater`, `WATER_Surfaces`, `EXP_Farm_Irrigation`) are box-projected but shared the river's material, so they all slid toward +Y at the river's speed:
   - the waterwheel flume ran **backwards**, away from the wheel
   - the farm channel slid **sideways**
   - tanks, basins and the well drifted

   These surfaces now get their own material, `M_Water_still`, with no flow and only an undirected ripple wobble (|offset| ≤ 0.03).
3. **The "Water shader swap" demo ran the river upstream.** It used one canvas texture for all water and scrolled it at −0.25/s. It now uses one texture per motion kind, with the same directions as the main effects. The autocheck still swaps all 6 water primitives.

### Measured
- **Rates match the design exactly.** Over 2 s:
  - river map +0.16
  - ripple normals (+0.03, +0.10)
  - falls −1.2
  - clouds +0.008 rad
  - still-water map 0

  Foam opacity pulses between 0.49 and 0.70.
- **Directions**, checked per triangle on the exported meshes. The surface gradient of v gives the direction texture features move. That direction is compared with steepest descent on sloped sheets, and with the stream centre line from `layout.py` on the flat river.

  | Mesh | Area moving with the flow | Notes |
  |---|---|---|
  | `WATER_River` (1,024 m²) | **100%** (mean cos 0.998) | heads downstream (south) |
  | `ELEC_WheelFall` | **100%** | down over the wheel |
  | `WATER_Falls`: the 3 stage spouts | **100%** | the main treatment cascade |
  | `WATER_Falls`: the 2 transfer chutes at the clay pots | **0%** | box-projected UVs (details below). 0.11 m², 32% of the falls' area |

  On the transfer chutes, the texture crosses the pot-to-pot chute (cos 0.41) and runs partly back up the pot-to-trough chute (cos −0.54).
- **Rendered pixels really move.** Regions were chosen from GPU masks (target rendered hidden versus shown):

  | Region | Mean change after 2 s | After 32 s |
  |---|---|---|
  | River (100% water, mid-distance) | 9.2 | 7.4 |
  | Cloud (71% cloud pixels) | 3.0 | 30.2 |
  | Static wooden surface (control) | 0 | 0 |

  The probe now picks the control box with GPU masks, so every pixel in it is static geometry with no sky where drifting clouds could appear. It was re-run on the compressed web build and on the uncompressed file, at a smaller 755×625 canvas:
  - the control stayed at 0 after 2 s and after 32 s
  - the river and cloud changes matched between the two files to within 0.005

**Not fixed (needs flow UVs authored in Blender, then a re-export):**
- The two transfer chutes.
- Real flow in the wheel flume and the farm channel. They render as still water for now.

**Not covered:** watching the effects live at display rate with a visible pane. The probe runs the identical update code and real renders, but not real-time pacing. During the autocheck run, the live loop did advance all effects together by 1.4 s of effect time, so the loop is wired up. Its frame pacing was not observed.
## Unverified or limited
- **30-second rAF frame-rate route sampling** was not run (the pane was hidden, and you deferred it). Integrated-graphics laptop and mobile profiles are **untested**. The RTX 5060 numbers are a high-end reference only.
- **Blender World and sun** do not export to glTF. The browser sky, fog and lighting are runtime code.
- **Homes have no interiors.** Their doors are closed and decorative (`enterable: false` in the manifest).
- **The per-building .blend files** still carry the v1 water material. The v2 water look lives in the master v2 project and the GLBs.
- **`build_village.build_all()`** now chains `expansion.run()` after the v1 pipeline. It was **not executed** this session, because it re-initialises the scene. The incremental `expansion.run()` was run repeatedly and is idempotent.