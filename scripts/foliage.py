"""foliage.py - v2 targeted vegetation edits on the approved merged tree chunks.

1. Moves the single v1 tree whose trunk stood on Road North (blocked navigation) - trunk, branches, canopy and its collider.
2. Recolours every deciduous canopy to a cohesive green palette (per-tree base colour + light top / deeper bottom blobs).
   Conifers keep their darker greens; trunks keep wood colours.  Deterministic from positions -> idempotent."""
import bpy, bmesh, math, colorsys, zlib
from mathutils import Vector
import shared_utils as su
import layout as L
import terrain as T

GREENS = {'fresh': '#6fb04a', 'medium': '#5a983f', 'deep': '#3f7a37', 'cool': '#4f9566', 'highlight': '#8cc463'}
G = {k: su.srgb(v) for k, v in GREENS.items()}
BASES = ['fresh', 'medium', 'deep', 'cool', 'medium', 'fresh']

def components(bm):
    seen, comps = set(), []
    for f in bm.faces:
        if f.index in seen:
            continue
        stack, comp = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop(); comp.append(g)
            for v in g.verts:
                for h in v.link_faces:
                    if h.index not in seen:
                        seen.add(h.index); stack.append(h)
        comps.append(comp)
    return comps

def analyse(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    mats = [m.name for m in ob.data.materials]
    trunks, canopy, cones, other = [], [], [], []
    for comp in components(bm):
        vs = {v for f in comp for v in f.verts}
        cen = sum((v.co for v in vs), Vector()) / len(vs)
        zmin = min(v.co.z for v in vs)
        mat = mats[comp[0].material_index]
        rec = dict(faces=[f.index for f in comp], verts=[v.index for v in vs], c=cen, zmin=zmin, n=len(vs))
        if mat == 'M_Wood':
            if abs(zmin - T.ground(cen.x, cen.y)) < 0.45 and len(vs) >= 10:
                base = [v.co for v in vs if v.co.z < zmin + 0.05]
                rec['base'] = Vector((sum(p.x for p in base) / len(base), sum(p.y for p in base) / len(base)))
                trunks.append(rec)
            else:
                other.append(rec)
        elif len(vs) > 30:
            canopy.append(rec)
        else:
            cones.append(rec)
    bm.free()
    return trunks, canopy, cones, other

def nearest(trunks, p):
    return min(trunks, key=lambda t: (t['base'] - p.xy).length) if trunks else None

def move_road_tree():
    moved = []
    for (ox, oy), (nx, ny) in L.MOVED_TREES.items():
        for ob in [o for o in bpy.data.objects if o.name.startswith('VEG_Trees')]:
            trunks, canopy, cones, other = analyse(ob)
            if not trunks:
                continue
            hit = [t for t in trunks if (t['base'] - Vector((ox, oy))).length < 0.6]
            if not hit:
                continue
            tr = hit[0]
            delta = Vector((nx - ox, ny - oy, T.ground(nx, ny) - T.ground(ox, oy)))
            vids = set(tr['verts'])
            for rec in canopy + cones + other:
                owner = nearest(trunks, rec['c'])
                if owner is tr:
                    vids |= set(rec['verts'])
            me = ob.data
            for i in vids:
                me.vertices[i].co += delta
            me.update()
            # its trunk collider (capsule empty) follows
            for c in bpy.data.objects:
                if c.name.startswith('COL_Tree_') and (Vector(c.location[:2]) - Vector((ox, oy))).length < 0.3:
                    c.location = (nx, ny, c.location.z + delta.z)
            moved.append({'object': ob.name, 'from': [ox, oy], 'to': [nx, ny], 'verts': len(vids)})
    return moved

def greenify():
    stats = {}
    for ob in [o for o in bpy.data.objects if o.name.startswith('VEG_Trees')]:
        trunks, canopy, cones, other = analyse(ob)
        me = ob.data
        ca = me.color_attributes['Col']
        groups = {}
        for rec in canopy:
            t = nearest(trunks, rec['c'])
            key = (round(t['base'].x, 1), round(t['base'].y, 1)) if t else (round(rec['c'].x), round(rec['c'].y))
            groups.setdefault(key, []).append(rec)
        loops = {}
        for p in me.polygons:
            loops[p.index] = list(p.loop_indices)
        n = 0
        for key, recs in groups.items():
            h = zlib.crc32(('%.1f,%.1f' % key).encode())
            base = G[BASES[h % len(BASES)]]
            zs = sorted(r['c'].z for r in recs)
            for r in recs:
                rank = (zs.index(r['c'].z) / max(1, len(zs) - 1)) if len(zs) > 1 else 0.5
                f = 0.06 * (((h >> (3 + int(r['c'].x * 7) % 8)) & 7) / 7.0 - 0.5)
                c = su.lerpc(base, G['highlight'], 0.32 * rank) if rank > 0.5 else su.lerpc(base, G['deep'], 0.18 * (1 - rank))
                c = (min(1, c[0] * (1 + f)), min(1, c[1] * (1 + f)), min(1, c[2] * (1 + f)), 1.0)
                for fi in r['faces']:
                    for li in loops[fi]:
                        ca.data[li].color = c
                n += 1
        me.update()
        stats[ob.name] = {'trees': len(groups), 'canopy_blobs': n, 'conifer_cones_kept': len(cones)}
    return stats

def audit():
    """Count canopy faces whose hue is outside green (orange/yellow/brown) - must be zero."""
    bad, total = 0, 0
    for ob in [o for o in bpy.data.objects if o.name.startswith('VEG_Trees')]:
        trunks, canopy, cones, other = analyse(ob)
        ca = ob.data.color_attributes['Col']
        for rec in canopy + cones:
            fi = rec['faces'][0]
            li = ob.data.polygons[fi].loop_indices[0]
            r, g, b, a = ca.data[li].color
            hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
            total += 1
            if hh < 0.19 or ss < 0.12:
                bad += 1
    return {'canopy_components': total, 'non_green_or_autumn': bad, 'rule': 'hue < 0.19 (red/orange/yellow/brown) or saturation < 0.12 counts as non-green; includes conifers'}

def run():
    return {'moved': move_road_tree(), 'recolour': greenify(), 'audit': audit()}