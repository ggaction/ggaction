import assert from "node:assert/strict";
import { saveBrowserEvidence } from "../test/support/browser.js";
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
  [".ts", "text/plain"],
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
    /\.\/(?:[A-Za-z0-9_.-]+\/)*(?:[A-Za-z0-9_.-]+)?(?:#[A-Za-z0-9_-]+)?/g
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

const browser = await chromium.launch({headless:true});
try {
 for (const width of [1440,320,390,768]) {
  const context = await browser.newContext({viewport:{width,height:900}});
  try { for (const route of ['api/geometry','extension/primitives']) {const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await assertResponsiveContainment(page,path.join(siteRoot,route+'/index.html'),width);
   await assertAccessible(page,route+' '+width);
   assert.ok((await page.locator('.docs-content').innerText()).includes(route==='api/geometry'?'maxProjectedPoints':'maxCommands'));
   if(route==='extension/primitives' && width===320) { const flow=page.locator('.docs-concept-flow'); await flow.focus(); assert.equal(await flow.evaluate(e=>e===document.activeElement),true); const before=await flow.evaluate(e=>e.scrollLeft); await page.keyboard.press('ArrowRight'); await page.waitForFunction(()=>document.querySelector('.docs-concept-flow').scrollLeft>0); assert.ok(await flow.evaluate(e=>e.scrollLeft)>before); }
   assert.deepEqual(errors,[]); console.log(JSON.stringify({page:route,width,status:'passed'}));await page.close();}
  } finally {await context.close();}
 }
} catch(error) {await saveBrowserEvidence(browser,error);throw error;}
finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
