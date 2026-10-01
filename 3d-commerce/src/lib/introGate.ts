"use client";

import { useEffect, useState } from "react";

const EVENT = "voxel:intro-done";
const FLAG = "__voxelIntroDone";
const INTRO_ID = "voxel-intro";

type FlagWindow = Window & { [FLAG]?: boolean };

/** Called by LogoIntro when it finishes (or is skipped). */
export function markIntroDone() {
  (window as FlagWindow)[FLAG] = true;
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Returns true once the logo intro is over. Use it to delay heavy work
 * (WebGL canvases, GLTF parsing) so it doesn't fight the intro for the main thread.
 *
 * Safe fallbacks: if no intro is on screen (e.g. /admin, or a client-side
 * navigation after the intro already played) it returns true immediately,
 * and a 4s timer guarantees nothing waits forever.
 */
export function useIntroDone() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (
      (window as FlagWindow)[FLAG] ||
      !document.getElementById(INTRO_ID)
    ) {
      setDone(true);
      return;
    }

    const finish = () => setDone(true);
    window.addEventListener(EVENT, finish, { once: true });
    const safety = window.setTimeout(finish, 4000);

    return () => {
      window.removeEventListener(EVENT, finish);
      window.clearTimeout(safety);
    };
  }, []);

  return done;
}
