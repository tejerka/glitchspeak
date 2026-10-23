import assert from "node:assert/strict";
import test from "node:test";
import { encode, renderSvg, timeline, timelineToSvg } from "../src/index.ts";

const TEXT = "nobody on earth knows what any of it means.";

test("renderSvg — a standalone, accessible SVG", () => {
  const svg = renderSvg(TEXT, { lines: 3, lineNumbers: true });

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="\d+"/);
  assert.match(svg, /role="img" aria-labelledby="gs-title"/);
  assert.match(svg, /<title id="gs-title">nobody on earth knows what any of it means\.<\/title>/);
  assert.ok(!svg.includes("<script"));
  assert.ok(!/href="http/.test(svg));
});

test("renderSvg — deterministic", () => {
  assert.equal(renderSvg(TEXT, { seed: 3 }), renderSvg(TEXT, { seed: 3 }));
});

test("renderSvg — animates with discrete SMIL, looping by default", () => {
  const svg = renderSvg(TEXT);

  assert.match(svg, /calcMode="discrete"/);
  assert.match(svg, /repeatCount="indefinite"/);
  assert.ok(!svg.includes('fill="freeze"'));
  assert.match(renderSvg(TEXT, { loop: false }), /fill="freeze"/);
});

test("renderSvg — the static state is the final frame", () => {
  const svg = renderSvg("nobody knows", { encode: "clean" });

  assert.match(svg, /<g class="gs-typing" opacity="0">/);
  assert.match(svg, /<g class="gs-final">/);
  assert.match(svg, /font-weight="800" fill="#f4fff0">knows<\/tspan>/);
});

test("renderSvg — reduced motion shows the final frame", () => {
  assert.match(
    renderSvg(TEXT),
    /@media \(prefers-reduced-motion:reduce\)\{\.gs-typing,\.gs-step\{display:none\}/,
  );
});

test("renderSvg — the glow only exists with resolved words", () => {
  assert.match(renderSvg(TEXT), /filter="url\(#gs-glow\)"/);
  assert.ok(!renderSvg(TEXT, { resolve: "none" }).includes('filter="url(#gs-glow)"'));
});

test("renderSvg — escapes text, label and noise", () => {
  const svg = renderSvg("<b> & 'q'", { encode: "clean", label: 'say "hi"' });

  assert.match(svg, /<title id="gs-title">say &quot;hi&quot;<\/title>/);
  assert.match(svg, /&lt;b&gt;/);
  assert.ok(!svg.includes("<b>"));
});

test("renderSvg — one clip per line, line numbers in a gutter", () => {
  const svg = renderSvg("one\ntwo\nthree", { encode: "clean", lineNumbers: true });

  assert.equal(svg.match(/<clipPath id="gs-l\d+">/g)?.length, 3);
  assert.match(svg, /text-anchor="end" fill="#3f3f46">3<\/tspan>/);
});

test("timelineToSvg — instant timing has no animation at all", () => {
  const svg = timelineToSvg(timeline(encode(TEXT), "instant"), { loop: false, cursor: false });

  assert.ok(!svg.includes("<animate"));
  assert.ok(!svg.includes('<g class="gs-typing"'));
});

test("timelineToSvg — mistypes show up as their own text", () => {
  const run = timeline(encode("abcdefghij", "clean", { resolve: "none" }), {
    flicker: 1,
    flickerGlyphs: ["#"],
  });

  assert.equal(timelineToSvg(run).match(/>#<animate attributeName="opacity"/g)?.length, 10);
});

test("timelineToSvg — theme, transparent background and no cursor", () => {
  const svg = renderSvg("nobody knows", {
    encode: "clean",
    theme: { background: "none", resolved: "#ff00ff" },
    cursor: false,
  });

  assert.ok(!svg.includes("<rect width="));
  assert.match(svg, /fill="#ff00ff">knows/);
  assert.ok(!svg.includes("▌"));
});
