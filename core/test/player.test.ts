import assert from "node:assert/strict";
import test from "node:test";
import { encode, type Frame, play, type Scheduler, timeline } from "../src/index.ts";

/** A clock that only moves when told to. */
const fakeScheduler = () => {
  let now = 0;
  let callbacks = new Map<number, () => void>();
  let next = 0;

  const scheduler: Scheduler = {
    now: () => now,
    request: (callback) => {
      callbacks.set(++next, callback);
      return next;
    },
    cancel: (handle) => {
      callbacks.delete(handle as number);
    },
  };

  const advance = (ms: number) => {
    const end = now + ms;

    while (now < end) {
      now = Math.min(end, now + 16);
      const pending = callbacks;
      callbacks = new Map();
      for (const callback of pending.values()) callback();
    }
  };

  return { scheduler, advance, pending: () => callbacks.size };
};

const run = () =>
  timeline(encode("abcdefghij", "clean", { resolve: "none" }), { cps: 10, jitter: 0 });

test("play — emits the current frame on subscribe", () => {
  const { scheduler } = fakeScheduler();
  const player = play(run(), { scheduler, autoplay: false });
  const frames: Frame[] = [];

  player.subscribe((frame) => frames.push(frame));

  assert.equal(frames.length, 1);
  assert.equal(frames[0]?.time, 0);
});

test("play — follows the clock and only emits visible changes", () => {
  const clock = fakeScheduler();
  const player = play(run(), { scheduler: clock.scheduler });
  const frames: Frame[] = [];

  player.subscribe((frame) => frames.push(frame));
  clock.advance(1000);

  assert.equal(frames.length, 11);
  assert.equal(new Set(frames.map((frame) => frame.step)).size, 11);
  assert.equal(player.frame.phase, "done");
  assert.equal(player.playing, false);
  assert.equal(clock.pending(), 0);
});

test("play — finished resolves at the end", async () => {
  const clock = fakeScheduler();
  const player = play(run(), { scheduler: clock.scheduler });
  let done = false;

  player.finished.then(() => {
    done = true;
  });
  clock.advance(500);
  await Promise.resolve();
  assert.equal(done, false);

  clock.advance(600);
  await player.finished;
  assert.equal(done, true);
});

test("play — pause holds the position, play resumes it", () => {
  const clock = fakeScheduler();
  const player = play(run(), { scheduler: clock.scheduler });

  clock.advance(320);
  player.pause();
  const time = player.time;
  clock.advance(500);

  assert.equal(player.time, time);
  assert.equal(clock.pending(), 0);

  player.play();
  clock.advance(100);
  assert.ok(player.time > time);
});

test("play — skip jumps to the final frame", () => {
  const clock = fakeScheduler();
  const player = play(run(), { scheduler: clock.scheduler });

  player.skip();

  assert.equal(player.frame.phase, "done");
  assert.equal(player.playing, false);
  assert.equal(clock.pending(), 0);
});

test("play — seek moves anywhere, restart plays again", () => {
  const clock = fakeScheduler();
  const player = play(run(), { scheduler: clock.scheduler, autoplay: false });

  player.seek(450);
  assert.equal(player.frame.lines[0]?.map((token) => token.text).join(""), "abcd");

  player.skip();
  player.restart();
  assert.equal(player.time, 0);
  assert.equal(player.playing, true);
});

test("play — unsubscribe and destroy stop the notifications", () => {
  const clock = fakeScheduler();
  const player = play(run(), { scheduler: clock.scheduler });
  let calls = 0;

  const subscription = player.subscribe(() => calls++);
  subscription.unsubscribe();
  player.subscribe(() => calls++);
  player.destroy();
  clock.advance(1000);

  assert.equal(calls, 2);
  assert.equal(player.playing, false);
});
