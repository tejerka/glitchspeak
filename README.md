# @efficimo/glitchspeak

`gl1tch.sp34k()` — `&& m4ke(w0rds) .c0mpile();` → **Words that compile themselves.**

[![npm version](https://img.shields.io/npm/v/@efficimo/glitchspeak)](https://www.npmjs.com/package/@efficimo/glitchspeak)
[![npm version](https://img.shields.io/npm/v/@efficimo/glitchspeak-react?label=%40efficimo%2Fglitchspeak-react)](https://www.npmjs.com/package/@efficimo/glitchspeak-react)
[![license](https://img.shields.io/npm/l/@efficimo/glitchspeak)](./LICENSE)
[![types](https://img.shields.io/npm/types/@efficimo/glitchspeak)](https://www.npmjs.com/package/@efficimo/glitchspeak)

> Make words compile. Turn any sentence into living pseudo-code: leetspeak, syntax noise, and a cursor that resolves it back to plain text. Zero dependencies.

## Live Demo

[https://tejerka.github.io/glitchspeak/](https://tejerka.github.io/glitchspeak/)

```
1  &&   n0b0dy()
2  0n   earth.js kn0ws?
3  wh4t   any[] 0f #0)  means.▌
```

**glitchspeak** makes your text look like it's being written by a machine thinking out loud.

Feed it a sentence. It swaps letters for glyphs (`nobody → n0b0dy`), slips in syntax that doesn't belong (`&&`, `()`, `any[]`, `.js`), and types it all out, character by character. Then the last word breaks free of the code and lands as plain text, glowing.

Use it for AI voices, boot screens, hero titles, loading states, or anywhere your UI should feel like it's _compiling_ rather than _displaying_.

Framework-agnostic core. React bindings. Zero runtime dependencies.

## Packages

| Package                                  | Description                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| [`@efficimo/glitchspeak`](./core)        | Core — encode, timeline, player, DOM, `<glitch-speak>`, HTML/ANSI/text renderers |
| [`@efficimo/glitchspeak-react`](./react) | React bindings — `<GlitchSpeak />` and `useGlitchSpeak`                          |

## Why

A typewriter effect shows text. glitchspeak _compiles_ it: the sentence goes through a small pipeline, and every stage is a plain module you can use on its own.

```
text ──encode──▶ Token[] ──timeline──▶ frameAt(ms) ──play──▶ Player ──▶ mount · <GlitchSpeak> · terminal
```

- **`encode`** — pure and deterministic: the same text, preset and seed always give the same code, so server and client agree.
- **`timeline`** — a pure function of time. No clock, no DOM: seek anywhere, test anything.
- **`play`** — a clock over a timeline, with a `subscribe` shaped like [`@efficimo/observable`](https://github.com/efficimo/observable)'s, without depending on it.
- **Renderers** — DOM, React, a `<glitch-speak>` custom element, HTML strings, ANSI terminals, plain text.
- **Presets** — every mapping and every rhythm is a preset, and every preset `extends()`.
- **Accessible** — screen readers get the human sentence, never the code; `prefers-reduced-motion` gets the final frame right away.

## Installation

```bash
# core only
npm install @efficimo/glitchspeak

# with React bindings
npm install @efficimo/glitchspeak @efficimo/glitchspeak-react
```

## Quick start

```typescript
import { mount } from "@efficimo/glitchspeak";
import "@efficimo/glitchspeak/style.css";

mount(document.querySelector("#hero"), "nobody on earth knows what any of it means.", {
  encode: "glitch", // how the text turns into code
  timing: "human", // how it is typed
  lines: 3,
  lineNumbers: true,
});
```

```tsx
import { GlitchSpeak } from "@efficimo/glitchspeak-react";
import "@efficimo/glitchspeak/style.css";

<GlitchSpeak text="nobody on earth knows what any of it means." lines={3} lineNumbers />;
```

---

## API

### Presets

Each module has its own preset class: `EncodePreset` for the mapping, `TimingPreset` for the rhythm. Wherever a preset is expected, pass a **name**, a **preset**, or **plain options** — nothing means `default`.

```typescript
import { EncodePreset, TimingPreset } from "@efficimo/glitchspeak";

EncodePreset.corrupted.extends(EncodePreset.sql); // corrupted SQL
EncodePreset.corrupted.extends("sql", { caseFlip: 0 }); // names and options work too

const nexusVoice = EncodePreset.scrambled.extends("shell", {
  leet: { preserve: ["NEXUS"] },
  noise: { between: [...EncodePreset.shell.resolve().noise.between, "0xDEAD"] },
});

TimingPreset.nervous.extends({ cps: 60 });
```

| Member                      | Description                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| `Preset.<name>`             | Built-in presets, as static members.                                       |
| `Preset.levels`             | The intensities, in order — ready for a slider.                            |
| `Preset.from(ref?)`         | Normalizes a name, a preset or options into a preset.                      |
| `preset.extends(...layers)` | A new preset: this one, then each layer from left to right. Never mutates. |
| `preset.resolve()`          | The complete, flattened configuration.                                     |
| `preset.options`            | Only what this preset sets.                                                |

**Merge rules.** Resolution always starts from the module's `default`, then applies the chain. Tables (`glyphs`) merge key by key — `null` removes a key. Lists and numbers replace: to add to a list, spread the old one.

### `EncodePreset`

Two families that compose without stepping on each other:
- **Intensities** set densities, glyphs and case — never the noise lists.
- **Languages** set the noise lists — and the odd typed glyph.

| Intensity   | `leet.words` / `leet.chars` | Glyphs                                          | `noise.density` | `caseFlip` |
| ----------- | --------------------------- | ----------------------------------------------- | --------------- | ---------- |
| `clean`     | 0                           | —                                               | 0               | 0          |
| `subtle`    | 0.25 / 1                    | `o`                                             | 0.2             | 0          |
| `glitch`    | 0.55 / 1                    | `a e i o`                                       | 0.5             | 0          |
| `scrambled` | 0.7 / 1                     | + `s t l b g`                                   | 0.65            | 0.1        |
| `corrupted` | 0.9 / 0.8                   | several candidates per letter, Unicode included | 0.85            | 0.25       |

| Language | Noise flavor                                          |
| -------- | ----------------------------------------------------- |
| `js`     | `&&` `()` `.js` `any[]` `#0)` `?.` `=>`               |
| `ts`     | `<T>` `: any` `never` `keyof` `satisfies`             |
| `shell`  | `$` `./` `\|` `2>&1` `/dev/null` `sudo` — and `s → $` |
| `sql`    | `SELECT` `JOIN` `NULL` `--` `_id` `.*`                |
| `regex`  | `^` `\b` `(?:` `.*` `\s+` `{2,}`                      |

`default` is `glitch` + `js`: the reference capture.

| Option                         | Description                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `glyphs`                       | `{ letter: glyph \| glyph[] \| null }`. Lowercase keys, match both cases. With several candidates, the seed picks one per occurrence. |
| `leet.words`                   | Probability that a word is leeted.                                                                                                    |
| `leet.chars`                   | Inside a leeted word, probability that each convertible letter is converted.                                                          |
| `leet.minLength`               | Shorter words are never leeted. Default `2`.                                                                                          |
| `leet.preserve`                | Words never leeted, case-insensitive.                                                                                                 |
| `noise.density`                | Probability that a word gets one piece of noise around it.                                                                            |
| `noise.before` / `noise.after` | Glued to a word: `#id`, `n0b0dy()`.                                                                                                   |
| `noise.between`                | Standalone, between two words: `any[]`.                                                                                               |
| `noise.lineStart`              | Standalone, opening a line: `&&`.                                                                                                     |
| `noise.weights`                | Relative odds of the four slots. Default `{ before: 1, after: 3, between: 2, lineStart: 2 }`.                                         |
| `caseFlip`                     | Probability that each remaining letter has its case flipped.                                                                          |

### `TimingPreset`

From calm to frantic — `TimingPreset.levels` keeps them in order:

| Preset      | `cps` | `jitter` | `wordPause` / `linePause` | `flicker` | `resolveDuration` |
| ----------- | ----- | -------- | ------------------------- | --------- | ----------------- |
| `instant`   | ∞     | 0        | 0 / 0                     | 0         | 0                 |
| `steady`    | 30    | 0        | 0 / 250                   | 0         | 300               |
| `human`     | 28    | 0.35     | 40 / 300                  | 0         | 300               |
| `nervous`   | 40    | 0.6      | 20 / 150                  | 0.03      | 450               |
| `corrupted` | 45    | 0.8      | 0 / 120                   | 0.08      | 700               |

`default` is `human`. `instant` has no animation at all: the final frame right away.

| Option                    | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| `cps`                     | Characters per second. `Infinity` types everything at once. Default `28`.   |
| `jitter`                  | Random variation of each keystroke, in [0, 1].                              |
| `wordPause` / `linePause` | Extra milliseconds after a space / a line break.                            |
| `flicker`                 | Probability that a character is mistyped, erased, then corrected.           |
| `flickerGlyphs`           | Characters drawn for mistypes and for the scramble of resolving words.      |
| `resolveDelay`            | Milliseconds between the last keystroke and the resolution. Default `400`.  |
| `resolveDuration`         | How long resolving words take to decode back. Default `300`.                |

---

### `encode(text, preset?, options?)`

Pure. Returns `Token[]`.

```typescript
encode("nobody on earth knows", "sql", { seed: 42, lines: 2, resolve: "last-word" });
```

| Option    | Description                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `seed`    | Defaults to a hash of the text: stable between server and client.                                                 |
| `lines`   | Rebalances the words into N lines. Line breaks already in the text always win.                                    |
| `resolve` | `'last-word'` (default), `'all'`, `'none'`, word indices (negative from the end), or `(word, index) => boolean`.  |

```typescript
type Token =
  | { kind: "plain" | "glyph"; text: string; source: string; word: number; resolve: boolean }
  | { kind: "noise"; text: string; word: number } // the word it hangs on
  | { kind: "space"; text: string }
  | { kind: "break" };
```

Tokens are plain data: write them by hand to get an exact look — the demo reproduces the reference capture that way. `sourceText(tokens)` gives the human text back.

### `timeline(tokens, preset?, options?)`

Pure. Schedules every keystroke and returns `{ tokens, duration, typingEnd, frameAt(ms) }`.

```typescript
const run = timeline(encode("nobody on earth knows"), "nervous", { seed: 42 });

run.frameAt(0); // empty
run.frameAt(run.duration); // the final frame
```

A `Frame` holds `phase` (`'typing'`, `'resolving'`, `'done'`), `lines` of `{ kind, text }`, `progress`, the human `text`, and a `step` that changes exactly when the content does. When words resolve, they decode back to their source and the noise hanging on them goes away.

The encode and timing draws come from two independent streams of the same seed: changing the rhythm never changes the code.

### `play(timeline, options?)`

A clock over a timeline. Knows nothing about the DOM.

| Member                                                     | Description                                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `subscribe(fn)`                                            | Calls `fn` with the current frame right away, then on every visible change. Returns `{ unsubscribe() }`.  |
| `play()` · `pause()` · `seek(ms)` · `skip()` · `restart()` | Transport.                                                                                                |
| `frame` · `time` · `playing`                               | Current state.                                                                                            |
| `finished`                                                 | Resolves the first time the end is reached.                                                               |
| `destroy()`                                                | Stops the clock and drops every subscriber.                                                               |

Options: `autoplay` (default `true`) and `scheduler` — `requestAnimationFrame` by default, `setTimeout` where there is none, or your own for tests.

### `glitchspeak(input, options?)` and `compile(input, options?)`

The whole pipeline in one call. `input` is a sentence or ready-made tokens; `options` takes `encode`, `timing`, `seed`, `lines` and `resolve` — one seed feeds both stages.

```typescript
import { compile, glitchspeak } from "@efficimo/glitchspeak";

const run = compile("nobody on earth knows", { encode: "sql", timing: "nervous", seed: 42 }); // encode + timeline
const player = glitchspeak("nobody on earth knows", { encode: "sql", autoplay: false }); // + play

player.subscribe((frame) => console.log(frame.phase));
```

### `mount(element, input, options?)`

Renders into `element`, replacing its content. Returns `{ player, unmount() }`.

| Option                                             | Description                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `encode` · `timing` · `seed` · `lines` · `resolve` | As above.                                                                                             |
| `autoplay` · `scheduler`                           | As in `play`.                                                                                         |
| `lineNumbers`                                      | A gutter with line numbers.                                                                           |
| `cursor`                                           | The cursor character, or `false`. Default `'▌'`.                                                      |
| `label`                                            | Replaces the text read by screen readers.                                                             |
| `classNames`                                       | Replaces the class of any part — Tailwind utilities welcome.                                          |
| `reducedMotion`                                    | `'auto'` (default) follows `prefers-reduced-motion`, `'always'` never animates, `'never'` ignores it. |

### `<glitch-speak>`

```html
<script type="module">
  import { defineGlitchSpeakElement } from '@efficimo/glitchspeak';
  defineGlitchSpeakElement();
</script>

<glitch-speak encode="corrupted sql" timing="nervous" lines="3" line-numbers>
  nobody on earth knows what any of it means.
</glitch-speak>
```

Registration is explicit: importing the library never touches the global registry. `defineGlitchSpeakElement(tagName?, registry?)` defaults to `glitch-speak` on `customElements`, and does nothing when the tag is already defined.

| Attribute                  | Value                                                                    |
| -------------------------- | ------------------------------------------------------------------------ |
| `text`                     | The sentence. Defaults to the element content.                           |
| `encode` · `timing`        | One preset name, or several composed from left to right: `corrupted sql` |
| `seed` · `lines`           | Numbers.                                                                 |
| `resolve`                  | `last-word`, `all`, `none`, or word indices: `0,-1`                      |
| `line-numbers`             | Boolean attribute.                                                       |
| `cursor`                   | The cursor character, or `false`.                                        |
| `label` · `reduced-motion` | As in `mount`.                                                           |

Every attribute change replays the animation. The element exposes its `player`. The same parsers are exported for your own integrations: `parseEncodePreset`, `parseTimingPreset`, `parseResolve`, `readAttributes(element)`.

### Embed

The demo site serves an embeddable page — every option is a query parameter:

```html
<iframe
  src="https://tejerka.github.io/glitchspeak/embed/?text=nobody%20on%20earth%20knows&encode=corrupted,sql&timing=nervous&line-numbers"
  title="nobody on earth knows" width="720" height="220" style="border:0"
></iframe>
```

Plus `bg=transparent`, `size` (px) and `align=center`. A click replays it. The playground generates the snippet.

### Renderers

| Function                                 | Output                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `frameToHtml(frame, options?)`           | A self-contained block: SSR, e-mails, static pages.                                                                                   |
| `frameLinesToHtml(frame, options?)`      | The lines only, without the root and the screen reader text.                                                                          |
| `frameToText(frame, options?)`           | Plain text: logs, snapshots.                                                                                                          |
| `frameToAnsi(frame, options?)`           | Terminal colors — `colors: 'truecolor' \| '256' \| 'none'`, `theme`. Resolved words come out bold and bright: terminals have no glow. |
| `mountTerminal(stream, input, options?)` | Plays in a terminal, rewriting its lines in place. Returns `{ player, unmount() }`.                                                   |

Every renderer takes `lineNumbers` and `cursor`; HTML ones also take `label` and `classNames`.

```typescript
import { mountTerminal } from "@efficimo/glitchspeak";

await mountTerminal(process.stdout, "the core is awake", { encode: "scrambled" }).player.finished;
```

`mountTerminal` accepts every `glitchspeak` option, plus:

| Option    | Description                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| `animate` | `'auto'` (default) animates on a TTY only: pipes and log files get the final frame. `true` / `false` force it. |
| `colors`  | Defaults to `'none'` with `NO_COLOR`, `'truecolor'` with `COLORTERM=truecolor`, else `'256'`.                  |
| `theme`   | Hex colors of `plain`, `glyph`, `noise`, `resolved`, `cursor`, `gutter`. Defaults in `defaultAnsiTheme`.       |

Try it from a clone: `npm run demo:terminal -- "the core is awake" "corrupted sql"`.

### Styling

`@efficimo/glitchspeak/style.css` is optional. It styles the `gs-*` classes and reads custom properties:

| Class                                                | Part                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `gs-root`                                            | The block, with `data-phase="typing \| resolving \| done"`                      |
| `gs-code` · `gs-line` · `gs-gutter`                  | Code, lines, line numbers                                                       |
| `gs-plain` · `gs-glyph` · `gs-noise` · `gs-resolved` | Token kinds                                                                     |
| `gs-cursor`                                          | The cursor — blinks once done                                                   |
| `gs-sr`                                              | The human text for screen readers (hidden inline, works without the stylesheet) |

```css
.gs-root {
  --gs-accent: #39ff14;
  --gs-noise: #71717a;
  --gs-font-mono: "VT323", monospace;
  --gs-font-resolved: "Inter", sans-serif;
}
```

Or skip the stylesheet and pass `classNames`: `defaultClassNames` lists the defaults, `resolveClassNames(partial)` merges yours over them.

### Utilities

| Export                                    | Description                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `sourceText(tokens)`                      | The human text behind tokens.                                                                               |
| `Preset` · `mergeOptions(base, layer)`    | The base class of `EncodePreset` and `TimingPreset`, and its merge — to build presets for your own modules. |
| `createRandom(seed)` · `hashString(text)` | The seeded generator (Mulberry32) and string hash (FNV-1a) behind every draw.                               |
| `defaultScheduler()`                      | The clock `play` uses by default.                                                                           |
| `prefersReducedMotion(window)`            | The `prefers-reduced-motion` check `mount` and the React bindings use.                                      |
| `escapeHtml(text)` · `srOnlyStyle`        | What the HTML renderers use to escape text and hide the screen reader label.                                |

---

## React bindings — `@efficimo/glitchspeak-react`

```bash
npm install @efficimo/glitchspeak @efficimo/glitchspeak-react
```

### `<GlitchSpeak />`

```tsx
import { EncodePreset } from "@efficimo/glitchspeak";
import { GlitchSpeak } from "@efficimo/glitchspeak-react";

// Outside the component: a stable reference, so the animation does not restart.
const voice = EncodePreset.scrambled.extends("shell");

function Boot() {
  return (
    <GlitchSpeak
      as="h1"
      text="the core is awake"
      encode={voice}
      timing="nervous"
      className="text-5xl"
      classNames={{ glyph: "text-lime-400", noise: "text-zinc-500" }}
      onDone={() => console.log("compiled")}
    />
  );
}
```

Every `mount` option is a prop — `text` takes a sentence or ready-made tokens — plus `as`, `className` and `onDone`, called each time the animation reaches its end. The animation restarts when the text or an option changes — pass presets by name, or keep their reference stable. On the server, the first frame renders; with `reducedMotion="always"`, the final one.

### `useGlitchSpeak(input, options?)`

Returns `{ frame, player }` for a renderer of your own. Built on `useSyncExternalStore`. Takes the same options as the component, rendering ones aside.

```tsx
import { frameToText } from "@efficimo/glitchspeak";
import { useGlitchSpeak } from "@efficimo/glitchspeak-react";

function Status() {
  const { frame, player } = useGlitchSpeak("loading the lore");

  return <pre onClick={player.restart}>{frameToText(frame)}</pre>;
}
```

---

## Local development

This is an npm workspace: install once from the repository root, then drive each package with `-w`.

```bash
# install every workspace at once
npm ci

# core: typecheck, test, build
npm -w core run typecheck
npm -w core run test
npm -w core run build

# react bindings (build core first — they resolve it from ./core)
npm -w react run typecheck
npm -w react run test
npm -w react run build

# lint and format the whole repo
npm run lint
npm run format

# demo site (reads core and react straight from their sources)
npm run install:demo
npm run dev

# terminal demo
npm run demo:terminal -- "the core is awake" "corrupted sql"
```

## Publishing

Pushing a `v*` tag triggers both publish workflows; each syncs its version from the tag name.

| Tag      | Publishes                                                             |
| -------- | --------------------------------------------------------------------- |
| `v1.2.3` | `@efficimo/glitchspeak@1.2.3` and `@efficimo/glitchspeak-react@1.2.3` |

Every successful CI run on `main` deploys the demo to GitHub Pages.

## License

MIT
