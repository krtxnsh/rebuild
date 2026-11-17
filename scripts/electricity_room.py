"""electricity_room.py - Building A: red-brick electricity workshop with curved slate roof, golden timber,
round gable window, chimney, waterwheel, utility poles, bulbs and an enterable educational interior.
Building-local space: front gable faces -Y, origin at ground centre.  Reference: elec_primary.jpg (+ elec_multi.jpg)."""
import bpy, math, random
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col
import building_common as BC
import layout as L

KEY = 'ELEC'
CP = 'VILLAGE_ROOT/03_BUILDINGS/ELECTRICITY_ROOM/'
W, D, T, FZ, WH = 5.0, 5.6, 0.28, 0.35, 3.0
ZR, ZE, XE = 6.75, 3.12, 3.1          # ridge height, eave height, eave half-span
Y0, Y1 = -3.25, 3.25                   # roof extent along Y
OPEN = {
    'front': [(-1.0, 1.0, 0.0, 2.5)],
    'right': [(-1.95, -1.05, 1.05, 2.15)],
    'back': [(-1.6, -0.5, 0.0, 2.1), (0.9, 1.7, 1.1, 2.0)],
    'left': [(-0.5, 0.4, 1.1, 2.1)],
}
WHEEL_C = (2.92, 0.55, 1.42)
WHEEL_R = 1.25

def zprof(x):
    t = min(abs(x) / XE, 1.0)
    return ZR - (ZR - ZE) * (0.42 * t + 0.58 * (1 - (1 - t) ** 2))

def curve_pts(n=26, x0=-XE, x1=XE):
    return [(x0 + (x1 - x0) * i / n, 0.0, zprof(x0 + (x1 - x0) * i / n)) for i in range(n + 1)]

def build():
    rng = random.Random(101)
    root, G = BC.make_root(KEY, CP + 'ELEC_Exterior')
    shell, glass, roof, props = MB(), MB(), MB(), MB()
    # ---------------------------------------------------------------- foundation, floor, apron
    shell.box((W + 0.5, D + 0.5, FZ - 0.02), (0, 0, (FZ - 0.02) / 2), mat='M_Stone', color='stone', bevel=0.05)
    BC.floor_planks(shell, -W / 2 + T, W / 2 - T, -D / 2 + T, D / 2 - T, FZ, rng)
    shell.box((2.5, 0.55, 0.2), (0, -D / 2 - 0.5, 0.1), mat='M_Stone', color='stone_light', bevel=0.04)
    for i in range(9):
        x = -1.6 + 3.2 * (i % 3) / 2 + rng.uniform(-0.15, 0.15)
        y = -D / 2 - 1.05 - 0.6 * (i // 3) + rng.uniform(-0.1, 0.1)
        shell.box((rng.uniform(0.7, 1.0), rng.uniform(0.45, 0.6), 0.1), (x, y, 0.04), (0, 0, rng.uniform(-0.15, 0.15)), mat='M_Stone', color=col('stone_light', 0.1, rng), bevel=0.04)
    # ---------------------------------------------------------------- brick walls
    wall_rects = {}
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = BC.wall_frame(side, W, D, T, FZ)
        wall_rects[side] = (mtx, ln)
        BC.build_wall(shell, mtx, ln, WH, T, OPEN[side], 'M_Brick', 'white', rng)
    for side in ('front', 'back'):
        mtx, ln = wall_rects[side]
        top = []
        for i in range(25):
            u = W / 2 - W * i / 24
            x = u if side == 'front' else -u
            top.append((u, max(zprof(x) - 0.22 - FZ, WH + 0.04)))
        boundary = [(-W / 2, WH), (W / 2, WH)] + top[1:-1]
        hole = (0.0, 4.45 - FZ, 0.58) if side == 'front' else None
        BC.gable(shell, mtx, boundary, T, 'M_Brick', 'white', hole=hole)
    # ---------------------------------------------------------------- golden timber frame
    gold = lambda: col('timber_gold', 0.06, rng)
    for sx in (-1, 1):
        for sy in (-1, 1):
            shell.box((0.34, 0.34, WH + 0.15), (sx * (W / 2 - 0.05), sy * (D / 2 - 0.05), FZ + (WH + 0.15) / 2 - 0.05), mat='M_Wood', color=gold(), bevel=0.045)
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = wall_rects[side]
        shell.box((ln + (0.5 if side in ('front', 'back') else 0.0), 0.3, 0.3), (0, -T / 2 - 0.08, WH + 0.0), mat='M_Wood', color=gold(), matrix=mtx, bevel=0.04)
        shell.box((ln + 0.3, 0.2, 0.18), (0, -T / 2 - 0.05, 0.05), mat='M_Wood', color=col('timber_mid'), matrix=mtx, bevel=0.03)
    fm, _ = wall_rects['front']
    for s in (-1, 1):
        shell.box((0.26, 0.3, 2.62), (s * 1.16, -T / 2 - 0.07, 1.31), mat='M_Wood', color=gold(), matrix=fm, bevel=0.035)
        BC.beam(shell, (s * 2.25, -T / 2 - 0.06, WH + 0.1), (s * 0.95, -T / 2 - 0.06, 5.0 - FZ), 0.22, 0.24, gold(), fm)
        BC.beam(shell, (s * 2.25, T / 2 + 0.06, WH + 0.1), (s * 0.95, T / 2 + 0.06, 5.0 - FZ), 0.18, 0.2, gold(), fm)
    arch = [(1.12 * math.cos(math.pi * i / 12), -T / 2 - 0.1, 2.5 + 0.08 + 0.28 * math.sin(math.pi * i / 12)) for i in range(13)]
    shell.add(su.prim_sweep([fm @ Vector(p) for p in arch], su.rect_profile(0.3, 0.26)), 'M_Wood', gold())
    bm_, _ = wall_rects['back']
    for s in (-1, 1):
        BC.beam(shell, (s * 2.25, -T / 2 - 0.06, WH + 0.1), (s * 0.7, -T / 2 - 0.06, 5.2 - FZ), 0.22, 0.24, gold(), bm_)
    shell.box((0.26, 0.3, 2.2), (-1.73, -T / 2 - 0.07, 1.1), mat='M_Wood', color=gold(), matrix=bm_, bevel=0.03)
    shell.box((0.26, 0.3, 2.2), (-0.37, -T / 2 - 0.07, 1.1), mat='M_Wood', color=gold(), matrix=bm_, bevel=0.03)
    shell.box((1.6, 0.3, 0.22), (-1.05, -T / 2 - 0.07, 2.2), mat='M_Wood', color=gold(), matrix=bm_, bevel=0.03)
    for y in (-1.3, 1.3):
        shell.box((W - 0.3, 0.22, 0.26), (0, y, FZ + WH - 0.1), mat='M_Wood', color='timber_mid', bevel=0.03)
    # ---------------------------------------------------------------- round gable window
    cz = 4.45
    rot_y = (math.pi / 2, 0, 0)
    shell.add(su.prim_ring(0.56, 0.76, 0.26, 24), 'M_Wood', col('timber_gold'), M((0, -D / 2 - 0.03, cz), rot_y), smooth=True)
    shell.add(su.prim_ring(0.56, 0.68, 0.1, 24), 'M_Wood', col('timber_gold'), M((0, -D / 2 + T + 0.03, cz), rot_y), smooth=True)
    for k in (-1, 1):
        o = k * 0.19
        ln = 2 * math.sqrt(0.58 ** 2 - o ** 2)
        shell.box((0.06, 0.07, ln), (o, -D / 2 + T / 2, cz), mat='M_Wood', color='timber_gold')
        shell.box((ln, 0.07, 0.06), (0, -D / 2 + T / 2, cz + o), mat='M_Wood', color='timber_gold')
    glass.add(su.prim_cyl(0.58, 0.02, 24, z0=False), 'M_GlassWarm', 'glass', M((0, -D / 2 + T / 2 + 0.04, cz), rot_y))
    for side in ('right', 'back', 'left'):
        mtx, ln = wall_rects[side]
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 0.01:
                BC.window(shell, glass, mtx, (a + b) / 2, z0, b - a, z1 - z0, T, frame='timber_gold', fw=0.12, grid=(2, 2))
    # ---------------------------------------------------------------- chimney (left-rear, per primary reference)
    cx, cy = -W / 2 - 0.42, 1.45
    shell.box((0.95, 1.05, 7.45), (cx, cy, 7.45 / 2), mat='M_Brick', color='white')
    shell.box((1.1, 1.2, 0.16), (cx, cy, 7.5), mat='M_Brick', color=col('white', 0, None, 0.85), bevel=0.03)
    for k, h in ((-0.22, 0.5), (0.24, 0.38)):
        shell.box((0.4, 0.44, h), (cx, cy + k, 7.58 + h / 2), mat='M_Brick', color='white', bevel=0.02)
        shell.box((0.48, 0.52, 0.08), (cx, cy + k, 7.6 + h), mat='M_Brick', color=col('white', 0, None, 0.8), bevel=0.02)
    # ---------------------------------------------------------------- curved slate roof
    cp = curve_pts(26)
    deck_path = [Vector((x, 0, z - 0.11)) for (x, _, z) in cp]
    roof.add(su.prim_sweep(deck_path, [(Y0, -0.09), (Y1, -0.09), (Y1, 0.09), (Y0, 0.09)]), 'M_Wood', 'timber_mid')
    for s in (-1, 1):
        side_pts = [Vector((s * XE * (1 - i / 60), 0, zprof(s * XE * (1 - i / 60)))) for i in range(61)]
        acc = [0.0]
        for i in range(1, len(side_pts)):
            acc.append(acc[-1] + (side_pts[i] - side_pts[i - 1]).length)
        total = acc[-1]
        def at(sv):
            for i in range(1, len(acc)):
                if acc[i] >= sv:
                    f = (sv - acc[i - 1]) / max(acc[i] - acc[i - 1], 1e-6)
                    return side_pts[i - 1].lerp(side_pts[i], f), (side_pts[i] - side_pts[i - 1]).normalized()
            return side_pts[-1], (side_pts[-1] - side_pts[-2]).normalized()
        row = 0.27
        nrow = int((total - 0.2) / row)
        for r in range(nrow + 1):
            sv = min(r * row, total - 0.3)
            p, tng = at(sv + 0.24)
            xa = Vector((0, 1, 0)); ya = tng; za = xa.cross(ya)
            if za.z < 0:
                xa = -xa; za = -za
            ncol = 15
            for c in range(ncol + (r % 2)):
                y = Y0 + 0.02 + (Y1 - Y0 - 0.04) * (c + (0.0 if r % 2 else 0.5)) / ncol
                if y > Y1 - 0.12 or y < Y0 + 0.12:
                    continue
                pos = p + za * 0.06 + Vector((0, y, 0))
                m = Matrix(((xa.x, ya.x, za.x, pos.x), (xa.y, ya.y, za.y, pos.y), (xa.z, ya.z, za.z, pos.z), (0, 0, 0, 1)))
                m = m @ M((0, 0, 0), (-0.09 + rng.uniform(-0.03, 0.03), rng.uniform(-0.04, 0.04), rng.uniform(-0.05, 0.05)))
                ccol = su.lerpc('slate', rng.choice(['slate_dark', 'slate_light']), rng.uniform(0.0, 0.6))
                roof.add(su.prim_box(0.43, 0.5, 0.05), 'M_Slate', ccol, m)
    for yb in (Y0 - 0.05, Y1 + 0.05):
        bp = [Vector((x, yb, z + 0.08)) for (x, _, z) in curve_pts(26, -XE - 0.12, XE + 0.12)]
        roof.add(su.prim_sweep(bp, [(-0.13, -0.2), (0.13, -0.2), (0.13, 0.2), (-0.13, 0.2)]), 'M_Wood', col('timber_gold', 0.05, rng))
    roof.box((0.32, Y1 - Y0 + 0.75, 0.3), (0, 0.0, ZR + 0.2), mat='M_Wood', color='timber_gold', bevel=0.05)
    roof.box((0.5, 0.42, 0.42), (0, Y0 - 0.32, ZR + 0.18), mat='M_Wood', color='timber_gold', bevel=0.06)
    for s in (-1, 1):
        roof.box((0.18, Y1 - Y0, 0.22), (s * (XE + 0.02), 0, zprof(XE) - 0.05), mat='M_Wood', color='timber_gold', bevel=0.03)
    exterior_props(G, rng, shell, glass, roof, props)
    interior(G, rng)
    gameplay(G)
    return root
FENCE = [[(-3.6, 2.4), (-3.6, -3.4), (-2.6, -4.6), (-1.3, -4.95)], [(1.3, -4.95), (2.6, -4.6), (4.2, -3.6), (4.2, 2.4)]]
POLES = {'ELEC_PowerPole_01': ((-4.3, -2.3), 6.6, 0.04), 'ELEC_PowerPole_02': ((4.95, 3.5), 6.4, -0.03), 'ELEC_PowerPole_03': ((5.6, -1.6), 6.1, 0.035)}
POOL = (2.55, 3.75, -0.9, 2.0)

def bulb_mb():
    bm = MB()
    bm.lathe([(0.0, -0.17), (0.04, -0.16), (0.065, -0.12), (0.06, -0.07), (0.03, -0.035), (0.026, 0.0)], 'M_Bulb', 'white', M(), segs=10)
    return bm

def iron_fence(fence, polys, h=1.0, gap=0.16):
    for poly in polys:
        for i in range(len(poly) - 1):
            a, b = Vector(tuple(poly[i]) + (0,)), Vector(tuple(poly[i + 1]) + (0,))
            d = b - a
            n = max(1, int(d.length / gap))
            for k in range(1, n):
                p = a + d * (k / n)
                hh = h if k % 2 else h - 0.1
                fence.add(su.prim_box(0.025, 0.025, hh, z0=True), 'M_Metal', 'iron', M(p))
                fence.add(su.prim_cyl(0.035, 0.09, 4, r2=0.0, caps=(True, False)), 'M_Metal', 'iron', M(p + Vector((0, 0, hh))))
            for zr_ in (0.14, h - 0.18):
                fence.add(su.prim_sweep([a + Vector((0, 0, zr_)), b + Vector((0, 0, zr_))], su.rect_profile(0.03, 0.04)), 'M_Metal', 'iron')
            for p in (a, b):
                fence.add(su.prim_box(0.07, 0.07, h + 0.12, z0=True), 'M_Metal', 'iron', M(p))
                fence.add(su.prim_sphere(0.065, 8, 5), 'M_Metal', 'iron', M(p + Vector((0, 0, h + 0.18))), smooth=True)

def exterior_props(G, rng, shell, glass, roof, props):
    ext = CP + 'ELEC_Exterior'
    cia = CP + 'ELEC_Interactables'
    # facade bulb string (3 left / 4 right of the door as in the reference)
    bulbs = []
    wire_pts = su.catenary((-2.5, -D / 2 - 0.35, 3.3), (2.5, -D / 2 - 0.35, 3.3), 0.22, 20)
    props.tube(wire_pts, 0.012, 'M_Metal', 'iron', 5)
    for k, tpar in enumerate([0.06, 0.16, 0.26, 0.66, 0.76, 0.86, 0.95]):
        idx = tpar * 20
        i0 = int(idx); f = idx - i0
        p = wire_pts[i0].lerp(wire_pts[min(i0 + 1, 20)], f)
        props.add(su.prim_cyl(0.006, 0.12, 4), 'M_Metal', 'iron', M((p.x, p.y, p.z - 0.12)))
        props.add(su.prim_cyl(0.032, 0.07, 8), 'M_Metal', 'brass', M((p.x, p.y, p.z - 0.19)), smooth=True)
        bulbs.append(((p.x, p.y, p.z - 0.19), 'ELEC_Bulb_%02d' % (k + 1)))
    for s in (-1, 1):
        props.box((0.1, 0.4, 0.1), (s * 2.5, -D / 2 - 0.2, 3.3), mat='M_Wood', color='timber_gold')
    lan_glass = MB()
    props.box((0.06, 0.35, 0.06), (1.6, -D / 2 - 0.2, 2.65), mat='M_Metal', color='iron')
    su.gen_lantern(props, lan_glass, M((1.6, -D / 2 - 0.38, 2.15)), 1.0)
    props.tube([(1.6, -D / 2 - 0.38, 2.52), (1.6, -D / 2 - 0.38, 2.65)], 0.01, 'M_Metal', 'iron', 4)
    house_ins = {'HL1': (-2.62, -2.4, 3.62), 'HL2': (-2.62, -1.4, 3.62), 'HR1': (2.62, 1.9, 3.62), 'HR2': (2.62, -2.1, 3.62)}
    for nm, p in house_ins.items():
        s = -1 if p[0] < 0 else 1
        props.box((0.3, 0.08, 0.08), (p[0] - s * 0.05, p[1], p[2] - 0.12), mat='M_Wood', color='timber_gold')
        props.lathe([(0.0, 0), (0.05, 0.0), (0.06, 0.05), (0.04, 0.07), (0.055, 0.1), (0.035, 0.14), (0.0, 0.15)], 'M_Clay', 'ceramic', M((p[0], p[1], p[2] - 0.08)), segs=8)
    # ladder, spools, ground lantern, coiled cable
    su.gen_ladder(props, M((-2.78, -1.0, 0.0), (0, math.radians(-14), math.pi / 2)), 3.1, 0.5)
    for (x, y, z) in [(-2.85, -3.75, 0.0), (-2.3, -4.05, 0.0), (-2.6, -3.9, 0.34)]:
        m = M((x, y, z))
        for zz in (0.0, 0.28):
            props.add(su.prim_cyl(0.33, 0.05, 12), 'M_Wood', col('wood_light', 0.08, rng), m @ M((0, 0, zz)), smooth=True)
        props.add(su.prim_cyl(0.22, 0.24, 12, caps=(False, False)), 'M_Metal', 'iron', m @ M((0, 0, 0.04)), smooth=True)
    su.gen_lantern(props, lan_glass, M((-3.15, -4.25, 0.0)), 1.4)
    for k in range(5):
        props.add(su.prim_ring(0.26 + 0.015 * (k % 2), 0.29 + 0.015 * (k % 2), 0.035, 14), 'M_Metal', 'iron', M((3.3, -4.0, 0.03 + k * 0.035), (0, 0, k * 0.4)), smooth=True)
    # wrought-iron fence with open gate
    iron_fence(props, FENCE)
    for s in (-1, 1):
        hinge = Vector((s * 1.3, -4.95, 0))
        ang = math.atan2(-1.0, -s * 0.35)
        dirv = Vector((math.cos(ang), math.sin(ang), 0))
        for k in range(7):
            props.add(su.prim_box(0.022, 0.022, 0.95, z0=True), 'M_Metal', 'iron', M(hinge + dirv * (0.08 + k * 0.16)))
        for zr_ in (0.15, 0.55, 0.9):
            props.add(su.prim_sweep([hinge + Vector((0, 0, zr_)), hinge + dirv * 1.1 + Vector((0, 0, zr_))], su.rect_profile(0.025, 0.035)), 'M_Metal', 'iron')
        props.add(su.prim_ring(0.12, 0.15, 0.025, 12), 'M_Metal', 'iron', M(hinge + dirv * 0.55 + Vector((0, 0, 0.72)), (math.pi / 2, 0, ang)))
    # wheel pool (stone rim), flume on posts, cistern barrel (inferred water source)
    px0, px1, py0, py1 = POOL
    for (a, b) in (((px0, py0), (px1, py0)), ((px1, py0), (px1, py1)), ((px1, py1), (px0, py1))):
        a, b = Vector(a + (0,)), Vector(b + (0,))
        d = b - a
        n = max(1, int(d.length / 0.55))
        for k in range(n):
            p = a + d * ((k + 0.5) / n)
            props.box((d.length / n - 0.04, 0.24, 0.38), (p.x, p.y, 0.19), (0, 0, math.atan2(d.y, d.x) + rng.uniform(-0.03, 0.03)), mat='M_Stone', color=col('stone', 0.1, rng), bevel=0.05)
    props.box((px1 - px0, py1 - py0, 0.06), ((px0 + px1) / 2, (py0 + py1) / 2, 0.03), mat='M_Stone', color='stone_dark')
    fx = WHEEL_C[0]
    for y in (2.3, 3.5, 4.6):
        for s in (-1, 1):
            props.box((0.12, 0.12, 2.8), (fx + s * 0.26, y, 1.4), mat='M_Wood', color='timber_mid', bevel=0.015)
        props.box((0.7, 0.12, 0.12), (fx, y, 2.74), mat='M_Wood', color='timber_mid')
    props.box((0.5, 4.3, 0.06), (fx, 2.85, 2.83), mat='M_Wood', color='wood_light')
    for s in (-1, 1):
        props.box((0.06, 4.3, 0.3), (fx + s * 0.25, 2.85, 2.95), mat='M_Wood', color='wood_light')
        for y in (4.9, 5.7):
            props.box((0.14, 0.14, 2.3), (fx + s * 0.45, y, 1.15), mat='M_Wood', color='timber_mid')
    props.box((1.2, 1.2, 0.12), (fx, 5.3, 2.32), mat='M_Wood', color='wood_light')
    su.gen_barrel(props, M((fx, 5.3, 2.38)), h=1.3, r=0.62, rng=rng, open_top=True)
    # utility poles (separate interactables) + cables
    arm_pts = {}
    for nm, ((x, y), h, lean) in POLES.items():
        pm = MB()
        pm.add(su.prim_cyl(0.17, h, 8, r2=0.12), 'M_Wood', col('timber_warm', 0.05, rng), M((0, 0, 0)), smooth=True)
        ins = []
        for za, aw in ((h - 0.45, 1.7), (h - 1.15, 1.2)):
            pm.box((aw, 0.14, 0.16), (0, 0, za), mat='M_Wood', color='timber_mid', bevel=0.02)
            for s in (-1, 1):
                px = s * (aw / 2 - 0.12)
                pm.lathe([(0.0, 0), (0.05, 0.0), (0.075, 0.05), (0.04, 0.07), (0.07, 0.11), (0.04, 0.13), (0.06, 0.17), (0.03, 0.2), (0.0, 0.21)], 'M_Clay', 'ceramic', M((px, 0, za + 0.08)), segs=8)
                ins.append(Vector((px, 0, za + 0.27)))
            pm.box((0.06, 0.06, 0.5), (0.25, 0, za - 0.3), (0, math.radians(35), 0), mat='M_Wood', color='timber_mid')
            pm.box((0.06, 0.06, 0.5), (-0.25, 0, za - 0.3), (0, math.radians(-35), 0), mat='M_Wood', color='timber_mid')
        yaw = math.atan2(-y, -x) + math.pi / 2
        ob = pm.build(nm, cia, parent=G['Interactables'], loc=(x, y, 0), rot=(lean, 0, yaw))
        su.tag(ob, 'ELEC_PowerPole', interactable=True, instance_id=nm)
        bpy.context.view_layer.update()
        arm_pts[nm] = [ob.matrix_local @ p for p in ins]
    cable_defs = [('ELEC_Cable_01', arm_pts['ELEC_PowerPole_01'][1], Vector(house_ins['HL1']), 0.55),
                  ('ELEC_Cable_02', arm_pts['ELEC_PowerPole_01'][3], Vector(house_ins['HL2']), 0.45),
                  ('ELEC_Cable_03', arm_pts['ELEC_PowerPole_02'][0], arm_pts['ELEC_PowerPole_03'][0], 0.7),
                  ('ELEC_Cable_04', arm_pts['ELEC_PowerPole_02'][2], Vector(house_ins['HR1']), 0.5),
                  ('ELEC_Cable_05', arm_pts['ELEC_PowerPole_03'][3], Vector(house_ins['HR2']), 0.5)]
    for nm, a, b, sag in cable_defs:
        cm = MB()
        cm.tube(su.catenary(a, b, sag, 16), 0.018, 'M_Metal', 'iron', 5)
        ob = cm.build(nm, cia, parent=G['Interactables'])
        su.tag(ob, 'ELEC_Cable', interactable=True, instance_id=nm)
    # build static exterior objects
    o = shell.build('ELEC_Shell', ext, parent=G['Exterior']); su.tag(o, 'ELEC_Shell')
    o = glass.build('ELEC_WindowGlass', ext, parent=G['Exterior']); su.tag(o, 'ELEC_WindowGlass', emissive=True)
    o = roof.build('ELEC_Roof', ext, parent=G['Roof']); su.tag(o, 'ELEC_Roof', cutaway='roof')
    o = props.build('ELEC_ExteriorProps', ext, parent=G['Exterior']); su.tag(o, 'ELEC_ExteriorProps')
    o = lan_glass.build('ELEC_LanternGlass', ext, parent=G['Exterior']); su.tag(o, 'ELEC_LanternGlass', emissive=True)
    # pool + flume water and the wheel waterfall (special shader targets)
    wmb = MB()
    wmb.add(su.prim_box(px1 - px0 - 0.3, py1 - py0 - 0.3, 0.01), 'M_Water', 'water', M(((px0 + px1) / 2, (py0 + py1) / 2, 0.29)))
    wmb.add(su.prim_box(0.38, 4.2, 0.01), 'M_Water', 'water', M((fx, 2.85, 2.93)))
    o = wmb.build('ELEC_PoolWater', CP + 'ELEC_WaterWheel', parent=G['Exterior'])
    su.tag(o, 'ELEC_PoolWater', shader_target='water_still')
    fall = MB()
    fp = [Vector((fx, 0.75, 2.88))]
    for i in range(1, 8):
        b_ = 0.2 + 1.3 * i / 7
        fp.append(Vector((fx, WHEEL_C[1] - (WHEEL_R + 0.06) * math.sin(b_), WHEEL_C[2] + (WHEEL_R + 0.06) * math.cos(b_))))
    fp.append(Vector((fx, fp[-1].y + 0.15, 0.3)))
    fall.add(su.prim_sweep(fp, [(-0.2, 0.0), (0.2, 0.0)], closed_profile=False, caps=False), 'M_WaterFall', 'foam', smooth=True)
    o = fall.build('ELEC_WheelFall', CP + 'ELEC_WaterWheel', parent=G['Exterior'])
    su.tag(o, 'ELEC_WheelFall', shader_target='waterfall', flow_axis='uv_v')
    # waterwheel (pivot on axle, rotates about local X)
    wh = MB()
    rx = (0, math.pi / 2, 0)
    for s in (-1, 1):
        wh.add(su.prim_ring(WHEEL_R - 0.14, WHEEL_R, 0.08, 24), 'M_Wood', col('timber_warm'), M((s * 0.27, 0, 0), rx))
        for k in range(8):
            a = 2 * math.pi * k / 8
            wh.box((0.07, 0.09, WHEEL_R - 0.2), (s * 0.27, math.cos(a) * (WHEEL_R / 2 + 0.05), math.sin(a) * (WHEEL_R / 2 + 0.05)), (a - math.pi / 2, 0, 0), mat='M_Wood', color='timber_mid')
    for k in range(14):
        a = 2 * math.pi * k / 14
        r = WHEEL_R - 0.12
        wh.box((0.56, 0.05, 0.3), (0, math.cos(a) * r, math.sin(a) * r), (a - math.pi / 2 + 0.35, 0, 0), mat='M_Wood', color=col('wood_light', 0.06, rng))
    wh.add(su.prim_cyl(0.2, 0.72, 10, z0=False), 'M_Metal', 'iron', M((0, 0, 0), rx), smooth=True)
    wh.add(su.prim_cyl(0.07, 1.85, 8), 'M_Metal', 'iron', M((0.45, 0, 0), (0, -math.pi / 2, 0)), smooth=True)
    o = wh.build('ELEC_WaterWheel', CP + 'ELEC_WaterWheel', parent=G['Interactables'], loc=WHEEL_C)
    su.tag(o, 'ELEC_WaterWheel', interactable=True, animation='rotate', pivot_axis='X', spin_dir=1, rpm=6.0, radius=WHEEL_R)
    for p, nm in bulbs:
        ob = bulb_mb().build(nm, cia, parent=G['Interactables'], loc=p)
        su.tag(ob, 'ELEC_Bulb', interactable=True, instance_id=nm, toggle='emissive', group='facade')
def gauge(mb, x, y, z, r, label):
    mb.add(su.prim_ring(r - 0.03, r + 0.02, 0.07, 20), 'M_Metal', 'brass', M((x, y, z), (math.pi / 2, 0, 0)), smooth=True)
    mb.add(su.prim_cyl(r - 0.02, 0.02, 20, z0=False), 'M_Clay', 'meter_face', M((x, y, z), (math.pi / 2, 0, 0)))
    for k in range(9):
        a = math.radians(-60 + 120 * k / 8)
        mb.box((0.008, 0.01, 0.04), (x + math.sin(a) * (r - 0.06), y - 0.015, z + math.cos(a) * (r - 0.06)), (0, -a, 0), mat='M_Metal', color='iron')
    tv, tf = su.gen_text(label, size=r * 0.32, extrude=0.002)
    mb.add((tv, tf), 'M_Metal', 'iron', M((x, y - 0.018, z - r * 0.42), (math.pi / 2, 0, 0)))
    mb.box((0.01, 0.006, r * 0.75), (x + 0.05, y - 0.022, z + r * 0.3), (0, -0.4, 0), mat='M_Clay', color='needle')

def interior(G, rng):
    cin = CP + 'ELEC_Interior'
    cia = CP + 'ELEC_Interactables'
    inn = MB()
    yb = D / 2 - T
    inn.box((2.7, 0.08, 1.75), (-0.3, yb - 0.04, FZ + 1.78), mat='M_Wood', color='timber_mid', bevel=0.02)
    for z in (FZ + 2.7, FZ + 0.88):
        inn.box((2.85, 0.12, 0.1), (-0.3, yb - 0.06, z), mat='M_Wood', color='timber_gold')
    gauge(inn, -0.25, yb - 0.1, FZ + 2.2, 0.17, 'AMPS')
    gauge(inn, 0.45, yb - 0.1, FZ + 2.25, 0.15, 'HZ')
    gauge(inn, -1.4, yb - 0.1, FZ + 1.55, 0.13, 'VOLTS')
    inn.box((0.42, 0.06, 0.62), (0.6, yb - 0.11, FZ + 1.45), mat='M_Slate', color='slate_dark', bevel=0.015)
    for z in (FZ + 1.3, FZ + 1.62):
        for s in (-1, 1):
            inn.box((0.04, 0.08, 0.1), (0.6 + s * 0.08, yb - 0.17, z), mat='M_Metal', color='copper')
    inn.tube([(1.25, WHEEL_C[1], FZ + 1.15), (1.25, WHEEL_C[1], FZ + 2.8), (1.25, yb - 0.15, FZ + 2.8), (0.6, yb - 0.15, FZ + 2.8), (0.6, yb - 0.15, FZ + 1.78)], 0.035, 'M_Metal', 'copper', 8)
    inn.tube([(-1.4, yb - 0.15, FZ + 2.65), (-1.4, yb - 0.15, FZ + 2.95), (-2.0, yb - 0.15, FZ + 2.95), (-2.0, -2.2, FZ + 2.95)], 0.03, 'M_Metal', 'iron', 8)
    # coil bench along the left wall
    inn.box((0.65, 1.5, 0.08), (-1.85, 0.6, FZ + 0.5), mat='M_Wood', color='wood_light', bevel=0.015)
    for sx in (-1, 1):
        for sy in (-1, 1):
            inn.box((0.07, 0.07, 0.5), (-1.85 + sx * 0.26, 0.6 + sy * 0.66, FZ + 0.25), mat='M_Wood', color='timber_mid')
    # shelves (left front)
    for z in (0.5, 1.1, 1.7):
        inn.box((0.38, 1.25, 0.05), (-2.02, -1.6, FZ + z), mat='M_Wood', color='wood_light')
    for sy in (-1, 1):
        inn.box((0.38, 0.05, 1.85), (-2.02, -1.6 + sy * 0.62, FZ + 0.92), mat='M_Wood', color='timber_mid')
    for k in range(5):
        y = -2.1 + k * 0.25
        su.gen_jar(inn, M((-2.02, y, FZ + 1.13)), h=0.2, r=0.07, color=rng.choice(['ceramic', 'clay_pot', 'copper']), rng=rng)
        inn.add(su.prim_cyl(0.08, 0.16, 10), 'M_Metal', 'copper', M((-2.02, y, FZ + 0.53)), smooth=True)
        inn.add(su.prim_cyl(0.09, 0.05, 10), 'M_Wood', 'wood_light', M((-2.02, y, FZ + 1.73)), smooth=True)
    # workbench (right front)
    inn.box((0.6, 1.2, 0.07), (1.9, -1.55, FZ + 0.9), mat='M_Wood', color='wood_light', bevel=0.015)
    for sx in (-1, 1):
        for sy in (-1, 1):
            inn.box((0.07, 0.07, 0.88), (1.9 + sx * 0.24, -1.55 + sy * 0.52, FZ + 0.44), mat='M_Wood', color='timber_mid')
    for k in range(3):
        inn.add(su.prim_cyl(0.07, 0.12, 10), 'M_Metal', rng.choice(['brass', 'copper']), M((1.85, -1.95 + k * 0.35, FZ + 0.94)), smooth=True)
    for (x, y) in ((0.0, -0.9), (0.0, 1.3)):
        inn.add(su.prim_cyl(0.008, 0.62, 4), 'M_Metal', 'iron', M((x, y, FZ + 2.33)))
        inn.add(su.prim_cyl(0.035, 0.08, 8), 'M_Metal', 'brass', M((x, y, FZ + 2.28)), smooth=True)
    o = inn.build('ELEC_InteriorFitout', cin, parent=G['Interior']); su.tag(o, 'ELEC_InteriorFitout', interior=True)
    for k, (x, y) in enumerate(((0.0, -0.9), (0.0, 1.3))):
        nm = 'ELEC_Bulb_%02d' % (8 + k)
        ob = bulb_mb().build(nm, cia, parent=G['Interactables'], loc=(x, y, FZ + 2.28))
        su.tag(ob, 'ELEC_Bulb', interactable=True, instance_id=nm, toggle='emissive', group='interior')
    # main voltage meter (needle separate, pivot at dial centre)
    vm = MB()
    r = 0.22
    vm.add(su.prim_ring(r - 0.03, r + 0.025, 0.08, 24), 'M_Metal', 'brass', M((0, 0, 0), (math.pi / 2, 0, 0)), smooth=True)
    vm.add(su.prim_cyl(r - 0.02, 0.02, 24, z0=False), 'M_Clay', 'meter_face', M((0, 0, 0), (math.pi / 2, 0, 0)))
    for k in range(11):
        a = math.radians(-60 + 120 * k / 10)
        vm.box((0.008, 0.01, 0.05 if k % 5 == 0 else 0.03), (math.sin(a) * (r - 0.06), -0.015, math.cos(a) * (r - 0.06)), (0, -a, 0), mat='M_Metal', color='iron')
    tv, tf = su.gen_text('VOLTS', size=0.07, extrude=0.002)
    vm.add((tv, tf), 'M_Metal', 'iron', M((0, -0.018, -0.09), (math.pi / 2, 0, 0)))
    o_vm = vm.build('ELEC_VoltageMeter', cia, parent=G['Interactables'], loc=(-1.0, yb - 0.1, FZ + 2.15))
    su.tag(o_vm, 'ELEC_VoltageMeter', interactable=True)
    nd = MB()
    nd.box((0.012, 0.008, r * 0.85), (0, 0, r * 0.38), mat='M_Clay', color='needle')
    nd.add(su.prim_cyl(0.02, 0.02, 8, z0=False), 'M_Metal', 'iron', M((0, 0, 0), (math.pi / 2, 0, 0)))
    o_nd = nd.build('ELEC_VoltageMeter_Needle', cia, parent=o_vm, loc=(0, -0.03, 0), rot=(0, math.radians(-40), 0))
    su.tag(o_nd, 'ELEC_VoltageMeter_Needle', animation='rotate', pivot_axis='Y', min_deg=-60, max_deg=60, parent_id='ELEC_VoltageMeter')
    # main knife switch lever (pivot at hinge)
    sw = MB()
    for s in (-1, 1):
        sw.box((0.025, 0.03, 0.42), (s * 0.08, 0, 0.21), mat='M_Metal', color='copper')
    sw.box((0.2, 0.03, 0.03), (0, 0, 0.4), mat='M_Metal', color='copper')
    sw.add(su.prim_cyl(0.03, 0.16, 8), 'M_Wood', 'iron', M((0, -0.03, 0.4), (math.pi / 2, 0, 0)), smooth=True)
    o_sw = sw.build('ELEC_MainSwitch', cia, parent=G['Interactables'], loc=(0.6, yb - 0.18, FZ + 1.25), rot=(math.radians(-20), 0, 0))
    su.tag(o_sw, 'ELEC_MainSwitch', interactable=True, animation='rotate', pivot_axis='X', off_deg=-20, on_deg=0)
    # generator (driven by the waterwheel axle through the wall)
    gm = MB()
    ry = (0, math.pi / 2, 0)
    gm.box((1.0, 0.95, 0.32), (0, 0, 0.16), mat='M_Metal', color='iron', bevel=0.03)
    gm.add(su.prim_cyl(0.42, 0.7, 16, z0=False), 'M_Metal', 'iron_rust', M((0, 0, 0.75), ry), smooth=True)
    for k in (-0.22, 0.0, 0.22):
        gm.add(su.prim_ring(0.41, 0.46, 0.12, 16), 'M_Metal', 'copper', M((k, 0, 0.75), ry), smooth=True)
    for s in (-1, 1):
        gm.add(su.prim_cyl(0.3, 0.1, 12, z0=False), 'M_Metal', 'iron', M((s * 0.4, 0, 0.75), ry), smooth=True)
        gm.add(su.prim_cyl(0.035, 0.15, 8), 'M_Metal', 'brass', M((s * 0.15, 0, 1.15)), smooth=True)
    gm.add(su.prim_cyl(0.06, 0.4, 8), 'M_Metal', 'iron', M((0.4, 0, 0.75), ry), smooth=True)
    o_g = gm.build('ELEC_Generator', cia, parent=G['Interactables'], loc=(1.25, WHEEL_C[1], FZ))
    su.tag(o_g, 'ELEC_Generator', interactable=True)
    # copper coils (simplified bodies + selected raised winding rings)
    cc = MB()
    for (yy, h, r) in ((0.1, 0.42, 0.17), (0.6, 0.55, 0.2), (1.1, 0.36, 0.15)):
        base = M((0, yy, 0))
        cc.add(su.prim_cyl(r + 0.05, 0.04, 12), 'M_Wood', 'timber_mid', base, smooth=True)
        cc.add(su.prim_cyl(r, h, 14), 'M_Metal', 'copper', base @ M((0, 0, 0.04)), smooth=True)
        for j in range(5):
            cc.add(su.prim_ring(r - 0.005, r + 0.018, 0.025, 14), 'M_Metal', 'copper', base @ M((0, 0, 0.08 + j * (h - 0.08) / 4)), smooth=True)
        cc.add(su.prim_cyl(r + 0.04, 0.04, 12), 'M_Wood', 'timber_mid', base @ M((0, 0, h + 0.04)), smooth=True)
        cc.add(su.prim_cyl(0.05, 0.12, 8), 'M_Metal', 'iron', base @ M((0, 0, h + 0.08)), smooth=True)
    o_c = cc.build('ELEC_CopperCoils', cia, parent=G['Interactables'], loc=(-1.85, 0.0, FZ + 0.54))
    su.tag(o_c, 'ELEC_CopperCoils', interactable=True)

def gameplay(G):
    from terrain import collider
    P_ = G['Colliders']
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = BC.wall_frame(side, W, D, T, FZ)
        BC.wall_colliders('COL_ELEC_Wall_%s' % side.capitalize(), mtx, ln, WH + 1.0, T, OPEN[side], P_)
    cl = [('COL_ELEC_Floor', (0, 0, FZ - 0.1), (W / 2, D / 2, 0.1)),
          ('COL_ELEC_Panel', (-0.3, D / 2 - T - 0.08, FZ + 1.4), (1.4, 0.1, 1.4)),
          ('COL_ELEC_Generator', (1.25, WHEEL_C[1], FZ + 0.6), (0.55, 0.5, 0.6)),
          ('COL_ELEC_CoilBench', (-1.85, 0.6, FZ + 0.5), (0.35, 0.78, 0.5)),
          ('COL_ELEC_Shelf', (-2.02, -1.6, FZ + 0.95), (0.2, 0.65, 0.95)),
          ('COL_ELEC_Workbench', (1.9, -1.55, FZ + 0.48), (0.32, 0.62, 0.48)),
          ('COL_ELEC_Chimney', (-W / 2 - 0.42, 1.45, 3.7), (0.48, 0.53, 3.7)),
          ('COL_ELEC_Pool', (3.15, 0.55, 0.2), (0.62, 1.47, 0.2)),
          ('COL_ELEC_WaterWheel', WHEEL_C, (0.35, WHEEL_R, WHEEL_R)),
          ('COL_ELEC_Cistern', (2.92, 5.3, 1.8), (0.65, 0.65, 1.8)),
          ('COL_ELEC_Spools', (-2.6, -3.9, 0.35), (0.6, 0.45, 0.35))]
    for nm, loc, h in cl:
        collider(nm, loc, (0, 0, 0), h, parent=P_)
    collider('COL_ELEC_EntryRamp', (0, -D / 2 - 0.45, FZ / 2 - 0.04), (math.atan2(FZ, 0.9), 0, 0), (1.0, 0.5, 0.06), parent=P_)
    for i, (nm, ((x, y), h, lean)) in enumerate(POLES.items()):
        collider('COL_ELEC_Pole_%02d' % (i + 1), (x, y, h / 2), (0, 0, 0), (0.18, 0.18, h / 2), parent=P_)
    k = 0
    for poly in FENCE:
        for i in range(len(poly) - 1):
            a, b = Vector(poly[i]), Vector(poly[i + 1])
            d = b - a
            collider('COL_ELEC_Fence_%02d' % k, ((a.x + b.x) / 2, (a.y + b.y) / 2, 0.55), (0, 0, math.atan2(d.y, d.x)), (d.length / 2, 0.05, 0.55), parent=P_)
            k += 1
    Z = G['Zones']
    BC.zone('ELEC_InteractionZone_Panel', Z, (-0.3, 1.55, FZ + 0.7), (1.2, 0.6, 0.7), 'control_panel', 'ELEC_InteractionZone', targets=['ELEC_VoltageMeter', 'ELEC_MainSwitch'])
    BC.zone('ELEC_InteractionZone_Generator', Z, (0.25, 0.55, FZ + 0.7), (0.45, 0.7, 0.7), 'generator', 'ELEC_InteractionZone', targets=['ELEC_Generator'])
    BC.zone('ELEC_InteractionZone_Coils', Z, (-1.05, 0.6, FZ + 0.7), (0.45, 0.8, 0.7), 'copper_coils', 'ELEC_InteractionZone', targets=['ELEC_CopperCoils'])
    BC.zone('ELEC_InteractionZone_WaterWheel', Z, (3.2, -1.75, 0.7), (0.7, 0.6, 0.7), 'waterwheel', 'ELEC_InteractionZone', targets=['ELEC_WaterWheel'])
    BC.zone('ELEC_InteractionZone_Poles', Z, (-3.0, -2.0, 0.7), (0.5, 0.8, 0.7), 'power_poles', 'ELEC_InteractionZone', targets=['ELEC_PowerPole', 'ELEC_Cable'])
    BC.marker('ELEC_Entrance', Z, (0, -D / 2 - 0.9, 0.0), 0.0, 'entrance', forward_local=[0, 1, 0], door_ids=['ELEC_Door_L', 'ELEC_Door_R'], clear_width=2.0, clear_height=2.5)
    BC.marker('ELEC_Entrance_Rear', Z, (1.05, D / 2 + 0.7, 0.0), math.pi, 'entrance', forward_local=[0, -1, 0], door_ids=['ELEC_Door_Back'], clear_width=1.1, clear_height=2.1)
    cia = CP + 'ELEC_Interactables'
    for nm, hx, s, od in (('ELEC_Door_L', -1.0, 1, -100), ('ELEC_Door_R', 1.0, -1, 100)):
        dm = BC.door_leaf(0.99, 2.48, 0.08, s=s, color='timber_warm', planks=4)
        ob = dm.build(nm, cia, parent=G['Interactables'], loc=(hx, -D / 2 + 0.04, FZ), rot=(0, 0, math.radians(od)))
        su.tag(ob, 'ELEC_Door', instance_id=nm, interactable=True, animation='door', pivot_axis='Z', closed_yaw_deg=0.0, open_yaw_deg=float(od), initial='open')
    dm = BC.door_leaf(1.08, 2.08, 0.07, s=1, color='timber_warm', planks=4)
    ob = dm.build('ELEC_Door_Back', cia, parent=G['Interactables'], loc=(1.6, D / 2 - 0.04, FZ), rot=(0, 0, math.pi))
    su.tag(ob, 'ELEC_Door', instance_id='ELEC_Door_Back', interactable=True, animation='door', pivot_axis='Z', closed_yaw_deg=180.0, open_yaw_deg=80.0, initial='closed')