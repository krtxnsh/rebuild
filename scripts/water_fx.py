"""water_fx.py - v2 livelier water without simulation or dense geometry.

Blender-visible (static): blue-green depth tint (vertex colours: shallow edges / deeper channel / pools), flow-streak
detail texture, ripple normal map (soft highlights), foam accents and impact ripple rings (separate low-poly mesh).
Runtime-only (three.js, preview/index.html): UV scrolling of the water texture + normal map along the river flow (v),
falls scrolling, gentle foam opacity pulse.  Materials keep their names (M_Water / M_WaterFall) as replacement targets."""
import bpy, bmesh, math, zlib
import numpy as np
from mathutils import Vector
import shared_utils as su
from shared_utils import MB, M, col, smoothstep
import layout as L
import terrain as T
import materials as MT

WATER_COLS = {'deep': '#2e7c8a', 'mid': '#3f9aa6', 'shallow': '#7cc5bb', 'pool': '#368b97', 'basin': '#4aa2a6'}
WC = {k: su.srgb(v) for k, v in WATER_COLS.items()}

def textures():
    n = MT.TEX
    rng = np.random.default_rng(31)
    yy, xx = np.mgrid[0:n, 0:n]
    # flow streaks: stretched noise along v (image rows = v)
    s1 = MT._vnoise(n, 8, rng)
    s1 = np.repeat(s1[::16, :], 16, axis=0)            # elongate along v
    s2 = MT._fbm(n, rng, 4, 4)
    streak = np.clip((s1 - 0.62) * 3.0, 0, 1) * 0.5 + np.clip((s2 - 0.6) * 2.5, 0, 1) * 0.25
    v = 0.88 + 0.12 * MT._fbm(n, rng, 3, 3) + streak * 0.35
    MT._save('T_Water', np.stack([np.clip(v * 0.97, 0, 1), np.clip(v, 0, 1), np.clip(v, 0, 1)], -1))
    # ripple height: a few directional waves (mostly across the flow) + noise, tileable (integer frequencies)
    u = xx / n * 2 * np.pi; w = yy / n * 2 * np.pi
    h = (0.45 * np.sin(3 * w + 2 * u + 2.0 * MT._vnoise(n, 4, rng)) + 0.3 * np.sin(5 * w - 3 * u + 1.0)
         + 0.25 * np.sin(9 * w + 1 * u + 3.0 * MT._vnoise(n, 8, rng)) + 0.35 * (MT._fbm(n, rng, 8, 3) - 0.5))
    MT._save('T_Water_Normal', MT._normal_from_height(h, 1.6), noncolor=True)

def materials():
    textures()
    MT.make_material('M_Water', rough=0.06, tex='T_Water', normal='T_Water_Normal', nstr=0.35, alpha=0.86, vc=True)
    MT.make_material('M_WaterFall', rough=0.1, tex='T_Water', alpha=0.5, double=True, vc=False, base=(0.62, 0.84, 0.92, 1), emission=(0.5, 0.7, 0.85, 1), estr=0.15)
    MT.make_material('M_Foam', rough=0.7, alpha=0.7, double=False, emission=(0.85, 0.92, 0.95, 1), estr=0.08)
    return ['M_Water', 'M_WaterFall', 'M_Foam']

def tint_river():
    ob = bpy.data.objects['WATER_River']
    me = ob.data
    ca = me.color_attributes['Col']
    uv = me.uv_layers['UVMap'].data
    for p in me.polygons:
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            u = uv[li].uv.x
            across = abs(u - 0.5) * 2.0
            depth = 1.0 - smoothstep(0.25, 0.95, across)
            pools = 0.5 + 0.5 * math.sin(co.y * 0.21 + 1.3) * math.sin(co.y * 0.07 + co.x * 0.05)
            c = su.lerpc(WC['shallow'], WC['mid'], smoothstep(0.0, 0.6, depth))
            c = su.lerpc(c, WC['deep'], smoothstep(0.55, 1.0, depth) * (0.55 + 0.45 * pools))
            ca.data[li].color = c
    me.update()
    return len(me.loops)

def tint_basins():
    n = 0
    for name in ('WATER_Surfaces', 'ELEC_PoolWater', 'EXP_Farm_Irrigation'):
        ob = bpy.data.objects.get(name)
        if not ob:
            continue
        ca = ob.data.color_attributes['Col']
        for p in ob.data.polygons:
            c = su.lerpc(WC['basin'], WC['pool'], 0.5 + 0.5 * math.sin(p.center.x * 1.3 + p.center.y))
            for li in p.loop_indices:
                ca.data[li].color = c
        ob.data.update()
        n += 1
    return n

def ring(mb, cx, cy, z, r_in, r_out, seed_, n=12, tail=0.0, tdir=(0, -1)):
    rr = zlib.crc32(seed_.encode())
    v, f = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        j = 1 + 0.18 * math.sin(a * 3 + (rr % 7))
        st = 1.0 + tail * max(0.0, math.cos(a - math.atan2(tdir[1], tdir[0]))) ** 2
        w_ = (r_out - r_in) * (1.0 - 0.45 * (st - 1.0) / max(tail, 1e-3)) if tail > 0 else (r_out - r_in)
        ri = r_in * j * st
        v.append((cx + math.cos(a) * (ri + w_), cy + math.sin(a) * (ri + w_), z))
        v.append((cx + math.cos(a) * ri, cy + math.sin(a) * ri, z))
    for i in range(n):
        k = (i + 1) % n
        f.append((2 * i, 2 * k, 2 * k + 1, 2 * i + 1))
    mb.add((v, f), 'M_Foam', 'foam')

def blob(mb, cx, cy, z, rx, ry, ang, n=8):
    v = [(cx, cy, z)]
    for i in range(n):
        a = 2 * math.pi * i / n
        x, y = math.cos(a) * rx * (1 + 0.2 * math.sin(3 * a)), math.sin(a) * ry
        v.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang), z))
    mb.add((v, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]), 'M_Foam', 'foam')

def foam(G, region):
    mb = MB()
    zw = L.WATER_LEVEL + 0.012
    out = {'rock_rings': 0, 'posts': 0, 'riffles': 0, 'impacts': 0}
    # 1) bank rocks touching the water
    rk = bpy.data.objects.get('ENV_RiverbankRocks')
    if rk:
        bm = bmesh.new(); bm.from_mesh(rk.data)
        seen = set()
        for f in bm.faces:
            if f.index in seen:
                continue
            stack, comp = [f], []
            seen.add(f.index)
            while stack:
                g = stack.pop(); comp.append(g)
                for vv in g.verts:
                    for h in vv.link_faces:
                        if h.index not in seen:
                            seen.add(h.index); stack.append(h)
            vs = {vv for g in comp for vv in g.verts}
            c = sum((vv.co for vv in vs), Vector()) / len(vs)
            r = max((vv.co.xy - c.xy).length for vv in vs)
            d, i = T.stream_dist(c.x, c.y)
            if d < L.stream_halfwidth(c.y) + 0.8 and min(vv.co.z for vv in vs) < L.WATER_LEVEL + 0.05:
                ring(mb, c.x, c.y, zw, r * 1.02, r * 1.02 + 0.05, 'rock%d' % len(seen), tail=0.3)
                out['rock_rings'] += 1
        bm.free()
    # 2) footbridge posts standing in the water + main bridge arch feet
    for nm, y in [('BRIDGE_Main', L.MAIN_BRIDGE_Y)] + list(L.FOOT_BRIDGES):
        p, ang, W_, E_ = T.bridge_frame(y, 5.8 if nm == 'BRIDGE_Main' else 5.2)
        axis = (E_ - W_).normalized()
        nrm = Vector((-axis.y, axis.x, 0))
        offs = [-4.5, 4.5] if nm == 'BRIDGE_Main' else [-1.73, 1.73]
        ys = [-0.96, 0.96] if nm == 'BRIDGE_Main' else [-0.78, 0.78]
        for o_ in offs:
            for s in ys:
                q = p + axis * o_ + nrm * s
                d, _ = T.stream_dist(q.x, q.y)
                if d < L.stream_halfwidth(q.y) + 0.4:
                    ring(mb, q.x, q.y, zw, 0.1, 0.15, '%s%.1f%.1f' % (nm, o_, s), tail=0.8)
                    out['posts'] += 1
    # 3) riffles: a few mid-stream stones with foam streaks (lively but calm); stones go to the nearest region mesh
    rng = __import__('random').Random(77)
    for (y, reg) in ((-8.6, 'Farmstead'), (17.0, 'RearEast'), (40.0, 'RearEast')):
        p, t = T.stream_point_at_y(y)
        nrm = Vector((-t.y, t.x, 0))
        for k in range(4):
            q = p + nrm * rng.uniform(-1.4, 1.4) + Vector((t.x, t.y, 0)) * rng.uniform(-1.2, 1.2)
            r = rng.uniform(0.18, 0.32)
            su.gen_rock(region.setdefault(reg, MB()), M((q.x, q.y, L.WATER_LEVEL - 0.08), (0, 0, rng.uniform(0, 6))), r=r, rng=rng, color='stone_dark', flat=0.55)
            ring(mb, q.x, q.y, zw, r * 1.0, r * 1.0 + 0.05, 'riffle%d%d' % (int(y), k), tail=0.8, tdir=(t.x, t.y))
            ring(mb, q.x, q.y, zw, r * 1.45, r * 1.45 + 0.035, 'riffleb%d%d' % (int(y), k), tail=1.0, tdir=(t.x, t.y))
            for s_ in (-1, 1):
                ang = math.atan2(t.y, t.x)
                ox, oy = -math.sin(ang) * s_ * r * 0.7, math.cos(ang) * s_ * r * 0.7
                blob(mb, q.x + t.x * r * 1.6 + ox, q.y + t.y * r * 1.6 + oy, zw, r * 0.8, 0.025, ang, n=6)
        out['riffles'] += 1
    # 4) impact ripples where falls meet water (waterwheel pool, treatment cascade) + pump intake
    impacts = []
    for nm in ('ELEC_WheelFall', 'WATER_Falls'):
        ob = bpy.data.objects.get(nm)
        if not ob:
            continue
        bm = bmesh.new(); bm.from_mesh(ob.data); bm.transform(ob.matrix_world)
        seen = set()
        for f in bm.faces:
            if f.index in seen:
                continue
            stack, comp = [f], []
            seen.add(f.index)
            while stack:
                g = stack.pop(); comp.append(g)
                for vv in g.verts:
                    for h in vv.link_faces:
                        if h.index not in seen:
                            seen.add(h.index); stack.append(h)
            vs = {vv for g in comp for vv in g.verts}
            low = min(vs, key=lambda vv: vv.co.z)
            lows = [vv.co for vv in vs if vv.co.z < low.co.z + 0.05]
            c = sum(lows, Vector()) / len(lows)
            impacts.append((c, nm))
        bm.free()
    for k, (c, nm) in enumerate(impacts):
        ring(mb, c.x, c.y, c.z + 0.015, 0.12, 0.17, 'imp%d' % k, n=10)
        ring(mb, c.x, c.y, c.z + 0.016, 0.3, 0.33, 'impb%d' % k, n=12)
        out['impacts'] += 1
    ix, iy = L.FARM['intake']
    ring(mb, ix - 0.6, iy, zw, 0.14, 0.19, 'intake', n=10)
    o = mb.build('EXP_WaterFX_Foam', 'VILLAGE_ROOT/13_EXP_WATER_FX', parent=G['WaterFX'])
    su.tag(o, 'EXP_WaterFX_Foam', shader_target='foam', cast_shadow=False, note='foam accents + impact ripple rings; runtime may pulse opacity')
    out['tris'] = mb.tri_count()
    return out

def run(G, region=None):
    region = region if region is not None else {}
    return {'materials': materials(), 'river_loops': tint_river(), 'basins': tint_basins(), 'foam': foam(G, region)}