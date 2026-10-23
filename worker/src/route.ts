import {
  type EncodePresetName,
  type GlitchSpeakOptions,
  parseEncodePreset,
  parseResolve,
  parseTimingPreset,
  type SvgRenderOptions,
  type TimingPresetName,
} from "@tejerka/glitchspeak";

export const MAX_TEXT_LENGTH = 200;

export type SvgRequest = { text: string; options: GlitchSpeakOptions & SvgRenderOptions };

export class RouteError extends Error {}

const HEX = /^[0-9a-f]{3,8}$/i;

const presetNames = (segment: string | undefined): string | null =>
  segment === undefined || segment === "_" || segment === "" ? null : segment.replaceAll("+", " ");

const flag = (params: URLSearchParams, name: string): boolean | undefined => {
  if (!params.has(name)) return undefined;

  const value = params.get(name);
  return value !== "0" && value !== "false";
};

const number = (
  params: URLSearchParams,
  name: string,
  min: number,
  max: number,
): number | undefined => {
  const raw = params.get(name);
  if (raw === null) return undefined;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RouteError(`"${name}" must be a number between ${min} and ${max}`);
  }

  return value;
};

const color = (params: URLSearchParams, name: string): string | undefined => {
  const raw = params.get(name);
  if (raw === null) return undefined;
  if (raw === "none" || raw === "transparent") return "none";
  if (!HEX.test(raw)) throw new RouteError(`"${name}" must be a hex color without # or "none"`);

  return `#${raw}`;
};

/** `_` is a space, so links stay readable: `the_core_is_awake`. A real underscore is `%5F`. */
export const decodeText = (segment: string): string => {
  let text: string;

  try {
    text = segment
      .split("_")
      .map((part) => decodeURIComponent(part))
      .join(" ");
  } catch {
    throw new RouteError("the text is not valid URL encoding");
  }

  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what is rejected.
  if (/[\u0000-\u0009\u000b-\u001f\u007f]/.test(text)) {
    throw new RouteError("the text holds control characters");
  }
  if (text.trim() === "") throw new RouteError("the text is empty");
  if (Array.from(text).length > MAX_TEXT_LENGTH) {
    throw new RouteError(`the text is longer than ${MAX_TEXT_LENGTH} characters`);
  }

  return text;
};

/**
 * `/[encode]/[timing]/<text>.svg?seed=42&lines=3&lineNumbers`
 *
 * `encode` and `timing` are preset names, composed with `+` (`corrupted+sql`); `_` keeps the
 * default. Both are optional, from the right: `/<text>.svg`, `/<encode>/<text>.svg`.
 */
export const parseSvgUrl = (url: URL): SvgRequest => {
  const segments = url.pathname.split("/").filter((segment) => segment !== "");
  const last = segments.pop();

  if (last === undefined || !last.endsWith(".svg")) {
    throw new RouteError("the path must end with <text>.svg");
  }
  if (segments.length > 2) throw new RouteError("expected /[encode]/[timing]/<text>.svg");

  const text = decodeText(last.slice(0, -".svg".length));
  const params = url.searchParams;
  const accent = color(params, "accent");
  const background = color(params, "bg");
  let encode: GlitchSpeakOptions["encode"];
  let timing: GlitchSpeakOptions["timing"];

  try {
    encode = parseEncodePreset(presetNames(segments[0]) as EncodePresetName | null);
    timing = parseTimingPreset(presetNames(segments[1]) as TimingPresetName | null);
  } catch (error) {
    throw new RouteError(error instanceof Error ? error.message.replace("glitchspeak: ", "") : "");
  }

  const cursor = params.get("cursor");

  return {
    text,
    options: {
      encode,
      timing,
      seed: number(params, "seed", 0, 2 ** 32 - 1),
      lines: number(params, "lines", 1, 12),
      resolve: parseResolve(params.get("resolve")),
      lineNumbers: flag(params, "lineNumbers") ?? flag(params, "line-numbers"),
      cursor: cursor === "false" || cursor === "" ? false : (cursor?.slice(0, 2) ?? undefined),
      label: params.get("label")?.slice(0, MAX_TEXT_LENGTH) ?? undefined,
      fontSize: number(params, "size", 8, 96),
      loop: flag(params, "loop"),
      hold: number(params, "hold", 0, 30_000),
      theme: {
        ...(background === undefined ? {} : { background }),
        ...(accent === undefined || accent === "none"
          ? {}
          : { glyph: accent, cursor: accent, glow: accent }),
      },
    },
  };
};
