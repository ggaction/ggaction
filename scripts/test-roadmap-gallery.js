import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { ROADMAP2_ARTIFACT_ROOT } from "../test/support/artifact-paths.js";

const gallery = path.join(ROADMAP2_ARTIFACT_ROOT, "index.html");
const screenshots = path.resolve(
  ROADMAP2_ARTIFACT_ROOT,
  "../../roadmap2-gallery"
);
await mkdir(screenshots, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const phase1Variants = Object.freeze([
  "cars-scatterplot/baseline",
  "cars-scatterplot/categorical-palette",
  "cars-scatterplot/continuous-color-gradient",
  "cars-scatterplot/encoding-reassignment",
  "cars-scatterplot/field-opacity-legend",
  "cars-scatterplot/point-shape-diamond",
  "cars-scatterplot/scale-reverse",
  "cars-scatterplot/shape-vocabulary"
]);

try {
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 1000 }
  });
  desktop.on("console", message => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  desktop.on("pageerror", error => errors.push(`page: ${error.message}`));
  await desktop.goto(pathToFileURL(gallery).href, { waitUntil: "networkidle" });

  if (await desktop.title() !== "ggaction Roadmap 2 Gallery") {
    throw new Error("Roadmap 2 gallery title is incorrect.");
  }
  if (await desktop.locator("article.variant").count() === 0) {
    throw new Error("Roadmap 2 gallery has no chart variants.");
  }
  const variants = desktop.locator("article.variant");
  const statuses = desktop.locator(".status.ready, .status.awaiting");
  if (await statuses.count() !== await variants.count()) {
    throw new Error("Every Roadmap 2 variant must show one review status.");
  }
  const renderedPhase1Variants = await variants.locator(":scope > code")
    .allTextContents();
  for (const variant of phase1Variants) {
    if (!renderedPhase1Variants.includes(variant)) {
      throw new Error(`Roadmap 2 gallery is missing Phase 1 variant ${variant}.`);
    }
    const card = variants.filter({ hasText: variant });
    if (await card.count() !== 1) {
      throw new Error(`Phase 1 variant ${variant} must have exactly one card.`);
    }
    if (await card.locator(".status.ready").count() !== 1) {
      throw new Error(`Phase 1 variant ${variant} is not ready for review.`);
    }
    if (await card.locator("img").count() !== 2) {
      throw new Error(`Phase 1 variant ${variant} must show one primitive/public pair.`);
    }
  }
  const callChains = desktop.locator(".call-chain pre code");
  if (await callChains.count() !== await desktop.locator("article.variant").count()) {
    throw new Error("Every Roadmap 2 variant must show one target call chain.");
  }
  for (let index = 0; index < await callChains.count(); index += 1) {
    if ((await callChains.nth(index).textContent()).trim().length === 0) {
      throw new Error(`Gallery call chain ${index} is empty.`);
    }
  }
  const images = desktop.locator("img");
  for (let index = 0; index < await images.count(); index += 1) {
    const loaded = await images.nth(index).evaluate(
      image => image.complete && image.naturalWidth > 0
    );
    if (!loaded) throw new Error(`Gallery image ${index} did not load.`);
  }
  const desktopColumns = await desktop.locator(".pair").first().evaluate(
    node => getComputedStyle(node).gridTemplateColumns.split(" ").length
  );
  if (desktopColumns !== 2) {
    throw new Error("Desktop gallery must render a two-column pair.");
  }
  const desktopOverflows = await desktop.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (desktopOverflows) {
    throw new Error("Desktop gallery must not overflow horizontally.");
  }
  await desktop.screenshot({
    path: path.join(screenshots, "desktop.png"),
    fullPage: true
  });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });
  await mobile.goto(pathToFileURL(gallery).href, { waitUntil: "networkidle" });
  const mobileColumns = await mobile.locator(".pair").first().evaluate(
    node => getComputedStyle(node).gridTemplateColumns.split(" ").length
  );
  if (mobileColumns !== 1) {
    throw new Error("Mobile gallery must render a one-column pair.");
  }
  const mobileCallChain = mobile.locator(".call-chain pre").first();
  if (await mobileCallChain.count() !== 1) {
    throw new Error("Mobile gallery must retain the target call chain.");
  }
  const mobileOverflows = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (mobileOverflows) {
    throw new Error("Mobile gallery must not overflow horizontally.");
  }
  await mobile.screenshot({
    path: path.join(screenshots, "mobile.png"),
    fullPage: true
  });

  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(`verified Roadmap 2 gallery: ${gallery}\n`);
} finally {
  await browser.close();
}
