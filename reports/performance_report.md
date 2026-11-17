# Performance Report

All numbers are measured, not inferred. Blender counts come from evaluated meshes; GLB counts come from parsing the exports;
runtime numbers come from three.js `renderer.info` and timer queries.

## Geometry budget (LOD0, includes interiors)
| Area | Triangles | Target | Mesh objects | Primitives (material x object) |
|---|---|---|---|---|
| Water Treatment Plant | 41,214 | 25-45k | 21 | 45 |
| Electricity Room | 31,166 | 25-45k | 27 | 44 |
| Ration Shop | 41,255 | 25-45k | 19 | 38 |
| Buildings total | 113,635 | ~135k | | |
| Terrain, vegetation, bridges, river, props | 114,487 | 100-150k | 20 | 28 |
| **Village total** | **228,122** | 200-300k | 87 mesh nodes | **155** |

Largest environment items: terrain 28.8k, ground-cover chunks 39.4k combined, far trees and pines 9.0k, west trees 7.0k,
main bridge 6.2k. Interior fit-out alone is 2.3-3.2k per building; interactive equipment is counted separately.
Materials: 13 shared (M_Brick, M_Plaster, M_Wood, M_Stone, M_Clay, M_Slate, M_Metal, M_Soft, M_GlassWarm, M_Bulb, M_Terrain,
M_Water, M_WaterFall). This is just under the brief's 12-20 aim band, which is acceptable: colour lives in vertex colours, so a
few materials cover the whole palette.
Textures: 6 x 512x512 PNG. Estimated decoded size is 8.0 MiB (w x h x 4 bytes x 4/3 mips), well under the 64 MiB aim.
Download size: 14.85 MB uncompressed GLB (target <= 20 MB). Gzip over HTTP brings it to ~5.0 MB. No Draco or KTX2 is used,
so the loader needs no extra decoders.

## Draw-call optimisation pass (`scripts/optimize.py`)
Before optimisation the village had 212 primitives; after, it has 155. The pass did three things:
- Merged each building's static exterior (shell, props, glass, stalls, cart, awning, basins, trough, tower) into one object
  per building.
- Merged the water surfaces into one object and the wires into one object.
- Unified the fabric and foliage materials into `M_Soft` and moved door hardware onto `M_Wood`.

Interactables, roofs, interiors and water targets are still separate nodes.

## Runtime measurements
Measured on this machine: NVIDIA GeForce RTX 5060 Laptop GPU (ANGLE/D3D11), Claude desktop built-in Chrome 156, DPR 1,
1024x768 viewport, MSAA on, PCF soft shadows from one 2048 directional light, three.js 0.160.0.
The pane was hidden, so frames were driven by forced synchronous renders: 60 renders per view, each followed by
`gl.readPixels` to force completion. GPU times come from `EXT_disjoint_timer_query_webgl2`.

| View | Draw calls | Triangles drawn | CPU+sync ms (median / p95) | GPU ms (median) |
|---|---|---|---|---|
| Village hero / overview | 157 | 228,160 | 3.7 / 8.7 | 1.23 |
| Ground-level player view | 86-99 | 184,108-202,920 | 1.8 / 2.9 | 0.19 |
| Top-down | 157 | 228,160 | 3.4 / 7.1 | 1.24 |
| Electricity interior | 56 | 112,430 | 1.7 / 6.7 | 0.27 |
| Water interior | 40 | 109,480 | 1.9 / 2.2 | 0.28 |
| Ration interior | 67 | 147,880 | 1.2 / 2.2 | 0.25 |

How to read this:
- The gameplay views (ground level and interiors) are under the 100 draw-call aim.
- The full-village overview is at 157, just over the 150 "investigate" line. Everything is in frustum there, so culling
  cannot help. The next steps would be merging the three west/centre/east tree chunks and the four ground-cover chunks for
  far views, or adding LODs.
- three.js `renderer.info` may not include shadow-pass draws, so treat these counts as main-pass counts.

**UNVERIFIED:**
- The 30-second requestAnimationFrame FPS sampling on the exterior and interior routes. It is implemented ("Run perf routes"
  button) but could not run because the browser pane was hidden.
- The modest integrated-graphics laptop profile and the mid-range mobile browser profile. Neither has been tested. The
  RTX 5060 numbers above are a high-end reference only and must not be read as passing those targets.

## LOD
No LODs were authored. The measured LOD0 totals are inside budget, and the gameplay views draw under 100 calls on the test
machine. If integrated or mobile testing shows a need, start with the trees (~550 triangles each, 50-60% and 20-30% LODs)
and the building roofs (tile groups to a single baked slab). Runtime switching would need explicit `THREE.LOD` setup; the
manifest records `lod.provided = false`.

## Accessibility / traversal (capsule 1.4 m tall, 0.3 m radius)
- Door clear widths: Electricity Room 2.0 x 2.5 m, Water Plant 1.7 x 2.3 m, Ration Shop entry gap 1.45 x 2.35 m. All three
  rear doors are 1.1 x 2.0-2.1 m.
- Paths are 1.8-2.6 m wide. The main bridge has 1.86 m clear deck width; the footbridges have 1.6 m.
- Steps are covered by invisible ramp colliders (`COL_*_EntryRamp*`).
- Capsule route sampling in three.js (raycast floor following + oriented-box collider test):
  - Exterior: shop -> paths -> arched bridge -> Electricity Room, plus Water Plant -> bridge. 202 samples, 0 collisions.
  - Interiors: all three, in and out. 100 samples, 0 collisions.