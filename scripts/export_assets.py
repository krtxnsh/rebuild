"""export_assets.py - sample animations, GLB export (village + per-building), GLB inspection and metadata manifests.

Coordinate conventions: Blender authoring is Z-up (x, y, z).  Exported glTF is Y-up: (x, z, -y).
All manifest positions are in exported glTF coordinates, metres."""
import bpy, json, math, os, struct
from mathutils import Vector, Matrix, Quaternion
import shared_utils as su
import layout as L

SCHEMA = '2.0.0'
BUILD_FILES = {'WATER': 'water_treatment', 'ELEC': 'electricity_room', 'RATION': 'ration_shop'}

def g(v):
    return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]

def gq(q):
    return [round(q.x, 5), round(q.z, 5), round(-q.y, 5), round(q.w, 5)]

def gaxis(a):
    return {'X': [1, 0, 0], 'Y': [0, 0, -1], 'Z': [0, 1, 0], 'local_Z': [0, 1, 0]}.get(a, a)

# ----------------------------------------------------------------------------- animations
# Authored rest rotations (radians) of the animated pivots, exactly as built by the building scripts.  The sample
# animations are always keyed relative to these, never to the current evaluated pose (which drifts with the frame).
REST_ROT = {'ELEC_WaterWheel': (0.0, 0.0, 0.0), 'WATER_Well_Windlass': (0.0, 0.0, 0.0),
            'RATION_WeighingScale_Beam': (0.0, 0.0, 0.0), 'ELEC_VoltageMeter_Needle': (0.0, math.radians(-40), 0.0)}

def add_sample_animations():
    scn = bpy.context.scene
    scn.frame_set(1)
    for a in list(bpy.data.actions):
        if a.name.startswith('ANIM_'):
            bpy.data.actions.remove(a)
    prefs = bpy.context.preferences.edit
    old = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = 'LINEAR'
    made = []
    def anim(obj_name, act_name, idx, keys):
        ob = bpy.data.objects.get(obj_name)
        if ob is None:
            return
        if ob.animation_data:
            ob.animation_data_clear()
        ob.rotation_euler = REST_ROT[obj_name]
        base = ob.rotation_euler[idx]
        for f, v in keys:
            ob.rotation_euler[idx] = base + v
            ob.keyframe_insert('rotation_euler', index=idx, frame=f)
        ob.rotation_euler[idx] = base
        ob.animation_data.action.name = act_name
        ob.animation_data.action.use_fake_user = True
        made.append(act_name)
    anim('ELEC_WaterWheel', 'ANIM_ELEC_WaterWheel_Spin', 0, [(1, 0.0), (121, 2 * math.pi)])
    anim('WATER_Well_Windlass', 'ANIM_WATER_Windlass_Crank', 0, [(1, 0.0), (121, 4 * math.pi)])
    anim('RATION_WeighingScale_Beam', 'ANIM_RATION_Scale_Balance', 1, [(1, 0.0), (31, 0.18), (91, -0.18), (121, 0.0)])
    anim('ELEC_VoltageMeter_Needle', 'ANIM_ELEC_Needle_Sweep', 1, [(1, 0.0), (61, math.radians(80)), (121, 0.0)])
    prefs.keyframe_new_interpolation_type = old
    scn.frame_set(1)
    for n, r in REST_ROT.items():
        ob = bpy.data.objects.get(n)
        if ob is not None:
            ok = all(abs(a - b) < 1e-5 for a, b in zip(ob.rotation_euler, r))
            made.append('%s rest %s' % (n, 'ok' if ok else 'MISMATCH'))
    return made

# ----------------------------------------------------------------------------- selection + export
def exportable(o):
    if o.type in ('CAMERA', 'LIGHT'):
        return False
    if o.name.startswith('PROXY') or o.get('export', True) is False:
        return False
    return True

def village_objects():
    root = bpy.data.collections['VILLAGE_ROOT']
    objs = set(root.all_objects)
    return [o for o in objs if exportable(o)]

# Exporter overrides for variant builds: export_web() sets the Draco options; empty for the standard exports.
_OVERRIDES = {}

def _export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    kw = dict(
        filepath=path, export_format='GLB', use_selection=True, use_visible=False, use_renderable=False,
        export_extras=True, export_yup=True, export_apply=False, export_texcoords=True, export_normals=True,
        export_materials='EXPORT', export_image_format='AUTO', export_vertex_color='ACTIVE',
        export_cameras=False, export_lights=False, export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=False, export_shared_accessors=False, export_gpu_instances=False,
        export_draco_mesh_compression_enable=False)
    kw.update(_OVERRIDES)
    bpy.ops.export_scene.gltf(**kw)
    bpy.ops.object.select_all(action='DESELECT')
    return os.path.getsize(path)

def export_all(sub=()):
    out = {}
    out['village_complete'] = _export(su.P('exports', *sub, 'village_complete.glb'), village_objects())
    for key, fname in BUILD_FILES.items():
        root = bpy.data.objects['BLD_%s_ROOT' % key]
        saved = root.matrix_world.copy()
        root.location = (0, 0, 0); root.rotation_euler = (0, 0, 0)
        bpy.context.view_layer.update()
        objs = [root] + [o for o in root.children_recursive if exportable(o)]
        try:
            out[fname] = _export(su.P('exports', *sub, fname + '.glb'), objs)
        finally:
            root.matrix_world = saved
            bpy.context.view_layer.update()
    return out

# ----------------------------------------------------------------------------- web build
# Draco-compressed copies of every GLB for web delivery (exports/web/).  Same nodes, names, extras, materials and
# animations as the standard exports; three.js needs DRACOLoader (see preview/index.html).  Quantization is per
# primitive: 16-bit positions (<5 mm on the 300 m terrain), 18-bit UVs so the long river and box-projected terrain
# UVs stay sub-texel, 10-bit normals and colours.
WEB_DRACO = dict(export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                 export_draco_position_quantization=16, export_draco_normal_quantization=10,
                 export_draco_texcoord_quantization=18, export_draco_color_quantization=10,
                 export_draco_generic_quantization=12)

def export_web(include_kit=True):
    global _OVERRIDES
    os.makedirs(su.P('exports', 'web'), exist_ok=True)
    bpy.context.scene.frame_set(1)   # rest pose for the static node transforms
    _OVERRIDES = dict(WEB_DRACO)
    try:
        out = export_all(sub=('web',))
        if include_kit:
            import expansion
            out['residential_kit'] = expansion.export_kit(su.P('exports', 'web', 'residential_kit.glb'))['bytes']
    finally:
        _OVERRIDES = {}
    return out

# ----------------------------------------------------------------------------- GLB inspection (independent of Blender data)
def inspect_glb(path):
    data = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<4sII', data[:12])
    assert magic == b'glTF' and ver == 2 and length == len(data), 'bad GLB header'
    clen, ctype = struct.unpack('<II', data[12:20])
    J = json.loads(data[20:20 + clen].decode('utf-8'))
    acc = J.get('accessors', [])
    mesh_tris, mesh_prims = [], []
    attrs_missing = 0
    for m in J.get('meshes', []):
        t = 0
        for p in m['primitives']:
            if p.get('mode', 4) != 4:
                continue
            if 'indices' in p:
                t += acc[p['indices']]['count'] // 3
            else:
                t += acc[p['attributes']['POSITION']]['count'] // 3
            if 'NORMAL' not in p['attributes']:
                attrs_missing += 1
        mesh_tris.append(t); mesh_prims.append(len(m['primitives']))
    nodes = J.get('nodes', [])
    drawn_tris = sum(mesh_tris[n['mesh']] for n in nodes if 'mesh' in n)
    prims = sum(mesh_prims[n['mesh']] for n in nodes if 'mesh' in n)
    with_extras = sum(1 for n in nodes if 'extras' in n and 'semantic_id' in n['extras'])
    imgs = []
    for im in J.get('images', []):
        bv = J['bufferViews'][im['bufferView']]
        off = 20 + clen + 8 + bv.get('byteOffset', 0)
        head = data[off:off + 24]
        w, h = struct.unpack('>II', head[16:24]) if head[1:4] == b'PNG' else (0, 0)
        imgs.append({'name': im.get('name'), 'mime': im.get('mimeType'), 'bytes': bv['byteLength'], 'w': w, 'h': h})
    decoded = sum(i['w'] * i['h'] * 4 * 4 / 3 for i in imgs)
    landmark = None
    for n in nodes:
        if n.get('name') == 'BLD_ELEC_ROOT':
            landmark = {'translation': n.get('translation'), 'rotation': n.get('rotation')}
    color0 = sum(1 for m in J.get('meshes', []) for p in m['primitives'] if 'COLOR_0' in p['attributes'])
    return {'file': os.path.basename(path), 'bytes': len(data), 'nodes': len(nodes), 'meshes': len(J.get('meshes', [])),
            'mesh_nodes': sum(1 for n in nodes if 'mesh' in n), 'primitives_drawn': prims, 'triangles_drawn_all_nodes': drawn_tris,
            'materials': [m.get('name') for m in J.get('materials', [])], 'images': imgs,
            'decoded_texture_MiB_with_mips': round(decoded / 2 ** 20, 2),
            'animations': [a.get('name') for a in J.get('animations', [])], 'nodes_with_semantic_id': with_extras,
            'primitives_with_COLOR_0': color0, 'primitives_missing_NORMAL': attrs_missing,
            'extensionsUsed': J.get('extensionsUsed', []), 'landmark_BLD_ELEC_ROOT': landmark,
            'alpha_modes': sorted(set(m.get('alphaMode', 'OPAQUE') for m in J.get('materials', []))),
            'double_sided_materials': [m.get('name') for m in J.get('materials', []) if m.get('doubleSided')]}

# ----------------------------------------------------------------------------- manifests
def building_of(o):
    p = o
    while p is not None:
        if p.get('asset_root'):
            return p
        p = p.parent
    return None

def props_of(o, skip=()):
    d = {}
    for k in o.keys():
        if k in skip or k.startswith('_'):
            continue
        v = o[k]
        try:
            json.dumps(v); d[k] = v
        except TypeError:
            try:
                d[k] = list(v)
            except Exception:
                d[k] = str(v)
    return d

def write_manifests():
    bpy.context.view_layer.update()
    objs = village_objects()
    buildings, interact, zones, markers, cols, water = {}, [], [], [], [], []
    for key, fname in BUILD_FILES.items():
        r = bpy.data.objects['BLD_%s_ROOT' % key]
        b = L.BUILDINGS[key]
        buildings[key] = {'root_node': r.name, 'standalone_glb': 'exports/%s.glb' % fname,
                          'standalone_origin': 'root at glTF origin, identity rotation',
                          'assembled_translation': g(r.matrix_world.translation),
                          'assembled_rotation_quat': gq(r.matrix_world.to_quaternion()),
                          'assembled_yaw_deg_about_+Y': b['rot'],
                          'groups': {gname: '%s_%s_Group' % (key, gname) for gname in ('Exterior', 'Roof', 'Interior', 'Interactables', 'Colliders', 'Zones')},
                          'cutaway': {'roof_group': '%s_Roof_Group' % key, 'interior_group': '%s_Interior_Group' % key}}
    for o in objs:
        if 'semantic_id' not in o:
            continue
        broot = building_of(o)
        local = (broot.matrix_world.inverted() @ o.matrix_world) if broot else None
        base = {'semantic_id': o['semantic_id'], 'node': o.name, 'building': broot['building'] if broot else None,
                'world_position': g(o.matrix_world.translation),
                'local_position': g(local.translation) if local else None}
        if o.get('interactable'):
            e = dict(base)
            e['extras'] = props_of(o, ('semantic_id',))
            if 'pivot_axis' in o:
                e['pivot_axis_local_gltf'] = gaxis(o['pivot_axis'])
            e['world_rotation_quat'] = gq(o.matrix_world.to_quaternion())
            interact.append(e)
        elif o.get('zone'):
            e = dict(base)
            hx, hy, hz = o['half_extents']
            e.update({'purpose': o.get('purpose'), 'half_extents_gltf': [hx, hz, hy], 'world_rotation_quat': gq(o.matrix_world.to_quaternion()),
                      'targets': list(o.get('targets', []))})
            zones.append(e)
        elif o.get('marker'):
            e = dict(base)
            fwd = o.matrix_world.to_3x3() @ Vector(tuple(o.get('forward_local', [0, 1, 0])))
            e.update({'kind': o['marker'], 'forward_world_gltf': [round(x, 4) for x in g(fwd.normalized())], 'extras': props_of(o, ('semantic_id', 'marker', 'forward_local'))})
            markers.append(e)
        elif o.get('collider'):
            if o.get('collider') in ('heightfield', 'trunks_only', 'none'):
                continue
            hx, hy, hz = o['half_extents']
            cols.append({'node': o.name, 'shape': o['collider'], 'building': base['building'], 'center_world': base['world_position'],
                         'rotation_world_quat': gq(o.matrix_world.to_quaternion()), 'half_extents_gltf_local': [round(hx, 4), round(hz, 4), round(hy, 4)]})
        if o.get('shader_target'):
            water.append({'node': o.name, 'semantic_id': o['semantic_id'], 'target': o['shader_target'], 'material': [m.name for m in o.data.materials] if o.type == 'MESH' else [],
                          'flow_axis': o.get('flow_axis'), 'flow_speed': o.get('flow_speed')})
    cams = []
    for c in bpy.data.collections['07_CAMERAS'].objects:
        if c.type == 'CAMERA':
            cams.append({'name': c.name, 'position': g(c.matrix_world.translation), 'target': g(Vector(c['target'])) if 'target' in c else None,
                         'focal_length_mm': c.data.lens, 'sensor_width_mm': c.data.sensor_width, 'type': c.data.type})
    manifest = {
        'schema_version': SCHEMA, 'generator': 'rebuild_village_output/scripts (Blender %s)' % bpy.app.version_string,
        'units': 'metres', 'coordinate_system': 'glTF 2.0: +Y up, right-handed, -Z forward. Authoring in Blender Z-up; conversion (x, y, z)_blender -> (x, z, -y)_gltf.',
        'files': {'village': 'exports/village_complete.glb', **{k: v['standalone_glb'] for k, v in buildings.items()}},
        'buildings': buildings, 'interactables_count': len(interact), 'zones_count': len(zones),
        'navigation': navigation(),
        'expansion': expansion_info(),
        'spawn_points': [m for m in markers if m['kind'] == 'spawn'], 'entrances': [m for m in markers if m['kind'] == 'entrance'],
        'cameras': cams, 'water_and_special_shader_targets': water,
        'lod': {'provided': False, 'reason': 'Measured LOD0 totals are inside the provisional budget (see reports/performance_report.md); LOD nodes not authored yet. Runtime switching would need explicit THREE.LOD setup.'},
        'animations': {'ANIM_ELEC_WaterWheel_Spin': 'ELEC_WaterWheel, local X, 360 deg / 120 frames @30fps (loop)',
                       'ANIM_WATER_Windlass_Crank': 'WATER_Well_Windlass, local X, 720 deg / 120 frames',
                       'ANIM_RATION_Scale_Balance': 'RATION_WeighingScale_Beam, +/-10 deg rocking',
                       'ANIM_ELEC_Needle_Sweep': 'ELEC_VoltageMeter_Needle sweep'},
        'runtime_notes': ['Collections are authoring-only; use the *_Group Empty nodes for runtime grouping.',
                          'Hide <KEY>_Roof_Group (and optionally walls) for indoor camera cutaway.',
                          'Emissive toggles: ELEC_Bulb_* (material M_Bulb), lantern/lamp glass objects. Clone material per node before toggling.',
                          'Water: M_Water / M_WaterFall are replacement targets. Scroll UV v only on flow_axis uv_v targets; see expansion.water_fx.runtime_animation for directions and the texture-sharing and still-water rules.',
                          'Colliders/zones/markers are Empty nodes with extras; build physics shapes from collision_manifest.json.'],
    }
    md = su.P('metadata')
    json.dump(manifest, open(os.path.join(md, 'scene_manifest.json'), 'w'), indent=1)
    json.dump({'schema_version': SCHEMA, 'coordinate_system': manifest['coordinate_system'], 'interactables': interact, 'zones': zones},
              open(os.path.join(md, 'interaction_points.json'), 'w'), indent=1)
    json.dump({'schema_version': SCHEMA, 'coordinate_system': manifest['coordinate_system'],
               'player_capsule': {'height': 1.4, 'radius': 0.3}, 'terrain': {'node': 'TERRAIN_Ground', 'shape': 'heightfield/trimesh from render mesh'},
               'colliders': cols}, open(os.path.join(md, 'collision_manifest.json'), 'w'), indent=1)
    return {'interactables': len(interact), 'zones': len(zones), 'markers': len(markers), 'colliders': len(cols), 'water_targets': len(water), 'cameras': len(cams)}

def expansion_info():
    """v2 expansion: homes, farm, village details, sky + water presentation targets (glTF coordinates)."""
    out = {'version': 'v2', 'root_node': 'EXP_ROOT', 'houses': [], 'farm': None, 'details': [], 'sky': None, 'water_fx': None}
    for o in sorted(bpy.data.objects, key=lambda o: o.name):
        if o.get('house_id'):
            ent = bpy.data.objects.get(o['house_id'] + '_Entrance')
            fwd = (ent.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized() if ent else None
            out['houses'].append({'id': o['house_id'], 'node': o.name, 'design': o.get('design'), 'variant': o.get('variant'),
                                  'world_position': g(o.matrix_world.translation), 'yaw_deg_about_+Y': round(math.degrees(o.matrix_world.to_euler().z), 2),
                                  'footprint_local_blender_xy': list(o.get('footprint_local', [])), 'height_m': o.get('height'), 'triangles': o.get('triangles'),
                                  'region_mesh': o.get('region_mesh'), 'enterable': False,
                                  'entrance': {'node': ent.name, 'world_position': g(ent.matrix_world.translation), 'forward_world_gltf': [round(x, 4) for x in g(fwd)]} if ent else None})
    f = bpy.data.objects.get('FARM_ROOT')
    if f:
        out['farm'] = {'node': f.name, 'world_position': g(f.matrix_world.translation), 'plots_blender_xy_bounds': {k: list(v) for k, v in dict(f.get('plots', {})).items()},
                       'irrigation': f.get('irrigation'), 'meshes': ['EXP_Farmstead', 'EXP_Farm_Crops', 'EXP_Farm_Irrigation'],
                       'gates': [n for n in ('FARM_Gate_West', 'FARM_Gate_North') if n in bpy.data.objects],
                       'water_separation': 'farm channel is fed by a hand pump at the river; it does not connect to the clean-water teaching equipment'}
    for n in ('EXP_GatheringSpot', 'EXP_Sign_01', 'EXP_Sign_02', 'EXP_Sign_03', 'EXP_CommunityGarden'):
        o = bpy.data.objects.get(n)
        if o:
            out['details'].append({'node': n, 'world_position': g(o.matrix_world.translation), 'extras': props_of(o)})
    out['sky'] = {'clouds_node': 'EXP_Sky_Clouds', 'material': 'M_Cloud', 'runtime_colors_srgb': {'horizon': '#e8f1fb', 'mid': '#9cc3f6', 'zenith': '#4f8fe8'},
                  'drift': 'rotate EXP_Sky_Clouds about +Y ~0.004 rad/s (optional)', 'blender_world_exported': False}
    out['water_fx'] = {'materials': ['M_Water (tint x T_Water, normal T_Water_Normal)', 'M_WaterFall', 'M_Foam'], 'foam_node': 'EXP_WaterFX_Foam',
                       'runtime_animation': {'river_uv_v_speed': 0.08, 'normal_uv_speed': [0.015, 0.05], 'falls_uv_v_speed': -0.6, 'foam_pulse': 0.15,
                                             'texture_sharing_warning': 'M_Water and M_WaterFall reference the same glTF texture; clone the falls texture and scroll each unique texture once per frame (see preview/index.html stepEffects), otherwise the river runs upstream',
                                             'still_water': 'Scroll only flow_axis uv_v targets (WATER_River: +v offset = downstream; falls: -v offset = down). water_still and box_uv targets have box-projected UVs: give them their own material and do not scroll them, or they drift toward +Y whatever their flow'},
                       'blender_visible': ['depth tint', 'flow streaks', 'ripple normals', 'foam lines', 'impact rings'], 'runtime_only': ['UV flow motion', 'normal scroll', 'foam pulse', 'cloud drift']}
    return out

def stats():
    """Blender-side budget measurement per area (v1 buildings, v2 expansion, remaining environment)."""
    dg = bpy.context.evaluated_depsgraph_get()
    def tri(o):
        return sum(len(p.vertices) - 2 for p in o.evaluated_get(dg).data.polygons)
    res = {}
    ex = bpy.data.objects.get('EXP_ROOT')
    if ex:
        ms = [o for o in ex.children_recursive if o.type == 'MESH']
        res['EXPANSION'] = {'tris': sum(tri(o) for o in ms), 'mesh_objects': len(ms), 'draw_primitives': sum(len(set(p.material_index for p in o.data.polygons)) for o in ms),
                            'by_object': {o.name: tri(o) for o in sorted(ms, key=lambda o: -tri(o))}}
    for key in ('WATER', 'ELEC', 'RATION'):
        r = bpy.data.objects['BLD_%s_ROOT' % key]
        ms = [o for o in r.children_recursive if o.type == 'MESH']
        res[key] = {'tris': sum(tri(o) for o in ms), 'mesh_objects': len(ms), 'draw_primitives': sum(len(set(p.material_index for p in o.data.polygons)) for o in ms),
                    'interior_tris': sum(tri(o) for o in ms if o.get('interior'))}
    other = [o for o in village_objects() if o.type == 'MESH' and building_of(o) is None]
    res['ENV'] = {'tris': sum(tri(o) for o in other), 'mesh_objects': len(other), 'draw_primitives': sum(len(set(p.material_index for p in o.data.polygons)) for o in other),
                  'by_object': {o.name: tri(o) for o in sorted(other, key=lambda o: -tri(o))[:15]}}
    res['TOTAL_tris'] = sum(v['tris'] for v in res.values() if isinstance(v, dict) and 'tris' in v)
    res['materials'] = sorted({m.name for o in village_objects() if o.type == 'MESH' for m in o.data.materials})
    return res
def navigation():
    """Walkable path centre-lines and bridge deck endpoints (glTF coords) for AI / route tests."""
    import terrain as T
    polys = (bpy.app.driver_namespace.get('village_paths') or []) + (bpy.app.driver_namespace.get('expansion_paths') or [])
    ends = bpy.app.driver_namespace.get('bridge_ends') or {}
    paths = []
    for name, w, pts in polys:
        step = max(1, len(pts) // 40)
        sel = pts[::step] + ([pts[-1]] if (len(pts) - 1) % step else [])
        paths.append({'name': name, 'width': w, 'points': [g((p.x, p.y, T.ground(p.x, p.y))) for p in sel]})
    bridges = {}
    for nm, (a, b) in ends.items():
        bridges[nm] = {'west_end': g((a.x, a.y, T.ground(a.x, a.y))), 'east_end': g((b.x, b.y, T.ground(b.x, b.y))),
                       'deck_clear_width': 1.86 if nm == 'BRIDGE_Main' else 1.6}
    return {'paths': paths, 'bridges': bridges, 'min_path_width_m': min([p['width'] for p in paths] or [0])}