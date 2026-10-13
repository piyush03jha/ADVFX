import * as THREE from "three";
import { LOGO } from "./logoLayout";

/**
 * Everything the logo intro draws, and nothing about React or timing.
 *
 *   createIntroScene(textures) -> { scene, camera, state, fit, apply, dispose }
 *
 * The timeline (in LogoIntro.tsx) tweens the plain numbers on `state`; each
 * frame `apply(time)` copies them into the scene. That keeps gsap fast (it
 * only touches a plain object) and keeps every 3D detail in one place.
 */

export interface IntroTextures {
  icon: THREE.Texture;
  word: THREE.Texture;
  line: THREE.Texture;
  three: THREE.Texture;
}

export interface IntroState {
  // camera orbit around the logo centre
  az: number; // radians, 0 = looking straight at the logo
  el: number; // radians, 0 = level
  k: number; // distance multiplier, 1 = final framing
  tx: number; // point the camera looks at (logo units); (0, 0) at the end
  ty: number;
  trackX: number;
  fov: number;
  roll: number;
  streak: number;
  // icon flight
  iconX: number; // x offset in logo units (negative = off to the left)
  iconZ: number;
  iconRot: number; // rotation about its own vertical axis (radians)
  iconTilt: number;
  iconFlash: number; // 0..1 white flash
  // the pour
  head: number; // position of the liquid front along the path (units)
  settle: number; // 0..1: stream thins and merges into the printed line
  fade: number; // 0..1: stream dissolves completely
  seamGlow: number; // 0..1 glow where the liquid leaves the icon
  endGlow: number; // 0..1 glow where the liquid arrives
  // text reveals
  wordR: number;
  wordZ: number;
  threeR: number;
  threeZ: number;
}

export const FOV = 30;

// Where inside the icon the pour starts, measured up from the icon's bottom.
const SEAM_INSIDE = 55;
// Look of the liquid.
const STREAM_RADIUS = (LOGO.path.thickness / 2) * 1.35;
const REVEAL_LAG = 50; // printed line is revealed this far behind the front

const PLANE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PLANE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uReveal;
uniform float uFlash;
uniform float uMode;   // 0 = plain, 1 = wipe left->right, 2 = follow the path
uniform vec2  uSize;   // layer size in units
uniform vec4  uP1;     // xv, y0, yb, yh
uniform vec4  uP2;     // rx, ry, verticalLength, arcLength
varying vec2 vUv;

float pathS(vec2 p) {
  float xv = uP1.x;
  float yb = uP1.z;
  if (p.y < yb) return p.y - uP1.y;
  float cx = xv + uP2.x;
  if (p.x < cx) {
    float t = atan((p.y - yb) / uP2.y, (cx - p.x) / uP2.x);
    t = clamp(t, 0.0, 1.5707963);
    return uP2.z + uP2.w * t / 1.5707963;
  }
  return uP2.z + uP2.w + (p.x - cx);
}

void main() {
  vec4 c = texture2D(uMap, vUv);
  float m = 1.0;
  float sheen = 0.0;

  if (uMode > 1.5) {
    vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
    m = 1.0 - smoothstep(uReveal - 10.0, uReveal, pathS(p));
  } else if (uMode > 0.5) {
    float e = 0.12;
    float r = uReveal * (1.0 + e);
    m = 1.0 - smoothstep(r - e, r, vUv.x);
    float d = (vUv.x - (r - e * 0.5)) / (e * 0.5);
    sheen = exp(-d * d) * (1.0 - step(1.0 + e, r));
  }

  vec3 col = mix(c.rgb, vec3(1.0), clamp(sheen * 0.7 + uFlash, 0.0, 1.0));
  gl_FragColor = vec4(col, c.a * m * uOpacity);
}
`;

const TUBE_VERT = /* glsl */ `
uniform float uHead;
uniform float uTime;
uniform float uR;
uniform float uScale;
uniform float uFade;
attribute vec3 aCenter;
attribute vec3 aDir;
attribute float aS;
varying vec3 vN;
varying vec3 vView;

void main() {
  float d = uHead - aS;            // distance behind the liquid front
  float r = 0.0;
  if (d > 0.0) {
    float cap = 26.0;
    float k = clamp(d / cap, 0.0, 1.0);
    float capShape = sqrt(1.0 - (1.0 - k) * (1.0 - k));        // round front
    float body = uR * (0.65 + exp(-d / 140.0));                 // fat near the front
    float q = (d - cap * 0.9) / 38.0;
    float blob = 1.0 + 0.7 * exp(-q * q);
    float tail = 1.0 - smoothstep(170.0, 330.0, d);             // dissolves behind
    float root = smoothstep(0.0, 40.0, aS);                     // closed where it leaves the icon
    r = body * blob * capShape * tail * root * (1.0 - uFade);
  }
  float w = sin(aS * 0.045 - uTime * 9.0) * exp(-max(d, 0.0) / 180.0);
  vec3 center = aCenter + vec3(0.0, w * 2.5, w * 7.0);
  vec3 pos = center + aDir * r * uScale;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vN = normalize(normalMatrix * aDir);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const TUBE_FRAG = /* glsl */ `
uniform float uGlow;
varying vec3 vN;
varying vec3 vView;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(vView);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  if (uGlow > 0.5) {
    float a = pow(ndv, 1.4) * 0.2;
    gl_FragColor = vec4(0.58, 0.48, 1.0, a);
    return;
  }
  vec3 L = normalize(vec3(0.35, 0.6, 0.7));
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 48.0);
  float rim = pow(1.0 - ndv, 2.2);
  vec3 col = vec3(0.93, 0.94, 1.0) * (0.72 + 0.28 * ndl)
           + vec3(0.55, 0.45, 1.0) * rim * 0.55
           + vec3(1.0) * spec * 0.9;
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeGlowTexture(): THREE.DataTexture {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const dx = (x + 0.5) / n - 0.5;
      const dy = (y + 0.5) / n - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const a = Math.max(0, 1 - r);
      const v = Math.pow(a, 2.2);
      const i = (y * n + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(v * 255);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface PathData {
  points: THREE.Vector3[];
  total: number;
  ext: number; // length of the part that sits inside the icon
  lineLength: number; // length of the printed line
}

/** Samples the connector (plus the short run inside the icon) at even spacing. */
function buildPath(samples: number): PathData {
  const { line, icon } = LOGO.layers;
  const p = LOGO.path;
  const ox = line.cx - line.w / 2;
  const oy = line.cy + line.h / 2;
  const toWorld = (lx: number, ly: number) => new THREE.Vector3(ox + lx, oy - ly, 0);

  const startY = icon.cy - icon.h / 2 + SEAM_INSIDE;
  const ext = startY - oy;

  const dense: THREE.Vector3[] = [];
  dense.push(toWorld(p.xv, p.y0 - ext));
  dense.push(toWorld(p.xv, p.yb));
  const arcSteps = 64;
  for (let i = 1; i <= arcSteps; i += 1) {
    const t = (i / arcSteps) * (Math.PI / 2);
    dense.push(toWorld(p.xv + p.rx - p.rx * Math.cos(t), p.yb + p.ry * Math.sin(t)));
  }
  dense.push(toWorld(p.xe, p.yh));

  const cum: number[] = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cum.push(cum[i - 1] + dense[i].distanceTo(dense[i - 1]));
  }
  const total = cum[cum.length - 1];

  const points: THREE.Vector3[] = [];
  let seg = 1;
  for (let i = 0; i <= samples; i += 1) {
    const s = (total * i) / samples;
    while (seg < cum.length - 1 && cum[seg] < s) seg += 1;
    const span = cum[seg] - cum[seg - 1] || 1;
    const t = (s - cum[seg - 1]) / span;
    points.push(dense[seg - 1].clone().lerp(dense[seg], t));
  }
  return { points, total, ext, lineLength: total - ext };
}

function buildTubeGeometry(path: PathData, ring: number): THREE.BufferGeometry {
  const n = path.points.length;
  const pos = new Float32Array(n * ring * 3);
  const center = new Float32Array(n * ring * 3);
  const dir = new Float32Array(n * ring * 3);
  const arc = new Float32Array(n * ring);

  for (let i = 0; i < n; i += 1) {
    const a = path.points[Math.max(i - 1, 0)];
    const b = path.points[Math.min(i + 1, n - 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const s = (path.total * i) / (n - 1);
    for (let j = 0; j < ring; j += 1) {
      const phi = (j / ring) * Math.PI * 2;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const k = (i * ring + j) * 3;
      const P = path.points[i];
      pos[k] = center[k] = P.x;
      pos[k + 1] = center[k + 1] = P.y;
      pos[k + 2] = center[k + 2] = P.z;
      dir[k] = nx * c;
      dir[k + 1] = ny * c;
      dir[k + 2] = sn;
      arc[i * ring + j] = s;
    }
  }

  const index: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = 0; j < ring; j += 1) {
      const j2 = (j + 1) % ring;
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + j2;
      const d = i * ring + j2;
      index.push(a, b, d, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
  g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
  g.setAttribute("aS", new THREE.BufferAttribute(arc, 1));
  g.setIndex(index);
  return g;
}


/** Deterministic, low-cost speed streaks for the cinematic chase shot. */
function buildStreaks(count: number): THREE.Mesh {
  let seed = 1337;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pos = new Float32Array(count * 12);
  const col = new Float32Array(count * 12);
  const index: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = -2400 + rnd() * 6800, y = (rnd() - 0.5) * 1500;
    const z = -900 + rnd() * 1500, len = 180 + rnd() * 520;
    const w = 1.5 + rnd() * 3.5, b = 0.25 + rnd() * 0.75, v = i * 4;
    pos.set([x,y-w/2,z, x,y+w/2,z, x+len,y+w/2,z, x+len,y-w/2,z], v*3);
    col.set([0,0,0, 0,0,0, 0.72*b,0.64*b,b, 0.72*b,0.64*b,b], v*3);
    index.push(v,v+1,v+2,v,v+2,v+3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

export interface IntroScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  state: IntroState;
  pathLength: number;
  fit: (width: number, height: number) => void;
  apply: (time: number) => void;
  /** Frees every geometry, material and texture. Safe to call once. */
  dispose: () => void;
}

export function createIntroScene(
  textures: IntroTextures,
  maxAnisotropy = 1,
): IntroScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 50, 20000);
  const disposables: { dispose: () => void }[] = [];
  const streaks = buildStreaks(170);
  disposables.push(streaks.geometry, streaks.material as THREE.Material);
  scene.add(streaks);

  for (const tex of Object.values(textures)) {
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = Math.min(8, maxAnisotropy);
    tex.needsUpdate = true;
    disposables.push(tex);
  }

  const path = buildPath(400);
  const P = LOGO.path;
  const arcLen = (() => {
    let len = 0;
    let px: number = P.xv;
    let py: number = P.yb;
    for (let i = 1; i <= 64; i += 1) {
      const t = (i / 64) * (Math.PI / 2);
      const x = P.xv + P.rx - P.rx * Math.cos(t);
      const y = P.yb + P.ry * Math.sin(t);
      len += Math.hypot(x - px, y - py);
      px = x;
      py = y;
    }
    return len;
  })();

  // ---- layers ----------------------------------------------------------
  const makeLayerMaterial = (map: THREE.Texture, mode: number, w: number, h: number) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uOpacity: { value: 1 },
        uReveal: { value: 0 },
        uFlash: { value: 0 },
        uMode: { value: mode },
        uSize: { value: new THREE.Vector2(w, h) },
        uP1: { value: new THREE.Vector4(P.xv, P.y0, P.yb, P.yh) },
        uP2: { value: new THREE.Vector4(P.rx, P.ry, P.yb - P.y0, arcLen) },
      },
      vertexShader: PLANE_VERT,
      fragmentShader: PLANE_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    disposables.push(m);
    return m;
  };

  const makePlane = (
    key: keyof IntroTextures,
    mode: number,
    order: number,
  ) => {
    const L = LOGO.layers[key];
    const geo = new THREE.PlaneGeometry(L.w, L.h);
    disposables.push(geo);
    const mat = makeLayerMaterial(textures[key], mode, L.w, L.h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = order;
    mesh.frustumCulled = false;
    return { mesh, mat };
  };

  const line = makePlane("line", 2, 1);
  line.mesh.position.set(LOGO.layers.line.cx, LOGO.layers.line.cy, 0);
  scene.add(line.mesh);

  const icon = makePlane("icon", 0, 2);
  const iconPivot = new THREE.Group();
  iconPivot.add(icon.mesh);
  scene.add(iconPivot);

  const word = makePlane("word", 1, 3);
  const wordPivot = new THREE.Group();
  wordPivot.add(word.mesh);
  scene.add(wordPivot);

  const three = makePlane("three", 1, 4);
  const threePivot = new THREE.Group();
  three.mesh.position.set(0, 0, 0);
  threePivot.add(three.mesh);
  scene.add(threePivot);

  // ---- the pour --------------------------------------------------------
  const tubeGeo = buildTubeGeometry(path, 14);
  disposables.push(tubeGeo);

  const tubeUniforms = {
    uHead: { value: 0 },
    uTime: { value: 0 },
    uR: { value: STREAM_RADIUS },
    uScale: { value: 1 },
    uFade: { value: 0 },
    uGlow: { value: 0 },
  };

  const core = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(tubeUniforms),
    vertexShader: TUBE_VERT,
    fragmentShader: TUBE_FRAG,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
  });
  const halo = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone({ ...tubeUniforms, uScale: { value: 3.4 }, uGlow: { value: 1 } }),
    vertexShader: TUBE_VERT,
    fragmentShader: TUBE_FRAG,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposables.push(core, halo);

  const tubeCore = new THREE.Mesh(tubeGeo, core);
  tubeCore.renderOrder = 10;
  tubeCore.frustumCulled = false;
  const tubeHalo = new THREE.Mesh(tubeGeo, halo);
  tubeHalo.renderOrder = 11;
  tubeHalo.frustumCulled = false;
  scene.add(tubeCore, tubeHalo);

  // ---- glows -----------------------------------------------------------
  const glowTex = makeGlowTexture();
  disposables.push(glowTex);
  const makeGlow = () => {
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    disposables.push(mat);
    const s = new THREE.Sprite(mat);
    s.renderOrder = 12;
    s.frustumCulled = false;
    s.visible = false;
    scene.add(s);
    return s;
  };
  const headGlow = makeGlow();
  const seamGlow = makeGlow();
  const endGlow = makeGlow();
  seamGlow.position.copy(path.points[0]);
  endGlow.position.copy(path.points[path.points.length - 1]);

  // ---- state & per-frame application ----------------------------------
  const state: IntroState = {
    az: 0.8,
    el: 0.1,
    k: 0.32,
    tx: path.points[0].x,
    ty: path.points[0].y,
    trackX: 2800,
    fov: 48,
    roll: -0.05,
    streak: 1,
    iconX: 2800,
    iconZ: 0,
    iconRot: 0.45,
    iconTilt: -0.2,
    iconFlash: 0,
    head: 0,
    settle: 0,
    fade: 0,
    seamGlow: 0,
    endGlow: 0,
    wordR: 0,
    wordZ: -140,
    threeR: 0,
    threeZ: -90,
  };

  let baseDist = 3000;
  const fit = (width: number, height: number) => {
    camera.aspect = width / height;
    const targetPx = Math.min(0.88 * width, 980);
    const visibleW = (LOGO.W * width) / targetPx;
    const visibleH = visibleW / camera.aspect;
    baseDist = visibleH / (2 * Math.tan((FOV * Math.PI) / 360));
    camera.updateProjectionMatrix();
  };

  const headPosition = (s: number, out: THREE.Vector3) => {
    const f = (Math.min(Math.max(s, 0), path.total) / path.total) * (path.points.length - 1);
    const i = Math.min(Math.floor(f), path.points.length - 2);
    return out.copy(path.points[i]).lerp(path.points[i + 1], f - i);
  };
  const tmp = new THREE.Vector3();

  const apply = (time: number) => {
    if (Math.abs(camera.fov - state.fov) > 1e-4) {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }
    const lens = Math.tan((state.fov * Math.PI) / 360) / Math.tan((FOV * Math.PI) / 360);
    const dist = baseDist * state.k * lens;
    const ce = Math.cos(state.el);
    const tx = state.tx + state.trackX;
    const shakeX = Math.sin(time * 21) * 4 * state.streak;
    const shakeY = Math.sin(time * 17 + 1.3) * 3 * state.streak;
    camera.position.set(
      tx + dist * Math.sin(state.az) * ce + shakeX,
      state.ty + dist * Math.sin(state.el) + shakeY,
      dist * Math.cos(state.az) * ce,
    );
    camera.lookAt(tx, state.ty, 0);
    camera.rotateZ(state.roll);
    streaks.visible = state.streak > 0.01;
    (streaks.material as THREE.MeshBasicMaterial).opacity = state.streak;

    // icon
    iconPivot.position.set(
      LOGO.layers.icon.cx + state.iconX,
      LOGO.layers.icon.cy,
      state.iconZ,
    );
    icon.mesh.position.set(0, 0, 0);
    iconPivot.rotation.y = state.iconRot;
    iconPivot.rotation.z = state.iconTilt;
    icon.mat.uniforms.uFlash.value = state.iconFlash;

    // letters
    wordPivot.position.set(LOGO.layers.word.cx, LOGO.layers.word.cy, state.wordZ);
    word.mesh.position.set(0, 0, 0);
    word.mat.uniforms.uReveal.value = state.wordR;
    threePivot.position.set(LOGO.layers.three.cx, LOGO.layers.three.cy, state.threeZ);
    three.mat.uniforms.uReveal.value = state.threeR;

    // printed line follows the liquid front
    line.mat.uniforms.uReveal.value =
      state.head - path.ext - REVEAL_LAG * (1 - state.settle) + 14 * state.settle;

    // liquid
    const active = state.head > 0.5 && state.fade < 0.999;
    tubeCore.visible = active;
    tubeHalo.visible = active;
    for (const m of [core, halo]) {
      m.uniforms.uHead.value = state.head;
      m.uniforms.uTime.value = time;
      m.uniforms.uFade.value = state.fade;
    }

    const headVisible = state.head > 0.5 && state.head < path.total - 0.5 && state.fade < 0.5;
    headGlow.visible = headVisible;
    if (headVisible) {
      headPosition(state.head, tmp);
      headGlow.position.copy(tmp);
      headGlow.scale.setScalar(150);
      headGlow.material.opacity = 0.75;
    }
    seamGlow.visible = state.seamGlow > 0.01;
    seamGlow.scale.setScalar(60 + 220 * state.seamGlow);
    seamGlow.material.opacity = Math.min(1, state.seamGlow * 1.2);
    endGlow.visible = state.endGlow > 0.01;
    endGlow.scale.setScalar(80 + 260 * state.endGlow);
    endGlow.material.opacity = Math.min(1, state.endGlow * 1.2);
  };

  return {
    scene,
    camera,
    state,
    pathLength: path.total,
    fit,
    apply,
    dispose: () => {
      for (const d of disposables) d.dispose();
      scene.clear();
    },
  };
}