/**
 * Small deterministic RNG helpers so per-slot scenery attributes are stable for
 * a given slot index (and a given seed) across frames and sessions.
 */

export function hashInt(value: number, seed = 0): number {
  let h = (value ^ seed) >>> 0
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/** Deterministic mulberry32 generator seeded from an integer. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let result = state
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}
