import { saveBrowserPageEvidence } from "../test/support/browser.js";
import assert from "node:assert/strict";
import { copyFile, mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { chromium } from "playwright";
import { build, preview } from "vite";

import { documentationPrograms, copyDocumentationSupportFiles } from "./doc-snippets.js";
import { docInputs } from "../test/support/docs-inputs.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const executeFile = promisify(execFile);

function tutorialHtml(name, html) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>${name}</title></head>
  <body>
    ${html ?? `<canvas id="chart" aria-label="${name} tutorial chart"></canvas>`}
    <script type="module" src="./main.js"></script>
  </body>
</html>
`;
}

export async function prepareTutorials(directory, { examples } = {}) {
  examples ??= await documentationPrograms();
  const publicDirectory = path.join(directory, "public");
  await mkdir(publicDirectory, { recursive: true });
  for (const dataset of new Set(examples.map(example => example.dataset).filter(Boolean))) {
    await copyFile(path.join(root, "data", `${dataset}.json`),
      path.join(publicDirectory, `${dataset}.json`));
  }
  const inputs = {};
  const consumers = [];
  for (const example of examples) {
    const name = example.file.replace(/^\.\.\//, "root/").replace(/\.md$/, "").replaceAll("/", "-") + "--" + (example.id ?? "primary");
    assert.ok(!Object.hasOwn(inputs, name), `Duplicate tutorial identity: ${name}`);
    const fixture = example.fixture ? docInputs[example.fixture] : {};
    assert.ok(fixture, `${example.file} has an unknown fixture.`);
    const prefix = [
      'import { render as renderDocumentationResult } from "ggaction";',
      ...(example.importChart ? ['import { chart } from "ggaction";'] : []),
      ...Object.entries(fixture).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
    ].join("\n");
    const result = example.result.split(",").at(-1).trim();
    const renderResult = example.resultKind === "semantic"
      ? `window.__ggactionSemanticResult = { resources: ${result}.semanticSpec.resources.length, graphics: Object.keys(${result}.graphicSpec.objects).length };`
      : example.rendering === "authoring-only" ? `renderDocumentationResult(${result}, document.querySelector("#chart").getContext("2d"));` : "";
    const results = example.result.split(",").map(name => name.trim());
    const summary = `window.__ggactionSnippetResults = [${results.join(",")}].map(program => ({
      semantic: program?.semanticSpec !== undefined,
      canvas: program?.graphicSpec?.objects?.canvas !== undefined,
      materialized: Object.values(program?.graphicSpec?.objects ?? {}).some(object =>
        (object.items?.length ?? 0) > 0 || ["line", "path", "circle", "rect", "text", "weighted-blend"].includes(object.type) ||
        (["circle-batch", "path-batch"].includes(object.type) && object.properties.x.length > 0))
    }));`;
    const source = example.host === "node"
      ? `${prefix}\n${example.code}\nimport assertDocumentationNodeResult from 'node:assert/strict';\nfor (const documentationProgram of [${results.join(",")}]) {\n  assertDocumentationNodeResult.ok(documentationProgram?.semanticSpec?.resources.length > 0, 'The documented Node result must own semantic resources.');\n  assertDocumentationNodeResult.equal(Object.keys(documentationProgram.graphicSpec.objects).length, 0, 'The documented Node result must create no graphics.');\n}\n`
      : `${prefix}\n${example.code}\n${renderResult}\n${summary}\nwindow.__ggactionSnippetCompleted = true;\n`;
    assert.doesNotMatch(source, /from ["']\.\.\/.*src\//, "Examples must import the installed package.");
    const tutorialDirectory = path.join(directory, "tutorials", name);
    await mkdir(tutorialDirectory, { recursive: true });
    await copyDocumentationSupportFiles(example, tutorialDirectory);
    await writeFile(path.join(tutorialDirectory, "main.js"), source);
    if (example.host !== "node") {
      const html = path.join(tutorialDirectory, "index.html");
      await writeFile(html, tutorialHtml(name, example.html));
      inputs[name] = html;
    }
    consumers.push({ name, dataset: example.dataset, id: example.id ?? example.file, file: example.file, sha256: example.sha256, ...(example.host === "node" ? { host: "node" } : {}), ...(example.htmlSha256 ? { htmlSha256: example.htmlSha256 } : {}), rendering: example.rendering, ...(example.resultKind ? { resultKind: example.resultKind } : {}) });
  }
  return { inputs, consumers };
}

async function assertRenderedTutorial(page, baseUrl, name, dataset, resultKind) {
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
    return window.__ggactionSnippetCompleted === true;
  });
  const results = await page.evaluate(() => window.__ggactionSnippetResults);
  assert.ok(results.length > 0 && results.every(result => result.semantic), `${name} must return programs.`);
  if (resultKind !== "semantic") assert.ok(results.every(result => result.canvas && result.materialized), `${name} must materialize its returned programs.`);
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
  if (resultKind === "semantic") {
    const result = await page.evaluate(() => window.__ggactionSemanticResult);
    assert.ok(result.resources > 0, `${name} must own semantic resources.`);
    assert.equal(result.graphics, 0, `${name} must create no graphics.`);
    assert.equal(canvas.ink, 0, `${name} must not draw a chart.`);
  } else assert.equal(canvas.ink > 0, true, `${name} rendered an empty Canvas.`);
  assert.deepEqual(consoleErrors, [], `${name} console errors`);
  assert.deepEqual(pageErrors, [], `${name} page errors`);
  assert.deepEqual(responseErrors, [], `${name} response errors`);
  if (dataset) assert.equal(
    await page.evaluate(filename => performance.getEntriesByType("resource")
      .some(entry => new URL(entry.name).pathname === `/${filename}.json`), dataset),
    true,
    `${name} did not request its documented dataset.`
  );
}

export async function testTutorialConsumers(directory, { examples, evidenceFile = path.join(root, ".artifacts/consumers/tutorials.json") } = {}) {
  directory = await realpath(directory);
  const { inputs, consumers } = await prepareTutorials(directory, { examples });
  const hasBrowser = Object.keys(inputs).length > 0;
  if (hasBrowser) await build({
    root: directory,
    logLevel: "silent",
    build: {
      target: "esnext",
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: { input: inputs }
    }
  });

  const server = hasBrowser ? await preview({
    root: directory,
    logLevel: "silent",
    build: { outDir: "dist" },
    preview: { host: "127.0.0.1", port: 0 }
  }) : undefined;
  const baseUrl = server?.resolvedUrls.local[0];
  const browser = hasBrowser ? await chromium.launch({ headless: true }) : undefined;
  const records = [];
  try {
    for (const consumer of consumers) {
      const { name, dataset } = consumer;
      const started = performance.now();
      const page = consumer.host === "node" ? undefined : await browser.newPage();
      try {
        if (consumer.host === "node") await executeFile(process.execPath, [path.join(directory, "tutorials", name, "main.js")], { cwd: directory, timeout: 30000, maxBuffer: 1024 * 1024 });
        else await assertRenderedTutorial(page, baseUrl, name, dataset, consumer.resultKind);
        records.push({ ...consumer, status: "passed", durationMs: performance.now() - started });
      } catch (error) {
        records.push({ ...consumer, status: "failed", durationMs: performance.now() - started, error: error.stack });
        if (page) await saveBrowserPageEvidence(page, error, name);
      } finally {
        await page?.close();
      }
    }
    const failed = records.filter(record => record.status === "failed");
    if (failed.length) throw new AggregateError(failed.map(record => new Error(`${record.id}: ${record.error}`)), "Documentation consumers failed");
  } finally {
    await mkdir(path.dirname(evidenceFile), { recursive: true });
    await writeFile(evidenceFile, JSON.stringify(records, null, 2));
    await browser?.close();
    if (server) await new Promise((resolve, reject) => server.httpServer.close(error => {
      if (error) reject(error);
      else resolve();
    }));
  }
}
