"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Turns bursty real progress into a bar that always feels like it is travelling.
 *
 *  - the shown value eases toward the real one instead of jumping;
 *  - while real progress is stalled (or has not started) it keeps creeping slowly
 *    toward `ceiling`, so the bar is never frozen;
 *  - it never passes `ceiling` until `done` is true, so 100 only ever means "ready".
 */
export function useSmoothProgress(target: number, ceiling: number, done: boolean) {
  const [shown, setShown] = useState(0);
  const valueRef = useRef(0);
  const targetRef = useRef(target);
  const ceilingRef = useRef(ceiling);
  const doneRef = useRef(done);

  useEffect(() => {
    targetRef.current = target;
    ceilingRef.current = ceiling;
    doneRef.current = done;
  }, [target, ceiling, done]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const cap = doneRef.current ? 100 : ceilingRef.current;
      const goal = doneRef.current ? 100 : Math.min(targetRef.current, cap);
      let value = valueRef.current;

      if (value < goal) {
        // Ease toward the real value (faster when done, so 100 arrives promptly).
        value += (goal - value) * (1 - Math.exp(-dt / (doneRef.current ? 0.08 : 0.3)));
      } else if (!doneRef.current && value < cap) {
        // Real progress is waiting on the network / decoder: keep creeping.
        value += Math.min(cap - value, dt * 0.9 * (1 - value / cap) * 3);
      }

      value = Math.min(value, cap);
      if (Math.abs(value - valueRef.current) > 0.05) {
        valueRef.current = value;
        setShown(value);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return Math.round(shown);
}
