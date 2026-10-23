import {
  type ClassNames,
  type GlitchSpeakInput,
  type RenderOptions,
  resolveClassNames,
  srOnlyStyle,
} from "@efficimo/glitchspeak";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { type UseGlitchSpeakOptions, useGlitchSpeak } from "./useGlitchSpeak.ts";

export interface GlitchSpeakProps extends UseGlitchSpeakOptions, RenderOptions {
  /** The sentence, or ready-made tokens. */
  text: GlitchSpeakInput;
  /** The root element. Defaults to `"div"`. */
  as?: ElementType;
  /** Added to the root class. */
  className?: string;
  /** Replaces the default `gs-*` class of each part — Tailwind utilities welcome. */
  classNames?: Partial<ClassNames>;
}

const SR_ONLY: CSSProperties = Object.fromEntries(
  srOnlyStyle.split(";").map((declaration) => {
    const [property = "", value = ""] = declaration.split(":");
    return [property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value];
  }),
);

/** Text that compiles itself. Screen readers get the human text; the code is hidden from them. */
export const GlitchSpeak = ({
  text,
  as: Root = "div",
  className,
  classNames,
  lineNumbers = false,
  cursor = "▌",
  label,
  ...options
}: GlitchSpeakProps): ReactNode => {
  const { frame } = useGlitchSpeak(text, options);
  const names = resolveClassNames(classNames);
  const last = frame.lines.length - 1;

  return (
    <Root
      className={className ? `${names.root} ${className}` : names.root}
      data-phase={frame.phase}
    >
      <span className={names.sr} style={SR_ONLY}>
        {label ?? frame.text}
      </span>
      <div className={names.code} aria-hidden="true">
        {frame.lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines only ever grow at the end.
          <div key={index} className={names.line}>
            {lineNumbers && <span className={names.gutter}>{index + 1}</span>}
            {line.map((token, position) =>
              token.kind === "space" ? (
                token.text
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: tokens only ever grow at the end.
                <span key={position} className={names[token.kind]}>
                  {token.text}
                </span>
              ),
            )}
            {cursor !== false && index === last && <span className={names.cursor}>{cursor}</span>}
          </div>
        ))}
      </div>
    </Root>
  );
};
