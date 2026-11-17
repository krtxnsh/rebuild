"""scene_setup.py - project initialisation: scene, units, render settings, collection tree, world, cameras, render."""
import bpy, math
from mathutils import Vector
from shared_utils import coll, P

TREE = [
    'VILLAGE_ROOT',
    'VILLAGE_ROOT/00_TERRAIN', 'VILLAGE_ROOT/01_WATER_SYSTEM', 'VILLAGE_ROOT/02_BRIDGES_PATHS',
    'VILLAGE_ROOT/03_BUILDINGS',
    'VILLAGE_ROOT/03_BUILDINGS/WATER_TREATMENT_PLANT',
    'VILLAGE_ROOT/03_BUILDINGS/ELECTRICITY_ROOM',
    'VILLAGE_ROOT/03_BUILDINGS/RATION_SHOP',
    'VILLAGE_ROOT/04_VEGETATION', 'VILLAGE_ROOT/05_ENVIRONMENT_PROPS', 'VILLAGE_ROOT/06_LIGHTING',
    'VILLAGE_ROOT/07_CAMERAS', 'VILLAGE_ROOT/08_GAMEPLAY_MARKERS', 'VILLAGE_ROOT/09_COLLISION_PROXIES',
]
SUB = {
    'WATER_TREATMENT_PLANT': ['WATER_Exterior', 'WATER_Interior', 'WATER_Equipment', 'WATER_Water_Channels', 'WATER_Interactables'],
    'ELECTRICITY_ROOM': ['ELEC_Exterior', 'ELEC_Interior', 'ELEC_Equipment', 'ELEC_WaterWheel', 'ELEC_Interactables'],
    'RATION_SHOP': ['RATION_Exterior', 'RATION_Interior', 'RATION_Shop_Props', 'RATION_Food_Assets', 'RATION_Interactables'],
}

def bcoll(building, sub):
    """Collection path helper e.g. bcoll('ELECTRICITY_ROOM','ELEC_Exterior')."""
    return coll('VILLAGE_ROOT/03_BUILDINGS/%s/%s' % (building, sub))

def init_scene():
    scn = bpy.data.scenes.get('VILLAGE')
    if scn is None:
        scn = bpy.data.scenes.new('VILLAGE')
    bpy.context.window.scene = scn
    scn.unit_settings.system = 'METRIC'
    scn.unit_settings.scale_length = 1.0
    scn.render.engine = 'BLENDER_EEVEE'
    scn.render.resolution_x, scn.render.resolution_y = 1600, 900
    scn.render.resolution_percentage = 100
    scn.render.film_transparent = False
    try:
        scn.eevee.taa_render_samples = 48
        scn.eevee.use_shadows = True
        scn.eevee.use_raytracing = True
        scn.eevee.fast_gi_method = 'GLOBAL_ILLUMINATION'
    except Exception:
        pass
    scn.view_settings.view_transform = 'AgX'
    try:
        scn.view_settings.look = 'AgX - Punchy'
    except Exception:
        pass
    scn.render.fps = 30
    scn.frame_start, scn.frame_end = 1, 120
    for p in TREE:
        coll(p)
    for b, subs in SUB.items():
        for s in subs:
            bcoll(b, s)
    setup_world(scn)
    return scn

def setup_world(scn):
    w = bpy.data.worlds.get('W_Village') or bpy.data.worlds.new('W_Village')
    scn.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    # Use Z of view direction (Generated on world = direction) for sky gradient
    nt.links.new(sep.outputs['Z'], ramp.inputs[0])
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.95, 0.86, 0.70, 1)
    ramp.color_ramp.elements[1].position = 0.35
    ramp.color_ramp.elements[1].color = (0.42, 0.66, 0.92, 1)
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0
    nt.links.new(bg.outputs[0], out.inputs[0])

def add_sun():
    c = coll('VILLAGE_ROOT/06_LIGHTING')
    sun = bpy.data.objects.get('LIGHT_Sun')
    if sun is None:
        ld = bpy.data.lights.new('LIGHT_Sun', 'SUN')
        sun = bpy.data.objects.new('LIGHT_Sun', ld)
        c.objects.link(sun)
    sun.data.energy = 3.6
    sun.data.color = (1.0, 0.93, 0.80)
    sun.data.angle = math.radians(3.0)
    sun.rotation_euler = (math.radians(48), 0, math.radians(-35))
    return sun

def camera(name, loc, target, lens=35.0, ortho=None):
    c = coll('VILLAGE_ROOT/07_CAMERAS')
    ob = bpy.data.objects.get(name)
    if ob is None:
        cd = bpy.data.cameras.new(name)
        ob = bpy.data.objects.new(name, cd)
        c.objects.link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    ob.data.lens = lens
    ob.data.clip_start = 0.1
    ob.data.clip_end = 1200
    if ortho:
        ob.data.type = 'ORTHO'; ob.data.ortho_scale = ortho
    else:
        ob.data.type = 'PERSP'
    ob['target'] = list(target)
    return ob

def render(cam_name, path, res=(1600, 900), samples=48):
    scn = bpy.context.scene
    scn.camera = bpy.data.objects[cam_name]
    scn.render.resolution_x, scn.render.resolution_y = res
    try:
        scn.eevee.taa_render_samples = samples
    except Exception:
        pass
    scn.render.filepath = path
    scn.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    return path