import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlitchSpeak } from "../src/index.ts";

test("GlitchSpeak — server markup hides the code and exposes the human text", () => {
  const html = renderToStaticMarkup(<GlitchSpeak text="nobody on earth knows" />);

  assert.match(html, /^<div class="gs-root" data-phase="typing">/);
  assert.match(
    html,
    /<span class="gs-sr" style="[^"]*position:absolute[^"]*">nobody on earth knows<\/span>/,
  );
  assert.match(html, /<div class="gs-code" aria-hidden="true">/);
});

test("GlitchSpeak — reducedMotion always renders the final frame on the server", () => {
  const html = renderToStaticMarkup(
    <GlitchSpeak text={"one\ntwo"} encode="clean" reducedMotion="always" lineNumbers />,
  );

  assert.match(html, /data-phase="done"/);
  assert.match(html, /<span class="gs-gutter">1<\/span><span class="gs-plain">one<\/span>/);
  assert.match(
    html,
    /<span class="gs-gutter">2<\/span><span class="gs-resolved">two<\/span><span class="gs-cursor">▌<\/span>/,
  );
});

test("GlitchSpeak — as, className, classNames, label and cursor", () => {
  const html = renderToStaticMarkup(
    <GlitchSpeak
      text="hello world"
      as="h1"
      className="hero"
      classNames={{ resolved: "font-bold" }}
      label="Hello, world."
      cursor={false}
      encode="clean"
      timing="instant"
    />,
  );

  assert.match(html, /^<h1 class="gs-root hero" data-phase="done">/);
  assert.match(html, />Hello, world\.<\/span>/);
  assert.match(html, /<span class="font-bold">world<\/span>/);
  assert.ok(!html.includes("gs-cursor"));
});
