"""layout.py - single source of truth for the village composition (Blender world space, metres, Z up).

Derived from village_wide.jpg by establishing an equivalent hero camera looking north (+Y):
Ration Shop left-foreground, Water Plant centre-left middle, Electricity Room right, stream winding N->S
through the centre with the arched bridge at the visual centre.
"""
import math
from mathutils import Vector, Matrix

WATER_LEVEL = -0.45

# Building root transforms (loc x, y; ground pad z; rotation about Z in degrees; local front = -Y)
BUILDINGS = {
    'RATION': dict(loc=(-13.6, -4.4), z=0.20, rot=15.0, pad_r=6.8, pad_blend=5.0, entrance_local=(1.45, -3.9, 0.0)),
    'WATER':  dict(loc=(-9.6, 13.2), z=0.60, rot=8.0,  pad_r=8.6, pad_blend=6.0, entrance_local=(0.6, -3.3, 0.0)),
    'ELEC':   dict(loc=(11.8, 8.2),   z=0.45, rot=-35.0, pad_r=7.0, pad_blend=5.0, entrance_local=(0.0, -4.4, 0.0)),
}

STREAM = [(20, 82), (11, 62), (13.5, 47), (8.6, 35), (6.2, 26), (4.6, 18), (2.2, 10), (0.9, 3), (0.5, -4), (-1.8, -12),
          (-1.0, -22), (1.6, -33), (2.2, -50), (0.0, -72)]

def stream_halfwidth(y):
    # narrower upstream, ~2.5 m through the village
    return 2.5 if y < 20 else max(1.6, 2.5 - (y - 20) * 0.03)

def bmatrix(key):
    b = BUILDINGS[key]
    return Matrix.LocRotScale(Vector((b['loc'][0], b['loc'][1], b['z'])),
                              Matrix.Rotation(math.radians(b['rot']), 4, 'Z').to_quaternion(), Vector((1, 1, 1)))

def to_world(key, p):
    return bmatrix(key) @ Vector(p)

def entrance(key):
    return to_world(key, BUILDINGS[key]['entrance_local'])

# Bridges: (centre y, half-length, width, kind)
MAIN_BRIDGE_Y = 2.6
FOOT_BRIDGES = [('BRIDGE_FootUpper', 23.5), ('BRIDGE_FootSouth', -14.0)]

def paths(bridge_ends):
    """Return list of (name, width, control points).  bridge_ends: dict name->(W_end, E_end) as Vectors."""
    rw, re_ = bridge_ends['BRIDGE_Main']
    uw, ue = bridge_ends['BRIDGE_FootUpper']
    sw, se = bridge_ends['BRIDGE_FootSouth']
    er, ew, ee = entrance('RATION'), entrance('WATER'), entrance('ELEC')
    def ext(p, q, d):  # point slightly beyond p away from q
        v = (Vector(p) - Vector(q)).normalized(); return Vector(p) + v * d
    return [
        ('PATH_Ration_Bridge', 2.6, [er.xy, (er.x + 2.2, er.y - 1.0), (-6.9, -6.2), (-6.0, -1.8), ext(rw, re_, 0.6).xy, rw.xy]),
        ('PATH_Water_Bridge', 2.4, [ew.xy, (ew.x + 0.6, ew.y - 2.6), (-7.4, 6.0), (-6.4, 3.4), ext(rw, re_, 0.6).xy]),
        ('PATH_Bridge_Elec', 2.6, [re_.xy, ext(re_, rw, 0.6).xy, (8.4, 3.4), (ee.x - 1.4, ee.y - 1.6), ee.xy]),
        ('PATH_Road_North', 2.2, [ew.xy, (-14.8, 8.6), (-18.2, 17.0), (-23.0, 29.0), (-28.5, 42.0), (-33.0, 60.0), (-36.0, 80.0)]),
        ('PATH_Upper_Loop', 1.8, [(-2.8, 13.4), (-1.8, 18.8), ext(uw, ue, 0.5).xy, uw.xy]),
        ('PATH_Upper_Loop_E', 1.8, [ue.xy, ext(ue, uw, 0.5).xy, (9.6, 18.6), (11.4, 14.2)]),
        ('PATH_South_Loop', 1.8, [(er.x + 3.0, er.y - 1.2), (-7.5, -11.5), ext(sw, se, 0.5).xy, sw.xy]),
        ('PATH_South_Loop_E', 1.8, [se.xy, ext(se, sw, 0.5).xy, (7.5, -11.0), (10.0, -4.0), (9.4, 1.6)]),
    ]

HERO_CAM = dict(loc=(-1.5, -28.0, 14.0), target=(1.2, 9.0, 3.6), lens=24.0)
# =============================================================================================== EXPANSION (v2)
# Approved v1 content above is unchanged.  The expansion is applied incrementally by scripts/expansion.py.
# Houses: id -> (design, variant, x, y, yaw_deg).  Local front = -Y.  Sites were chosen by a constraint search
# (tree/path/stream clearance, slope, and hero-camera keep-out zones around the tank and electricity chimney).
HOUSES = {
    'HOUSE_01': ('B', 'b1', -17.5, 31.5, -73.0),    # rear-left cluster: timber cottage + porch facing Road North
    'HOUSE_02': ('A', 'a2', -31.5, 34.5, 65.0),     # rear-left cluster: whitewashed cottage west of the road
    'HOUSE_03': ('D', 'd1', -21.0, 43.0, 20.0),     # rear-left cluster: farmhouse with side extension, on the slope
    'HOUSE_04': ('C', 'c2', 3.5, 50.0, -10.0),      # rear-centre: two-storey family house (wing mirrored)
    'HOUSE_05': ('A', 'a1', 34.0, 43.0, -90.0),     # rear-right: plaster cottage, front garden faces west (not into HOUSE_06's yard)
    'HOUSE_06': ('B', 'b2', 30.5, 36.0, -60.0),     # rear-right: light timber cottage, porch faces WSW (clear of the tree at 28,30)
    'HOUSE_07': ('A', 'a3', -21.25, 6.5, 122.0),    # west outer: low cottage (a tall house here competed with the Ration Shop)
    'HOUSE_08': ('D', 'd2', 23.0, 6.0, 30.0),       # east outer: farmhouse beside the farm
}
MOVED_TREES = {(-21.0, 24.0): (-24.3, 23.2)}       # v1 tree stood on Road North (0.2 m from centre line)
GATHERING = (-21.8, 36.2)
FARM = dict(x0=12.6, x1=21.8, y0=-9.6, y1=-0.8, path_y=-5.0, path_x=17.3, channel_y=-5.95,
            west_gate=(-5.6, -4.3), north_gate=(19.8, 21.2), intake=(2.9, -6.35))
COMMUNITY_GARDEN = (-11.6, -12.0)
SIGNS = [((-22.9, 32.9), [('HOMES', 60.0), ('BRIDGE', 200.0), ('WATER', 150.0)]),
         ((8.5, -4.4), [('FARM', -80.0), ('BRIDGE', 150.0), ('POWER', 30.0)]),
         ((11.6, 21.4), [('HOMES', -40.0), ('POWER', 200.0)])]
# expansion path centre-lines; 'H:<id>' resolves to the point 1.2 m in front of that house's door
EXP_PATHS = [
    ('XPATH_House01', 1.6, [(-22.9, 29.0), 'H:HOUSE_01']),
    ('XPATH_House02', 1.6, [(-26.0, 34.2), 'H:HOUSE_02']),
    ('XPATH_Gathering', 1.8, [(-25.4, 34.9), (-23.4, 35.7), (-21.8, 36.2), 'H:HOUSE_03']),
    ('XPATH_House04', 1.6, [(-1.2, 21.2), (-1.3, 26.0), (-0.6, 31.0), (0.2, 36.6), (1.0, 41.0), 'H:HOUSE_04']),
    ('XPATH_RearRight', 1.6, [(10.2, 19.4), (13.2, 21.4), (17.2, 24.2), (22.4, 27.0), 'H:HOUSE_06']),
    ('XPATH_House05', 1.5, [(22.4, 27.0), (20.8, 32.0), (21.2, 37.6), (24.2, 40.8), 'H:HOUSE_05']),
    ('XPATH_House07', 1.6, [(-16.9, 8.4), 'H:HOUSE_07']),
    ('XPATH_FarmGate', 1.6, [(9.7, -5.4), (11.2, -5.0), (12.6, -5.0)]),
    ('XPATH_FarmMain', 1.1, [(12.6, -5.0), (21.1, -5.0)]),
    ('XPATH_FarmCross', 1.0, [(17.3, -9.0), (17.3, -1.4)]),
    ('XPATH_FarmNorth', 1.2, [(20.5, -1.3), (20.5, 0.2), 'H:HOUSE_08']),
    ('XPATH_Garden', 1.4, [(-8.1, -10.2), (-9.4, -11.4)]),
]# v1 path repairs (pre-existing defects found by the v2 capsule test): the start of Road North ran through the
# Water Plant yard (basins, trough, distribution basin, west fence) and the start of Upper Loop hugged its east fence.
# (new segment name, width, centre-line, v1 path, keep v1 points with y >= cut_y)
V1_PATH_FIXES = [
    ('XPATH_RoadNorth_Fix', 2.2, [(-8.0, 6.3), (-11.5, 5.5), (-14.8, 5.7), (-16.9, 7.6), (-17.4, 10.4), (-16.9, 12.6)], 'PATH_Road_North', 12.4),
    ('XPATH_UpperLoop_Fix', 1.8, [(-2.9, 13.2), (-1.4, 14.4), (-0.9, 17.0), (-1.2, 19.8)], 'PATH_Upper_Loop', 19.6),
]