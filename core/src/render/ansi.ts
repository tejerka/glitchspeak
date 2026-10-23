import type { Frame, FrameTokenKind } from "../timeline/timeline.ts";
import type { RenderOptions } from "./classNames.ts";
import { gutterWidth } from "./text.ts";

/** Hex colors (`#rrggbb`) of each part. */
export interface AnsiTheme {
  plain: string;
  glyph: string;
  noise: string;
  resolved: string;
  cursor: string;
  gutter: string;
}

export type AnsiColors = "truecolor" | "256" | "none";

export interface AnsiRenderOptions extends Omit<RenderOptions, "label"> {
  /** Defaults to `"truecolor"`. */
  colors?: AnsiColors;
  theme?: Partial<AnsiTheme>;
}

export const defaultAnsiTheme: Readonly<AnsiTheme> = {
  plain: "#d4d4d8",
  glyph: "#39ff14",
  noise: "#71717a",
  resolved: "#f4fff0",
  cursor: "#39ff14",
  gutter: "#3f3f46",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const toRgb = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.replace("#", ""), 16);

  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

/** Nearest color of the 6×6×6 cube of the 256-color palette. */
const to256 = ([red, green, blue]: [number, number, number]): number => {
  const level = (channel: number) => Math.round((channel / 255) * 5);

  return 16 + 36 * level(red) + 6 * level(green) + level(blue);
};

const foreground = (hex: string, colors: AnsiColors): string => {
  if (colors === "none") return "";

  const rgb = toRgb(hex);

  return colors === "256" ? `\x1b[38;5;${to256(rgb)}m` : `\x1b[38;2;${rgb.join(";")}m`;
};

/**
 * ANSI-colored text for terminals. The resolution's glow does not exist there: resolved words come
 * out bold, in the brightest color.
 */
export const frameToAnsi = (
  frame: Frame,
  { lineNumbers = false, cursor = "▌", colors = "truecolor", theme }: AnsiRenderOptions = {},
): string => {
  const palette = { ...defaultAnsiTheme, ...theme };
  const width = gutterWidth(frame);

  const paint = (kind: FrameTokenKind | "cursor" | "gutter", text: string): string => {
    if (colors === "none" || kind === "space") return text;

    const bold = kind === "resolved" ? BOLD : "";

    return `${bold}${foreground(palette[kind], colors)}${text}${RESET}`;
  };

  return frame.lines
    .map((line, index) => {
      const gutter = lineNumbers ? paint("gutter", `${String(index + 1).padStart(width)}  `) : "";
      const end =
        cursor !== false && index === frame.lines.length - 1 ? paint("cursor", cursor) : "";

      return gutter + line.map((token) => paint(token.kind, token.text)).join("") + end;
    })
    .join("\n");
};
