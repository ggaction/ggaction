import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { visualVariants, frame, patternFixture } from "./manifest.js";
import { samplePixels } from "./reference.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { startStaticServer } from "../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../../support/browser.js";
import { ensureVariantMetadata } from "../../support/artifact-metadata.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = path.join(root, ".artifacts/test/png/review/pattern-paints");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const dataBytes = value => Buffer.from(value.split(",")[1], "base64");
async function decode(bytes) {
  const image = await loadImage(bytes), canvas = createCanvas(frame.width, frame.height);
  assert.equal(image.width, frame.width); assert.equal(image.height, frame.height);
  canvas.getContext("2d").drawImage(image, 0, 0); return canvas;
}
function checks(canvas, fixture, backend) {
  return samplePixels(fixture).map(sample => {
    const actual = [...canvas.getContext("2d").getImageData(...sample.pixel, 1, 1).data];
    for (let index = 0; index < 4; index++) assert.ok(Math.abs(actual[index] - sample.color[index]) <= (index === 3 ? 0 : 1),
      JSON.stringify({ style: fixture.style, backend, sample: sample.name, actual, expected: sample.color }));
    return { ...sample, actual };
  });
}

test("renders every pattern primitive through Canvas, SVG, PNG and PDF", async () => {
  let server, browser;
  const evidence = [];
  await mkdir(directory, { recursive: true });
  try {
    server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}test/gates/pattern-paints/browser.html`, {
      waitFor: () => document.querySelector("#status").textContent === "Ready"
    });
    for (const variant of visualVariants) {
      const output = path.join(directory, variant.variant), fixture = patternFixture(variant.variant), program = variant.primitive();
      await mkdir(output, { recursive: true }); assertDisplayedProgram(variant, program);
      await ensureVariantMetadata({ scope: "review", chart: variant.chart, variant: variant.variant, kind: "primitive", title: variant.title, userFacingCallChain: variant.callChain });
      const native = renderWithNativeTrace(program, frame), png = (await renderToPNGBuffer(program)).buffer;
      const nativeCanvas = createCanvas(frame.width, frame.height), nativeContext = nativeCanvas.getContext("2d");
      const image = nativeContext.createImageData(frame.width, frame.height); image.data.set(native.rgba); nativeContext.putImageData(image, 0, 0);
      assert.deepEqual((await decode(png)).getContext("2d").getImageData(0, 0, frame.width, frame.height).data, native.rgba, `${variant.variant}: native / PNG exact pixels`);
      assert.equal(native.calls.filter(call => call.op === "fill").length, 10, "two backgrounds and eight compound foreground fills");
      for (const region of variant.regions) {
        let ink = 0;
        const pixels = nativeContext.getImageData(region.x, region.y, region.width, region.height).data;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset] < 250 || pixels[offset + 1] < 250 || pixels[offset + 2] < 250) ink++;
        }
        assert.ok(ink >= region.minimumInkPixels, `${variant.variant}: ${region.name} ink`);
      }
      const svg = renderToSVG(program), pdf = (await renderToPDFBuffer(program)).buffer;
      await writeFile(path.join(output, "primitive.png"), png);
      await writeFile(path.join(output, "native.png"), nativeCanvas.toBuffer("image/png"));
      await writeFile(path.join(output, "primitive.svg"), svg);
      await writeFile(path.join(output, "primitive.pdf"), pdf);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", path.join(output, "primitive.pdf"), path.join(output, "pdf")], { stdio: "pipe" });
      const pdfPNG = await readFile(path.join(output, "pdf.png"));
      const browserOutput = await opened.page.evaluate(async ({ id, svg }) => {
        const canvas = document.querySelector(`#${id}`), actual = canvas.toDataURL("image/png");
        const image = new Image(); image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await image.decode();
        const raster = document.createElement("canvas"); raster.width = image.width; raster.height = image.height;
        raster.getContext("2d").drawImage(image, 0, 0);
        return { actual, svg: raster.toDataURL("image/png"), label: canvas.getAttribute("aria-label"), width: canvas.width, height: canvas.height };
      }, { id: variant.variant, svg });
      assert.equal(browserOutput.width, frame.width); assert.equal(browserOutput.height, frame.height); assert.ok(browserOutput.label.includes(variant.variant));
      const canvasPNG = dataBytes(browserOutput.actual), svgPNG = dataBytes(browserOutput.svg);
      await writeFile(path.join(output, "browser-canvas.png"), canvasPNG);
      await writeFile(path.join(output, "browser-svg.png"), svgPNG);
      const samples = { native: checks(nativeCanvas, fixture, "Native Canvas"), png: checks(await decode(png), fixture, "Node PNG"),
        svg: checks(await decode(svgPNG), fixture, "Browser SVG"), canvas: checks(await decode(canvasPNG), fixture, "Browser Canvas"), pdf: checks(await decode(pdfPNG), fixture, "PDF") };
      const entry = { style: variant.variant, publicPaintIntegration: "pending", nativePNGExactPixels: true, foregroundCompoundFills: 8,
        samplePolicy: "analytic interiors; RGB tolerance 1 byte; alpha exact", samples,
        sha256: { png: hash(png), svg: hash(svg), pdf: hash(pdf), canvas: hash(canvasPNG), browserSVG: hash(svgPNG) } };
      await writeFile(path.join(output, "evidence.json"), JSON.stringify(entry, null, 2) + "\n"); evidence.push(entry);
    }
    assertNoBrowserErrors(opened.errors, "Pattern primitive review"); await opened.page.close();
    const scale = 0.7, cellWidth = frame.width * scale, cellHeight = frame.height * scale + 34;
    const sheet = createCanvas(cellWidth * 2, cellHeight * 4 + 45), context = sheet.getContext("2d");
    context.fillStyle = "#edf2f7"; context.fillRect(0, 0, sheet.width, sheet.height);
    context.fillStyle = "#243447"; context.font = "bold 20px sans-serif"; context.fillText("Seven vector patterns · primitive review", 14, 28);
    for (const [index, variant] of visualVariants.entries()) {
      const x = index % 2 * cellWidth, y = 45 + Math.floor(index / 2) * cellHeight;
      context.fillStyle = "#243447"; context.font = "bold 16px sans-serif"; context.fillText(variant.variant, x + 12, y + 22);
      context.drawImage(await loadImage(path.join(directory, variant.variant, "primitive.png")), x, y + 34, cellWidth, frame.height * scale);
    }
    await writeFile(path.join(directory, "contact-sheet.png"), sheet.toBuffer("image/png"));
    await writeFile(path.join(directory, "results.json"), JSON.stringify({ state: "ready-for-review", publicPaintIntegration: "pending", variants: evidence }, null, 2) + "\n");
    assert.equal(evidence.length, 7);
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});
