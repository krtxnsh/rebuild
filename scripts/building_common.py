"""building_common.py - architectural building blocks shared by the three buildings.

Wall frame convention: wall-local X runs along the wall, local Y points INTO the building, Z up, origin on the
wall centre-line at the wall's base.  Outside face is at y = -t/2.
"""
import bpy, math, random
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col, prim_box, prim_bbox
import layout as L

# ----------------------------------------------------------------------------- hierarchy
def make_root(key, coll_name):
    """Explicit Empty hierarchy that survives glTF export (collections do not)."""
    b = L.BUILDINGS[key]
    root = su.empty('BLD_%s_ROOT' % key, coll_name, None, (b['loc'][0], b['loc'][1], b['z']), (0, 0, math.radians(b['rot'])), 'ARROWS', 1.5)
    su.tag(root, 'BLD_%s_ROOT' % key, building=key, asset_root=True)
    groups = {}
    for g in ('Exterior', 'Roof', 'Interior', 'Interactables', 'Colliders', 'Zones'):
        e = su.empty('%s_%s_Group' % (key, g), coll_name, root, (0, 0, 0), (0, 0, 0), 'PLAIN_AXES', 0.3)
        su.tag(e, '%s_%s_Group' % (key, g), group=g.lower())
        groups[g] = e
    return root, groups

def wall_frame(side, W, D, t, z0=0.0):
    if side == 'front':
        o, x, y, ln = (0, -D / 2 + t / 2, z0), (1, 0, 0), (0, 1, 0), W
    elif side == 'back':
        o, x, y, ln = (0, D / 2 - t / 2, z0), (-1, 0, 0), (0, -1, 0), W
    elif side == 'right':
        o, x, y, ln = (W / 2 - t / 2, 0, z0), (0, 1, 0), (-1, 0, 0), D - 2 * t
    else:
        o, x, y, ln = (-W / 2 + t / 2, 0, z0), (0, -1, 0), (1, 0, 0), D - 2 * t
    m = Matrix((
        (x[0], y[0], 0, o[0]),
        (x[1], y[1], 0, o[1]),
        (0, 0, 1, o[2]),
        (0, 0, 0, 1)))
    return m, ln

def wall_rects(length, height, openings):
    xs = sorted(set([-length / 2, length / 2] + [o[0] for o in openings] + [o[1] for o in openings]))
    rects = []
    for i in range(len(xs) - 1):
        a, b = xs[i], xs[i + 1]
        if b - a < 1e-4:
            continue
        mid = (a + b) / 2
        cov = [o for o in openings if o[0] <= mid <= o[1]]
        zs = sorted(set([0.0, height] + [z for o in cov for z in (o[2], o[3])]))
        for j in range(len(zs) - 1):
            zm = (zs[j] + zs[j + 1]) / 2
            if not any(o[2] <= zm <= o[3] for o in cov) and zs[j + 1] - zs[j] > 1e-4:
                rects.append((a, b, zs[j], zs[j + 1]))
    return rects

def build_wall(mb, mtx, length, height, t, openings, mat, color, rng=None, inner_color=None):
    """Solid wall with real thickness at openings; returns rects for collider generation."""
    rects = wall_rects(length, height, openings)
    for (a, b, z0, z1) in rects:
        c = col(color, 0.03, rng) if rng else color
        mb.box((b - a, t, z1 - z0), ((a + b) / 2, 0, (z0 + z1) / 2), mat=mat, color=c, matrix=mtx)
    return rects

def wall_colliders(prefix, mtx, length, height, t, openings, parent, base_mtx_world=None):
    """Full-height collider boxes split only at openings that reach the floor (doors)."""
    from terrain import collider
    doors = sorted([o for o in openings if o[2] <= 0.01], key=lambda o: o[0])
    xs = [-length / 2]
    segs = []
    cur = -length / 2
    for o in doors:
        if o[0] > cur:
            segs.append((cur, o[0]))
        cur = max(cur, o[1])
    if cur < length / 2:
        segs.append((cur, length / 2))
    out = []
    for i, (a, b) in enumerate(segs):
        c = mtx @ Vector(((a + b) / 2, 0, height / 2))
        ang = math.atan2(mtx[1][0], mtx[0][0])
        ob = collider('%s_%02d' % (prefix, i), c, (0, 0, ang), ((b - a) / 2, t / 2 + 0.02, height / 2), parent=parent)
        out.append(ob)
    return out

def gable(mb, mtx, boundary, t, mat, color, hole=None, segs=24):
    """Extruded wall polygon (star-shaped about `hole` centre) with optional circular hole.
    boundary: CCW list of (u, z) in wall frame.  hole: (cu, cz, r)."""
    if hole is None:
        cu = sum(p[0] for p in boundary) / len(boundary); cz = sum(p[1] for p in boundary) / len(boundary)
        r = 0.0
    else:
        cu, cz, r = hole
    angs = set(round(2 * math.pi * i / segs, 6) for i in range(segs))
    for (u, z) in boundary:
        angs.add(round(math.atan2(z - cz, u - cu) % (2 * math.pi), 6))
    angs = sorted(angs)
    def hit(a):
        d = Vector((math.cos(a), math.sin(a)))
        best = None
        n = len(boundary)
        for i in range(n):
            p = Vector(boundary[i]); q = Vector(boundary[(i + 1) % n])
            e = q - p
            den = d.x * (-e.y) - d.y * (-e.x)
            if abs(den) < 1e-9:
                continue
            w = p - Vector((cu, cz))
            s = (w.x * (-e.y) - w.y * (-e.x)) / den
            k = (d.x * w.y - d.y * w.x) / den
            if s > 1e-6 and -1e-6 <= k <= 1 + 1e-6:
                if best is None or s < best:
                    best = s
        return Vector((cu, cz)) + d * best
    outer = [hit(a) for a in angs]
    inner = [Vector((cu + r * math.cos(a), cz + r * math.sin(a))) for a in angs]
    v, f = [], []
    n = len(angs)
    for side, y in ((0, -t / 2), (1, t / 2)):
        base = len(v)
        for i in range(n):
            v.append((outer[i].x, y, outer[i].y)); v.append((inner[i].x, y, inner[i].y))
        for i in range(n):
            j = (i + 1) % n
            a, b, c, d = base + 2 * i, base + 2 * j, base + 2 * j + 1, base + 2 * i + 1
            f.append((a, b, c, d) if side == 0 else (d, c, b, a))
    if r > 0:
        for i in range(n):
            j = (i + 1) % n
            f.append((2 * i + 1, 2 * j + 1, 2 * n + 2 * j + 1, 2 * n + 2 * i + 1))
    mb.add((v, f), mat, color, mtx)

def beam(mb, p0, p1, w, h, color='timber_dark', mtx=None, mat='M_Wood'):
    p0, p1 = Vector(p0), Vector(p1)
    if mtx is not None:
        p0, p1 = mtx @ p0, mtx @ p1
    mb.add(su.prim_sweep([p0, p1], su.rect_profile(w, h)), mat, color)

def window(mb, glass_mb, mtx, u, z0, w, h, t, frame='timber_dark', fw=0.1, grid=(2, 2), glass_mat='M_GlassWarm', glass_col='glass', sill=True, box=None, rng=None, shutter=False):
    """Timber window frame in a wall opening (u centre, z0 bottom, w x h)."""
    yo = -t / 2 - 0.03
    d = 0.12
    # outer frame
    mb.box((w + 2 * fw, d, fw), (u, yo, z0 + h + fw / 2), mat='M_Wood', color=frame, matrix=mtx, bevel=0.015)
    mb.box((w + 2 * fw, d, fw), (u, yo, z0 - fw / 2), mat='M_Wood', color=frame, matrix=mtx, bevel=0.015)
    for s in (-1, 1):
        mb.box((fw, d, h), (u + s * (w / 2 + fw / 2), yo, z0 + h / 2), mat='M_Wood', color=frame, matrix=mtx, bevel=0.015)
    if sill:
        mb.box((w + 2 * fw + 0.12, 0.2, 0.07), (u, -t / 2 - 0.08, z0 - fw - 0.02), mat='M_Wood', color=frame, matrix=mtx)
    # inner reveal frame (interior side)
    for s in (-1, 1):
        mb.box((0.06, 0.04, h), (u + s * (w / 2 + 0.03), t / 2 + 0.02, z0 + h / 2), mat='M_Wood', color=frame, matrix=mtx)
    # mullions
    nx, nz = grid
    for i in range(1, nx):
        mb.box((0.05, 0.06, h), (u - w / 2 + w * i / nx, 0, z0 + h / 2), mat='M_Wood', color=frame, matrix=mtx)
    for j in range(1, nz):
        mb.box((w, 0.06, 0.05), (u, 0, z0 + h * j / nz), mat='M_Wood', color=frame, matrix=mtx)
    glass_mb.box((w, 0.02, h), (u, 0.02, z0 + h / 2), mat=glass_mat, color=glass_col, matrix=mtx)
    if box:  # flower box with plants
        mb.box((w + 0.1, 0.26, 0.2), (u, -t / 2 - 0.2, z0 - 0.22), mat='M_Wood', color='timber_mid', matrix=mtx, bevel=0.015)
        rng = rng or random.Random(3)
        for k in range(6):
            x = u - w / 2 + 0.08 + (w - 0.16) * k / 5
            box.add(su.prim_ico(0.1, 1), 'M_Organic', rng.choice(['leaf_green', 'leaf_dark', 'flower_pink', 'flower_yellow', 'leaf_green']), mtx @ M((x, -t / 2 - 0.2, z0 - 0.06), (0, 0, k), (1, 1, 0.8)), smooth=True)

def door_leaf(w, h, t=0.07, s=1, color='timber_warm', planks=4, rng=None, ring=True, strap=True):
    """Plank door leaf; hinge at local x=0, leaf extends toward s*x.  Returns MB."""
    mb = MB()
    rng = rng or random.Random(4)
    pw = w / planks
    for i in range(planks):
        x = s * (pw * (i + 0.5))
        mb.box((pw - 0.012, t, h - 0.01), (x, 0, h / 2), mat='M_Wood', color=col(color, 0.08, rng), bevel=0.01)
    for side in (-1, 1):
        yy = side * (t / 2 + 0.02)
        for z in (0.3, h - 0.3):
            mb.box((w - 0.08, 0.04, 0.14), (s * w / 2, yy, z), mat='M_Wood', color=col(color, 0.0, None, 0.85))
        # diagonal Z brace
        p0 = Vector((s * 0.12, yy, 0.38)); p1 = Vector((s * (w - 0.12), yy, h - 0.38))
        mb.add(su.prim_sweep([p0, p1], su.rect_profile(0.04, 0.12)), 'M_Wood', col(color, 0.0, None, 0.85))
    # door hardware shares M_Wood (vertex-coloured iron/brass) -> one draw call per leaf
    if strap:
        for z in (0.3, h - 0.3):
            mb.box((w * 0.62, 0.02, 0.07), (s * w * 0.31, -t / 2 - 0.045, z), mat='M_Wood', color=col('iron', 0, None, 1.6))
            mb.add(su.prim_cyl(0.035, 0.14, 8, z0=False), 'M_Wood', col('iron', 0, None, 1.6), M((0, -t / 2 - 0.03, z)), smooth=True)
    if ring:
        mb.add(su.prim_ring(0.05, 0.068, 0.02, 12), 'M_Wood', 'brass', M((s * (w - 0.16), -t / 2 - 0.06, h * 0.48), (math.pi / 2, 0, 0)))
        mb.add(su.prim_cyl(0.03, 0.03, 8), 'M_Wood', 'brass', M((s * (w - 0.16), -t / 2 - 0.03, h * 0.55), (math.pi / 2, 0, 0)))
    return mb

def place_door(mb, name, coll_name, parent, hinge_local, rot_closed, open_deg, s, props):
    """Build door object with pivot at hinge.  rot_closed: wall yaw; open_deg applied about Z."""
    ob = mb.build(name, coll_name, parent=parent, loc=hinge_local, rot=(0, 0, rot_closed + math.radians(open_deg)))
    su.tag(ob, name, interactable=True, animation='door', pivot_axis='Z', pivot='hinge',
           closed_yaw_deg=round(math.degrees(rot_closed), 2), open_yaw_deg=round(math.degrees(rot_closed + math.radians(open_deg if open_deg else (-100 * s))), 2),
           **props)
    return ob

# ----------------------------------------------------------------------------- roofs
def tile_template(r=0.13, l=0.44, segs=5, lip=0.035):
    v, f = [], []
    for i in range(segs + 1):
        a = math.pi * i / segs
        ca, sa = math.cos(a), math.sin(a)
        v.append((r * ca, 0.0, r * sa)); v.append((r * ca, l, r * sa * 0.92))
        v.append(((r - lip) * ca, 0.0, (r - lip) * sa))
    for i in range(segs):
        a0, a1 = 3 * i, 3 * (i + 1)
        f.append((a0 + 1, a1 + 1, a1, a0))           # outer surface (normal points away from tile axis)
        f.append((a0, a1, a1 + 2, a0 + 2))           # lower lip end face (faces down-slope)
    return v, f

def clay_roof_plane(mb, plane, width, slope_len, rng, tile_w=0.28, row=0.32, r=0.135, l=0.44, color='terracotta', skip=None):
    """Barrel-tile courses on a roof plane.  plane: matrix (X along eave, Y up-slope, Z outward)."""
    tv = tile_template(r, l)
    ncol = max(1, int(width / tile_w))
    tw = width / ncol
    nrow = int((slope_len - l * 0.6) / row) + 1
    for j in range(nrow):
        v = j * row
        for i in range(ncol):
            u = (i + 0.5) * tw
            if skip and skip(u, v):
                continue
            c = su.lerpc(color, 'terracotta_dark' if rng.random() < 0.5 else 'terracotta_light', rng.uniform(0, 0.45))
            m = plane @ M((u + rng.uniform(-0.01, 0.01), v, 0.0), (rng.uniform(-0.025, 0.025) - 0.06, rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03)))
            mb.add(tv, 'M_Clay', c, m, smooth=True)

def ridge_tiles(mb, p0, p1, rng, r=0.17, l=0.46, color='terracotta_dark'):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    n = max(1, int(d.length / (l * 0.9)))
    tv = tile_template(r, l, 6, 0.04)
    ang = math.atan2(d.y, d.x) - math.pi / 2
    for i in range(n):
        p = p0 + d * (i / n)
        mb.add(tv, 'M_Clay', col(color, 0.06, rng), M(p, (0, 0, ang)), smooth=True)

def plane_matrix(origin, xdir, ydir):
    x = Vector(xdir).normalized(); y = Vector(ydir).normalized(); z = x.cross(y).normalized()
    return Matrix(((x.x, y.x, z.x, origin[0]), (x.y, y.y, z.y, origin[1]), (x.z, y.z, z.z, origin[2]), (0, 0, 0, 1)))

def gable_roof(mb, rng, x0, x1, y_front, y_back, z_eave_f, z_eave_b, z_ridge, y_ridge=0.0, thick=0.14, tile_color='terracotta',
               deck_color='timber_dark', barge_color='timber_dark', barge=(0.22, 0.3), ridge=True):
    """Straight gable roof with ridge along X.  Returns dict of key heights."""
    for (ye, ze) in ((y_front, z_eave_f), (y_back, z_eave_b)):
        e = Vector((0, ye, ze)); rv = Vector((0, y_ridge, z_ridge))
        up = (rv - e)
        sl = up.length
        sgn = 1 if ye < y_ridge else -1
        if sgn > 0:
            plane = plane_matrix((x0, ye, ze), (1, 0, 0), up)
        else:
            plane = plane_matrix((x1, ye, ze), (-1, 0, 0), up)
        # deck slab (visible from inside as timber ceiling)
        mb.add(prim_box(x1 - x0, sl, thick), 'M_Wood', deck_color, plane @ M(((x1 - x0) / 2, sl / 2, -thick / 2)))
        clay_roof_plane(mb, plane @ M((0, -0.05, 0.02)), x1 - x0, sl + 0.02, rng, color=tile_color)
        # fascia along eave
        mb.add(prim_box(x1 - x0, 0.06, 0.2), 'M_Wood', barge_color, plane @ M(((x1 - x0) / 2, -0.04, -0.06)))
        # barge boards along both gable edges
        for xx in (x0, x1):
            p0 = Vector((xx, ye, ze - 0.05)); p1 = Vector((xx, y_ridge, z_ridge - 0.05))
            n = (p1 - p0).normalized()
            mb.add(su.prim_sweep([p0 - n * 0.2, p1 + n * 0.12], su.rect_profile(barge[0], barge[1])), 'M_Wood', col(barge_color, 0.05, rng))
    if ridge:
        ridge_tiles(mb, (x0 - 0.05, y_ridge, z_ridge + 0.05), (x1 + 0.05, y_ridge, z_ridge + 0.05), rng)
        for xx, s in ((x0, -1), (x1, 1)):
            mb.box((0.5, 0.24, 0.26), (xx + s * 0.12, y_ridge, z_ridge - 0.05), mat='M_Wood', color=barge_color, bevel=0.03)

def stone_course(mb, mtx, length, t, z0, z1, rng, skip=(), rows=2, depth=0.14, color='stone'):
    """Rounded-stone base course on the wall exterior, skipping door spans."""
    hrow = (z1 - z0) / rows
    for r in range(rows):
        u = -length / 2 - 0.1 + (0.2 if r % 2 else 0.0)
        while u < length / 2 + 0.05:
            ln = rng.uniform(0.38, 0.62)
            ln = min(ln, length / 2 + 0.12 - u)
            mid = u + ln / 2
            if ln > 0.12 and not any(a - 0.05 <= mid <= b + 0.05 for (a, b) in skip):
                mb.box((ln - 0.04, depth, hrow - 0.03), (mid, -t / 2 - depth / 2 + 0.03, z0 + hrow * (r + 0.5)), (0, 0, rng.uniform(-0.03, 0.03)),
                       mat='M_Stone', color=col(color, 0.12, rng), bevel=0.045, matrix=mtx)
            u += ln

def floor_planks(mb, x0, x1, y0, y1, z, rng, plank=0.22, color='wood_floor'):
    n = int((x1 - x0) / plank)
    pw = (x1 - x0) / n
    for i in range(n):
        mb.box((pw - 0.01, y1 - y0, 0.05), (x0 + pw * (i + 0.5), (y0 + y1) / 2, z - 0.025), mat='M_Wood', color=col(color, 0.08, rng))

def zone(name, parent, loc, half, purpose, sid, coll_name='VILLAGE_ROOT/08_GAMEPLAY_MARKERS', yaw=0.0, **kw):
    """Invisible interaction / gameplay zone (Empty).  sid = stable semantic id shared by repeated zones."""
    ob = su.empty(name, coll_name, parent, loc, (0, 0, yaw), 'CUBE', 1.0)
    ob.scale = half
    su.tag(ob, sid, zone=True, purpose=purpose, half_extents=[float(h) for h in half], **kw)
    return ob

def marker(name, parent, loc, yaw, kind, sid=None, coll_name='VILLAGE_ROOT/08_GAMEPLAY_MARKERS', **kw):
    ob = su.empty(name, coll_name, parent, loc, (0, 0, yaw), 'SINGLE_ARROW', 0.8)
    su.tag(ob, sid or name, marker=kind, **kw)
    return ob

def local_collider(name, parent, loc, half, yaw=0.0):
    from terrain import collider
    ob = collider(name, loc, (0, 0, yaw), half, parent=parent)
    return ob