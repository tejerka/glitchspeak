import type { Frame, Timeline } from "../timeline/timeline.ts";

/** The clock behind a player. Swap it for a fake one in tests. */
export interface Scheduler {
  now(): number;
  request(callback: () => void): unknown;
  cancel(handle: unknown): void;
}

/** Same shape as `@efficimo/observable`'s subscription, without depending on it. */
export interface Subscription {
  unsubscribe(): void;
}

export interface PlayOptions {
  /** Defaults to `requestAnimationFrame`, or `setTimeout` where there is none (Node). */
  scheduler?: Scheduler;
  /** Starts right away. Defaults to `true`. */
  autoplay?: boolean;
}

export interface Player {
  readonly timeline: Timeline;
  /** The frame on screen now. */
  readonly frame: Frame;
  /** Position in the timeline, in milliseconds. */
  readonly time: number;
  readonly playing: boolean;
  /** Resolves the first time the timeline reaches its end. */
  readonly finished: Promise<void>;
  /** Calls `subscriber` with the current frame right away, then on every visible change. */
  subscribe(subscriber: (frame: Frame) => void): Subscription;
  play(): void;
  pause(): void;
  seek(time: number): void;
  /** Jumps to the final frame. */
  skip(): void;
  /** Back to the start, and plays. */
  restart(): void;
  /** Stops the clock and drops every subscriber. */
  destroy(): void;
}

type GlobalScheduling = {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
  performance?: { now(): number };
};

export const defaultScheduler = (): Scheduler => {
  const scope = globalThis as GlobalScheduling;
  const now = () => (scope.performance ? scope.performance.now() : Date.now());

  if (typeof scope.requestAnimationFrame === "function" && scope.cancelAnimationFrame) {
    const request = scope.requestAnimationFrame;
    const cancel = scope.cancelAnimationFrame;

    return {
      now,
      request: (callback) => request(callback),
      cancel: (handle) => cancel(handle as number),
    };
  }

  return {
    now,
    request: (callback) => setTimeout(callback, 16),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
};

/** Drives a timeline with a clock. Knows nothing about the DOM. */
export const play = (timeline: Timeline, options: PlayOptions = {}): Player => {
  const scheduler = options.scheduler ?? defaultScheduler();
  const subscribers = new Set<(frame: Frame) => void>();
  let frame = timeline.frameAt(0);
  let time = 0;
  let startedAt = 0;
  let playing = false;
  let handle: unknown;
  let finish: () => void = () => {};
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const update = () => {
    const next = timeline.frameAt(time);

    if (next.step !== frame.step) {
      frame = next;
      for (const subscriber of [...subscribers]) subscriber(frame);
    }

    if (time >= timeline.duration) {
      playing = false;
      finish();
    }
  };

  const tick = () => {
    time = Math.min(scheduler.now() - startedAt, timeline.duration);
    update();
    if (playing) handle = scheduler.request(tick);
  };

  const stopClock = () => {
    if (playing) scheduler.cancel(handle);
    playing = false;
  };

  const player: Player = {
    timeline,
    get frame() {
      return frame;
    },
    get time() {
      return time;
    },
    get playing() {
      return playing;
    },
    finished,
    subscribe: (subscriber) => {
      subscribers.add(subscriber);
      subscriber(frame);

      return { unsubscribe: () => subscribers.delete(subscriber) };
    },
    play: () => {
      if (playing) return;
      if (time >= timeline.duration) {
        update();
        return;
      }

      startedAt = scheduler.now() - time;
      playing = true;
      handle = scheduler.request(tick);
    },
    pause: () => {
      if (!playing) return;

      time = Math.min(scheduler.now() - startedAt, timeline.duration);
      stopClock();
    },
    seek: (target) => {
      time = Math.min(Math.max(0, target), timeline.duration);
      startedAt = scheduler.now() - time;
      if (time >= timeline.duration) stopClock();
      update();
    },
    skip: () => player.seek(timeline.duration),
    restart: () => {
      player.seek(0);
      player.play();
    },
    destroy: () => {
      stopClock();
      subscribers.clear();
    },
  };

  if (options.autoplay ?? true) player.play();

  return player;
};
