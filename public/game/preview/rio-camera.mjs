import { damp } from './rio-route.mjs';

export function createRioCamera(THREE, camera, roofBounds, reducedMotion) {
  const look = new THREE.Vector3(), desiredLook = new THREE.Vector3();
  const desiredPosition = new THREE.Vector3();
  let orbit = 0.59, initialized = false;

  function clearRoofs(point) {
    for (const box of roofBounds) {
      if (point.x > box.min.x - 0.55 && point.x < box.max.x + 0.55 &&
          point.z > box.min.z - 0.55 && point.z < box.max.z + 0.55) {
        point.y = Math.max(point.y, box.max.y + 0.7);
      }
    }
  }

  return (dt, phase, rio, ahead) => {
    const narrow = Math.max(0, 1 - camera.aspect);
    if (phase === 'overview') {
      if (!reducedMotion) orbit += dt * 0.037;
      const radius = 37 + narrow * 40;
      desiredPosition.set(Math.cos(orbit) * radius, 21 + narrow * 9, -4 + Math.sin(orbit) * radius);
      desiredLook.set(0, 2, -5);
    } else {
      const arriving = phase === 'arrival' || phase === 'transition' || phase === 'handoff';
      // Stay on the village's viewing side at bends, including when Rio
      // crosses the bridge in the opposite direction.
      desiredPosition.set(rio.x + (arriving ? 3.1 : 2.25),
        rio.y + (arriving ? 6.6 : 5.55) + narrow * 1.1,
        rio.z + (arriving ? 9.0 : 7.35) + narrow * 1.5);
      desiredLook.copy(rio).lerp(ahead, arriving ? 0.78 : 0.31);
      desiredLook.y += arriving ? 1.9 : 1.05;
    }
    clearRoofs(desiredPosition);
    if (!initialized) {
      camera.position.copy(desiredPosition);
      look.copy(desiredLook);
      initialized = true;
    }
    camera.position.lerp(desiredPosition, damp(4, dt));
    clearRoofs(camera.position);
    look.lerp(desiredLook, damp(6, dt));
    camera.lookAt(look);
    camera.updateMatrixWorld();
  };
}
