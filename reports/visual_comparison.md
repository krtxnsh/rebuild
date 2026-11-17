# Visual Comparison (render vs reference)

Renders: `renders/` (EEVEE, AgX). References: `references/`. Camera pairs approximate each reference's viewpoint.
This is a stylised interpretation; no pixel-level match is claimed.

## Layout plan (top-down, Blender metres, +Y = north/away from hero camera)
| Element | Position | Notes |
|---|---|---|
| Ration Shop root | (-13.6, -4.4), yaw 15 deg | left foreground; front faces the hero camera from the shop's front-right (matches primary) |
| Water Plant root | (-9.6, 13.2), yaw 8 deg | centre-left; cascade on its west side, tower NE-rear, well SE |
| Electricity Room root | (11.8, 8.2), yaw -35 deg | right; gable/doors face SW toward the bridge, waterwheel on its right (SE) side |
| Stream | polyline N->S through x = 0..4 | half-width 2.5 m in village, narrower upstream |
| Arched bridge | stream crossing at y = 2.6 | 11.6 m deck, 1.3 m rise, 1.86 m clear |
| Footbridges | y = 23.5 and y = -14 | flat plank bridges (as in wide ref) |
| Hero camera | (-1.5, -28, 14) -> (1.2, 9, 3.6), 24 mm | `CAM_01_Village_Hero` |
Workflow followed: proxies -> hero render vs `village_wide.jpg` -> 3 layout iterations (camera too high/far; buildings too spread;
stream too straight) -> layout locked before detailed modelling (`renders/blockout_hero.png`).

## Village (`village_hero.png` vs `village_wide.jpg`)
- Matches: shop large in left foreground with striped awning; water plant centre-left with tank tower rising behind its roof
  and well to its right; electricity room right with round window, chimney, poles; central arched bridge with stone
  abutments; winding stream toward camera; upstream footbridge; paths linking all three; autumn + green round trees;
  pine hills; mountains + sky band at top.
- Deliberate differences: no extra cottages/windmills/shed/fields (exactly-three-building rule); shop rotated to show its
  primary-reference face; perspective/elevation of an illustrated image cannot be matched exactly.
- Correctable residuals: reference foreground is denser (flowers, crates); terrain colour is flatter than the painted
  reference; water lacks reflections (runtime shader target provided).

## Electricity Room (`electricity_room_views/elec_exterior.png` vs `elec_primary.jpg`)
- Matches: red brick (textured + normal map) with chunky golden timber, concave flared slate roof with overlapping shingles,
  thick golden curved barge boards + overhanging ridge beam, round gable window with grid, arched door head, open double
  plank doors revealing VOLTS meters / copper coils, bulb string (3 left / 4 right), lantern on bracket, right-wall window,
  waterwheel + flume + stone basin, three poles with ceramic insulators and wires, iron fence with ball finials and open gate,
  ladder, cable spools, ground lantern, chimney on the left-rear.
- Differences: missing shingles/fallen pole tidied (conflict log #4); chimney single stack body with two flues; waterwheel
  source inferred (flume from a raised cistern).

## Water Treatment Plant (`water_plant_views/water_exterior.png` vs `water_primary.jpg`)
- Matches: cream plaster, dark exposed timber with knee braces and gable struts, rounded-stone base course, terracotta barrel
  tiles with lips + ridge row, double plank doors with strap hinges and ring pulls, framed windows with flower boxes, copper
  pipes with brass hand-wheels, elevated stave tank with iron hoops on a braced tower (+ ladder from the sheet), cascading
  gravel/water boxes into clay basins and a trough, stone well with tiled roof, windlass, rope + bucket, picket fence, pots.
- Differences: roof hole tidied; cascade arranged as a readable teaching sequence (collection -> sedimentation -> filtration ->
  reserved disinfection marker -> basins -> trough -> distribution); tank raised to ~1.55x ridge height.

## Ration Shop (`ration_shop_views/ration_exterior.png` vs `ration_primary.jpg`)
- Matches: cream plaster + dark half-timber, gable with diagonals at the right end, large barrel-tile roof face over the market
  front, red/cream striped awning with scalloped edge (16 stripes, ~0.33 m), multicolour bunting, two hanging lanterns,
  hanging baskets, counter with brass balance scale, stocked shelves, "RATIONS TODAY" chalkboard (legible geometry text),
  RICE / LENTILS / GRAIN sacks (legible labels), produce crates, two side stalls with green/cream and blue/cream awnings,
  wooden cart with produce.
- Differences: no chimney (brief rule, conflict #8); awning edge scalloped rather than tattered.

## Interiors (`renders/interiors/*.png`) - inferred layouts
- Electricity: control panel (VOLTS/AMPS/HZ gauges, knife switch), generator on the waterwheel axle, copper coils, shelves,
  workbench, hanging bulbs. Clear 2.4 m corridor from doors to panel.
- Water: copper manifold with gauges/valves, filter vat, water test station, shelf, lantern, flagstone floor.
- Ration: counter + scale, back storage shelf, side shelf, sacks, lantern; entry gap 1.45 m beside the counter.

## Acceptance checks
| Check | Result |
|---|---|
| Exactly three buildings, identifiable without labels | Pass (visual) |
| Relative placement vs wide reference | Pass (approximate) |
| Signature features (tank, waterwheel, awning, round window, curved roof, well, cascade) | Present |
| Interiors enterable | Pass - capsule routes 0 collisions through all 3 entrances (runtime_results.json) |
| Floating / intersecting objects | No issues seen in the review renders; not exhaustively checked |