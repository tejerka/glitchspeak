import { type GlitchSpeakInput, type GlitchSpeakOptions, glitchspeak } from "../glitchspeak.ts";
import type { Player, PlayOptions } from "../player/player.ts";
import type { Frame } from "../timeline/timeline.ts";
import { type AnsiColors, type AnsiRenderOptions, frameToAnsi } from "./ansi.ts";

/** Anything with a `write`: `process.stdout`, a socket, a test double. */
export interface TerminalStream {
  write(chunk: string): unknown;
  isTTY?: boolean;
}

export interface MountTerminalOptions
  extends GlitchSpeakOptions,
    Omit<PlayOptions, "autoplay">,
    Omit<AnsiRenderOptions, "colors"> {
  /** Defaults to `NO_COLOR` → none, `COLORTERM=truecolor` → truecolor, else 256. */
  colors?: AnsiColors;
  /**
   * `"auto"` (default) skips the animation when the stream is not a TTY: pipes and log files get
   * the final frame only.
   */
  animate?: "auto" | boolean;
}

export interface MountedTerminal {
  readonly player: Player;
  /** Stops writing. The text already written stays. */
  unmount(): void;
}

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_DOWN = "\x1b[J";

const detectColors = (): AnsiColors => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;

  if (env?.NO_COLOR !== undefined && env.NO_COLOR !== "") return "none";
  if (env?.COLORTERM === "truecolor" || env?.COLORTERM === "24bit") return "truecolor";

  return "256";
};

/** Plays glitchspeak in a terminal, rewriting its lines in place. */
export const mountTerminal = (
  stream: TerminalStream,
  input: GlitchSpeakInput,
  options: MountTerminalOptions = {},
): MountedTerminal => {
  const colors = options.colors ?? detectColors();
  const animate =
    options.animate === "auto" || options.animate === undefined
      ? stream.isTTY === true
      : options.animate;
  const render = (frame: Frame) => frameToAnsi(frame, { ...options, colors });
  const player = glitchspeak(input, { ...options, autoplay: false });

  if (!animate) {
    player.skip();
    stream.write(`${render(player.frame)}\n`);

    return { player, unmount: () => player.destroy() };
  }

  let written = 0;
  let closed = false;

  const close = () => {
    if (closed) return;

    closed = true;
    stream.write(`\n${SHOW_CURSOR}`);
  };

  stream.write(HIDE_CURSOR);

  const subscription = player.subscribe((frame) => {
    const up = written > 1 ? `\x1b[${written - 1}A` : "";

    stream.write(`${up}\r${CLEAR_DOWN}${render(frame)}`);
    written = frame.lines.length;

    if (frame.phase === "done") close();
  });

  player.play();

  return {
    player,
    unmount: () => {
      subscription.unsubscribe();
      player.destroy();
      close();
    },
  };
};
