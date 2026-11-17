"""sky.py - v2 cheerful daylight: blue gradient world (Blender renders), warm sun with softer shadows, lightweight
stylised cloud clusters (single mesh, one material, no shadows) and gentle aerial-perspective haze on far terrain.
Blender World settings do not export to glTF - preview/index.html implements the browser sky dome, fog, hemisphere
light and slow cloud drift.  See reports/expansion_report.md."""
import bpy, math, random, zlib
from mathutils import Vector
import shared_utils as su
from shared_utils import MB, M, col, smoothstep
import materials as MT

SKY = {'horizon': (0.80, 0.89, 0.98, 1), 'mid': (0.34, 0.58, 0.95, 1), 'zenith': (0.09, 0.30, 0.88, 1)}

def world():
    w = bpy.data.worlds['W_Village']
    nt = w.node_tree
    ramp = [n for n in nt.nodes if n.type == 'VALTORGB'][0]
    els = ramp.color_ramp.elements
    while len(els) > 2:
        els.remove(els[-1])
    els[0].position, els[0].color = 0.0, SKY['horizon']
    els[1].position, els[1].color = 0.55, SKY['zenith']
    e = els.new(0.12); e.color = SKY['mid']
    bg = [n for n in nt.nodes if n.type == 'BACKGROUND'][0]
    bg.inputs['Strength'].default_value = 1.15
    sun = bpy.data.objects['LIGHT_Sun']
    sun.data.energy = 4.0
    sun.data.color = (1.0, 0.94, 0.82)
    sun.data.angle = math.radians(2.2)
    return {'world_strength': 1.15, 'sun_energy': 4.0}

def clouds(G):
    MT.make_material('M_Cloud', rough=1.0, emission=(0.93, 0.95, 1.0, 1), estr=0.55)
    rng = random.Random(zlib.crc32(b'clouds'))
    mb = MB()
    specs = [(-62, 8.5, 260), (-38, 6.0, 300), (-15, 11.0, 240), (8, 6.5, 330), (27, 9.5, 280), (52, 7.0, 300), (80, 13.0, 230),
             (115, 9.0, 260), (160, 12.0, 250), (205, 10.0, 270), (250, 14.0, 240), (-100, 12.0, 250), (-8, 4.6, 360), (40, 4.8, 370),
             (-30, 21.0, 230), (12, 26.0, 210), (44, 19.0, 240), (-55, 24.0, 220), (75, 23.0, 230), (-3, 17.0, 250)]
    for k, (az, elev, dist) in enumerate(specs):
        a = math.radians(90 - az)
        cx, cy = math.cos(a) * dist, 10 + math.sin(a) * dist
        cz = 2 + math.tan(math.radians(elev)) * dist
        s = dist / 260.0 * rng.uniform(0.85, 1.25)
        blobs = rng.randint(4, 6)
        for b in range(blobs):
            t = (b - (blobs - 1) / 2) / max(1, blobs - 1)
            r = (9 + 6 * (1 - abs(t) * 1.6) * rng.uniform(0.7, 1.1)) * s
            bx = cx + math.cos(a + math.pi / 2) * t * 42 * s + rng.uniform(-3, 3) * s
            by = cy + math.sin(a + math.pi / 2) * t * 42 * s + rng.uniform(-3, 3) * s
            bz = cz + r * 0.25 + rng.uniform(-1, 3) * s
            v, f = su.prim_ico(r, 2)
            vv = [(p[0], p[1], max(p[2] * 0.62, -r * 0.18)) for p in v]
            cols = []
            for face in f:
                zc = sum(vv[i][2] for i in face) / 3
                cols.append(su.lerpc((0.80, 0.85, 0.93, 1), (0.99, 0.99, 1.0, 1), smoothstep(-0.18 * r, 0.35 * r, zc)))
            mb.add((vv, f), 'M_Cloud', lambda i, cols=cols: cols[i], M((bx, by, bz)), smooth=True)
    o = mb.build('EXP_Sky_Clouds', 'VILLAGE_ROOT/14_EXP_SKY', parent=G['Sky'])
    su.tag(o, 'EXP_Sky_Clouds', shader_target='clouds', cast_shadow=False, receive_shadow=False, drift='rotate about +Y through world origin, ~0.004 rad/s')
    return {'clouds': len(specs), 'tris': mb.tri_count()}

def haze():
    """Aerial perspective on distant terrain + far trees (idempotent: tints from stored v1 colours)."""
    haze_c = su.lerpc(SKY['horizon'], (0.55, 0.68, 0.78, 1), 0.35)
    n = 0
    for name, d0, d1, kmax in (('TERRAIN_FarHills', 90.0, 300.0, 0.55), ('VEG_Trees_Far', 60.0, 130.0, 0.2)):
        ob = bpy.data.objects.get(name)
        if not ob:
            continue
        me = ob.data
        ca = me.color_attributes['Col']
        if 'Col_v1' not in me.color_attributes:
            cv = me.color_attributes.new('Col_v1', 'FLOAT_COLOR', ca.domain)
            buf = [0.0] * (len(ca.data) * 4)
            ca.data.foreach_get('color', buf)
            cv.data.foreach_set('color', buf)
            me.color_attributes.active_color = ca
            me.color_attributes.render_color_index = list(me.color_attributes).index(ca)
        src = me.color_attributes['Col_v1']
        for p in me.polygons:
            d = math.hypot(p.center.x, p.center.y - 10)
            k = smoothstep(d0, d1, d) * kmax
            for li in p.loop_indices:
                c = src.data[li].color
                ca.data[li].color = (c[0] + (haze_c[0] - c[0]) * k, c[1] + (haze_c[1] - c[1]) * k, c[2] + (haze_c[2] - c[2]) * k, 1.0)
        me.update()
        n += 1
    return n

def run(G):
    return {'world': world(), 'clouds': clouds(G), 'haze_objects': haze()}