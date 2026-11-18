/**
 * Pre-unlocks audio playback from within a user gesture (the "Enter Palampur"
 * click) so the game's voice-over can start without tripping the browser's
 * autoplay restrictions. Safe to call repeatedly; never throws.
 */
let sharedCtx: AudioContext | null = null;

export function unlockAudio(): void {
  // 1. Web Audio: create + resume the context inside the gesture.
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      if (!sharedCtx) sharedCtx = new Ctor();
      if (sharedCtx.state === 'suspended') void sharedCtx.resume().catch(() => {});
      // A zero-length silent blip warms the output path on some mobile browsers.
      const osc = sharedCtx.createOscillator();
      const gain = sharedCtx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(sharedCtx.destination);
      osc.start();
      osc.stop(sharedCtx.currentTime + 0.01);
    }
  } catch {
    /* ignore — audio simply stays locked until the first in-game tap */
  }

  // 2. HTMLAudioElement: prime a muted element so later new Audio().play() is allowed.
  try {
    const el = new Audio();
    el.muted = true;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        el.pause();
        el.currentTime = 0;
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export function getAudioContext(): AudioContext | null {
  return sharedCtx;
}
