import type { Token } from "@efficimo/glitchspeak";

/** The reference capture, token for token — proof that the engine plays any hand-written code. */
export const CAPTURE: Token[] = [
  { kind: "noise", text: "&&", word: 0 },
  { kind: "space", text: "   " },
  { kind: "glyph", text: "n0b0dy", source: "nobody", word: 0, resolve: false },
  { kind: "noise", text: "()", word: 0 },
  { kind: "break" },
  { kind: "glyph", text: "0n", source: "on", word: 1, resolve: false },
  { kind: "space", text: "   " },
  { kind: "plain", text: "earth", source: "earth", word: 2, resolve: false },
  { kind: "noise", text: ".js", word: 2 },
  { kind: "space", text: " " },
  { kind: "glyph", text: "kn0ws", source: "knows", word: 3, resolve: false },
  { kind: "noise", text: "?", word: 3 },
  { kind: "break" },
  { kind: "glyph", text: "wh4t", source: "what", word: 4, resolve: false },
  { kind: "space", text: "   " },
  { kind: "noise", text: "any[]", word: 4 },
  { kind: "space", text: " " },
  { kind: "glyph", text: "0f", source: "of", word: 5, resolve: false },
  { kind: "space", text: " " },
  { kind: "noise", text: "#0)", word: 5 },
  { kind: "space", text: "  " },
  { kind: "glyph", text: "m34ns.", source: "means.", word: 6, resolve: true },
];

export const CAPTURE_LABEL = "Nobody on earth knows what any of it means.";
