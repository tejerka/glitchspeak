import type { Frame } from "../timeline/timeline.ts";
import type { RenderOptions } from "./classNames.ts";

export const gutterWidth = (frame: Frame): number => String(frame.lines.length).length;

/** Plain text, no styling: logs, snapshots, anything that only takes a string. */
export const frameToText = (
  frame: Frame,
  { lineNumbers = false, cursor = "▌" }: Omit<RenderOptions, "label"> = {},
): string => {
  const width = gutterWidth(frame);

  return frame.lines
    .map((line, index) => {
      const gutter = lineNumbers ? `${String(index + 1).padStart(width)}  ` : "";
      const end = cursor !== false && index === frame.lines.length - 1 ? cursor : "";

      return gutter + line.map((token) => token.text).join("") + end;
    })
    .join("\n");
};
