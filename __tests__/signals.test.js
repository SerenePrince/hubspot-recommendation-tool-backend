/**
 * Unit tests for Phase 3: Signal Normalization (buildSignals).
 *
 * We validate that:
 * - HTML and text outputs are capped (defensive bounds for regex matching later).
 * - Meta tags and resources are extracted and normalized.
 * - Cookies are parsed as *names only* (privacy + matching sufficiency).
 * - URL params are stable key/value pairs with a cap.
 * - External (fetched) scripts/styles are included and bounded.
 */
const { buildSignals } = require("../src/core/normalize/signals");

describe("core/normalize/signals - buildSignals", () => {
  test("extracts meta tags, cookie names, and resolves script/css URLs to absolute", () => {
    const fetchResult = {
      requestedUrl: "https://example.com/path?a=1&b=2",
      finalUrl: "https://Example.COM/path?a=1&b=2",
      headers: {
        "set-cookie": ["session=abc; Path=/; HttpOnly", "other=xyz; Path=/"],
        "content-type": "text/html; charset=utf-8",
      },
      html: `
        <html>
          <head>
            <meta name="generator" content="WordPress" />
            <meta property="og:site_name" content="Example" />
            <link rel="stylesheet" href="/styles/main.css" />
            <script src="/js/app.js"></script>
            <style>.inline { color: red; }</style>
          </head>
          <body>
            Hello   world
            <script>console.log("inline");</script>
          </body>
        </html>
      `,
      external: {
        scripts: [{ url: "https://example.com/js/external.js", body: "/* external */", bytes: 12 }],
        stylesheets: [{ url: "https://example.com/css/external.css", body: "body{}", bytes: 6 }],
      },
    };

    const s = buildSignals(fetchResult, { maxUrlParamPairs: 10 });

    // URL normalization lowercases host and protocol
    expect(s.url).toBe("https://example.com/path?a=1&b=2");

    // Cookies are *names only*
    expect(s.cookies).toEqual(["session", "other"]);

    // Meta keys are lowercased and de-duped by key
    expect(s.meta).toEqual({
      generator: "WordPress",
      "og:site_name": "Example",
    });

    // Script src is resolved to absolute and normalized
    expect(s.scriptSrc).toContain("https://example.com/js/app.js");

    // CSS hrefs are resolved to absolute and normalized
    expect(s.css.hrefs).toContain("https://example.com/styles/main.css");

    // Inline + external resources included (bounded by caps)
    expect(s.scripts).toContain('console.log("inline")');
    expect(s.scripts).toContain("/* external */");

    expect(s.css.inline).toContain(".inline");
    expect(s.css.inline).toContain("body{}");

    // Visible text is whitespace-normalized
    expect(s.text).toContain("Hello world");

    // URL params extracted as stable pairs
    expect(s.urlParams).toEqual([{ key: "a", value: "1" }, { key: "b", value: "2" }]);

    // DOM signal is a cheerio function
    expect(typeof s.dom).toBe("function");
  });

  test("caps html/text/scripts/css outputs defensively", () => {
    const huge = "x".repeat(10_000);

    const fetchResult = {
      finalUrl: "https://example.com/",
      headers: { "set-cookie": "a=b" },
      html: `<html><body>${huge}</body><script>${huge}</script><style>${huge}</style></html>`,
      external: {
        scripts: [{ body: huge }],
        stylesheets: [{ body: huge }],
      },
    };

    const s = buildSignals(fetchResult, {
      maxHtmlChars: 1000,
      maxTextChars: 200,
      maxScriptsChars: 300,
      maxCssChars: 400,
    });

    expect(s.html.length).toBeLessThanOrEqual(1000);
    expect(s.text.length).toBeLessThanOrEqual(200);
    expect(s.scripts.length).toBeLessThanOrEqual(300);
    expect(s.css.inline.length).toBeLessThanOrEqual(400);
  });

  test("skips non-fetchable script/css URL schemes", () => {
    const fetchResult = {
      finalUrl: "https://example.com/",
      headers: {},
      html: `
        <html><head>
          <script src="data:text/javascript,alert(1)"></script>
          <script src="javascript:alert(1)"></script>
          <script src="mailto:test@example.com"></script>
          <script src="/ok.js"></script>
          <link rel="stylesheet" href="data:text/css,body{}" />
          <link rel="stylesheet" href="/ok.css" />
        </head><body></body></html>
      `,
      external: { scripts: [], stylesheets: [] },
    };

    const s = buildSignals(fetchResult);

    expect(s.scriptSrc).toEqual(["https://example.com/ok.js"]);
    expect(s.css.hrefs).toEqual(["https://example.com/ok.css"]);
  });

  test("limits URL param pairs to configured cap", () => {
    const params = new Array(200).fill(null).map((_, i) => `k${i}=v${i}`).join("&");
    const fetchResult = {
      finalUrl: `https://example.com/?${params}`,
      headers: {},
      html: "<html><body>ok</body></html>",
      external: { scripts: [], stylesheets: [] },
    };

    const s = buildSignals(fetchResult, { maxUrlParamPairs: 25 });
    expect(s.urlParams).toHaveLength(25);
    expect(s.urlParams[0]).toEqual({ key: "k0", value: "v0" });
  });
});
