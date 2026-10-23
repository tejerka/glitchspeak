import assert from "node:assert/strict";
import test from "node:test";
import { type Frame, frameToAnsi, frameToHtml, frameToText, mountTerminal } from "../src/index.ts";

const FRAME: Frame = {
  time: 0,
  step: 0,
  phase: "done",
  progress: 1,
  text: "nobody <means>",
  lines: [
    [
      { kind: "noise", text: "&&" },
      { kind: "space", text: " " },
      { kind: "glyph", text: "n0b0dy" },
    ],
    [
      { kind: "plain", text: "<" },
      { kind: "resolved", text: "means>" },
    ],
  ],
};

test("frameToText — joins lines, adds the cursor and the gutter", () => {
  assert.equal(frameToText(FRAME), "&& n0b0dy\n<means>▌");
  assert.equal(frameToText(FRAME, { lineNumbers: true, cursor: "_" }), "1  && n0b0dy\n2  <means>_");
  assert.equal(frameToText(FRAME, { cursor: false }), "&& n0b0dy\n<means>");
});

test("frameToHtml — escapes, classes, and hides the code from screen readers", () => {
  const html = frameToHtml(FRAME, { lineNumbers: true });

  assert.match(html, /^<div class="gs-root" data-phase="done">/);
  assert.match(html, /<span class="gs-sr" style="[^"]+">nobody &lt;means&gt;<\/span>/);
  assert.match(html, /<div class="gs-code" aria-hidden="true">/);
  assert.match(html, /<span class="gs-gutter">2<\/span><span class="gs-plain">&lt;<\/span>/);
  assert.match(
    html,
    /<span class="gs-resolved">means&gt;<\/span><span class="gs-cursor">▌<\/span>/,
  );
  assert.ok(!html.includes("<means>"));
});

test("frameToHtml — label and classNames", () => {
  const html = frameToHtml(FRAME, { label: "Hello", classNames: { glyph: "text-green-400" } });

  assert.match(html, />Hello<\/span>/);
  assert.match(html, /<span class="text-green-400">n0b0dy<\/span>/);
});

test("frameToAnsi — colors each kind, and strips everything with colors: none", () => {
  const ESC = String.fromCharCode(27);
  const ansi = frameToAnsi(FRAME);

  assert.ok(ansi.includes(`${ESC}[38;2;57;255;20mn0b0dy${ESC}[0m`));
  assert.ok(ansi.includes(`${ESC}[1m${ESC}[38;2;244;255;240mmeans>`));
  assert.ok(frameToAnsi(FRAME, { colors: "256" }).includes(`${ESC}[38;5;`));
  assert.equal(frameToAnsi(FRAME, { colors: "none" }), frameToText(FRAME));
});

test("mountTerminal — a pipe gets the final frame only", () => {
  const chunks: string[] = [];

  mountTerminal({ write: (chunk) => chunks.push(chunk), isTTY: false }, "nobody knows", {
    encode: "clean",
    colors: "none",
  });

  assert.deepEqual(chunks, ["nobody knows▌\n"]);
});
