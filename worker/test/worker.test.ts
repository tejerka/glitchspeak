import assert from "node:assert/strict";
import test from "node:test";
import { EncodePreset, TimingPreset } from "@tejerka/glitchspeak";
import { handle } from "../src/index.ts";
import { decodeText, parseSvgUrl } from "../src/route.ts";

const get = (path: string, method = "GET") =>
  handle(new Request(`https://glitchspeak.example.workers.dev${path}`, { method }));

test("worker — renders an animated SVG, cached forever", async () => {
  const response = get("/corrupted+sql/nervous/the_core_is_awake.svg?seed=42&lineNumbers");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/svg+xml; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=31536000, immutable");
  assert.match(body, /^<svg /);
  assert.match(body, /<title id="gs-title">the core is awake<\/title>/);
});

test("worker — the same URL always gives the same picture", async () => {
  const path = "/glitch/human/nobody_on_earth_knows.svg?lines=2";

  assert.equal(await get(path).text(), await get(path).text());
});

test("worker — HEAD has the headers and no body", async () => {
  const response = get("/hello.svg", "HEAD");

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});

test("worker — usage at the root, 404 elsewhere, 405 for writes", async () => {
  assert.match(await get("/").text(), /\/\[encode\]\/\[timing\]\/<text>\.svg/);
  assert.equal(get("/favicon.ico").status, 404);
  assert.equal(get("/hello.svg", "POST").status, 405);
});

test("worker — bad requests are 400 with a reason", async () => {
  const bad = async (path: string, reason: RegExp) => {
    const response = get(path);

    assert.equal(response.status, 400, path);
    assert.match(await response.text(), reason);
  };

  await bad("/nope/hello.svg", /unknown encode preset "nope"/);
  await bad("/_/nope/hello.svg", /unknown timing preset "nope"/);
  await bad("/a/b/c/hello.svg", /expected/);
  await bad(`/${"a".repeat(201)}.svg`, /longer than 200/);
  await bad("/%E0%A4%A.svg", /URL encoding/);
  await bad("/hello.svg?size=1000", /"size" must be a number between 8 and 96/);
  await bad("/hello.svg?bg=red", /hex color/);
  await bad("/_.svg", /empty/);
});

test("parseSvgUrl — segments are optional from the right", () => {
  const url = (path: string) => new URL(`https://x.dev${path}`);

  assert.equal(parseSvgUrl(url("/hello.svg")).options.encode, undefined);
  assert.deepEqual(
    EncodePreset.from(parseSvgUrl(url("/corrupted+sql/hello.svg")).options.encode).resolve(),
    EncodePreset.corrupted.extends(EncodePreset.sql).resolve(),
  );
  assert.equal(parseSvgUrl(url("/_/nervous/hello.svg")).options.encode, undefined);
  assert.deepEqual(
    TimingPreset.from(parseSvgUrl(url("/_/nervous/hello.svg")).options.timing).resolve(),
    TimingPreset.nervous.resolve(),
  );
});

test("parseSvgUrl — query options", () => {
  const { options } = parseSvgUrl(
    new URL(
      "https://x.dev/hello.svg?seed=7&lines=2&resolve=all&lineNumbers&cursor=_&size=32&loop=0&hold=500&bg=none&accent=ff00ff",
    ),
  );

  assert.equal(options.seed, 7);
  assert.equal(options.lines, 2);
  assert.equal(options.resolve, "all");
  assert.equal(options.lineNumbers, true);
  assert.equal(options.cursor, "_");
  assert.equal(options.fontSize, 32);
  assert.equal(options.loop, false);
  assert.equal(options.hold, 500);
  assert.deepEqual(options.theme, {
    background: "none",
    glyph: "#ff00ff",
    cursor: "#ff00ff",
    glow: "#ff00ff",
  });
});

test("decodeText — underscores are spaces, %5F is an underscore", () => {
  assert.equal(decodeText("the_core%20is_awake"), "the core is awake");
  assert.equal(decodeText("snake%5Fcase"), "snake_case");
  assert.equal(decodeText("line%0Abreak"), "line\nbreak");
  assert.throws(() => decodeText("tab%09"), /control characters/);
});
