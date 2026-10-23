import type { EncodePresetRef } from "./encode/EncodePreset.ts";
import { type EncodeOptions, encode } from "./encode/encode.ts";
import type { Token } from "./encode/types.ts";
import { type Player, type PlayOptions, play } from "./player/player.ts";
import type { TimingPresetRef } from "./timeline/TimingPreset.ts";
import { type Timeline, timeline } from "./timeline/timeline.ts";

export interface GlitchSpeakOptions extends EncodeOptions {
  /** How the text is turned into code. Ignored when tokens are given. */
  encode?: EncodePresetRef;
  /** How it is typed. */
  timing?: TimingPresetRef;
}

/** Text or ready-made tokens. */
export type GlitchSpeakInput = string | readonly Token[];

/** encode, then timeline, with one seed feeding both. */
export const compile = (input: GlitchSpeakInput, options: GlitchSpeakOptions = {}): Timeline => {
  const tokens =
    typeof input === "string"
      ? encode(input, options.encode, {
          seed: options.seed,
          lines: options.lines,
          resolve: options.resolve,
        })
      : input;

  return timeline(tokens, options.timing, { seed: options.seed });
};

/** The whole pipeline in one call: encode, timeline, play. */
export const glitchspeak = (
  input: GlitchSpeakInput,
  options: GlitchSpeakOptions & PlayOptions = {},
): Player => play(compile(input, options), options);
