import {
  compile,
  type Frame,
  type GlitchSpeakInput,
  type GlitchSpeakOptions,
  type Player,
  play,
  prefersReducedMotion,
  type ReducedMotion,
  type Scheduler,
} from "@tejerka/glitchspeak";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

export interface UseGlitchSpeakOptions extends GlitchSpeakOptions {
  /** Starts on mount. Defaults to `true`. */
  autoplay?: boolean;
  /** Follows `prefers-reduced-motion` by default. See `mount`. */
  reducedMotion?: ReducedMotion;
  scheduler?: Scheduler;
  /** Called each time the animation reaches its end. */
  onDone?: (frame: Frame) => void;
}

export interface UseGlitchSpeak {
  readonly frame: Frame;
  readonly player: Player;
}

/**
 * Runs glitchspeak and returns the current frame, for a custom renderer. The animation restarts
 * when the text or an option changes — pass presets as names, or keep their reference stable.
 */
export const useGlitchSpeak = (
  input: GlitchSpeakInput,
  options: UseGlitchSpeakOptions = {},
): UseGlitchSpeak => {
  const { encode, timing, seed, lines, resolve, scheduler, autoplay = true } = options;
  const reducedMotion = options.reducedMotion ?? "auto";
  const onDone = useRef(options.onDone);
  onDone.current = options.onDone;

  const player = useMemo(() => {
    const created = play(compile(input, { encode, timing, seed, lines, resolve }), {
      scheduler,
      autoplay: false,
    });

    // Known without a browser: the server renders the final frame right away.
    if (reducedMotion === "always") created.skip();

    return created;
  }, [input, encode, timing, seed, lines, resolve, scheduler, reducedMotion]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const subscription = player.subscribe(onChange);
      return () => subscription.unsubscribe();
    },
    [player],
  );
  const frame = useSyncExternalStore(
    subscribe,
    () => player.frame,
    () => player.frame,
  );

  useEffect(() => {
    const subscription = player.subscribe((current) => {
      if (current.phase === "done") onDone.current?.(current);
    });
    const reduced =
      reducedMotion === "always" ||
      (reducedMotion === "auto" && typeof window !== "undefined" && prefersReducedMotion(window));

    if (reduced) player.skip();
    else if (autoplay) player.play();

    return () => {
      subscription.unsubscribe();
      player.pause();
    };
  }, [player, autoplay, reducedMotion]);

  return { frame, player };
};
