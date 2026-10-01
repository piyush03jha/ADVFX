"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const LOGO_W = 1251;
const LOGO_H = 328;

const LINE_D = "M 1007 264.8 H 201 A 36 36 0 0 1 165 228.8 V 204";
const LINE_WIDTH = 5.5;

const SHOWN = "inset(0% 0% 0% 0%)";

const HIDDEN = {
  icon: "inset(59.5% 0% 0% 0%)",
  word: "inset(0% 75.5% 0% 0%)",
  three: "inset(0% 18.5% 0% 0%)",
};

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const wordRef = useRef<HTMLImageElement>(null);
  const threeRef = useRef<HTMLImageElement>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      return;
    }

    const root = rootRef.current;
    const line = lineRef.current;
    const glow = glowRef.current;
    const head = headRef.current;
    const icon = iconRef.current;
    const word = wordRef.current;
    const three = threeRef.current;

    if (!root || !line || !glow || !head || !icon || !word || !three) {
      return;
    }

    const length = line.getTotalLength();

    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(length);
    glow.style.strokeDasharray = String(length);
    glow.style.strokeDashoffset = String(length);

    gsap.set(icon, { opacity: 0, clipPath: HIDDEN.icon, y: 10 });
    gsap.set(word, { opacity: 0, clipPath: HIDDEN.word, x: -18 });
    gsap.set(three, { opacity: 0, clipPath: HIDDEN.three, x: -10 });
    gsap.set(head, { opacity: 0 });

    const context = gsap.context(() => {
      const draw = { progress: 0 };

      const timeline = gsap.timeline({
        onComplete: () => setShow(false),
      });

      timeline.set(head, { opacity: 1 }, 0.15);

      timeline.to(
        draw,
        {
          progress: 1,
          duration: 1.3,
          ease: "power2.inOut",
          onUpdate: () => {
            const currentLength = draw.progress * length;
            const dashOffset = length - currentLength;

            line.style.strokeDashoffset = String(dashOffset);
            glow.style.strokeDashoffset = String(dashOffset);

            const point = line.getPointAtLength(currentLength);
            head.setAttribute("cx", String(point.x));
            head.setAttribute("cy", String(point.y));
          },
        },
        0.15,
      );

      timeline.to(
        head,
        { opacity: 0, duration: 0.25, ease: "power2.out" },
        ">-0.05",
      );

      timeline.fromTo(
        icon,
        { clipPath: HIDDEN.icon, opacity: 0, y: 10 },
        {
          clipPath: SHOWN,
          opacity: 1,
          y: 0,
          duration: 0.7,
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
        { opacity: 0, duration: 0.5, ease: "power2.inOut" },
        "+=0.8",
      );
    }, root);

    return () => context.revert();
  }, []);

  if (!show) return null;

  const layer = "absolute inset-0 h-full w-full select-none";

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] grid place-items-center overflow-hidden bg-[#11131b]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,108,190,0.22),rgba(17,19,27,0.96)_68%)]" />

      <div
        className="relative w-[min(88vw,980px)]"
        style={{ aspectRatio: LOGO_W / LOGO_H }}
      >
        <img
          ref={iconRef}
          src="/logo/voxel-icon.svg"
          alt=""
          draggable={false}
          className={layer}
          style={{ opacity: 0, clipPath: HIDDEN.icon }}
        />

        <img
          ref={wordRef}
          src="/logo/voxel-word.svg"
          alt=""
          draggable={false}
          className={layer}
          style={{ opacity: 0, clipPath: HIDDEN.word }}
        />

        <img
          ref={threeRef}
          src="/logo/voxel-3d.svg"
          alt=""
          draggable={false}
          className={layer}
          style={{ opacity: 0, clipPath: HIDDEN.three }}
        />

        <svg
          viewBox={"0 0 " + LOGO_W + " " + LOGO_H}
          className="absolute inset-0 h-full w-full overflow-visible pointer-events-none"
        >
          <defs>
            <filter
              id="voxel-line-glow"
              filterUnits="userSpaceOnUse"
              x="-100"
              y="-100"
              width={LOGO_W + 200}
              height={LOGO_H + 200}
            >
              <feGaussianBlur stdDeviation="5" />
            </filter>

            <filter
              id="voxel-head-glow"
              filterUnits="userSpaceOnUse"
              x="-100"
              y="-100"
              width={LOGO_W + 200}
              height={LOGO_H + 200}
            >
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <path
            ref={glowRef}
            d={LINE_D}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.4}
            strokeWidth={LINE_WIDTH * 2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#voxel-line-glow)"
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

          <circle
            ref={headRef}
            cx={1007}
            cy={264.8}
            r={7}
            fill="#ffffff"
            filter="url(#voxel-head-glow)"
            opacity={0}
          />
        </svg>
      </div>
    </div>
  );
}
