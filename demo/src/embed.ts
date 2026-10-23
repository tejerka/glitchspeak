import { defineGlitchSpeakElement } from "@efficimo/glitchspeak";
import "@efficimo/glitchspeak/style.css";
import "./embed.css";

/**
 * /embed/?text=…&encode=corrupted,sql&timing=nervous&seed=42&lines=3&resolve=last-word
 *        &line-numbers&cursor=▌&label=…&bg=transparent&size=32&align=center
 *
 * Every parameter but `text` is optional. A click replays the animation.
 */
const params = new URLSearchParams(window.location.search);
const root = document.getElementById("root") as HTMLElement;
const ATTRIBUTES = ["encode", "timing", "seed", "lines", "resolve", "cursor", "label"] as const;

defineGlitchSpeakElement();

document.body.dataset.bg = params.get("bg") === "transparent" ? "transparent" : "dark";
root.dataset.align = params.get("align") === "center" ? "center" : "start";

const size = Number(params.get("size"));
if (Number.isFinite(size) && size > 0) root.style.fontSize = `${Math.min(size, 200)}px`;

const element = document.createElement("glitch-speak");
element.setAttribute("text", params.get("text") ?? "nobody on earth knows what any of it means.");
for (const name of ATTRIBUTES) {
  const value = params.get(name);
  if (value !== null) element.setAttribute(name, value);
}
if (params.has("line-numbers")) element.setAttribute("line-numbers", "");

try {
  root.append(element);
} catch (error) {
  root.textContent = error instanceof Error ? error.message : String(error);
}

root.addEventListener("click", () => {
  (element as HTMLElement & { player?: { restart(): void } }).player?.restart();
});
