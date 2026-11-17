"""environment.py - vegetation, riverbank dressing, village props, lighting, cameras and gameplay markers.
Static dressing is merged by material into spatial chunks (fewer draw calls, culling preserved)."""
import bpy, math, random
from mathutils import Vector, noise
import shared_utils as su
from shared_utils import MB, M, col, smoothstep
import layout as L
import terrain as T
import scene_setup as SS

DECIDUOUS = [(-26, -12, 1.2, 'g'), (-29, 2, 1.3, 'y'), (-24.5, 14, 1.1, 'g'), (-21, 24, 1.2, 'y'), (-31, 21, 1.0, 'g'),
             (-16, 26, 1.2, 'g'), (-7, 28, 1.3, 'y'), (-12, 33, 1.1, 'o'), (3.5, 36, 1.2, 'g'), (14, 31, 1.3, 'y'),
             (21, 23, 1.1, 'g'), (24, 13, 1.3, 'y'), (27, 2, 1.2, 'g'), (25, -10, 1.1, 'o'), (-23, -21, 1.1, 'g'),
             (19, -21, 1.2, 'y'), (-34, -4, 1.2, 'o'), (33, 9, 1.2, 'g'), (-19, 38, 1.0, 'g'), (9, 45, 1.2, 'o'),
             (-2, 44, 1.1, 'g'), (28, 30, 1.1, 'y'), (-36, 12, 1.1, 'y'), (36, -16, 1.3, 'g'), (-33, -24, 1.2, 'y')]
PALETTES = {'g': ('leaf_green', 'leaf_dark', 'leaf_lime'), 'y': ('leaf_yellow', 'leaf_lime', 'leaf_orange'), 'o': ('leaf_orange', 'leaf_yellow', 'leaf_yellow')}

def ok_spot(x, y, path_fn, margin=1.0, bmargin=1.0):
    d, _ = T.stream_dist(x, y)
    if d < L.stream_halfwidth(y) + 0.9:
        return False
    if path_fn(x, y) < margin:
        return False
    for k, b in L.BUILDINGS.items():
        if math.hypot(x - b['loc'][0], y - b['loc'][1]) < b['pad_r'] * bmargin:
            return False
    for nm, yb in [('m', L.MAIN_BRIDGE_Y)] + [(n, y_) for n, y_ in L.FOOT_BRIDGES]:
        p, _ = T.stream_point_at_y(yb)
        if math.hypot(x - p.x, y - p.y) < 7.0:
            return False
    return True

def tree(mb_trunk, mb_leaf, x, y, s, pal, rng):
    z = T.ground(x, y) - 0.1
    h = 3.0 * s
    mb_trunk.add(su.prim_cyl(0.28 * s, h, 7, r2=0.16 * s), 'M_Wood', col('bark', 0.08, rng), M((x, y, z), (rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05), 0)), smooth=True)
    for k in range(2):
        a = rng.uniform(0, 6.28)
        p0 = Vector((x, y, z + h * 0.6))
        p1 = p0 + Vector((math.cos(a) * 0.9 * s, math.sin(a) * 0.9 * s, 0.9 * s))
        mb_trunk.add(su.prim_tube([p0, p1], 0.09 * s, 5), 'M_Wood', 'bark', smooth=True)
    blobs = [(0, 0, h + 1.3 * s, 1.65 * s)]
    for k in range(5):
        a = k * 2 * math.pi / 5 + rng.uniform(-0.3, 0.3)
        rr = rng.uniform(0.9, 1.3) * s
        blobs.append((math.cos(a) * rr, math.sin(a) * rr, h + rng.uniform(0.5, 1.4) * s, rng.uniform(1.0, 1.35) * s))
    for (bx, by, bz, br) in blobs:
        v, f = su.prim_ico(br, 2)
        vv = []
        for p in v:
            n = noise.noise(Vector((p[0] * 1.7 + x, p[1] * 1.7 + y, p[2] * 1.7))) * 0.12
            vv.append((p[0] * (1 + n), p[1] * (1 + n), p[2] * (0.85 + n)))
        c = su.lerpc(pal[0], rng.choice(pal[1:]), rng.uniform(0.0, 0.5))
        mb_leaf.add((vv, f), 'M_Organic', c, M((x + bx, y + by, z + bz)), smooth=True)

def pine(mb_trunk, mb_leaf, x, y, s, rng):
    z = T.ground(x, y) - 0.1
    mb_trunk.add(su.prim_cyl(0.2 * s, 1.4 * s, 6, r2=0.14 * s), 'M_Wood', 'bark', M((x, y, z)), smooth=True)
    for k in range(4):
        r = (1.6 - k * 0.32) * s
        mb_leaf.add(su.prim_cyl(r, 1.9 * s, 8, r2=0.05 * s, caps=(True, False)), 'M_Organic', col(rng.choice(['pine', 'pine_dark']), 0.06, rng),
                    M((x, y, z + (1.1 + k * 1.15) * s), (0, 0, rng.uniform(0, 1))), smooth=True)

def grass_clump(mb, x, y, z, rng, c):
    for k in range(5):
        a = rng.uniform(0, 6.28)
        h = rng.uniform(0.22, 0.42)
        bx, by = x + math.cos(a) * 0.06, y + math.sin(a) * 0.06
        tip = (bx + math.cos(a) * 0.1, by + math.sin(a) * 0.1, z + h)
        w = 0.035
        mb.add(([(bx - w * math.sin(a), by + w * math.cos(a), z), (bx + w * math.sin(a), by - w * math.cos(a), z), tip], [(0, 1, 2)]), 'M_Organic', col(c, 0.1, rng))

def build():
    polys = bpy.app.driver_namespace.get('village_paths')
    path_fn = T.path_dist_fn(polys)
    rng = random.Random(404)
    C = 'VILLAGE_ROOT/04_VEGETATION'
    chunks = {}
    def chunk(name):
        if name not in chunks:
            chunks[name] = (MB(), MB())
        return chunks[name]
    def region(x, y):
        if y > 38 or abs(x) > 40:
            return 'Far'
        return 'West' if x < -6 else ('East' if x > 6 else 'Centre')
    for (x, y, s, p) in DECIDUOUS:
        t_, l_ = chunk('Trees_' + region(x, y))
        tree(t_, l_, x, y, s, PALETTES[p], rng)
    # pines on the background hills and sides
    n = 0
    tries = 0
    while n < 55 and tries < 2000:
        tries += 1
        x, y = rng.uniform(-80, 80), rng.uniform(34, 100)
        if abs(x) < 34 and y < 46:
            continue
        if not ok_spot(x, y, path_fn, 2.0):
            continue
        t_, l_ = chunk('Pines_Far')
        pine(t_, l_, x, y, rng.uniform(1.1, 1.8), rng)
        n += 1
    for k in range(10):
        x, y = rng.uniform(-40, -26), rng.uniform(25, 45)
        if ok_spot(x, y, path_fn, 2.0):
            t_, l_ = chunk('Pines_Far')
            pine(t_, l_, x, y, rng.uniform(1.0, 1.5), rng)
    for k in range(10):
        x, y = rng.uniform(28, 45), rng.uniform(18, 40)
        if ok_spot(x, y, path_fn, 2.0):
            t_, l_ = chunk('Pines_Far')
            pine(t_, l_, x, y, rng.uniform(1.0, 1.5), rng)
    # shrubs, grass and flowers (village area)
    gm = {}
    def gchunk(x, y):
        key = ('W' if x < 0 else 'E') + ('N' if y > 6 else 'S')
        if key not in gm:
            gm[key] = MB()
        return gm[key]
    placed = 0
    for k in range(5000):
        if placed > 900:
            break
        x, y = rng.uniform(-38, 38), rng.uniform(-30, 40)
        if not ok_spot(x, y, path_fn, 0.4, 0.75):
            continue
        z = T.ground(x, y)
        mb = gchunk(x, y)
        r = rng.random()
        if r < 0.62:
            grass_clump(mb, x, y, z, rng, rng.choice(['grass', 'grass_dark', 'leaf_lime']))
        elif r < 0.9:
            c = rng.choice(['flower_yellow', 'flower_white', 'flower_pink', 'flower_blue', 'flower_purple'])
            for q in range(rng.randint(2, 4)):
                fx, fy = x + rng.uniform(-0.25, 0.25), y + rng.uniform(-0.25, 0.25)
                fz = T.ground(fx, fy)
                mb.add(([(fx - 0.01, fy, fz), (fx + 0.01, fy, fz), (fx, fy, fz + 0.2)], [(0, 1, 2)]), 'M_Organic', 'leaf_green')
                v, f = su.prim_ico(0.05, 1)
                mb.add((v, f), 'M_Organic', c, M((fx, fy, fz + 0.21), (0, 0, 0), (1, 1, 0.6)), smooth=True)
        else:
            for q in range(3):
                v, f = su.prim_ico(rng.uniform(0.3, 0.5), 2)
                mb.add((v, f), 'M_Organic', col(rng.choice(['leaf_green', 'leaf_dark']), 0.08, rng), M((x + rng.uniform(-0.4, 0.4), y + rng.uniform(-0.4, 0.4), z + 0.15), (0, 0, q), (1, 1, 0.75)), smooth=True)
        placed += 1
    out = []
    for name, (t_, l_) in chunks.items():
        t_.merge(l_)
        o = t_.build('VEG_' + name, C)
        su.tag(o, 'VEG_' + name, static=True, chunk=True, collider='trunks_only')
        out.append(o.name)
    for key, mb in gm.items():
        o = mb.build('VEG_GroundCover_' + key, C)
        su.tag(o, 'VEG_GroundCover', instance_id='VEG_GroundCover_' + key, static=True, chunk=True, collider='none')
        out.append(o.name)
    # trunk colliders (simple capsules)
    for i, (x, y, s, p) in enumerate(DECIDUOUS):
        T.collider('COL_Tree_%02d' % i, (x, y, T.ground(x, y) + 1.5 * s), (0, 0, 0), (0.35 * s, 0.35 * s, 1.5 * s), shape='capsule')
    banks()
    props(path_fn, rng)
    return out

def banks():
    rng = random.Random(505)
    pts, _ = T.stream_samples()
    rocks, reeds = MB(), MB()
    bridges = [T.stream_point_at_y(L.MAIN_BRIDGE_Y)[0]] + [T.stream_point_at_y(y)[0] for _, y in L.FOOT_BRIDGES]
    for i in range(0, len(pts) - 2, 9):
        p = pts[i]
        if p.y > 60 or p.y < -45:
            continue
        t = (pts[i + 2] - p).normalized()
        nrm = Vector((-t.y, t.x, 0))
        hw = L.stream_halfwidth(p.y)
        for s in (-1, 1):
            q = p + nrm * s * (hw + rng.uniform(0.55, 1.05)) + t * rng.uniform(-0.6, 0.6)
            if min((q - b).length for b in bridges) < 2.6:
                continue
            z = T.ground(q.x, q.y)
            su.gen_rock(rocks, M((q.x, q.y, max(z, L.WATER_LEVEL) - 0.05), (0, 0, rng.uniform(0, 6))), r=rng.uniform(0.25, 0.55), rng=rng, color=rng.choice(['stone', 'stone_light', 'stone_dark']), flat=0.6)
            if rng.random() < 0.35:
                rr = p + nrm * s * (hw + rng.uniform(0.25, 0.55)) + t * rng.uniform(-1, 1)
                for k in range(7):
                    a = rng.uniform(0, 6.28)
                    b0 = Vector((rr.x + math.cos(a) * 0.15, rr.y + math.sin(a) * 0.15, L.WATER_LEVEL - 0.05))
                    tip = b0 + Vector((rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), rng.uniform(0.8, 1.3)))
                    reeds.add(([tuple(b0 + Vector((0.025, 0, 0))), tuple(b0 - Vector((0.025, 0, 0))), tuple(tip)], [(0, 1, 2)]), 'M_Organic', col('grass_dark', 0.1, rng))
                    if k < 2:
                        reeds.add(su.prim_cyl(0.03, 0.18, 6), 'M_Organic', 'lentil', M(tuple(b0 + (tip - b0) * 0.8)), smooth=True)
    # lily pads in calm stretch near the foreground footbridge
    for k in range(9):
        p, t = T.stream_point_at_y(-19 - k * 0.9)
        nrm = Vector((-t.y, t.x, 0))
        q = p + nrm * rng.uniform(-1.6, -0.6)
        reeds.add(su.prim_cyl(rng.uniform(0.18, 0.28), 0.01, 10), 'M_Organic', col('leaf_green', 0.1, rng), M((q.x, q.y, L.WATER_LEVEL + 0.01)))
        if k % 3 == 0:
            reeds.add(su.prim_ico(0.06, 2), 'M_Organic', 'flower_pink', M((q.x, q.y, L.WATER_LEVEL + 0.06), (0, 0, 0), (1, 1, 0.6)), smooth=True)
    o = rocks.build('ENV_RiverbankRocks', 'VILLAGE_ROOT/01_WATER_SYSTEM'); su.tag(o, 'ENV_RiverbankRocks', static=True)
    o = reeds.build('VEG_Reeds_LilyPads', 'VILLAGE_ROOT/04_VEGETATION'); su.tag(o, 'VEG_Reeds_LilyPads', static=True)
    # invisible river boundary colliders (safe edges) along both banks in the village span
    k = 0
    for i in range(0, len(pts) - 24, 24):
        a, b = pts[i], pts[i + 24]
        if a.y > 40 or a.y < -35:
            continue
        mid = (a + b) / 2
        if min((mid - bb).length for bb in bridges) < 4.5:
            continue
        d = b - a
        t = d.normalized(); nrm = Vector((-t.y, t.x, 0))
        for s in (-1, 1):
            c = mid + nrm * s * (L.stream_halfwidth(mid.y) + 0.3)
            T.collider('COL_RiverEdge_%03d' % k, (c.x, c.y, 0.5), (0, 0, math.atan2(d.y, d.x)), (d.length / 2, 0.15, 1.0))
            k += 1

def rail_fence(mb, a, b, rng, h=0.95):
    a, b = Vector(a), Vector(b)
    d = b - a
    n = max(1, int(d.length / 1.8))
    za = lambda p: T.ground(p.x, p.y)
    for k in range(n + 1):
        p = a + d * (k / n)
        mb.box((0.13, 0.13, h + 0.3), (p.x, p.y, za(p) + (h + 0.3) / 2 - 0.25), (0, 0, math.atan2(d.y, d.x) + rng.uniform(-0.05, 0.05)), mat='M_Wood', color=col('timber_warm', 0.08, rng), bevel=0.02)
    for zr in (0.4, 0.82):
        pts = [a + d * (k / n) for k in range(n + 1)]
        mb.sweep([Vector((p.x, p.y, za(p) + zr)) for p in pts], su.rect_profile(0.06, 0.11), color=col('wood_light', 0.06, rng))

def find_spot(x, y, path_fn, min_d=0.7):
    """Nearest point (spiral search) that is off the walkable path and out of the stream."""
    for k in range(200):
        a = k * 0.9; r = 0.15 * k
        px, py = x + math.cos(a) * r, y + math.sin(a) * r
        d, _ = T.stream_dist(px, py)
        if path_fn(px, py) >= min_d and d > L.stream_halfwidth(py) + 1.8:
            return px, py
    return x, y

def props(path_fn, rng):
    C = 'VILLAGE_ROOT/05_ENVIRONMENT_PROPS'
    mb, glass = MB(), MB()
    ends = bpy.app.driver_namespace['bridge_ends']
    rw, re_ = ends['BRIDGE_Main']
    # rail fences framing the paths near the bridge and the stream bank (as in the wide reference)
    for (a, b) in (((re_.x + 1.8, re_.y - 1.6), (re_.x + 5.5, re_.y - 4.2)), ((rw.x - 2.0, rw.y - 1.8), (rw.x - 4.5, rw.y - 6.0)),
                   ((4.5, -8.0), (6.5, -12.0)), ((-4.8, 8.5), (-3.6, 4.6))):
        rail_fence(mb, a, b, rng)
    # benches
    for (x, y, yaw) in ((rw.x - 2.6, rw.y + 2.2, 0.4), (re_.x + 3.2, re_.y + 2.6, -0.6)):
        x, y = find_spot(x, y, path_fn, 1.2)
        z = T.ground(x, y)
        m = M((x, y, z), (0, 0, yaw))
        mb.box((1.5, 0.42, 0.07), (0, 0, 0.45), mat='M_Wood', color='wood_light', matrix=m, bevel=0.015)
        mb.box((1.5, 0.06, 0.32), (0, 0.2, 0.75), (math.radians(-12), 0, 0), mat='M_Wood', color='wood_light', matrix=m, bevel=0.01)
        for s in (-1, 1):
            mb.box((0.08, 0.4, 0.45), (s * 0.62, 0, 0.22), mat='M_Wood', color='timber_mid', matrix=m)
    # signpost with legible destination boards
    sx, sy = find_spot(rw.x - 1.6, rw.y - 2.4, path_fn, 0.6)
    z = T.ground(sx, sy)
    sp = MB()
    sp.box((0.14, 0.14, 2.3), (0, 0, 1.15), mat='M_Wood', color='timber_mid', bevel=0.02)
    for k, (txt, yaw, zz) in enumerate((('SHOP', math.radians(200), 1.95), ('WATER', math.radians(110), 1.65), ('POWER', math.radians(10), 1.35))):
        m = M((0, 0, zz), (0, 0, yaw))
        sp.box((0.95, 0.05, 0.24), (0.52, 0, 0), mat='M_Wood', color='wood_light', matrix=m, bevel=0.015)
        sp.add(([(0.99, -0.026, -0.12), (0.99, -0.026, 0.12), (1.12, -0.026, 0.0)], [(0, 2, 1)]), 'M_Wood', 'wood_light', m)
        for side in (-1, 1):
            tv, tf = su.gen_text(txt, size=0.15, extrude=0.003)
            rot = (math.pi / 2, 0, 0) if side < 0 else (math.pi / 2, 0, math.pi)
            sp.add((tv, tf), 'M_Wood', 'timber_dark', m @ M((0.5, side * 0.03, -0.0), rot))
    o = sp.build('ENV_Signpost', C, loc=(sx, sy, z)); su.tag(o, 'ENV_Signpost', legible_text_geometry=True)
    T.collider('COL_ENV_Signpost', (sx, sy, z + 1.0), (0, 0, 0), (0.12, 0.12, 1.0))
    # lamp posts along the main route
    for i, (x, y) in enumerate(((rw.x - 3.0, rw.y - 0.6), (re_.x + 2.0, re_.y + 0.9), (-9.6, 6.8), (8.9, 0.6))):
        x, y = find_spot(x, y, path_fn, 0.6)
        z = T.ground(x, y)
        mb.add(su.prim_cyl(0.07, 2.4, 8), 'M_Metal', 'iron', M((x, y, z)), smooth=True)
        mb.box((0.5, 0.05, 0.05), (x + 0.22, y, z + 2.38), mat='M_Metal', color='iron')
        su.gen_lantern(mb, glass, M((x + 0.42, y, z + 1.95)), 1.2)
        mb.add(su.prim_cyl(0.006, 0.08, 4), 'M_Metal', 'iron', M((x + 0.42, y, z + 2.34)))
        T.collider('COL_ENV_LampPost_%02d' % i, (x, y, z + 1.2), (0, 0, 0), (0.1, 0.1, 1.2))
    # scattered barrels / crates / rocks along the village edges
    for (x, y) in ((-6.4, -6.5), (7.2, 5.8), (-7.6, 10.4), (6.5, 14.5)):
        if not ok_spot(x, y, path_fn, 0.6, 0.8):
            continue
        z = T.ground(x, y)
        su.gen_barrel(mb, M((x, y, z - 0.03), (0, 0, rng.uniform(0, 3))), rng=rng)
        su.gen_crate(mb, M((x + 0.65, y + 0.2, z - 0.02), (0, 0, rng.uniform(0, 3))), rng=rng)
    for k in range(60):
        x, y = rng.uniform(-40, 40), rng.uniform(-28, 42)
        if not ok_spot(x, y, path_fn, 0.5, 0.8):
            continue
        su.gen_rock(mb, M((x, y, T.ground(x, y) - 0.05), (0, 0, rng.uniform(0, 6))), r=rng.uniform(0.2, 0.7), rng=rng, color=rng.choice(['stone', 'stone_light']), flat=0.55)
    o = mb.build('ENV_VillageProps', C); su.tag(o, 'ENV_VillageProps', static=True)
    o = glass.build('ENV_LampGlass', C); su.tag(o, 'ENV_LampGlass', emissive=True, toggle='emissive')

def lights_cameras_markers():
    SS.add_sun()
    LC = su.coll('VILLAGE_ROOT/06_LIGHTING')
    for nm, key, p, e in (('LIGHT_Elec_Interior', 'ELEC', (0, 0.3, 2.6), 60), ('LIGHT_Water_Interior', 'WATER', (0.4, 0.0, 2.4), 45),
                          ('LIGHT_Ration_Interior', 'RATION', (-0.4, 0.2, 2.1), 45), ('LIGHT_Ration_Awning', 'RATION', (0.0, -3.0, 2.1), 30)):
        ob = bpy.data.objects.get(nm)
        if ob is None:
            ld = bpy.data.lights.new(nm, 'POINT')
            ob = bpy.data.objects.new(nm, ld)
            LC.objects.link(ob)
        ob.data.energy = e
        ob.data.color = (1.0, 0.75, 0.45)
        ob.data.shadow_soft_size = 0.4
        ob.location = L.to_world(key, p)
        ob['render_only'] = True
    hc = L.HERO_CAM
    SS.camera('CAM_01_Village_Hero', hc['loc'], hc['target'], hc['lens'])
    SS.camera('CAM_02_Village_TopDown', (0, 6, 150), (0, 6.01, 0), 35, ortho=78)
    ends = bpy.app.driver_namespace['bridge_ends']
    rw, re_ = ends['BRIDGE_Main']
    SS.camera('CAM_09_Ground_Player', (rw.x - 5.5, rw.y - 4.5, T.ground(rw.x - 5.5, rw.y - 4.5) + 1.6), (re_.x + 4, re_.y + 4.5, 2.2), 22)
    G = 'VILLAGE_ROOT/08_GAMEPLAY_MARKERS'
    sp = Vector((-8.6, -3.6, 0)); sp.z = T.ground(sp.x, sp.y)
    yaw = math.atan2(rw.y - sp.y, rw.x - sp.x) - math.pi / 2
    o = bpy.data.objects.get('SPAWN_Player_Main') or su.empty('SPAWN_Player_Main', G, None, tuple(sp), (0, 0, yaw), 'SINGLE_ARROW', 1.0)
    o.location = sp; o.rotation_euler = (0, 0, yaw)
    su.tag(o, 'SPAWN_Player_Main', marker='spawn', forward_local=[0, 1, 0], capsule_height=1.4, capsule_radius=0.3)
    for key in ('RATION', 'WATER', 'ELEC'):
        e = L.entrance(key)
        e.z = T.ground(e.x, e.y)
        b = L.BUILDINGS[key]
        nm = 'SPAWN_%s_Outside' % key
        o = bpy.data.objects.get(nm) or su.empty(nm, G, None, tuple(e), (0, 0, math.radians(b['rot'])), 'SINGLE_ARROW', 1.0)
        o.location = e; o.rotation_euler = (0, 0, math.radians(b['rot']))
        su.tag(o, nm, marker='spawn', forward_local=[0, 1, 0], faces='building_entrance')
    # player capsule proxy (authoring only; excluded from export)
    cap = bpy.data.objects.get('PROXY_PlayerCapsule')
    if cap is None:
        mb = MB()
        mb.lathe([(0.0, 0.0), (0.21, 0.04), (0.3, 0.3), (0.3, 1.1), (0.21, 1.36), (0.0, 1.4)], 'M_Fabric', 'fabric_red', M(), segs=12)
        cap = mb.build('PROXY_PlayerCapsule', G)
    cap.location = sp
    cap['export'] = False
    cap.hide_render = True