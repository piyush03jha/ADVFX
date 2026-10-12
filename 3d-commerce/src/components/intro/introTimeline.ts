import gsap from "gsap";
import type { IntroScene } from "./introScene";

/** Intro choreography in seconds. */
export const TIMING = {
  iconIn: { at: 0, dur: 1.3 },
  camera: { at: 0.15, dur: 3.1 },
  seamPulse: { at: 0.95, dur: 0.75 },
  pour: { at: 1, dur: 1.7 },
  word: { at: 2.3, dur: 0.95 },
  three: { at: 2.65, dur: 0.55 },
  hold: 0.8,
  fadeOut: 0.45,
} as const;

export const INTRO_DURATION =
  Math.max(
    TIMING.camera.at + TIMING.camera.dur,
    TIMING.word.at + TIMING.word.dur,
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

  tl.to(
    s,
    {
      iconX: 0,
      iconZ: 0,
      iconRot: 0,
      duration: T.iconIn.dur,
      ease: "power3.out",
    },
    T.iconIn.at,
  );

  tl.to(
    s,
    {
      az: 0,
      el: 0,
      k: 1,
      tx: 0,
      ty: 0,
      duration: T.camera.dur,
      ease: "power3.inOut",
    },
    T.camera.at,
  );

  tl.to(
    s,
    { seamGlow: 1, iconFlash: 0.45, duration: 0.2, ease: "power2.out" },
    T.seamPulse.at,
  );
  tl.to(
    s,
    {
      seamGlow: 0,
      iconFlash: 0,
      duration: T.seamPulse.dur - 0.2,
      ease: "power2.in",
    },
    T.seamPulse.at + 0.2,
  );
  tl.to(
    s,
    { head: intro.pathLength, duration: T.pour.dur, ease: "power2.inOut" },
    T.pour.at,
  );

  const arrive = T.pour.at + T.pour.dur;
  tl.to(
    s,
    { endGlow: 1, duration: 0.18, ease: "power2.out" },
    arrive - 0.05,
  );
  tl.to(
    s,
    { endGlow: 0, duration: 0.35, ease: "power2.in" },
    arrive + 0.13,
  );
  tl.to(s, { settle: 1, duration: 0.45, ease: "power2.out" }, arrive);
  tl.to(s, { fade: 1, duration: 0.5, ease: "power1.in" }, arrive + 0.1);

  tl.to(
    s,
    { wordR: 1, wordZ: 0, duration: T.word.dur, ease: "power2.out" },
    T.word.at,
  );
  tl.to(
    s,
    { threeR: 1, threeZ: 0, duration: T.three.dur, ease: "power2.out" },
    T.three.at,
  );

  const fadeAt = INTRO_DURATION - T.fadeOut;
  tl.to(
    fadeTarget,
    { opacity: 0, duration: T.fadeOut, ease: "power2.inOut" },
    fadeAt,
  );

  return tl;
}
