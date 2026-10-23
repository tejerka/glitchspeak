import { createRandom, hashString, mixSeed, type Random } from "../random.ts";
import {
  EncodePreset,
  type EncodePresetRef,
  type NoiseSlot,
  type ResolvedEncodePreset,
} from "./EncodePreset.ts";
import type { NoiseToken, Resolve, Token, WordToken } from "./types.ts";

export interface EncodeOptions {
  /** Defaults to a hash of the text: the same text always encodes the same way, SSR included. */
  seed?: number;
  /**
   * Rebalances the words into this many lines of similar length. Ignored when the text already
   * contains line breaks: those are always respected.
   */
  lines?: number;
  /** What breaks free of the code at the end. Defaults to `"last-word"`. */
  resolve?: Resolve;
}

/** Stream id of the encode draws, so that timing draws never shift them. */
const ENCODE_STREAM = 0x656e63;

const LETTER = /\p{L}/u;

const splitWords = (line: string): string[] => line.split(/\s+/).filter((word) => word.length > 0);

const balanceLines = (words: readonly string[], count: number): string[][] => {
  const lines: string[][] = [];
  const total = words.reduce((sum, word) => sum + word.length + 1, 0);
  let length = 0;
  let current: string[] = [];

  words.forEach((word, index) => {
    current.push(word);
    length += word.length + 1;

    const wordsLeft = words.length - index - 1;
    const linesLeft = count - lines.length - 1;
    const target = (total * (lines.length + 1)) / count;

    if (linesLeft > 0 && wordsLeft >= linesLeft && length >= target) {
      lines.push(current);
      current = [];
    }
  });

  lines.push(current);

  return lines;
};

const splitLines = (text: string, count: number | undefined): string[][] => {
  const raw = text.split(/\r?\n/);

  if (raw.length > 1 || count === undefined || count <= 1) return raw.map(splitWords);

  return balanceLines(splitWords(text), Math.floor(count));
};

const resolvedWords = (words: readonly string[], resolve: Resolve): Set<number> => {
  if (resolve === "none") return new Set();
  if (resolve === "all") return new Set(words.keys());
  if (resolve === "last-word") return new Set(words.length > 0 ? [words.length - 1] : []);
  if (typeof resolve === "function") {
    return new Set([...words.keys()].filter((index) => resolve(words[index] as string, index)));
  }

  return new Set(
    resolve
      .map((index) => (index < 0 ? words.length + index : index))
      .filter((index) => index >= 0 && index < words.length),
  );
};

const flipCase = (char: string): string => {
  const upper = char.toUpperCase();

  return upper === char ? char.toLowerCase() : upper;
};

const encodeWord = (
  source: string,
  word: number,
  resolve: boolean,
  preset: ResolvedEncodePreset,
  random: Random,
): WordToken => {
  const chars = Array.from(source);
  const letters = chars.filter((char) => LETTER.test(char)).join("");
  const preserved = preset.leet.preserve.some(
    (entry) => entry.toLowerCase() === letters.toLowerCase(),
  );
  const leeted =
    !preserved && letters.length >= preset.leet.minLength && random.chance(preset.leet.words);
  let swapped = false;

  const text = chars
    .map((char) => {
      const candidates = leeted ? preset.glyphs[char.toLowerCase()] : undefined;

      if (candidates !== undefined && random.chance(preset.leet.chars)) {
        swapped = true;
        return random.pick(candidates);
      }

      return LETTER.test(char) && random.chance(preset.caseFlip) ? flipCase(char) : char;
    })
    .join("");

  return { kind: swapped ? "glyph" : "plain", text, source, word, resolve };
};

const pickSlot = (
  preset: ResolvedEncodePreset,
  random: Random,
  available: Readonly<Record<NoiseSlot, boolean>>,
): NoiseSlot | undefined => {
  if (!random.chance(preset.noise.density)) return undefined;

  const weights: Partial<Record<NoiseSlot, number>> = {};

  for (const slot of Object.keys(available) as NoiseSlot[]) {
    if (available[slot] && preset.noise[slot].length > 0)
      weights[slot] = preset.noise.weights[slot];
  }

  return random.weighted(weights);
};

/**
 * Turns plain text into pseudo-code tokens. Pure and deterministic: the same text, preset and seed
 * always give the same tokens.
 */
export const encode = (
  text: string,
  preset?: EncodePresetRef,
  options: EncodeOptions = {},
): Token[] => {
  const resolved = EncodePreset.from(preset).resolve();
  const random = createRandom(mixSeed(options.seed ?? hashString(text), ENCODE_STREAM));
  const lines = splitLines(text, options.lines);
  const toResolve = resolvedWords(lines.flat(), options.resolve ?? "last-word");
  const tokens: Token[] = [];
  let word = 0;

  const noise = (slot: NoiseSlot, owner: number): NoiseToken => ({
    kind: "noise",
    text: random.pick(resolved.noise[slot]),
    word: owner,
  });

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) tokens.push({ kind: "break" });

    line.forEach((source, position) => {
      const index = word++;
      const slot = pickSlot(resolved, random, {
        before: true,
        after: true,
        between: position < line.length - 1,
        lineStart: position === 0,
      });

      if (slot === "lineStart") tokens.push(noise(slot, index), { kind: "space", text: " " });
      if (position > 0) tokens.push({ kind: "space", text: " " });
      if (slot === "before") tokens.push(noise(slot, index));

      tokens.push(encodeWord(source, index, toResolve.has(index), resolved, random));

      if (slot === "after") tokens.push(noise(slot, index));
      if (slot === "between") tokens.push({ kind: "space", text: " " }, noise(slot, index));
    });
  });

  return tokens;
};

/** The human text behind tokens: words as written, noise dropped. */
export const sourceText = (tokens: readonly Token[]): string => {
  const lines: string[][] = [[]];

  for (const token of tokens) {
    if (token.kind === "break") lines.push([]);
    else if (token.kind === "plain" || token.kind === "glyph")
      lines[lines.length - 1]?.push(token.source);
  }

  return lines.map((line) => line.join(" ")).join("\n");
};
