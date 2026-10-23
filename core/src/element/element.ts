import { type Mounted, type MountOptions, mount, type ReducedMotion } from "../dom/mount.ts";
import { EncodePreset, type EncodePresetName } from "../encode/EncodePreset.ts";
import type { Resolve } from "../encode/types.ts";
import { TimingPreset, type TimingPresetName } from "../timeline/TimingPreset.ts";

const ATTRIBUTES = [
  "text",
  "encode",
  "timing",
  "seed",
  "lines",
  "resolve",
  "line-numbers",
  "cursor",
  "label",
  "reduced-motion",
] as const;

const toNumber = (value: string | null): number | undefined => {
  if (value === null || value.trim() === "") return undefined;

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

/** `"last-word"`, `"all"`, `"none"`, or word indices separated by commas: `"0,-1"`. */
export const parseResolve = (value: string | null): Resolve | undefined => {
  if (value === null || value.trim() === "") return undefined;
  if (value === "last-word" || value === "all" || value === "none") return value;

  return value
    .split(",")
    .map((index) => Number(index.trim()))
    .filter(Number.isInteger);
};

const presetNames = (value: string | null): string[] =>
  value === null ? [] : value.split(/[\s,+]+/).filter((name) => name.length > 0);

/** `"corrupted"`, or several names composed from left to right: `"corrupted sql"`. */
export const parseEncodePreset = (value: string | null): EncodePreset | undefined => {
  const [first, ...rest] = presetNames(value) as EncodePresetName[];

  return first === undefined ? undefined : EncodePreset.from(first).extends(...rest);
};

/** `"nervous"`, or several names composed from left to right. */
export const parseTimingPreset = (value: string | null): TimingPreset | undefined => {
  const [first, ...rest] = presetNames(value) as TimingPresetName[];

  return first === undefined ? undefined : TimingPreset.from(first).extends(...rest);
};

/** Reads the element attributes into `mount` options. */
export const readAttributes = (element: Element): MountOptions => {
  const cursor = element.getAttribute("cursor");

  return {
    encode: parseEncodePreset(element.getAttribute("encode")),
    timing: parseTimingPreset(element.getAttribute("timing")),
    seed: toNumber(element.getAttribute("seed")),
    lines: toNumber(element.getAttribute("lines")),
    resolve: parseResolve(element.getAttribute("resolve")),
    lineNumbers: element.hasAttribute("line-numbers"),
    cursor: cursor === "false" ? false : (cursor ?? undefined),
    label: element.getAttribute("label") ?? undefined,
    reducedMotion: (element.getAttribute("reduced-motion") ?? undefined) as
      | ReducedMotion
      | undefined,
  };
};

/**
 * Registers `<glitch-speak>`. Explicit on purpose: importing the library never touches the global
 * registry.
 *
 * ```html
 * <glitch-speak encode="sql" timing="nervous" line-numbers>nobody on earth knows</glitch-speak>
 * ```
 *
 * The text comes from the `text` attribute, else from the element content. Every attribute change
 * replays the animation.
 */
export const defineGlitchSpeakElement = (
  tagName = "glitch-speak",
  registry: CustomElementRegistry = customElements,
): void => {
  if (registry.get(tagName) !== undefined) return;

  class GlitchSpeakElement extends HTMLElement {
    static readonly observedAttributes = ATTRIBUTES;

    private mounted: Mounted | undefined;
    private initialText = "";

    /** The running player, to pause, seek or listen to it. */
    get player() {
      return this.mounted?.player;
    }

    connectedCallback() {
      if (this.mounted === undefined) this.initialText = this.textContent?.trim() ?? "";
      this.render();
    }

    disconnectedCallback() {
      this.mounted?.unmount();
      this.mounted = undefined;
    }

    attributeChangedCallback() {
      if (this.isConnected && this.mounted !== undefined) this.render();
    }

    private render() {
      this.mounted?.unmount();
      this.mounted = mount(
        this,
        this.getAttribute("text") ?? this.initialText,
        readAttributes(this),
      );
    }
  }

  registry.define(tagName, GlitchSpeakElement);
};
