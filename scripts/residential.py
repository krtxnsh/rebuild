"""residential.py - modular kit for the v2 village homes (exterior shells only, no interiors).

Four designs share one kit (walls with real openings, recessed windows, plank doors, stone plinths with entrance steps,
course-tiled roofs, chimneys, porches) and differ in footprint, height, roof orientation, entrances and gardens:
  A  compact plaster cottage, simple pitched roof, door hood
  B  timber (plank) cottage, front-facing gable, small porch
  C  taller two-storey family house, half-timbered upper floor, offset cross-gable wing
  D  farmhouse, stone base band, lean-to side extension
House-local space: front = -Y, origin at the centre of the main block, z = 0 at finished floor level.
Detail is deliberately simpler than the three educational buildings (roof courses instead of individual tiles)."""
import math, random
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col
import building_common as BC

EXTRA_PAL = {'plaster_peach': '#efd8c2', 'plaster_yellow': '#efe0b4', 'roof_muted': '#9b6650', 'roof_brown': '#87604c',
             'roof_terracotta2': '#c0613f', 'shutter_green': '#6c9867', 'shutter_blue': '#6a90b8', 'shutter_red': '#b8574b',
             'door_green': '#5e8758', 'door_blue': '#5b7ea6', 'glass_dark': '#3b4d5a', 'glass_warm_dim': '#c9a35a',
             'mud_dark': '#6e5038', 'straw': '#d9bf73', 'cloth_white': '#f3efe6', 'cloth_red': '#d06a5c', 'cloth_blue': '#7fa4cf'}
su.PAL.update({k: su.srgb(v) for k, v in EXTRA_PAL.items()})

VARIANTS = {
    'a1': dict(wall='plaster', roof='terracotta', trim='timber_dark', shutter='shutter_green', door='door_green', chimney=1, mirror=False, garden='front', extra='clothesline'),
    'a2': dict(wall='plaster_white', roof='terracotta_dark', trim='timber_mid', shutter=None, door='timber_warm', chimney=-1, mirror=True, garden='boxes', extra='firewood'),
    'a3': dict(wall='plaster_yellow', roof='roof_muted', trim='timber_mid', shutter='shutter_blue', door='door_blue', chimney=-1, mirror=False, garden='veg', extra='clothesline'),
    'b1': dict(wall='timber_warm', roof='roof_terracotta2', trim='timber_dark', shutter='shutter_red', door='timber_mid', chimney=-1, mirror=False, garden='veg', extra='barrels'),
    'b2': dict(wall='wood_light', roof='roof_muted', trim='timber_mid', shutter='shutter_blue', door='door_blue', chimney=1, mirror=True, garden='front', extra='barrels'),
    'c1': dict(wall='plaster', roof='terracotta', trim='timber_dark', shutter=None, door='timber_warm', chimney=1, mirror=False, garden='front', extra='firewood'),
    'c2': dict(wall='plaster_peach', roof='roof_brown', trim='timber_mid', shutter='shutter_blue', door='door_green', chimney=-1, mirror=True, garden='veg', extra='bench'),
    'd1': dict(wall='plaster', roof='terracotta', trim='timber_dark', shutter='shutter_green', door='timber_warm', chimney=-1, mirror=False, garden='veg', extra='firewood'),
    'd2': dict(wall='plaster_yellow', roof='terracotta_dark', trim='timber_mid', shutter=None, door='door_blue', chimney=1, mirror=False, garden='veg', extra='crates'),
}
# main block (W x D), wall height, ridge rise, eave overhangs; footprint incl. annexes for site checks
DESIGN = {
    'A': dict(W=5.2, D=4.2, H=2.6, rise=1.7, ov=0.38, foot=(-2.75, 2.75, -2.45, 2.25)),
    'B': dict(W=5.0, D=4.6, H=2.5, rise=1.9, ov=0.35, foot=(-2.7, 2.7, -4.05, 2.45)),
    'C': dict(W=5.8, D=4.4, H=4.5, rise=1.8, ov=0.38, foot=(-3.1, 3.55, -4.75, 2.4)),
    'D': dict(W=6.2, D=4.6, H=2.7, rise=1.9, ov=0.38, foot=(-3.3, 5.45, -2.5, 2.5)),
}
T_WALL = 0.22

# ----------------------------------------------------------------------------- kit pieces
def frames(cx, cy, W, D, t=T_WALL, z0=0.0):
    out = {}
    for side in ('front', 'back', 'left', 'right'):
        m, ln = BC.wall_frame(side, W, D, t, z0)
        out[side] = (Matrix.Translation((cx, cy, 0)) @ m, ln)
    return out

def win(mb, mtx, u, z0, w, h, t, v, rng, box=False):
    fr = col(v['trim'], 0.05, rng)
    yo = -t / 2 - 0.03
    mb.box((w + 0.18, 0.09, 0.09), (u, yo, z0 + h + 0.045), mat='M_Wood', color=fr, matrix=mtx)
    mb.box((w + 0.24, 0.16, 0.06), (u, -t / 2 - 0.06, z0 - 0.03), mat='M_Wood', color=fr, matrix=mtx)
    for s in (-1, 1):
        mb.box((0.09, 0.09, h), (u + s * (w / 2 + 0.045), yo, z0 + h / 2), mat='M_Wood', color=fr, matrix=mtx)
    mb.box((0.05, 0.05, h), (u, -0.03, z0 + h / 2), mat='M_Wood', color=fr, matrix=mtx)
    mb.box((w, 0.05, 0.05), (u, -0.03, z0 + h * 0.55), mat='M_Wood', color=fr, matrix=mtx)
    mb.box((w, 0.02, h), (u, 0.01, z0 + h / 2), mat='M_Clay', color='glass_dark', matrix=mtx)
    if v.get('shutter'):
        sc = col(v['shutter'], 0.05, rng)
        for s in (-1, 1):
            mb.box((w * 0.5, 0.04, h + 0.04), (u + s * (w * 0.75 + 0.12), -t / 2 - 0.035, z0 + h / 2), mat='M_Wood', color=sc, matrix=mtx)
    if box:
        mb.box((w + 0.12, 0.22, 0.18), (u, -t / 2 - 0.15, z0 - 0.14), mat='M_Wood', color='timber_mid', matrix=mtx)
        for k in range(4):
            mb.add(su.prim_ico(0.085, 1), 'M_Soft', rng.choice(['flower_pink', 'flower_yellow', 'leaf_green', 'flower_white']),
                   mtx @ M((u - w / 2 + 0.12 + (w - 0.24) * k / 3, -t / 2 - 0.15, z0 + 0.0), (0, 0, k), (1, 1, 0.8)), smooth=True)

def door(mb, mtx, u, w, h, t, v, rng):
    fr = col(v['trim'], 0.05, rng)
    for s in (-1, 1):
        mb.box((0.1, 0.12, h + 0.05), (u + s * (w / 2 + 0.05), -t / 2 - 0.03, h / 2), mat='M_Wood', color=fr, matrix=mtx)
    mb.box((w + 0.3, 0.12, 0.12), (u, -t / 2 - 0.03, h + 0.06), mat='M_Wood', color=fr, matrix=mtx)
    dc = v['door']
    for k in range(4):
        mb.box((w / 4 - 0.012, 0.06, h - 0.02), (u - w / 2 + w / 8 + k * w / 4, -0.02, h / 2), mat='M_Wood', color=col(dc, 0.07, rng), matrix=mtx)
    for z in (0.35, h - 0.35):
        mb.box((w - 0.1, 0.03, 0.12), (u, -0.065, z), mat='M_Wood', color=col(dc, 0.0, None, 0.82), matrix=mtx)
    mb.box((0.05, 0.05, 0.12), (u + w * 0.32, -0.09, h * 0.48), mat='M_Clay', color='brass', matrix=mtx)

def course_roof_side(mb, x0, x1, ye, ze, yr, zr, rng, roof, trim, frame, course=0.34, segs=4, thick=0.12, fascia=True):
    """One roof slope from eave line (ye, ze) up to ridge (yr, zr); ridge runs along local X."""
    e = Vector((0, ye, ze)); r = Vector((0, yr, zr))
    up = r - e
    sl = up.length
    plane = BC.plane_matrix((x0, ye, ze), (1, 0, 0), up) if ye < yr else BC.plane_matrix((x1, ye, ze), (-1, 0, 0), up)
    plane = frame @ plane
    wd = x1 - x0
    mb.add(su.prim_box(wd, sl, thick), 'M_Wood', col(trim, 0.03, rng), plane @ M((wd / 2, sl / 2, -thick / 2)))
    n = max(2, int(math.ceil(sl / course)))
    for j in range(n):
        v0 = j * (sl / n)
        ln = sl / n + 0.07
        off = (0.5 if j % 2 else 0.0) * (wd / segs)
        edges = [0.0] + [min(wd, max(0.0, off + wd / segs * k)) for k in range(1, segs + 1)] + [wd]
        edges = sorted(set(round(e_, 4) for e_ in edges))
        for k in range(len(edges) - 1):
            a, b = edges[k], edges[k + 1]
            if b - a < 0.05:
                continue
            c = su.lerpc(roof, rng.choice(['terracotta_dark', 'roof_brown', 'terracotta_light']), rng.uniform(0.0, 0.22))
            mb.add(su.prim_box(b - a - 0.006, ln, 0.05), 'M_Clay', c, plane @ M(((a + b) / 2, v0 + ln / 2 - 0.035, 0.03), (-0.055, 0, 0)))
    if fascia:
        mb.add(su.prim_box(wd + 0.02, 0.05, 0.18), 'M_Wood', col(trim, 0.03, rng), plane @ M((wd / 2, -0.03, -0.05)))
    for xx in (0.0, wd):
        mb.add(su.prim_sweep([Vector((xx, -0.12, -0.04)), Vector((xx, sl + 0.06, -0.04))], su.rect_profile(0.12, 0.2)), 'M_Wood', col(trim, 0.04, rng), plane)
    return sl

def gable_roof(mb, x0, x1, yf, yb, ze, zr, rng, roof, trim, frame=Matrix(), ridge=True, yr=None):
    yr = (yf + yb) / 2 if yr is None else yr
    course_roof_side(mb, x0, x1, yf, ze, yr, zr, rng, roof, trim, frame)
    course_roof_side(mb, x0, x1, yb, ze, yr, zr, rng, roof, trim, frame)
    if ridge:
        tmp = MB()
        BC.ridge_tiles(tmp, (x0 - 0.04, yr, zr + 0.04), (x1 + 0.04, yr, zr + 0.04), rng, r=0.14, l=0.46, color=su.lerpc(roof, 'terracotta_dark', 0.35))
        mb.merge(tmp, frame)

def gable_wall(mb, mtx, half, H, ze_edge, zr, t, mat, colr):
    """Triangle above wall height H; roof underside passes through (+-half, ze_edge) and (0, zr)."""
    zt = max(ze_edge, H + 0.04)
    BC.gable(mb, mtx, [(-half, H), (half, H), (half, zt), (0.0, zr), (-half, zt)], t, mat, colr)

def chimney(mb, x, y, z0, z1, rng, colr='stone'):
    c = col(colr, 0.06, rng)
    mb.box((0.72, 0.72, z1 - z0), (x, y, (z0 + z1) / 2), mat='M_Stone', color=c)
    mb.box((0.86, 0.86, 0.12), (x, y, z1 + 0.06), mat='M_Stone', color=col('stone_dark', 0.05, rng))
    mb.box((0.3, 0.3, 0.22), (x, y, z1 + 0.23), mat='M_Clay', color='clay_pot')

def plinth(mb, x0, x1, y0, y1, zbot, rng, colr='stone'):
    mb.box((x1 - x0, y1 - y0, -zbot), ((x0 + x1) / 2, (y0 + y1) / 2, zbot / 2), mat='M_Stone', color=col(colr, 0.04, rng))
    mb.box((x1 - x0 + 0.06, y1 - y0 + 0.06, 0.08), ((x0 + x1) / 2, (y0 + y1) / 2, -0.04), mat='M_Stone', color=col('stone_light', 0.04, rng))

def steps(mb, u, y_face, width, gl, rng, along=-1):
    """Stone steps from floor (z=0) down to ground level gl (local z, negative) outward along -Y."""
    drop = -gl
    if drop < 0.08:
        return 0.0, []
    n = max(1, int(math.ceil(drop / 0.18)))
    rise = drop / n
    depth = 0.32
    cols = []
    for k in range(n):
        ztop = -rise * (k + 1) + rise
        y = y_face + along * (depth * (k + 0.5))
        mb.box((width, depth + 0.02, ztop - gl + 0.05), (u, y, (ztop + gl - 0.05) / 2), mat='M_Stone', color=col('stone_light', 0.05, rng))
    return depth * n, [(u, y_face + along * depth * n / 2, (gl) / 2, width / 2, depth * n / 2, drop)]
# ----------------------------------------------------------------------------- designs
def _eave_z(H, rise, half, ov, thick=0.12):
    """Eave height so the roof deck underside meets the wall top at +-half."""
    zr = H + rise
    # plane through (half, H + thick) and (0, zr): z(y) = zr - (zr - H - thick) * |y| / half
    return zr - (zr - H - thick) * (half + ov) / half, zr

def design_A(mb, v, gl, rng, info):
    d = DESIGN['A']; W, D, H, rise, ov = d['W'], d['D'], d['H'], d['rise'], d['ov']
    t = T_WALL
    plinth(mb, -W / 2 - 0.08, W / 2 + 0.08, -D / 2 - 0.08, D / 2 + 0.08, info['zbot'], rng)
    du = 0.15 * v['chimney']
    OPEN = {'front': [(du - 0.5, du + 0.5, 0.0, 2.05), (-2.0, -1.2, 0.85, 1.8), (1.2, 2.0, 0.85, 1.8)],
            'back': [(-0.45, 0.45, 0.85, 1.8)], 'left': [(-0.35, 0.35, 0.95, 1.75)], 'right': [(-0.35, 0.35, 0.95, 1.75)]}
    fr = frames(0, 0, W, D)
    for side, (m, ln) in fr.items():
        BC.build_wall(mb, m, ln, H, t, OPEN[side], 'M_Plaster', v['wall'], rng)
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 0.01:
                win(mb, m, (a + b) / 2, z0, b - a, z1 - z0, t, v, rng, box=(v['garden'] == 'boxes' and side == 'front'))
    ze, zr = _eave_z(H, rise, D / 2, ov)
    for side in ('left', 'right'):
        m, ln = fr[side]
        gable_wall(mb, m, D / 2, H, H, zr - 0.16, t, 'M_Plaster', v['wall'])
    door(mb, fr['front'][0], du, 1.0, 2.05, t, v, rng)
    gable_roof(mb, -W / 2 - ov, W / 2 + ov, -D / 2 - ov, D / 2 + ov, ze, zr, rng, v['roof'], v['trim'])
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.box((0.16, 0.16, H), (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), H / 2), mat='M_Wood', color=col(v['trim'], 0.05, rng))
    # door hood on brackets
    hood = Matrix.Translation((du, -D / 2 - 0.02, 0))
    for s in (-1, 1):
        BC.beam(mb, (du + s * 0.55, -D / 2 - 0.05, 1.95), (du + s * 0.55, -D / 2 - 0.62, 2.3), 0.08, 0.1, v['trim'])
    course_roof_side(mb, -0.75, 0.75, -0.75, 2.28, 0.0, 2.62, rng, v['roof'], v['trim'], hood, course=0.3, segs=2)
    chimney(mb, v['chimney'] * (W / 2 - 0.5), 0.55, H - 0.6, zr + 0.75, rng)
    info.update(door=(du, -D / 2), door_w=1.0, front_y=-D / 2, W=W, D=D, height=zr + 1.0)
    info['body'] = [((0, 0, (H + 1.0) / 2), (W / 2 + 0.1, D / 2 + 0.1, (H + 1.0) / 2))]

def design_B(mb, v, gl, rng, info):
    d = DESIGN['B']; W, D, H, rise, ov = d['W'], d['D'], d['H'], d['rise'], d['ov']
    t = T_WALL
    pd = 1.5
    plinth(mb, -W / 2 - 0.08, W / 2 + 0.08, -D / 2 - pd - 0.05, D / 2 + 0.08, info['zbot'], rng)
    OPEN = {'front': [(-0.5, 0.5, 0.0, 2.05), (-1.95, -1.25, 0.9, 1.8), (1.25, 1.95, 0.9, 1.8)],
            'back': [(-0.4, 0.4, 0.9, 1.75)], 'left': [(-1.4, -0.7, 0.9, 1.75), (0.7, 1.4, 0.9, 1.75)], 'right': [(-1.4, -0.7, 0.9, 1.75), (0.7, 1.4, 0.9, 1.75)]}
    fr = frames(0, 0, W, D)
    for side, (m, ln) in fr.items():
        BC.build_wall(mb, m, ln, H, t, OPEN[side], 'M_Wood', v['wall'], rng)
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 0.01:
                win(mb, m, (a + b) / 2, z0, b - a, z1 - z0, t, v, rng)
    ze, zr = _eave_z(H, rise, W / 2, ov)
    for side in ('front', 'back'):
        m, ln = fr[side]
        gable_wall(mb, m, W / 2, H, H, zr - 0.16, t, 'M_Wood', v['wall'])
    fm = fr['front'][0]
    mb.box((0.5, 0.1, 0.4), (0, -t / 2 - 0.05, H + 0.75), mat='M_Wood', color=col(v['trim'], 0.04, rng), matrix=fm)
    for k in range(3):
        mb.box((0.42, 0.05, 0.04), (0, -t / 2 - 0.12, H + 0.62 + k * 0.12), (0.5, 0, 0), mat='M_Wood', color=col(v['trim'], 0.0, None, 0.8), matrix=fm)
    door(mb, fm, 0.0, 1.0, 2.05, t, v, rng)
    rot = Matrix.Rotation(math.pi / 2, 4, 'Z')
    gable_roof(mb, -D / 2 - ov, D / 2 + ov, -W / 2 - ov, W / 2 + ov, ze, zr, rng, v['roof'], v['trim'], frame=rot)
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.box((0.16, 0.16, H), (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), H / 2), mat='M_Wood', color=col(v['trim'], 0.05, rng))
    # porch: deck, posts, rails, lean-to roof
    y0, y1 = -D / 2 - pd, -D / 2
    for k in range(6):
        x = -W / 2 + 0.15 + (W - 0.3) * (k + 0.5) / 6
        mb.box(((W - 0.3) / 6 - 0.02, pd, 0.07), (x, (y0 + y1) / 2, -0.035), mat='M_Wood', color=col('wood_light', 0.06, rng))
    for s in (-1, 1):
        px = s * (W / 2 - 0.3)
        mb.box((0.14, 0.14, 2.25), (px, y0 + 0.15, 1.125), mat='M_Wood', color=col(v['trim'], 0.04, rng))
        mb.box((0.08, pd - 0.25, 0.08), (s * (W / 2 - 0.2), (y0 + y1) / 2, 0.85), mat='M_Wood', color=col(v['trim'], 0.04, rng))
        for k in range(3):
            mb.box((0.05, 0.05, 0.8), (s * (W / 2 - 0.2), y0 + 0.35 + k * 0.4, 0.42), mat='M_Wood', color=col(v['trim'], 0.04, rng))
    mb.box((W - 0.4, 0.14, 0.16), (0, y0 + 0.15, 2.3), mat='M_Wood', color=col(v['trim'], 0.04, rng))
    course_roof_side(mb, -W / 2 + 0.05, W / 2 - 0.05, y0 - 0.25, 2.3, y1 + 0.02, 2.5, rng, v['roof'], v['trim'], Matrix(), course=0.36, segs=4)
    chimney(mb, v['chimney'] * (W / 2 + 0.36), 0.6, info['zbot'] + 0.2, zr + 0.6, rng)
    info.update(door=(0.0, y0), door_w=1.0, front_y=y0, W=W, D=D + pd, height=zr + 0.9)
    info['body'] = [((0, 0, (H + 1.0) / 2), (W / 2 + 0.1, D / 2 + 0.1, (H + 1.0) / 2)),
                    ((0, (y0 + y1) / 2, 1.1), (W / 2 - 0.1, pd / 2, 0.05))]
    info['porch_rails'] = [((s * (W / 2 - 0.2), (y0 + y1) / 2, 0.5), (0.06, pd / 2, 0.5)) for s in (-1, 1)]

def design_C(mb, v, gl, rng, info):
    d = DESIGN['C']; W, D, H, rise, ov = d['W'], d['D'], d['H'], d['rise'], d['ov']
    t = T_WALL
    s = -1 if v['mirror'] else 1
    W2, D2, H2 = 2.8, 2.4, 2.6
    cx2, cy2 = s * (W / 2 - 1.3 + 0.25), -D / 2 - D2 / 2
    plinth(mb, -W / 2 - 0.08, W / 2 + 0.08, -D / 2 - 0.02, D / 2 + 0.08, info['zbot'], rng)
    plinth(mb, cx2 - W2 / 2 - 0.08, cx2 + W2 / 2 + 0.08, cy2 - D2 / 2 - 0.08, cy2 + D2 / 2, info['zbot'], rng)
    du = -s * 1.55
    OPEN = {'front': [(du - 0.5, du + 0.5, 0.0, 2.1), (-s * 0.15 - 0.4, -s * 0.15 + 0.4, 0.9, 1.9), (-s * 2.15 - 0.3, -s * 2.15 + 0.3, 2.85, 3.75), (-s * 0.75 - 0.3, -s * 0.75 + 0.3, 2.85, 3.75)],
            'back': [(-1.6, -0.9, 0.9, 1.9), (0.9, 1.6, 0.9, 1.9), (-1.6, -0.9, 2.85, 3.75), (0.9, 1.6, 2.85, 3.75)],
            'left': [(-0.35, 0.35, 0.95, 1.85), (-0.35, 0.35, 2.9, 3.7)], 'right': [(-0.35, 0.35, 0.95, 1.85), (-0.35, 0.35, 2.9, 3.7)]}
    fr = frames(0, 0, W, D)
    for side, (m, ln) in fr.items():
        BC.build_wall(mb, m, ln, H, t, OPEN[side], 'M_Plaster', v['wall'], rng)
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 0.01:
                win(mb, m, (a + b) / 2, z0, b - a, z1 - z0, t, v, rng)
        # half-timbered upper storey
        tc = lambda: col(v['trim'], 0.05, rng)
        mb.box((ln + 0.1, 0.1, 0.16), (0, -t / 2 - 0.04, 2.45), mat='M_Wood', color=tc(), matrix=m)
        mb.box((ln + 0.1, 0.1, 0.14), (0, -t / 2 - 0.04, H - 0.07), mat='M_Wood', color=tc(), matrix=m)
        posts = [-ln / 2 + 0.08, ln / 2 - 0.08]
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 2.0:
                posts += [a - 0.12, b + 0.12]
        for u in posts:
            mb.box((0.12, 0.1, H - 2.53), (u, -t / 2 - 0.04, (2.53 + H) / 2 - 0.0), mat='M_Wood', color=tc(), matrix=m)
        for u, sgn in ((-ln / 2 + 0.1, 1), (ln / 2 - 0.1, -1)):
            BC.beam(mb, (u, -t / 2 - 0.04, 2.55), (u + sgn * 0.75, -t / 2 - 0.04, H - 0.15), 0.08, 0.1, v['trim'], m)
    ze, zr = _eave_z(H, rise, D / 2, ov)
    for side in ('left', 'right'):
        m, ln = fr[side]
        gable_wall(mb, m, D / 2, H, H, zr - 0.16, t, 'M_Plaster', v['wall'])
    door(mb, fr['front'][0], du, 1.0, 2.1, t, v, rng)
    gable_roof(mb, -W / 2 - ov, W / 2 + ov, -D / 2 - ov, D / 2 + ov, ze, zr, rng, v['roof'], v['trim'])
    # offset cross-gable wing (single storey) - its roof sits below the main eave
    fw = frames(cx2, cy2, W2, D2)
    OW = {'front': [(-0.7, 0.7, 0.85, 1.95)], 'left': [(-0.35, 0.35, 0.95, 1.75)], 'right': [(-0.35, 0.35, 0.95, 1.75)]}
    for side in ('front', 'left', 'right'):
        m, ln = fw[side]
        ln2 = ln + (T_WALL if side != 'front' else 0.0)
        BC.build_wall(mb, m, ln2, H2, t, OW[side], 'M_Plaster', v['wall'], rng)
        for (a, b, z0, z1) in OW[side]:
            win(mb, m, (a + b) / 2, z0, b - a, z1 - z0, t, v, rng, box=(side == 'front'))
    ze2, zr2 = _eave_z(H2, 1.25, W2 / 2, 0.3)
    m, ln = fw['front']
    gable_wall(mb, m, W2 / 2, H2, H2, zr2 - 0.16, t, 'M_Plaster', v['wall'])
    rot = Matrix.Translation((cx2, cy2, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
    gable_roof(mb, -D2 / 2 - 0.35, D2 / 2 + 0.05, -W2 / 2 - 0.3, W2 / 2 + 0.3, ze2, zr2, rng, v['roof'], v['trim'], frame=rot)
    chimney(mb, s * 1.25, 0.25, H - 0.4, zr + 0.85, rng, 'stone_light')
    # small porch canopy over the main door
    hood = Matrix.Translation((du, -D / 2 - 0.02, 0))
    for k in (-1, 1):
        BC.beam(mb, (du + k * 0.55, -D / 2 - 0.05, 2.0), (du + k * 0.55, -D / 2 - 0.6, 2.32), 0.08, 0.1, v['trim'])
    course_roof_side(mb, -0.75, 0.75, -0.72, 2.3, 0.0, 2.6, rng, v['roof'], v['trim'], hood, course=0.3, segs=2)
    info.update(door=(du, -D / 2), door_w=1.0, front_y=-D / 2, W=W, D=D + D2, height=zr + 1.1)
    info['body'] = [((0, 0, (H + 1.5) / 2), (W / 2 + 0.1, D / 2 + 0.1, (H + 1.5) / 2)), ((cx2, cy2, 1.6), (W2 / 2 + 0.1, D2 / 2 + 0.05, 1.6))]
def design_D(mb, v, gl, rng, info):
    d = DESIGN['D']; W, D, H, rise, ov = d['W'], d['D'], d['H'], d['rise'], d['ov']
    t = T_WALL
    s = -1 if v['mirror'] else 1
    W2, D2, H2 = 2.2, 3.8, 2.2
    cx2 = s * (W / 2 + W2 / 2)
    plinth(mb, -W / 2 - 0.08, W / 2 + 0.08, -D / 2 - 0.08, D / 2 + 0.08, info['zbot'], rng)
    plinth(mb, min(cx2 - s * W2 / 2, cx2 + s * W2 / 2) - 0.08, max(cx2 - s * W2 / 2, cx2 + s * W2 / 2) + 0.08, -D2 / 2 - 0.08, D2 / 2 + 0.08, info['zbot'], rng)
    du = -s * 0.75
    OPEN = {'front': [(du - 0.52, du + 0.52, 0.0, 2.1), (-s * 2.25 - 0.4, -s * 2.25 + 0.4, 0.95, 1.85), (s * 0.85 - 0.4, s * 0.85 + 0.4, 0.95, 1.85), (s * 2.25 - 0.3, s * 2.25 + 0.3, 1.05, 1.75)],
            'back': [(-1.8, -1.0, 0.95, 1.85), (0.7, 1.5, 0.95, 1.85)], 'left': [(-0.35, 0.35, 1.0, 1.8)], 'right': [(-0.35, 0.35, 1.0, 1.8)]}
    fr = frames(0, 0, W, D)
    band = 0.9
    for side, (m, ln) in fr.items():
        low = [(a, b, z0, min(z1, band)) for (a, b, z0, z1) in OPEN[side] if z0 < band]
        BC.build_wall(mb, m, ln, band, t + 0.04, low, 'M_Stone', 'stone_light', rng)
        up = [(a, b, max(z0, band) - band, z1 - band) for (a, b, z0, z1) in OPEN[side] if z1 > band]
        BC.build_wall(mb, m @ Matrix.Translation((0, 0, band)), ln, H - band, t, up, 'M_Plaster', v['wall'], rng)
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 0.01:
                win(mb, m, (a + b) / 2, z0, b - a, z1 - z0, t, v, rng, box=(side == 'front' and v['garden'] == 'front'))
    ze, zr = _eave_z(H, rise, D / 2, ov)
    for side in ('left', 'right'):
        m, ln = fr[side]
        gable_wall(mb, m, D / 2, H, H, zr - 0.16, t, 'M_Plaster', v['wall'])
    door(mb, fr['front'][0], du, 1.04, 2.1, t, v, rng)
    gable_roof(mb, -W / 2 - ov, W / 2 + ov, -D / 2 - ov, D / 2 + ov, ze, zr, rng, v['roof'], v['trim'])
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.box((0.18, 0.18, H - band), (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), (H + band) / 2), mat='M_Wood', color=col(v['trim'], 0.05, rng))
    # lean-to side extension (plank walls, mono-pitch roof)
    fe = frames(cx2, 0.0, W2, D2)
    OE = {'front': [(-0.45, 0.45, 0.0, 1.9)], 'back': [], 'left': [(-0.3, 0.3, 1.0, 1.6)], 'right': [(-0.3, 0.3, 1.0, 1.6)]}
    outer = 'right' if s > 0 else 'left'
    for side in ('front', 'back', outer):
        m, ln = fe[side]
        o = OE[side] if side != outer else OE['right']
        BC.build_wall(mb, m, ln + (T_WALL if side in ('front', 'back') else 0.0), H2, t, o, 'M_Wood', 'timber_warm', rng)
        for (a, b, z0, z1) in o:
            if z0 > 0.01:
                win(mb, m, (a + b) / 2, z0, b - a, z1 - z0, t, v, rng)
    ev = dict(v); ev['door'] = 'timber_mid'
    door(mb, fe['front'][0], 0.0, 0.9, 1.9, t, ev, rng)
    lean = Matrix.Translation((s * W / 2, 0, 0)) @ Matrix.Rotation(s * math.pi / 2, 4, 'Z')
    course_roof_side(mb, -D2 / 2 - 0.3, D2 / 2 + 0.3, -W2 - 0.32, H2 + 0.02, 0.0, H - 0.02, rng, v['roof'], v['trim'], lean, course=0.36, segs=4)
    chimney(mb, -s * (W / 2 - 0.5), 0.6, H - 0.6, zr + 0.8, rng)
    info.update(door=(du, -D / 2), door_w=1.04, front_y=-D / 2, W=W + W2, D=D, height=zr + 1.0)
    info['body'] = [((0, 0, (H + 1.0) / 2), (W / 2 + 0.1, D / 2 + 0.1, (H + 1.0) / 2)), ((cx2, 0, 1.3), (W2 / 2 + 0.05, D2 / 2 + 0.1, 1.3))]

BUILDERS = {'A': design_A, 'B': design_B, 'C': design_C, 'D': design_D}

# ----------------------------------------------------------------------------- gardens & yard props (ground-following)
def picket(mb, a, b, gl, rng, h=0.85, colr='wood_weathered'):
    a, b = Vector(a), Vector(b)
    d = b - a
    ln = d.length
    if ln < 0.2:
        return
    ang = math.atan2(d.y, d.x)
    nrm = Vector((-d.y, d.x)).normalized()
    for p in (a, b):
        z = gl(p.x, p.y)
        mb.box((0.11, 0.11, h + 0.12), (p.x, p.y, z + (h + 0.12) / 2 - 0.05), (0, 0, ang), mat='M_Wood', color=col(colr, 0.06, rng))
    n = max(1, int(ln / 0.19))
    for k in range(1, n):
        p = a + d * (k / n) + nrm * 0.045
        z = gl(p.x, p.y)
        hh = h - 0.1 + rng.uniform(-0.04, 0.03)
        mb.box((0.08, 0.025, hh), (p.x, p.y, z + hh / 2), (0, rng.uniform(-0.03, 0.03), ang), mat='M_Wood', color=col(colr, 0.08, rng))
    for zr_ in (0.25, h - 0.2):
        za, zb = gl(a.x, a.y) + zr_, gl(b.x, b.y) + zr_
        mb.add(su.prim_sweep([Vector((a.x, a.y, za)), Vector((b.x, b.y, zb))], su.rect_profile(0.045, 0.09)), 'M_Wood', col(colr, 0.05, rng))

def flower_bed(mb, x0, x1, y, gl, rng, depth=0.45):
    xs = [x0 + (x1 - x0) * k / 6 for k in range(7)]
    z = min(gl(x, y) for x in xs)
    mb.box((x1 - x0, depth, 0.18), ((x0 + x1) / 2, y, z + 0.06), mat='M_Soft', color='mud_dark')
    for k in range(int((x1 - x0) / 0.32) + 1):
        x = x0 + 0.15 + k * 0.32
        if x > x1 - 0.1:
            break
        c = rng.choice(['flower_pink', 'flower_yellow', 'flower_white', 'flower_purple', 'flower_blue', 'leaf_green', 'leaf_dark'])
        mb.add(su.prim_ico(rng.uniform(0.09, 0.14), 1), 'M_Soft', col(c, 0.06, rng), M((x, y + rng.uniform(-0.08, 0.08), z + 0.2), (0, 0, k), (1, 1, 0.8)), smooth=True)

def veg_bed(mb, cx, cy, ang, gl, rng, L=2.4, Wd=0.95):
    m = M((cx, cy, gl(cx, cy)), (0, 0, ang))
    mb.box((L, Wd, 0.28), (0, 0, 0.1), mat='M_Wood', color=col('timber_mid', 0.05, rng), matrix=m)
    mb.box((L - 0.12, Wd - 0.12, 0.04), (0, 0, 0.25), mat='M_Soft', color='mud_dark', matrix=m)
    for r in (-0.22, 0.22):
        for k in range(6):
            x = -L / 2 + 0.25 + k * (L - 0.5) / 5
            mb.add(su.prim_ico(0.11, 1), 'M_Soft', col(rng.choice(['cabbage', 'leaf_lime', 'leaf_green']), 0.05, rng), m @ M((x, r, 0.33), (0, 0, k), (1, 1, 0.7)), smooth=True)

def firewood(mb, cx, cy, ang, gl, rng):
    m = M((cx, cy, gl(cx, cy)), (0, 0, ang))
    for s in (-1, 1):
        mb.box((0.08, 0.08, 1.05), (s * 0.75, 0, 0.52), mat='M_Wood', color='timber_mid', matrix=m)
    for row in range(4):
        for k in range(6 - (row % 2)):
            x = -0.6 + 0.24 * k + (0.12 if row % 2 else 0)
            mb.add(su.prim_cyl(0.1, 0.55, 6, z0=False), 'M_Wood', col(rng.choice(['bark', 'wood_light', 'timber_warm']), 0.08, rng),
                   m @ M((x, 0, 0.11 + row * 0.19), (math.pi / 2, 0, rng.uniform(-0.1, 0.1))), smooth=True)

def clothesline(mb, a, b, gl, rng):
    a, b = Vector(a), Vector(b)
    for p in (a, b):
        z = gl(p.x, p.y)
        mb.box((0.09, 0.09, 1.9), (p.x, p.y, z + 0.9), mat='M_Wood', color='timber_mid')
        mb.box((0.5, 0.06, 0.06), (p.x, p.y, z + 1.75), (0, 0, math.atan2(b.y - a.y, b.x - a.x) + math.pi / 2), mat='M_Wood', color='timber_mid')
    za, zb = gl(a.x, a.y) + 1.78, gl(b.x, b.y) + 1.78
    pts = su.catenary((a.x, a.y, za), (b.x, b.y, zb), 0.12, 10)
    mb.tube(pts, 0.008, 'M_Soft', 'rope', 4)
    d = (b - a)
    ang = math.atan2(d.y, d.x)
    for k, c in enumerate(['cloth_white', 'cloth_red', 'cloth_blue', 'cloth_white']):
        t = 0.2 + 0.2 * k
        p = pts[int(t * 10)]
        w, h = rng.uniform(0.45, 0.7), rng.uniform(0.5, 0.8)
        mb.box((w, 0.015, h), (p.x, p.y, p.z - h / 2 - 0.02), (0, 0, ang), mat='M_Soft', color=col(c, 0.04, rng))

def barrel_w(mb, m, rng, h=0.85, r=0.32):
    prof = [(r * 0.86, 0), (r, h * 0.5), (r * 0.86, h)]
    mb.lathe(prof, 'M_Wood', col('timber_warm', 0.08, rng), m, segs=10, smooth=True)
    for zf in (0.2, 0.8):
        mb.add(su.prim_ring(r * 0.93, r * 0.97 + 0.012, 0.05, 10), 'M_Wood', col('iron', 0, None, 1.8), m @ M((0, 0, h * zf)))

def bench(mb, cx, cy, ang, gl, rng, L=1.5):
    m = M((cx, cy, gl(cx, cy)), (0, 0, ang))
    mb.box((L, 0.4, 0.06), (0, 0, 0.45), mat='M_Wood', color='wood_light', matrix=m)
    mb.box((L, 0.05, 0.3), (0, 0.19, 0.74), (math.radians(-10), 0, 0), mat='M_Wood', color='wood_light', matrix=m)
    for s in (-1, 1):
        mb.box((0.08, 0.38, 0.45), (s * (L / 2 - 0.12), 0, 0.22), mat='M_Wood', color='timber_mid', matrix=m)