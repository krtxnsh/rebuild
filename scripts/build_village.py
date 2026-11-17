"""build_village.py - orchestrates build stages (each callable separately for incremental updates)."""
import bpy, importlib, math
import shared_utils as su, layout as L, scene_setup as SS
R = su.ROOT

def reload_all():
    import shared_utils, layout, materials, scene_setup, terrain, building_common, build_blockout
    import electricity_room, water_plant, ration_shop, environment, optimize, export_assets, residential, expansion
    for m in (shared_utils, layout, materials, scene_setup, terrain, building_common, build_blockout,
              electricity_room, water_plant, ration_shop, environment, optimize, export_assets, residential, expansion):
        importlib.reload(m)

def building(key):
    mod = {'ELEC': 'electricity_room', 'WATER': 'water_plant', 'RATION': 'ration_shop'}[key]
    m = importlib.import_module(mod)
    su.remove_hierarchy('BLD_%s_ROOT' % key)
    p = bpy.data.objects.get('PROXY_' + key)
    if p:
        bpy.data.objects.remove(p, do_unlink=True)
    root = m.build()
    objs = [root] + list(root.children_recursive)
    return {'objects': len(objs), 'tris': su.scene_tris([o for o in objs if o.type == 'MESH'])}

def bcam(key, name, loc_local, tgt_local, lens):
    mx = L.bmatrix(key)
    from mathutils import Vector
    return SS.camera(name, tuple(mx @ Vector(loc_local)), tuple(mx @ Vector(tgt_local)), lens)
CAMERAS = [('ELEC', 'CAM_03_Elec_Exterior', (8.5, -10.5, 6.2), (0.3, 0, 2.6), 32), ('ELEC', 'CAM_04_Elec_Interior', (-0.6, -2.3, 2.1), (0.2, 2.4, 1.7), 16),
           ('WATER', 'CAM_05_Water_Exterior', (-9.0, -10.5, 7.2), (0.2, 0, 2.2), 30), ('WATER', 'CAM_06_Water_Interior', (0.85, -1.9, 1.75), (-0.6, 2.0, 1.4), 16),
           ('RATION', 'CAM_07_Ration_Exterior', (8.2, -9.6, 6.2), (0.3, -0.9, 1.7), 30), ('RATION', 'CAM_08_Ration_Interior', (1.7, -2.5, 1.65), (-1.0, 1.7, 1.2), 16)]

def build_all(export=True, renders=False, expand=True):
    """Full deterministic rebuild: scene -> materials -> terrain/water/bridges/paths -> 3 buildings -> environment ->
    cameras/markers -> optimisation -> sample animations -> GLB export + manifests -> save .blend."""
    import json, materials as MT, build_blockout as BB, environment as EN, optimize as OP, export_assets as EX
    SS.init_scene()
    MT.build_library()
    for nm in ('M_Fabric', 'M_Organic'):
        MT.make_material(nm, rough=0.9, double=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    BB.clear_generated()
    su.purge_collection('04_VEGETATION'); su.purge_collection('05_ENVIRONMENT_PROPS')
    BB.ground_stage()
    for k in ('ELEC', 'WATER', 'RATION'):
        building(k)
    EN.build(); EN.lights_cameras_markers()
    for c in CAMERAS:
        bcam(*c)
    out = {'optimize': OP.run()}
    if expand:   # v2 expansion is applied incrementally on top of the (deterministic) v1 pipeline
        import expansion as XP
        out['expansion'] = XP.run()
    out['animations'] = EX.add_sample_animations()
    if export:
        out['sizes'] = EX.export_all()
        if expand:
            out['sizes']['residential_kit'] = XP.export_kit(su.P('exports', 'residential_kit.glb'))['bytes']
        out['inspect'] = {k: EX.inspect_glb(su.P('exports', k + '.glb')) for k in out['sizes']}
        out['manifest'] = EX.write_manifests()
        out['web_sizes'] = EX.export_web(include_kit=expand)   # Draco copies in exports/web/
        out['stats'] = EX.stats()
        json.dump(out, open(su.P('reports', 'export_raw.json'), 'w'), indent=1)
    bpy.ops.wm.save_as_mainfile(filepath=su.P('blender', 'village_master_v2_expansion.blend' if expand else 'village_master.blend'))
    return out