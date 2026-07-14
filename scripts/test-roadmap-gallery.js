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
  if (await desktop.locator(".status.ready").count() === 0) {
    throw new Error("Roadmap 2 gallery has no complete primitive/public pair.");
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
  await mobile.screenshot({
    path: path.join(screenshots, "mobile.png"),
    fullPage: true
  });

  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(`verified Roadmap 2 gallery: ${gallery}\n`);
} finally {
  await browser.close();
}
