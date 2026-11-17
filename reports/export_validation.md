# Export Validation

Exporter: Blender 5.3 glTF 2.0 (GLB), `export_yup=True`, `export_extras=True`, vertex colours `ACTIVE`, animations `ACTIONS`,
no Draco/meshopt (no decoder dependency), cameras/lights not exported (runtime-defined). Script: `scripts/export_assets.py`.
Validation was done by parsing each GLB's JSON/BIN chunks directly (`inspect_glb`) and by loading in three.js r160.

| File | Bytes | gzip | Nodes | Mesh nodes | Primitives | Triangles | Materials | Images | Animations |
|---|---|---|---|---|---|---|---|---|---|
| exports/village_complete.glb | 14,851,080 | ~5.0 MB | 280 | 87 | 155 | 228,122 | 13 | 6 | 4 |
| exports/water_treatment.glb | 3,539,616 | ~1.36 MB | 69 | 21 | 45 | 41,214 | 9 | 4 | 1 |
| exports/electricity_room.glb | 2,957,784 | ~1.16 MB | 68 | 27 | 44 | 31,166 | 10 | 5 | 2 |
| exports/ration_shop.glb | 3,146,712 | ~1.35 MB | 53 | 19 | 38 | 41,255 | 7 | 4 | 1 |

Checks (all files):
- GLB header/magic/version/length valid; every primitive has POSITION, NORMAL, TEXCOORD_0, COLOR_0; 0 primitives missing normals.
- Every node carries `extras.semantic_id` (280/280 in village). Repeated objects keep a shared semantic id + `instance_id`.
- Textures embedded (PNG, 512x512): T_Brick_Albedo, T_Brick_Normal, T_Plaster, T_Wood, T_Stone, T_Stone_Normal. No external files.
- Alpha: OPAQUE except M_Water / M_WaterFall (BLEND). Double-sided: M_Soft (fabric/foliage), M_WaterFall.
- Extensions: KHR_materials_emissive_strength only.
- Animations: ANIM_ELEC_WaterWheel_Spin, ANIM_ELEC_Needle_Sweep, ANIM_WATER_Windlass_Crank, ANIM_RATION_Scale_Balance.
- Landmark: `BLD_ELEC_ROOT` glTF translation (11.8, 0.45, -8.2) = Blender (11.8, 8.2, 0.45) under (x, z, -y); yaw quaternion
  (0, -0.3007, 0, 0.9537) = -35 deg about +Y. Verified again after loading in three.js (exact match).
- Standalone building GLBs: root moved to origin with identity rotation during export, then restored.

Hierarchy (survives export as Empty nodes): `BLD_<KEY>_ROOT` -> `<KEY>_{Exterior,Roof,Interior,Interactables,Colliders,Zones}_Group`.
Authoring collections follow the brief's `VILLAGE_ROOT/00_TERRAIN ... 09_COLLISION_PROXIES` tree (Blender-only).

Runtime smoke check (`preview/index.html?autocheck=1`, three.js 0.160.0, built-in browser):
load 182 ms, 0 console errors; door hinge rotation, waterwheel spin, valve rotation, scale beam tilt, bulb emissive toggle,
water material replacement (5 water primitives), roof cutaway on all three buildings - all respond.
Raw results: `reports/runtime_results.json`.

Metadata: `metadata/scene_manifest.json` (schema 1.0.0; units, coordinate convention, building roots + assembled transforms,
entrances, spawns, cameras, navigation paths + bridge endpoints, water/shader targets, animations, LOD note),
`metadata/interaction_points.json` (48 interactables, 18 zones), `metadata/collision_manifest.json` (144 box/capsule colliders,
capsule 1.4 m x 0.3 m radius). Colliders/zones/markers are Empty nodes in the GLB with half extents in extras; physics shapes
must be created by the runtime (glTF has no collider standard).

Known limitations:
- Not gameplay-ready by itself: the runtime still has to build physics shapes, door logic and LOD switching.
- `ELEC_Door_L/R` are authored open (reference pose); `initial`, `closed_yaw_deg` and `open_yaw_deg` extras drive runtime state.
  Rotate them with quaternions about local +Y: three.js Euler y flips past +/-90 deg.
- Weighing-scale pans are children of the beam. Counter-rotate them to keep them level (noted in extras).
- Optimisation merged the per-stage water surfaces into `WATER_Surfaces` and the wires into `ELEC_Cables`. The stage boxes
  themselves are still separate interactables.