import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import {
  ROADMAP2_ARTIFACT_ROOT,
  ROADMAP3_ARTIFACT_ROOT,
  ROADMAP4_ARTIFACT_ROOT
} from "../test/support/artifact-paths.js";
import { artifactTrackConfig } from "../test/support/artifact-schema.js";

const requiredRoadmap2Variants = Object.freeze([
  "cars-scatterplot/baseline",
  "cars-scatterplot/categorical-palette",
  "cars-scatterplot/continuous-color-gradient",
  "cars-scatterplot/encoding-reassignment",
  "cars-scatterplot/field-opacity-legend",
  "cars-scatterplot/point-shape-diamond",
  "cars-scatterplot/scale-reverse",
  "cars-scatterplot/shape-vocabulary"
]);

async function verifyGallery(browser, {
  roadmap,
  root,
  requiredVariants = []
}) {
  const { label, number } = artifactTrackConfig(roadmap);
  const gallery = path.join(root, "index.html");
  const screenshots = path.resolve(root, `../../${roadmap}-gallery`);
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
  if (requiredVariants.length > 0 && variantCount === 0) {
    throw new Error(`Roadmap ${number} gallery has no chart variants.`);
  }
  const statuses = desktop.locator(".status.ready, .status.awaiting");
  if (await statuses.count() !== variantCount) {
    throw new Error(`Every Roadmap ${number} variant must show one review status.`);
  }
  const renderedVariantIds = await variants.locator(":scope > code").allTextContents();
  for (const variant of requiredVariants) {
    if (!renderedVariantIds.includes(variant)) {
      throw new Error(`Roadmap ${number} gallery is missing required variant ${variant}.`);
    }
    const card = variants.filter({ hasText: variant });
    if (await card.count() !== 1) {
      throw new Error(`Required variant ${variant} must have exactly one card.`);
    }
    if (await card.locator(".status.ready").count() !== 1) {
      throw new Error(`Required variant ${variant} is not ready for review.`);
    }
    if (await card.locator("img").count() !== 2) {
      throw new Error(`Required variant ${variant} must show one primitive/public pair.`);
    }
  }
  const callChains = desktop.locator(".call-chain pre code");
  if (await callChains.count() !== variantCount) {
    throw new Error(`Every Roadmap ${number} variant must show one target call chain.`);
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
  if (variantCount > 0) {
    const desktopColumns = await desktop.locator(".pair").first().evaluate(
      node => getComputedStyle(node).gridTemplateColumns.split(" ").length
    );
    if (desktopColumns !== 2) {
      throw new Error("Desktop gallery must render a two-column pair.");
    }
  } else if (await desktop.locator(".empty").count() !== 1) {
    throw new Error(`Empty Roadmap ${number} gallery must show its empty state.`);
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

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(pathToFileURL(gallery).href, { waitUntil: "networkidle" });
  if (variantCount > 0) {
    const mobileColumns = await mobile.locator(".pair").first().evaluate(
      node => getComputedStyle(node).gridTemplateColumns.split(" ").length
    );
    if (mobileColumns !== 1) {
      throw new Error("Mobile gallery must render a one-column pair.");
    }
    if (await mobile.locator(".call-chain pre").first().count() !== 1) {
      throw new Error("Mobile gallery must retain the target call chain.");
    }
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
  await desktop.close();
  await mobile.close();
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(`verified ${label} gallery: ${gallery}\n`);
}

const browser = await chromium.launch({ headless: true });
try {
  await verifyGallery(browser, {
    roadmap: "roadmap2",
    root: ROADMAP2_ARTIFACT_ROOT,
    requiredVariants: requiredRoadmap2Variants
  });
  await verifyGallery(browser, {
    roadmap: "roadmap3",
    root: ROADMAP3_ARTIFACT_ROOT
  });
  await verifyGallery(browser, {
    roadmap: "roadmap4",
    root: ROADMAP4_ARTIFACT_ROOT
  });
} finally {
  await browser.close();
}
