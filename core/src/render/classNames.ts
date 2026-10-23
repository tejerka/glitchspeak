export interface ClassNames {
  /** The block. Carries `data-phase`. */
  root: string;
  /** Visually hidden human text, for screen readers. */
  sr: string;
  /** The animated code, hidden from screen readers. */
  code: string;
  line: string;
  gutter: string;
  plain: string;
  glyph: string;
  noise: string;
  resolved: string;
  cursor: string;
}

export const defaultClassNames: Readonly<ClassNames> = {
  root: "gs-root",
  sr: "gs-sr",
  code: "gs-code",
  line: "gs-line",
  gutter: "gs-gutter",
  plain: "gs-plain",
  glyph: "gs-glyph",
  noise: "gs-noise",
  resolved: "gs-resolved",
  cursor: "gs-cursor",
};

/** Replaces the default class of each given key — pass Tailwind utilities here. */
export const resolveClassNames = (classNames: Partial<ClassNames> = {}): ClassNames => ({
  ...defaultClassNames,
  ...classNames,
});

/**
 * Hides the human text visually but keeps it for screen readers. Inline on purpose: it must hold
 * even without the stylesheet, or the text would show twice.
 */
export const srOnlyStyle =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

export interface RenderOptions {
  /** Line numbers in a gutter, as in an editor. Defaults to `false`. */
  lineNumbers?: boolean;
  /** The cursor character, or `false` for none. Defaults to `"▌"`. */
  cursor?: string | false;
  /** Replaces the human text given to screen readers. Defaults to the source text. */
  label?: string;
}
