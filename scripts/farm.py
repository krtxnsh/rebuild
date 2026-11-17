"""farm.py - v2 foreground farm (east bank, below the Electricity Room).

Plots (raised beds): cabbages, carrots, a restrained grain patch, lettuce + bean poles.  Crops are lightweight
merged clusters (no per-stalk/per-vegetable objects) in their own no-shadow mesh.  A hand pump at the river feeds a
farm-only irrigation channel; nothing drains toward the clean-water teaching equipment (which is on the west bank)."""
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

def rail(mb, a, b, rng, h=0.8, colr='timber_warm'):
    a, b = Vector(a), Vector(b)
    d = b - a
    n = max(1, int(d.length / 1.7))
    ang = math.atan2(d.y, d.x)
    pts = [a + d * (k / n) for k in range(n + 1)]
    for p in pts:
        mb.box((0.12, 0.12, h + 0.25), (p.x, p.y, gz(p.x, p.y) + (h + 0.25) / 2 - 0.2), (0, 0, ang + rng.uniform(-0.04, 0.04)), mat='M_Wood', color=col(colr, 0.07, rng))
    for zr in (0.32, h - 0.08):
        mb.sweep([Vector((p.x, p.y, gz(p.x, p.y) + zr)) for p in pts], su.rect_profile(0.05, 0.1), color=col('wood_light', 0.06, rng))

def bed(mb, x0, x1, y0, y1, rng, h=0.22):
    z = min(gz(x, y) for x in (x0, x1) for y in (y0, y1)) - 0.05
    zt = max(gz(x, y) for x in (x0, x1) for y in (y0, y1)) + h
    mb.box((x1 - x0, y1 - y0, zt - z - 0.04), ((x0 + x1) / 2, (y0 + y1) / 2, (z + zt - 0.04) / 2), mat='M_Soft', color=col('mud_dark', 0.04, rng))
    for (sx, sy, ln, hor) in ((0, y0, x1 - x0, True), (0, y1, x1 - x0, True), (x0, 0, y1 - y0, False), (x1, 0, y1 - y0, False)):
        if hor:
            mb.box((ln + 0.08, 0.07, zt - z), ((x0 + x1) / 2, sy, (z + zt) / 2), mat='M_Wood', color=col('timber_mid', 0.06, rng))
        else:
            mb.box((0.07, ln, zt - z), (sx, (y0 + y1) / 2, (z + zt) / 2), mat='M_Wood', color=col('timber_mid', 0.06, rng))
    return zt - 0.04

def cabbage(cm, x, y, z, rng):
    cm.add(su.prim_ico(0.13, 1), 'M_Soft', col('cabbage', 0.06, rng), M((x, y, z + 0.11), (0, 0, rng.uniform(0, 6)), (1, 1, 0.85)), smooth=True)
    for k in range(3):
        a = k * 2.1 + rng.uniform(0, 0.5)
        cm.add(su.prim_sphere(0.13, 8, 3, 0.35), 'M_Soft', col('leaf_green', 0.08, rng), M((x + 0.06 * math.cos(a), y + 0.06 * math.sin(a), z + 0.05), (0.35 * math.cos(a), 0.35 * math.sin(a), a)), smooth=True)

def carrot_top(cm, x, y, z, rng):
    cm.add(su.prim_cyl(0.022, 0.05, 4, r2=0.012), 'M_Soft', 'carrot', M((x, y, z - 0.01)))
    for k in range(3):
        a = k * 2.1 + rng.uniform(-0.3, 0.3)
        tip = (x + 0.07 * math.cos(a), y + 0.07 * math.sin(a), z + rng.uniform(0.16, 0.24))
        cm.add(([(x - 0.012, y, z + 0.03), (x + 0.012, y, z + 0.03), tip], [(0, 1, 2)]), 'M_Soft', col('leaf_lime', 0.1, rng))

def grain(cm, x, y, z, rng):
    for k in range(6):
        a = rng.uniform(0, 6.28)
        b = (x + 0.05 * math.cos(a), y + 0.05 * math.sin(a), z)
        h = rng.uniform(0.6, 0.8)
        tip = Vector((b[0] + 0.06 * math.cos(a), b[1] + 0.06 * math.sin(a), z + h))
        cm.add(([(b[0] - 0.015, b[1], z), (b[0] + 0.015, b[1], z), tuple(tip)], [(0, 1, 2)]), 'M_Soft', col('straw', 0.08, rng))
        if k % 2 == 0:
            cm.add(su.prim_sphere(0.025, 5, 3, 3.2), 'M_Soft', col('leaf_yellow', 0.06, rng), M(tuple(tip - Vector((0, 0, 0.06))), (0.2, 0.1, a)))

def lettuce(cm, x, y, z, rng):
    cm.add(su.prim_ico(0.1, 1), 'M_Soft', col('leaf_lime', 0.08, rng), M((x, y, z + 0.06), (0, 0, rng.uniform(0, 6)), (1, 1, 0.6)), smooth=True)

def build(G, region):
    from terrain import collider
    F = L.FARM
    rng = rng_('farm')
    st = region.setdefault('Farmstead', MB())
    crops = MB()
    x0, x1, y0, y1 = F['x0'], F['x1'], F['y0'], F['y1']
    root = su.empty('FARM_ROOT', 'VILLAGE_ROOT/11_EXP_FARM', G['Farm'], ((x0 + x1) / 2, (y0 + y1) / 2, gz((x0 + x1) / 2, (y0 + y1) / 2)), (0, 0, 0), 'ARROWS', 1.5)
    # fence with gates (west gate open, north gate gap to the farmhouse)
    wg0, wg1 = F['west_gate']
    ng0, ng1 = F['north_gate']
    fence = [[(x0, wg1), (x0, y1), (ng0, y1)], [(ng1, y1), (x1, y1), (x1, y0), (x0, y0), (x0, wg0)]]
    k = 0
    for poly in fence:
        for i in range(len(poly) - 1):
            rail(st, poly[i], poly[i + 1], rng)
            a, b = Vector(poly[i]), Vector(poly[i + 1])
            mid = (a + b) / 2
            collider('COL_FARM_Fence_%02d' % k, (mid.x - root.location.x, mid.y - root.location.y, gz(mid.x, mid.y) - root.location.z + 0.45), (0, 0, math.atan2(b.y - a.y, b.x - a.x)), ((b - a).length / 2, 0.08, 0.45), parent=root)
            k += 1
    # open gate leaf (swung inward) at the west gate
    hinge = Vector((x0, wg1))
    for j in range(4):
        st.box((0.06, 1.35, 0.06), (hinge.x + 0.65, hinge.y - 0.08, gz(hinge.x, hinge.y) + 0.2 + j * 0.2), (0, 0, math.radians(90 - 75)), mat='M_Wood', color='wood_light')
    st.box((0.07, 0.07, 0.9), (hinge.x + 1.3, hinge.y - 0.35, gz(hinge.x, hinge.y) + 0.45), mat='M_Wood', color='timber_mid')
    plots = {}
    # NW cabbages
    for j, yc in enumerate((-1.95, -2.85, -3.75)):
        zt = bed(st, 13.5, 16.6, yc - 0.36, yc + 0.36, rng)
        for i in range(5):
            cabbage(crops, 13.85 + i * 0.66, yc + rng.uniform(-0.05, 0.05), zt, rng)
    plots['cabbage'] = (13.5, 16.6, -4.11, -1.59)
    # NE carrots
    for j, yc in enumerate((-1.95, -2.85, -3.75)):
        zt = bed(st, 18.0, 21.3, yc - 0.36, yc + 0.36, rng)
        for r_ in (-0.15, 0.15):
            for i in range(11):
                carrot_top(crops, 18.18 + i * 0.29, yc + r_ + rng.uniform(-0.03, 0.03), zt, rng)
    plots['carrot'] = (18.0, 21.3, -4.11, -1.59)
    # SW grain patch (ground level, restrained)
    gx0, gx1, gy0, gy1 = 13.5, 16.6, -9.2, -6.5
    st.add(su.prim_box(gx1 - gx0, gy1 - gy0, 0.12), 'M_Soft', col('mud', 0.04, rng), M(((gx0 + gx1) / 2, (gy0 + gy1) / 2, gz((gx0 + gx1) / 2, (gy0 + gy1) / 2) + 0.0)))
    for i in range(7):
        for j in range(6):
            x = gx0 + 0.25 + i * (gx1 - gx0 - 0.5) / 6 + rng.uniform(-0.08, 0.08)
            y = gy0 + 0.25 + j * (gy1 - gy0 - 0.5) / 5 + rng.uniform(-0.08, 0.08)
            if math.hypot(x - 15.0, y - 7.8 * -1) < 0.5:
                continue
            grain(crops, x, y, gz(x, y) + 0.05, rng)
    plots['grain'] = (gx0, gx1, gy0, gy1)
    # SE lettuce beds + bean poles
    for yc in (-6.95, -7.85):
        zt = bed(st, 18.0, 19.7, yc - 0.33, yc + 0.33, rng)
        for i in range(4):
            lettuce(crops, 18.25 + i * 0.4, yc, zt, rng)
    for (bx, by) in ((18.45, -8.85), (19.3, -8.85)):
        zb = gz(bx, by)
        for a in range(3):
            ang = a * 2.1
            st.add(su.prim_sweep([Vector((bx + 0.3 * math.cos(ang), by + 0.3 * math.sin(ang), zb)), Vector((bx, by, zb + 1.7))], su.circle_profile(0.025, 4)), 'M_Wood', 'wood_light')
        for h in range(4):
            crops.add(su.prim_ico(0.14, 1), 'M_Soft', col('leaf_dark', 0.08, rng), M((bx + rng.uniform(-0.12, 0.12), by + rng.uniform(-0.12, 0.12), zb + 0.4 + h * 0.32), (0, 0, h), (1, 1, 1.3)), smooth=True)
    plots['lettuce_beans'] = (18.0, 19.7, -9.2, -6.5)
    # lean-to shelter with tool rack (SE corner)
    sx0, sx1, sy0, sy1 = 20.1, 21.5, -9.3, -6.8
    zs = gz((sx0 + sx1) / 2, (sy0 + sy1) / 2)
    for (px, py, h) in ((sx0, sy0, 2.2), (sx0, sy1, 2.2), (sx1, sy0, 1.8), (sx1, sy1, 1.8)):
        st.box((0.12, 0.12, h + 0.2), (px, py, gz(px, py) + (h + 0.2) / 2 - 0.2), mat='M_Wood', color=col('timber_mid', 0.05, rng))
    frame = Matrix.Translation(((sx0 + sx1) / 2, (sy0 + sy1) / 2, zs)) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
    RS.course_roof_side(st, -1.45, 1.45, -0.95, 1.75, 0.95, 2.3, rng, 'terracotta', 'timber_mid', frame, course=0.34, segs=3)
    st.box((0.08, 1.9, 1.2), (sx1 - 0.15, (sy0 + sy1) / 2, zs + 0.85), mat='M_Wood', color='timber_warm')
    for k, (tool, c) in enumerate((('rake', 'iron'), ('hoe', 'iron'), ('spade', 'stone_dark'))):
        ty = sy0 + 0.6 + k * 0.6
        st.add(su.prim_cyl(0.022, 1.4, 6), 'M_Wood', 'wood_light', M((sx1 - 0.25, ty, zs + 0.15), (0, -0.12, 0)), smooth=True)
        st.box((0.05, 0.3 if tool != 'spade' else 0.2, 0.08 if tool == 'rake' else 0.18), (sx1 - 0.3, ty, zs + 0.18), mat='M_Clay', color=c)
    su.gen_crate(st, M((sx0 + 0.5, sy0 + 0.6, zs)), rng=rng)
    RS.barrel_w(st, M((sx0 + 0.45, sy1 - 0.5, zs)), rng, h=0.7, r=0.26)
    # wheelbarrow (outside west gate), baskets, crates, watering cans
    wm = M((11.5, -3.7, gz(11.5, -3.7)), (0, 0, math.radians(35)))
    st.box((0.9, 0.62, 0.05), (0.1, 0, 0.45), (0, 0.15, 0), mat='M_Wood', color='wood_light', matrix=wm)
    for s in (-1, 1):
        st.box((0.9, 0.04, 0.25), (0.1, s * 0.3, 0.57), (0, 0.15, 0), mat='M_Wood', color='timber_warm', matrix=wm)
        st.box((1.0, 0.05, 0.05), (-0.75, s * 0.26, 0.48), (0, 0.12, 0), mat='M_Wood', color='timber_mid', matrix=wm)
        st.box((0.05, 0.05, 0.42), (-0.25, s * 0.25, 0.21), mat='M_Wood', color='timber_mid', matrix=wm)
    st.add(su.prim_ring(0.15, 0.22, 0.06, 12), 'M_Wood', 'timber_mid', wm @ M((0.62, 0, 0.22), (math.pi / 2, 0, 0)))
    st.add(su.prim_cyl(0.16, 0.05, 10, z0=False), 'M_Wood', 'timber_mid', wm @ M((0.62, 0, 0.22), (math.pi / 2, 0, 0)))
    for k in range(4):
        cabbage(crops, 11.5 + 0.22 * math.cos(0.6) * (k - 1.5) * 0.6, -3.7 + 0.12 * (k % 2), gz(11.5, -3.7) + 0.5, rng)
    for (bx, by) in ((13.05, -3.4), (13.05, -2.5)):
        z = gz(bx, by)
        st.lathe([(0.0, 0.0), (0.15, 0.0), (0.21, 0.22), (0.2, 0.24), (0.14, 0.03)], 'M_Soft', col('burlap_dark', 0.05, rng), M((bx, by, z)), segs=10)
        for q in range(3):
            crops.add(su.prim_sphere(0.05, 6, 4), 'M_Soft', rng.choice(['carrot', 'tomato', 'potato']), M((bx + rng.uniform(-0.08, 0.08), by + rng.uniform(-0.08, 0.08), z + 0.22)), smooth=True)
    for (cx, cy) in ((13.05, -1.4), (16.95, -6.55)):
        su.gen_crate(st, M((cx, cy, gz(cx, cy)), (0, 0, math.pi / 2)), rng=rng)
        for q in range(3):
            cabbage(crops, cx, cy - 0.15 + q * 0.15, gz(cx, cy) + 0.2, rng)
    for (wx, wy, yaw) in ((13.05, -6.6, 0.4), (17.85, -4.4, -0.8)):
        z = gz(wx, wy)
        cm_ = M((wx, wy, z), (0, 0, yaw))
        st.lathe([(0.0, 0.0), (0.13, 0.0), (0.14, 0.26), (0.1, 0.3), (0.0, 0.3)], 'M_Clay', col('stone_light', 0.03, rng), cm_, segs=10)
        st.add(su.prim_sweep([Vector((0.12, 0, 0.08)), Vector((0.32, 0, 0.3))], su.circle_profile(0.018, 5)), 'M_Clay', 'stone_light', cm_)
        st.add(su.prim_ring(0.07, 0.09, 0.02, 8), 'M_Clay', 'stone_light', cm_ @ M((-0.06, 0, 0.36), (math.pi / 2, 0, 0)))
    # scarecrow in the grain patch
    scx, scy = 15.05, -7.85
    z = gz(scx, scy)
    st.box((0.08, 0.08, 1.9), (scx, scy, z + 0.95), mat='M_Wood', color='timber_mid')
    st.box((1.3, 0.07, 0.07), (scx, scy, z + 1.45), mat='M_Wood', color='timber_mid')
    st.add(su.prim_cyl(0.2, 0.62, 8, r2=0.24), 'M_Soft', col('burlap', 0.05, rng), M((scx, scy, z + 0.95)), smooth=True)
    for s in (-1, 1):
        st.add(su.prim_cyl(0.07, 0.5, 6, r2=0.05), 'M_Soft', col('cloth_red', 0.05, rng), M((scx + s * 0.22, scy, z + 1.45), (0, s * math.pi / 2, 0)), smooth=True)
        st.add(su.prim_cyl(0.06, 0.16, 5, r2=0.0), 'M_Soft', 'straw', M((scx + s * 0.7, scy, z + 1.45), (0, s * math.pi / 2, 0)))
    st.add(su.prim_sphere(0.17, 8, 5), 'M_Soft', col('burlap', 0.03, rng), M((scx, scy, z + 1.78)), smooth=True)
    st.add(su.prim_cyl(0.32, 0.04, 10), 'M_Soft', 'straw', M((scx, scy, z + 1.88)), smooth=True)
    st.add(su.prim_cyl(0.16, 0.22, 8, r2=0.05), 'M_Soft', 'straw', M((scx, scy, z + 1.9)), smooth=True)
    # hand pump at the river + farm-only irrigation channel (east bank)
    ix, iy = F['intake']
    zi = gz(ix + 0.6, iy)
    pm = M((ix + 0.6, iy, zi))
    st.box((0.5, 0.5, 0.3), (0, 0, 0.15), mat='M_Stone', color='stone', matrix=pm, bevel=0.04)
    st.add(su.prim_cyl(0.13, 1.0, 8), 'M_Wood', 'timber_warm', pm @ M((0, 0, 0.3)), smooth=True)
    st.box((0.7, 0.06, 0.06), (0.2, 0, 1.25), (0, -0.4, 0), mat='M_Wood', color='timber_mid', matrix=pm)
    st.add(su.prim_sweep([Vector((0.12, 0, 0.95)), Vector((0.42, 0, 0.75))], su.circle_profile(0.04, 6)), 'M_Clay', 'stone_light', pm)
    st.add(su.prim_sweep([Vector((-0.1, 0, 0.3)), Vector((-0.9, 0, -0.2)), Vector((-1.2, 0, L.WATER_LEVEL - zi - 0.2))], su.circle_profile(0.05, 6)), 'M_Clay', 'stone_light', pm)
    chan = [(ix + 1.05, iy), (6.5, -6.3), (9.4, -6.15), (12.6, -5.95), (21.5, -5.95)]
    cpts = su.catmull([Vector((p[0], p[1], 0)) for p in chan], 0.5)
    wat = MB()
    for i in range(len(cpts) - 1):
        a, b = cpts[i], cpts[i + 1]
        d = (b - a)
        if d.length < 1e-4:
            continue
        mid = (a + b) / 2
        ang = math.atan2(d.y, d.x)
        z = min(gz(a.x, a.y), gz(b.x, b.y))
        for s in (-1, 1):
            st.box((d.length + 0.02, 0.07, 0.2), (mid.x - math.sin(ang) * s * 0.2, mid.y + math.cos(ang) * s * 0.2, z + 0.02), (0, 0, ang), mat='M_Stone', color=col('stone', 0.06, rng))
        st.box((d.length + 0.02, 0.4, 0.05), (mid.x, mid.y, z - 0.09), (0, 0, ang), mat='M_Stone', color='stone_dark')
        wat.box((d.length + 0.03, 0.33, 0.01), (mid.x, mid.y, z + 0.0), (0, 0, ang), mat='M_Water', color='water')
    for (cx, cy) in ((9.4, -6.15), (17.3, -5.95)):
        z = gz(cx, cy)
        for k in range(5):
            st.box((0.2, 1.1, 0.05), (cx - 0.44 + k * 0.22, cy, z + 0.08), mat='M_Wood', color=col('wood_light', 0.06, rng))
    o = wat.build('EXP_Farm_Irrigation', 'VILLAGE_ROOT/11_EXP_FARM', parent=G['Farm'])
    su.tag(o, 'EXP_Farm_Irrigation', shader_target='water_flow', flow_axis='box_uv', note='farm irrigation only; separate from clean-water teaching equipment', cast_shadow=False)
    o = crops.build('EXP_Farm_Crops', 'VILLAGE_ROOT/11_EXP_FARM', parent=G['Farm'])
    su.tag(o, 'EXP_Farm_Crops', static=True, cast_shadow=False, note='merged crop clusters (cabbage, carrot tops, grain, lettuce, beans)')
    # colliders, zones, markers
    for nm, (a0, a1, b0, b1) in plots.items():
        collider('COL_FARM_Plot_%s' % nm, ((a0 + a1) / 2 - root.location.x, (b0 + b1) / 2 - root.location.y, 0.2), (0, 0, 0), ((a1 - a0) / 2, (b1 - b0) / 2, 0.2), parent=root)
        BC.zone('FARM_Zone_%s' % nm, root, ((a0 + a1) / 2 - root.location.x, (b0 + b1) / 2 - root.location.y, 0.6), ((a1 - a0) / 2, (b1 - b0) / 2, 0.6), 'crop_plot', 'FARM_InteractionZone', crop=nm)
    for nm, c, h in (('Shelter', ((sx0 + sx1) / 2, (sy0 + sy1) / 2, 1.0), ((sx1 - sx0) / 2 + 0.1, (sy1 - sy0) / 2 + 0.1, 1.0)),
                     ('Scarecrow', (scx, scy, 1.0), (0.3, 0.2, 1.0)), ('Wheelbarrow', (11.5, -3.7, 0.4), (0.8, 0.45, 0.4)), ('Pump', (ix + 0.6, iy, 0.7), (0.3, 0.3, 0.7))):
        collider('COL_FARM_%s' % nm, (c[0] - root.location.x, c[1] - root.location.y, gz(c[0], c[1]) - root.location.z + c[2]), (0, 0, 0), h, parent=root)
    BC.marker('FARM_Gate_West', root, (x0 - 0.6 - root.location.x, (wg0 + wg1) / 2 - root.location.y, gz(x0 - 0.6, (wg0 + wg1) / 2) - root.location.z), -math.pi / 2, 'entrance',
              sid='FARM_Gate_West', forward_local=[0, 1, 0], clear_width=round(wg1 - wg0, 2))
    BC.marker('FARM_Gate_North', root, ((ng0 + ng1) / 2 - root.location.x, y1 + 0.6 - root.location.y, gz((ng0 + ng1) / 2, y1 + 0.6) - root.location.z), math.pi, 'entrance',
              sid='FARM_Gate_North', forward_local=[0, 1, 0], clear_width=round(ng1 - ng0, 2))
    su.tag(root, 'FARM_ROOT', farm=True, plots={k: [round(v, 2) for v in p] for k, p in plots.items()}, irrigation='hand pump at river -> stone channel (farm only)',
           gates={'west': [x0, wg0, wg1], 'north': [ng0, ng1, y1]})
    bpy.app.driver_namespace['expansion_extra_masks'] = [('FARM_Channel', 0.9, cpts)]
    return {'crop_tris': crops.tri_count(), 'irrigation_tris': wat.tri_count(), 'plots': list(plots)}