"""expansion.py - v2 village expansion applied INCREMENTALLY on top of the approved v1 scene.

Never calls scene_setup.init_scene / build_all.  Re-running removes only expansion content (EXP_* objects and
collections) before rebuilding it, and the targeted edits to v1 objects (ground-cover trimming, terrain tint, tree
recolour / one tree moved off Road North, water + sky presentation) are deterministic and idempotent."""
import bpy, bmesh, math, random, zlib
from mathutils import Vector, Matrix
import shared_utils as su
from shared_utils import MB, M, col, smoothstep
import layout as L
import terrain as T
import residential as RS

EXP_COLLS = ['VILLAGE_ROOT/10_EXP_RESIDENTIAL', 'VILLAGE_ROOT/11_EXP_FARM', 'VILLAGE_ROOT/12_EXP_VILLAGE_DETAILS',
             'VILLAGE_ROOT/13_EXP_WATER_FX', 'VILLAGE_ROOT/14_EXP_SKY', 'VILLAGE_ROOT/15_EXP_PATHS']
REGION_OF = {'HOUSE_01': 'RearWest', 'HOUSE_02': 'RearWest', 'HOUSE_03': 'RearWest', 'HOUSE_04': 'RearEast', 'HOUSE_05': 'RearEast',
             'HOUSE_06': 'RearEast', 'HOUSE_07': 'WestOuter', 'HOUSE_08': 'Farmstead'}
_st = {}

def seed(s):
    return random.Random(zlib.crc32(s.encode()) & 0xffffffff)

# ----------------------------------------------------------------------------- state
def terrain_state():
    """Rebuild terrain.py's height cache exactly as the v1 ground stage did (pads incl. bridge ends)."""
    T.reset()
    p, ang, W, E = T.bridge_frame(L.MAIN_BRIDGE_Y, 5.8)
    for e in (W, E):
        T.add_pad(e.x, e.y, 1.6, 3.0, 0.1)
    for nm, y in L.FOOT_BRIDGES:
        p, ang, W2, E2 = T.bridge_frame(y, 5.2)
        for e in (W2, E2):
            T.add_pad(e.x, e.y, 1.2, 2.5, 0.22)
    T.grid()
    # sanity: the cache must reproduce the existing terrain mesh
    me = bpy.data.objects['TERRAIN_Ground'].data
    err = max(abs(me.vertices[k].co.z - T.ground(me.vertices[k].co.x, me.vertices[k].co.y)) for k in range(0, len(me.vertices), 97))
    return err

def roots():
    for c in EXP_COLLS:
        su.coll(c)
    r = bpy.data.objects.get('EXP_ROOT') or su.empty('EXP_ROOT', 'VILLAGE_ROOT/10_EXP_RESIDENTIAL', None, (0, 0, 0), (0, 0, 0), 'ARROWS', 2.0)
    su.tag(r, 'EXP_ROOT', expansion='v2', asset_root=True, building='EXPANSION')
    g = {}
    for nm, cl in (('Residential', 0), ('Farm', 1), ('Details', 2), ('WaterFX', 3), ('Sky', 4), ('Paths', 5), ('Colliders', 0), ('Markers', 0)):
        e = bpy.data.objects.get('EXP_%s_Group' % nm) or su.empty('EXP_%s_Group' % nm, EXP_COLLS[cl], r, (0, 0, 0), (0, 0, 0), 'PLAIN_AXES', 0.5)
        su.tag(e, 'EXP_%s_Group' % nm, group=nm.lower())
        g[nm] = e
    return r, g

def clear():
    n = su.remove_hierarchy('EXP_ROOT')
    for c in EXP_COLLS:
        cc = bpy.data.collections.get(c.split('/')[-1])
        if cc:
            for o in list(cc.all_objects):
                me = o.data if o.type == 'MESH' else None
                bpy.data.objects.remove(o, do_unlink=True)
                if me is not None and me.users == 0:
                    bpy.data.meshes.remove(me)
    for o in [o for o in bpy.data.objects if o.name.startswith(('XPROXY_', 'COL_EXP_', 'COL_HOUSE_', 'COL_FARM_'))]:
        bpy.data.objects.remove(o, do_unlink=True)
    return n

# ----------------------------------------------------------------------------- house frames
def house_frame(hid):
    d, var, x, y, yaw = L.HOUSES[hid]
    v = RS.VARIANTS[var]
    fx0, fx1, fy0, fy1 = RS.DESIGN[d]['foot']
    if v['mirror'] and d in ('C', 'D'):
        fx0, fx1 = -fx1, -fx0
    R = Matrix.Rotation(math.radians(yaw), 4, 'Z')
    def world(lx, ly):
        w = R @ Vector((lx, ly, 0))
        return x + w.x, y + w.y
    zs = [T.ground(*world(fx0 + (fx1 - fx0) * i / 4, fy0 + (fy1 - fy0) * j / 4)) for i in range(5) for j in range(5)]
    floor = max(zs) + 0.22
    Mw = Matrix.Translation((x, y, floor)) @ R
    return dict(design=d, var=var, x=x, y=y, yaw=yaw, foot=(fx0, fx1, fy0, fy1), floor=floor, zmin=min(zs), zmax=max(zs), Mw=Mw, world=world,
                gl=lambda lx, ly: T.ground(*world(lx, ly)) - floor)

def blockout():
    """Phase-3 style proxies: footprint boxes + roof wedges, farm outline, gathering disc."""
    for o in [o for o in bpy.data.objects if o.name.startswith('XPROXY_')]:
        bpy.data.objects.remove(o, do_unlink=True)
    for hid in L.HOUSES:
        hf = house_frame(hid)
        fx0, fx1, fy0, fy1 = hf['foot']
        h = RS.DESIGN[hf['design']]['H']
        mb = MB()
        mb.box((fx1 - fx0, fy1 - fy0, h - hf['zmin'] + hf['floor']), ((fx0 + fx1) / 2, (fy0 + fy1) / 2, (h + hf['zmin'] - hf['floor']) / 2), mat='M_Plaster', color='plaster')
        mb.add(su.prim_cyl(1.0, 1.0, 3, caps=(True, True)), 'M_Clay', 'terracotta', M(((fx0 + fx1) / 2, (fy0 + fy1) / 2, h), (0, math.pi / 2, 0), ((fx1 - fx0) / 2, (fy1 - fy0) * 0.62, 1.7)))
        o = mb.build('XPROXY_' + hid, 'VILLAGE_ROOT/10_EXP_RESIDENTIAL')
        o.matrix_world = hf['Mw']
    F = L.FARM
    mb = MB()
    mb.box((F['x1'] - F['x0'], F['y1'] - F['y0'], 0.25), ((F['x0'] + F['x1']) / 2, (F['y0'] + F['y1']) / 2, T.ground((F['x0'] + F['x1']) / 2, (F['y0'] + F['y1']) / 2) + 0.1), mat='M_Soft', color='mud')
    mb.add(su.prim_cyl(2.4, 0.1, 16), 'M_Stone', 'stone_light', M((L.GATHERING[0], L.GATHERING[1], T.ground(*L.GATHERING))))
    mb.build('XPROXY_FarmAndSpots', 'VILLAGE_ROOT/11_EXP_FARM')
    return 'ok'
# ----------------------------------------------------------------------------- houses
def garden(mb, hf, v, info, sd, rng):
    """Front gardens, fences, beds and yard props in house-local space.  Returns collider boxes and the gate line."""
    gl = hf['gl']
    fx0, fx1, fy0, fy1 = hf['foot']
    du, fy = info['door']
    cols = []
    side = v['chimney']
    yfront = min(fy0, fy) - sd
    yf = yfront - 1.7
    block = info.get('front_block', [])
    def spans(a, b):
        out = [(a, b)]
        for (xa, xb) in block:
            nxt = []
            for (p, q) in out:
                if xb <= p or xa >= q:
                    nxt.append((p, q))
                else:
                    if xa > p: nxt.append((p, xa))
                    if xb < q: nxt.append((xb, q))
            out = nxt
        return [(p, q) for (p, q) in out if q - p > 0.6]
    for (a, b) in spans(fx0 + 0.25, du - 0.8) + spans(du + 0.8, fx1 - 0.25):
        RS.flower_bed(mb, a, b, fy - 0.42, gl, rng)
        cols.append((((a + b) / 2, fy - 0.42, gl((a + b) / 2, fy - 0.42) + 0.15), ((b - a) / 2, 0.24, 0.15)))
    if v['garden'] == 'front':
        polys = [[(fx0 - 0.5, fy0 + 0.6), (fx0 - 0.5, yf), (du - 0.85, yf)], [(du + 0.85, yf), (fx1 + 0.5, yf), (fx1 + 0.5, fy0 + 0.6)]]
        for poly in polys:
            for i in range(len(poly) - 1):
                RS.picket(mb, poly[i], poly[i + 1], gl, rng)
                a, b = Vector(poly[i]), Vector(poly[i + 1])
                mid = (a + b) / 2
                cols.append(((mid.x, mid.y, gl(mid.x, mid.y) + 0.5), (abs(b.x - a.x) / 2 + 0.06, abs(b.y - a.y) / 2 + 0.06, 0.5)))
    if v['garden'] == 'veg':
        vx = (fx0 - 1.7) if side > 0 else (fx1 + 1.7)
        RS.veg_bed(mb, vx, (fy0 + fy1) / 2 + 0.3, math.pi / 2, gl, rng)
        cols.append(((vx, (fy0 + fy1) / 2 + 0.3, gl(vx, 0) + 0.2), (0.5, 1.25, 0.2)))
    if v['garden'] == 'boxes':
        for s in (-1, 1):
            su.gen_pot(mb, M((du + s * 0.95, fy - 0.35, gl(du + s * 0.95, fy - 0.35))), h=0.45, r=0.2, rng=rng)
            mb.add(su.prim_ico(0.22, 1), 'M_Soft', 'leaf_green', M((du + s * 0.95, fy - 0.35, gl(du + s * 0.95, fy - 0.35) + 0.55), (0, 0, s), (1, 1, 0.9)), smooth=True)
    ex = v['extra']
    if ex == 'clothesline':
        a, b = (fx0 + 0.3, fy1 + 2.0), (fx1 - 0.3, fy1 + 2.0)
        RS.clothesline(mb, a, b, gl, rng)
        for p in (a, b):
            cols.append(((p[0], p[1], gl(*p) + 1.0), (0.1, 0.1, 1.0)))
    elif ex == 'firewood':
        fxw = (fx1 + 0.5) if side > 0 else (fx0 - 0.5)
        RS.firewood(mb, fxw, fy1 - 1.3, math.pi / 2, gl, rng)
        cols.append(((fxw, fy1 - 1.3, gl(fxw, fy1 - 1.3) + 0.5), (0.3, 0.85, 0.5)))
    elif ex == 'barrels':
        bx = (fx1 + 0.55) if side < 0 else (fx0 - 0.55)
        for k, dy in enumerate((0.2, 0.95)):
            RS.barrel_w(mb, M((bx, fy + 0.4 + dy, gl(bx, fy + 0.4 + dy))), rng)
        su.gen_pot(mb, M((bx, fy + 2.0, gl(bx, fy + 2.0))), h=0.5, r=0.22, rng=rng)
        cols.append(((bx, fy + 1.1, gl(bx, fy + 1.1) + 0.45), (0.4, 1.1, 0.45)))
    elif ex == 'bench':
        bx = (fx0 - 0.7) if side > 0 else (fx1 + 0.7)
        RS.bench(mb, bx, 0.0, math.pi / 2 if side > 0 else -math.pi / 2, gl, rng)
        cols.append(((bx, 0.0, gl(bx, 0) + 0.45), (0.25, 0.8, 0.45)))
    elif ex == 'crates':
        cx_ = fx1 + 0.55
        for k in range(3):
            su.gen_crate(mb, M((cx_, -1.6 + (k % 2) * 0.55, gl(cx_, -1.6) + (0.33 if k == 2 else 0.0)), (0, 0, 0.1 * k)), rng=rng)
        RS.barrel_w(mb, M((cx_, -0.5, gl(cx_, -0.5))), rng)
        cols.append(((cx_, -1.1, gl(cx_, -1.1) + 0.45), (0.4, 0.9, 0.45)))
    return cols, yf

def build_houses(G, region):
    from terrain import collider
    import building_common as BC
    info_all = {}
    for hid in L.HOUSES:
        hf = house_frame(hid)
        d, var = hf['design'], hf['var']
        v = dict(RS.VARIANTS[var])
        rng = seed(hid)
        info = {'zbot': hf['zmin'] - hf['floor'] - 0.3}
        mb = MB()
        RS.BUILDERS[d](mb, v, hf['gl'], rng, info)
        if d == 'C':
            s = -1 if v['mirror'] else 1
            cx2 = s * (RS.DESIGN['C']['W'] / 2 - 1.05)
            info['front_block'] = [(cx2 - 1.6, cx2 + 1.6)]
        du, fy = info['door']
        g_door = hf['gl'](du, fy - 0.45)
        sd, ramps = RS.steps(mb, du, fy, info['door_w'] + 0.5, g_door, rng)
        cols, yf = garden(mb, hf, v, info, sd, rng)
        tri = mb.tri_count()
        region.setdefault(REGION_OF[hid], MB()).merge(mb, hf['Mw'])
        root = su.empty('%s_ROOT' % hid, 'VILLAGE_ROOT/10_EXP_RESIDENTIAL', G['Residential'], (hf['x'], hf['y'], hf['floor']), (0, 0, math.radians(hf['yaw'])), 'ARROWS', 1.2)
        su.tag(root, hid, house_id=hid, design=d, variant=var, enterable=False, interior='none (exterior shell only)', footprint_local=list(hf['foot']),
               floor_z=round(hf['floor'], 3), height=round(info['height'], 2), region_mesh='EXP_Residential_' + REGION_OF[hid], triangles=tri)
        for k, (c, h) in enumerate(info['body']):
            collider('COL_%s_Body_%d' % (hid, k), c, (0, 0, 0), h, parent=root)
        for k, (c, h) in enumerate(info.get('porch_rails', [])):
            collider('COL_%s_PorchRail_%d' % (hid, k), c, (0, 0, 0), h, parent=root)
        for k, (u, yc, zc, hw, hd, drop) in enumerate(ramps):
            a = math.atan2(drop, 2 * hd)
            collider('COL_%s_StepRamp' % hid, (u, yc, zc + 0.02), (a, 0, 0), (hw, hd / math.cos(a), 0.05), parent=root)
        for k, (c, h) in enumerate(cols):
            collider('COL_%s_Yard_%02d' % (hid, k), c, (0, 0, 0), h, parent=root)
        yfront = min(hf['foot'][2], fy) - sd
        if v['garden'] == 'front':
            far2, far = (du, yf - 2.8), (du, yf - 1.4)
        else:
            far2, far = (du, yfront - 2.2), (du, yfront - 1.2)
        near = (du, fy - sd - 0.55)
        BC.marker('%s_Entrance' % hid, root, (near[0], near[1], hf['gl'](*near)), 0.0, 'entrance', sid='%s_Entrance' % hid,
                  forward_local=[0, 1, 0], door_ids=[], enterable=False, note='closed decorative door; no interior in v2')
        info_all[hid] = dict(far2=hf['world'](*far2), far=hf['world'](*far), near=hf['world'](*near), tri=tri, steps_depth=sd, floor=hf['floor'], hf=hf, foot=hf['foot'], yf=yf)
    return info_all

# ----------------------------------------------------------------------------- paths
def resolve_paths(houses):
    out = []
    for name, w, ctrl in L.EXP_PATHS:
        pts = []
        for c in ctrl:
            if isinstance(c, str) and c.startswith('H:'):
                h = houses[c[2:]]
                pts += [h['far2'], h['far'], h['near']]
            else:
                pts.append(c)
        out.append((name, w, pts))
    return out

def build_paths(G, pdefs):
    mb = MB()
    rng = seed('paths')
    polys = []
    for name, w, ctrl in pdefs:
        pts = su.catmull([Vector((p[0], p[1], 0)) for p in ctrl], 0.5)
        polys.append((name, w, pts))
        across = 5
        v, f = [], []
        for i, p in enumerate(pts):
            t_ = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])
            t_ = t_.normalized() if t_.length > 1e-6 else Vector((1, 0, 0))
            nrm = Vector((-t_.y, t_.x, 0))
            wl = w * 0.5 * (1 + 0.12 * math.sin(p.x * 1.7 + p.y * 0.9))
            wr = w * 0.5 * (1 + 0.12 * math.sin(p.x * 0.8 - p.y * 1.9))
            for k, s in enumerate((-wl, -wl * 0.5, 0.0, wr * 0.5, wr)):
                q = p + nrm * s
                v.append((q.x, q.y, T.ground(q.x, q.y) + (0.035 if k in (0, 4) else 0.065)))
        for i in range(len(pts) - 1):
            for k in range(across - 1):
                a = i * across + k
                f.append((a, a + 1, a + across + 1, a + across))
        mb.add((v, f), 'M_Terrain', lambda k: col('path' if (k % 4) in (1, 2) else 'dirt', 0.06, rng), smooth=True, flip=True)
    o = mb.build('EXP_Paths', 'VILLAGE_ROOT/15_EXP_PATHS', parent=G['Paths'])
    su.tag(o, 'EXP_Paths', walkable=True, cast_shadow=False)
    bpy.app.driver_namespace['expansion_paths'] = polys
    return polys

# ----------------------------------------------------------------------------- targeted edits to v1 ground dressing
def masks(houses, polys):
    rects = []
    for hid, h in houses.items():
        hf = h['hf']
        fx0, fx1, fy0, fy1 = h['foot']
        rects.append((hf, (fx0 - 0.8, fx1 + 0.8, h['yf'] - 0.2, fy1 + 2.4)))
    circles = [(L.GATHERING[0], L.GATHERING[1], 2.7), (L.COMMUNITY_GARDEN[0], L.COMMUNITY_GARDEN[1], 3.2)]
    F = L.FARM
    boxes = [(F['x0'] - 0.3, F['x1'] + 0.3, F['y0'] - 0.3, F['y1'] + 0.3)]
    from mathutils import kdtree
    pp = [(p, w) for n, w, pts in polys for p in pts]
    kd = kdtree.KDTree(len(pp))
    for i, (p, w) in enumerate(pp):
        kd.insert((p.x, p.y, 0.0), i)
    kd.balance()
    def inside(x, y):
        for (x0, x1, y0, y1) in boxes:
            if x0 <= x <= x1 and y0 <= y <= y1:
                return True
        for (cx, cy, r) in circles:
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                return True
        for hf, (a0, a1, b0, b1) in rects:
            c, s = math.cos(-math.radians(hf['yaw'])), math.sin(-math.radians(hf['yaw']))
            lx = (x - hf['x']) * c - (y - hf['y']) * s; ly = (x - hf['x']) * s + (y - hf['y']) * c
            if a0 <= lx <= a1 and b0 <= ly <= b1:
                return True
        for (co, i, d) in kd.find_range((x, y, 0.0), 1.5):
            if d <= pp[i][1] / 2 + 0.35:
                return True
        return False
    return inside

def trim_components(ob, inside, only_mat=None, max_size=2.5):
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    mats = [m.name for m in me.materials]
    seen, kill = set(), []
    for f in bm.faces:
        if f.index in seen:
            continue
        stack, comp = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop(); comp.append(g)
            for vv in g.verts:
                for h in vv.link_faces:
                    if h.index not in seen:
                        seen.add(h.index); stack.append(h)
        if only_mat and mats[comp[0].material_index] != only_mat:
            continue
        vs = {vv for g in comp for vv in g.verts}
        xs = [vv.co.x for vv in vs]; ys = [vv.co.y for vv in vs]
        if max(xs) - min(xs) > max_size or max(ys) - min(ys) > max_size:
            continue
        if inside(sum(xs) / len(xs), sum(ys) / len(ys)):
            kill += comp
    removed = len(kill)
    if kill:
        bmesh.ops.delete(bm, geom=list(set(kill)), context='FACES')
    bm.to_mesh(me); bm.free()
    me.update()
    return removed

def trim_ground_dressing(inside):
    out = {}
    for o in bpy.data.objects:
        if o.name.startswith('VEG_GroundCover'):
            out[o.name] = trim_components(o, inside)
    o = bpy.data.objects.get('ENV_VillageProps')
    if o:
        out['ENV_VillageProps(rocks)'] = trim_components(o, inside, only_mat='M_Stone', max_size=1.6)
    return out

def tint_terrain(polys):
    """Idempotent: always tints from the pristine v1 colours kept in 'Col_v1' (not exported)."""
    from mathutils import kdtree
    me = bpy.data.objects['TERRAIN_Ground'].data
    ca = me.color_attributes['Col']
    if 'Col_v1' not in me.color_attributes:
        cv = me.color_attributes.new('Col_v1', 'FLOAT_COLOR', 'POINT')
        buf = [0.0] * (len(me.vertices) * 4)
        ca.data.foreach_get('color', buf)
        cv.data.foreach_set('color', buf)
    me.color_attributes.active_color = ca
    me.color_attributes.render_color_index = list(me.color_attributes).index(ca)
    src = me.color_attributes['Col_v1']
    pp = [(p, w) for n, w, pts in polys for p in pts]
    kd = kdtree.KDTree(len(pp))
    for i, (p, w) in enumerate(pp):
        kd.insert((p.x, p.y, 0.0), i)
    kd.balance()
    F = L.FARM
    n = 0
    for i, vtx in enumerate(me.vertices):
        x, y = vtx.co.x, vtx.co.y
        if not (-45 < x < 45 and -20 < y < 60):
            continue
        c = list(src.data[i].color)
        ca.data[i].color = tuple(c)
        best = 9.0
        for (co, j, d) in kd.find_range((x, y, 0.0), 3.0):
            best = min(best, d - pp[j][1] / 2)
        k = (1.0 - smoothstep(-0.2, 0.9, best)) * 0.6
        if F['x0'] - 0.6 < x < F['x1'] + 0.6 and F['y0'] - 0.6 < y < F['y1'] + 0.6:
            k = max(k, 0.55)
        g = math.hypot(x - L.GATHERING[0], y - L.GATHERING[1])
        k = max(k, (1.0 - smoothstep(1.8, 3.0, g)) * 0.5)
        if k > 0.01:
            dc = su.PAL['dirt'] if not (F['x0'] - 0.6 < x < F['x1'] + 0.6 and F['y0'] - 0.6 < y < F['y1'] + 0.6) else su.PAL['mud']
            ca.data[i].color = tuple(c[j] + (dc[j] - c[j]) * k for j in range(3)) + (1.0,)
            n += 1
    me.update()
    return n
# ----------------------------------------------------------------------------- orchestration
REGION_MATS_NOTE = 'region meshes merge static homes + yards + nearby details by material (5-6 primitives each)'

def run(stages=('residential', 'farm', 'details', 'foliage', 'water', 'sky')):
    import importlib
    out = {'terrain_cache_err': terrain_state()}
    for o in [o for o in bpy.data.objects if o.name.startswith('XPROXY_')]:
        bpy.data.objects.remove(o, do_unlink=True)
    out['cleared'] = clear()
    r, G = roots()
    region = {}
    houses = build_houses(G, region)
    out['houses'] = {h: {'tris': v['tri'], 'floor': round(v['floor'], 2)} for h, v in houses.items()}
    pdefs = resolve_paths(houses) + [(f[0], f[1], f[2]) for f in L.V1_PATH_FIXES]
    polys = build_paths(G, pdefs)
    out['v1_path_repairs'] = repair_v1_paths(polys)
    if 'farm' in stages:
        import farm
        importlib.reload(farm)
        out['farm'] = farm.build(G, region)
    if 'details' in stages:
        import village_details as VD
        importlib.reload(VD)
        out['details'] = VD.build(G, region, houses)
    if 'water' in stages:
        import water_fx
        importlib.reload(water_fx)
        out['water'] = water_fx.run(G, region)
    for name, mb in region.items():
        o = mb.build('EXP_Residential_' + name if name != 'Farmstead' else 'EXP_Farmstead', 'VILLAGE_ROOT/10_EXP_RESIDENTIAL' if name != 'Farmstead' else 'VILLAGE_ROOT/11_EXP_FARM',
                     parent=G['Residential'] if name != 'Farmstead' else G['Farm'])
        su.tag(o, o.name, static=True, chunk=True, note=REGION_MATS_NOTE)
        out.setdefault('regions', {})[o.name] = {'tris': mb.tri_count(), 'materials': list(mb.mats)}
    inside = masks(houses, polys + bpy.app.driver_namespace.get('expansion_extra_masks', []))
    out['trimmed_components'] = trim_ground_dressing(inside)
    out['terrain_tinted_verts'] = tint_terrain(polys)
    if 'foliage' in stages:
        import foliage
        importlib.reload(foliage)
        out['foliage'] = foliage.run()
    if 'sky' in stages:
        import sky
        importlib.reload(sky)
        out['sky'] = sky.run(G)
    return out
def export_kit(path):
    """Standalone residential kit: one representative of each design on flat ground, each at its own root origin."""
    import export_assets as EX
    cname = 'KIT_EXPORT_TMP'
    coll = bpy.data.collections.get(cname) or bpy.data.collections.new(cname)
    if coll.name not in [c.name for c in bpy.context.scene.collection.children]:
        bpy.context.scene.collection.children.link(coll)
    objs, info_out = [], {}
    for k, (d, var) in enumerate((('A', 'a1'), ('B', 'b1'), ('C', 'c1'), ('D', 'd1'))):
        v = dict(RS.VARIANTS[var])
        rng = seed('kit' + var)
        info = {'zbot': -0.55}
        mb = MB()
        RS.BUILDERS[d](mb, v, lambda lx, ly: -0.22, rng, info)
        du, fy = info['door']
        RS.steps(mb, du, fy, info['door_w'] + 0.5, -0.22, rng)
        root = su.empty('KIT_HOUSE_%s_ROOT' % d, coll, None, (k * 15.0, 0.0, 0.22), (0, 0, 0), 'ARROWS', 1.0)
        su.tag(root, 'KIT_HOUSE_%s' % d, design=d, variant=var, floor_above_ground=0.22, front='-Y (glTF +Z)', footprint_local=list(RS.DESIGN[d]['foot']), asset_root=True)
        o = mb.build('KIT_HOUSE_%s_Mesh' % d, coll, parent=root)
        su.tag(o, 'KIT_HOUSE_%s_Mesh' % d, triangles=mb.tri_count())
        objs += [root, o]
        info_out[d] = mb.tri_count()
    size = EX._export(path, objs)
    for o in objs:
        me = o.data if o.type == 'MESH' else None
        bpy.data.objects.remove(o, do_unlink=True)
        if me is not None and me.users == 0:
            bpy.data.meshes.remove(me)
    bpy.data.collections.remove(coll)
    return {'bytes': size, 'tris': info_out}
def repair_v1_paths(new_polys):
    """Targeted v1 path repair: delete only the blocked ribbon faces/stepping stones of the listed v1 segments from
    TERRAIN_Paths (faces shared with another kept path are preserved) and trim the v1 navigation polylines.
    Idempotent (geometry and polylines are cut by position)."""
    from mathutils import kdtree
    vp = bpy.app.driver_namespace.get('village_paths') or []
    ob = bpy.data.objects.get('TERRAIN_Paths')
    out = {}
    for (fname, w, ctrl, v1name, cut_y) in L.V1_PATH_FIXES:
        old = [(n, ww, pts) for (n, ww, pts) in vp if n == v1name]
        if not old:
            continue
        n_, ww, pts = old[0]
        cut = [p for p in pts if p.y < cut_y + 0.3]
        keep_other = [(p, w2) for (n2, w2, p2) in vp if n2 != v1name for p in p2] + [(p, w2) for (n2, w2, p2) in vp if n2 == v1name for p in p2 if p.y >= cut_y + 0.3]
        kd = kdtree.KDTree(max(1, len(keep_other)))
        for i, (p, w2) in enumerate(keep_other):
            kd.insert((p.x, p.y, 0), i)
        kd.balance()
        kc = kdtree.KDTree(max(1, len(cut)))
        for i, p in enumerate(cut):
            kc.insert((p.x, p.y, 0), i)
        kc.balance()
        def in_cut(x, y):
            if not cut:
                return False
            co, i, d = kc.find((x, y, 0))
            if d > ww / 2 + 0.25:
                return False
            for (co2, j, d2) in kd.find_range((x, y, 0), 2.0):
                if d2 < keep_other[j][1] / 2 - 0.05:
                    return False
            return True
        removed = trim_components(ob, in_cut, max_size=1.2) if ob else 0
        # per-face pass for the ribbon (ribbon quads are connected along the whole path, so components are too big)
        if ob:
            me = ob.data
            bm = bmesh.new(); bm.from_mesh(me)
            kill = [f for f in bm.faces if in_cut(f.calc_center_median().x, f.calc_center_median().y)]
            if kill:
                bmesh.ops.delete(bm, geom=kill, context='FACES')
            bm.to_mesh(me); bm.free(); me.update()
            removed += len(kill)
        out[v1name] = {'faces_removed': removed, 'replaced_by': fname}
    # trim v1 navigation polylines (by position -> idempotent)
    nv = []
    for (n, ww, pts) in vp:
        fx = [f for f in L.V1_PATH_FIXES if f[3] == n]
        nv.append((n, ww, [p for p in pts if p.y >= fx[0][4]] if fx else pts))
    bpy.app.driver_namespace['village_paths'] = nv
    return out