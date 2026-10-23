import { sourceText } from "../encode/encode.ts";
import type { Token } from "../encode/types.ts";
import { createRandom, hashString, mixSeed, randomAt } from "../random.ts";
import { TimingPreset, type TimingPresetRef } from "./TimingPreset.ts";

export type FrameTokenKind = "plain" | "glyph" | "noise" | "space" | "resolved";

export interface FrameToken {
  readonly kind: FrameTokenKind;
  readonly text: string;
  /** A wrong character, about to be erased. */
  readonly mistyped?: boolean;
}

export type FramePhase = "typing" | "resolving" | "done";

/** What is on screen at a given time. */
export interface Frame {
  readonly time: number;
  /** Identity of the frame content: two frames with the same step look exactly the same. */
  readonly step: number;
  /** `typing` until the resolution starts, `resolving` while words decode, `done` at the end. */
  readonly phase: FramePhase;
  /** Share of the keystrokes already typed, in [0, 1]. */
  readonly progress: number;
  /** The human text, for screen readers. */
  readonly text: string;
  /** Visible tokens, line by line. The last token of the last line may be partially typed. */
  readonly lines: readonly (readonly FrameToken[])[];
}

/** A pure function of time: no clock, no DOM. Seek anywhere, in any order. */
export interface Timeline {
  readonly tokens: readonly Token[];
  /** Total length, in milliseconds. */
  readonly duration: number;
  /** When the last keystroke lands. */
  readonly typingEnd: number;
  /** Every time the frame changes, in order, from 0 to `duration`. */
  readonly changes: readonly number[];
  frameAt(time: number): Frame;
}

export interface TimelineOptions {
  /** Defaults to a hash of the human text. */
  seed?: number;
}

/** Stream id of the timing draws, so that encode draws never shift them. */
const TIMING_STREAM = 0x74696d;
/** How often the scramble of resolving words changes, in milliseconds. */
const SCRAMBLE_INTERVAL = 40;

interface Keystroke {
  readonly time: number;
  /** Units typed for good. */
  readonly typed: number;
  /** A mistyped character shown after them, about to be erased. */
  readonly wrong: string | null;
}

const unitsOf = (token: Token): string[] =>
  token.kind === "break" ? ["\n"] : Array.from(token.text);

const isResolving = (token: Token, words: ReadonlySet<number>): boolean =>
  (token.kind === "plain" || token.kind === "glyph" || token.kind === "noise") &&
  words.has(token.word);

/** Drops leading, trailing and doubled spaces once noise has gone. */
const tidy = (line: FrameToken[]): FrameToken[] =>
  line.filter(
    (token, index) =>
      token.kind !== "space" ||
      (index > 0 && index < line.length - 1 && line[index - 1]?.kind !== "space"),
  );

/** Schedules every keystroke of the tokens. Deterministic for a given seed. */
export const timeline = (
  tokens: readonly Token[],
  preset?: TimingPresetRef,
  options: TimelineOptions = {},
): Timeline => {
  const timing = TimingPreset.from(preset).resolve();
  const text = sourceText(tokens);
  const seed = options.seed ?? hashString(text);
  const random = createRandom(mixSeed(seed, TIMING_STREAM));
  const pool = timing.flickerGlyphs.length > 0 ? timing.flickerGlyphs : ["#"];

  const units = tokens.map(unitsOf);
  const offsets: number[] = [];
  const unitToken: number[] = [];

  units.forEach((chars, index) => {
    offsets.push(unitToken.length);
    for (const _ of chars) unitToken.push(index);
  });

  const unitChars = units.flat();
  const keystrokes: Keystroke[] = [{ time: 0, typed: 0, wrong: null }];
  const baseDelay = Number.isFinite(timing.cps) && timing.cps > 0 ? 1000 / timing.cps : 0;
  let time = 0;

  unitChars.forEach((char, unit) => {
    const delay = baseDelay * Math.max(0, 1 + timing.jitter * (random.next() * 2 - 1));
    const typable = char !== "\n" && char.trim() !== "";

    if (typable && baseDelay > 0 && random.chance(timing.flicker)) {
      time += delay;
      keystrokes.push({ time, typed: unit, wrong: random.pick(pool) });
      time += delay * 2.5;
      keystrokes.push({ time, typed: unit, wrong: null });
    }

    time += delay;
    keystrokes.push({ time, typed: unit + 1, wrong: null });

    if (char === "\n") time += timing.linePause;
    else if (!typable) time += timing.wordPause;
  });

  const typingEnd = (keystrokes[keystrokes.length - 1] as Keystroke).time;
  const words = new Set<number>();

  for (const token of tokens) {
    if ((token.kind === "plain" || token.kind === "glyph") && token.resolve) words.add(token.word);
  }

  const resolveStart = typingEnd + (words.size > 0 ? timing.resolveDelay : 0);
  const duration = resolveStart + (words.size > 0 ? timing.resolveDuration : 0);
  const buckets = Math.ceil(timing.resolveDuration / SCRAMBLE_INTERVAL);
  const finalStep = keystrokes.length + buckets + 1;

  const typingFrame = (at: number, step: number, keystroke: Keystroke): Frame => {
    const lines: FrameToken[][] = [[]];

    tokens.forEach((token, index) => {
      const visible = Math.min(
        (units[index] as string[]).length,
        keystroke.typed - (offsets[index] as number),
      );

      if (visible <= 0) return;
      if (token.kind === "break") {
        lines.push([]);
        return;
      }

      const chars = (units[index] as string[]).slice(0, visible).join("");
      lines[lines.length - 1]?.push({ kind: token.kind, text: chars });
    });

    if (keystroke.wrong !== null) {
      const token = tokens[unitToken[keystroke.typed] as number] as Token;
      const kind = token.kind === "break" ? "plain" : token.kind;
      lines[lines.length - 1]?.push({ kind, text: keystroke.wrong, mistyped: true });
    }

    return {
      time: at,
      step,
      phase: "typing",
      progress: unitChars.length === 0 ? 1 : keystroke.typed / unitChars.length,
      text,
      lines,
    };
  };

  const decode = (source: string, word: number, share: number, bucket: number): string => {
    const chars = Array.from(source);
    const revealed = Math.floor(share * chars.length);

    return chars
      .map((char, index) =>
        index < revealed || char.trim() === ""
          ? char
          : (pool[
              Math.floor(randomAt(mixSeed(seed, word, index, bucket)) * pool.length)
            ] as string),
      )
      .join("");
  };

  const resolvedFrame = (at: number, step: number, share: number, bucket: number): Frame => {
    const lines: FrameToken[][] = [[]];

    for (const token of tokens) {
      if (token.kind === "break") {
        lines.push([]);
        continue;
      }
      if (!isResolving(token, words)) {
        lines[lines.length - 1]?.push({ kind: token.kind, text: token.text });
        continue;
      }
      if (token.kind !== "plain" && token.kind !== "glyph") continue;

      lines[lines.length - 1]?.push({
        kind: "resolved",
        text: decode(token.source, token.word, share, bucket),
      });
    }

    return {
      time: at,
      step,
      phase: share >= 1 ? "done" : "resolving",
      progress: 1,
      text,
      lines: lines.map(tidy),
    };
  };

  const finalFrame =
    words.size > 0
      ? resolvedFrame(duration, finalStep, 1, buckets)
      : {
          ...typingFrame(duration, finalStep, keystrokes[keystrokes.length - 1] as Keystroke),
          phase: "done" as const,
        };

  const keystrokeAt = (at: number): number => {
    let low = 0;
    let high = keystrokes.length - 1;

    while (low < high) {
      const middle = Math.ceil((low + high) / 2);

      if ((keystrokes[middle] as Keystroke).time <= at) low = middle;
      else high = middle - 1;
    }

    return low;
  };

  const changes = [
    ...new Set([
      ...keystrokes.map((keystroke) => keystroke.time),
      ...(words.size > 0
        ? Array.from({ length: buckets }, (_, bucket) => resolveStart + bucket * SCRAMBLE_INTERVAL)
        : []),
    ]),
  ]
    .filter((time) => time < duration)
    .concat(duration);

  return {
    tokens,
    duration,
    typingEnd,
    changes,
    frameAt: (at) => {
      if (!(at < duration)) return finalFrame;

      const clamped = Math.max(0, at);

      if (words.size > 0 && clamped >= resolveStart) {
        const elapsed = clamped - resolveStart;
        const bucket = Math.floor(elapsed / SCRAMBLE_INTERVAL);
        // Quantized like the scramble, so that one step is one look.
        const share = (bucket * SCRAMBLE_INTERVAL) / timing.resolveDuration;

        return resolvedFrame(clamped, keystrokes.length + bucket, share, bucket);
      }

      const index = keystrokeAt(clamped);

      return typingFrame(clamped, index, keystrokes[index] as Keystroke);
    },
  };
};
