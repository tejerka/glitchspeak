import assert from "node:assert/strict";
import test from "node:test";
import { createRandom, EncodePreset, mergeOptions, TimingPreset } from "../src/index.ts";

test("mergeOptions — objects merge, arrays and scalars replace, undefined is ignored", () => {
  assert.deepEqual(
    mergeOptions({ a: { b: 1, c: [1, 2] }, d: 1, e: "x" }, { a: { c: [3] }, d: undefined, e: "y" }),
    { a: { b: 1, c: [3] }, d: 1, e: "y" },
  );
});

test("Preset — resolve starts from the default", () => {
  assert.deepEqual(EncodePreset.default.resolve(), EncodePreset.glitch.resolve());
  assert.deepEqual(TimingPreset.default.resolve(), TimingPreset.human.resolve());
});

test("Preset — a language preset keeps the default intensity", () => {
  const sql = EncodePreset.sql.resolve();

  assert.equal(sql.noise.density, EncodePreset.glitch.resolve().noise.density);
  assert.ok(sql.noise.between.includes("SELECT"));
});

test("Preset — extends composes intensity and language", () => {
  const preset = EncodePreset.corrupted.extends(EncodePreset.sql, { caseFlip: 0 }).resolve();

  assert.equal(preset.noise.density, EncodePreset.corrupted.resolve().noise.density);
  assert.deepEqual(preset.noise.lineStart, EncodePreset.sql.resolve().noise.lineStart);
  assert.equal(preset.caseFlip, 0);
});

test("Preset — extends accepts names", () => {
  assert.deepEqual(
    EncodePreset.corrupted.extends("shell").resolve(),
    EncodePreset.corrupted.extends(EncodePreset.shell).resolve(),
  );
});

test("Preset — extends never mutates the original", () => {
  const before = EncodePreset.glitch.resolve();
  EncodePreset.glitch.extends({ caseFlip: 1 });

  assert.deepEqual(EncodePreset.glitch.resolve(), before);
});

test("Preset — extends returns the same class", () => {
  assert.ok(EncodePreset.glitch.extends({}) instanceof EncodePreset);
  assert.ok(TimingPreset.human.extends({}) instanceof TimingPreset);
});

test("Preset — null removes an inherited glyph", () => {
  const glyphs = EncodePreset.glitch.extends({ glyphs: { a: null } }).resolve().glyphs;

  assert.equal(glyphs.a, undefined);
  assert.deepEqual(glyphs.o, ["0"]);
});

test("Preset — single glyphs resolve to candidate lists", () => {
  assert.deepEqual(EncodePreset.from({ glyphs: { x: "×" } }).resolve().glyphs.x, ["×"]);
});

test("Preset — from normalizes every kind of reference", () => {
  assert.equal(EncodePreset.from(), EncodePreset.default);
  assert.equal(EncodePreset.from("sql"), EncodePreset.sql);
  assert.equal(EncodePreset.from(EncodePreset.ts), EncodePreset.ts);
  assert.equal(EncodePreset.from({ caseFlip: 0.5 }).resolve().caseFlip, 0.5);
  assert.throws(() => EncodePreset.from("nope" as "sql"), /unknown encode preset "nope"/);
});

test("Preset — levels go from readable to scrambled", () => {
  const densities = EncodePreset.levels.map((preset) => preset.resolve().noise.density);

  assert.deepEqual(
    densities,
    [...densities].sort((a, b) => a - b),
  );
  assert.equal(EncodePreset.levels[0], EncodePreset.clean);
});

test("createRandom — same seed, same sequence", () => {
  const a = createRandom(42);
  const b = createRandom(42);

  assert.deepEqual(
    Array.from({ length: 5 }, () => a.next()),
    Array.from({ length: 5 }, () => b.next()),
  );
});

test("createRandom — weighted skips zero weights", () => {
  const random = createRandom(1);

  for (let index = 0; index < 50; index++) {
    assert.equal(random.weighted({ a: 0, b: 1, c: 0 }), "b");
  }
  assert.equal(random.weighted({ a: 0 }), undefined);
});
