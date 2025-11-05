// Deterministic hue from string for colorful badges
const HASH_MULTIPLIER = 31;
const HUE_RANGE = 360;
const MAX_INT_31_BITS = 31;
const MAX_INT_31 = 2 ** MAX_INT_31_BITS - 1; // keep hash bounded without bitwise ops

export function hashToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * HASH_MULTIPLIER + input.charCodeAt(i)) % MAX_INT_31;
  }
  const normalized = Math.abs(hash);
  return normalized % HUE_RANGE;
}

export default hashToHue;
