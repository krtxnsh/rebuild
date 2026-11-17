"""ration_shop.py - Building C: cream plaster + dark timber market shop, terracotta barrel-tile roof, red-and-cream
striped scalloped awning, bunting, lanterns, counter with balance scale, shelves, side stalls (green / blue stripes),
cart, labelled sacks, produce crates and an enterable interior.
Reference: ration_primary.jpg (+ ration_multi.jpg).  Building-local: market front faces -Y, gable ends at +/-X."""
import bpy, math, random
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col
import building_common as BC

KEY = 'RATION'
CP = 'VILLAGE_ROOT/03_BUILDINGS/RATION_SHOP/'
W, D, T, FZ, WH = 6.0, 4.4, 0.25, 0.2, 2.95
OPEN = {
    'front': [(-2.3, 2.3, 0.0, 2.35)],
    'back': [(-2.3, -1.2, 0.0, 2.05)],
    'left': [(-0.5, 0.5, 1.0, 2.0)],
    'right': [(-0.4, 0.4, 1.0, 1.9)],
}
RF = dict(x0=-3.45, x1=3.45, yf=-3.1, zf=3.12, yb=2.75, zb=3.4, zr=5.5)
COUNTER = (-0.8, -1.75, 2.8, 0.6, 1.0)     # cx, cy, length, depth, height
STALLS = [((3.9, -1.25), ('stripe_green', 'fabric_cream')), ((3.9, 0.45), ('stripe_blue', 'fabric_cream'))]

def roof_under(y):
    if y <= 0:
        return RF['zr'] - (RF['zr'] - RF['zf']) * (-y) / (-RF['yf']) - 0.2
    return RF['zr'] - (RF['zr'] - RF['zb']) * y / RF['yb'] - 0.2

# ----------------------------------------------------------------------------- produce generators
def carrot(mb, m, rng):
    mb.add(su.prim_cyl(0.028, 0.17, 6, r2=0.004), 'M_Organic', col('carrot', 0.08, rng), m @ M((0, 0, 0), (math.pi / 2, 0, 0)), smooth=True)
    for k in range(3):
        mb.box((0.012, 0.09, 0.012), (rng.uniform(-0.01, 0.01), 0.04, 0.0), (rng.uniform(-0.4, 0.4), 0, rng.uniform(-0.5, 0.5)), mat='M_Organic', color='leaf_green', matrix=m)

def ball(mb, m, r, c, rng, sz=1.0):
    mb.add(su.prim_sphere(r, 8, 5, sz), 'M_Organic', col(c, 0.07, rng), m, smooth=True)

def cabbage(mb, m, rng, c='cabbage'):
    mb.add(su.prim_ico(0.11, 1), 'M_Organic', col(c, 0.05, rng), m @ M((0, 0, 0.09)), smooth=True)
    for k in range(3):
        mb.add(su.prim_sphere(0.12, 8, 4, 0.55), 'M_Organic', col('leaf_lime' if c == 'cabbage' else 'leaf_green', 0.08, rng), m @ M((0, 0, 0.05), (rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), k)), smooth=True)

def produce_fill(mb, sx, sy, z, kind, rng):
    """Mound + a few hero items (efficient: no individual grains/pebbles)."""
    base = {'tomato': 'tomato', 'carrot': 'carrot', 'potato': 'potato', 'onion': 'onion', 'lemon': 'lemon', 'apple': 'apple',
            'orange': 'orange', 'cabbage': 'cabbage', 'cauli': 'cauli', 'eggplant': 'eggplant'}[kind]
    mb.add(su.prim_sphere(0.5, 10, 4, 0.35), 'M_Organic', col(base, 0.0, None, 0.8), M((0, 0, z - 0.06), (0, 0, 0), (sx * 0.92, sy * 0.92, 1)), smooth=True)
    n = 6 if kind in ('cabbage', 'cauli') else 10
    for k in range(n):
        x = rng.uniform(-sx * 0.36, sx * 0.36); y = rng.uniform(-sy * 0.36, sy * 0.36)
        m = M((x, y, z + 0.02), (0, 0, rng.uniform(0, 6)))
        if kind == 'carrot':
            carrot(mb, m, rng)
        elif kind in ('cabbage', 'cauli'):
            if k < 3:
                cabbage(mb, M((x * 0.8, y * 0.8, z - 0.06)), rng, kind)
        elif kind == 'onion':
            mb.lathe([(0.0, 0.0), (0.035, 0.01), (0.045, 0.04), (0.02, 0.08), (0.0, 0.1)], 'M_Organic', col('onion', 0.05, rng), m, segs=7)
        elif kind == 'potato':
            ball(mb, m, 0.045, 'potato', rng, 0.7)
        elif kind == 'eggplant':
            ball(mb, m @ M((0, 0, 0), (0, math.pi / 2, 0)), 0.04, 'eggplant', rng, 1.8)
        else:
            ball(mb, m, 0.042 if kind != 'tomato' else 0.046, base, rng)

def crate_with(mb, m, kind, rng, sx=0.6, sy=0.45):
    su.gen_crate(mb, m, sx, sy, 0.32, rng)
    tmp = MB()
    produce_fill(tmp, sx, sy, 0.3, kind, rng)
    mb.merge(tmp, m)

def label(mb, text, m, size=0.09, color='chalk'):
    tv, tf = su.gen_text(text, size=size, extrude=0.004)
    mb.add((tv, tf), 'M_Fabric', color, m @ M((0, 0, 0), (math.pi / 2, 0, 0)))

def sack(name, coll, parent, loc, rot, text, fill, rng, sid=None, h=0.66, r=0.27):
    mb = MB()
    su.gen_sack(mb, M(), h=h, r=r, color='burlap', rng=rng, open_top=True, fill=fill)
    if text:
        label(mb, text, M((0, -r * 0.83, h * 0.42), (math.radians(-6), 0, 0)), size=0.085 if len(text) > 4 else 0.1)
    if text == 'GRAIN':
        for k in range(5):
            mb.add(su.prim_sphere(0.018, 6, 4, 1.8), 'M_Fabric', 'burlap_dark', M((-0.01 + 0.012 * (k % 2) * 2, -r * 0.84, h * 0.58 + k * 0.028), (0, 0.4 * (1 if k % 2 else -1), 0)))
    o = mb.build(name, coll, parent=parent, loc=loc, rot=rot)
    su.tag(o, sid or name, interactable=True, contents=fill, label=text)
    return o
def striped_canopy(mb, x0, x1, yb, zb, yf, zf, stripes, colors, sag=0.07, valance=0.18, scallop=True, axis='x'):
    """Curved canopy with stripes running down-slope, front valance and scalloped edge.
    axis='x': canopy spans X, slopes along Y.  Geometry is built in that frame."""
    n = stripes * 2
    ny = 6
    v, f, fc = [], [], []
    for j in range(ny + 1):
        t = j / ny
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n
            v.append((x, yb + (yf - yb) * t, zb + (zf - zb) * t - sag * math.sin(math.pi * t) + 0.02 * math.sin(math.pi * i / n)))
    for j in range(ny):
        for i in range(n):
            a = j * (n + 1) + i
            f.append((a, a + 1, a + n + 2, a + n + 1)); fc.append(colors[(i // 2) % 2])
    base = len(v)
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        v.append((x, yf - 0.005, zf)); v.append((x, yf - 0.005, zf - valance))
    for i in range(n):
        a = base + 2 * i
        f.append((a, a + 2, a + 3, a + 1)); fc.append(colors[(i // 2) % 2])
    if scallop:
        sw = (x1 - x0) / stripes
        for s in range(stripes):
            cx = x0 + sw * (s + 0.5)
            st = len(v)
            k = 7
            for q in range(k + 1):
                a = math.pi * q / k
                v.append((cx - sw / 2 * math.cos(a), yf - 0.005, zf - valance - sw * 0.45 * math.sin(a)))
            f.append(tuple(range(st, st + k + 1))); fc.append(colors[s % 2])
    mb.add((v, f), 'M_Fabric', lambda k: fc[k], smooth=True)

def bunting(mb, p0, p1, sag, n, rng, size=0.22):
    pts = su.catenary(p0, p1, sag, n * 2)
    mb.tube(pts, 0.008, 'M_Fabric', 'rope', 4)
    cyc = ['red_flag', 'yellow_flag', 'green_flag', 'blue_flag', 'orange_flag']
    for k in range(n):
        a, b = pts[2 * k], pts[2 * k + 1]
        mid = (a + b) / 2
        mb.add(([tuple(a), tuple(b), tuple(mid - Vector((0, 0, size * 1.25)))], [(0, 1, 2)]), 'M_Fabric', cyc[k % len(cyc)])

def basket(mb, m, rng):
    mb.lathe([(0.0, 0.0), (0.12, 0.0), (0.2, 0.14), (0.21, 0.16), (0.19, 0.16), (0.11, 0.02)], 'M_Fabric', col('burlap_dark', 0.05, rng), m, segs=10)
    for k in range(4):
        mb.add(su.prim_ico(0.08, 1), 'M_Organic', rng.choice(['leaf_green', 'leaf_dark', 'leaf_lime']), m @ M((rng.uniform(-0.08, 0.08), rng.uniform(-0.08, 0.08), 0.17), (0, 0, k)), smooth=True)

def build():
    rng = random.Random(303)
    root, G = BC.make_root(KEY, CP + 'RATION_Exterior')
    shell, glass, roof, props, lg = MB(), MB(), MB(), MB(), MB()
    shell.box((W + 0.3, D + 0.3, FZ - 0.02), (0, 0, (FZ - 0.02) / 2), mat='M_Stone', color='stone', bevel=0.04)
    BC.floor_planks(shell, -W / 2 + T, W / 2 - T, -D / 2 + 0.05, D / 2 - T, FZ, rng)
    shell.box((1.6, 0.45, 0.1), (1.45, -D / 2 - 0.22, 0.05), mat='M_Stone', color='stone_light', bevel=0.03)
    walls = {}
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = BC.wall_frame(side, W, D, T, FZ)
        walls[side] = (mtx, ln)
        BC.build_wall(shell, mtx, ln, WH, T, OPEN[side], 'M_Plaster', 'plaster', rng)
    for side in ('left', 'right'):
        mtx, ln = walls[side]
        s = -1 if side == 'left' else 1
        def zt(u):
            return max(roof_under(s * u) - FZ, WH + 0.05)
        boundary = [(-D / 2, WH), (D / 2, WH), (D / 2, zt(D / 2)), (0.0, roof_under(0.0) - FZ), (-D / 2, zt(-D / 2))]
        BC.gable(shell, mtx, boundary, T, 'M_Plaster', 'plaster')
    tcol = lambda: col('timber_dark', 0.07, rng)
    for sx in (-1, 1):
        for sy in (-1, 1):
            shell.box((0.3, 0.3, WH + 0.1), (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), FZ + WH / 2), mat='M_Wood', color=tcol(), bevel=0.04)
    fm, _ = walls['front']
    for s in (-1, 1):
        shell.box((0.3, 0.3, 2.4), (s * 2.42, -T / 2 - 0.04, 1.2), mat='M_Wood', color=tcol(), matrix=fm, bevel=0.035)
        BC.beam(shell, (s * 2.42, -T / 2 - 0.08, 1.75), (s * 1.85, -T / 2 - 0.08, 2.32), 0.16, 0.18, tcol(), fm)
    shell.box((W + 0.2, 0.32, 0.28), (0, -T / 2 - 0.05, 2.47), mat='M_Wood', color=tcol(), matrix=fm, bevel=0.04)
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = walls[side]
        shell.box((ln + (0.3 if side in ('front', 'back') else 0), 0.2, 0.22), (0, -T / 2 - 0.05, WH - 0.08), mat='M_Wood', color=tcol(), matrix=mtx, bevel=0.03)
        if side != 'front':
            shell.box((ln + 0.2, 0.14, 0.16), (0, -T / 2 - 0.04, 0.08), mat='M_Wood', color=tcol(), matrix=mtx)
    for side in ('left', 'right'):
        mtx, ln = walls[side]
        top = roof_under(0.0) - FZ
        shell.box((0.2, 0.16, top - WH), (0, -T / 2 - 0.05, WH + (top - WH) / 2), mat='M_Wood', color=tcol(), matrix=mtx)
        for s in (-1, 1):
            BC.beam(shell, (s * 1.95, -T / 2 - 0.05, WH + 0.08), (s * 0.15, -T / 2 - 0.05, top - 0.3), 0.15, 0.17, tcol(), mtx)
            shell.box((0.18, 0.15, WH - 0.1), (s * 1.3, -T / 2 - 0.04, WH / 2), mat='M_Wood', color=tcol(), matrix=mtx)
            BC.beam(shell, (s * 1.3, -T / 2 - 0.05, 0.3), (s * 2.0, -T / 2 - 0.05, 1.0), 0.12, 0.14, tcol(), mtx)
    bmx, _ = walls['back']
    for u in (-2.42, -1.08, 1.0):
        shell.box((0.18, 0.15, WH - 0.1), (u, -T / 2 - 0.04, WH / 2), mat='M_Wood', color=tcol(), matrix=bmx)
    for side in ('left', 'right'):
        mtx, ln = walls[side]
        for (a, b, z0, z1) in OPEN[side]:
            BC.window(shell, glass, mtx, (a + b) / 2, z0, b - a, z1 - z0, T, frame='timber_dark', fw=0.12, grid=(2, 2), glass_mat='M_Metal', glass_col='stripe_blue')
    # terracotta roof (deep front eave over the market front)
    BC.gable_roof(roof, rng, RF['x0'], RF['x1'], RF['yf'], RF['yb'], RF['zf'], RF['zb'], RF['zr'], barge=(0.26, 0.34))
    for s in (-1, 1):
        roof.box((0.3, 0.3, 0.3), (s * 2.42, -3.0, 2.95), mat='M_Wood', color='timber_dark', bevel=0.04)
        BC.beam(roof, (s * 2.42, -2.3, 2.45), (s * 2.42, -3.05, 2.95), 0.2, 0.22, 'timber_dark')
    roof.box((W + 0.5, 0.25, 0.28), (0, -3.0, 3.0), mat='M_Wood', color='timber_dark', bevel=0.03)
    # main striped awning under the eave (critical identity feature)
    aw = MB()
    striped_canopy(aw, -2.65, 2.65, -2.3, 2.92, -3.95, 2.38, 16, ('fabric_red', 'fabric_cream'), sag=0.08, valance=0.17)
    aw.tube([(-2.66, -3.96, 2.37), (2.66, -3.96, 2.37)], 0.02, 'M_Metal', 'iron', 6)
    for s in (-1, 1):
        BC.beam(aw, (s * 2.42, -2.42, 1.9), (s * 2.64, -3.92, 2.36), 0.09, 0.1, 'timber_dark')
    bunting(aw, (-2.55, -3.98, 2.2), (2.55, -3.98, 2.2), 0.22, 14, rng)
    bunting(aw, (2.65, -3.9, 2.25), (4.45, -2.05, 2.02), 0.18, 7, rng, 0.18)
    o = aw.build('RATION_Awning', CP + 'RATION_Exterior', parent=G['Exterior']); su.tag(o, 'RATION_Awning', identity_feature=True, cloth=True)
    # hanging lanterns and baskets
    for (x, y) in ((-2.25, -3.55), (1.05, -3.5)):
        props.add(su.prim_cyl(0.008, 0.3, 4), 'M_Metal', 'iron', M((x, y, 2.18)))
        su.gen_lantern(props, lg, M((x, y, 1.8)), 1.1)
    for (x, y) in ((-1.55, -3.6), (2.05, -3.55)):
        for a in range(3):
            ang = a * 2 * math.pi / 3
            props.tube([(x, y, 2.3), (x + 0.17 * math.cos(ang), y + 0.17 * math.sin(ang), 1.82)], 0.006, 'M_Fabric', 'rope', 4)
        basket(props, M((x, y, 1.66)), rng)
    stalls_cart(G, rng, props)
    front_goods(G, rng, props)
    ext = CP + 'RATION_Exterior'
    o = shell.build('RATION_Shell', ext, parent=G['Exterior']); su.tag(o, 'RATION_Shell')
    o = glass.build('RATION_WindowGlass', ext, parent=G['Exterior']); su.tag(o, 'RATION_WindowGlass')
    o = roof.build('RATION_Roof', ext, parent=G['Roof']); su.tag(o, 'RATION_Roof', cutaway='roof')
    o = props.build('RATION_ExteriorProps', CP + 'RATION_Shop_Props', parent=G['Exterior']); su.tag(o, 'RATION_ExteriorProps')
    o = lg.build('RATION_LanternGlass', ext, parent=G['Exterior']); su.tag(o, 'RATION_LanternGlass', emissive=True)
    interior(G, rng)
    gameplay(G)
    return root

def stalls_cart(G, rng, props):
    kinds = [['lemon', 'apple', 'tomato'], ['orange', 'eggplant', 'potato']]
    for k, ((cx, cy), colors) in enumerate(STALLS):
        st = MB()
        st.box((0.85, 1.5, 0.07), (cx, cy, 0.8), mat='M_Wood', color='wood_light', bevel=0.015)
        st.box((0.05, 1.5, 0.6), (cx + 0.42, cy, 0.48), mat='M_Wood', color='timber_warm')
        for sx, hh in ((-0.45, 2.2), (0.48, 1.95)):
            for sy in (-0.72, 0.72):
                st.box((0.09, 0.09, hh), (cx + sx, cy + sy, hh / 2), mat='M_Wood', color='timber_mid', bevel=0.015)
        canopy = MB()
        striped_canopy(canopy, -0.8, 0.8, 0.0, 0.0, -1.25, -0.28, 5, colors, sag=0.05, valance=0.12)
        st.merge(canopy, M((cx - 0.45, cy, 2.22), (0, 0, math.pi / 2)))
        for j, kind in enumerate(kinds[k]):
            crate_with(st, M((cx - 0.05, cy - 0.48 + 0.48 * j, 0.84), (0, 0, math.pi / 2 + rng.uniform(-0.05, 0.05))), kind, rng, 0.42, 0.55)
        o = st.build('RATION_Stall_%02d' % (k + 1), CP + 'RATION_Shop_Props', parent=G['Exterior'])
        su.tag(o, 'RATION_Stall', instance_id='RATION_Stall_%02d' % (k + 1))
    # wooden cart with produce
    cm = MB()
    c0 = M((5.3, 1.9, 0), (0, 0, math.radians(28)))
    cm.box((1.3, 0.85, 0.06), (0, 0, 0.55), mat='M_Wood', color='wood_light', matrix=c0)
    for s in (-1, 1):
        cm.box((1.3, 0.05, 0.25), (0, s * 0.42, 0.68), mat='M_Wood', color='timber_warm', matrix=c0)
        cm.box((0.05, 0.85, 0.25), (s * 0.65, 0, 0.68), mat='M_Wood', color='timber_warm', matrix=c0)
        cm.box((1.0, 0.06, 0.06), (-1.05, s * 0.3, 0.52), (0, math.radians(8), 0), mat='M_Wood', color='timber_mid', matrix=c0)
        wm = c0 @ M((0.15, s * 0.5, 0.36), (math.pi / 2, 0, 0))
        cm.add(su.prim_ring(0.31, 0.36, 0.06, 16), 'M_Wood', 'timber_mid', wm)
        cm.add(su.prim_cyl(0.07, 0.1, 8, z0=False), 'M_Metal', 'iron', wm)
        for q in range(8):
            a = q * math.pi / 4
            cm.box((0.04, 0.3, 0.03), (math.cos(a) * 0.17, math.sin(a) * 0.17, 0), (0, 0, a + math.pi / 2), mat='M_Wood', color='timber_mid', matrix=wm)
    cm.box((0.12, 0.12, 0.36), (-0.5, 0, 0.36), mat='M_Wood', color='timber_mid', matrix=c0)
    tmp = MB()
    produce_fill(tmp, 1.1, 0.7, 0.62, 'carrot', rng)
    cm.merge(tmp, c0)
    cabbage(cm, c0 @ M((0.35, 0.15, 0.6)), rng)
    cabbage(cm, c0 @ M((0.42, -0.18, 0.6)), rng)
    cm.box((0.5, 0.4, 0.04), (-0.35, 0.1, 0.72), (0.2, 0, 0.3), mat='M_Fabric', color='burlap', matrix=c0)
    o = cm.build('RATION_Cart', CP + 'RATION_Shop_Props', parent=G['Exterior']); su.tag(o, 'RATION_Cart')
def front_goods(G, rng, props):
    ci = CP + 'RATION_Interactables'
    cf = CP + 'RATION_Food_Assets'
    sack('RATION_RiceBag', ci, G['Interactables'], (2.62, -2.75, 0), (0, 0, -0.35), 'RICE', 'rice', rng)
    sack('RATION_LentilBag', ci, G['Interactables'], (3.25, -2.6, 0), (0, 0, -0.2), 'LENTILS', 'lentil', rng)
    sack('RATION_GrainBag', ci, G['Interactables'], (2.95, -3.3, 0), (0, 0, -0.45), 'GRAIN', 'burlap', rng)
    props.add(su.prim_sphere(0.22, 10, 4, 0.25), 'M_Organic', 'lentil', M((3.35, -3.25, 0.0), (0, 0, 0), (1.3, 0.8, 1)), smooth=True)
    for k, ((x, y, yaw), kind) in enumerate((((-2.6, -2.7, 0.1), 'cabbage'), ((-1.95, -3.2, -0.25), 'carrot'), ((-3.2, -2.55, 0.3), 'tomato'), ((-2.65, -3.35, 0.15), 'onion'))):
        mb = MB()
        crate_with(mb, M(), kind, rng)
        o = mb.build('RATION_ProduceCrate_%02d' % (k + 1), ci, parent=G['Interactables'], loc=(x, y, 0), rot=(0, 0, yaw))
        su.tag(o, 'RATION_ProduceCrate', interactable=True, instance_id='RATION_ProduceCrate_%02d' % (k + 1), contents=kind)
    # hero produce on the ground (spill) - separate food asset object
    fd = MB()
    for k in range(5):
        carrot(fd, M((-1.75 + rng.uniform(-0.25, 0.25), -3.65 + rng.uniform(-0.15, 0.15), 0.03), (0, 0, rng.uniform(0, 6))), rng)
    for k in range(4):
        ball(fd, M((-1.4 + rng.uniform(-0.2, 0.2), -3.55 + rng.uniform(-0.15, 0.15), 0.045)), 0.046, 'tomato', rng)
    for k in range(3):
        ball(fd, M((-2.15 + rng.uniform(-0.2, 0.2), -3.75 + rng.uniform(-0.1, 0.1), 0.035)), 0.045, 'potato', rng, 0.7)
    cabbage(fd, M((-3.35, -3.35, 0.0)), rng, 'cauli')
    o = fd.build('RATION_GroundProduce', cf, parent=G['Exterior']); su.tag(o, 'RATION_GroundProduce')
    for (x, y, r, h) in ((-3.45, -3.2, 0.22, 0.5), (3.05, -2.05, 0.2, 0.45), (-3.5, 0.2, 0.26, 0.6)):
        su.gen_pot(props, M((x, y, 0), (0, 0, rng.uniform(0, 3))), h=h, r=r, rng=rng)
    for (x, y) in ((-3.55, 0.95), (-3.5, 1.65)):
        su.gen_barrel(props, M((x, y, 0), (0, 0, rng.uniform(0, 3))), rng=rng)
    su.gen_sack(props, M((-3.5, 1.3, 0.9), (0.2, 0, 0.4)), h=0.5, r=0.24, rng=rng)
    # A-frame chalkboard "RATIONS TODAY"
    sg = MB()
    for s in (-1, 1):
        fm = M((0, s * 0.18, 0.0), (s * math.radians(-14), 0, 0))
        sg.box((0.66, 0.05, 0.86), (0, 0, 0.43), mat='M_Wood', color='timber_mid', matrix=fm, bevel=0.015)
        if s < 0:
            sg.box((0.54, 0.02, 0.62), (0, -0.03, 0.46), mat='M_Clay', color='chalk', matrix=fm)
            for txt, z in (('RATIONS', 0.58), ('TODAY', 0.4)):
                tv, tf = su.gen_text(txt, size=0.1, extrude=0.003)
                sg.add((tv, tf), 'M_Clay', 'chalk_text', fm @ M((0, -0.045, z), (math.pi / 2, 0, 0)))
    o = sg.build('RATION_Sign', ci, parent=G['Interactables'], loc=(0.25, -2.85, 0), rot=(0, 0, 0.12))
    su.tag(o, 'RATION_Sign', interactable=True, text='RATIONS TODAY', legible_text_geometry=True)
    for k in range(18):
        x, y = rng.uniform(-3.6, 4.6), rng.uniform(-4.4, -2.4)
        if -2.2 < x < 3.6 and y > -4.0:
            continue
        props.add(su.prim_ico(0.05, 1), 'M_Organic', rng.choice(['flower_yellow', 'flower_white', 'flower_pink', 'flower_blue']), M((x, y, 0.08)), smooth=True)
        props.box((0.01, 0.01, 0.08), (x, y, 0.04), mat='M_Organic', color='leaf_green')

def interior(G, rng):
    ci = CP + 'RATION_Interactables'
    inn, lg = MB(), MB()
    for z in (0.35, 0.9, 1.45):
        inn.box((0.4, 2.0, 0.05), (-2.55, -0.2, FZ + z), mat='M_Wood', color='wood_light')
        for k in range(5):
            su.gen_jar(inn, M((-2.55, -1.0 + k * 0.4, FZ + z + 0.03)), h=0.22, r=0.085, color=rng.choice(['ceramic', 'clay_pot', 'glass']), rng=rng)
    for s in (-1, 1):
        inn.box((0.4, 0.05, 1.6), (-2.55, -0.2 + s * 1.0, FZ + 0.8), mat='M_Wood', color='timber_mid')
    for (x, y, yaw) in ((2.45, 0.1, 0.2), (2.45, 0.7, -0.3), (2.15, 0.4, 0.5)):
        su.gen_sack(inn, M((x, y, FZ), (0, 0, yaw)), h=0.6, r=0.25, rng=rng, open_top=False)
    inn.add(su.prim_cyl(0.01, 0.5, 4), 'M_Metal', 'iron', M((-0.4, 0.2, FZ + 2.25)))
    su.gen_lantern(inn, lg, M((-0.4, 0.2, FZ + 1.88)), 1.1)
    o = inn.build('RATION_InteriorFitout', CP + 'RATION_Interior', parent=G['Interior']); su.tag(o, 'RATION_InteriorFitout', interior=True)
    o = lg.build('RATION_InteriorLanternGlass', CP + 'RATION_Interior', parent=G['Interior']); su.tag(o, 'RATION_InteriorLanternGlass', emissive=True)
    # counter
    cx, cy, ln, dp, h = COUNTER
    cm = MB()
    cm.box((ln + 0.12, dp + 0.14, 0.08), (0, -0.04, h - 0.04), mat='M_Wood', color='timber_warm', bevel=0.02)
    n = int(ln / 0.2)
    for k in range(n):
        cm.box((ln / n - 0.012, 0.05, h - 0.08), (-ln / 2 + ln / n * (k + 0.5), -dp / 2, (h - 0.08) / 2), mat='M_Wood', color=col('timber_mid', 0.08, rng))
    for s in (-1, 1):
        cm.box((0.06, dp, h - 0.08), (s * (ln / 2 - 0.03), 0, (h - 0.08) / 2), mat='M_Wood', color='timber_dark')
    cm.box((ln - 0.1, dp - 0.1, 0.04), (0, 0.02, 0.35), mat='M_Wood', color='wood_light')
    cm.box((0.3, 0.22, 0.04), (0.75, 0.0, h + 0.02), mat='M_Fabric', color='fabric_cream')
    basket(cm, M((-0.3, 0.05, h)), rng)
    for k in range(3):
        su.gen_jar(cm, M((1.1 + 0.0, -0.1 + k * 0.12 - 0.12, h), (0, 0, k)), h=0.18, r=0.06, rng=rng, color='clay_pot')
    o = cm.build('RATION_Counter', ci, parent=G['Interactables'], loc=(cx, cy, FZ))
    su.tag(o, 'RATION_Counter', interactable=True)
    # balance scale - beam pivots at the fulcrum, pans hang from beam ends
    sc = MB()
    sc.box((0.34, 0.2, 0.05), (0, 0, 0.025), mat='M_Metal', color='brass', bevel=0.01)
    sc.add(su.prim_cyl(0.022, 0.44, 8), 'M_Metal', 'brass', M((0, 0, 0.05)), smooth=True)
    sc.add(su.prim_sphere(0.035, 8, 5), 'M_Metal', 'brass', M((0, 0, 0.5)), smooth=True)
    o_s = sc.build('RATION_WeighingScale', ci, parent=G['Interactables'], loc=(cx - 0.55, cy - 0.02, FZ + h))
    su.tag(o_s, 'RATION_WeighingScale', interactable=True)
    bm = MB()
    bm.box((0.62, 0.025, 0.03), (0, 0, 0), mat='M_Metal', color='brass')
    bm.box((0.012, 0.012, 0.12), (0, 0, 0.07), mat='M_Metal', color='iron')
    o_b = bm.build('RATION_WeighingScale_Beam', ci, parent=o_s, loc=(0, 0, 0.47))
    su.tag(o_b, 'RATION_WeighingScale_Beam', animation='rotate', pivot_axis='Y', min_deg=-12, max_deg=12, parent_id='RATION_WeighingScale')
    for s, nm in ((-1, 'RATION_WeighingScale_PanL'), (1, 'RATION_WeighingScale_PanR')):
        pm = MB()
        for a in range(3):
            ang = a * 2 * math.pi / 3
            pm.tube([(0, 0, 0), (0.1 * math.cos(ang), 0.1 * math.sin(ang), -0.28)], 0.004, 'M_Metal', 'brass', 4)
        pm.lathe([(0.0, -0.3), (0.12, -0.3), (0.13, -0.27), (0.12, -0.28)], 'M_Metal', 'brass', M(), segs=12, cap_top=False)
        o_p = pm.build(nm, ci, parent=o_b, loc=(s * 0.3, 0, 0))
        su.tag(o_p, nm, animation='counter_rotate', note='keep level: apply inverse of beam rotation', parent_id='RATION_WeighingScale_Beam')
    # back-wall storage shelf with stock
    sh = MB()
    sw_, sd, shh = 3.6, 0.45, 2.2
    for z in (0.08, 0.62, 1.16, 1.7, 2.18):
        sh.box((sw_, sd, 0.05), (0, 0, z), mat='M_Wood', color='wood_light')
    for x in (-sw_ / 2, 0, sw_ / 2):
        sh.box((0.06, sd, shh), (x, 0, shh / 2), mat='M_Wood', color='timber_mid')
    sh.box((sw_, 0.03, shh), (0, sd / 2 - 0.015, shh / 2), mat='M_Wood', color='timber_dark')
    for row, z in enumerate((0.11, 0.65, 1.19, 1.73)):
        x = -sw_ / 2 + 0.25
        while x < sw_ / 2 - 0.2:
            pick = rng.random()
            if row == 0 and pick < 0.6:
                su.gen_sack(sh, M((x, 0, z), (0, 0, rng.uniform(-0.3, 0.3))), h=0.42, r=0.17, rng=rng, open_top=False); x += 0.42
            elif pick < 0.55:
                su.gen_jar(sh, M((x, 0, z)), h=0.24, r=0.085, rng=rng, color=rng.choice(['ceramic', 'clay_pot', 'glass'])); x += 0.22
            else:
                basket(sh, M((x, 0, z), (0, 0, 0), (0.8, 0.8, 0.8)), rng); x += 0.38
    o = sh.build('RATION_StorageShelf', ci, parent=G['Interactables'], loc=(-0.9, D / 2 - T - sd / 2 - 0.02, FZ))
    su.tag(o, 'RATION_StorageShelf', interactable=True)

def gameplay(G):
    from terrain import collider
    P_ = G['Colliders']
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = BC.wall_frame(side, W, D, T, FZ)
        BC.wall_colliders('COL_RATION_Wall_%s' % side.capitalize(), mtx, ln, WH + 1.0, T, OPEN[side], P_)
    cx, cy, ln, dp, h = COUNTER
    cl = [('COL_RATION_Floor', (0, 0, FZ - 0.1), (W / 2, D / 2, 0.1)),
          ('COL_RATION_Counter', (cx, cy, FZ + h / 2), (ln / 2 + 0.06, dp / 2 + 0.07, h / 2)),
          ('COL_RATION_Shelf', (-0.9, D / 2 - T - 0.25, FZ + 1.1), (1.82, 0.25, 1.1)),
          ('COL_RATION_SideShelf', (-2.55, -0.2, FZ + 0.8), (0.22, 1.02, 0.8)),
          ('COL_RATION_InteriorSacks', (2.35, 0.4, FZ + 0.3), (0.4, 0.55, 0.3)),
          ('COL_RATION_Sacks', (2.95, -2.9, 0.33), (0.62, 0.55, 0.33)),
          ('COL_RATION_Crates', (-2.6, -3.0, 0.3), (0.85, 0.65, 0.3)),
          ('COL_RATION_Sign', (0.25, -2.85, 0.45), (0.36, 0.3, 0.45)),
          ('COL_RATION_Barrels', (-3.52, 1.3, 0.45), (0.38, 0.75, 0.45)),
          ('COL_RATION_Cart', (5.3, 1.9, 0.5), (1.15, 0.6, 0.5))]
    for k, ((sx, sy), _) in enumerate(STALLS):
        cl.append(('COL_RATION_Stall_%02d' % (k + 1), (sx, sy, 0.6), (0.5, 0.78, 0.6)))
    for nm, loc, hh in cl:
        yaw = math.radians(28) if nm == 'COL_RATION_Cart' else 0.0
        collider(nm, loc, (0, 0, yaw), hh, parent=P_)
    collider('COL_RATION_EntryRamp', (1.45, -D / 2 - 0.25, FZ / 2 - 0.03), (math.atan2(FZ, 0.6), 0, 0), (0.8, 0.35, 0.05), parent=P_)
    Z = G['Zones']
    BC.zone('RATION_InteractionZone_Counter', Z, (cx, -2.75, 0.7), (1.2, 0.4, 0.7), 'counter_customer', 'RATION_InteractionZone', targets=['RATION_Counter', 'RATION_WeighingScale'])
    BC.zone('RATION_InteractionZone_Scale', Z, (cx - 0.3, -1.05, FZ + 0.7), (0.8, 0.35, 0.7), 'scale_shopkeeper', 'RATION_InteractionZone', targets=['RATION_WeighingScale'])
    BC.zone('RATION_InteractionZone_Shelf', Z, (-0.9, 0.95, FZ + 0.7), (1.5, 0.4, 0.7), 'storage_shelf', 'RATION_InteractionZone', targets=['RATION_StorageShelf'])
    BC.zone('RATION_InteractionZone_Sacks', Z, (2.0, -3.4, 0.7), (0.45, 0.45, 0.7), 'sacks', 'RATION_InteractionZone', targets=['RATION_RiceBag', 'RATION_LentilBag', 'RATION_GrainBag'])
    BC.zone('RATION_InteractionZone_Crates', Z, (-1.5, -2.65, 0.7), (0.3, 0.45, 0.7), 'produce', 'RATION_InteractionZone', targets=['RATION_ProduceCrate'])
    BC.zone('RATION_InteractionZone_Stalls', Z, (4.85, -0.4, 0.7), (0.4, 1.4, 0.7), 'side_stalls', 'RATION_InteractionZone', targets=['RATION_Stall'])
    BC.marker('RATION_Entrance', Z, (1.45, -3.1, 0.0), 0.0, 'entrance', forward_local=[0, 1, 0], door_ids=[], clear_width=1.45, clear_height=2.35, note='open market front; entry gap beside counter')
    BC.marker('RATION_Entrance_Rear', Z, (1.75, D / 2 + 0.8, 0.0), math.pi, 'entrance', forward_local=[0, -1, 0], door_ids=['RATION_Door_Back'], clear_width=1.1, clear_height=2.05)
    dm = BC.door_leaf(1.08, 2.03, 0.07, s=1, color='timber_warm', planks=4)
    ob = dm.build('RATION_Door_Back', CP + 'RATION_Interactables', parent=G['Interactables'], loc=(2.3, D / 2 - 0.04, FZ), rot=(0, 0, math.pi))
    su.tag(ob, 'RATION_Door', instance_id='RATION_Door_Back', interactable=True, animation='door', pivot_axis='Z', closed_yaw_deg=180.0, open_yaw_deg=80.0, initial='closed')