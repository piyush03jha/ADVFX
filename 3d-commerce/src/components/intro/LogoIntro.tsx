"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { markIntroDone } from "@/lib/introGate";
import { createIntroScene } from "./introScene";
import { createIntroTimeline } from "./introTimeline";

const PLAY_ONCE_PER_SESSION = false;
const SESSION_KEY = "voxel-intro-played";

const TEXTURE_PATHS = {
  icon: "/logo/icon.webp",
  word: "/logo/word.webp",
  line: "/logo/line.webp",
  three: "/logo/three.webp",
} as const;

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    if (PLAY_ONCE_PER_SESSION) {
      try {
        seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        seen = false;
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || seen) {
      setShow(false);
      markIntroDone();
      return;
    }

    const root = rootRef.current;
    const host = canvasHostRef.current;
    if (!root || !host) return;

    let cancelled = false;
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

    // Start loading the intro textures immediately; the visible overlay stays hidden
    // until the first frame can be rendered, avoiding a blank opening frame.
    Promise.all([
      loadTexture(TEXTURE_PATHS.icon),
      loadTexture(TEXTURE_PATHS.word),
      loadTexture(TEXTURE_PATHS.line),
      loadTexture(TEXTURE_PATHS.three),
    ])
      .then(([icon, word, line, three]) => {
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

        timeline = createIntroTimeline(intro, root, () => {
          if (PLAY_ONCE_PER_SESSION) {
            try {
              window.sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              // Storage can be unavailable in private browsing.
            }
          }
          markIntroDone();
          setShow(false);
        });

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
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Voxel3D logo intro failed to load:", error);
        markIntroDone();
        setShow(false);
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      timeline?.kill();
      intro?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      if (!intro) textures.forEach((texture) => texture.dispose());
    };
  }, []);

  if (!show) return null;

  return (
    <div
      id="voxel-intro"
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] overflow-hidden bg-[#11131b]"
      style={{ opacity: 1, willChange: "opacity" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,108,190,0.22),rgba(17,19,27,0.96)_68%)]" />
      <div ref={canvasHostRef} className="absolute inset-0" />
    </div>
  );
}
