import { renderSvg } from "@tejerka/glitchspeak";
import { parseSvgUrl, RouteError } from "./route.ts";

const USAGE = `glitchspeak — words that compile themselves, as animated SVG.

  /[encode]/[timing]/<text>.svg?seed=42&lines=3&lineNumbers

  encode   clean subtle glitch scrambled corrupted · js ts shell sql regex
           composed with +: corrupted+sql. _ keeps the default.
  timing   instant steady human nervous corrupted
  text     _ is a space: the_core_is_awake.svg (a real underscore is %5F)

  query    seed lines resolve lineNumbers cursor label size loop hold bg accent

  ![nobody on earth knows](https://<this host>/glitch/human/nobody_on_earth_knows.svg?lines=2)

https://github.com/tejerka/glitchspeak
`;

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // Deterministic: one URL, one picture, forever.
  "Cache-Control": "public, max-age=31536000, immutable",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "*",
};

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
  });

export const handle = (request: Request): Response => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return text("Method not allowed\n", 405, { Allow: "GET, HEAD" });
  }

  const url = new URL(request.url);

  if (url.pathname === "/") return text(USAGE, 200, { "Cache-Control": "public, max-age=3600" });
  if (!url.pathname.endsWith(".svg")) return text(`Not found\n\n${USAGE}`, 404);

  try {
    const { text: sentence, options } = parseSvgUrl(url);
    const svg = renderSvg(sentence, options);

    return new Response(request.method === "HEAD" ? null : svg, {
      status: 200,
      headers: SVG_HEADERS,
    });
  } catch (error) {
    if (error instanceof RouteError) return text(`Bad request: ${error.message}\n`, 400);
    throw error;
  }
};

export default {
  fetch: (request: Request): Response => handle(request),
};
