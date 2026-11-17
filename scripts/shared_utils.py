"""shared_utils.py - reusable procedural modelling helpers for the educational village.

Conventions
-----------
* Blender units = metres, Z up.  Building-local space: front faces -Y, origin at ground centre of footprint.
* All geometry is accumulated in MeshBuilder objects so that static parts share few objects / material slots
  (fewer draw calls).  Interactive parts are built as their own objects with sensible pivots.
* Colour comes from per-face vertex colours (linear FLOAT_COLOR attribute "Col"); materials define surface class
  (roughness/metal/emission/texture detail).  glTF exports this as COLOR_0 * baseColor(Texture).
* All randomness uses seeded random.Random instances -> deterministic rebuilds.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def P(*parts):
    return os.path.join(ROOT, *parts)

# ----------------------------------------------------------------------------- colour
def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)

PAL_HEX = {
    'white': '#ffffff', 'brick': '#ffffff',
    'plaster': '#f1e6cc', 'plaster_white': '#efebe0', 'plaster_in': '#e6d8bb',
    'timber_dark': '#5b3b24', 'timber_mid': '#7d5232', 'timber_gold': '#e0a63c', 'timber_warm': '#9c6538',
    'wood_light': '#bd8d5a', 'wood_weathered': '#cfc3ac', 'wood_floor': '#a36d3f', 'bark': '#6b4a30',
    'terracotta': '#cc6a3e', 'terracotta_dark': '#ad5233', 'terracotta_light': '#d9804f', 'clay_pot': '#b8744b',
    'slate': '#5f6875', 'slate_dark': '#4d5561', 'slate_light': '#7a838f',
    'stone': '#a39e94', 'stone_dark': '#848077', 'stone_light': '#bdb8ad', 'gravel': '#9d958a',
    'copper': '#c47b45', 'brass': '#d8ac48', 'iron': '#2f2d2c', 'iron_rust': '#5a4234',
    'fabric_red': '#cc4a3e', 'fabric_cream': '#f3e7cd', 'stripe_green': '#86ad6e', 'stripe_blue': '#6e97bd',
    'beige_canvas': '#d9c08c', 'burlap': '#cdac7b', 'burlap_dark': '#a98758', 'rope': '#b89a6a',
    'leaf_green': '#72aa48', 'leaf_dark': '#55903c', 'leaf_lime': '#9cc455', 'leaf_yellow': '#e3b437',
    'leaf_orange': '#da8c2e', 'pine': '#3f6d48', 'pine_dark': '#30573a',
    'grass': '#7db14c', 'grass_dark': '#5f9a3e', 'dirt': '#b38a5a', 'path': '#c6a372', 'mud': '#8a6a46',
    'carrot': '#ea7428', 'tomato': '#d93a28', 'cabbage': '#a9d27a', 'cauli': '#f0ead2', 'potato': '#b88b55',
    'onion': '#ecdfc2', 'lemon': '#f2d23a', 'apple': '#8fc24a', 'orange': '#f09a2a', 'eggplant': '#6b3a7a',
    'lentil': '#8a5a34', 'rice': '#f1ead8', 'chalk': '#2c3832', 'chalk_text': '#f4f0e4', 'ceramic': '#efebe2',
    'glass': '#ffd77a', 'water': '#5fa6c8', 'foam': '#e8f6ff', 'flower_pink': '#e889a8', 'flower_white': '#f6f3ea',
    'flower_blue': '#7fa2e0', 'flower_yellow': '#f2d14a', 'flower_purple': '#a77ad0', 'red_flag': '#d9483b',
    'yellow_flag': '#efc443', 'green_flag': '#7cb35a', 'blue_flag': '#5b8fd0', 'orange_flag': '#e98a3a',
    'mountain': '#8aa3bf', 'hill_far': '#86a85e', 'meter_face': '#f4ecd6', 'needle': '#b8322a',
}
PAL = {k: srgb(v) for k, v in PAL_HEX.items()}

def col(name, var=0.0, rng=None, mul=1.0):
    """Palette colour with optional deterministic brightness variation."""
    c = PAL[name] if isinstance(name, str) else name
    f = mul
    if var and rng is not None:
        f *= 1.0 + rng.uniform(-var, var)
    return (min(c[0] * f, 1.0), min(c[1] * f, 1.0), min(c[2] * f, 1.0), 1.0)

def lerpc(a, b, t):
    a = PAL[a] if isinstance(a, str) else a
    b = PAL[b] if isinstance(b, str) else b
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3)) + (1.0,)

# ----------------------------------------------------------------------------- math
def M(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    if not isinstance(scale, (tuple, list, Vector)):
        scale = (scale, scale, scale)
    return Matrix.LocRotScale(Vector(loc), Euler(rot).to_quaternion(), Vector(scale))

def smoothstep(a, b, x):
    if a == b:
        return 0.0 if x < a else 1.0
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

def frame_from_dir(d, up=Vector((0, 0, 1))):
    d = Vector(d).normalized()
    if abs(d.dot(up)) > 0.98:
        up = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
    x = up.cross(d).normalized()
    y = d.cross(x).normalized()
    return x, y, d

def catmull(points, step=0.5):
    """Centripetal-ish Catmull-Rom resampling of a 2D/3D polyline at ~step spacing."""
    pts = [Vector(p) for p in points]
    if len(pts) < 2:
        return pts
    ext = [pts[0] + (pts[0] - pts[1])] + pts + [pts[-1] + (pts[-1] - pts[-2])]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        n = max(2, int((p2 - p1).length / step))
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1].copy())
    return out

def catenary(p0, p1, sag, n=12):
    p0, p1 = Vector(p0), Vector(p1)
    return [p0.lerp(p1, i / n) - Vector((0, 0, sag * 4 * (i / n) * (1 - i / n))) for i in range(n + 1)]

# ----------------------------------------------------------------------------- primitives (verts, faces)
def prim_box(sx, sy, sz, z0=False):
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    oz = hz if z0 else 0.0
    v = [(-hx, -hy, -hz + oz), (hx, -hy, -hz + oz), (hx, hy, -hz + oz), (-hx, hy, -hz + oz),
         (-hx, -hy, hz + oz), (hx, -hy, hz + oz), (hx, hy, hz + oz), (-hx, hy, hz + oz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return v, f

_bevel_cache = {}
def prim_bbox(sx, sy, sz, b=0.03, z0=False):
    """Box with a single-segment chamfer (modest bevel)."""
    key = (round(sx, 4), round(sy, 4), round(sz, 4), round(b, 4), z0)
    if key in _bevel_cache:
        return _bevel_cache[key]
    b = min(b, sx * 0.45, sy * 0.45, sz * 0.45)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
        if z0:
            v.co.z += sz / 2
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=b, segments=1, affect='EDGES', profile=0.5)
    v = [tuple(x.co) for x in bm.verts]
    bm.verts.index_update()
    f = [tuple(x.index for x in face.verts) for face in bm.faces]
    bm.free()
    _bevel_cache[key] = (v, f)
    return v, f

def prim_cyl(r, h, segs=12, r2=None, caps=(True, True), z0=True):
    r2 = r if r2 is None else r2
    zb = 0.0 if z0 else -h / 2
    v, f = [], []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        v.append((r * math.cos(a), r * math.sin(a), zb))
    for i in range(segs):
        a = 2 * math.pi * i / segs
        v.append((r2 * math.cos(a), r2 * math.sin(a), zb + h))
    for i in range(segs):
        j = (i + 1) % segs
        f.append((i, j, segs + j, segs + i))
    if caps[0]:
        f.append(tuple(reversed(range(segs))))
    if caps[1]:
        f.append(tuple(range(segs, 2 * segs)))
    return v, f

def prim_lathe(profile, segs=12, cap_bottom=True, cap_top=True, closed=False, a0=0.0, arc=2 * math.pi):
    """profile: [(r, z), ...] bottom->top.  Revolves around Z."""
    full = abs(arc - 2 * math.pi) < 1e-6
    n = len(profile)
    cols = segs if full else segs + 1
    v, f = [], []
    for i in range(cols):
        a = a0 + arc * i / segs
        ca, sa = math.cos(a), math.sin(a)
        for (r, z) in profile:
            v.append((r * ca, r * sa, z))
    rng_k = n if closed else n - 1
    for i in range(segs):
        i2 = (i + 1) % cols if full else i + 1
        for k in range(rng_k):
            k2 = (k + 1) % n
            f.append((i * n + k, i2 * n + k, i2 * n + k2, i * n + k2))
    if full and not closed:
        if cap_bottom and profile[0][0] > 1e-5:
            f.append(tuple(reversed([i * n for i in range(segs)])))
        if cap_top and profile[-1][0] > 1e-5:
            f.append(tuple(i * n + n - 1 for i in range(segs)))
    return v, f

def prim_sphere(r, segs=8, rings=6, sz=1.0):
    prof = []
    for k in range(rings + 1):
        a = -math.pi / 2 + math.pi * k / rings
        prof.append((max(r * math.cos(a), 0.0), r * math.sin(a) * sz))
    v, f = prim_lathe(prof, segs, cap_bottom=False, cap_top=False)
    return _weld(v, f)

def prim_ico(r, subdiv=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    v = [tuple(x.co) for x in bm.verts]
    bm.verts.index_update()
    f = [tuple(x.index for x in face.verts) for face in bm.faces]
    bm.free()
    return v, f

def _weld(v, f, eps=1e-6):
    keymap, nv, remap = {}, [], []
    for p in v:
        k = (round(p[0] / eps), round(p[1] / eps), round(p[2] / eps)) if eps else p
        k = (round(p[0], 5), round(p[1], 5), round(p[2], 5))
        if k not in keymap:
            keymap[k] = len(nv); nv.append(p)
        remap.append(keymap[k])
    nf = []
    for face in f:
        g = []
        for i in face:
            j = remap[i]
            if not g or g[-1] != j:
                g.append(j)
        if len(g) > 2 and g[0] == g[-1]:
            g.pop()
        if len(set(g)) >= 3:
            nf.append(tuple(g))
    return nv, nf

def prim_sweep(points, profile, closed_profile=True, caps=True, up=None, twist_up=True):
    """Sweep a 2D profile [(x,y)...] along a 3D polyline.  Uses parallel-transport frames."""
    pts = [Vector(p) for p in points]
    n = len(pts)
    tans = []
    for i in range(n):
        if i == 0: t = pts[1] - pts[0]
        elif i == n - 1: t = pts[-1] - pts[-2]
        else: t = (pts[i + 1] - pts[i - 1])
        tans.append(t.normalized())
    up0 = Vector(up) if up else Vector((0, 0, 1))
    x, y, _ = frame_from_dir(tans[0], up0)
    frames = [(x, y)]
    for i in range(1, n):
        if up is not None and not twist_up:
            x, y, _ = frame_from_dir(tans[i], up0)
        else:
            rot = tans[i - 1].rotation_difference(tans[i])
            x = (rot @ x).normalized(); y = (rot @ y).normalized()
        frames.append((x, y))
    m = len(profile)
    v, f = [], []
    for i in range(n):
        x, y = frames[i]
        # true miter: stretch only along the bend direction inside the profile plane
        k, s = None, 1.0
        if 0 < i < n - 1:
            d0 = (pts[i] - pts[i - 1]).normalized(); d1 = (pts[i + 1] - pts[i]).normalized()
            s = 1.0 / max(tans[i].dot(d1), 0.5)
            k = d1 - d0
            k = k - tans[i] * k.dot(tans[i])
            if k.length < 1e-6:
                k = None
            else:
                k.normalize()
        for (px, py) in profile:
            off = x * px + y * py
            if k is not None:
                off = off + k * off.dot(k) * (s - 1.0)
            v.append(tuple(pts[i] + off))
    kmax = m if closed_profile else m - 1
    for i in range(n - 1):
        for k in range(kmax):
            k2 = (k + 1) % m
            f.append((i * m + k, i * m + k2, (i + 1) * m + k2, (i + 1) * m + k))
    if caps and closed_profile:
        f.append(tuple(reversed(range(m))))
        f.append(tuple((n - 1) * m + k for k in range(m)))
    return v, f

def circle_profile(r, segs=8):
    return [(r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs)) for i in range(segs)]

def rect_profile(w, h):
    return [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]

def prim_tube(points, r, segs=8, caps=True):
    return prim_sweep(points, circle_profile(r, segs), caps=caps)

def prim_ring(r_in, r_out, h, segs=16):
    prof = [(r_in, -h / 2), (r_out, -h / 2), (r_out, h / 2), (r_in, h / 2)]
    return prim_lathe(prof, segs, closed=True)

# ----------------------------------------------------------------------------- MeshBuilder
class MB:
    """Accumulates geometry with per-face material, colour, smooth flag and optional UVs."""
    def __init__(self, uv_scale=1.0):
        self.verts, self.faces = [], []
        self.fmat, self.fcol, self.fsmooth, self.fuv = [], [], [], []
        self.mats = []
        self.uv_scale = uv_scale

    def add(self, vf, mat, color, matrix=None, smooth=False, uvs=None, flip=False):
        verts, faces = vf
        base = len(self.verts)
        if matrix is not None:
            mx = matrix
            self.verts.extend(tuple(mx @ Vector(p)) for p in verts)
        else:
            self.verts.extend(tuple(p) for p in verts)
        if mat not in self.mats:
            self.mats.append(mat)
        mi = self.mats.index(mat)
        for k, fc in enumerate(faces):
            fc2 = tuple(base + i for i in (reversed(fc) if flip else fc))
            self.faces.append(fc2)
            self.fmat.append(mi)
            c = color(k) if callable(color) else color
            self.fcol.append(PAL[c] if isinstance(c, str) else c)
            self.fsmooth.append(smooth)
            self.fuv.append(uvs[k] if uvs is not None else None)
        return self

    def box(self, size, loc=(0, 0, 0), rot=(0, 0, 0), mat='M_Wood', color='timber_dark', bevel=0.0, z0=False, matrix=None):
        vf = prim_bbox(*size, b=bevel, z0=z0) if bevel > 0 else prim_box(*size, z0=z0)
        m = (matrix @ M(loc, rot)) if matrix is not None else M(loc, rot)
        return self.add(vf, mat, color, m)

    def cyl(self, r, h, loc=(0, 0, 0), rot=(0, 0, 0), mat='M_Wood', color='timber_dark', segs=12, r2=None, caps=(True, True), smooth=True, matrix=None, z0=True):
        m = (matrix @ M(loc, rot)) if matrix is not None else M(loc, rot)
        vf = prim_cyl(r, h, segs, r2, caps, z0)
        verts, faces = vf
        # side faces smooth, caps flat
        nside = segs
        self.add((verts, faces[:nside]), mat, color, m, smooth=smooth)
        if len(faces) > nside:
            base_v = verts
            self.add((base_v, faces[nside:]), mat, color, m, smooth=False)
        return self

    def tube(self, points, r, mat='M_Metal', color='copper', segs=8, caps=True, matrix=None):
        return self.add(prim_tube(points, r, segs, caps), mat, color, matrix, smooth=True)

    def sweep(self, points, profile, mat='M_Wood', color='timber_dark', matrix=None, smooth=False, caps=True):
        return self.add(prim_sweep(points, profile, caps=caps), mat, color, matrix, smooth=smooth)

    def lathe(self, profile, mat, color, matrix=None, segs=12, smooth=True, **kw):
        return self.add(prim_lathe(profile, segs, **kw), mat, color, matrix, smooth=smooth)

    def merge(self, other, matrix=None):
        for i, fc in enumerate(other.faces):
            pass
        base = len(self.verts)
        if matrix is None:
            self.verts.extend(other.verts)
        else:
            self.verts.extend(tuple(matrix @ Vector(p)) for p in other.verts)
        for k, fc in enumerate(other.faces):
            mname = other.mats[other.fmat[k]]
            if mname not in self.mats:
                self.mats.append(mname)
            self.faces.append(tuple(base + i for i in fc))
            self.fmat.append(self.mats.index(mname))
            self.fcol.append(other.fcol[k]); self.fsmooth.append(other.fsmooth[k]); self.fuv.append(other.fuv[k])
        return self

    def tri_count(self):
        return sum(len(f) - 2 for f in self.faces)

    def build(self, name, collection, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), props=None, origin=None):
        """Create the object. `origin` (local coords) shifts mesh so the object pivot sits there."""
        if not self.faces:
            return None
        verts = self.verts
        if origin is not None:
            o = Vector(origin)
            verts = [tuple(Vector(v) - o) for v in verts]
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], self.faces)
        me.validate(clean_customdata=False)
        npoly = len(me.polygons)
        if npoly != len(self.faces):
            print('WARN validate changed faces', name, npoly, len(self.faces))
        for mname in self.mats:
            me.materials.append(get_mat(mname))
        fm = self.fmat[:npoly]
        me.polygons.foreach_set('material_index', fm)
        me.polygons.foreach_set('use_smooth', self.fsmooth[:npoly])
        # colours (corner domain)
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        cols = []
        for p in me.polygons:
            c = self.fcol[p.index]
            for _ in range(p.loop_total):
                cols.extend(c)
        ca.data.foreach_set('color', cols)
        me.color_attributes.active_color = ca
        me.color_attributes.render_color_index = 0
        # UVs: explicit or box projection
        uvl = me.uv_layers.new(name='UVMap')
        s = 1.0 / self.uv_scale
        vco = me.vertices
        uvs = []
        for p in me.polygons:
            ex = self.fuv[p.index]
            if ex is not None:
                uvs.extend(c for uv in ex for c in uv)
                continue
            n = p.normal
            ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
            for li in p.loop_indices:
                co = vco[me.loops[li].vertex_index].co
                if az >= ax and az >= ay:
                    uvs.extend((co.x * s, co.y * s))
                elif ax >= ay:
                    uvs.extend((co.y * s, co.z * s))
                else:
                    uvs.extend((co.x * s, co.z * s))
        uvl.data.foreach_set('uv', uvs)
        ob = bpy.data.objects.new(name, me)
        link(ob, collection)
        if parent is not None:
            ob.parent = parent
        if origin is not None:
            ob.location = Vector(loc) + Vector(origin) if loc == (0, 0, 0) else Vector(loc)
        else:
            ob.location = loc
        ob.rotation_euler = rot
        if props:
            for k, v in props.items():
                ob[k] = v
        return ob

# ----------------------------------------------------------------------------- scene helpers
def get_mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    return m

def coll(path):
    """Get/create nested collection by '/'-separated path under the scene collection."""
    parent = bpy.context.scene.collection
    c = None
    for part in path.split('/'):
        c = bpy.data.collections.get(part)
        if c is None:
            c = bpy.data.collections.new(part)
        if c.name not in [x.name for x in parent.children]:
            try:
                parent.children.link(c)
            except RuntimeError:
                pass
        parent = c
    return c

def link(ob, collection):
    if isinstance(collection, str):
        collection = coll(collection)
    collection.objects.link(ob)
    return ob

def empty(name, collection, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), display='PLAIN_AXES', size=0.5, props=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = display
    ob.empty_display_size = size
    link(ob, collection)
    ob.parent = parent
    ob.location = loc
    ob.rotation_euler = rot
    if props:
        for k, v in props.items():
            ob[k] = v
    return ob

def tag(ob, semantic_id, **kw):
    """Stable semantic ID kept in custom properties (exported as glTF extras)."""
    ob['semantic_id'] = semantic_id
    for k, v in kw.items():
        ob[k] = v
    return ob

def remove_tree(names_prefix):
    for ob in [o for o in bpy.data.objects if o.name.startswith(names_prefix)]:
        bpy.data.objects.remove(ob, do_unlink=True)

def purge_collection(cname):
    c = bpy.data.collections.get(cname)
    if not c:
        return
    def rec(cc):
        for o in list(cc.objects):
            me = o.data if o.type == 'MESH' else None
            bpy.data.objects.remove(o, do_unlink=True)
            if me is not None and me.users == 0:
                bpy.data.meshes.remove(me)
        for ch in cc.children:
            rec(ch)
    rec(c)

def scene_tris(objs=None):
    dg = bpy.context.evaluated_depsgraph_get()
    tot = 0
    for o in (objs or bpy.context.scene.objects):
        if o.type == 'MESH':
            me = o.evaluated_get(dg).data
            tot += sum(len(p.vertices) - 2 for p in me.polygons)
    return tot

# ----------------------------------------------------------------------------- reusable asset generators
def gen_barrel(mb, matrix, h=0.9, r=0.34, rng=None, wood='timber_warm', segs=12, open_top=False):
    prof = [(r * 0.86, 0), (r * 0.96, h * 0.25), (r, h * 0.5), (r * 0.96, h * 0.75), (r * 0.86, h)]
    mb.lathe(prof, 'M_Wood', col(wood, 0.1, rng), matrix, segs=segs, smooth=True, cap_top=not open_top)
    if open_top:
        mb.add(prim_cyl(r * 0.8, 0.01, segs, caps=(False, True)), 'M_Wood', col('timber_dark'), matrix @ M((0, 0, h * 0.85)))
    for zf in (0.18, 0.82):
        rr = r * (0.94 if zf < 0.5 else 0.94)
        mb.add(prim_ring(rr - 0.005, rr + 0.02, 0.05, segs), 'M_Metal', 'iron', matrix @ M((0, 0, h * zf)))

def gen_crate(mb, matrix, sx=0.6, sy=0.45, sz=0.32, rng=None, wood='wood_light'):
    c = col(wood, 0.08, rng)
    t = 0.03
    mb.box((sx, sy, 0.03), (0, 0, 0.015), mat='M_Wood', color=c, matrix=matrix)
    for side in (-1, 1):
        for zz in (0.07, 0.2):
            mb.box((sx, t, 0.1), (0, side * (sy / 2 - t / 2), zz), mat='M_Wood', color=c, matrix=matrix)
            mb.box((t, sy, 0.1), (side * (sx / 2 - t / 2), 0, zz), mat='M_Wood', color=c, matrix=matrix)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1):
            mb.box((0.045, 0.045, sz), (sx_ * (sx / 2 - 0.02), sy_ * (sy / 2 - 0.02), sz / 2), mat='M_Wood', color=col('timber_mid'), matrix=matrix)

def gen_sack(mb, matrix, h=0.62, r=0.27, color='burlap', rng=None, open_top=False, fill='rice'):
    prof = [(0.0, 0.0), (r * 0.85, 0.01), (r, h * 0.15), (r * 1.02, h * 0.45), (r * 0.9, h * 0.72), (r * 0.55, h * 0.86)]
    if open_top:
        prof += [(r * 0.7, h * 0.95), (r * 0.72, h * 0.98)]
    else:
        prof += [(r * 0.18, h * 0.9), (r * 0.25, h * 0.98), (r * 0.12, h * 1.04), (0.0, h * 1.05)]
    mm = matrix @ M(scale=(1.0, 0.8, 1.0))
    mb.lathe(prof, 'M_Fabric', col(color, 0.06, rng), mm, segs=10, smooth=True, cap_bottom=False, cap_top=open_top)
    if open_top:
        mb.add(prim_sphere(r * 0.68, 10, 4, sz=0.35), 'M_Organic', fill, mm @ M((0, 0, h * 0.95)), smooth=True)

def gen_pot(mb, matrix, h=0.55, r=0.24, color='clay_pot', rng=None, segs=12):
    prof = [(r * 0.55, 0), (r * 0.9, h * 0.2), (r, h * 0.45), (r * 0.8, h * 0.78), (r * 0.5, h * 0.9), (r * 0.58, h), (r * 0.48, h), (r * 0.42, h * 0.92)]
    mb.lathe(prof, 'M_Clay', col(color, 0.06, rng), matrix, segs=segs, smooth=True, cap_top=False)

def gen_jar(mb, matrix, h=0.22, r=0.08, color='ceramic', lid='timber_mid', rng=None):
    prof = [(r * 0.8, 0), (r, h * 0.15), (r, h * 0.8), (r * 0.7, h * 0.9), (r * 0.7, h)]
    mb.lathe(prof, 'M_Clay', col(color, 0.05, rng), matrix, segs=8, smooth=True)
    mb.add(prim_cyl(r * 0.78, 0.03, 8), 'M_Wood', lid, matrix @ M((0, 0, h)))

def gen_lantern(mb, glass_mb, matrix, s=1.0):
    """Lantern body (metal) into mb, glass into glass_mb (emissive)."""
    mb.add(prim_cyl(0.11 * s, 0.03 * s, 8), 'M_Metal', 'iron', matrix @ M((0, 0, 0)))
    mb.add(prim_cyl(0.11 * s, 0.05 * s, 8, r2=0.04 * s), 'M_Metal', 'iron', matrix @ M((0, 0, 0.27 * s)))
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        mb.box((0.02 * s, 0.02 * s, 0.25 * s), (0.1 * s * math.cos(ang), 0.1 * s * math.sin(ang), 0.15 * s), mat='M_Metal', color='iron', matrix=matrix)
    mb.add(prim_ring(0.035 * s, 0.05 * s, 0.012 * s, 8), 'M_Metal', 'iron', matrix @ M((0, 0, 0.36 * s), (math.pi / 2, 0, 0)))
    glass_mb.add(prim_cyl(0.085 * s, 0.24 * s, 8), 'M_GlassWarm', 'glass', matrix @ M((0, 0, 0.03 * s)), smooth=True)

def gen_rock(mb, matrix, r=0.4, rng=None, color='stone', flat=0.6):
    v, f = prim_ico(r, 1)
    rng = rng or random.Random(1)
    vv = []
    for p in v:
        k = 1.0 + rng.uniform(-0.18, 0.18)
        vv.append((p[0] * k, p[1] * k * rng.uniform(0.85, 1.1), p[2] * k * flat))
    mb.add((vv, f), 'M_Stone', col(color, 0.12, rng), matrix, smooth=True)

def gen_valve_wheel(mb, matrix, r=0.16, color='brass', spokes=4):
    mb.add(prim_ring(r - 0.025, r, 0.03, 16), 'M_Metal', color, matrix)
    mb.add(prim_cyl(0.035, 0.06, 8, z0=False), 'M_Metal', color, matrix)
    for i in range(spokes):
        a = i * 2 * math.pi / spokes
        mb.box((r * 0.95, 0.018, 0.018), (math.cos(a) * r * 0.48, math.sin(a) * r * 0.48, 0), (0, 0, a), mat='M_Metal', color=color, matrix=matrix)

def gen_ladder(mb, matrix, h=3.0, w=0.5, color='wood_light', rung=0.3):
    for s in (-1, 1):
        mb.box((0.06, 0.05, h), (s * w / 2, 0, h / 2), mat='M_Wood', color=color, matrix=matrix, bevel=0.01)
    n = int(h / rung)
    for i in range(1, n):
        mb.box((w, 0.04, 0.04), (0, 0, i * rung), mat='M_Wood', color=color, matrix=matrix)

def gen_text(text, size=0.2, extrude=0.006, align='CENTER'):
    """Convert a Blender text datablock to (verts, faces) - legible geometry signage."""
    cu = bpy.data.curves.new('tmp_txt', 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = 'CENTER'
    cu.resolution_u = 2
    ob = bpy.data.objects.new('tmp_txt', cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    v = [tuple(x.co) for x in me.vertices]
    f = [tuple(p.vertices) for p in me.polygons]
    ob.evaluated_get(dg).to_mesh_clear()
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    return v, f
def remove_hierarchy(root_name):
    """Delete an object and all of its descendants (plus orphaned mesh data)."""
    root = bpy.data.objects.get(root_name)
    if root is None:
        return 0
    obs = [root] + list(root.children_recursive)
    meshes = [o.data for o in obs if o.type == 'MESH']
    for o in obs:
        bpy.data.objects.remove(o, do_unlink=True)
    for me in meshes:
        if me.users == 0:
            bpy.data.meshes.remove(me)
    return len(obs)