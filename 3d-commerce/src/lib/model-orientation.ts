/**
 * Explicit orientation corrections for known source assets that are authored
 * sideways. Keep this separate from centering/scaling: those operations cannot
 * infer a model's intended up direction from its bounds alone.
 *
 * The horse USDZ supplied for the catalog is rotated around the view axis so
 * its body is horizontal and its legs point down in both storefront viewers.
 * Unknown models are never rotated automatically.
 */
export function modelOrientationCorrection(name: string): [number, number, number] {
  if (/\bhorse\b/i.test(name)) {
    return [0, 0, Math.PI / 3];
  }

  return [0, 0, 0];
}
