// Small shared helpers. No DOM or AudioContext references here on purpose,
// so this module stays trivially testable and reusable.

// Web Audio cannot ramp a gain value to exactly 0 with exponentialRampToValueAtTime
// (it is mathematically undefined), so every "silent" target uses this floor instead.
export const MIN_GAIN = 0.0001;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

export function linearToDb(linear) {
  return 20 * Math.log10(Math.max(linear, MIN_GAIN));
}
