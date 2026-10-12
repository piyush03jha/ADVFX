/**
 * Shared coordinate layout for the Voxel3D intro.
 * Keep every layer and the animated connector in these logo units.
 */
export const LOGO = {
  W: 2000,
  H: 480.05,
  layers: {
    icon: { cx: -835.74, cy: 86.15, w: 328.53, h: 307.74 },
    word: { cx: 234.16, cy: 80.29, w: 1513.58, h: 220.25 },
    line: { cx: -76.27, cy: -147.84, w: 1537.04, h: 134.09 },
    three: { cx: 866.91, cy: -189.07, w: 266.17, h: 101.91 },
  },
  path: {
    xv: 7.21,
    y0: 0,
    yb: 50.96,
    yh: 120.68,
    rx: 62.35,
    ry: 69.73,
    xe: 1532.01,
    thickness: 13.41,
  },
} as const;
