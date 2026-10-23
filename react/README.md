# @tejerka/glitchspeak-react

[![npm version](https://img.shields.io/npm/v/@tejerka/glitchspeak-react)](https://www.npmjs.com/package/@tejerka/glitchspeak-react)
[![license](https://img.shields.io/npm/l/@tejerka/glitchspeak-react)](./LICENSE)
[![types](https://img.shields.io/npm/types/@tejerka/glitchspeak-react)](https://www.npmjs.com/package/@tejerka/glitchspeak-react)

> React bindings for [`@tejerka/glitchspeak`](https://www.npmjs.com/package/@tejerka/glitchspeak): text that compiles itself — leetspeak, syntax noise, and a cursor that resolves it back to plain words.

## Installation

```bash
npm install @tejerka/glitchspeak @tejerka/glitchspeak-react
```

Both `@tejerka/glitchspeak` and `react` (>=18) are peer dependencies.

## `<GlitchSpeak />`

```tsx
import { GlitchSpeak } from "@tejerka/glitchspeak-react";
import "@tejerka/glitchspeak/style.css";

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
import { frameToText } from "@tejerka/glitchspeak";
import { useGlitchSpeak } from "@tejerka/glitchspeak-react";

function Status() {
  const { frame, player } = useGlitchSpeak("loading the lore", { timing: "nervous" });

  return <pre onClick={player.restart}>{frameToText(frame)}</pre>;
}
```

The animation restarts when the text or an option changes — pass presets by name, or keep their reference stable.

Full documentation: [github.com/tejerka/glitchspeak](https://github.com/tejerka/glitchspeak#readme) · Demo: [tejerka.github.io/glitchspeak](https://tejerka.github.io/glitchspeak/)
