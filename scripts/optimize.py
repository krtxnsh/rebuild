"""optimize.py - deterministic post-build optimisation pass (re-run after every rebuild).

* Merges static, non-interactive exterior meshes of each building into one object (draw calls = material count).
* Merges per-stage water surfaces and the electricity cables into single objects (still separate from other geometry).
* Unifies M_Fabric + M_Organic into M_Soft (both double-sided, vertex coloured) and dedupes material slots.
Interactable objects, roof groups, interiors and water/shader targets stay separate."""
import bpy, bmesh
import shared_utils as su
import materials as MT

MERGE = {
    'ELEC': ('ELEC_ExteriorStatic', ['ELEC_Shell', 'ELEC_ExteriorProps', 'ELEC_WindowGlass', 'ELEC_LanternGlass'], 'Exterior'),
    'WATER': ('WATER_ExteriorStatic', ['WATER_Shell', 'WATER_ExteriorProps', 'WATER_WindowGlass', 'WATER_TankTower', 'WATER_Basins', 'WATER_Trough'], 'Exterior'),
    'RATION': ('RATION_ExteriorStatic', ['RATION_Shell', 'RATION_ExteriorProps', 'RATION_WindowGlass', 'RATION_LanternGlass', 'RATION_Awning',
                                         'RATION_Stall_01', 'RATION_Stall_02', 'RATION_Cart', 'RATION_GroundProduce'], 'Exterior'),
}
GROUPS = [
    ('WATER_Surfaces', [n for n in ('WATER_Surface_Collection', 'WATER_Surface_Sedimentation', 'WATER_Surface_Filtration', 'WATER_Surface_Basin_01',
                                    'WATER_Surface_Basin_02', 'WATER_Surface_Trough', 'WATER_Surface_Distribution', 'WATER_Surface_Tank', 'WATER_Surface_Well')],
     dict(shader_target='water_still', note='all treatment-stage water surfaces; per-stage objects remain the WATER_* stage interactables')),
    ('ELEC_Cables', ['ELEC_Cable_01', 'ELEC_Cable_02', 'ELEC_Cable_03', 'ELEC_Cable_04', 'ELEC_Cable_05'],
     dict(interactable=True, note='overhead wires: separate geometry from poles/house; ELEC_Cable semantic id')),
    ('VEG_Trees_Far', ['VEG_Trees_Far', 'VEG_Pines_Far'], dict(static=True, chunk=True)),
]

def join(target, names, sid, props):
    objs = [bpy.data.objects[n] for n in names if n in bpy.data.objects]
    if len(objs) < 2:
        return None
    parent = objs[0].parent
    colls = list(objs[0].users_collection)
    # bake each object's local transform relative to the shared parent into a fresh mesh
    bm = bmesh.new()
    mats = []
    col_layer = None
    for o in objs:
        me = o.data
        tmp = bmesh.new(); tmp.from_mesh(me)
        rel = (parent.matrix_world.inverted() @ o.matrix_world) if parent else o.matrix_world
        bmesh.ops.transform(tmp, matrix=rel, verts=tmp.verts)
        remap = []
        for m in me.materials:
            if m.name not in [x.name for x in mats]:
                mats.append(m)
            remap.append([x.name for x in mats].index(m.name))
        for f in tmp.faces:
            f.material_index = remap[f.material_index] if f.material_index < len(remap) else 0
        tmp_me = bpy.data.meshes.new('_tmp')
        for m in mats:
            tmp_me.materials.append(m)          # keep indices valid (to_mesh/from_mesh clamp to slot count)
        tmp.to_mesh(tmp_me); tmp.free()
        bm.from_mesh(tmp_me)
        bpy.data.meshes.remove(tmp_me)
    me = bpy.data.meshes.new(target)
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    if me.color_attributes:
        me.color_attributes.active_color = me.color_attributes[0]
        me.color_attributes.render_color_index = 0
    for o in objs:
        old = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if old.users == 0:
            bpy.data.meshes.remove(old)
    ob = bpy.data.objects.new(target, me)
    for c in colls:
        c.objects.link(ob)
    ob.parent = parent
    su.tag(ob, sid, merged_from=names, **props)
    return ob

def unify_soft():
    soft = MT.make_material('M_Soft', rough=0.85, double=True)
    n = 0
    for me in bpy.data.meshes:
        for i, m in enumerate(me.materials):
            if m and m.name in ('M_Fabric', 'M_Organic'):
                me.materials[i] = soft; n += 1
        dedupe_slots(me)
    for nm in ('M_Fabric', 'M_Organic'):
        m = bpy.data.materials.get(nm)
        if m and m.users == 0:
            bpy.data.materials.remove(m)
    return n

def dedupe_slots(me):
    names = [m.name if m else None for m in me.materials]
    uniq = []
    for n in names:
        if n not in uniq:
            uniq.append(n)
    if len(uniq) == len(names):
        return
    remap = [uniq.index(n) for n in names]
    idx = [0] * len(me.polygons)
    me.polygons.foreach_get('material_index', idx)
    idx = [remap[i] if i < len(remap) else 0 for i in idx]
    keep = [me.materials[names.index(n)] for n in uniq]
    me.materials.clear()
    for m in keep:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', idx)

def run():
    out = {}
    for key, (target, names, grp) in MERGE.items():
        ob = join(target, names, target, dict(static=True, cutaway_safe=True))
        out[target] = len(set(p.material_index for p in ob.data.polygons)) if ob else None
    for target, names, props in GROUPS:
        sid = 'ELEC_Cable' if target == 'ELEC_Cables' else target
        ob = join(target, names, sid, props)
        out[target] = bool(ob)
    out['soft_slots_remapped'] = unify_soft()
    return out