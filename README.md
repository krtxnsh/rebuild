# Educational Village - Blender -> Three.js build

Three reference-faithful buildings, exactly three: Water Treatment Plant, Electricity Room and Ration Shop. They are placed
following `references/village_wide.jpg` in a stylised, moderately low-poly village. Everything is generated procedurally
with Blender 5.3 `bpy`, driven through the Blender MCP.

| Folder | Contents |
|---|---|
| `blender/` | `village_master.blend` (editable source, scene `VILLAGE`) plus per-building `water_treatment.blend`, `electricity_room.blend`, `ration_shop.blend` |
| `scripts/` | `shared_utils.py` (mesh builder, primitives, sweeps, generators), `materials.py` (14 materials, numpy textures), `layout.py` (composition source of truth), `terrain.py` (heightfield, stream, paths, bridges), `building_common.py` (walls with openings, gables, timber, windows, doors, roofs), `electricity_room.py`, `water_plant.py`, `ration_shop.py`, `environment.py`, `optimize.py`, `export_assets.py`, `build_village.py` (entry point), `scene_setup.py`, `build_blockout.py`, `runner.py` |
| `exports/` | `village_complete.glb` and standalone `water_treatment.glb`, `electricity_room.glb`, `ration_shop.glb`, each at its own root origin. `exports/web/` holds Draco-compressed copies for the web |
| `metadata/` | `scene_manifest.json`, `interaction_points.json`, `collision_manifest.json`, all in glTF Y-up coordinates |
| `renders/` | hero, top-down, ground-level, per-building exteriors, interiors, blockout iterations |
| `preview/` | three.js validation page (`index.html`) |
| `reports/` | `reference_analysis.md` (with conflict log), `visual_comparison.md`, `export_validation.md`, `performance_report.md`, `runtime_results.json`, `export_raw.json` |
| `references/` | Unedited copies of the 7 supplied images. Kept on your PC only: `.gitignore` leaves them out of the repository |

## Rebuild
In Blender's Python console (or via MCP), with `scripts/` on `sys.path`:

```python
import build_village; build_village.reload_all(); build_village.build_all()
```

## Runtime check
From the repository root, run `node scripts/serve.mjs` and open
`http://127.0.0.1:8765/` for the full journey. Node 18 or later is sufficient.
Use `node --test` to check Rio's routes against the shipped village geometry
and exercise the lesson handoff callbacks.

On Windows, double-click `launch-rebuild.cmd` to start the local server at
`http://127.0.0.1:51789/` and open the complete journey automatically.

Serve this folder over HTTP (any static server) and open `preview/index.html`. Two query options are available:
- `?autocheck=1&bench=1` runs the automated checks.
- Without them, use the buttons: doors, waterwheel, valve, scale, bulbs, water shader swap, roof cutaway, colliders, and
  perf routes (30 s exterior + 30 s interior frame sampling; needs a visible tab).
## v2 expansion (current)
The approved three-building village (v1) has been expanded **incrementally**:
- eight distinct homes (four designs)
- a foreground farm and a community garden
- a gathering spot, signposts, gardens and riverbank details
- livelier water, all-green foliage, and a cheerful sky and daylight

See `reports/expansion_report.md` and `renders/v2/`.

| | v1 (approved) | v2 |
|---|---|---|
| Blender | `blender/village_master.blend` (+ `_v1_approved` backup) | `blender/village_master_v2_expansion.blend` |
| Exports | `exports/v1_approved/` | `exports/*.glb` + `exports/residential_kit.glb` |
| Metadata | `metadata/v1_approved/` | `metadata/*.json` (schema 2.0.0) |

**Apply or refresh the expansion** on the open v1/v2 scene. This is idempotent and never re-initialises the scene:

```python
import expansion; expansion.run()
```

**Full rebuild from scratch** (v1 pipeline, then the expansion):

```python
import build_village; build_village.reload_all(); build_village.build_all()
```

The runtime page (`preview/index.html`) now includes:
- a sky dome
- water flow, normal scrolling and a foam pulse
- cloud drift
- expansion checks: houses, farm, and capsule routes along every new path
- a motion probe (`?motionprobe=1`) that checks the water and cloud motion rates and directions; results are in `reports/motion_probe_v2.json` and `reports/expansion_report.md`

## Use it on the web
The Draco-compressed web build is in `exports/web/`. It has the same nodes, names, extras and animations as `exports/`:

| File | Web build | Uncompressed |
|---|---|---|
| `village_complete.glb` | 4.7 MB | 19.3 MB |
| `water_treatment.glb` | 1.3 MB | 3.6 MB |
| `electricity_room.glb` | 1.3 MB | 3.0 MB |
| `ration_shop.glb` | 1.1 MB | 3.0 MB |
| `residential_kit.glb` | 0.7 MB | 1.7 MB |

The preview page loads the web build by default; add `?file=../exports/village_complete.glb` to load the uncompressed file. Loading a web-build file in three.js needs the Draco decoder:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
new GLTFLoader().setDRACOLoader(draco).load('exports/web/village_complete.glb', gltf => scene.add(gltf.scene));
```

- **Water and clouds** move only at runtime. Copy `stepEffects()` and the texture set-up from `preview/index.html`, or follow `expansion.water_fx.runtime_animation` in `metadata/scene_manifest.json`.
- **Test locally over HTTP**, not `file://`. From this folder, run a static server such as `python -m http.server 8765` (Blender's bundled Python works), then open `http://localhost:8765/preview/`.
- **Rebuild the web copies** after changing the scene. In Blender, run `import export_assets; export_assets.export_web()`; `build_village.build_all()` also does this.

## Put it on GitHub
This folder is ready to be a repository. `.gitignore` leaves out:
- Blender `.blend1` backups and Python caches
- nine accidental frame-numbered copies of one render
- `references/`, your source images, so they are not published by accident (delete that line to include them)

No file is over 20 MB, so Git LFS is not needed. GitHub Pages cannot serve LFS files anyway.

1. Install Git, then set your name and email once:
   `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
2. Create an empty repository on github.com, with no README or licence.
3. In this folder, run:
   ```
   git init -b main
   git add .
   git commit -m "Educational village: Blender sources, GLB exports, web build, preview"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
4. Optional, to host it: in the repository, open **Settings**, then **Pages**, and deploy from branch `main`, folder `/ (root)`. The site opens at `https://<you>.github.io/<repo>/`, which redirects to the viewer.

On a public repository everything here is public, including the `.blend` files and renders.
