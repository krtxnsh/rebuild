"""materials.py - shared stylised material library + procedurally generated tileable textures (numpy).

Every texture is 512x512 and covers 1 m x 1 m via box-projected UVs.  Colour tint comes from vertex colours,
so textures for wood/plaster/stone are near-neutral detail maps; the brick texture carries full colour.
"""
import bpy, os
import numpy as np
from shared_utils import P

TEX = 512

def _vnoise(n, cells, rng):
    g = rng.random((cells, cells))
    x = np.arange(n) * cells / n
    i0 = np.floor(x).astype(int); f = x - i0; f = f * f * (3 - 2 * f); i1 = (i0 + 1) % cells
    a = g[np.ix_(i0, i0)]; b = g[np.ix_(i0, i1)]; c = g[np.ix_(i1, i0)]; d = g[np.ix_(i1, i1)]
    fx = f[None, :]; fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def _fbm(n, rng, base=4, octaves=4):
    out = np.zeros((n, n)); amp = 1.0; tot = 0
    for o in range(octaves):
        out += _vnoise(n, base * 2 ** o, rng) * amp; tot += amp; amp *= 0.5
    return out / tot

def _ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def _normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    nz = np.ones_like(h)
    l = np.sqrt(dx * dx + dy * dy + nz)
    return np.stack([(-dx / l) * 0.5 + 0.5, (-dy / l) * 0.5 + 0.5, (nz / l) * 0.5 + 0.5], -1)

def _save(name, rgb, noncolor=False):
    path = P('textures', name + '.png')
    img = bpy.data.images.get(name)
    if img is None:
        img = bpy.data.images.new(name, TEX, TEX, alpha=False)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones(rgb.shape[:2] + (1,))], -1).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    if noncolor:
        img.colorspace_settings.name = 'Non-Color'
    img.pack()
    return img

def make_textures():
    n = TEX
    rng = np.random.default_rng(7)
    yy, xx = np.mgrid[0:n, 0:n]
    # ---------------- brick: 8 rows x 4 bricks per metre, light mortar
    rows, bw, bh = 8, n // 4, n // 8
    row = yy // bh
    off = (row % 2) * (bw // 2)
    bx = (xx + off) % bw; by = yy % bh
    edge = np.minimum(np.minimum(bx, bw - bx), np.minimum(by, bh - by)).astype(float)
    bid = row * 5 + ((xx + off) // bw)
    tone = rng.uniform(0.82, 1.08, 200)[bid % 200]
    hue = rng.uniform(-0.04, 0.04, 200)[bid % 200]
    nz = _fbm(n, rng, 8, 4)
    base = np.stack([0.70 + hue, 0.31 + hue * 0.5, 0.24 * np.ones_like(nz)], -1) * (tone * (0.9 + 0.2 * nz))[..., None]
    shade = (0.82 + 0.18 * _ss(3, 11, edge))[..., None]
    mortar = np.array([0.83, 0.77, 0.68])[None, None, :] * (0.9 + 0.12 * nz)[..., None]
    is_m = (edge < 3.2)[..., None]
    brick = np.where(is_m, mortar, base * shade)
    _save('T_Brick_Albedo', brick)
    h = np.where(edge < 3.2, 0.0, _ss(2.5, 9, edge)) + nz * 0.15
    _save('T_Brick_Normal', _normal_from_height(h, 3.0), noncolor=True)
    # ---------------- plaster: soft blotches
    p = _fbm(n, rng, 3, 5)
    v = 0.86 + 0.14 * p
    plaster = np.stack([v, v * 0.985, v * 0.96], -1)
    _save('T_Plaster', plaster)
    # ---------------- wood grain: stretched noise, fine fibres
    g1 = _vnoise(n, 64, rng)[:, :]
    g1 = np.repeat(g1[:, ::8], 8, axis=1)  # stretch along x
    fib = _vnoise(n, 128, rng)
    grain = 0.80 + 0.12 * _fbm(n, rng, 4, 3) + 0.08 * np.sin(yy / n * 2 * np.pi * 24 + g1 * 6) * 0.5 + 0.04 * fib
    seam = 1 - 0.25 * (np.abs(((yy % 128) - 0.5)) < 1.5)
    wood = np.stack([grain, grain * 0.97, grain * 0.93], -1) * seam[..., None]
    _save('T_Wood', wood)
    # ---------------- stone blocks: irregular courses, dark joints
    st = np.ones((n, n)); edge2 = np.zeros((n, n))
    course_h = [96, 80, 112, 96, 128]
    y0 = 0; ci = 0
    while y0 < n:
        hcur = min(course_h[ci % len(course_h)], n - y0)
        x0 = int(rng.integers(0, 60)); blocks = []
        xs = [0]
        while xs[-1] < n:
            xs.append(xs[-1] + int(rng.integers(90, 170)))
        xs[-1] = n
        for k in range(len(xs) - 1):
            a, b = xs[k], xs[k + 1]
            sl = (slice(y0, y0 + hcur), slice(a, b))
            ly, lx = np.mgrid[0:hcur, 0:b - a]
            e = np.minimum(np.minimum(lx, (b - a) - lx), np.minimum(ly, hcur - ly)).astype(float)
            edge2[sl] = e
            st[sl] = rng.uniform(0.8, 1.05)
        y0 += hcur; ci += 1
    sn = _fbm(n, rng, 6, 4)
    sv = np.where(edge2 < 4, 0.55, st * (0.85 + 0.25 * sn) * (0.85 + 0.15 * _ss(3, 14, edge2)))
    _save('T_Stone', np.stack([sv, sv * 0.98, sv * 0.95], -1))
    sh = np.where(edge2 < 4, 0.0, _ss(3, 16, edge2)) + sn * 0.2
    _save('T_Stone_Normal', _normal_from_height(sh, 2.0), noncolor=True)

# ----------------------------------------------------------------------------- materials
def _nodes(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for nd in list(nt.nodes):
        nt.nodes.remove(nd)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); out.location = (400, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled'); bsdf.location = (100, 0)
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    return nt, bsdf

def _sock(node, name, typ=None):
    for s in node.inputs:
        if s.name == name and (typ is None or s.type == typ):
            return s
    raise KeyError(name)

def make_material(name, rough=0.8, metal=0.0, tex=None, normal=None, emission=None, estr=0.0, alpha=1.0,
                  double=False, vc=True, base=None, nstr=0.6):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nt, bsdf = _nodes(mat)
    _sock(bsdf, 'Roughness').default_value = rough
    _sock(bsdf, 'Metallic').default_value = metal
    colsrc = None
    if vc:
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'; ca.location = (-500, 100)
        colsrc = ca.outputs['Color']
    if tex:
        it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images[tex]; it.location = (-500, 350)
        if colsrc is not None:
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.location = (-200, 250)
            _sock(mx, 'Factor').default_value = 1.0
            ins = [s for s in mx.inputs if s.type == 'RGBA']
            nt.links.new(it.outputs['Color'], ins[0]); nt.links.new(colsrc, ins[1])
            outs = [s for s in mx.outputs if s.type == 'RGBA']
            nt.links.new(outs[0], _sock(bsdf, 'Base Color'))
        else:
            nt.links.new(it.outputs['Color'], _sock(bsdf, 'Base Color'))
    elif colsrc is not None:
        nt.links.new(colsrc, _sock(bsdf, 'Base Color'))
    elif base is not None:
        _sock(bsdf, 'Base Color').default_value = base
    if normal:
        it2 = nt.nodes.new('ShaderNodeTexImage'); it2.image = bpy.data.images[normal]; it2.location = (-500, -250)
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (-200, -250)
        nm.inputs['Strength'].default_value = nstr
        nt.links.new(it2.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], _sock(bsdf, 'Normal'))
    if emission is not None:
        _sock(bsdf, 'Emission Color').default_value = emission
        _sock(bsdf, 'Emission Strength').default_value = estr
    if alpha < 1.0:
        _sock(bsdf, 'Alpha').default_value = alpha
        try:
            mat.surface_render_method = 'BLENDED'
        except Exception:
            mat.blend_method = 'BLEND'
    mat.use_backface_culling = not double
    mat.diffuse_color = base if base else (0.8, 0.8, 0.8, 1)
    return mat

def build_library():
    make_textures()
    lib = {
        'M_Brick':    dict(rough=0.85, tex='T_Brick_Albedo', normal='T_Brick_Normal', nstr=0.8),
        'M_Plaster':  dict(rough=0.92, tex='T_Plaster'),
        'M_Wood':     dict(rough=0.78, tex='T_Wood'),
        'M_Stone':    dict(rough=0.9, tex='T_Stone', normal='T_Stone_Normal', nstr=0.5),
        'M_Clay':     dict(rough=0.72),
        'M_Slate':    dict(rough=0.6),
        'M_Metal':    dict(rough=0.38, metal=0.8),
        'M_Fabric':   dict(rough=0.95, double=True),
        'M_Organic':  dict(rough=0.75, double=True),
        'M_GlassWarm': dict(rough=0.2, emission=(1.0, 0.72, 0.36, 1), estr=1.4),
        'M_Bulb':     dict(rough=0.1, emission=(1.0, 0.82, 0.5, 1), estr=8.0),
        'M_Terrain':  dict(rough=0.95),
        'M_Water':    dict(rough=0.06, vc=False, base=(0.16, 0.42, 0.55, 1), alpha=0.8),
        'M_WaterFall': dict(rough=0.1, vc=False, base=(0.55, 0.78, 0.92, 1), alpha=0.45, double=True,
                            emission=(0.5, 0.7, 0.85, 1), estr=0.15),
    }
    for k, v in lib.items():
        make_material(k, **v)
    return list(lib.keys())