"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { markIntroDone } from "@/lib/introGate";
import { createIntroScene } from "./introScene";
import { createIntroTimeline } from "./introTimeline";

// Play the intro once, on a visitor's first visit; replaying it on every page
// load delayed the hero and made the site feel slow. The flag lives in
// localStorage (survives closing the tab) with sessionStorage as a fallback.
// Open the site with ?intro=1 to force a replay while testing.
const PLAYED_KEY = "voxel-intro-played";
const TEXTURE_TIMEOUT_MS = 2500;
const FALLBACK_HOLD_MS = 850;

function hasPlayed(): boolean {
  for (const getStore of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      if (getStore().getItem(PLAYED_KEY) === "1") return true;
    } catch {
      // Storage can be unavailable (private mode, blocked cookies).
    }
  }
  return false;
}

function markPlayed() {
  for (const getStore of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      getStore().setItem(PLAYED_KEY, "1");
    } catch {
      // Ignore: worst case the intro replays on the next visit.
    }
  }
}

const TEXTURE_PATHS = {
  icon: "/logo/icon.webp",
  word: "/logo/word.webp",
  line: "/logo/line.webp",
  three: "/logo/three.webp",
} as const;

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  // Static logo shown instead of the WebGL animation when the visitor prefers
  // reduced motion or WebGL / texture loading fails, so first-time visitors
  // still see the brand once instead of nothing.
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).has("intro");

    if (!forced && hasPlayed()) {
      setShow(false);
      markIntroDone();
      return;
    }

    const root = rootRef.current;
    const host = canvasHostRef.current;
    if (!root || !host) return;

    let cancelled = false;
    let fallbackTimer = 0;
    let textureTimer = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      markPlayed();
      markIntroDone();
      setShow(false);
    };

    const playFallback = () => {
      if (cancelled || finished) return;
      window.clearTimeout(textureTimer);
      setFallback(true);
      setShow(true);
      fallbackTimer = window.setTimeout(() => {
        root.style.transition = "opacity 350ms ease";
        root.style.opacity = "0";
        fallbackTimer = window.setTimeout(finish, 380);
      }, FALLBACK_HOLD_MS);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      playFallback();
      return () => {
        cancelled = true;
        window.clearTimeout(fallbackTimer);
      };
    }

    // If the textures never arrive (slow network, blocked request), do not leave
    // the visitor on a blank overlay.
    textureTimer = window.setTimeout(playFallback, TEXTURE_TIMEOUT_MS);
    let frame = 0;
    let renderer: THREE.WebGLRenderer | undefined;
    let intro: ReturnType<typeof createIntroScene> | undefined;
    let timeline: ReturnType<typeof createIntroTimeline> | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let textures: THREE.Texture[] = [];
    const clock = new THREE.Clock();

    const loader = new THREE.TextureLoader();
    const loadTexture = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });

    // Show the dark intro overlay immediately. It stays blank while textures and
    // the WebGL scene initialize, then the animation starts once the first frame is ready.
    Promise.all([
      loadTexture(TEXTURE_PATHS.icon),
      loadTexture(TEXTURE_PATHS.word),
      loadTexture(TEXTURE_PATHS.line),
      loadTexture(TEXTURE_PATHS.three),
    ])
      .then(([icon, word, line, three]) => {
        window.clearTimeout(textureTimer);
        textures = [icon, word, line, three];
        if (cancelled) {
          textures.forEach((texture) => texture.dispose());
          return;
        }

        renderer = new THREE.WebGLRenderer({
          alpha: false,
          antialias: window.devicePixelRatio < 2,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor("#11131b", 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        host.appendChild(renderer.domElement);

        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        intro = createIntroScene({ icon, word, line, three }, maxAnisotropy);

        const resize = () => {
          if (!renderer || !intro || !host) return;
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer.setSize(width, height, false);
          intro.fit(width, height);
          intro.apply(clock.getElapsedTime());
          renderer.render(intro.scene, intro.camera);
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        timeline = createIntroTimeline(intro, root, finish);

        const animate = () => {
          if (cancelled || !renderer || !intro) return;
          frame = window.requestAnimationFrame(animate);
          const time = clock.getElapsedTime();
          intro.apply(time);
          renderer.render(intro.scene, intro.camera);
        };

        // Reveal the overlay only after textures are loaded and the first scene
        // frame has been rendered, so users never see an empty intro canvas.
        setShow(true);
        frame = window.requestAnimationFrame(animate);
        timeline.play(0);
        // Count the intro as played as soon as it starts, so a reload mid-way
        // does not loop it for the same visitor.
        markPlayed();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Voxel3D logo intro failed to load:", error);
        // Tear down any half-built WebGL state, then show the static logo.
        renderer?.domElement.remove();
        playFallback();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(textureTimer);
      window.clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      timeline?.kill();
      intro?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      if (!intro) textures.forEach((texture) => texture.dispose());
    };
  }, []);

  return (
    <div
      id="voxel-intro"
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] overflow-hidden bg-[#11131b]"
      style={{
        opacity: 1,
        visibility: show ? "visible" : "hidden",
        willChange: "opacity",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,108,190,0.22),rgba(17,19,27,0.96)_68%)]" />
      <div ref={canvasHostRef} className="absolute inset-0" />
      {fallback && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo/full_logo.png"
          alt=""
          className="absolute left-1/2 top-1/2 w-[min(70vw,420px)] -translate-x-1/2 -translate-y-1/2"
        />
      )}
    </div>
  );
}
