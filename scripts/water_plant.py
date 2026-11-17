"""water_plant.py - Building B: plaster + dark timber water treatment house, terracotta barrel-tile roof,
elevated wooden stave tank on a braced tower, copper pipes/valves, cascading filtration boxes, clay basins,
troughs, stone well with tiled roof, picket fence, and an enterable interior.
Reference: water_primary.jpg (+ water_multi.jpg).  Building-local: front faces -Y."""
import bpy, math, random
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col
import building_common as BC

KEY = 'WATER'
CP = 'VILLAGE_ROOT/03_BUILDINGS/WATER_TREATMENT_PLANT/'
W, D, T, FZ, WH = 6.4, 4.6, 0.25, 0.3, 3.0
OPEN = {
    'front': [(-2.4, -1.4, 0.75, 1.95), (0.0, 1.7, 0.0, 2.3), (2.15, 2.95, 0.75, 1.95)],
    'back': [(-2.1, -1.0, 0.0, 2.05), (0.8, 1.8, 0.75, 1.95)],
    'left': [(-0.5, 0.5, 0.8, 1.9)],
    'right': [(-0.45, 0.45, 0.8, 1.9)],
}
ROOF = dict(x0=-3.65, x1=3.65, ye=2.85, ze=3.25, zr=5.45)
TOWER = (4.9, 2.6)          # tank tower centre
TANK_R, TANK_H, PLAT_Z = 1.25, 2.4, 6.0
WELL = (4.75, -2.85)
BOXES = [('WATER_Collection', (-5.0, 1.15), (1.4, 1.3), 1.4, False),
         ('WATER_Sedimentation', (-5.0, -0.35), (1.4, 1.4), 1.08, False),
         ('WATER_FilterStage', (-5.0, -1.95), (1.4, 1.4), 0.78, True)]
POTS = [((-5.0, -3.35), 0.56, 0.55), ((-3.75, -3.6), 0.48, 0.5)]
FENCE = [[(-6.4, 3.4), (-6.4, -5.0), (-1.5, -5.0)], [(2.4, -5.0), (6.6, -4.6), (6.9, -1.9)], [(6.9, 0.4), (6.9, 4.2)]]

def roof_under(y):
    return ROOF['zr'] - (ROOF['zr'] - ROOF['ze']) * abs(y) / ROOF['ye'] - 0.2

def build():
    rng = random.Random(202)
    root, G = BC.make_root(KEY, CP + 'WATER_Exterior')
    shell, glass, roof, props, plants = MB(), MB(), MB(), MB(), MB()
    # foundation + flagstone floor
    shell.box((W + 0.4, D + 0.4, FZ - 0.02), (0, 0, (FZ - 0.02) / 2), mat='M_Stone', color='stone', bevel=0.05)
    for i in range(10):
        for j in range(7):
            x = -W / 2 + T + (W - 2 * T) * (i + 0.5) / 10
            y = -D / 2 + T + (D - 2 * T) * (j + 0.5) / 7
            shell.box(((W - 2 * T) / 10 - 0.03, (D - 2 * T) / 7 - 0.03, 0.05), (x, y, FZ - 0.02), mat='M_Stone', color=col('stone_light', 0.08, rng))
    # entry steps (front door + back door)
    shell.box((2.1, 0.5, 0.16), (0.85, -D / 2 - 0.3, 0.08), mat='M_Stone', color='stone_light', bevel=0.04)
    shell.box((1.4, 0.45, 0.16), (1.55, D / 2 + 0.28, 0.08), mat='M_Stone', color='stone_light', bevel=0.04)
    walls = {}
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = BC.wall_frame(side, W, D, T, FZ)
        walls[side] = (mtx, ln)
        BC.build_wall(shell, mtx, ln, WH, T, OPEN[side], 'M_Plaster', 'plaster_white', rng)
        doors = [(a, b) for (a, b, z0, z1) in OPEN[side] if z0 <= 0.01]
        BC.stone_course(shell, mtx, ln + (0.3 if side in ('front', 'back') else 0.0), T, 0.0, 0.62, rng, skip=doors, rows=2)
    for side in ('left', 'right'):
        mtx, ln = walls[side]
        hu = D / 2
        zt = roof_under(hu - 0.01) - FZ
        boundary = [(-hu, WH), (hu, WH), (hu, max(zt, WH + 0.05)), (0.0, roof_under(0.0) - FZ), (-hu, max(zt, WH + 0.05))]
        BC.gable(shell, mtx, boundary, T, 'M_Plaster', 'plaster_white')
    # dark exposed timber framing
    tcol = lambda: col('timber_dark', 0.07, rng)
    for sx in (-1, 1):
        for sy in (-1, 1):
            shell.box((0.28, 0.28, WH + 0.1), (sx * (W / 2 - 0.03), sy * (D / 2 - 0.03), FZ + WH / 2), mat='M_Wood', color=tcol(), bevel=0.035)
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = walls[side]
        ext = 0.4 if side in ('front', 'back') else 0.0
        shell.box((ln + ext, 0.16, 0.24), (0, -T / 2 - 0.05, WH - 0.1), mat='M_Wood', color=tcol(), matrix=mtx, bevel=0.025)
        shell.box((ln + ext, 0.12, 0.16), (0, -T / 2 - 0.04, 0.68), mat='M_Wood', color=tcol(), matrix=mtx, bevel=0.02)
    fm, _ = walls['front']
    for u in (-0.16, 1.86, -3.0 + 0.6 * 0, -0.9 - 0.0):
        pass
    for u in (-0.16, 1.86, -0.95):
        shell.box((0.2, 0.16, WH - 0.7), (u, -T / 2 - 0.05, 0.68 + (WH - 0.7) / 2), mat='M_Wood', color=tcol(), matrix=fm, bevel=0.025)
    shell.box((2.1, 0.17, 0.2), (0.85, -T / 2 - 0.06, 2.42), mat='M_Wood', color=tcol(), matrix=fm, bevel=0.025)
    # knee braces at posts
    for side, us in (('front', (-3.0, -0.16, 1.86, 3.0)), ('back', (-3.0, 3.0)), ('left', (-2.0, 2.0)), ('right', (-2.0, 2.0))):
        mtx, ln = walls[side]
        for u in us:
            for s in (-1, 1):
                if abs(u + s * 0.6) > ln / 2 + 0.2:
                    continue
                BC.beam(shell, (u, -T / 2 - 0.05, WH - 0.75), (u + s * 0.55, -T / 2 - 0.05, WH - 0.2), 0.12, 0.14, tcol(), mtx)
    for side in ('left', 'right'):
        mtx, ln = walls[side]
        top = roof_under(0.0) - FZ
        shell.box((0.2, 0.16, top - WH), (0, -T / 2 - 0.05, WH + (top - WH) / 2), mat='M_Wood', color=tcol(), matrix=mtx)
        for s in (-1, 1):
            BC.beam(shell, (s * 1.9, -T / 2 - 0.05, WH + 0.1), (s * 0.15, -T / 2 - 0.05, top - 0.35), 0.14, 0.16, tcol(), mtx)
    # windows (dark glass, flower boxes on the front)
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = walls[side]
        for (a, b, z0, z1) in OPEN[side]:
            if z0 > 0.01:
                BC.window(shell, glass, mtx, (a + b) / 2, z0, b - a, z1 - z0, T, frame='timber_dark', fw=0.11, grid=(2, 2),
                          glass_mat='M_Metal', glass_col='slate_dark', box=plants if side == 'front' else None, rng=rng)
    # terracotta barrel-tile gable roof
    BC.gable_roof(roof, rng, ROOF['x0'], ROOF['x1'], -ROOF['ye'], ROOF['ye'], ROOF['ze'], ROOF['ze'], ROOF['zr'])
    for s in (-1, 1):
        roof.box((ROOF['x1'] - ROOF['x0'], 0.18, 0.22), (0, s * (D / 2 - 0.05), FZ + WH + 0.05), mat='M_Wood', color='timber_dark')
    tower_tank(G, rng, props)
    cascade(G, rng, props)
    well(G, rng)
    pipes(G, rng)
    yard(G, rng, props, plants)
    ext = CP + 'WATER_Exterior'
    o = shell.build('WATER_Shell', ext, parent=G['Exterior']); su.tag(o, 'WATER_Shell')
    o = glass.build('WATER_WindowGlass', ext, parent=G['Exterior']); su.tag(o, 'WATER_WindowGlass')
    o = roof.build('WATER_Roof', ext, parent=G['Roof']); su.tag(o, 'WATER_Roof', cutaway='roof')
    props.merge(plants)
    o = props.build('WATER_ExteriorProps', ext, parent=G['Exterior']); su.tag(o, 'WATER_ExteriorProps')
    interior(G, rng)
    gameplay(G)
    return root
def water_surface(name, mb_fn, G, sid=None, target='water_still', coll='WATER_Water_Channels'):
    mb = MB()
    mb_fn(mb)
    o = mb.build(name, CP + coll, parent=G['Exterior'])
    su.tag(o, sid or name, shader_target=target)
    return o

def fall_sheet(mb, pts, w=0.34):
    mb.add(su.prim_sweep([Vector(p) for p in pts], [(-w / 2, 0.0), (w / 2, 0.0)], closed_profile=False, caps=False), 'M_WaterFall', 'foam', smooth=True)

def tower_tank(G, rng, props):
    tx, ty = TOWER
    a = 1.12
    tw = MB()
    for sx in (-1, 1):
        for sy in (-1, 1):
            tw.box((0.24, 0.24, PLAT_Z), (tx + sx * a, ty + sy * a, PLAT_Z / 2), mat='M_Wood', color=col('timber_mid', 0.06, rng), bevel=0.03)
    levels = (0.35, 2.0, 3.8, PLAT_Z - 0.2)
    for z in levels:
        for s in (-1, 1):
            tw.box((2 * a + 0.3, 0.16, 0.2), (tx, ty + s * a, z), mat='M_Wood', color='timber_mid', bevel=0.02)
            tw.box((0.16, 2 * a + 0.3, 0.2), (tx + s * a, ty, z), mat='M_Wood', color='timber_mid', bevel=0.02)
    for i in range(len(levels) - 1):
        z0, z1 = levels[i] + 0.1, levels[i + 1] - 0.1
        for s in (-1, 1):
            off = s * (a + 0.02)
            for (p0, p1) in (((tx - a, ty + off, z0), (tx + a, ty + off, z1)), ((tx + a, ty + off, z0), (tx - a, ty + off, z1)),
                             ((tx + off, ty - a, z0), (tx + off, ty + a, z1)), ((tx + off, ty + a, z0), (tx + off, ty - a, z1))):
                if (p0[1] < ty - 0.5 or p0[0] < tx - 0.5) and False:
                    continue
                BC.beam(tw, p0, p1, 0.12, 0.14, col('timber_mid', 0.05, rng))
    for i in range(12):
        x = tx - 1.45 + (i + 0.5) * 2.9 / 12
        tw.box((2.9 / 12 - 0.02, 2.9, 0.08), (x, ty, PLAT_Z + 0.04), mat='M_Wood', color=col('wood_light', 0.08, rng))
    # ladder on the outer (+X) side
    su.gen_ladder(tw, M((tx + a + 0.42, ty, 0.0), (0, math.radians(-4), math.pi / 2)), PLAT_Z + 0.9, 0.55, color='timber_warm')
    o = tw.build('WATER_TankTower', CP + 'WATER_Equipment', parent=G['Exterior']); su.tag(o, 'WATER_TankTower')
    # stave tank (faceted staves, iron hoops, open top with water)
    tk = MB()
    r, h = TANK_R, TANK_H
    prof = [(r * 0.95, 0.0), (r * 0.99, h * 0.3), (r, h * 0.5), (r * 0.99, h * 0.7), (r * 0.96, h), (r * 0.86, h), (r * 0.86, h - 0.25)]
    tk.add(su.prim_lathe(prof, 22, cap_bottom=True, cap_top=False), 'M_Wood', lambda k: col('timber_warm', 0.1, random.Random(k // 6)), smooth=False)
    for zf in (0.14, 0.5, 0.86):
        rr = r * (0.965 if zf != 0.5 else 1.0)
        tk.add(su.prim_ring(rr - 0.01, rr + 0.03, 0.09, 22), 'M_Metal', 'iron', M((0, 0, h * zf)), smooth=True)
    tk.add(su.prim_cyl(0.06, 0.25, 8), 'M_Metal', 'copper', M((0, -r * 0.93, 0.22), (math.pi / 2, 0, 0)), smooth=True)
    o = tk.build('WATER_StorageTank', CP + 'WATER_Interactables', parent=G['Interactables'], loc=(tx, ty, PLAT_Z + 0.08))
    su.tag(o, 'WATER_StorageTank', interactable=True, stage='storage', capacity_note='stylised')
    water_surface('WATER_Surface_Tank', lambda mb: mb.add(su.prim_cyl(r * 0.86, 0.01, 22), 'M_Water', 'water', M((tx, ty, PLAT_Z + 0.08 + h - 0.3))), G)

def wood_box(mb, cx, cy, sx, sy, h, rng):
    t = 0.08
    mb.box((sx, sy, 0.08), (cx, cy, 0.04), mat='M_Wood', color='timber_mid')
    for k in range(3):
        z = h * (k + 0.5) / 3
        c = col('timber_warm', 0.1, rng)
        for s in (-1, 1):
            mb.box((sx, t, h / 3 - 0.02), (cx, cy + s * (sy / 2 - t / 2), z), mat='M_Wood', color=c)
            mb.box((t, sy - 2 * t, h / 3 - 0.02), (cx + s * (sx / 2 - t / 2), cy, z), mat='M_Wood', color=c)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1):
            mb.box((0.13, 0.13, h + 0.08), (cx + sx_ * (sx / 2 - 0.02), cy + sy_ * (sy / 2 - 0.02), (h + 0.08) / 2), mat='M_Wood', color='timber_dark', bevel=0.02)
    for z in (0.15, h - 0.12):
        for s in (-1, 1):
            mb.box((sx + 0.02, 0.02, 0.06), (cx, cy + s * (sy / 2 + 0.005), z), mat='M_Metal', color='iron')

def cascade(G, rng, props):
    """Teaching layout: collection -> sedimentation -> filtration -> (reserved disinfection marker) -> basins -> trough -> distribution."""
    ci = CP + 'WATER_Interactables'
    falls = MB()
    for i, (nm, (cx, cy), (sx, sy), h, gravel) in enumerate(BOXES):
        mb = MB()
        wood_box(mb, 0, 0, sx, sy, h, rng)
        if gravel:
            n = 7
            v, f = [], []
            for a in range(n + 1):
                for b in range(n + 1):
                    x = -sx / 2 + 0.08 + (sx - 0.16) * a / n; y = -sy / 2 + 0.08 + (sy - 0.16) * b / n
                    v.append((x, y, h - 0.1 + rng.uniform(-0.025, 0.025)))
            for a in range(n):
                for b in range(n):
                    q = a * (n + 1) + b
                    f.append((q, q + n + 1, q + n + 2, q + 1))
            mb.add((v, f), 'M_Stone', lambda k: col('gravel', 0.15, random.Random(k)), smooth=True)
            for k in range(12):
                su.gen_rock(mb, M((rng.uniform(-sx / 2 + 0.2, sx / 2 - 0.2), rng.uniform(-sy / 2 + 0.2, sy / 2 - 0.2), h - 0.09), (0, 0, rng.uniform(0, 3))), r=rng.uniform(0.04, 0.08), rng=rng, color=rng.choice(['stone', 'stone_light', 'gravel']))
        # spout chute on the downstream (front, -Y) side
        mb.box((0.3, 0.32, 0.05), (0, -sy / 2 - 0.12, h - 0.1), (math.radians(-12), 0, 0), mat='M_Wood', color='wood_light')
        for s in (-1, 1):
            mb.box((0.04, 0.32, 0.1), (s * 0.15, -sy / 2 - 0.12, h - 0.06), (math.radians(-12), 0, 0), mat='M_Wood', color='wood_light')
        o = mb.build(nm, ci, parent=G['Interactables'], loc=(cx, cy, 0))
        stage = {'WATER_Collection': 'collection', 'WATER_Sedimentation': 'sedimentation', 'WATER_FilterStage': 'filtration'}[nm]
        su.tag(o, nm, interactable=True, stage=stage, stage_order=i + 1, educational_label='reserved_for_review')
        wz = h - 0.12 if not gravel else h - 0.06
        water_surface('WATER_Surface_%s' % stage.capitalize(), lambda m_, cx=cx, cy=cy, sx=sx, sy=sy, wz=wz: m_.add(su.prim_box(sx - 0.18, sy - 0.18, 0.01), 'M_Water', 'water', M((cx, cy, wz))), G)
        # fall from spout lip down to the next stage
        lip = Vector((cx, cy - sy / 2 - 0.27, h - 0.13))
        if i < 2:
            nz = BOXES[i + 1][3] - 0.1
            fall_sheet(falls, [lip, lip + Vector((0, -0.08, -0.05)), lip + Vector((0, -0.14, -(lip.z - nz) * 0.6)), Vector((cx, lip.y - 0.17, nz))], 0.26)
        else:
            pz = POTS[0][2] - 0.08
            fall_sheet(falls, [lip, lip + Vector((0, -0.08, -0.05)), lip + Vector((0, -0.12, -(lip.z - pz) * 0.6)), Vector((cx, lip.y - 0.15, pz))], 0.24)
    # clay basins (pots) - second basin carries the reserved disinfection teaching marker
    pots = MB()
    for k, ((px, py), r, h) in enumerate(POTS):
        prof = [(r * 0.6, 0), (r * 0.92, h * 0.25), (r, h * 0.6), (r * 0.94, h * 0.9), (r * 1.02, h), (r * 0.9, h), (r * 0.86, h * 0.85)]
        pots.lathe(prof, 'M_Clay', col('clay_pot', 0.05, rng), M((px, py, 0)), segs=16, cap_top=False)
        water_surface('WATER_Surface_Basin_%02d' % (k + 1), lambda m_, px=px, py=py, r=r, h=h: m_.add(su.prim_cyl(r * 0.88, 0.01, 16), 'M_Water', 'water', M((px, py, h - 0.08))), G, sid='WATER_Surface_Basin')
    (p0, r0, h0), (p1, r1, h1) = POTS
    pots.box((0.2, 0.75, 0.04), ((p0[0] + p1[0]) / 2 + 0.05, (p0[1] + p1[1]) / 2, h0 - 0.02), (0, 0, math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - math.pi / 2), mat='M_Wood', color='wood_light')
    fall_sheet(falls, [(p0[0] + 0.45, p0[1] - 0.05, h0 - 0.04), (p1[0] - 0.4, p1[1] + 0.02, h1 - 0.06)], 0.16)
    o = pots.build('WATER_Basins', CP + 'WATER_Equipment', parent=G['Exterior']); su.tag(o, 'WATER_Basins', stage='clean_basin')
    mk = MB()
    mk.box((0.1, 0.1, 1.2), (0, 0, 0.6), mat='M_Wood', color='timber_mid', bevel=0.015)
    mk.box((0.5, 0.05, 0.36), (0, -0.06, 1.05), mat='M_Wood', color='wood_light', bevel=0.02)
    mk.box((0.4, 0.01, 0.26), (0, -0.09, 1.05), mat='M_Clay', color='chalk')
    o = mk.build('WATER_DisinfectionMarker', ci, parent=G['Interactables'], loc=(-4.35, -2.75, 0))
    su.tag(o, 'WATER_DisinfectionMarker', interactable=True, stage='disinfection', stage_order=4, reserved_teaching_marker=True,
           note='Placeholder only. Gravel filtration alone does not make water safe; content requires educational review.')
    # trough to distribution basin
    tr = MB()
    x0, x1, yt = p1[0] + 0.45, -1.15, -3.85
    tr.box((x0 - x1, 0.32, 0.05), ((x0 + x1) / 2, yt, 0.42), mat='M_Wood', color='wood_light')
    for s in (-1, 1):
        tr.box((x0 - x1, 0.05, 0.2), ((x0 + x1) / 2, yt + s * 0.16, 0.5), mat='M_Wood', color='wood_light')
    for x in (x0 - 0.2, (x0 + x1) / 2, x1 + 0.3):
        tr.box((0.1, 0.4, 0.4), (x, yt, 0.2), mat='M_Wood', color='timber_mid')
    o = tr.build('WATER_Trough', CP + 'WATER_Water_Channels', parent=G['Exterior']); su.tag(o, 'WATER_Trough')
    water_surface('WATER_Surface_Trough', lambda m_: m_.add(su.prim_box(x0 - x1, 0.24, 0.01), 'M_Water', 'water', M(((x0 + x1) / 2, yt, 0.55))), G, target='water_flow')
    fall_sheet(falls, [(p1[0] + 0.3, p1[1] - 0.1, h1 - 0.05), (p1[0] + 0.5, yt, 0.6)], 0.14)
    ds = MB()
    for (a, b, c) in (((-0.55, 0), (1.1, 0.12)), ((0.55, 0), (1.1, 0.12)), ((0, -0.3), (0.12, 0.6)), ((0, 0.3), (0.12, 0.6))) if False else ():
        pass
    ds.box((1.3, 0.75, 0.12), (0, 0, 0.06), mat='M_Stone', color='stone_dark', bevel=0.03)
    for s in (-1, 1):
        ds.box((1.3, 0.14, 0.55), (0, s * 0.31, 0.32), mat='M_Stone', color=col('stone', 0.08, rng), bevel=0.04)
        ds.box((0.14, 0.5, 0.55), (s * 0.58, 0, 0.32), mat='M_Stone', color=col('stone', 0.08, rng), bevel=0.04)
    ds.tube([(0.5, 0.0, 0.6), (0.5, 0.0, 0.95), (0.3, 0.0, 0.95)], 0.035, 'M_Metal', 'copper', 8)
    gen = su.gen_valve_wheel
    gen(ds, M((0.5, 0.0, 0.8), (0, math.pi / 2, 0)), 0.07, 'brass')
    o = ds.build('WATER_Distribution', ci, parent=G['Interactables'], loc=(x1 - 0.45, yt - 0.25, 0))
    su.tag(o, 'WATER_Distribution', interactable=True, stage='distribution', stage_order=6)
    water_surface('WATER_Surface_Distribution', lambda m_: m_.add(su.prim_box(1.0, 0.45, 0.01), 'M_Water', 'water', M((x1 - 0.45, yt - 0.25, 0.48))), G)
    o = falls.build('WATER_Falls', CP + 'WATER_Water_Channels', parent=G['Exterior'])
    su.tag(o, 'WATER_Falls', shader_target='waterfall', flow_axis='uv_v')

def well(G, rng):
    wx, wy = WELL
    w = MB()
    R0, n = 0.82, 12
    for course in range(2):
        for k in range(n):
            a = 2 * math.pi * (k + 0.5 * course) / n
            w.box((2 * math.pi * R0 / n - 0.03, 0.26, 0.36), (math.cos(a) * R0, math.sin(a) * R0, 0.19 + course * 0.37), (0, 0, a + math.pi / 2),
                  mat='M_Stone', color=col('stone', 0.12, rng), bevel=0.05)
    w.add(su.prim_cyl(R0 - 0.12, 0.05, 16), 'M_Stone', 'stone_dark', M((0, 0, 0.02)))
    for s in (-1, 1):
        w.box((0.16, 0.16, 2.3), (s * 0.82, 0, 1.15 + 0.3), mat='M_Wood', color='timber_mid', bevel=0.02)
        BC.beam(w, (s * 0.82, 0, 1.6), (s * 0.82, 0.45, 2.0), 0.08, 0.1, 'timber_mid')
        BC.beam(w, (s * 0.82, 0, 1.6), (s * 0.82, -0.45, 2.0), 0.08, 0.1, 'timber_mid')
    w.box((1.9, 0.14, 0.14), (0, 0, 2.05), mat='M_Wood', color='timber_mid')
    BC.gable_roof(w, rng, -1.05, 1.05, -0.85, 0.85, 1.98, 1.98, 2.65, barge=(0.14, 0.18))
    o = w.build('WATER_Well', CP + 'WATER_Interactables', parent=G['Interactables'], loc=(wx, wy, 0))
    su.tag(o, 'WATER_Well', interactable=True)
    wl = MB()
    wl.add(su.prim_cyl(0.11, 1.5, 10, z0=False), 'M_Wood', 'wood_light', M((0, 0, 0), (0, math.pi / 2, 0)), smooth=True)
    for k in range(4):
        wl.add(su.prim_ring(0.11, 0.135, 0.05, 10), 'M_Fabric', 'rope', M((-0.2 + k * 0.06, 0, 0), (0, math.pi / 2, 0)), smooth=True)
    wl.box((0.05, 0.05, 0.35), (0.95, 0, -0.17), mat='M_Metal', color='iron')
    wl.box((0.3, 0.05, 0.05), (0.8, 0, 0), mat='M_Metal', color='iron')
    wl.add(su.prim_cyl(0.03, 0.18, 8), 'M_Wood', 'timber_dark', M((0.95, 0, -0.34), (0, math.pi / 2, 0)), smooth=True)
    o_w = wl.build('WATER_Well_Windlass', CP + 'WATER_Interactables', parent=o, loc=(0, 0, 1.38))
    su.tag(o_w, 'WATER_Well_Windlass', interactable=True, animation='rotate', pivot_axis='X', parent_id='WATER_Well')
    bk = MB()
    bk.add(su.prim_cyl(0.008, 0.55, 4), 'M_Fabric', 'rope', M((0, 0, 0.27)))
    bk.lathe([(0.0, 0.0), (0.12, 0.0), (0.15, 0.24), (0.13, 0.24), (0.11, 0.03)], 'M_Wood', col('timber_warm'), M((0, 0, -0.03)), segs=10)
    bk.add(su.prim_ring(0.145, 0.16, 0.03, 10), 'M_Metal', 'iron', M((0, 0, 0.18)))
    o_b = bk.build('WATER_Well_Bucket', CP + 'WATER_Interactables', parent=o, loc=(0.25, 0, 0.82))
    su.tag(o_b, 'WATER_Well_Bucket', interactable=True, animation='translate', axis='Z', min_z=0.1, max_z=0.82, parent_id='WATER_Well')
    water_surface('WATER_Surface_Well', lambda m_: m_.add(su.prim_cyl(0.68, 0.01, 16), 'M_Water', 'water', M((wx, wy, 0.35))), G)
def pipes(G, rng):
    pm = MB()
    r = 0.055
    runs = [
        [(-3.42, -2.42, 2.6), (-3.42, -2.42, 0.98), (-0.45, -2.42, 0.98), (-0.45, -2.42, 2.75), (-0.45, -2.12, 2.75)],
        [(2.05, -2.42, 0.1), (2.05, -2.42, 1.15), (3.42, -2.42, 1.15), (3.42, -1.2, 1.15), (3.08, -1.2, 1.15)],
        [(-3.08, 0.9, 2.4), (-4.85, 0.9, 2.4), (-4.85, 0.9, 1.92)],
        [(4.05, 1.9, 6.65), (3.78, 1.9, 6.65), (3.78, 1.9, 2.6), (3.08, 1.9, 2.6)],
        [(-3.08, 0.9, 2.4), (-2.82, 0.9, 2.4), (-2.82, 1.9, 2.4), (0.4, 1.9, 2.4), (0.4, 1.9, 1.5), (2.6, 1.9, 1.5), (2.6, 1.9, 2.6), (3.08, 1.9, 2.6)],
        [(-2.2, 1.2, FZ + 1.5), (-2.2, 1.2, 2.15), (-2.2, 1.9, 2.15), (-2.2, 1.9, 2.4)],
    ]
    for run in runs:
        pm.tube(run, r, 'M_Metal', 'copper', 10)
        for p in run[1:-1]:
            pm.add(su.prim_sphere(r * 1.35, 10, 6), 'M_Metal', 'copper', M(p), smooth=True)
        for p in (run[0], run[-1]):
            pm.add(su.prim_sphere(r * 1.2, 8, 4), 'M_Metal', 'brass', M(p), smooth=True)
    # outlet flare over the collection box
    pm.lathe([(r, 0.0), (r * 1.6, -0.12), (r * 1.3, -0.12)], 'M_Metal', 'brass', M((-4.85, 0.9, 1.92)), segs=10, cap_bottom=False, cap_top=False)
    # static valves (stems + wheels)
    for p, axis in (((-2.2, -2.42, 0.98), 'Z'), ((2.75, -2.42, 1.15), 'Z'), ((-3.95, 0.9, 2.4), 'Z'), ((1.5, 1.9, 1.5), 'Y'), ((-0.9, 1.9, 2.4), 'Y')):
        p = Vector(p)
        if axis == 'Z':
            pm.add(su.prim_cyl(0.022, 0.2, 8), 'M_Metal', 'brass', M(p), smooth=True)
            su.gen_valve_wheel(pm, M(p + Vector((0, 0, 0.2))), 0.12, 'brass')
        else:
            pm.add(su.prim_cyl(0.022, 0.16, 8), 'M_Metal', 'brass', M(p, (math.pi / 2, 0, 0)), smooth=True)
            su.gen_valve_wheel(pm, M(p + Vector((0, -0.16, 0)), (math.pi / 2, 0, 0)), 0.12, 'brass')
    # gauges on the interior manifold
    for (x, z) in ((1.1, 1.85), (-1.6, 2.7)):
        pm.add(su.prim_ring(0.1, 0.13, 0.06, 16), 'M_Metal', 'brass', M((x, 1.86, z), (math.pi / 2, 0, 0)), smooth=True)
        pm.add(su.prim_cyl(0.11, 0.02, 16, z0=False), 'M_Clay', 'meter_face', M((x, 1.85, z), (math.pi / 2, 0, 0)))
        pm.box((0.01, 0.005, 0.08), (x + 0.02, 1.835, z + 0.02), (0, -0.6, 0), mat='M_Clay', color='needle')
        pm.tube([(x, 1.9, z - 0.13), (x, 1.9, z - 0.3)], 0.02, 'M_Metal', 'copper', 6)
    pm.add(su.prim_cyl(0.025, 0.2, 8), 'M_Metal', 'brass', M((-0.45, -2.42, 1.45), (math.pi / 2, 0, 0)), smooth=True)
    o = pm.build('WATER_PipeNetwork', CP + 'WATER_Interactables', parent=G['Interactables'])
    su.tag(o, 'WATER_PipeNetwork', interactable=True, highlight=True)
    vm = MB()
    su.gen_valve_wheel(vm, M(), 0.17, 'brass', spokes=5)
    o = vm.build('WATER_MainValve', CP + 'WATER_Interactables', parent=G['Interactables'], loc=(-0.45, -2.66, 1.45), rot=(math.pi / 2, 0, 0))
    su.tag(o, 'WATER_MainValve', interactable=True, animation='rotate', pivot_axis='local_Z', note='local Z = wall normal (glTF: local Y)', turns_open=2)

def picket_fence(mb, polys, rng, h=1.0, color='wood_weathered'):
    for poly in polys:
        for i in range(len(poly) - 1):
            a, b = Vector(tuple(poly[i]) + (0,)), Vector(tuple(poly[i + 1]) + (0,))
            d = b - a
            ang = math.atan2(d.y, d.x)
            for p in (a, b):
                mb.box((0.13, 0.13, h + 0.12), (p.x, p.y, (h + 0.12) / 2), (0, 0, ang), mat='M_Wood', color=col(color, 0.06, rng), bevel=0.02)
            for z in (0.32, h - 0.18):
                mb.add(su.prim_sweep([a + Vector((0, 0, z)), b + Vector((0, 0, z))], su.rect_profile(0.05, 0.1)), 'M_Wood', col(color, 0.05, rng))
            nrm = Vector((-d.y, d.x, 0)).normalized()
            n = max(1, int(d.length / 0.2))
            for k in range(1, n):
                p = a + d * (k / n) + nrm * 0.05
                hh = h - 0.12 + rng.uniform(-0.04, 0.03)
                mb.box((0.085, 0.025, hh), (p.x, p.y, hh / 2 + 0.05), (0, rng.uniform(-0.03, 0.03), ang), mat='M_Wood', color=col(color, 0.08, rng))

def yard(G, rng, props, plants):
    picket_fence(props, FENCE, rng)
    for (x, y, s) in ((4.25, 0.75, 1.0), (4.95, 0.45, 0.85)):
        su.gen_barrel(props, M((x, y, 0), (0, 0, rng.uniform(0, 3))), h=0.9 * s, r=0.36 * s, rng=rng, open_top=True)
    for (x, y, r, h) in ((5.95, -4.05, 0.3, 0.62), (6.3, -3.45, 0.24, 0.5), (3.7, -4.2, 0.22, 0.45)):
        su.gen_pot(props, M((x, y, 0), (0, 0, rng.uniform(0, 3))), h=h, r=r, rng=rng)
    su.gen_barrel(props, M((5.55, -1.6, 0.22), (math.pi / 2, 0, 0.6)), h=0.45, r=0.2, rng=rng, open_top=True)
    su.gen_barrel(props, M((-5.85, -3.05, 0), (0, 0, 0.3)), h=0.4, r=0.22, rng=rng, open_top=True)
    # raised herb bed behind the building
    props.box((2.6, 0.9, 0.3), (-2.0, 3.25, 0.15), mat='M_Wood', color='timber_mid', bevel=0.03)
    props.box((2.45, 0.75, 0.04), (-2.0, 3.25, 0.31), mat='M_Organic', color='mud')
    for k in range(10):
        x = -3.1 + 2.2 * k / 9
        plants.add(su.prim_ico(rng.uniform(0.14, 0.2), 1), 'M_Organic', rng.choice(['leaf_green', 'leaf_dark', 'leaf_lime']), M((x, 3.25 + rng.uniform(-0.15, 0.15), 0.42), (0, 0, k), (1, 1, 1.3)), smooth=True)
    # shrubs along the walls
    for (x, y) in ((-3.6, -2.75), (3.55, -2.75), (-3.6, 2.6), (6.3, 3.3), (-6.0, 2.9)):
        for k in range(3):
            plants.add(su.prim_ico(rng.uniform(0.22, 0.32), 1), 'M_Organic', rng.choice(['leaf_green', 'leaf_dark']), M((x + rng.uniform(-0.25, 0.25), y + rng.uniform(-0.2, 0.2), 0.18), (0, 0, k), (1, 1, 0.8)), smooth=True)
    for k in range(14):
        x, y = rng.uniform(-6.0, 6.5), rng.uniform(-4.8, 3.8)
        if abs(x) < 3.6 and abs(y) < 2.7:
            continue
        su.gen_rock(props, M((x, y, 0.02), (0, 0, rng.uniform(0, 3))), r=rng.uniform(0.08, 0.2), rng=rng, color='stone_light', flat=0.5)

def interior(G, rng):
    inn = MB()
    lg = MB()
    # wooden filter vat (back-left)
    su.gen_barrel(inn, M((-2.2, 1.2, FZ)), h=1.5, r=0.6, rng=rng)
    inn.box((0.9, 0.9, 0.06), (-2.2, 1.2, FZ + 1.52), mat='M_Wood', color='timber_mid')
    # shelf (left wall, front) with jars and buckets
    for z in (0.45, 1.05, 1.65):
        inn.box((0.4, 1.3, 0.05), (-2.72, -1.25, FZ + z), mat='M_Wood', color='wood_light')
    for s in (-1, 1):
        inn.box((0.4, 0.05, 1.8), (-2.72, -1.25 + s * 0.64, FZ + 0.9), mat='M_Wood', color='timber_mid')
    for k in range(4):
        su.gen_jar(inn, M((-2.72, -1.75 + k * 0.32, FZ + 1.08)), h=0.24, r=0.08, rng=rng, color=rng.choice(['ceramic', 'clay_pot']))
        su.gen_barrel(inn, M((-2.72, -1.7 + k * 0.45, FZ + 0.48)), h=0.3, r=0.13, rng=rng, open_top=True) if k < 3 else None
    # hanging lantern
    inn.add(su.prim_cyl(0.01, 0.8, 4), 'M_Metal', 'iron', M((0.4, 0.0, FZ + 2.6)))
    su.gen_lantern(inn, lg, M((0.4, 0.0, FZ + 2.2)), 1.1)
    # crates near the rear door
    su.gen_crate(inn, M((2.55, 1.55, FZ), (0, 0, 0.1)), rng=rng)
    su.gen_crate(inn, M((2.55, 1.55, FZ + 0.33), (0, 0, -0.15)), rng=rng)
    o = inn.build('WATER_InteriorFitout', CP + 'WATER_Interior', parent=G['Interior']); su.tag(o, 'WATER_InteriorFitout', interior=True)
    o = lg.build('WATER_LanternGlass', CP + 'WATER_Interior', parent=G['Interior']); su.tag(o, 'WATER_LanternGlass', emissive=True)
    # water test station (table with sample jars) - interactable
    ts = MB()
    ts.box((0.75, 1.5, 0.07), (0, 0, 0.86), mat='M_Wood', color='wood_light', bevel=0.015)
    for sx in (-1, 1):
        for sy in (-1, 1):
            ts.box((0.07, 0.07, 0.84), (sx * 0.3, sy * 0.66, 0.42), mat='M_Wood', color='timber_mid')
    ts.box((0.6, 1.3, 0.04), (0, 0, 0.3), mat='M_Wood', color='timber_mid')
    for k, c in enumerate(['mud', 'water', 'water']):
        y = -0.45 + k * 0.4
        ts.lathe([(0.0, 0.0), (0.09, 0.0), (0.1, 0.28), (0.075, 0.3)], 'M_Clay', 'ceramic' if k == 0 else 'white', M((0, y, 0.9)), segs=10, cap_top=False)
        ts.add(su.prim_cyl(0.085, 0.2, 10), 'M_Organic', c, M((0, y, 0.92)), smooth=True)
    ts.box((0.25, 0.3, 0.05), (0.05, 0.62, 0.92), mat='M_Fabric', color='fabric_cream')
    o = ts.build('WATER_TestStation', CP + 'WATER_Interactables', parent=G['Interactables'], loc=(2.5, -0.45, FZ))
    su.tag(o, 'WATER_TestStation', interactable=True, note='sample jars: before/after comparison (educational content TBD)')

def gameplay(G):
    from terrain import collider
    P_ = G['Colliders']
    for side in ('front', 'back', 'left', 'right'):
        mtx, ln = BC.wall_frame(side, W, D, T, FZ)
        BC.wall_colliders('COL_WATER_Wall_%s' % side.capitalize(), mtx, ln, WH + 1.0, T, OPEN[side], P_)
    tx, ty = TOWER
    cl = [('COL_WATER_Floor', (0, 0, FZ - 0.1), (W / 2, D / 2, 0.1)),
          ('COL_WATER_Vat', (-2.2, 1.2, FZ + 0.8), (0.62, 0.62, 0.8)),
          ('COL_WATER_Shelf', (-2.72, -1.25, FZ + 0.95), (0.22, 0.68, 0.95)),
          ('COL_WATER_TestStation', (2.5, -0.45, FZ + 0.45), (0.4, 0.78, 0.45)),
          ('COL_WATER_Crates', (2.55, 1.55, FZ + 0.35), (0.35, 0.3, 0.35)),
          ('COL_WATER_Basin_01', (POTS[0][0][0], POTS[0][0][1], 0.3), (0.56, 0.56, 0.3)),
          ('COL_WATER_Basin_02', (POTS[1][0][0], POTS[1][0][1], 0.3), (0.48, 0.48, 0.3)),
          ('COL_WATER_Trough', (-2.2, -3.85, 0.35), (1.0, 0.2, 0.35)),
          ('COL_WATER_Distribution', (-1.6, -4.1, 0.35), (0.65, 0.38, 0.35)),
          ('COL_WATER_Well', (WELL[0], WELL[1], 0.6), (0.95, 0.95, 0.6)),
          ('COL_WATER_HerbBed', (-2.0, 3.25, 0.2), (1.3, 0.45, 0.2)),
          ('COL_WATER_Barrels', (4.6, 0.6, 0.45), (0.75, 0.45, 0.45))]
    for (nm, (cx, cy), (sx, sy), h, g) in BOXES:
        cl.append(('COL_' + nm, (cx, cy, h / 2), (sx / 2, sy / 2, h / 2)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            cl.append(('COL_WATER_TowerPost_%d%d' % ((sx + 1) // 2, (sy + 1) // 2), (tx + sx * 1.12, ty + sy * 1.12, PLAT_Z / 2), (0.14, 0.14, PLAT_Z / 2)))
    for nm, loc, h in cl:
        collider(nm, loc, (0, 0, 0), h, parent=P_)
    collider('COL_WATER_EntryRamp', (0.85, -D / 2 - 0.35, FZ / 2 - 0.04), (math.atan2(FZ, 0.8), 0, 0), (0.9, 0.45, 0.06), parent=P_)
    collider('COL_WATER_EntryRamp_Rear', (1.55, D / 2 + 0.35, FZ / 2 - 0.04), (-math.atan2(FZ, 0.8), 0, 0), (0.6, 0.45, 0.06), parent=P_)
    k = 0
    for poly in FENCE:
        for i in range(len(poly) - 1):
            a, b = Vector(poly[i]), Vector(poly[i + 1])
            d = b - a
            collider('COL_WATER_Fence_%02d' % k, ((a.x + b.x) / 2, (a.y + b.y) / 2, 0.55), (0, 0, math.atan2(d.y, d.x)), (d.length / 2, 0.07, 0.55), parent=P_)
            k += 1
    Z = G['Zones']
    BC.zone('WATER_InteractionZone_Cascade', Z, (-3.85, -0.45, 0.7), (0.42, 1.9, 0.7), 'treatment_cascade', 'WATER_InteractionZone', targets=['WATER_Collection', 'WATER_Sedimentation', 'WATER_FilterStage'])
    BC.zone('WATER_InteractionZone_Basins', Z, (-3.6, -2.75, 0.7), (0.6, 0.35, 0.7), 'basins_marker', 'WATER_InteractionZone', targets=['WATER_DisinfectionMarker'])
    BC.zone('WATER_InteractionZone_Distribution', Z, (-1.6, -4.65, 0.7), (0.7, 0.3, 0.7), 'distribution', 'WATER_InteractionZone', targets=['WATER_Distribution'])
    BC.zone('WATER_InteractionZone_Valve', Z, (-0.45, -3.25, 0.7), (0.6, 0.5, 0.7), 'main_valve', 'WATER_InteractionZone', targets=['WATER_MainValve', 'WATER_PipeNetwork'])
    BC.zone('WATER_InteractionZone_Well', Z, (WELL[0], WELL[1] - 1.45, 0.7), (0.8, 0.45, 0.7), 'well', 'WATER_InteractionZone', targets=['WATER_Well', 'WATER_Well_Windlass'])
    BC.zone('WATER_InteractionZone_Tank', Z, (tx + 1.95, ty - 0.2, 0.7), (0.45, 0.8, 0.7), 'storage_tank', 'WATER_InteractionZone', targets=['WATER_StorageTank'])
    BC.zone('WATER_InteractionZone_Interior', Z, (0.3, 0.3, FZ + 0.7), (1.2, 1.0, 0.7), 'test_station', 'WATER_InteractionZone', targets=['WATER_TestStation', 'WATER_PipeNetwork'])
    BC.marker('WATER_Entrance', Z, (0.85, -D / 2 - 0.9, 0.0), 0.0, 'entrance', forward_local=[0, 1, 0], door_ids=['WATER_Door_L', 'WATER_Door_R'], clear_width=1.7, clear_height=2.3)
    BC.marker('WATER_Entrance_Rear', Z, (1.55, D / 2 + 0.8, 0.0), math.pi, 'entrance', forward_local=[0, -1, 0], door_ids=['WATER_Door_Back'], clear_width=1.1, clear_height=2.05)
    ci = CP + 'WATER_Interactables'
    for nm, hx, s in (('WATER_Door_L', 0.0, 1), ('WATER_Door_R', 1.7, -1)):
        dm = BC.door_leaf(0.84, 2.28, 0.08, s=s, color='timber_warm', planks=4)
        ob = dm.build(nm, ci, parent=G['Interactables'], loc=(hx, -D / 2 + 0.04, FZ))
        su.tag(ob, 'WATER_Door', instance_id=nm, interactable=True, animation='door', pivot_axis='Z', closed_yaw_deg=0.0, open_yaw_deg=-100.0 * s, initial='closed')
    dm = BC.door_leaf(1.08, 2.03, 0.07, s=1, color='timber_warm', planks=4)
    ob = dm.build('WATER_Door_Back', ci, parent=G['Interactables'], loc=(2.1, D / 2 - 0.04, FZ), rot=(0, 0, math.pi))
    su.tag(ob, 'WATER_Door', instance_id='WATER_Door_Back', interactable=True, animation='door', pivot_axis='Z', closed_yaw_deg=180.0, open_yaw_deg=80.0, initial='closed')