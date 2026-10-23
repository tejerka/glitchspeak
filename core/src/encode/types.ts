/** A word of the source text, possibly leeted or case-flipped. */
export interface WordToken {
  /** `glyph` when at least one letter was swapped for a glyph, `plain` otherwise. */
  readonly kind: "plain" | "glyph";
  readonly text: string;
  /** The word as written in the source text. */
  readonly source: string;
  /** Index of the word in the whole text, from 0. */
  readonly word: number;
  /** Whether the word breaks free of the code at the end. */
  readonly resolve: boolean;
}

/** Syntax that does not belong: `&&`, `()`, `any[]`, `.js`… */
export interface NoiseToken {
  readonly kind: "noise";
  readonly text: string;
  /** The word this noise hangs on. When that word resolves, its noise goes away. */
  readonly word: number;
}

export interface SpaceToken {
  readonly kind: "space";
  readonly text: string;
}

export interface BreakToken {
  readonly kind: "break";
}

export type Token = WordToken | NoiseToken | SpaceToken | BreakToken;

/** What resolves at the end. Negative indices count from the last word. */
export type Resolve =
  | "last-word"
  | "all"
  | "none"
  | readonly number[]
  | ((word: string, index: number) => boolean);
