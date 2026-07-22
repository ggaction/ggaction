import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
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
const chartCatalog = await readFile(
  path.resolve("docs/_data/chart_examples.yml"),
  "utf8"
);
const expectedTutorialCount = (chartCatalog.match(/^  tutorial_order:/gm) ?? []).length;
const expectedFeaturedCount = (chartCatalog.match(/^  featured: true$/gm) ?? []).length;
const expectedGalleryFeaturedCount = (
  chartCatalog.match(/^  gallery_featured: true$/gm) ?? []
).length;
const expectedGalleryCount = (chartCatalog.match(/^- id:/gm) ?? []).length;
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

function llmReferences(source) {
  return [...source.matchAll(
    /\.\/(?:llms-full\.txt|(?:[A-Za-z0-9_-]+\/)*(?:#[A-Za-z0-9_-]+)?)/g
  )].map(match => match[0]);
}

async function assertAccessible(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target)
    })),
    [],
    `${label} accessibility violations`
  );
}

async function assertFragmentPlacement(page, selector, label) {
  await page.waitForFunction(target => window.location.hash === target, selector);
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const placement = await page.locator(selector).evaluate(heading => {
    const topbar = document.querySelector(".docs-topbar");
    return {
      headingTop: heading.getBoundingClientRect().top,
      scrollMarginTop: Number.parseFloat(getComputedStyle(heading).scrollMarginTop),
      topbarBottom: topbar?.getBoundingClientRect().bottom ?? 0
    };
  });
  assert.equal(
    placement.headingTop >= placement.topbarBottom - 1,
    true,
    `${label} is hidden behind the sticky topbar`
  );
  assert.equal(
    Math.abs(placement.headingTop - placement.scrollMarginTop) <= 2,
    true,
    `${label} does not use the shared fragment offset`
  );
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
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktop = await desktopContext.newPage();
  const desktopErrors = [];
  desktop.on("console", message => {
    if (message.type() === "error") desktopErrors.push(message.text());
  });
  desktop.on("pageerror", error => desktopErrors.push(error.message));
  const response = await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(response.ok(), true);
  assert.equal(await desktop.locator(".docs-topnav a").count(), 4);
  assert.equal(await desktop.locator('.docs-topnav a[href$="/api/"]').innerText(), "API");
  assert.equal(await desktop.locator(".docs-page-toc").count(), 0);
  assert.deepEqual(
    await desktop.locator(".docs-chart-gallery__title").allInnerTexts(),
    [
      "Scatterplot",
      "Line chart",
      "Heatmap",
      "Bar chart",
      "Histogram",
      "Regression scatterplot",
      "Box plot",
      "Parallel coordinates",
      "Rose chart"
    ]
  );
  assert.equal(
    await desktop.locator(".docs-chart-gallery article").count(),
    expectedFeaturedCount
  );
  assert.equal(
    await desktop.locator(".docs-chart-gallery__image").count(),
    expectedFeaturedCount
  );
  assert.equal(
    await desktop.locator(".docs-chart-gallery__title").count(),
    expectedFeaturedCount
  );
  assert.equal(await desktop.locator(".docs-chart-gallery article h3").count(), expectedFeaturedCount);
  assert.equal(
    await desktop.locator(".docs-chart-gallery__full-size[aria-label]").count(),
    expectedFeaturedCount
  );
  assert.deepEqual(
    await desktop.locator(".docs-chart-gallery__full-size").evaluateAll(links => links
      .map(link => ({
        accessibleName: link.getAttribute("aria-label"),
        visibleLabel: link.textContent.trim()
      }))
      .filter(({ accessibleName, visibleLabel }) => !accessibleName?.includes(visibleLabel))),
    [],
    "gallery links include their visible label in the accessible name"
  );
  assert.equal(await desktop.locator(".docs-chart-gallery__actions a").count() > 0, true);
  assert.equal(
    await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    false
  );
  await assertAccessible(desktop, "desktop home");

  await desktop.keyboard.press("Control+K");
  const search = desktop.locator("#docs-search-input");
  assert.equal(await search.evaluate(element => element === document.activeElement), true);
  await search.fill("legend");
  const results = desktop.locator("#docs-search-results a");
  await results.first().waitFor({ state: "visible" });
  const resultCount = await results.count();
  assert.equal(resultCount > 0 && resultCount <= 8, true);
  assert.equal(await desktop.locator(".docs-search-snippet").count(), resultCount);
  assert.equal(await desktop.locator(".docs-search-kind").count(), resultCount);
  const urls = await results.evaluateAll(links => links.map(link => link.href));
  assert.equal(new Set(urls).size, urls.length);
  await search.fill("edit legend");
  await results.first().waitFor({ state: "visible" });
  assert.match(await results.first().getAttribute("href"), /#editlegend$/);
  await search.fill("rose chart");
  await results.first().waitFor({ state: "visible" });
  assert.equal(
    await results.first().evaluate(link => new URL(link.href).pathname),
    "/ggaction/recipes/rose-chart/"
  );
  await search.fill("polar points");
  await results.first().waitFor({ state: "visible" });
  assert.match(await results.first().getAttribute("href"), /\/tutorials\/polar-points\/$/);
  await desktop.keyboard.press("ArrowDown");
  assert.equal(await search.evaluate(element => element === document.activeElement), true);
  const activeResult = await search.getAttribute("aria-activedescendant");
  assert.equal(activeResult?.startsWith("docs-search-option-"), true);
  assert.equal(
    await desktop.locator(`#${activeResult}`).getAttribute("aria-selected"),
    "true"
  );
  await desktop.keyboard.press("Escape");
  assert.equal(await search.getAttribute("aria-expanded"), "false");
  assert.equal(await desktop.locator(".docs-search__control kbd").isVisible(), true);
  assert.deepEqual(desktopErrors, []);

  await desktop.goto(`${baseUrl}reference/actions/`, { waitUntil: "networkidle" });
  const actionLookup = desktop.locator("#docs-action-lookup-input");
  await actionLookup.fill("encodeColor");
  assert.equal(await desktop.locator("table tbody tr:not([hidden])").count(), 1);
  assert.match(await desktop.locator(".docs-action-lookup .docs-action-filter__status").innerText(), /^1 of \d+ actions$/);
  assert.match(await desktop.locator("table tbody tr:not([hidden])").innerText(), /encodeColor/);
  await assertAccessible(desktop, "action reference filter");

  await desktop.goto(baseUrl, { waitUntil: "networkidle" });

  const llmsResponse = await fetch(`${baseUrl}llms.txt`);
  assert.equal(llmsResponse.ok, true);
  const llmsTargets = llmReferences(await llmsResponse.text());
  assert.equal(llmsTargets.length, 44);
  for (const target of llmsTargets) {
    const url = new URL(target, `${baseUrl}llms.txt`);
    const fragment = url.hash.slice(1);
    url.hash = "";
    const targeted = await fetch(url);
    assert.equal(targeted.ok, true, target);
    if (fragment.length > 0) {
      const html = await targeted.text();
      assert.match(
        html,
        new RegExp(`\\sid=["']${fragment.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}["']`),
        target
      );
    }
  }

  await desktop.goto(`${baseUrl}tutorials/`, { waitUntil: "networkidle" });
  assert.equal(
    await desktop.locator(".docs-chart-index article").count(),
    expectedTutorialCount
  );
  assert.equal(
    await desktop.locator(".docs-chart-index img").count(),
    expectedTutorialCount
  );
  const tutorialTrendFilter = desktop.locator('[data-gallery-filter="trend"]');
  await tutorialTrendFilter.click();
  assert.match(await desktop.locator(".docs-gallery-filter__status").innerText(), /charts?$/);
  assert.equal(new URL(desktop.url()).searchParams.get("chart-task"), "trend");
  await desktop.goBack({ waitUntil: "networkidle" });
  assert.equal(await desktop.locator('[data-gallery-filter="all"]').getAttribute("aria-pressed"), "true");
  await desktop.goto(`${baseUrl}gallery/`, { waitUntil: "networkidle" });
  assert.deepEqual(
    await desktop.locator(".docs-breadcrumbs li").allInnerTexts(),
    ["Docs", "Chart Gallery"]
  );
  assert.equal(
    await desktop.locator(".docs-chart-gallery article").count(),
    expectedGalleryFeaturedCount
  );
  const distributionFilter = desktop.locator('[data-gallery-filter="distribution"]');
  await distributionFilter.click();
  assert.equal(await distributionFilter.getAttribute("aria-pressed"), "true");
  assert.equal(
    await desktop.locator('[data-gallery-tasks~="distribution"]:not([hidden])').count() > 0,
    true
  );
  assert.equal(
    await desktop.locator('[data-gallery-tasks~="interaction"]:not([hidden])').count(),
    0
  );
  await desktop.goto(`${baseUrl}gallery/all/`, { waitUntil: "networkidle" });
  assert.equal(await desktop.locator(".docs-chart-gallery article").count(), expectedGalleryCount);
  const lastGalleryImage = desktop.locator(".docs-chart-gallery img").last();
  await lastGalleryImage.scrollIntoViewIfNeeded();
  await lastGalleryImage.evaluate(image => image.decode());
  assert.equal(await lastGalleryImage.evaluate(image => image.naturalWidth > 0), true);
  await assertAccessible(desktop, "all chart examples");
  await desktop.goto(`${baseUrl}getting-started/`, { waitUntil: "networkidle" });
  assert.equal(await desktop.locator(".docs-example-figure img").count(), 1);
  assert.equal(
    await desktop.locator(".docs-example-figure img").getAttribute("fetchpriority"),
    "high"
  );

  await desktop.goto(`${baseUrl}api/basic-charts/#createlineplot`, {
    waitUntil: "networkidle"
  });
  assert.deepEqual(
    await desktop.locator(".docs-breadcrumbs li").allInnerTexts(),
    ["Docs", "Chart API", "Basic Charts"]
  );
  await assertFragmentPlacement(desktop, "#createlineplot", "desktop direct h2 fragment");
  await desktop.screenshot({
    path: path.join(artifactRoot, "fragment-desktop.png"),
    fullPage: false
  });

  await desktop.goto(`${baseUrl}api/encodings/`, { waitUntil: "networkidle" });
  await desktop.locator("#atomic-density .docs-heading-anchor").click();
  await assertFragmentPlacement(desktop, "#atomic-density", "desktop h3 permalink");
  await desktop.goto(`${baseUrl}api/basic-charts/`, { waitUntil: "networkidle" });
  await desktop.locator('.docs-page-toc a[href="#createheatmap"]').click();
  await assertFragmentPlacement(desktop, "#createheatmap", "desktop h2 TOC link");

  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await desktop.screenshot({ path: path.join(artifactRoot, "desktop.png"), fullPage: true });
  await desktopContext.close();

  const noScriptDesktopContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 }
  });
  const noScriptDesktop = await noScriptDesktopContext.newPage();
  await noScriptDesktop.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(await noScriptDesktop.locator("html").getAttribute("class"), "no-js");
  assert.equal(await noScriptDesktop.locator("#docs-sidebar").getAttribute("inert"), null);
  assert.equal(await noScriptDesktop.locator("#docs-sidebar").getAttribute("aria-hidden"), null);
  const noScriptGroup = noScriptDesktop.locator(".docs-nav-group").first();
  const noScriptSummary = noScriptGroup.locator(":scope > summary");
  assert.equal(await noScriptSummary.isVisible(), true);
  await noScriptSummary.click();
  assert.equal(
    await noScriptGroup.locator(":scope > ul > li > a").first().isVisible(),
    true
  );
  await noScriptDesktopContext.close();

  const htmlFiles = (await files(siteRoot))
    .filter(file => file.endsWith(".html"))
    .filter(file => !file.endsWith("404.html"));
  assert.equal(htmlFiles.length > 40, true);

  for (const width of [320, 390, 768]) {
    const responsiveContext = await browser.newContext({
      viewport: { width, height: 844 }
    });
    const responsive = await responsiveContext.newPage();
    for (const file of htmlFiles) {
      await assertResponsiveContainment(responsive, file, width);
    }
    await responsiveContext.close();
  }

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobile = await mobileContext.newPage();
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
  assert.equal(await mobile.locator(".docs-entry-grid a").count(), 9);
  assert.equal(
    await mobile.locator('table[tabindex="0"][aria-label="Scrollable data table"]').count() > 0,
    true
  );
  assert.equal(await mobile.locator("#docs-action-redirects").count(), 1);

  await mobile.goto(`${baseUrl}reference/actions/encodings/`, { waitUntil: "networkidle" });
  assert.equal(await mobile.locator(".docs-page-toc").getAttribute("open"), null);
  assert.equal(await mobile.locator(".docs-copy-button").count() > 0, true);
  assert.equal(
    await mobile.locator('pre[tabindex="0"][aria-label="Scrollable code"]').count() > 0,
    true
  );
  assert.equal(await mobile.locator(".docs-code-label").count() > 0, true);
  assert.equal(await mobile.locator(".docs-heading-anchor").count() > 0, true);
  const actionHeadingCount = await mobile.locator(".docs-action-heading").count();
  assert.equal(actionHeadingCount > 20, true);
  const actionFilter = mobile.locator("#docs-action-filter-input");
  assert.equal(await actionFilter.count(), 1);
  await actionFilter.fill("edit");
  const visibleActions = mobile.locator(".docs-action-heading:not([hidden])");
  assert.equal(await visibleActions.count() > 0, true);
  assert.equal(await visibleActions.count() < actionHeadingCount, true);
  assert.match(await mobile.locator(".docs-action-filter__status").innerText(), /actions$/);
  await assertAccessible(mobile, "mobile action reference");
  await mobile.screenshot({
    path: path.join(artifactRoot, "mobile-action-reference.png"),
    fullPage: false
  });

  await mobile.goto(`${baseUrl}api/encodings/#atomic-density`, { waitUntil: "networkidle" });
  await assertFragmentPlacement(mobile, "#atomic-density", "mobile direct h3 fragment");
  await mobile.goto(`${baseUrl}api/basic-charts/`, { waitUntil: "networkidle" });
  await mobile.locator("#createbarplot .docs-heading-anchor").click();
  await assertFragmentPlacement(mobile, "#createbarplot", "mobile h2 permalink");
  await mobile.locator(".docs-page-toc summary").click();
  await mobile.locator('.docs-page-toc a[href="#createheatmap"]').click();
  await assertFragmentPlacement(mobile, "#createheatmap", "mobile h2 TOC link");
  await mobile.screenshot({
    path: path.join(artifactRoot, "fragment-mobile.png"),
    fullPage: false
  });

  await mobile.goto(`${baseUrl}api/marks/point/`, { waitUntil: "networkidle" });
  assert.equal(await mobile.locator(".docs-action-heading").count(), 4);
  assert.equal(await mobile.locator(".docs-action-signature").count(), 4);
  assert.equal(
    await mobile.locator(".docs-action-heading code").first().innerText(),
    "createPointMark"
  );
  assert.equal(
    (await mobile.locator(".docs-action-kind").first().innerText()).toLowerCase(),
    "create"
  );
  assert.equal(
    (await mobile.locator(".docs-action-kind").last().innerText()).toLowerCase(),
    "remove"
  );

  await mobile.goto(`${baseUrl}reference/types/`, { waitUntil: "networkidle" });
  assert.equal(await mobile.locator(".docs-code-label").first().textContent(), "Type contract");
  assert.equal(await mobile.locator(".docs-copy-button").count(), 1);
  await mobileContext.close();

  const noScriptMobileContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 }
  });
  const noScriptMobile = await noScriptMobileContext.newPage();
  await noScriptMobile.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(await noScriptMobile.locator(".nav-toggle-button").isVisible(), false);
  assert.equal(await noScriptMobile.locator("#docs-sidebar").getAttribute("inert"), null);
  assert.equal(await noScriptMobile.locator(".docs-sidenav").isVisible(), true);
  assert.equal(await noScriptMobile.locator("#main-content").isVisible(), true);
  await noScriptMobileContext.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

process.stdout.write("verified desktop search and all documentation pages at 320px, 390px, and 768px\n");
