"""village_details.py - v2 purposeful village-life clusters (kept sparse to preserve open grass and movement space):
gathering spot (bench, noticeboard, lantern), direction signs at junctions, community garden on the west bank,
grouped reeds + stones at selected river edges."""
import bpy, math, random, zlib
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col
import layout as L
import terrain as T
import residential as RS
import building_common as BC

def rng_(s):
    return random.Random(zlib.crc32(s.encode()))

def gz(x, y):
    return T.ground(x, y)

def text_both_sides(mb, txt, m, size, colr='timber_dark', depth=0.03):
    tv, tf = su.gen_text(txt, size=size, extrude=0.0)
    mb.add((tv, tf), 'M_Wood', colr, m @ M((0, -depth, 0), (math.pi / 2, 0, 0)))
    mb.add((tv, tf), 'M_Wood', colr, m @ M((0, depth, 0), (math.pi / 2, 0, math.pi)))

def signpost(mb, x, y, boards, rng):
    z = gz(x, y)
    mb.box((0.14, 0.14, 2.3), (x, y, z + 1.1), mat='M_Wood', color=col('timber_mid', 0.05, rng))
    mb.box((0.22, 0.22, 0.08), (x, y, z + 2.28), mat='M_Wood', color='timber_dark')
    for k, (txt, yaw) in enumerate(boards):
        zz = z + 1.95 - k * 0.32
        m = M((x, y, zz), (0, 0, math.radians(yaw)))
        ln = 0.28 + 0.13 * len(txt)
        mb.box((ln, 0.05, 0.24), (ln / 2 + 0.08, 0, 0), mat='M_Wood', color=col('wood_light', 0.06, rng), matrix=m)
        mb.add(([(ln + 0.08, -0.026, -0.12), (ln + 0.08, -0.026, 0.12), (ln + 0.22, -0.026, 0.0), (ln + 0.08, 0.026, -0.12), (ln + 0.08, 0.026, 0.12), (ln + 0.22, 0.026, 0.0)],
                [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (2, 5, 4, 1)]), 'M_Wood', col('wood_light', 0.06, rng), m)
        text_both_sides(mb, txt, m @ M((ln / 2 + 0.1, 0, 0)), 0.15)

def gravel_disc(mb, cx, cy, r, rng, n=20):
    v = [(cx, cy, gz(cx, cy) + 0.04)]
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 + 0.08 * math.sin(i * 2.3))
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
        v.append((x, y, gz(x, y) + 0.03))
    f = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    mb.add((v, f), 'M_Stone', col('gravel', 0.05, rng), smooth=True)

def gathering(mb, glass, rng, cols):
    cx, cy = L.GATHERING
    gravel_disc(mb, cx, cy, 2.3, rng)
    RS.bench(mb, cx - 0.4, cy - 1.55, 0.0, gz, rng, L=1.7)
    cols.append(('Bench', (cx - 0.4, cy - 1.55, 0.45), (0.9, 0.3, 0.45), 0.0))
    # noticeboard with small roof and pinned notes
    nx, ny = cx - 1.3, cy + 1.1
    z = gz(nx, ny)
    m = M((nx, ny, z), (0, 0, math.radians(-30)))
    for s in (-1, 1):
        mb.box((0.1, 0.1, 2.0), (s * 0.6, 0, 1.0), mat='M_Wood', color='timber_mid', matrix=m)
    mb.box((1.3, 0.06, 0.85), (0, 0, 1.35), mat='M_Wood', color='wood_light', matrix=m)
    mb.box((1.5, 0.4, 0.06), (0, 0, 2.02), (0.25, 0, 0), mat='M_Clay', color='terracotta', matrix=m)
    for k, c in enumerate(('cloth_white', 'flower_yellow', 'cloth_white', 'cloth_blue')):
        mb.box((0.24, 0.01, 0.3), (-0.42 + k * 0.28, -0.04, 1.35 + (0.08 if k % 2 else -0.05)), (0, 0, 0.05 * (k - 1.5)), mat='M_Soft', color=c, matrix=m)
    tv, tf = su.gen_text('NOTICES', size=0.11, extrude=0.0)
    mb.add((tv, tf), 'M_Wood', 'timber_dark', m @ M((0, -0.045, 1.66), (math.pi / 2, 0, 0)))
    cols.append(('Noticeboard', (nx, ny, 1.0), (0.7, 0.15, 1.0), math.radians(-30)))
    # lantern post
    lx, ly = cx + 0.6, cy + 2.0
    z = gz(lx, ly)
    mb.box((0.12, 0.12, 2.3), (lx, ly, z + 1.15), mat='M_Wood', color='timber_dark')
    mb.box((0.45, 0.07, 0.07), (lx + 0.2, ly, z + 2.25), mat='M_Wood', color='timber_dark')
    lm = M((lx + 0.38, ly, z + 1.85))
    mb.box((0.24, 0.24, 0.04), (0, 0, 0.0), mat='M_Wood', color='timber_dark', matrix=lm)
    mb.add(su.prim_cyl(0.15, 0.1, 4, r2=0.04), 'M_Wood', 'timber_dark', lm @ M((0, 0, 0.3), (0, 0, math.pi / 4)))
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        mb.box((0.025, 0.025, 0.28), (0.11 * math.cos(ang), 0.11 * math.sin(ang), 0.16), mat='M_Wood', color='timber_dark', matrix=lm)
    glass.add(su.prim_cyl(0.09, 0.26, 6), 'M_GlassWarm', 'glass', lm @ M((0, 0, 0.03)), smooth=True)
    mb.add(su.prim_cyl(0.008, 0.3, 4), 'M_Wood', 'iron', lm @ M((0, 0, 0.36)))
    cols.append(('Lantern', (lx, ly, 1.15), (0.12, 0.12, 1.15), 0.0))
    for (px, py) in ((cx - 1.9, cy - 0.7), (cx - 1.6, cy - 1.3)):
        su.gen_pot(mb, M((px, py, gz(px, py))), h=0.5, r=0.22, rng=rng)
        mb.add(su.prim_ico(0.24, 1), 'M_Soft', rng.choice(['flower_pink', 'flower_yellow']), M((px, py, gz(px, py) + 0.6), (0, 0, 1), (1, 1, 0.8)), smooth=True)

def community_garden(mb, rng, cols):
    cx, cy = L.COMMUNITY_GARDEN
    x0, x1, y0, y1 = cx - 1.9, cx + 1.9, cy - 1.6, cy + 1.6
    poly = [(x1, cy + 0.75), (x1, y1), (x0, y1), (x0, y0), (x1, y0), (x1, cy - 0.75)]
    for i in range(len(poly) - 1):
        RS.picket(mb, poly[i], poly[i + 1], gz, rng, h=0.75)
    for k, yc in enumerate((cy - 0.75, cy + 0.75)):
        RS.veg_bed(mb, cx - 0.25, yc, 0.0, gz, rng, L=2.6, Wd=0.85)
    wx, wy = x1 - 0.45, cy + 0.0
    z = gz(wx, wy)
    mb.lathe([(0.0, 0.0), (0.13, 0.0), (0.14, 0.26), (0.1, 0.3), (0.0, 0.3)], 'M_Clay', 'stone_light', M((wx, wy, z)), segs=10)
    mb.add(su.prim_sweep([Vector((wx + 0.12, wy, z + 0.08)), Vector((wx + 0.32, wy, z + 0.3))], su.circle_profile(0.018, 5)), 'M_Clay', 'stone_light')
    for (a, b) in ((poly[1], poly[2]), (poly[2], poly[3]), (poly[3], poly[4])):
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        cols.append(('GardenFence_%d' % len(cols), (mid[0], mid[1], 0.45), (abs(b[0] - a[0]) / 2 + 0.06, abs(b[1] - a[1]) / 2 + 0.06, 0.45), 0.0))
    for k, yc in enumerate((cy - 0.75, cy + 0.75)):
        cols.append(('GardenBed_%d' % k, (cx - 0.25, yc, 0.2), (1.3, 0.45, 0.2), 0.0))

def river_clusters(region, rng):
    spots = [(-7.2, -1, 'Farmstead'), (-2.0, 1, 'Farmstead'), (12.5, 1, 'RearEast'), (29.0, 1, 'RearEast'), (-19.5, -1, 'WestOuter'),
             (-10.0, -1, 'WestOuter'), (16.0, -1, 'RearWest'), (35.0, -1, 'RearWest')]
    n = 0
    for (y, side, reg) in spots:
        p, t = T.stream_point_at_y(y)
        nrm = Vector((-t.y, t.x, 0)) * side
        hw = L.stream_halfwidth(y)
        base = p + nrm * (hw + 0.75)
        mb = region.setdefault(reg, MB())
        for k in range(3):
            q = base + Vector((t.x, t.y, 0)) * rng.uniform(-0.8, 0.8) + nrm * rng.uniform(-0.25, 0.35)
            su.gen_rock(mb, M((q.x, q.y, max(gz(q.x, q.y), L.WATER_LEVEL) - 0.06), (0, 0, rng.uniform(0, 6))), r=rng.uniform(0.22, 0.42), rng=rng, color=rng.choice(['stone', 'stone_light', 'stone_dark']), flat=0.6)
        for c in range(2):
            rr = base + Vector((t.x, t.y, 0)) * rng.uniform(-1.4, 1.4) - nrm * rng.uniform(0.1, 0.5)
            for k in range(8):
                a = rng.uniform(0, 6.28)
                b0 = Vector((rr.x + math.cos(a) * 0.14, rr.y + math.sin(a) * 0.14, L.WATER_LEVEL - 0.05))
                tip = b0 + Vector((rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), rng.uniform(0.85, 1.35)))
                mb.add(([tuple(b0 + Vector((0.025, 0, 0))), tuple(b0 - Vector((0.025, 0, 0))), tuple(tip)], [(0, 1, 2)]), 'M_Soft', col('grass_dark', 0.1, rng))
                if k < 2:
                    mb.add(su.prim_cyl(0.03, 0.18, 6), 'M_Soft', 'lentil', M(tuple(b0 + (tip - b0) * 0.8)), smooth=True)
        n += 1
    return n

def build(G, region, houses):
    from terrain import collider
    rng = rng_('details')
    out = {}
    rw = region.setdefault('RearWest', MB())
    glass = MB()
    cols = []
    gathering(rw, glass, rng, cols)
    gr = su.empty('EXP_GatheringSpot', 'VILLAGE_ROOT/12_EXP_VILLAGE_DETAILS', G['Details'], (L.GATHERING[0], L.GATHERING[1], gz(*L.GATHERING)), (0, 0, 0), 'CIRCLE', 2.3)
    su.tag(gr, 'EXP_GatheringSpot', marker='gathering_spot', radius=2.3, features=['bench', 'noticeboard', 'lantern', 'flower pots'])
    for (nm, c, h, yaw) in cols:
        collider('COL_EXP_Gathering_%s' % nm, (c[0] - gr.location.x, c[1] - gr.location.y, gz(c[0], c[1]) - gr.location.z + c[2]), (0, 0, yaw), h, parent=gr)
    regions_for_sign = ['RearWest', 'Farmstead', 'RearEast']
    for k, ((sx, sy), boards) in enumerate(L.SIGNS):
        signpost(region.setdefault(regions_for_sign[k], MB()), sx, sy, boards, rng)
        so = su.empty('EXP_Sign_%02d' % (k + 1), 'VILLAGE_ROOT/12_EXP_VILLAGE_DETAILS', G['Details'], (sx, sy, gz(sx, sy)), (0, 0, 0), 'SINGLE_ARROW', 0.6)
        su.tag(so, 'EXP_Sign', instance_id='EXP_Sign_%02d' % (k + 1), marker='signpost', text=[b[0] for b in boards], legible_text_geometry=True)
        collider('COL_EXP_Sign_%02d' % (k + 1), (0, 0, 1.1), (0, 0, 0), (0.1, 0.1, 1.1), parent=so)
    wo = region.setdefault('WestOuter', MB())
    gcols = []
    community_garden(wo, rng, gcols)
    cg = su.empty('EXP_CommunityGarden', 'VILLAGE_ROOT/12_EXP_VILLAGE_DETAILS', G['Details'], (L.COMMUNITY_GARDEN[0], L.COMMUNITY_GARDEN[1], gz(*L.COMMUNITY_GARDEN)), (0, 0, 0), 'CUBE', 1.0)
    su.tag(cg, 'EXP_CommunityGarden', marker='garden', note='small complementary vegetable garden on the west bank')
    for (nm, c, h, yaw) in gcols:
        collider('COL_EXP_%s' % nm, (c[0] - cg.location.x, c[1] - cg.location.y, gz(c[0], c[1]) - cg.location.z + c[2]), (0, 0, yaw), h, parent=cg)
    out['river_clusters'] = river_clusters(region, rng)
    o = glass.build('EXP_LanternGlass', 'VILLAGE_ROOT/12_EXP_VILLAGE_DETAILS', parent=G['Details'])
    su.tag(o, 'EXP_LanternGlass', emissive=True, toggle='emissive', cast_shadow=False)
    out['signs'] = len(L.SIGNS)
    return out