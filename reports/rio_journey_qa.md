# Rio journey verification

Baseline is commit `8f2e113` on `educational-village`.

## Defects reproduced from source and exported geometry

- The Power road turned from `(8.4, -3.4)` back to `(7.8763, -2.9957)` in X/Z, then doubled toward the entrance. At the same entrance the route included a second waypoint at the same X/Z but a different Y. The Ration route also followed a small spur at the west bridge mouth.
- The runtime treated the manifest's terrain elevation as the origin of the arch. The visible deck's modeled apex is 1.42 m. The old route put Rio at 1.659 m at that point, 24 cm over the deck. The actual geometry also exposed a 7 cm road-ribbon edge at the Ration approach.
- The walk advanced at a fixed speed but used elapsed time for the legs. Standing poses switched immediately, and the follow camera pivoted with Rio's yaw. The opening transitioned by timer independently of the readiness of the village assets. There was no player-facing retry when village loading failed.
- The original intro lacked a mobile viewport declaration. The global pointer-up handler could use stale coordinates from a previous press.

Visual concerns such as texture seams, lighting artifacts and perceived foot sliding require browser review. Only the geometry and code-level defects above were reproduced directly.

## Local checks

- `node --test` checks the sampled walk against the exported road, terrain, bridge planks and the authored obstacle boxes. Water and Power are about 24.1 m each. Ration is about 32.0 m. The route was within 5.8 cm of the highest visible bridge surface at checked plank locations. All three paths clear the sampled obstacles. Water and Power arrival coordinates exactly match the next departure.
- The walker tests cover start and stop at 20, 30, 60 and 120 Hz, a suspended-tab gap and wrapped yaw. In a Node smoke harness, the actual village script reached each intended module URL or embed handoff. The harness also exercised duplicate clicks, resize, a simulated hidden-tab gap and a failed module request followed by retry.
- A Node smoke check of the intro script also covered duplicate Start clicks, a failed village load, retry, readiness gating, reduced-motion timing, and stopping the intro render loop after the reveal. The smoke checks simulated DOM events and used a stub renderer.
- A geometry-only camera sweep at 960×640 and 390×844 checked Rio's projected torso and the camera-to-torso line against the village asset. All 652 samples stayed on-screen and clear of opaque geometry. This check does not evaluate the rendered composition, animation or destination readability.
- The lesson completion functions were inspected at Water's `onDone` and the Power and Ration final check-up modals. Exercising the shared callback sent Water to Power, Power to Ration and Ration back to the title. Duplicate activation was ignored. Standalone and mismatched journey requests stayed inactive.
- A static HTTP smoke check returned 200 for the intro, village, chapter URLs, metadata, compressed village asset, module map and all three lesson URLs. Direct requests for the pinned Three.js builds, GLTFLoader and the Draco WASM decoder returned 200.

## Performance measures

The exported village has 181 drawable primitives and 287,136 triangles before Rio and sky. An offline light-frustum sweep counted 152 candidate scene draws and 231,250 candidate triangles in the original shadow pass. Excluding the terrain, road ribbons and distant trees leaves 147 draws and 190,780 triangles for the first updated pass. The standard journey then retains the 2048² static map and uses a separate Rio contact shadow. Debug modes continue updating the shadow map for interactive objects. These are asset-derived counts, not browser draw counters. The new resolution ceiling is 3.2 million pixels, with the existing DPR ceilings also applied.

The intro retires its animation loop and releases Three.js resources after the reveal. The village requests its manifest alongside the GLB, limits Draco to two workers and disposes the decoder after loading. Movement uses cached surface samples and reusable vectors.

## Verification limits

The local browser automation could not connect to the loopback preview. The browser startup, actual GPU frame times, transition appearance, touch input, audio and browser console remain unverified. Water, Power and Ration lesson completion through play also remains unverified, including their pause, mute, notebook and restart controls. The callback and geometry tests do not substitute for these checks.
