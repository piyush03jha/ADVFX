"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const INTRO_KEY = "voxel3d-logo-intro-seen";

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const logo = logoRef.current;
    const mark = markRef.current;
    const beam = beamRef.current;
    const glow = glowRef.current;

    if (!root || !logo || !mark || !beam || !glow) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = window.sessionStorage.getItem(INTRO_KEY) === "1";

    if (alreadySeen) {
      root.remove();
      return;
    }

    const finish = () => {
      if (cancelled) return;
      window.sessionStorage.setItem(INTRO_KEY, "1");

      const exit = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          root.remove();
        },
      });

      exit
        .to(root, { opacity: 0, duration: reduced ? 0.01 : 0.28 })
        .set(root, { pointerEvents: "none" });
    };

    if (reduced) {
      gsap.set([logo, mark, beam, glow], {
        opacity: 1,
        clearProps: "transform,filter",
      });
      timeoutId = window.setTimeout(finish, 320);
      return () => {
        cancelled = true;
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    // Keep the full logo artwork intact. The visual choreography is done
    // with an overflow reveal, layered depth, and a short camera-like push.
    gsap.set(root, { opacity: 1 });
    gsap.set(logo, {
      opacity: 0,
      scale: 0.76,
      x: 0,
      y: 14,
      rotateX: -18,
      rotateY: 14,
      transformPerspective: 1200,
      filter: "blur(10px)",
    });
    gsap.set(mark, {
      opacity: 0,
      scale: 0.62,
      rotate: -8,
      transformOrigin: "50% 50%",
    });
    gsap.set(beam, {
      scaleX: 0,
      transformOrigin: "0% 50%",
    });
    gsap.set(glow, {
      opacity: 0,
      scale: 0.55,
    });

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        timeoutId = window.setTimeout(finish, 80);
      },
    });

    tl.to(glow, {
        opacity: 1,
        scale: 1,
        duration: 0.34,
        ease: "power2.out",
      })
      .to(
        mark,
        {
          opacity: 1,
          scale: 1,
          rotate: 0,
          duration: 0.42,
          ease: "back.out(1.45)",
        },
        "-=0.18",
      )
      .to(
        logo,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          filter: "blur(0px)",
          duration: 0.62,
          ease: "power3.out",
        },
        "-=0.24",
      )
      .to(
        beam,
        {
          scaleX: 1,
          duration: 0.42,
          ease: "power2.out",
        },
        "-=0.28",
      )
      .to(
        glow,
        {
          opacity: 0.45,
          scale: 1.08,
          duration: 0.35,
          ease: "sine.out",
        },
        "-=0.25",
      )
      .to(
        [logo, mark],
        {
          scale: 1.025,
          duration: 0.18,
          ease: "power2.out",
        },
        "-=0.18",
      )
      .to(
        [logo, mark],
        {
          scale: 1,
          duration: 0.22,
          ease: "power2.inOut",
        },
      )
      .to(
        root,
        {
          opacity: 0.98,
          duration: 0.12,
        },
        "+=0.01",
      );

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      tl.kill();
      gsap.killTweensOf([root, logo, mark, beam, glow]);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-background"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute h-[42vw] w-[42vw] min-h-[240px] min-w-[240px] max-h-[560px] max-w-[560px] rounded-full bg-primary/20 blur-[80px]"
      />

      <div className="relative w-[min(78vw,760px)] max-w-[760px]">
        <div
          ref={markRef}
          className="absolute left-1/2 top-1/2 h-[72%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-[28%] border border-primary/20 bg-primary/[0.025] blur-[0.2px]"
        />

        <div
          className="relative overflow-hidden rounded-[2rem]"
          style={{
            clipPath: "inset(0 round 2rem)",
            transformStyle: "preserve-3d",
          }}
        >
          <img
            ref={logoRef}
            src="/logo/voxel3d-top.svg"
            alt=""
            draggable={false}
            className="relative z-10 h-auto w-full select-none"
          />

          <div
            ref={beamRef}
            className="absolute left-[9%] right-[8%] top-1/2 z-20 h-px bg-primary/70 shadow-[0_0_24px_var(--glow-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
