import assert from "node:assert/strict";
import test from "node:test";
import {
  EncodePreset,
  encode,
  type Resolve,
  sourceText,
  type Token,
  type WordToken,
} from "../src/index.ts";

const TEXT = "nobody on earth knows what any of it means.";

const words = (tokens: readonly Token[]): WordToken[] =>
  tokens.filter((token): token is WordToken => token.kind === "plain" || token.kind === "glyph");

test("encode — same text, preset and seed give the same tokens", () => {
  assert.deepEqual(encode(TEXT, "corrupted", { seed: 3 }), encode(TEXT, "corrupted", { seed: 3 }));
});

test("encode — the seed defaults to a hash of the text", () => {
  assert.deepEqual(encode(TEXT), encode(TEXT));
});

test("encode — different seeds give different tokens", () => {
  assert.notDeepEqual(
    encode(TEXT, "corrupted", { seed: 1 }),
    encode(TEXT, "corrupted", { seed: 2 }),
  );
});

test("encode — the clean preset leaves the text untouched", () => {
  const tokens = encode(TEXT, "clean");

  assert.ok(tokens.every((token) => token.kind !== "glyph" && token.kind !== "noise"));
  assert.equal(tokens.map((token) => (token.kind === "break" ? "\n" : token.text)).join(""), TEXT);
});

test("encode — words keep their source, whatever the preset", () => {
  for (const preset of EncodePreset.levels) {
    assert.equal(sourceText(encode(TEXT, preset, { seed: 9 })), TEXT);
  }
});

test("encode — glyphs only come from the preset table", () => {
  const tokens = encode(TEXT, {
    leet: { words: 1, chars: 1 },
    glyphs: { o: "0", a: null, e: null, i: null },
  });

  for (const word of words(tokens)) assert.equal(word.text, word.source.replaceAll("o", "0"));
});

test("encode — several candidates are drawn among", () => {
  const tokens = encode("ooooooooooooooooooooooooo", {
    leet: { words: 1, chars: 1 },
    glyphs: { o: ["0", "°"] },
  });
  const used = new Set(Array.from((words(tokens)[0] as WordToken).text));

  assert.deepEqual([...used].sort(), ["0", "°"]);
});

test("encode — preserved words are never leeted", () => {
  const tokens = encode("nexus nexus nexus", { leet: { words: 1, preserve: ["NEXUS"] } });

  assert.ok(words(tokens).every((word) => word.kind === "plain"));
});

test("encode — short words follow minLength", () => {
  const tokens = encode("a o on to", {
    leet: { words: 1, minLength: 2 },
    glyphs: { a: "4", o: "0" },
  });

  assert.deepEqual(
    words(tokens).map((word) => word.text),
    ["a", "o", "0n", "t0"],
  );
});

test("encode — noise only comes from the preset lists", () => {
  const preset = EncodePreset.from({
    noise: { density: 1, before: ["<"], after: [">"], between: ["|"], lineStart: ["$"] },
  });
  const tokens = encode(TEXT, preset, { seed: 5 });
  const noise = tokens.filter((token) => token.kind === "noise").map((token) => token.text);

  assert.equal(noise.length, words(tokens).length);
  assert.ok(noise.every((text) => ["<", ">", "|", "$"].includes(text)));
});

test("encode — lineStart noise only opens a line", () => {
  const tokens = encode("a b c\nd e f", {
    noise: { density: 1, weights: { before: 0, after: 0, between: 0, lineStart: 1 } },
  });

  assert.deepEqual(
    tokens.map((token) => token.kind),
    [
      "noise",
      "space",
      "plain",
      "space",
      "plain",
      "space",
      "plain",
      "break",
      "noise",
      "space",
      "plain",
      "space",
      "plain",
      "space",
      "plain",
    ],
  );
});

test("encode — lines rebalances a single line", () => {
  const tokens = encode(TEXT, "clean", { lines: 3 });

  assert.equal(tokens.filter((token) => token.kind === "break").length, 2);
});

test("encode — line breaks of the text win over lines", () => {
  const tokens = encode("one two\nthree four", "clean", { lines: 4 });

  assert.equal(tokens.filter((token) => token.kind === "break").length, 1);
  assert.equal(sourceText(tokens), "one two\nthree four");
});

test("encode — resolve modes", () => {
  const resolved = (resolve: Resolve | undefined) =>
    words(encode(TEXT, "clean", { resolve }))
      .filter((word) => word.resolve)
      .map((word) => word.source);

  assert.deepEqual(resolved(undefined), ["means."]);
  assert.deepEqual(resolved("last-word"), ["means."]);
  assert.deepEqual(resolved("none"), []);
  assert.equal(resolved("all").length, 9);
  assert.deepEqual(resolved([0, -2]), ["nobody", "it"]);
  assert.deepEqual(
    resolved((word) => word.startsWith("k")),
    ["knows"],
  );
});

test("encode — word indices run across lines", () => {
  const tokens = encode("a b\nc d", "clean");

  assert.deepEqual(
    words(tokens).map((word) => word.word),
    [0, 1, 2, 3],
  );
});
