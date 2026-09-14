import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { chromium } from "playwright";

const read = file => readFile(new URL(`../../${file}`, import.meta.url), "utf8");

test("search recovers from a failed request and routes every exact action with correct keyboard boundaries", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    let attempts = 0;
    const index = await read("docs/search-index.json");
    await page.route("https://docs.test/search-index.json", route => {
      attempts++;
      return route.fulfill(attempts === 1 ? { status: 503, body: "Unavailable" }
        : { contentType: "application/json", body: index });
    });
    await page.setContent('<base href="https://docs.test/"><div class="docs-search"><input id="docs-search-input"><ul id="docs-search-results" hidden></ul></div><div id="docs-search-config" data-root-url="/" data-index-url="/search-index.json"></div>');
    await page.addScriptTag({ content: await read("docs/assets/js/docs-search.js") });
    const input = page.locator("input");
    await input.focus();
    await page.getByRole("button", { name: "Retry search" }).waitFor();
    assert.equal(await input.isEnabled(), true);
    await page.getByRole("button", { name: "Retry search" }).click();
    await input.fill("legend");
    await page.locator('[role="option"]').first().waitFor();
    const count = await page.locator('[role="option"]').count();
    await input.press("ArrowUp");
    assert.equal(await input.getAttribute("aria-activedescendant"), `docs-search-option-${count - 1}`);
    await input.press("ArrowDown");
    assert.equal(await input.getAttribute("aria-activedescendant"), "docs-search-option-0");
    const links = JSON.parse(await read("docs/_data/action_reference_links.json"));
    for (const [name, route] of Object.entries(links)) {
      await input.fill(name);
      await page.waitForFunction(expected => document.querySelector('[role="option"]')?.getAttribute("href") === expected,
        `https://docs.test${route}`);
    }
    await input.press("Escape");
    assert.equal(await input.getAttribute("aria-expanded"), "false");
    assert.equal(await input.getAttribute("aria-activedescendant"), null);
    assert.equal(attempts, 2);
  } finally { await browser.close(); }
});

test("action filtering updates TOC visibility and counts and a hidden hash target can be revealed", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const metadata = JSON.parse(await read("docs/_data/action_metadata.json"));
    const names = Object.keys(metadata).slice(0, 35);
    await page.setContent('<a class="docs-brand" href="https://docs.test/"></a><main class="docs-content">' + names.map(name =>
      `<h2 id="${name.toLowerCase()}"><code>${name}</code></h2><p>Behavior of ${name}</p>`
    ).join("") + '</main>');
    for (const file of ["action-metadata", "docs-content", "docs-toc"]) {
      await page.addScriptTag({ content: await read(`docs/assets/js/${file}.js`) });
    }
    assert.match(await page.locator(".docs-page-toc summary").innerText(), /35 actions · 0 other sections/);
    const filter = page.locator("#docs-action-filter-input");
    await filter.fill(names[0]);
    assert.equal(await page.locator(".docs-action-heading:not([hidden])").count(), 1);
    assert.equal(await page.locator(".docs-page-toc li:not([hidden])").count(), 1);
    assert.match(await page.locator(".docs-page-toc summary").innerText(), /1 actions/);
    await page.evaluate(id => { location.hash = id; }, names[1].toLowerCase());
    await page.waitForFunction(() => document.querySelector("#docs-action-filter-input").value === "");
    assert.equal(await page.locator(".docs-action-heading:not([hidden])").count(), 35);
  } finally { await browser.close(); }
});

test("search handles zero, one, two, and eight results without stale active options", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const index = Array.from({ length: 8 }, (_, i) => ({
      pageTitle: `Page ${i}`, sectionTitle: "Topic", summary: "Example section", kind: "reference",
      url: `/page-${i}/`, keywords: ["octet", ...(i < 2 ? ["duo"] : []), ...(i === 0 ? ["solo"] : [])]
    }));
    await page.route("https://docs.test/search-index.json", route => route.fulfill({ json: index }));
    await page.setContent('<base href="https://docs.test/"><div class="docs-search"><input id="docs-search-input"><ul id="docs-search-results" hidden></ul></div><div id="docs-search-config" data-root-url="/" data-index-url="/search-index.json"></div>');
    await page.addScriptTag({ content: await read("docs/assets/js/docs-search.js") });
    const input = page.locator("input");
    for (const [query, count] of [["missing", 0], ["solo", 1], ["duo", 2], ["octet", 8], ["missing", 0]]) {
      await input.fill(query);
      await page.waitForFunction(expected => document.querySelector('[role="status"]').textContent === expected,
        `${count} ${count === 1 ? "result" : "results"}`);
      assert.equal(await page.locator('[role="option"]').count(), count);
      assert.equal(await input.getAttribute("aria-activedescendant"), null);
      await input.press("ArrowUp");
      assert.equal(await input.getAttribute("aria-activedescendant"), count ? `docs-search-option-${count - 1}` : null);
      await input.press("ArrowDown");
      assert.equal(await input.getAttribute("aria-activedescendant"), count ? "docs-search-option-0" : null);
    }
  } finally { await browser.close(); }
});

test("typing after a completed failed prefetch waits for an explicit retry", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.setContent('<base href="https://docs.test/"><div class="docs-search"><input id="docs-search-input"><ul id="docs-search-results" hidden></ul></div><div id="docs-search-config" data-root-url="/" data-index-url="/search-index.json"></div>');
    await page.evaluate(() => {
      window.searchRequests = 0;
      window.fetch = async () => {
        window.searchRequests++;
        return new Response("Unavailable", { status: 503 });
      };
    });
    await page.addScriptTag({ content: await read("docs/assets/js/docs-search.js") });
    const input = page.locator("input");
    const retry = page.getByRole("button", { name: "Retry search" });
    await input.focus();
    await retry.waitFor();
    await page.waitForFunction(() => document.querySelector("input").getAttribute("aria-busy") === "false");
    for (const query of ["alpha", "beta"]) {
      await input.fill(query);
      assert.equal(await page.evaluate(() => window.searchRequests), 1);
      assert.equal(await retry.isVisible(), true);
    }
    await retry.click();
    await page.waitForFunction(() => document.querySelector("input").getAttribute("aria-busy") === "false");
    assert.equal(await page.evaluate(() => window.searchRequests), 2);
  } finally { await browser.close(); }
});

test("each retry makes one request after consecutive failures and pending searches respect cancellation", async () => {
  const browser = await chromium.launch();
  try {
    for (const ending of ["new-query", "escape", "outside"]) {
      const page = await browser.newPage();
      let attempts = 0;
      let pending;
      let announce;
      const requested = new Promise(resolve => { announce = resolve; });
      await page.route("https://docs.test/search-index.json", async route => {
        attempts++;
        if (attempts < 3) return route.fulfill({ status: 503, body: "Unavailable" });
        pending = route; announce();
      });
      await page.setContent('<base href="https://docs.test/"><div class="docs-search"><input id="docs-search-input"><ul id="docs-search-results" hidden></ul></div><div id="docs-search-config" data-root-url="/" data-index-url="/search-index.json"></div><button id="outside">Page navigation</button>');
      await page.addScriptTag({ content: await read("docs/assets/js/docs-search.js") });
      const input = page.locator("input");
      const retry = page.getByRole("button", { name: "Retry search" });
      await input.fill("alpha");
      await retry.waitFor();
      assert.equal(attempts, 1);
      const failed = page.waitForResponse("https://docs.test/search-index.json");
      await retry.click(); await failed;
      await page.waitForFunction(() => document.querySelector("input").getAttribute("aria-busy") === "false");
      assert.equal(attempts, 2, "A failed retry must not silently make another request");
      assert.equal(await retry.isVisible(), true);
      assert.equal(await input.evaluate(element => element === document.activeElement), true);
      await retry.click(); await requested;
      if (ending === "new-query") await input.fill("beta");
      else if (ending === "escape") await input.press("Escape");
      else await page.locator("#outside").click();
      const completed = page.waitForResponse("https://docs.test/search-index.json");
      await pending.fulfill({ json: ["alpha", "beta"].map(name => ({
        pageTitle: name, sectionTitle: "", summary: `${name} section`, keywords: [name], kind: "reference", url: `/${name}/`
      })) });
      await completed;
      await page.waitForFunction(() => document.querySelector("input").getAttribute("aria-busy") === "false");
      if (ending === "new-query") {
        await page.locator('[role="option"]').waitFor();
        assert.equal(await page.locator('[role="option"]').getAttribute("href"), "https://docs.test/beta/");
      } else {
        assert.equal(await page.locator("#docs-search-results").isHidden(), true);
        assert.equal(await input.getAttribute("aria-activedescendant"), null);
      }
      assert.equal(attempts, 3);
      await page.close();
    }
  } finally { await browser.close(); }
});
