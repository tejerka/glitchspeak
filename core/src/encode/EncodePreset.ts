import { mergeOptions, Preset } from "../preset/Preset.ts";

export type EncodePresetName =
  | "default"
  | "clean"
  | "subtle"
  | "glitch"
  | "scrambled"
  | "corrupted"
  | "js"
  | "ts"
  | "shell"
  | "sql"
  | "regex";

export type NoiseSlot = "before" | "after" | "between" | "lineStart";

/** Every option is optional: a preset only sets what it changes. Probabilities are in [0, 1]. */
export interface EncodePresetOptions {
  /**
   * Letter → glyph(s). Keys are lowercase and match both cases. With several candidates, the seed
   * picks one per occurrence. `null` removes a letter inherited from a lower layer.
   */
  glyphs?: { readonly [letter: string]: string | readonly string[] | null };
  leet?: {
    /** Probability that a word is leeted. */
    words?: number;
    /** Inside a leeted word, probability that each convertible letter is converted. */
    chars?: number;
    /** Words with fewer letters are never leeted. */
    minLength?: number;
    /** Words never leeted, case-insensitive: proper nouns, brand names… */
    preserve?: readonly string[];
  };
  noise?: {
    /** Probability that a word gets one piece of noise around it. */
    density?: number;
    /** Glued before a word: `#id`, `$var`. */
    before?: readonly string[];
    /** Glued after a word: `n0b0dy()`, `earth.js`, `kn0ws?`. */
    after?: readonly string[];
    /** Standalone, between two words: `any[]`, `#0)`. */
    between?: readonly string[];
    /** Standalone, at the start of a line: `&&`. */
    lineStart?: readonly string[];
    /** Relative odds of each slot, among those available for a given word. */
    weights?: { readonly [slot in NoiseSlot]?: number };
  };
  /** Probability that each remaining letter has its case flipped. */
  caseFlip?: number;
}

export interface ResolvedEncodePreset {
  readonly glyphs: Readonly<Record<string, readonly string[]>>;
  readonly leet: {
    readonly words: number;
    readonly chars: number;
    readonly minLength: number;
    readonly preserve: readonly string[];
  };
  readonly noise: {
    readonly density: number;
    readonly before: readonly string[];
    readonly after: readonly string[];
    readonly between: readonly string[];
    readonly lineStart: readonly string[];
    readonly weights: Readonly<Record<NoiseSlot, number>>;
  };
  readonly caseFlip: number;
}

export type EncodePresetRef = EncodePresetName | EncodePreset | EncodePresetOptions;

/** Complete default: the `glitch` intensity with the `js` noise. Reproduces the reference capture. */
const BASE: EncodePresetOptions = {
  glyphs: { a: "4", e: "3", i: "1", o: "0" },
  leet: { words: 0.55, chars: 1, minLength: 2, preserve: [] },
  noise: {
    density: 0.5,
    before: ["!", "...", "#", "@"],
    after: ["()", ".js", "?", "[]", ";", ".map()", "?."],
    between: ["any[]", "#0)", "=>", "||", "{}", "null", "void 0"],
    lineStart: ["&&", "//", "..."],
    weights: { before: 1, after: 3, between: 2, lineStart: 2 },
  },
  caseFlip: 0,
};

const toCandidates = (value: string | readonly string[]): readonly string[] =>
  typeof value === "string" ? [value] : value;

export class EncodePreset extends Preset<
  EncodePresetOptions,
  ResolvedEncodePreset,
  EncodePresetName
> {
  // Intensities: densities, glyphs and case — never the noise lists.
  static readonly clean = new EncodePreset({ leet: { words: 0 }, noise: { density: 0 } }, "clean");
  static readonly subtle = new EncodePreset(
    {
      glyphs: { a: null, e: null, i: null, o: "0" },
      leet: { words: 0.25 },
      noise: { density: 0.2 },
    },
    "subtle",
  );
  static readonly glitch = new EncodePreset(
    {
      glyphs: { a: "4", e: "3", i: "1", o: "0" },
      leet: { words: 0.55, chars: 1 },
      noise: { density: 0.5 },
      caseFlip: 0,
    },
    "glitch",
  );
  static readonly scrambled = new EncodePreset(
    {
      glyphs: { a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", l: "1", b: "8", g: "9" },
      leet: { words: 0.7, chars: 1 },
      noise: { density: 0.65 },
      caseFlip: 0.1,
    },
    "scrambled",
  );
  static readonly corrupted = new EncodePreset(
    {
      glyphs: {
        a: ["4", "@", "λ"],
        b: ["8", "ß"],
        c: ["¢", "("],
        e: ["3", "€", "Σ"],
        g: ["9", "6"],
        i: ["1", "!", "|"],
        k: ["|<"],
        l: ["1", "|"],
        n: ["И", "η"],
        o: ["0", "Ø", "°"],
        r: ["Я"],
        s: ["5", "$", "§"],
        t: ["7", "+"],
        u: ["µ", "ü"],
        y: ["¥"],
      },
      leet: { words: 0.9, chars: 0.8 },
      noise: { density: 0.85 },
      caseFlip: 0.25,
    },
    "corrupted",
  );

  // Languages: the noise lists, and the odd typed glyph.
  static readonly js = new EncodePreset(
    {
      noise: {
        before: BASE.noise?.before,
        after: BASE.noise?.after,
        between: BASE.noise?.between,
        lineStart: BASE.noise?.lineStart,
      },
    },
    "js",
  );
  static readonly ts = new EncodePreset(
    {
      noise: {
        before: ["!", "...", "@", "#"],
        after: ["()", ".ts", "?", "<T>", ": any", "!", "[]", " as const"],
        between: ["any[]", "never", "=>", "unknown", "keyof", "<T>", "satisfies"],
        lineStart: ["&&", "//", "type", "export"],
      },
    },
    "ts",
  );
  static readonly shell = new EncodePreset(
    {
      glyphs: { s: "$" },
      noise: {
        before: ["$", "~/", "./", "-", "--"],
        after: ["/", ".sh", "*", "&", ";", " |", " 2>&1"],
        between: ["|", "&&", ">", "/dev/null", "$?", "sudo", "||"],
        lineStart: ["$", "#", ">", "sudo"],
      },
    },
    "shell",
  );
  static readonly sql = new EncodePreset(
    {
      noise: {
        before: ["@", ":", "#"],
        after: ["()", ";", ".*", "_id", ",", "%"],
        between: ["SELECT", "NULL", "=", "AND", "*", "JOIN", "WHERE"],
        lineStart: ["--", "SELECT", "AND", "FROM"],
      },
    },
    "sql",
  );
  static readonly regex = new EncodePreset(
    {
      noise: {
        before: ["^", "\\b", "(?:", "["],
        after: ["$", "+", "*?", "\\d", "]", "{2,}", ")"],
        between: ["|", ".*", "\\s+", "(?=", "[^0-9]"],
        lineStart: ["/", "^", "(?i)"],
      },
    },
    "regex",
  );

  /** `glitch` + `js`. */
  static readonly default = new EncodePreset({}, "default");

  /** Intensities, from the most readable to the most scrambled. */
  static readonly levels: readonly EncodePreset[] = [
    EncodePreset.clean,
    EncodePreset.subtle,
    EncodePreset.glitch,
    EncodePreset.scrambled,
    EncodePreset.corrupted,
  ];

  /** Normalizes a name, a preset or plain options into a preset. Nothing means `default`. */
  static from(ref: EncodePresetRef = "default"): EncodePreset {
    if (typeof ref === "string") return EncodePreset.named(ref);
    if (ref instanceof EncodePreset) return ref;

    return new EncodePreset(ref);
  }

  private static named(name: EncodePresetName): EncodePreset {
    const preset = (EncodePreset as unknown as Record<string, unknown>)[name];

    if (!(preset instanceof EncodePreset)) {
      throw new Error(`glitchspeak: unknown encode preset "${name}"`);
    }

    return preset;
  }

  resolve(): ResolvedEncodePreset {
    const merged = mergeOptions(BASE, this.options) as Required<EncodePresetOptions> & {
      leet: ResolvedEncodePreset["leet"];
      noise: ResolvedEncodePreset["noise"];
    };
    const glyphs: Record<string, readonly string[]> = {};

    for (const [letter, value] of Object.entries(merged.glyphs)) {
      if (value === null) continue;

      const candidates = toCandidates(value).filter((candidate) => candidate.length > 0);
      if (candidates.length > 0) glyphs[letter.toLowerCase()] = candidates;
    }

    return { glyphs, leet: merged.leet, noise: merged.noise, caseFlip: merged.caseFlip };
  }

  protected create(options: EncodePresetOptions): this {
    return new EncodePreset(options) as this;
  }

  protected lookup(name: EncodePresetName): EncodePreset {
    return EncodePreset.named(name);
  }
}
