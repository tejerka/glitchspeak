import assert from "node:assert/strict";
import test from "node:test";
import {
  defineGlitchSpeakElement,
  EncodePreset,
  mount,
  parseEncodePreset,
  parseResolve,
  type Scheduler,
} from "../src/index.ts";

const idle: Scheduler = { now: () => 0, request: () => 0, cancel: () => {} };

// happy-dom is ESM-only, and the tests compile to CommonJS.
const setup = async (reducedMotion = false) => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  window.matchMedia = ((query: string) => ({
    matches: reducedMotion && query.includes("reduce"),
  })) as unknown as typeof window.matchMedia;
  const element = window.document.createElement("div");
  window.document.body.append(element);

  return { window, element: element as unknown as Element };
};

test("mount — hides the code and exposes the human text", async () => {
  const { element } = await setup();

  mount(element, "nobody on earth knows", { scheduler: idle, encode: "corrupted" });

  const label = element.querySelector(".gs-sr");
  const code = element.querySelector(".gs-code");

  assert.equal(label?.textContent, "nobody on earth knows");
  assert.equal(code?.getAttribute("aria-hidden"), "true");
  assert.equal(element.querySelector(".gs-root")?.getAttribute("data-phase"), "typing");
});

test("mount — prefers-reduced-motion shows the final frame right away", async () => {
  const { element } = await setup(true);

  const { player } = mount(element, "nobody knows", { scheduler: idle, encode: "clean" });

  assert.equal(player.frame.phase, "done");
  assert.equal(element.querySelector(".gs-root")?.getAttribute("data-phase"), "done");
  assert.equal(element.querySelector(".gs-resolved")?.textContent, "knows");
});

test("mount — reducedMotion never ignores the preference", async () => {
  const { element } = await setup(true);

  const { player } = mount(element, "nobody knows", { scheduler: idle, reducedMotion: "never" });

  assert.equal(player.frame.phase, "typing");
});

test("mount — renders lines, gutter and cursor, then unmount cleans up", async () => {
  const { element } = await setup();

  const mounted = mount(element, "one\ntwo", {
    scheduler: idle,
    encode: "clean",
    reducedMotion: "always",
    lineNumbers: true,
    label: "One, two.",
  });

  assert.equal(element.querySelectorAll(".gs-line").length, 2);
  assert.equal(element.querySelectorAll(".gs-gutter").length, 2);
  assert.equal(element.querySelectorAll(".gs-cursor").length, 1);
  assert.equal(element.querySelector(".gs-sr")?.textContent, "One, two.");

  mounted.unmount();
  assert.equal(element.children.length, 0);
});

test("<glitch-speak> — reads its attributes and its content", async () => {
  const { window } = await setup(true);
  const registry = window.customElements as unknown as CustomElementRegistry;
  const scope = globalThis as { HTMLElement?: unknown };
  const previous = scope.HTMLElement;
  scope.HTMLElement = window.HTMLElement;

  try {
    defineGlitchSpeakElement("glitch-speak", registry);
    defineGlitchSpeakElement("glitch-speak", registry);

    const host = window.document.createElement("div");
    host.innerHTML = '<glitch-speak encode="clean" line-numbers>nobody knows</glitch-speak>';
    window.document.body.append(host);

    assert.equal(host.querySelector(".gs-sr")?.textContent, "nobody knows");
    assert.equal(host.querySelectorAll(".gs-gutter").length, 1);
    assert.equal(host.querySelector(".gs-resolved")?.textContent, "knows");
  } finally {
    scope.HTMLElement = previous;
  }
});

test("parseResolve — keywords and index lists", () => {
  assert.equal(parseResolve(null), undefined);
  assert.equal(parseResolve("all"), "all");
  assert.deepEqual(parseResolve("0, -1"), [0, -1]);
});

test("parseEncodePreset — one name, or several composed", () => {
  assert.equal(parseEncodePreset(null), undefined);
  assert.deepEqual(parseEncodePreset("sql")?.resolve(), EncodePreset.sql.resolve());
  assert.deepEqual(
    parseEncodePreset("corrupted sql")?.resolve(),
    EncodePreset.corrupted.extends(EncodePreset.sql).resolve(),
  );
  assert.throws(() => parseEncodePreset("nope"), /unknown encode preset/);
});
