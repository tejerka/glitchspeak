import { EncodePreset, type EncodePresetName, type TimingPresetName } from "@tejerka/glitchspeak";
import { GlitchSpeak } from "@tejerka/glitchspeak-react";
import { useMemo, useState } from "react";
import { CAPTURE, CAPTURE_LABEL } from "./capture.ts";

const LEVELS = ["clean", "subtle", "glitch", "scrambled", "corrupted"] as const;
const LANGUAGES = ["js", "ts", "shell", "sql", "regex"] as const;
const TIMINGS = ["instant", "steady", "human", "nervous", "corrupted"] as const;
const RESOLVES = ["last-word", "all", "none"] as const;

type Language = (typeof LANGUAGES)[number];
type ResolveMode = (typeof RESOLVES)[number];
type SnippetKind = "react" | "vanilla" | "element" | "iframe" | "terminal";

const REPO = "https://github.com/tejerka/glitchspeak";
const NPM = "https://www.npmjs.com/package/@tejerka/glitchspeak";
const CDN = "https://cdn.jsdelivr.net/npm/@tejerka/glitchspeak";

interface Settings {
  text: string;
  level: number;
  language: Language;
  timing: TimingPresetName;
  seed: number;
  lines: number;
  resolve: ResolveMode;
  lineNumbers: boolean;
}

const encodeNames = ({ level, language }: Settings): EncodePresetName[] => [
  LEVELS[level] as EncodePresetName,
  language,
];

const snippet = (kind: SnippetKind, settings: Settings, embedUrl: string): string => {
  const [level, language] = encodeNames(settings);
  const text = JSON.stringify(settings.text);
  const lineNumbers = settings.lineNumbers;

  switch (kind) {
    case "react":
      return `import { EncodePreset } from "@tejerka/glitchspeak";
import { GlitchSpeak } from "@tejerka/glitchspeak-react";
import "@tejerka/glitchspeak/style.css";

// Outside the component: a stable reference, so the animation does not restart.
const voice = EncodePreset.${level}.extends("${language}");

<GlitchSpeak
  text=${text}
  encode={voice}
  timing="${settings.timing}"
  seed={${settings.seed}}
  lines={${settings.lines}}
  resolve="${settings.resolve}"${lineNumbers ? "\n  lineNumbers" : ""}
/>`;
    case "vanilla":
      return `import { EncodePreset, mount } from "@tejerka/glitchspeak";
import "@tejerka/glitchspeak/style.css";

mount(document.querySelector("#hero"), ${text}, {
  encode: EncodePreset.${level}.extends("${language}"),
  timing: "${settings.timing}",
  seed: ${settings.seed},
  lines: ${settings.lines},
  resolve: "${settings.resolve}",${lineNumbers ? "\n  lineNumbers: true," : ""}
});`;
    case "element":
      return `<link rel="stylesheet" href="${CDN}/style.css" />
<script type="module">
  import { defineGlitchSpeakElement } from "${CDN}/+esm";
  defineGlitchSpeakElement();
</script>

<glitch-speak encode="${level} ${language}" timing="${settings.timing}" seed="${settings.seed}"
  lines="${settings.lines}" resolve="${settings.resolve}"${lineNumbers ? " line-numbers" : ""}>
  ${settings.text}
</glitch-speak>`;
    case "iframe":
      return `<iframe
  src="${embedUrl}"
  title=${JSON.stringify(settings.text)}
  width="720" height="220" style="border:0"
></iframe>`;
    case "terminal":
      return `import { mountTerminal } from "@tejerka/glitchspeak";

mountTerminal(process.stdout, ${text}, {
  encode: "${level}",
  timing: "${settings.timing}",
  seed: ${settings.seed},
  lines: ${settings.lines},${lineNumbers ? "\n  lineNumbers: true," : ""}
});`;
  }
};

const Logo = () => (
  <h1 className="logo">
    gl<span className="accent">1</span>tch.sp<span className="accent">34</span>k
    <span className="dim">()</span>
  </h1>
);

export const App = () => {
  const [captureRun, setCaptureRun] = useState(0);
  const [run, setRun] = useState(0);
  const [kind, setKind] = useState<SnippetKind>("react");
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    text: "nobody on earth knows what any of it means.",
    level: 2,
    language: "js",
    timing: "human",
    seed: 42,
    lines: 3,
    resolve: "last-word",
    lineNumbers: true,
  });

  const update = <Key extends keyof Settings>(key: Key, value: Settings[Key]) =>
    setSettings((previous) => ({ ...previous, [key]: value }));

  const { level, language } = settings;
  const encode = useMemo(
    () => EncodePreset.from(LEVELS[level] as EncodePresetName).extends(language),
    [level, language],
  );

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      text: settings.text,
      encode: encodeNames(settings).join(","),
      timing: settings.timing,
      seed: String(settings.seed),
      lines: String(settings.lines),
      resolve: settings.resolve,
    });
    if (settings.lineNumbers) params.set("line-numbers", "");

    return new URL(`${import.meta.env.BASE_URL}embed/?${params}`, window.location.origin).href;
  }, [settings]);

  const code = snippet(kind, settings, embedUrl);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <Logo />
        <p className="tagline">
          <span className="dim">&amp;&amp;</span> m<span className="accent">4</span>ke
          <span className="dim">(</span>w<span className="accent">0</span>rds
          <span className="dim">)</span> <span className="dim">.</span>c
          <span className="accent">0</span>mpile<span className="dim">();</span>
        </p>
        <p className="subtitle">Words that compile themselves.</p>
        <nav className="links">
          <a href={REPO}>GitHub</a>
          <a href={NPM}>npm</a>
          <a href={`${REPO}#readme`}>Docs</a>
        </nav>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>The capture</h2>
          <button type="button" onClick={() => setCaptureRun((count) => count + 1)}>
            ↻ replay
          </button>
        </div>
        <p className="lede">
          Hand-written tokens, played by the engine: leet glyphs in green, syntax noise in grey, and
          the last word breaking free of the code.
        </p>
        <div className="editor editor--capture">
          <div className="editor-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>voice.js</span>
          </div>
          <GlitchSpeak
            key={captureRun}
            text={CAPTURE}
            label={CAPTURE_LABEL}
            timing="human"
            lineNumbers
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Playground</h2>
          <button type="button" onClick={() => setRun((count) => count + 1)}>
            ↻ replay
          </button>
        </div>

        <div className="playground">
          <div className="controls">
            <label className="field field--wide">
              <span>text</span>
              <textarea
                rows={3}
                value={settings.text}
                onChange={(event) => update("text", event.target.value)}
              />
            </label>

            <label className="field field--wide">
              <span>
                intensity <b>{LEVELS[settings.level]}</b>
              </span>
              <input
                type="range"
                min={0}
                max={LEVELS.length - 1}
                value={settings.level}
                onChange={(event) => update("level", Number(event.target.value))}
              />
            </label>

            <label className="field">
              <span>language</span>
              <select
                value={settings.language}
                onChange={(event) => update("language", event.target.value as Language)}
              >
                {LANGUAGES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>timing</span>
              <select
                value={settings.timing}
                onChange={(event) => update("timing", event.target.value as TimingPresetName)}
              >
                {TIMINGS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>seed</span>
              <span className="seed">
                <input
                  type="number"
                  value={settings.seed}
                  onChange={(event) => update("seed", Number(event.target.value) || 0)}
                />
                <button
                  type="button"
                  title="New seed"
                  onClick={() => update("seed", Math.floor(Math.random() * 10_000))}
                >
                  ⚄
                </button>
              </span>
            </label>

            <label className="field">
              <span>lines</span>
              <input
                type="number"
                min={1}
                max={8}
                value={settings.lines}
                onChange={(event) => update("lines", Math.max(1, Number(event.target.value) || 1))}
              />
            </label>

            <label className="field">
              <span>resolve</span>
              <select
                value={settings.resolve}
                onChange={(event) => update("resolve", event.target.value as ResolveMode)}
              >
                {RESOLVES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className="field field--check">
              <input
                type="checkbox"
                checked={settings.lineNumbers}
                onChange={(event) => update("lineNumbers", event.target.checked)}
              />
              <span>line numbers</span>
            </label>
          </div>

          <div className="editor editor--play">
            <GlitchSpeak
              key={run}
              text={settings.text}
              encode={encode}
              timing={settings.timing}
              seed={settings.seed}
              lines={settings.lines}
              resolve={settings.resolve}
              lineNumbers={settings.lineNumbers}
            />
          </div>
        </div>

        <div className="snippet">
          <div className="tabs" role="tablist">
            {(["react", "vanilla", "element", "iframe", "terminal"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={kind === name}
                onClick={() => setKind(name)}
              >
                {name === "element" ? "<glitch-speak>" : name}
              </button>
            ))}
            <button type="button" className="copy" onClick={copy}>
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
          {kind === "iframe" && (
            <p className="note">
              <a href={embedUrl}>Open the embed</a> — every option is a query parameter, plus{" "}
              <code>bg=transparent</code>, <code>size</code> and <code>align=center</code>.
            </p>
          )}
        </div>
      </section>

      <footer className="footer">
        <code>npm install @tejerka/glitchspeak</code>
        <span>
          MIT · <a href={REPO}>tejerka/glitchspeak</a>
        </span>
      </footer>
    </div>
  );
};
