import gsap from "gsap";
import type { IntroScene } from "./introScene";

/** Shortened choreography: preserve the logo reveal while keeping the intro near 3 seconds. */
export const TIMING = {
  iconIn: { at: 0, dur: 0.9 },
  trackLag: { at: 0.05, dur: 0.9 },
  camera: { at: 0, dur: 2.0 },
  lens: { at: 0.15, dur: 1.7 },
  streak: { at: 0.25, dur: 0.8 },
  seamPulse: { at: 0.8, dur: 0.45 },
  pour: { at: 0.9, dur: 1.0 },
  word: { at: 1.65, dur: 0.55 },
  three: { at: 1.95, dur: 0.35 },
  hold: 0.25,
  fadeOut: 0.25,
} as const;

export const INTRO_DURATION =
  Math.max(
    TIMING.camera.at + TIMING.camera.dur,
    TIMING.word.at + TIMING.word.dur,
    TIMING.three.at + TIMING.three.dur,
    TIMING.pour.at + TIMING.pour.dur + 0.6,
  ) +
  TIMING.hold +
  TIMING.fadeOut;

export function createIntroTimeline(
  intro: IntroScene,
  fadeTarget: gsap.TweenTarget,
  onComplete: () => void,
): gsap.core.Timeline {
  const s = intro.state;
  const T = TIMING;
  const tl = gsap.timeline({ paused: true, onComplete });

  // Chase shot: the icon flies in from the right while the camera trails it.
  tl.to(s, {
    iconX: 0, iconZ: 0, iconRot: 0, iconTilt: 0,
    duration: T.iconIn.dur, ease: "power3.out",
  }, T.iconIn.at);
  tl.to(s, { trackX: 0, duration: T.trackLag.dur, ease: "power3.out" }, T.trackLag.at);
  tl.to(s, { streak: 0, duration: T.streak.dur, ease: "power1.in" }, T.streak.at);

  // Camera banks and moves from a low three-quarter chase to the front logo view.
  tl.to(s, {
    az: 0, el: 0, k: 1, tx: 0, ty: 0,
    duration: T.camera.dur, ease: "power3.inOut",
  }, T.camera.at);
  tl.to(s, { fov: 30, duration: T.lens.dur, ease: "power2.inOut" }, T.lens.at);
  tl.to(s, { roll: 0, duration: 1.5, ease: "power2.out" }, 0);

  // The icon lands first; only then does the liquid pour from its seam.
  tl.to(s, { seamGlow: 1, iconFlash: 0.45, duration: 0.16, ease: "power2.out" }, T.seamPulse.at);
  tl.to(s, {
    seamGlow: 0, iconFlash: 0,
    duration: T.seamPulse.dur - 0.16, ease: "power2.in",
  }, T.seamPulse.at + 0.16);
  tl.to(s, { head: intro.pathLength, duration: T.pour.dur, ease: "power2.inOut" }, T.pour.at);

  const arrive = T.pour.at + T.pour.dur;
  tl.to(s, { endGlow: 1, duration: 0.15, ease: "power2.out" }, arrive - 0.04);
  tl.to(s, { endGlow: 0, duration: 0.25, ease: "power2.in" }, arrive + 0.1);
  tl.to(s, { settle: 1, duration: 0.35, ease: "power2.out" }, arrive);
  tl.to(s, { fade: 1, duration: 0.35, ease: "power1.in" }, arrive + 0.08);

  // Wordmark and 3D wipe on after the printed line is established.
  tl.to(s, { wordR: 1, wordZ: 0, duration: T.word.dur, ease: "power2.out" }, T.word.at);
  tl.to(s, { threeR: 1, threeZ: 0, duration: T.three.dur, ease: "power2.out" }, T.three.at);

  const fadeAt = INTRO_DURATION - T.fadeOut;
  tl.to(fadeTarget, { opacity: 0, duration: T.fadeOut, ease: "power2.inOut" }, fadeAt);
  return tl;
}
