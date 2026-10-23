// Plays the reference sentence in the terminal: `npm run demo:terminal`.
// Reads the built core, so the root script builds it first.
import { mountTerminal, parseEncodePreset } from "../core/dist/esm/index.js";

const [text = "nobody on earth knows what any of it means.", encode = "glitch js"] =
  process.argv.slice(2);

const { player } = mountTerminal(process.stdout, text, {
  encode: parseEncodePreset(encode),
  timing: "human",
  lines: 3,
  lineNumbers: true,
});

await player.finished;
