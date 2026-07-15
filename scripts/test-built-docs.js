import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const siteRoot = path.resolve(process.argv[2] ?? "_site");
const artifactRoot = path.resolve(".artifacts/docs");
const contentTypes = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".txt", "text/plain"]
]);

function localPath(requestUrl) {
  const parsed = new URL(requestUrl, "http://127.0.0.1");
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/ggaction") pathname = "/";
  if (pathname.startsWith("/ggaction/")) pathname = pathname.slice("/ggaction".length);
  return pathname;
}

const server = createServer(async (request, response) => {
  try {
    let target = path.join(siteRoot, localPath(request.url));
    if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
    assert.equal(target.startsWith(siteRoot), true);
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": contentTypes.get(path.extname(target)) ?? "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/ggaction/`;
await mkdir(artifactRoot, { recursive: true });

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat();
}

function routeFor(file) {
  const relative = path.relative(siteRoot, file).replaceAll(path.sep, "/");
  if (relative === "index.html") return baseUrl;
  if (relative.endsWith("/index.html")) {
    return `${baseUrl}${relative.slice(0, -"index.html".length)}`;
  }
  return `${baseUrl}${relative}`;
}

async function assertResponsiveContainment(page, file, width) {
  const response = await page.goto(routeFor(file), { waitUntil: "networkidle" });
  assert.equal(response.ok(), true, `${file} at ${width}px`);
  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const content = document.querySelector(".docs-content");
    const contentBounds = content?.getBoundingClientRect();
    const escaped = [...document.querySelectorAll(
      ".docs-content pre, .docs-content table, .docs-content img, .docs-page-navigation"
    )].map(element => {
      const bounds = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: element.className,
        left: bounds.left,
        right: bounds.right
      };
    }).filter(element =>
      element.left < -1 ||
      element.right > viewport + 1 ||
      (contentBounds && element.right > contentBounds.right + 1)
    );
    const localScrollFailures = [...document.querySelectorAll(
      ".docs-content pre, .docs-content table"
    )].filter(element =>
      element.scrollWidth > element.clientWidth + 1 &&
      getComputedStyle(element).overflowX !== "auto"
    ).map(element => element.tagName.toLowerCase());
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      contentRight: contentBounds?.right,
      escaped,
      localScrollFailures
    };
  });
  const label = `${path.relative(siteRoot, file)} at ${width}px`;
  assert.equal(result.scrollWidth, result.viewport, `${label} expands the document`);
  assert.equal(result.contentRight <= result.viewport + 1, true, `${label} content escapes`);
  assert.deepEqual(result.escaped, [], `${label} contains escaped elements`);
  assert.deepEqual(result.localScrollFailures, [], `${label} lacks local scrolling`);
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = [];
  desktop.on("console", message => {
    if (message.type() === "error") desktopErrors.push(message.text());
  });
  desktop.on("pageerror", error => desktopErrors.push(error.message));
  const response = await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(response.ok(), true);
  assert.equal(await desktop.locator(".docs-topnav a").count(), 4);
  assert.equal(await desktop.locator(".docs-chart-gallery article").count(), 6);
  assert.equal(await desktop.locator(".docs-chart-gallery__image").count(), 6);
  assert.equal(await desktop.locator(".docs-chart-gallery__title").count(), 6);
  assert.equal(
    await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    false
  );

  await desktop.keyboard.press("Control+K");
  const search = desktop.locator("#docs-search-input");
  assert.equal(await search.evaluate(element => element === document.activeElement), true);
  await search.fill("legend");
  const results = desktop.locator("#docs-search-results a");
  await results.first().waitFor({ state: "visible" });
  const resultCount = await results.count();
  assert.equal(resultCount > 0 && resultCount <= 8, true);
  assert.equal(await desktop.locator(".docs-search-snippet").count(), resultCount);
  const urls = await results.evaluateAll(links => links.map(link => link.href.split("#")[0]));
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(desktopErrors, []);
  await desktop.screenshot({ path: path.join(artifactRoot, "desktop.png"), fullPage: true });
  await desktop.close();

  const htmlFiles = (await files(siteRoot))
    .filter(file => file.endsWith(".html"))
    .filter(file => !file.endsWith("404.html"));
  assert.equal(htmlFiles.length > 40, true);

  for (const width of [320, 390, 768]) {
    const responsive = await browser.newPage({ viewport: { width, height: 844 } });
    for (const file of htmlFiles) {
      await assertResponsiveContainment(responsive, file, width);
    }
    await responsive.close();
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = [];
  mobile.on("console", message => {
    if (message.type() === "error") mobileErrors.push(message.text());
  });
  mobile.on("pageerror", error => mobileErrors.push(error.message));
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  const toggle = mobile.locator("#nav-toggle-button");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await mobile.locator("#docs-sidebar").getAttribute("aria-hidden"), "true");
  assert.equal(await mobile.locator("#docs-sidebar").getAttribute("inert"), "");
  const toggleBounds = await toggle.boundingBox();
  assert.equal(toggleBounds.width >= 44, true);
  assert.equal(toggleBounds.height >= 44, true);
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(await mobile.locator(".docs-sidebar-close").isVisible(), true);
  assert.equal(await mobile.locator("#docs-sidebar").getAttribute("aria-hidden"), null);
  assert.equal(await mobile.locator("#docs-sidebar").getAttribute("inert"), null);
  assert.equal(await mobile.locator("#main-content").getAttribute("inert"), "");
  assert.equal(
    await mobile.locator(".docs-sidebar-close").evaluate(element =>
      element === document.activeElement
    ),
    true
  );
  assert.equal(await mobile.locator(".docs-nav-group[open]").count(), 1);
  assert.equal(
    await mobile.locator(".docs-nav-group[open] [aria-current='page']").count(),
    1
  );
  await mobile.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await toggle.evaluate(element => element === document.activeElement), true);
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    false
  );
  await mobile.keyboard.press("Control+K");
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(
    await mobile.locator("#docs-search-input").evaluate(element =>
      element === document.activeElement
    ),
    true
  );
  await mobile.locator("#docs-search-input").fill("legend");
  await mobile.locator("#docs-search-results a").first().waitFor({ state: "visible" });
  assert.deepEqual(mobileErrors, []);
  await mobile.screenshot({ path: path.join(artifactRoot, "mobile.png"), fullPage: true });

  await mobile.goto(`${baseUrl}reference/actions/`, { waitUntil: "networkidle" });
  assert.equal(await mobile.locator(".docs-page-toc").getAttribute("open"), null);
  assert.equal(await mobile.locator(".docs-copy-button").count() > 0, true);
  assert.equal(await mobile.locator(".docs-heading-anchor").count() > 0, true);
  await mobile.screenshot({
    path: path.join(artifactRoot, "mobile-action-reference.png"),
    fullPage: false
  });
  await mobile.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

process.stdout.write("verified desktop search and all documentation pages at 320px, 390px, and 768px\n");
