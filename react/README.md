# @efficimo/glitchspeak-react

[![npm version](https://img.shields.io/npm/v/@efficimo/glitchspeak-react)](https://www.npmjs.com/package/@efficimo/glitchspeak-react)
[![license](https://img.shields.io/npm/l/@efficimo/glitchspeak-react)](./LICENSE)
[![types](https://img.shields.io/npm/types/@efficimo/glitchspeak-react)](https://www.npmjs.com/package/@efficimo/glitchspeak-react)

> React bindings for [`@efficimo/glitchspeak`](https://www.npmjs.com/package/@efficimo/glitchspeak): text that compiles itself — leetspeak, syntax noise, and a cursor that resolves it back to plain words.

## Installation

```bash
npm install @efficimo/glitchspeak @efficimo/glitchspeak-react
```

Both `@efficimo/glitchspeak` and `react` (>=18) are peer dependencies.

## `<GlitchSpeak />`

```tsx
import { GlitchSpeak } from "@efficimo/glitchspeak-react";
import "@efficimo/glitchspeak/style.css";

<GlitchSpeak
  text="nobody on earth knows what any of it means."
  encode="glitch"
  timing="human"
  lines={3}
  lineNumbers
/>;
```

| Prop                                    | Description                                                            |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `text`                                  | The sentence, or ready-made tokens.                                    |
| `encode` · `timing`                     | A preset name, a preset, or plain options.                             |
| `seed` · `lines` · `resolve`            | See `encode`.                                                          |
| `lineNumbers` · `cursor` · `label`      | Rendering.                                                             |
| `as` · `className` · `classNames`       | The root element, an extra class, per-part classes (Tailwind welcome). |
| `autoplay` · `reducedMotion` · `onDone` | Playback.                                                              |

Screen readers get the human text; the code is hidden from them. `prefers-reduced-motion` gets the final frame right away.

## `useGlitchSpeak`

```tsx
import { frameToText } from "@efficimo/glitchspeak";
import { useGlitchSpeak } from "@efficimo/glitchspeak-react";

function Status() {
  const { frame, player } = useGlitchSpeak("loading the lore", { timing: "nervous" });

  return <pre onClick={player.restart}>{frameToText(frame)}</pre>;
}
```

The animation restarts when the text or an option changes — pass presets by name, or keep their reference stable.

Full documentation: [github.com/efficimo/glitchspeak](https://github.com/efficimo/glitchspeak#readme) · Demo: [efficimo.github.io/glitchspeak](https://efficimo.github.io/glitchspeak/)
