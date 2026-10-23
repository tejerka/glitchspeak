import { compile, type GlitchSpeakInput, type GlitchSpeakOptions } from "../glitchspeak.ts";
import type { Frame, FrameToken, Timeline } from "../timeline/timeline.ts";
import { type AnsiTheme, defaultAnsiTheme } from "./ansi.ts";
import type { RenderOptions } from "./classNames.ts";

export interface SvgTheme extends AnsiTheme {
  /** Behind the code, or `"none"`. */
  background: string;
  /** The glow of resolved words. */
  glow: string;
}

export interface SvgRenderOptions extends RenderOptions {
  /** In pixels. Defaults to `20`. */
  fontSize?: number;
  theme?: Partial<SvgTheme>;
  /** Plays forever, with a pause on the final frame. Defaults to `true`. */
  loop?: boolean;
  /** How long the final frame holds before the loop restarts, in milliseconds. Defaults to `3000`. */
  hold?: number;
  fontFamily?: string;
  resolvedFontFamily?: string;
}

export const defaultSvgTheme: Readonly<SvgTheme> = {
  ...defaultAnsiTheme,
  background: "#07090a",
  glow: "#39ff14",
};

const MONO =
  'ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
/** Advance of a monospace character, in em. `textLength` pins every font to it. */
const CHAR_WIDTH = 0.6;
/** Rough advance of a bold sans-serif character, in em, to size the picture. */
const RESOLVED_WIDTH = 0.66;
const LINE_HEIGHT = 1.6;

const XML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] as string);

const length = (text: string): number => Array.from(text).length;

const round = (value: number): number => Math.round(value * 100) / 100;

/** `keyTimes` of a discrete SMIL animation: shares of the cycle, from 0, strictly increasing. */
const share = (time: number, cycle: number): string =>
  cycle > 0 ? String(Math.min(1, Math.round((time / cycle) * 1e5) / 1e5)) : "0";

/**
 * A discrete SMIL animation. The attribute keeps its static value where SMIL does not run — the
 * static value is always the final frame.
 */
const animate = (
  attribute: string,
  stops: readonly (readonly [number, string])[],
  timing: { cycle: number; loop: boolean },
): string => {
  const kept = stops.filter(([time], index) => index === 0 || time > (stops[index - 1]?.[0] ?? 0));
  if (timing.cycle <= 0 || kept.length < 2) return "";

  const values = kept.map(([, value]) => value).join(";");
  const keyTimes = kept.map(([time]) => share(time, timing.cycle)).join(";");
  const repeat = timing.loop ? 'repeatCount="indefinite"' : 'fill="freeze"';
  const element = attribute === "transform" ? "animateTransform" : "animate";
  const type = attribute === "transform" ? ' type="translate"' : "";

  return `<${element} attributeName="${attribute}"${type} values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${round(timing.cycle)}ms" ${repeat}/>`;
};

/** Visible on [from, to) of the cycle. */
const visibility = (from: number, to: number, timing: { cycle: number; loop: boolean }): string => {
  const stops: [number, string][] = [[0, from <= 0 ? "1" : "0"]];

  if (from > 0) stops.push([from, "1"]);
  if (to < timing.cycle) stops.push([to, "0"]);

  return animate("opacity", stops, timing);
};

const columns = (line: readonly FrameToken[]): number =>
  line.reduce((sum, token) => sum + (token.mistyped ? 0 : length(token.text)), 0);

/**
 * A self-contained animated SVG: no script, no external resource. It plays wherever an SVG shows
 * as an image — READMEs, Markdown previews, `<img>` — and shows the final frame where animations
 * do not run, or when the viewer prefers reduced motion.
 */
export const timelineToSvg = (timeline: Timeline, options: SvgRenderOptions = {}): string => {
  const fontSize = options.fontSize ?? 20;
  const theme = { ...defaultSvgTheme, ...options.theme };
  const cursor = options.cursor ?? "▌";
  const loop = options.loop ?? true;
  const mono = options.fontFamily ?? MONO;
  const sans = options.resolvedFontFamily ?? SANS;

  const cw = fontSize * CHAR_WIDTH;
  const lh = fontSize * LINE_HEIGHT;
  const pad = fontSize;
  const finalFrame = timeline.frameAt(timeline.duration);
  const typed = timeline.frameAt(timeline.typingEnd);
  const lineCount = Math.max(typed.lines.length, finalFrame.lines.length, 1);
  const gutterColumns = options.lineNumbers ? String(lineCount).length + 2 : 0;
  const x0 = pad + gutterColumns * cw;
  const cycle = timeline.duration + (loop ? (options.hold ?? 3000) : 0);
  const timing = { cycle, loop };

  const finalWidth = (line: readonly FrameToken[]) =>
    line.reduce(
      (sum, token) =>
        sum + length(token.text) * (token.kind === "resolved" ? RESOLVED_WIDTH : CHAR_WIDTH),
      0,
    ) * fontSize;
  const contentWidth = Math.max(
    ...typed.lines.map((line) => columns(line) * cw),
    ...finalFrame.lines.map(finalWidth),
    0,
  );
  const width = Math.ceil(x0 + contentWidth + 2 * cw + pad);
  const height = Math.ceil(2 * pad + lineCount * lh);
  const baseline = (index: number) => round(pad + index * lh + (lh + fontSize * 0.7) / 2);
  const top = (index: number) => round(pad + index * lh);

  const fill = (token: FrameToken) => (token.kind === "space" ? theme.plain : theme[token.kind]);

  const gutter = (index: number) =>
    options.lineNumbers
      ? `<tspan x="${round(pad + (gutterColumns - 2) * cw)}" text-anchor="end" fill="${theme.gutter}">${index + 1}</tspan>`
      : "";

  /** Mono tokens on the grid; after a resolved word, the line flows. */
  const lineMarkup = (line: readonly FrameToken[], glowOnly = false): string => {
    let column = 0;
    let flowing = false;
    const parts: string[] = [];

    for (const token of line) {
      const chars = length(token.text);
      const hidden = glowOnly && token.kind !== "resolved" ? ' fill-opacity="0"' : "";

      if (token.kind === "resolved") {
        const at = flowing ? "" : ` x="${round(x0 + column * cw)}"`;
        parts.push(
          `<tspan${at} font-family="${escapeXml(sans)}" font-weight="800" fill="${theme.resolved}">${escapeXml(token.text)}</tspan>`,
        );
        flowing = true;
      } else if (token.kind === "space" && !flowing) {
        // On the grid, the next token's x makes the space.
      } else if (flowing) {
        parts.push(`<tspan fill="${fill(token)}"${hidden}>${escapeXml(token.text)}</tspan>`);
      } else {
        parts.push(
          `<tspan x="${round(x0 + column * cw)}" textLength="${round(chars * cw)}" lengthAdjust="spacingAndGlyphs" fill="${fill(token)}"${hidden}>${escapeXml(token.text)}</tspan>`,
        );
      }

      column += chars;
    }

    return parts.join("");
  };

  const cursorAt = (lines: readonly (readonly FrameToken[])[]) => {
    const last = lines.length - 1;
    const line = lines[last] ?? [];
    const mistyped = line.some((token) => token.mistyped) ? 1 : 0;

    return { x: round(x0 + (columns(line) + mistyped) * cw), y: baseline(Math.max(0, last)) };
  };

  // Typing: the fully typed text, revealed line by line through animated clips.
  const typingFrames = timeline.changes
    .map((time) => timeline.frameAt(time))
    .filter((frame) => frame.phase === "typing");
  const typingEnd = timeline.changes.find((time) => timeline.frameAt(time).phase !== "typing") ?? 0;
  const clips: string[] = [];
  const typingLines: string[] = [];

  typed.lines.forEach((line, index) => {
    const reveal = typingFrames.map((frame): [number, string] => {
      const visible = frame.lines[index];
      const px = visible === undefined ? 0 : round(x0 + columns(visible) * cw);
      return [frame.time, String(px)];
    });

    clips.push(
      `<clipPath id="gs-l${index}"><rect x="0" y="${top(index)}" width="${width}" height="${round(lh)}">${animate("width", reveal, timing)}</rect></clipPath>`,
    );
    typingLines.push(
      `<g clip-path="url(#gs-l${index})"><text y="${baseline(index)}">${gutter(index)}${lineMarkup(line)}</text></g>`,
    );
  });

  const mistypes = typingFrames.flatMap((frame, index) => {
    const lines = frame.lines;
    const wrong = lines[lines.length - 1]?.find((token) => token.mistyped);
    if (wrong === undefined) return [];

    const until = typingFrames[index + 1]?.time ?? typingEnd;
    const x = round(x0 + columns(lines[lines.length - 1] ?? []) * cw);

    return [
      `<text x="${x}" y="${baseline(lines.length - 1)}" fill="${fill(wrong)}" opacity="0">${escapeXml(wrong.text)}${visibility(frame.time, until, timing)}</text>`,
    ];
  });

  const typingCursor =
    cursor === false || typingFrames.length === 0
      ? ""
      : (() => {
          const moves = typingFrames.map((frame): [number, string] => {
            const at = cursorAt(frame.lines);
            return [frame.time, `${at.x} ${at.y}`];
          });
          const first = cursorAt(typingFrames[0]?.lines ?? []);

          return `<text x="0" y="0" transform="translate(${first.x} ${first.y})" fill="${theme.cursor}">${escapeXml(cursor)}${animate("transform", moves, timing)}</text>`;
        })();

  const typingLayer =
    typingFrames.length === 0
      ? ""
      : `<g class="gs-typing" opacity="0">${visibility(0, typingEnd, timing)}${typingLines.join("")}${mistypes.join("")}${typingCursor}</g>`;

  // Resolution: one group per scramble step, then the final frame with its glow.
  const resolving = timeline.changes
    .map((time) => timeline.frameAt(time))
    .filter((frame) => frame.phase === "resolving");

  const frameText = (frame: Frame, withCursor: boolean, glowOnly = false) =>
    frame.lines
      .map((line, index) => {
        const end =
          withCursor && cursor !== false && index === frame.lines.length - 1
            ? `<tspan fill="${theme.cursor}"${glowOnly ? ' fill-opacity="0"' : ""}${glowOnly ? "" : ' class="gs-blink"'}>${escapeXml(cursor)}${
                glowOnly || frame.phase !== "done"
                  ? ""
                  : animate(
                      "opacity",
                      [
                        [0, "1"],
                        [530, "0"],
                      ],
                      { cycle: 1060, loop: true },
                    )
              }</tspan>`
            : "";
        return `<text y="${baseline(index)}">${glowOnly ? "" : gutter(index)}${lineMarkup(line, glowOnly)}${end}</text>`;
      })
      .join("");

  const steps = resolving.map((frame, index) => {
    const until = resolving[index + 1]?.time ?? timeline.duration;

    return `<g class="gs-step" opacity="0">${visibility(frame.time, until, timing)}${frameText(frame, true)}</g>`;
  });

  const hasResolved = finalFrame.lines.some((line) =>
    line.some((token) => token.kind === "resolved"),
  );
  const glowLayer = hasResolved
    ? `<g filter="url(#gs-glow)" aria-hidden="true">${frameText(finalFrame, false, true)}</g>`
    : "";
  const finalLayer = `<g class="gs-final">${visibility(timeline.duration, cycle, timing)}${glowLayer}${frameText(finalFrame, true)}</g>`;

  const label = escapeXml((options.label ?? finalFrame.text).replace(/\s+/g, " ").trim());
  const background =
    theme.background === "none"
      ? ""
      : `<rect width="${width}" height="${height}" rx="${round(fontSize * 0.5)}" fill="${theme.background}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="gs-title" xml:space="preserve">` +
    `<title id="gs-title">${label}</title>` +
    "<style>text{white-space:pre}" +
    "@media (prefers-reduced-motion:reduce){.gs-typing,.gs-step{display:none}.gs-final,.gs-blink{opacity:1!important}}</style>" +
    "<defs>" +
    `<filter id="gs-glow" x="-20%" y="-50%" width="140%" height="200%">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${round(fontSize * 0.22)}" result="blur"/>` +
    `<feFlood flood-color="${theme.glow}" flood-opacity="0.85"/>` +
    `<feComposite in2="blur" operator="in" result="glow"/>` +
    `<feMerge><feMergeNode in="glow"/><feMergeNode in="glow"/></feMerge>` +
    "</filter>" +
    clips.join("") +
    "</defs>" +
    background +
    `<g font-family="${escapeXml(mono)}" font-size="${fontSize}">${typingLayer}${steps.join("")}${finalLayer}</g>` +
    "</svg>"
  );
};

/** The whole pipeline to an animated SVG: encode, timeline, render. */
export const renderSvg = (
  input: GlitchSpeakInput,
  options: GlitchSpeakOptions & SvgRenderOptions = {},
): string => timelineToSvg(compile(input, options), options);
