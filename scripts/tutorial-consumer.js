import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { build, preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));

export const TUTORIAL_CONSUMERS = Object.freeze({
  "scatterplot": "cars",
  "line-chart": "cars",
  "histogram": "cars",
  "grouped-bar": "jobs",
  "regression-scatterplot": "cars",
  "density-area": "cars",
  "error-bar": "cars",
  "error-band": "gapminder",
  "polar-points": "cars",
  "polar-lines": "gapminder",
  "polar-arcs": "cars"
});

export function completeTutorialProgram(markdown, name = "tutorial") {
  const heading = markdown.indexOf("## Complete program");
  assert.notEqual(heading, -1, `${name} must identify its complete program.`);
  const match = markdown.slice(heading).match(/```javascript\n([\s\S]*?)\n```/);
  assert.notEqual(match, null, `${name} must contain a JavaScript program.`);
  return match[1];
}

function tutorialHtml(name) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>${name}</title></head>
  <body>
    <canvas id="chart" aria-label="${name} tutorial chart"></canvas>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`;
}

async function prepareTutorials(directory) {
  const publicDirectory = path.join(directory, "public");
  await mkdir(publicDirectory, { recursive: true });
  for (const dataset of new Set(Object.values(TUTORIAL_CONSUMERS))) {
    await copyFile(
      path.join(root, "data", `${dataset}.json`),
      path.join(publicDirectory, `${dataset}.json`)
    );
  }

  const inputs = {};
  for (const [name, dataset] of Object.entries(TUTORIAL_CONSUMERS)) {
    const markdown = await readFile(
      path.join(root, "docs", "tutorials", `${name}.md`),
      "utf8"
    );
    const source = completeTutorialProgram(markdown, name);
    assert.match(source, /from "ggaction"/);
    assert.doesNotMatch(source, /\.\.\/\.\.\/(?:src|data)\//);
    assert.match(source, new RegExp(`fetch\\("/${dataset}\\.json"\\)`));
    assert.match(source, /if \(!response\.ok\) throw new Error/);
    assert.match(
      markdown.slice(0, markdown.indexOf("## Complete program")),
      new RegExp(
        `curl --fail --location https://raw\\.githubusercontent\\.com/` +
        `ggaction/ggaction/main/data/${dataset}\\.json --output public/${dataset}\\.json`
      )
    );

    const tutorialDirectory = path.join(directory, "tutorials", name);
    await mkdir(tutorialDirectory, { recursive: true });
    await writeFile(path.join(tutorialDirectory, "main.js"), `${source}\n`);
    const html = path.join(tutorialDirectory, "index.html");
    await writeFile(html, tutorialHtml(name));
    inputs[name] = html;
  }
  return inputs;
}

async function assertRenderedTutorial(page, baseUrl, name, dataset) {
  const consoleErrors = [];
  const pageErrors = [];
  const responseErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) {
      responseErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(
    new URL(`tutorials/${name}/`, baseUrl).href,
    { waitUntil: "networkidle" }
  );
  assert.equal(response.ok(), true, name);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas && (canvas.width !== 300 || canvas.height !== 150);
  });
  const canvas = await page.locator("canvas").evaluate(element => {
    const context = element.getContext("2d");
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let ink = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index + 3] > 0 &&
        (pixels[index] < 250 || pixels[index + 1] < 250 || pixels[index + 2] < 250)
      ) ink += 1;
    }
    return { width: element.width, height: element.height, ink };
  });
  assert.equal(canvas.ink > 0, true, `${name} rendered an empty Canvas.`);
  assert.deepEqual(consoleErrors, [], `${name} console errors`);
  assert.deepEqual(pageErrors, [], `${name} page errors`);
  assert.deepEqual(responseErrors, [], `${name} response errors`);
  assert.equal(
    await page.evaluate(filename => performance.getEntriesByType("resource")
      .some(entry => new URL(entry.name).pathname === `/${filename}.json`), dataset),
    true,
    `${name} did not request its documented dataset.`
  );
}

export async function testTutorialConsumers(directory) {
  directory = await realpath(directory);
  const inputs = await prepareTutorials(directory);
  await build({
    root: directory,
    logLevel: "silent",
    build: {
      target: "esnext",
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: { input: inputs }
    }
  });

  const server = await preview({
    root: directory,
    logLevel: "silent",
    build: { outDir: "dist" },
    preview: { host: "127.0.0.1", port: 0 }
  });
  const baseUrl = server.resolvedUrls.local[0];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, dataset] of Object.entries(TUTORIAL_CONSUMERS)) {
      const page = await browser.newPage();
      try {
        await assertRenderedTutorial(page, baseUrl, name, dataset);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close(error => {
      if (error) reject(error);
      else resolve();
    }));
  }
}
