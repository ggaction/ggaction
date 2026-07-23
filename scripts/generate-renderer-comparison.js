import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { createCarsRegressionScatterplot } from
  "../examples/cars-regression-scatterplot/program.js";
import { renderToPDF } from "../src/renderers/pdf.js";
import { renderToPNG } from "../src/renderers/png.js";
import { renderToSVG } from "../src/renderers/svg.js";
import { createVariantMetadata } from
  "../test/support/artifact-paths.js";
import { loadDataset } from "../test/support/data.js";
import { startStaticServer } from "../test/support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactIdentity = Object.freeze({
  scope: "charts",
  capability: "vector-renderers",
  chart: "cars-regression-scatterplot",
  variant: "pdf-parity"
});
const outputDirectory = path.join(
  repositoryRoot,
  ".artifacts/test/png/charts/vector-renderers/",
  "cars-regression-scatterplot/pdf-parity"
);
const comparisonOutput = path.join(
  outputDirectory,
  "canvas-svg-png-pdf-comparison.png"
);
const title = "Cars regression";
const description =
  "Japan and USA displacement and acceleration with fitted trends and confidence bands.";
const userFacingCallChain = `const program = createCarsRegressionScatterplot(cars);
render(program, context, { pixelRatio: 2 });
renderToSVG(program, { title, description });
await renderToPNG(program, { output, pixelRatio: 2 });
await renderToPDF(program, { output, metadata });`;

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: outputDirectory,
    encoding: "utf8"
  });
  if (result.error?.code === "ENOENT") {
    throw new Error(
      `${command} is required to generate the renderer comparison artifact.`
    );
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} failed with status ${result.status}: ${result.stderr.trim()}`
    );
  }
  return result.stdout;
}

function comparisonHtml(svg, graphicSpec) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>ggaction renderer comparison</title>
    <style>
      html, body {
        margin: 0;
        background: #eef2f7;
        color: #172033;
        font-family: Arial, sans-serif;
      }
      .plate {
        display: flex;
        gap: 24px;
        padding: 24px;
      }
      .panel {
        overflow: hidden;
        flex: 0 0 auto;
        border: 1px solid #d8dee8;
        border-radius: 12px;
        background: white;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }
      .label {
        display: flex;
        align-items: center;
        height: 40px;
        padding: 0 16px;
        border-bottom: 1px solid #e5e9f0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .chart {
        display: block;
        width: 760px;
        height: 480px;
      }
    </style>
  </head>
  <body>
    <main class="plate">
      <section class="panel">
        <div class="label">CANVAS</div>
        <canvas id="canvas" class="chart" aria-label="Canvas renderer output"></canvas>
      </section>
      <section class="panel">
        <div class="label">SVG</div>
        <div class="chart">${svg}</div>
      </section>
      <section class="panel">
        <div class="label">PNG</div>
        <img id="png" class="chart" src="./chart.png" alt="PNG renderer output">
      </section>
      <section class="panel">
        <div class="label">PDF</div>
        <img id="pdf" class="chart" src="./pdf.png" alt="Poppler-rendered PDF output">
      </section>
    </main>
    <script type="module">
      import { render } from "/src/index.js";
      const program = ${JSON.stringify({ graphicSpec })};
      const canvas = document.querySelector("#canvas");
      render(program, canvas.getContext("2d"), { pixelRatio: 2 });
      await Promise.all([
        document.querySelector("#png").decode(),
        document.querySelector("#pdf").decode()
      ]);
      document.body.dataset.ready = "true";
    </script>
  </body>
</html>`;
}

async function captureComparison() {
  const server = await startStaticServer(repositoryRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 3300, height: 620 },
      deviceScaleFactor: 2
    });
    const relativeHtml = path.relative(
      repositoryRoot,
      path.join(outputDirectory, "comparison.html")
    ).split(path.sep).join("/");
    await page.goto(new URL(relativeHtml, server.baseUrl).href, {
      waitUntil: "networkidle"
    });
    await page.locator("body[data-ready=true]").waitFor();
    await page.screenshot({
      path: comparisonOutput,
      fullPage: true
    });
  } finally {
    await browser.close();
    await server.close();
  }
}

async function generateRendererComparison() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const program = createCarsRegressionScatterplot(loadDataset("cars"));
  const svg = renderToSVG(program, { title, description });
  const pngOutput = path.join(outputDirectory, "chart.png");
  const pdfOutput = path.join(outputDirectory, "chart.pdf");

  await Promise.all([
    renderToPNG(program, {
      output: pngOutput,
      pixelRatio: 2
    }),
    renderToPDF(program, {
      output: pdfOutput,
      metadata: {
        title,
        author: "ggaction",
        subject: "Renderer parity",
        keywords: ["cars", "regression"]
      }
    }),
    writeFile(path.join(outputDirectory, "chart.svg"), svg)
  ]);

  run("pdftoppm", [
    "-png",
    "-r",
    "144",
    "-singlefile",
    pdfOutput,
    path.join(outputDirectory, "pdf")
  ]);
  const pdfInfo = run("pdfinfo", [pdfOutput]);
  const metadata = createVariantMetadata({
    ...artifactIdentity,
    kind: "user-facing",
    title: "Canvas, SVG, PNG, and PDF renderer comparison",
    userFacingCallChain
  });

  await Promise.all([
    writeFile(
      path.join(outputDirectory, "comparison.html"),
      comparisonHtml(svg, program.graphicSpec)
    ),
    writeFile(
      path.join(outputDirectory, "variant.json"),
      `${JSON.stringify(metadata, null, 2)}\n`
    ),
    writeFile(path.join(outputDirectory, "pdfinfo.txt"), pdfInfo)
  ]);
  await captureComparison();

  const bytes = await readFile(comparisonOutput);
  process.stdout.write(
    `generated renderer comparison (${bytes.length} bytes): ${comparisonOutput}\n`
  );
}

await generateRendererComparison();
