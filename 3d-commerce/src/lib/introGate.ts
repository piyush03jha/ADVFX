"use client";

const EVENT = "voxel:intro-done";
const FLAG = "__voxelIntroDone";

type FlagWindow = Window & { [FLAG]?: boolean };

/** Called by LogoIntro when it finishes (or is skipped). */
export function markIntroDone() {
  (window as FlagWindow)[FLAG] = true;
  window.dispatchEvent(new Event(EVENT));
}
