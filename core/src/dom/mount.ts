import { type GlitchSpeakInput, type GlitchSpeakOptions, glitchspeak } from "../glitchspeak.ts";
import type { Player, PlayOptions } from "../player/player.ts";
import { resolveClassNames, srOnlyStyle } from "../render/classNames.ts";
import { frameLinesToHtml, type HtmlRenderOptions } from "../render/html.ts";

export type ReducedMotion = "auto" | "always" | "never";

export interface MountOptions extends GlitchSpeakOptions, PlayOptions, HtmlRenderOptions {
  /**
   * `"auto"` (default) follows `prefers-reduced-motion`: when the user asks for less motion, the
   * final frame shows right away. `"always"` never animates, `"never"` ignores the preference.
   */
  reducedMotion?: ReducedMotion;
}

export interface Mounted {
  readonly player: Player;
  /** Stops the animation and removes what `mount` added. */
  unmount(): void;
}

export const prefersReducedMotion = (view: Window | null | undefined): boolean =>
  typeof view?.matchMedia === "function" &&
  view.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Renders glitchspeak inside `element`, replacing its content. Screen readers get the human text;
 * the animated code is hidden from them.
 */
export const mount = (
  element: Element,
  input: GlitchSpeakInput,
  options: MountOptions = {},
): Mounted => {
  const document = element.ownerDocument;
  const names = resolveClassNames(options.classNames);
  const reduced =
    options.reducedMotion === "always" ||
    (options.reducedMotion !== "never" && prefersReducedMotion(document.defaultView));
  const player = glitchspeak(input, { ...options, autoplay: false });

  const root = document.createElement("div");
  const label = document.createElement("span");
  const code = document.createElement("div");

  root.className = names.root;
  label.className = names.sr;
  label.setAttribute("style", srOnlyStyle);
  label.textContent = options.label ?? player.frame.text;
  code.className = names.code;
  code.setAttribute("aria-hidden", "true");
  root.append(label, code);
  element.replaceChildren(root);

  const subscription = player.subscribe((frame) => {
    root.setAttribute("data-phase", frame.phase);
    code.innerHTML = frameLinesToHtml(frame, options);
  });

  if (reduced) player.skip();
  else if (options.autoplay ?? true) player.play();

  return {
    player,
    unmount: () => {
      subscription.unsubscribe();
      player.destroy();
      root.remove();
    },
  };
};
