import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const siteRoot = path.resolve(process.argv[2] ?? "_site");
const artifactRoot = path.resolve(".artifacts/docs");
const contentTypes = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
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
  assert.equal(await desktop.locator(".docs-chart-gallery a").count(), 6);
  assert.equal(
    await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    false
  );

  await desktop.keyboard.press("Control+K");
  const search = desktop.locator("#docs-search-input");
  assert.equal(await search.evaluate(element => element === document.activeElement), true);
  await search.fill("legend");
  const results = desktop.locator("#docs-search-results a");
  const resultCount = await results.count();
  assert.equal(resultCount > 0 && resultCount <= 8, true);
  assert.equal(await desktop.locator(".docs-search-snippet").count(), resultCount);
  const urls = await results.evaluateAll(links => links.map(link => link.href.split("#")[0]));
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(desktopErrors, []);
  await desktop.screenshot({ path: path.join(artifactRoot, "desktop.png"), fullPage: true });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = [];
  mobile.on("console", message => {
    if (message.type() === "error") mobileErrors.push(message.text());
  });
  mobile.on("pageerror", error => mobileErrors.push(error.message));
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  const toggle = mobile.locator("#nav-toggle-button");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(await mobile.locator(".docs-sidebar-close").isVisible(), true);
  await mobile.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await toggle.evaluate(element => element === document.activeElement), true);
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    false
  );
  assert.deepEqual(mobileErrors, []);
  await mobile.screenshot({ path: path.join(artifactRoot, "mobile.png"), fullPage: true });
  await mobile.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

process.stdout.write("verified desktop search and mobile navigation\n");
