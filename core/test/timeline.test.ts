import assert from "node:assert/strict";
import test from "node:test";
import { encode, frameToText, TimingPreset, type Token, timeline } from "../src/index.ts";

const TEXT = "nobody on earth knows what any of it means.";

/** The capture of reference, written by hand. */
const CAPTURE: Token[] = [
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

test("timeline — starts empty and ends on the resolved capture", () => {
  const run = timeline(CAPTURE, "steady");

  assert.equal(frameToText(run.frameAt(0), { cursor: false }), "");
  assert.equal(run.frameAt(0).phase, "typing");
  assert.equal(
    frameToText(run.frameAt(run.duration)),
    "&&   n0b0dy()\n0n   earth.js kn0ws?\nwh4t   any[] 0f #0)  means.▌",
  );
  assert.equal(run.frameAt(run.duration).phase, "done");
});

test("timeline — the resolved word decodes to its source", () => {
  const last = timeline(CAPTURE).frameAt(Number.POSITIVE_INFINITY).lines.at(-1)?.at(-1);

  assert.deepEqual(last, { kind: "resolved", text: "means." });
});

test("timeline — typing reveals the text in order", () => {
  const run = timeline(CAPTURE, "human", { seed: 1 });
  const full = frameToText(run.frameAt(run.typingEnd), { cursor: false });
  let previous = "";

  for (let time = 0; time <= run.typingEnd; time += 25) {
    const text = frameToText(run.frameAt(time), { cursor: false });

    assert.ok(full.startsWith(text), `${JSON.stringify(text)} is not a prefix`);
    assert.ok(text.length >= previous.length);
    previous = text;
  }
});

test("timeline — steady types at cps", () => {
  const tokens = encode("abcdefghij", "clean", { resolve: "none" });
  const run = timeline(tokens, { cps: 10, jitter: 0, flicker: 0 });

  assert.equal(run.typingEnd, 1000);
  assert.equal(run.duration, 1000);
  assert.equal(frameToText(run.frameAt(500), { cursor: false }), "abcde");
});

test("timeline — pauses after spaces and line breaks", () => {
  const tokens = encode("ab cd\nef", "clean", { resolve: "none" });
  const run = timeline(tokens, { cps: 10, jitter: 0, wordPause: 50, linePause: 200 });

  assert.equal(run.typingEnd, 8 * 100 + 50 + 200);
});

test("timeline — instant has no duration", () => {
  const run = timeline(encode(TEXT), TimingPreset.instant);

  assert.equal(run.duration, 0);
  assert.equal(run.frameAt(0).phase, "done");
});

test("timeline — same seed, same frames", () => {
  const a = timeline(encode(TEXT), "corrupted", { seed: 4 });
  const b = timeline(encode(TEXT), "corrupted", { seed: 4 });

  assert.equal(a.duration, b.duration);
  for (let time = 0; time < a.duration; time += 50) {
    assert.deepEqual(a.frameAt(time), b.frameAt(time));
  }
});

test("timeline — flicker mistypes, then corrects", () => {
  const tokens = encode("abcdefghijklmnopqrstuvwxyz", "clean", { resolve: "none" });
  const run = timeline(tokens, { cps: 10, jitter: 0, flicker: 1, flickerGlyphs: ["#"] });
  const texts = new Set<string>();

  for (let time = 0; time <= run.duration; time += 10) {
    texts.add(frameToText(run.frameAt(time), { cursor: false }));
  }

  assert.ok(texts.has("#"));
  assert.ok(texts.has("a#"));
  assert.equal(
    frameToText(run.frameAt(run.duration), { cursor: false }),
    "abcdefghijklmnopqrstuvwxyz",
  );
});

test("timeline — resolving scrambles, then settles", () => {
  const run = timeline(CAPTURE, { resolveDelay: 100, resolveDuration: 400, flickerGlyphs: ["#"] });
  const middle = run.frameAt(run.typingEnd + 100 + 200);

  assert.equal(middle.phase, "resolving");
  assert.deepEqual(middle.lines.at(-1)?.at(-1), { kind: "resolved", text: "mea###" });
});

test("timeline — resolving drops the noise of resolved words", () => {
  const tokens = encode(TEXT, { noise: { density: 1 } }, { resolve: "all", seed: 2 });
  const run = timeline(tokens);

  assert.equal(frameToText(run.frameAt(run.duration), { cursor: false }), TEXT);
});

test("timeline — steps change exactly when the content does", () => {
  const run = timeline(CAPTURE, "nervous", { seed: 8 });
  let previous = run.frameAt(0);

  for (let time = 5; time <= run.duration + 5; time += 5) {
    const frame = run.frameAt(time);

    if (frame.step === previous.step) assert.deepEqual(frame.lines, previous.lines);
    previous = frame;
  }
});

test("timeline — frames carry the human text", () => {
  assert.equal(timeline(encode(TEXT, "corrupted")).frameAt(0).text, TEXT);
});
