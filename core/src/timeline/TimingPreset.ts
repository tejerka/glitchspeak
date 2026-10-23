import { mergeOptions, Preset } from "../preset/Preset.ts";

export type TimingPresetName = "default" | "instant" | "steady" | "human" | "nervous" | "corrupted";

/** Every option is optional: a preset only sets what it changes. Durations are in milliseconds. */
export interface TimingPresetOptions {
  /** Characters per second. `Infinity` types everything at once. */
  cps?: number;
  /** Random variation of each keystroke delay, in [0, 1]: 0 is a metronome. */
  jitter?: number;
  /** Extra pause after a space. */
  wordPause?: number;
  /** Extra pause after a line break. */
  linePause?: number;
  /** Probability that a character is first mistyped, then erased and corrected. */
  flicker?: number;
  /** Characters drawn for mistypes and for the scramble of resolving words. */
  flickerGlyphs?: readonly string[];
  /** Wait between the last keystroke and the start of the resolution. */
  resolveDelay?: number;
  /** How long resolving words take to decode back to plain text. 0 is instant. */
  resolveDuration?: number;
}

export type ResolvedTimingPreset = {
  readonly [Key in keyof TimingPresetOptions]-?: TimingPresetOptions[Key];
};

export type TimingPresetRef = TimingPresetName | TimingPreset | TimingPresetOptions;

/** Complete default: the `human` rhythm. */
const BASE: Required<TimingPresetOptions> = {
  cps: 28,
  jitter: 0.35,
  wordPause: 40,
  linePause: 300,
  flicker: 0,
  flickerGlyphs: Array.from("01#$%&@!?<>/{}[]=+*"),
  resolveDelay: 400,
  resolveDuration: 300,
};

export class TimingPreset extends Preset<
  TimingPresetOptions,
  ResolvedTimingPreset,
  TimingPresetName
> {
  /** No animation at all: the final frame right away. Used for reduced motion. */
  static readonly instant = new TimingPreset(
    {
      cps: Number.POSITIVE_INFINITY,
      jitter: 0,
      wordPause: 0,
      linePause: 0,
      flicker: 0,
      resolveDelay: 0,
      resolveDuration: 0,
    },
    "instant",
  );
  static readonly steady = new TimingPreset(
    { cps: 30, jitter: 0, wordPause: 0, linePause: 250, flicker: 0 },
    "steady",
  );
  static readonly human = new TimingPreset(
    { cps: 28, jitter: 0.35, wordPause: 40, linePause: 300, flicker: 0 },
    "human",
  );
  static readonly nervous = new TimingPreset(
    { cps: 40, jitter: 0.6, wordPause: 20, linePause: 150, flicker: 0.03, resolveDuration: 450 },
    "nervous",
  );
  static readonly corrupted = new TimingPreset(
    { cps: 45, jitter: 0.8, wordPause: 0, linePause: 120, flicker: 0.08, resolveDuration: 700 },
    "corrupted",
  );

  /** `human`. */
  static readonly default = new TimingPreset({}, "default");

  /** From calm to frantic. */
  static readonly levels: readonly TimingPreset[] = [
    TimingPreset.instant,
    TimingPreset.steady,
    TimingPreset.human,
    TimingPreset.nervous,
    TimingPreset.corrupted,
  ];

  /** Normalizes a name, a preset or plain options into a preset. Nothing means `default`. */
  static from(ref: TimingPresetRef = "default"): TimingPreset {
    if (typeof ref === "string") return TimingPreset.named(ref);
    if (ref instanceof TimingPreset) return ref;

    return new TimingPreset(ref);
  }

  private static named(name: TimingPresetName): TimingPreset {
    const preset = (TimingPreset as unknown as Record<string, unknown>)[name];

    if (!(preset instanceof TimingPreset)) {
      throw new Error(`glitchspeak: unknown timing preset "${name}"`);
    }

    return preset;
  }

  resolve(): ResolvedTimingPreset {
    return mergeOptions(BASE, this.options);
  }

  protected create(options: TimingPresetOptions): this {
    return new TimingPreset(options) as this;
  }

  protected lookup(name: TimingPresetName): TimingPreset {
    return TimingPreset.named(name);
  }
}
