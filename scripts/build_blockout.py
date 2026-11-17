"""build_blockout.py - Phase 3 spatial blockout: terrain, river, bridges, paths, building proxies, hero camera."""
import bpy, math
from mathutils import Vector
import shared_utils as su, layout as L, terrain as T, scene_setup as SS
from shared_utils import MB, M

def clear_generated():
    for cn in ['00_TERRAIN', '01_WATER_SYSTEM', '02_BRIDGES_PATHS', '09_COLLISION_PROXIES', 'BLOCKOUT_PROXIES']:
        su.purge_collection(cn)

def ground_stage():
    T.reset()
    ends = {}
    # bridge frames first (they only depend on the stream) so their end pads shape the terrain
    p, ang, W, E = T.bridge_frame(L.MAIN_BRIDGE_Y, 5.8)
    for e in (W, E):
        T.add_pad(e.x, e.y, 1.6, 3.0, 0.1)
    for nm, y in L.FOOT_BRIDGES:
        p, ang, W2, E2 = T.bridge_frame(y, 5.2)
        for e in (W2, E2):
            T.add_pad(e.x, e.y, 1.2, 2.5, 0.22)
    T.grid()
    ob, ends['BRIDGE_Main'] = T.build_arch_bridge('BRIDGE_Main', L.MAIN_BRIDGE_Y)
    for nm, y in L.FOOT_BRIDGES:
        _, ends[nm] = T.build_foot_bridge(nm, y, L_half=5.2)
    pdefs = L.paths(ends)
    paths_ob, polys = T.build_paths(pdefs)
    T.build_terrain(polys)
    T.build_far_hills()
    T.build_river()
    bpy.app.driver_namespace['village_paths'] = polys
    bpy.app.driver_namespace['bridge_ends'] = ends
    return {'tris': su.scene_tris()}

PROXY = {'RATION': [((6.0, 4.4, 3.1), (0, 0, 1.55)), ((6.8, 5.6, 2.3), (0, 0, 4.2))],
         'WATER': [((6.4, 4.6, 3.2), (0, 0, 1.6)), ((7.2, 5.6, 2.1), (0, 0, 4.2)), ((2.4, 2.4, 5.5), (4.9, 2.4, 2.75)), ((2.5, 2.5, 2.4), (4.9, 2.4, 6.7)), ((2.0, 6.0, 1.2), (-4.6, -1.5, 0.6))],
         'ELEC': [((5.0, 5.6, 3.0), (0, 0, 1.5)), ((6.0, 6.2, 3.4), (0, 0, 4.7)), ((0.5, 2.6, 2.6), (3.0, -0.8, 1.6)), ((0.9, 0.9, 7.6), (-1.6, 1.4, 3.8))]}

def proxies():
    for k, boxes in PROXY.items():
        mb = MB()
        for size, loc in boxes:
            mb.box(size, loc, mat='M_Plaster', color='plaster')
        mb.add(su.prim_box(0.6, 0.6, 0.6), 'M_Fabric', 'fabric_red', M((0, -3.0, 2.5)))
        mx = L.bmatrix(k)
        ob = mb.build('PROXY_' + k, 'BLOCKOUT_PROXIES')
        ob.matrix_world = mx
    return 'ok'

def hero_camera():
    SS.add_sun()
    hc = L.HERO_CAM
    SS.camera('CAM_01_Village_Hero', hc['loc'], hc['target'], hc['lens'])
    SS.camera('CAM_02_Village_TopDown', (0, 8, 140), (0, 8.01, 0), 35, ortho=95)