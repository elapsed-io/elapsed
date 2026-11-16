/**
 * What a recipe may cost (docs/recipes/mode-recipes.md, Safety). The schema enforces most of these; the loader
 * checks them again and adds the ones a schema cannot say (load.ts).
 */
export const RECIPE_LIMITS = {
  /** A recipe file is at most this long, in characters. */
  textChars: 64 * 1024,
  layers: 24,
  /** Particles at once, all of a recipe's particle layers together. */
  particlesAtOnce: 12,
  passingItems: 24,
  circles: 24,
  options: 6,
  slots: 32,
  stopsPerBinding: 16,
  /** An image slot's width and height, and an image strip's whole width (frames × frame width), in pixels. */
  imagePx: 4096,
  replaySeconds: { min: 0.5, max: 4 },
  /** A particle layer's quickest arrival, longest life and largest burst, so no recipe can flood the screen. */
  particleEverySeconds: 0.25,
  particleLifetimeSeconds: 60,
  burstCount: 16,
  burstEverySeconds: 10,
} as const;
