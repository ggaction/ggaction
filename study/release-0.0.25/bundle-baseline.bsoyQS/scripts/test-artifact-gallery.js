import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { artifactScopeConfig, artifactScopeNames } from "../test/support/artifact-schema.js";
import { PNG_ARTIFACT_ROOT } from "../test/support/artifact-paths.js";

async function verifyGallery(browser, scope) {
  const { label, root } = artifactScopeConfig(scope);
  const gallery = path.join(root, "index.html");
  const screenshots = path.join(PNG_ARTIFACT_ROOT, "gallery-checks", scope);
  await mkdir(screenshots, { recursive: true });
  const errors = [];
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on("console", message => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  desktop.on("pageerror", error => errors.push(`page: ${error.message}`));
  await desktop.goto(pathToFileURL(gallery).href, { waitUntil: "networkidle" });

  if (await desktop.title() !== `ggaction ${label} Gallery`) {
    throw new Error(`${label} gallery title is incorrect.`);
  }
  const variants = desktop.locator("article.variant");
  const variantCount = await variants.count();
  if (await desktop.locator(".status.ready, .status.awaiting").count() !== variantCount) {
    throw new Error(`Every ${label} variant must show one review status.`);
  }
  if (await desktop.locator(".call-chain pre code").count() !== variantCount) {
    throw new Error(`Every ${label} variant must show one call chain.`);
  }
  const images = desktop.locator("img");
  for (let index = 0; index < await images.count(); index += 1) {
    const loaded = await images.nth(index).evaluate(
      image => image.complete && image.naturalWidth > 0
    );
    if (!loaded) throw new Error(`${label} gallery image ${index} did not load.`);
  }
  if (variantCount > 0) {
    const columns = await desktop.locator(".pair").first().evaluate(
      node => getComputedStyle(node).gridTemplateColumns.split(" ").length
    );
    if (columns !== 2) throw new Error("Desktop gallery must use two columns.");
  } else if (await desktop.locator(".empty").count() !== 1) {
    throw new Error(`${label} gallery must show its empty state.`);
  }
  if (await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error("Desktop gallery must not overflow horizontally.");
  }
  await desktop.screenshot({ path: path.join(screenshots, "desktop.png"), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(pathToFileURL(gallery).href, { waitUntil: "networkidle" });
  if (variantCount > 0) {
    const columns = await mobile.locator(".pair").first().evaluate(
      node => getComputedStyle(node).gridTemplateColumns.split(" ").length
    );
    if (columns !== 1) throw new Error("Mobile gallery must use one column.");
  }
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error("Mobile gallery must not overflow horizontally.");
  }
  await mobile.screenshot({ path: path.join(screenshots, "mobile.png"), fullPage: true });
  await desktop.close();
  await mobile.close();
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(`verified ${label} gallery: ${gallery}\n`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const scope of artifactScopeNames()) await verifyGallery(browser, scope);
} finally {
  await browser.close();
}
