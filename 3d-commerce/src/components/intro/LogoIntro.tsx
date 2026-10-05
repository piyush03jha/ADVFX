"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import gsap from "gsap";
import { markIntroDone } from "@/lib/introGate";

const LOGO_W = 1251;
const LOGO_H = 328;

const LINE_D = "M 1007 264.8 H 201 A 36 36 0 0 1 165 228.8 V 204";
const LINE_WIDTH = 5.5;
const LINE_SAMPLES = 120;

// Set to true to play the intro only once per browser tab session.
const PLAY_ONCE_PER_SESSION = true;
const SESSION_KEY = "voxel-intro-played";

const SRC = {
  icon: "/logo/voxel-icon.svg",
  word: "/logo/voxel-word.svg",
  three: "/logo/voxel-3d.svg",
};

const SHOWN = "inset(0% 0% 0% 0%)";
const HIDDEN = {
  icon: "inset(59.5% 0% 0% 0%)",
  word: "inset(0% 75.5% 0% 0%)",
  three: "inset(0% 18.5% 0% 0%)",
};

const LAYER_WILL_CHANGE = "transform, opacity, clip-path";

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const glowARef = useRef<SVGPathElement>(null);
  const glowBRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const wordRef = useRef<HTMLImageElement>(null);
  const threeRef = useRef<HTMLImageElement>(null);
  const [show, setShow] = useState(true);

  // Start fetching the three layers as early as possible.
  preload(SRC.icon, { as: "image", fetchPriority: "high" });
  preload(SRC.word, { as: "image", fetchPriority: "high" });
  preload(SRC.three, { as: "image", fetchPriority: "high" });

  useEffect(() => {
    let seen = false;
    if (PLAY_ONCE_PER_SESSION) {
      try {
        seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        seen = false;
      }
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || seen) {
      setShow(false);
      markIntroDone();
      return;
    }

    const root = rootRef.current;
    const line = lineRef.current;
    const glowA = glowARef.current;
    const glowB = glowBRef.current;
    const head = headRef.current;
    const icon = iconRef.current;
    const word = wordRef.current;
    const three = threeRef.current;

    if (!root || !line || !glowA || !glowB || !head || !icon || !word || !three) {
      return;
    }

    let cancelled = false;
    let ctx: gsap.Context | undefined;

    // --- one-time setup (nothing expensive happens per frame) -------------
    const length = line.getTotalLength();
    const dashPaths = [line, glowA, glowB];

    for (const p of dashPaths) {
      p.style.strokeDasharray = String(length);
      p.style.strokeDashoffset = String(length);
    }

    // Sample the path once so the per-frame code never calls
    // getPointAtLength (which is slow).
    const xs = new Float32Array(LINE_SAMPLES + 1);
    const ys = new Float32Array(LINE_SAMPLES + 1);
    for (let i = 0; i <= LINE_SAMPLES; i += 1) {
      const pt = line.getPointAtLength((length * i) / LINE_SAMPLES);
      xs[i] = pt.x;
      ys[i] = pt.y;
    }

    const setHead = (progress: number) => {
      const f = Math.min(Math.max(progress, 0), 1) * LINE_SAMPLES;
      const i = Math.min(Math.floor(f), LINE_SAMPLES - 1);
      const t = f - i;
      const x = xs[i] + (xs[i + 1] - xs[i]) * t;
      const y = ys[i] + (ys[i + 1] - ys[i]) * t;
      head.setAttribute("transform", "translate(" + x + " " + y + ")");
    };
    setHead(0);

    const start = () => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        gsap.set(icon, { opacity: 0, clipPath: HIDDEN.icon, y: 10 });
        gsap.set(word, { opacity: 0, clipPath: HIDDEN.word, x: -18 });
        gsap.set(three, { opacity: 0, clipPath: HIDDEN.three, x: -10 });
        gsap.set(head, { opacity: 0 });

        const draw = { progress: 0 };

        const timeline = gsap.timeline({
          onComplete: () => {
            if (PLAY_ONCE_PER_SESSION) {
              try {
                window.sessionStorage.setItem(SESSION_KEY, "1");
              } catch {
                /* ignore */
              }
            }
            markIntroDone();
            setShow(false);
          },
        });

        timeline.set(head, { opacity: 1 }, 0.15);

        timeline.to(
          draw,
          {
            progress: 1,
            duration: 0.35,
            ease: "power2.inOut",
            onUpdate: () => {
              const offset = String(length * (1 - draw.progress));
              for (const p of dashPaths) p.style.strokeDashoffset = offset;
              setHead(draw.progress);
            },
          },
          0.15,
        );

        timeline.to(
          head,
          { opacity: 0, duration: 0.2, ease: "power2.out" },
          ">-0.05",
        );

        timeline.fromTo(
          icon,
          { clipPath: HIDDEN.icon, opacity: 0, y: 10 },
          {
            clipPath: SHOWN,
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power3.out",
          },
          ">-0.1",
        );

        timeline.fromTo(
          word,
          { clipPath: HIDDEN.word, opacity: 0, x: -18 },
          {
            clipPath: SHOWN,
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: "power3.out",
          },
          ">-0.2",
        );

        timeline.fromTo(
          three,
          { clipPath: HIDDEN.three, opacity: 0, x: -10 },
          {
            clipPath: SHOWN,
            opacity: 1,
            x: 0,
            duration: 0.55,
            ease: "power2.out",
          },
          ">-0.25",
        );

        timeline.to(
          root,
          { opacity: 0, duration: 0.3, ease: "power2.inOut" },
          "+=0.35",
        );
      }, root);
    };

    // Don't start until the three SVGs are loaded AND decoded. Otherwise the
    // browser rasterizes them in the middle of the animation = visible hitch.
    const decoded = Promise.all(
      [icon, word, three].map((img) => img.decode().catch(() => undefined)),
    );
    const timeout = new Promise<void>((resolve) =>
      window.setTimeout(resolve, 1500),
    );

    Promise.race([decoded, timeout]).then(() => {
      if (!cancelled) window.requestAnimationFrame(start);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  if (!show) return null;

  const layer = "absolute inset-0 h-full w-full select-none";

  return (
    <div
      id="voxel-intro"
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] grid place-items-center overflow-hidden bg-[#11131b]"
      style={{ willChange: "opacity" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,108,190,0.22),rgba(17,19,27,0.96)_68%)]" />

      <div
        className="relative w-[min(88vw,980px)]"
        style={{ aspectRatio: LOGO_W / LOGO_H }}
      >
        <img
          ref={iconRef}
          src={SRC.icon}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className={layer}
          style={{
            opacity: 0,
            clipPath: HIDDEN.icon,
            willChange: LAYER_WILL_CHANGE,
          }}
        />

        <img
          ref={wordRef}
          src={SRC.word}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className={layer}
          style={{
            opacity: 0,
            clipPath: HIDDEN.word,
            willChange: LAYER_WILL_CHANGE,
          }}
        />

        <img
          ref={threeRef}
          src={SRC.three}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className={layer}
          style={{
            opacity: 0,
            clipPath: HIDDEN.three,
            willChange: LAYER_WILL_CHANGE,
          }}
        />

        {/* No SVG filters here on purpose: feGaussianBlur re-runs every frame
            and was the main cause of the lag. Glow is faked with wider,
            translucent strokes and a radial gradient. */}
        <svg
          viewBox={"0 0 " + LOGO_W + " " + LOGO_H}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <radialGradient id="voxel-head-glow">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            ref={glowARef}
            d={LINE_D}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.1}
            strokeWidth={LINE_WIDTH * 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            ref={glowBRef}
            d={LINE_D}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.2}
            strokeWidth={LINE_WIDTH * 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            ref={lineRef}
            d={LINE_D}
            fill="none"
            stroke="#ffffff"
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g ref={headRef} opacity={0}>
            <circle r={26} fill="url(#voxel-head-glow)" />
            <circle r={5.5} fill="#ffffff" />
          </g>
        </svg>
      </div>
    </div>
  );
}
