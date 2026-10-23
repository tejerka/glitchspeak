import type { Frame } from "../timeline/timeline.ts";
import {
  type ClassNames,
  type RenderOptions,
  resolveClassNames,
  srOnlyStyle,
} from "./classNames.ts";

export interface HtmlRenderOptions extends RenderOptions {
  classNames?: Partial<ClassNames>;
}

const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ESCAPES[char] as string);

/** The lines only, without the root and the screen reader text. Used by `mount`. */
export const frameLinesToHtml = (
  frame: Frame,
  { lineNumbers = false, cursor = "▌", classNames }: HtmlRenderOptions = {},
): string => {
  const names = resolveClassNames(classNames);

  return frame.lines
    .map((line, index) => {
      const gutter = lineNumbers ? `<span class="${names.gutter}">${index + 1}</span>` : "";
      const tokens = line
        .map((token) =>
          token.kind === "space"
            ? escapeHtml(token.text)
            : `<span class="${names[token.kind]}">${escapeHtml(token.text)}</span>`,
        )
        .join("");
      const end =
        cursor !== false && index === frame.lines.length - 1
          ? `<span class="${names.cursor}">${escapeHtml(cursor)}</span>`
          : "";

      return `<div class="${names.line}">${gutter}${tokens}${end}</div>`;
    })
    .join("");
};

/**
 * A complete, self-contained block: server rendering, e-mails, static pages. The code is hidden
 * from screen readers, which read the human text instead.
 */
export const frameToHtml = (frame: Frame, options: HtmlRenderOptions = {}): string => {
  const names = resolveClassNames(options.classNames);
  const label = escapeHtml(options.label ?? frame.text);

  return (
    `<div class="${names.root}" data-phase="${frame.phase}">` +
    `<span class="${names.sr}" style="${srOnlyStyle}">${label}</span>` +
    `<div class="${names.code}" aria-hidden="true">${frameLinesToHtml(frame, options)}</div>` +
    "</div>"
  );
};
