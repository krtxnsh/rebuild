"""terrain.py - terrain heightfield, stream + water mesh, paths, arched bridge and footbridges."""
import bpy, math, random
from mathutils import Vector, Matrix, noise, kdtree
import shared_utils as su
from shared_utils import MB, M, col, smoothstep, lerp, catmull, coll
import layout as L

X0, X1, Y0, Y1, N = -84.0, 84.0, -60.0, 108.0, 121
_state = {}

# ----------------------------------------------------------------------------- stream helpers
def stream_samples():
    if 'ss' not in _state:
        pts = catmull([Vector((x, y, 0)) for x, y in L.STREAM], 0.25)
        kd = kdtree.KDTree(len(pts))
        for i, p in enumerate(pts):
            kd.insert(p, i)
        kd.balance()
        _state['ss'] = (pts, kd)
    return _state['ss']

def stream_dist(x, y):
    pts, kd = stream_samples()
    co, i, d = kd.find((x, y, 0))
    return d, i

def stream_point_at_y(y):
    pts, _ = stream_samples()
    best = min(range(len(pts)), key=lambda i: abs(pts[i].y - y))
    p = pts[best]
    t = (pts[min(best + 1, len(pts) - 1)] - pts[max(best - 1, 0)]).normalized()
    return p, t

# ----------------------------------------------------------------------------- pads (buildings + bridge ends)
def pads():
    if 'pads' in _state:
        return _state['pads']
    pl = []
    for k, b in L.BUILDINGS.items():
        pl.append((b['loc'][0], b['loc'][1], b['pad_r'], b['pad_blend'], b['z']))
    _state['pads'] = pl
    return pl

def add_pad(x, y, r, blend, z):
    pads().append((x, y, r, blend, z))

# ----------------------------------------------------------------------------- height function
def raw_height(x, y):
    n1 = noise.noise(Vector((x / 24.0, y / 24.0, 0.37)))
    n2 = noise.noise(Vector((x / 9.0, y / 9.0, 4.1)))
    h = 0.55 * n1 + 0.15 * n2
    back = smoothstep(26, 80, y) * (7.5 + 5.0 * noise.noise(Vector((x / 26.0, y / 30.0, 7.7))))
    side = smoothstep(30, 82, abs(x)) * (7.0 + 5.0 * noise.noise(Vector((x / 20.0, y / 24.0, 2.2))))
    roll = (smoothstep(-8, 30, abs(x) + max(y - 10, 0) * 0.6)) * 1.6 * (0.5 + 0.5 * noise.noise(Vector((x / 14.0, y / 14.0, 9.3))))
    d, _ = stream_dist(x, y)
    valley = smoothstep(4.0, 24.0, d)
    h += (back + side) * (0.12 + 0.88 * valley) + roll * valley
    # foreground gently drops toward camera
    h -= smoothstep(-20, -55, y) * 1.2
    for (cx, cy, r, bl, z) in pads():
        dd = math.hypot(x - cx, y - cy)
        w = 1.0 - smoothstep(r, r + bl, dd)
        h = lerp(h, z, w)
    hw = L.stream_halfwidth(y)
    if d < hw + 3.4:
        bank = max(h, L.WATER_LEVEL + 0.5)
        bed = L.WATER_LEVEL - 0.6
        if d < hw + 1.6:
            h = lerp(bed, bank, smoothstep(hw - 0.7, hw + 1.6, d))
        else:
            h = lerp(bank, h, smoothstep(hw + 1.6, hw + 3.4, d))
    return h

def grid():
    if 'grid' not in _state:
        dx = (X1 - X0) / (N - 1); dy = (Y1 - Y0) / (N - 1)
        H = [[raw_height(X0 + i * dx, Y0 + j * dy) for i in range(N)] for j in range(N)]
        _state['grid'] = (H, dx, dy)
    return _state['grid']

def ground(x, y):
    """Exact height of the triangulated terrain mesh (diagonal (i,j)->(i+1,j+1))."""
    H, dx, dy = grid()
    fx = (x - X0) / dx; fy = (y - Y0) / dy
    i = max(0, min(N - 2, int(math.floor(fx)))); j = max(0, min(N - 2, int(math.floor(fy))))
    u = fx - i; v = fy - j
    h00, h10, h01, h11 = H[j][i], H[j][i + 1], H[j + 1][i], H[j + 1][i + 1]
    if u >= v:
        return h00 + (h10 - h00) * u + (h11 - h10) * v
    return h00 + (h11 - h01) * u + (h01 - h00) * v

# ----------------------------------------------------------------------------- terrain mesh
def path_dist_fn(path_polys):
    pts = []
    for (_, w, poly) in path_polys:
        for p in poly:
            pts.append((p, w))
    kd = kdtree.KDTree(len(pts))
    for i, (p, w) in enumerate(pts):
        kd.insert((p.x, p.y, 0), i)
    kd.balance()
    def f(x, y):
        co, i, d = kd.find((x, y, 0))
        return d - pts[i][1] * 0.5
    return f

def build_terrain(path_polys):
    H, dx, dy = grid()
    pd = path_dist_fn(path_polys)
    verts, faces, cols = [], [], []
    rng = random.Random(11)
    for j in range(N):
        for i in range(N):
            x, y = X0 + i * dx, Y0 + j * dy
            z = H[j][i]
            verts.append((x, y, z))
            n = noise.noise(Vector((x / 7.0, y / 7.0, 1.3)))
            c = su.lerpc('grass', 'grass_dark', 0.5 + 0.5 * n)
            c = su.lerpc(c, 'leaf_lime', max(0.0, noise.noise(Vector((x / 16.0, y / 16.0, 5.0)))) * 0.6)
            # hills: warmer, a bit yellow
            c = su.lerpc(c, 'hill_far', smoothstep(20, 70, y) * 0.35)
            d, _ = stream_dist(x, y)
            hw = L.stream_halfwidth(y)
            c = su.lerpc(c, 'mud', 1.0 - smoothstep(hw + 0.2, hw + 1.4, d))
            # dirt around paths and building pads
            p = pd(x, y)
            c = su.lerpc(c, 'dirt', (1.0 - smoothstep(-0.2, 0.9, p)) * 0.6)
            for (cx, cy, r, bl, zz) in pads():
                dd = math.hypot(x - cx, y - cy)
                k = (1.0 - smoothstep(r * 0.3, r * 0.75, dd)) * (0.4 + 0.3 * noise.noise(Vector((x / 3.0, y / 3.0, 8.0))))
                c = su.lerpc(c, 'dirt', max(0.0, k))
            cols.append(c)
    for j in range(N - 1):
        for i in range(N - 1):
            a = j * N + i; b = a + 1; c_ = a + N; d_ = c_ + 1
            faces.append((a, b, d_)); faces.append((a, d_, c_))
    me = bpy.data.meshes.new('TERRAIN_Ground')
    me.from_pydata(verts, [], faces)
    me.materials.append(su.get_mat('M_Terrain'))
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', [v for c in cols for v in c])
    me.color_attributes.active_color = ca
    uvl = me.uv_layers.new(name='UVMap')
    uvl.data.foreach_set('uv', [c for l in me.loops for c in (verts[l.vertex_index][0] / 4, verts[l.vertex_index][1] / 4)])
    ob = bpy.data.objects.new('TERRAIN_Ground', me)
    su.link(ob, 'VILLAGE_ROOT/00_TERRAIN')
    su.tag(ob, 'TERRAIN_Ground', walkable=True, collider='heightfield')
    return ob

def build_far_hills():
    mb = MB()
    rng = random.Random(5)
    # rolling far hills ring behind the village
    nx, ny = 44, 10
    xs = [-230 + 460 * i / (nx - 1) for i in range(nx)]
    ys = [100 + 150 * j / (ny - 1) for j in range(ny)]
    v, f = [], []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            base = 9 + (y - 100) * 0.1 + 5 * noise.noise(Vector((x / 50, y / 50, 3.3)))
            v.append((x, y, base + 4 * noise.noise(Vector((x / 22, y / 22, 6.6)))))
    for j in range(ny - 1):
        for i in range(nx - 1):
            a = j * nx + i
            f.append((a, a + 1, a + nx + 1, a + nx))
    mb.add((v, f), 'M_Terrain', lambda k: su.lerpc('hill_far', 'pine', 0.25 + 0.25 * ((k * 7) % 3) / 2), smooth=True)
    # side ridges left/right so the frame edges stay landscape
    for s in (-1, 1):
        v2, f2 = [], []
        for j in range(12):
            y = -60 + 170 * j / 11
            for i in range(6):
                x = s * (84 + 70 * i / 5)
                v2.append((x, y, 10 + i * 5 + 5 * noise.noise(Vector((x / 30, y / 30, 1.1)))))
        for j in range(11):
            for i in range(5):
                a = j * 6 + i
                f2.append((a, a + 1, a + 7, a + 6) if s > 0 else (a, a + 6, a + 7, a + 1))
        mb.add((v2, f2), 'M_Terrain', 'grass_dark', smooth=True)
    # distant blue mountains
    v3, f3 = [], []
    nm = 40
    for i in range(nm):
        x = -420 + 840 * i / (nm - 1)
        pk = 24 + 22 * abs(noise.noise(Vector((x / 90, 0.5, 0.2)))) + 12 * math.sin(i * 1.7) ** 2
        v3.append((x, 222, -2)); v3.append((x, 232, 8 + 0.25 * pk)); v3.append((x * 0.98, 250, pk))
    fcols = []
    for i in range(nm - 1):
        a = i * 3
        f3.append((a, a + 3, a + 4, a + 1)); fcols.append('hill_far')
        f3.append((a + 1, a + 4, a + 5, a + 2)); fcols.append('mountain')
    mb.add((v3, f3), 'M_Terrain', lambda k: fcols[k], smooth=True)
    return mb.build('TERRAIN_FarHills', 'VILLAGE_ROOT/00_TERRAIN', props={'semantic_id': 'TERRAIN_FarHills', 'walkable': False})

# ----------------------------------------------------------------------------- water
def build_river():
    pts = catmull([Vector((x, y, 0)) for x, y in L.STREAM], 1.0)
    mb = MB()
    across = 6
    v, faces, uvs = [], [], []
    acc = 0.0
    for i, p in enumerate(pts):
        if i > 0:
            acc += (p - pts[i - 1]).length
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        nrm = Vector((-t.y, t.x, 0))
        hw = L.stream_halfwidth(p.y) + 1.0
        for k in range(across):
            u = k / (across - 1)
            q = p + nrm * ((u - 0.5) * 2 * hw)
            v.append((q.x, q.y, L.WATER_LEVEL))
    vv = []
    for i in range(len(pts) - 1):
        for k in range(across - 1):
            a = i * across + k
            faces.append((a, a + 1, a + across + 1, a + across))
    # explicit flow UVs: u across, v along stream (metres/4) -> runtime scrolls v
    acc_l = [0.0]
    for i in range(1, len(pts)):
        acc_l.append(acc_l[-1] + (pts[i] - pts[i - 1]).length)
    for i in range(len(pts) - 1):
        for k in range(across - 1):
            u0, u1 = k / (across - 1), (k + 1) / (across - 1)
            v0, v1 = acc_l[i] / 4, acc_l[i + 1] / 4
            uvs.append([(u0, v0), (u1, v0), (u1, v1), (u0, v1)])
    mb.add((v, faces), 'M_Water', 'water', uvs=[list(reversed(u)) for u in uvs], flip=True)
    ob = mb.build('WATER_River', 'VILLAGE_ROOT/01_WATER_SYSTEM')
    su.tag(ob, 'WATER_River', shader_target='water_flow', flow_axis='uv_v', flow_speed=0.25, walkable=False)
    return ob

# ----------------------------------------------------------------------------- paths
def build_paths(path_defs):
    mb = MB()
    rng = random.Random(21)
    out_polys = []
    stones = MB()
    for name, w, ctrl in path_defs:
        pts = catmull([Vector((p[0], p[1], 0)) for p in ctrl], 0.6)
        out_polys.append((name, w, pts))
        across = 5
        v, f, rows = [], [], []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])
            if t.length < 1e-6:
                t = Vector((1, 0, 0))
            t.normalize()
            nrm = Vector((-t.y, t.x, 0))
            wl = w * 0.5 * (1 + 0.14 * noise.noise(Vector((p.x / 2.3, p.y / 2.3, 3.0))))
            wr = w * 0.5 * (1 + 0.14 * noise.noise(Vector((p.x / 2.3, p.y / 2.3, 8.0))))
            for k, s in enumerate((-wl, -wl * 0.5, 0.0, wr * 0.5, wr)):
                q = p + nrm * s
                lift = 0.035 if k in (0, 4) else 0.07
                v.append((q.x, q.y, ground(q.x, q.y) + lift))
        for i in range(len(pts) - 1):
            for k in range(across - 1):
                a = i * across + k
                f.append((a, a + 1, a + across + 1, a + across))
        def fc(k, _n=across - 1):
            kk = k % _n
            base = 'path' if kk in (1, 2) else 'dirt'
            return col(base, 0.07, rng)
        mb.add((v, f), 'M_Terrain', fc, smooth=True, flip=True)
        # a few flat stepping stones scattered on the path surface
        for i in range(2, len(pts) - 2, 5):
            p = pts[i]
            off = Vector((rng.uniform(-w * 0.35, w * 0.35), rng.uniform(-w * 0.35, w * 0.35), 0))
            q = p + off
            su.gen_rock(stones, M((q.x, q.y, ground(q.x, q.y) + 0.05), (0, 0, rng.uniform(0, 3))), r=rng.uniform(0.14, 0.24), rng=rng, color='stone_light', flat=0.25)
    mb.merge(stones)
    ob = mb.build('TERRAIN_Paths', 'VILLAGE_ROOT/02_BRIDGES_PATHS')
    su.tag(ob, 'TERRAIN_Paths', walkable=True)
    return ob, out_polys

# ----------------------------------------------------------------------------- bridges
def bridge_frame(y_center, half_len):
    p, t = stream_point_at_y(y_center)
    axis = Vector((t.y, -t.x, 0)).normalized()  # perpendicular to flow
    if axis.x < 0:
        axis = -axis
    ang = math.atan2(axis.y, axis.x)
    W = p - axis * half_len; E = p + axis * half_len
    return p, ang, W, E

def build_arch_bridge(name, y_center, L_half=5.8, W=2.2, rise=1.3):
    p, ang, Wend, Eend = bridge_frame(y_center, L_half)
    z_end = 0.12
    mtx = M((p.x, p.y, 0.0), (0, 0, ang))
    mb = MB()
    rng = random.Random(31)
    def zc(x):
        return z_end + rise * (1 - (x / L_half) ** 2)
    def slope(x):
        return -2 * rise * x / (L_half ** 2)
    n_pl = int(2 * L_half / 0.27)
    for i in range(n_pl):
        x = -L_half + (i + 0.5) * (2 * L_half / n_pl)
        a = math.atan(slope(x))
        mb.box((0.235, W + rng.uniform(-0.04, 0.06), 0.07), (x, rng.uniform(-0.03, 0.03), zc(x) - 0.035), (0, -a, rng.uniform(-0.02, 0.02)),
               mat='M_Wood', color=col(rng.choice(['timber_warm', 'wood_light', 'timber_warm']), 0.1, rng), bevel=0.012, matrix=mtx)
    xs = [-L_half + 2 * L_half * i / 24 for i in range(25)]
    for s in (-1, 1):
        y = s * (W / 2 - 0.14)
        mb.sweep([(x, y, zc(x) - 0.22) for x in xs], su.rect_profile(0.16, 0.26), color='timber_mid', matrix=mtx)
        # arch beam under the deck
        arch = []
        for k in range(17):
            u = -1 + 2 * k / 16
            x = u * L_half * 0.78
            arch.append((x, y, L.WATER_LEVEL + 0.2 + (zc(0) - 0.55 - L.WATER_LEVEL - 0.2) * math.cos(u * math.pi / 2) ** 0.8))
        mb.sweep(arch, su.rect_profile(0.2, 0.3), color='timber_mid', matrix=mtx)
        for x in (-2.6, -1.3, 0.0, 1.3, 2.6):
            u = x / (L_half * 0.78)
            za = L.WATER_LEVEL + 0.2 + (zc(0) - 0.55 - L.WATER_LEVEL - 0.2) * math.cos(u * math.pi / 2) ** 0.8
            zt = zc(x) - 0.3
            if zt - za > 0.08:
                mb.box((0.12, 0.12, zt - za), (x, y, (za + zt) / 2), mat='M_Wood', color='timber_mid', matrix=mtx)
        # rails
        yr = s * (W / 2 + 0.05)
        posts = [-L_half + 0.15 + (2 * L_half - 0.3) * i / 7 for i in range(8)]
        for x in posts:
            mb.box((0.15, 0.15, 1.12), (x, yr, zc(x) + 0.5), mat='M_Wood', color='timber_warm', bevel=0.02, matrix=mtx)
            mb.box((0.2, 0.2, 0.06), (x, yr, zc(x) + 1.08), mat='M_Wood', color='timber_mid', bevel=0.015, matrix=mtx)
        rx = [-L_half + 0.15 + (2 * L_half - 0.3) * i / 20 for i in range(21)]
        mb.sweep([(x, yr, zc(x) + 0.98) for x in rx], su.rect_profile(0.1, 0.12), color='timber_warm', matrix=mtx)
        mb.sweep([(x, yr, zc(x) + 0.5) for x in rx], su.rect_profile(0.07, 0.09), color='timber_warm', matrix=mtx)
    # stone abutments
    for s in (-1, 1):
        cx = s * (L_half - 1.3)
        for course in range(4):
            zb = L.WATER_LEVEL - 0.5 + course * 0.42
            ztop = zc(cx) - 0.3
            if zb > ztop:
                break
            off = 0.25 if course % 2 else 0.0
            yy = -W / 2 - 0.35 + off
            while yy < W / 2 + 0.3:
                ln = rng.uniform(0.55, 0.85)
                ln = min(ln, W / 2 + 0.35 - yy)
                if ln > 0.15:
                    mb.box((1.5 - course * 0.12, ln - 0.03, 0.4), (cx + s * course * 0.04, yy + ln / 2, zb + 0.2), (0, 0, rng.uniform(-0.02, 0.02)),
                           mat='M_Stone', color=col('stone', 0.1, rng), bevel=0.06, matrix=mtx)
                yy += ln
    ob = mb.build(name, 'VILLAGE_ROOT/02_BRIDGES_PATHS')
    su.tag(ob, name, walkable=True)
    # deck collider segments + walk ramps
    for i in range(6):
        x0 = -L_half + 2 * L_half * i / 6; x1 = -L_half + 2 * L_half * (i + 1) / 6
        xm = (x0 + x1) / 2
        a = math.atan2(zc(x1) - zc(x0), x1 - x0)
        wp = mtx @ Vector((xm, 0, (zc(x0) + zc(x1)) / 2 - 0.06))
        collider('COL_%s_Deck_%02d' % (name, i), wp, (0, -a, ang), (math.hypot(x1 - x0, zc(x1) - zc(x0)) / 2 + 0.02, W / 2, 0.06))
        for s in (-1, 1):
            wr = mtx @ Vector((xm, s * (W / 2 + 0.05), (zc(x0) + zc(x1)) / 2 + 0.55))
            collider('COL_%s_Rail_%d_%02d' % (name, (s + 1) // 2, i), wr, (0, -a, ang), (math.hypot(x1 - x0, zc(x1) - zc(x0)) / 2, 0.08, 0.55))
    return ob, (Wend, Eend)

def build_foot_bridge(name, y_center, L_half=3.8, W=1.8):
    p, ang, Wend, Eend = bridge_frame(y_center, L_half)
    zd = 0.32
    mtx = M((p.x, p.y, 0.0), (0, 0, ang))
    mb = MB()
    rng = random.Random(hash(name) % 1000)
    n = int(2 * L_half / 0.26)
    for i in range(n):
        x = -L_half + (i + 0.5) * 2 * L_half / n
        mb.box((0.22, W, 0.06), (x, 0, zd), (0, 0, rng.uniform(-0.03, 0.03)), mat='M_Wood', color=col('wood_light', 0.1, rng), bevel=0.01, matrix=mtx)
    for s in (-1, 1):
        mb.box((2 * L_half, 0.14, 0.2), (0, s * (W / 2 - 0.12), zd - 0.13), mat='M_Wood', color='timber_mid', matrix=mtx)
        for x in (-L_half + 0.2, -L_half * 0.33, L_half * 0.33, L_half - 0.2):
            mb.box((0.12, 0.12, 0.8), (x, s * (W / 2 + 0.03), zd + 0.37), mat='M_Wood', color='timber_warm', bevel=0.015, matrix=mtx)
            mb.box((0.14, 0.14, 1.2), (x, s * (W / 2 - 0.12), zd - 0.75), mat='M_Wood', color='timber_mid', matrix=mtx)
        mb.box((2 * L_half - 0.3, 0.09, 0.09), (0, s * (W / 2 + 0.03), zd + 0.72), mat='M_Wood', color='timber_warm', matrix=mtx)
    ob = mb.build(name, 'VILLAGE_ROOT/02_BRIDGES_PATHS')
    su.tag(ob, name, walkable=True)
    collider('COL_%s_Deck' % name, mtx @ Vector((0, 0, zd - 0.03)), (0, 0, ang), (L_half, W / 2, 0.06))
    return ob, (Wend, Eend)

def collider(name, loc, rot, half, parent=None, shape='box'):
    ob = su.empty(name, 'VILLAGE_ROOT/09_COLLISION_PROXIES', parent, loc, rot, display='CUBE', size=1.0)
    ob.scale = half
    su.tag(ob, name, collider=shape, half_extents=[float(h) for h in half])
    return ob

def reset():
    _state.clear()