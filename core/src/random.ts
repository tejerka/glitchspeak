/** FNV-1a, 32 bits. Turns any string into a stable seed. */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/** Mixes several integers into one seed, so independent streams never share a sequence. */
export const mixSeed = (...values: number[]): number => {
  let hash = 0x9e3779b9;

  for (const value of values) {
    hash = Math.imul(hash ^ (value >>> 0), 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
  }

  return hash >>> 0;
};

/** One draw in [0, 1) for a given seed, without keeping state. */
export const randomAt = (seed: number): number => {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export interface Random {
  /** Uniform draw in [0, 1). */
  next(): number;
  /** True with the given probability. Never draws when the probability is 0 or 1. */
  chance(probability: number): boolean;
  /** One element, uniformly. */
  pick<Value>(values: readonly Value[]): Value;
  /** One key, proportionally to its weight. Undefined when every weight is 0. */
  weighted<Key extends string>(weights: Readonly<Partial<Record<Key, number>>>): Key | undefined;
}

/** Mulberry32: small, fast, and identical on every engine. */
export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;

  const next = (): number => {
    const value = randomAt(state);
    state = (state + 0x6d2b79f5) >>> 0;

    return value;
  };

  return {
    next,
    chance: (probability) => {
      if (probability <= 0) return false;
      if (probability >= 1) return true;

      return next() < probability;
    },
    pick: (values) => values[Math.floor(next() * values.length)] as (typeof values)[number],
    weighted: (weights) => {
      const entries = Object.entries(weights) as [keyof typeof weights, number | undefined][];
      const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight ?? 0), 0);

      if (total <= 0) return undefined;

      let draw = next() * total;

      for (const [key, weight] of entries) {
        draw -= Math.max(0, weight ?? 0);
        if (draw < 0) return key;
      }

      return entries[entries.length - 1]?.[0];
    },
  };
};
