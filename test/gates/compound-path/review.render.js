import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCanvas, loadImage, PDFDocument } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { frame, variants, reviewSamples } from "./manifest.js";
import { drawPrimitive, primitiveSVG } from "./primitive.program.js";
import { targetProgram } from "./target.program.js";
import { startStaticServer } from "../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../../support/browser.js";
import { ensureVariantMetadata } from "../../support/artifact-metadata.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = path.join(root, ".artifacts/test/png/review/compound-path");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const pixels = context => context.getImageData(0, 0, frame.width, frame.height).data;

async function decode(bytes) {
  const image = await loadImage(bytes), canvas = createCanvas(frame.width, frame.height);
  assert.equal(image.width, frame.width); assert.equal(image.height, frame.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}

function checkSamples(canvas, variant, backend) {
  return reviewSamples(variant).map(sample => {
    const actual = [...canvas.getContext("2d").getImageData(...sample.pixel, 1, 1).data];
    // One byte is the existing cross-backend alpha quantization allowance.
    for (let c = 0; c < 4; c++) assert.ok(Math.abs(actual[c] - sample.color[c]) <= (c === 3 ? 0 : 1),
      JSON.stringify({ variant: variant.id, backend, sample: sample.name, actual, expected: sample.color }));
    return { name: sample.name, pixel: sample.pixel, expected: sample.color, actual };
  });
}

test("renders pending compound primitives through four backends with literal topology probes", async () => {
  let server, browser;
  const evidence = [];
  await mkdir(directory, { recursive: true });
  try {
    server = await startStaticServer(root);
    browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}test/gates/compound-path/`, {
      waitFor: () => document.querySelector("#status").textContent === "Ready"
    });
    for (const variant of variants) {
      const output = path.join(directory, variant.id);
      await mkdir(output, { recursive: true });
      await ensureVariantMetadata({ scope: "review", chart: "compound-path", variant: variant.id, kind: "primitive", title: variant.title,
        userFacingCallChain: `// Proposed, not yet accepted by the public validator.\n${targetProgram.toString()}\n\n// From test/gates/compound-path/manifest.js:\ntargetProgram(variants.find(variant => variant.id === ${JSON.stringify(variant.id)}));` });
      const canvas = createCanvas(frame.width, frame.height), reference = createCanvas(frame.width, frame.height);
      drawPrimitive(canvas.getContext("2d"), variant);
      drawPrimitive(reference.getContext("2d"), variant, { reference: true });
      assert.deepEqual(pixels(canvas.getContext("2d")), pixels(reference.getContext("2d")), `${variant.id}: independent native primitive equality`);
      const nativePNG = canvas.toBuffer("image/png");
      await writeFile(path.join(output, "primitive.png"), nativePNG);
      const svg = primitiveSVG(variant);
      await writeFile(path.join(output, "primitive.svg"), svg);
      const svgCanvas = await decode(Buffer.from(svg));
      const svgPNG = svgCanvas.toBuffer("image/png");
      await writeFile(path.join(output, "svg.png"), svgPNG);

      const document = new PDFDocument(), context = document.beginPage(frame.width, frame.height);
      drawPrimitive(context, variant); document.endPage();
      const pdf = document.close(), pdfFile = path.join(output, "primitive.pdf"), pdfBase = path.join(output, "pdf");
      await writeFile(pdfFile, pdf);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", pdfFile, pdfBase], { stdio: "pipe" });
      const pdfPNG = await readFile(pdfBase + ".png");
      const browserPNG = Buffer.from((await opened.page.locator(`#${variant.id}`).evaluate(canvas => canvas.toDataURL("image/png"))).split(",")[1], "base64");
      await writeFile(path.join(output, "browser.png"), browserPNG);
      const checks = {
        png: checkSamples(await decode(nativePNG), variant, "Node PNG"),
        svg: checkSamples(svgCanvas, variant, "SVG"),
        pdf: checkSamples(await decode(pdfPNG), variant, "PDF"),
        canvas: checkSamples(await decode(browserPNG), variant, "Browser Canvas")
      };
      evidence.push({ variant: variant.id, independentNativePixelsEqual: true, publicIntegration: "pending-approval", checks,
        sha256: { png: hash(nativePNG), svg: hash(svg), pdf: hash(pdf), browser: hash(browserPNG) } });
    }
    assertNoBrowserErrors(opened.errors, "Compound primitive reference");
    await opened.page.close();
    const sheet = createCanvas(frame.width * 3, (frame.height + 38) * 2 + 55), context = sheet.getContext("2d");
    context.fillStyle = "#e9edf3"; context.fillRect(0, 0, sheet.width, sheet.height);
    context.fillStyle = "#172b4d"; context.font = "bold 22px sans-serif";
    context.fillText("Compound paths · native primitive review", 20, 30);
    for (let i = 0; i < variants.length; i++) {
      const x = i % 3 * frame.width, y = 55 + Math.floor(i / 3) * (frame.height + 38);
      context.font = "16px sans-serif"; context.fillStyle = "#172b4d"; context.fillText(variants[i].title, x + 16, y + 24);
      context.drawImage(await loadImage(path.join(directory, variants[i].id, "primitive.png")), x, y + 38);
    }
    await writeFile(path.join(directory, "contact-sheet.png"), sheet.toBuffer("image/png"));
    await writeFile(path.join(directory, "results.json"), JSON.stringify({ productIntegration: "pending-approval", variants: evidence }, null, 2) + "\n");
    assert.equal(evidence.length, 6);
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});
