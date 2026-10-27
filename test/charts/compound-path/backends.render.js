import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCanvas, loadImage, PDFDocument } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { frame, variants, visualVariants, samplePixels } from "./manifest.js";
import { drawPrimitive, primitiveSVG } from "./native-reference.js";
import { createCompoundPathExample as targetProgram } from "../../../examples/compound-path/program.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { startStaticServer } from "../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../../support/browser.js";
import { sceneSVG } from "../../support/svg-scene.js";
import { ensureVariantMetadata } from "../../support/artifact-metadata.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = path.join(root, ".artifacts/test/png/charts/path-geometry/compound-path");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const pixels = context => context.getImageData(0, 0, frame.width, frame.height).data;

async function decode(bytes) {
  const image = await loadImage(bytes), canvas = createCanvas(frame.width, frame.height);
  assert.equal(image.width, frame.width); assert.equal(image.height, frame.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}


async function equalPixels(actual, expected, label) {
  assert.equal(Buffer.compare(Buffer.from(pixels((await decode(actual)).getContext("2d"))), Buffer.from(pixels((await decode(expected)).getContext("2d")))), 0, label);
}

function checkSamples(canvas, variant, backend) {
  return samplePixels(variant).map(sample => {
    const actual = [...canvas.getContext("2d").getImageData(...sample.pixel, 1, 1).data];
    // One byte is the existing cross-backend alpha quantization allowance.
    for (let c = 0; c < 4; c++) assert.ok(Math.abs(actual[c] - sample.color[c]) <= (c === 3 ? 0 : 1),
      JSON.stringify({ variant: variant.id, backend, sample: sample.name, actual, expected: sample.color }));
    return { name: sample.name, pixel: sample.pixel, expected: sample.color, actual };
  });
}

test("compares compound paths through four product backends and both scenes", async () => {
  let server, browser;
  const evidence = [];
  await mkdir(directory, { recursive: true });
  try {
    server = await startStaticServer(root);
    browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}test/charts/compound-path/native.html`, {
      waitFor: () => document.querySelector("#status").textContent === "Ready"
    });
    for (const variant of variants) {
      const output = path.join(directory, variant.id);
      await mkdir(output, { recursive: true });
      await ensureVariantMetadata({scope:"charts",capability:"path-geometry",chart:"compound-path",variant:variant.id,kind:"primitive",title:variant.title,
        userFacingCallChain:visualVariants.find(value=>value.variant===variant.id).callChain});
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
      const program = targetProgram(variant);
      const productPNG = (await renderToPNGBuffer(program)).buffer;
      const productSVG = renderToSVG(program);
      const productPDF = (await renderToPDFBuffer(program)).buffer;
      await writeFile(path.join(output, "user-facing.png"), productPNG);
      await writeFile(path.join(output, "user-facing.svg"), productSVG);
      await writeFile(path.join(output, "user-facing.pdf"), productPDF);
      await equalPixels(productPNG, nativePNG, `${variant.id}: Node PNG pixels`);
      await equalPixels(Buffer.from(productSVG), Buffer.from(svg), `${variant.id}: SVG pixels`);
      const productPDFBase = path.join(output, "user-facing-pdf");
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", path.join(output, "user-facing.pdf"), productPDFBase], { stdio: "pipe" });
      const productPDFPNG = await readFile(productPDFBase + ".png");
      await equalPixels(productPDFPNG, pdfPNG, `${variant.id}: PDF pixels`);
      const browserOutput = await opened.page.evaluate(async ({ id, expectedSVG }) => {
        const { createCompoundPathExample } = await import("/examples/compound-path/program.js");
        const { variants } = await import("/examples/compound-path/data.js");
        const { render } = await import("/src/index.js");
        const { renderToSVG } = await import("/src/renderers/svg.js");
        const { createTransitionScene, renderTransitionScene } = await import("/src/scene.js");
        const program = createCompoundPathExample(variants.find(value => value.id === id));
        const canvas = document.createElement("canvas");
        render(program, canvas.getContext("2d"));
        const actual = canvas.toDataURL();
        renderTransitionScene(JSON.parse(JSON.stringify(createTransitionScene(program, {format:"canvas"}))), canvas.getContext("2d"));
        const scene = canvas.toDataURL();
        const rasterize = async svg => {
          const image = new Image(); image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await image.decode();
          canvas.width = image.width; canvas.height = image.height;
          canvas.getContext("2d").drawImage(image, 0, 0); return canvas.toDataURL();
        };
        return { actual, scene, svg: await rasterize(renderToSVG(program)), expectedSVG: await rasterize(expectedSVG) };
      }, {id:variant.id, expectedSVG:svg});
      const bytes = value => Buffer.from(value.split(",")[1], "base64");
      await equalPixels(bytes(browserOutput.actual), browserPNG, `${variant.id}: browser Canvas pixels`);
      await equalPixels(bytes(browserOutput.scene), browserPNG, `${variant.id}: browser Canvas scene pixels`);
      await equalPixels(bytes(browserOutput.svg), bytes(browserOutput.expectedSVG), `${variant.id}: browser SVG pixels`);
      await writeFile(path.join(output, "user-facing-browser.png"), bytes(browserOutput.actual));
      const replay = createCanvas(frame.width, frame.height);
      renderTransitionScene(JSON.parse(JSON.stringify(createTransitionScene(program, {format:"canvas"}))), replay.getContext("2d"));
      await equalPixels(replay.toBuffer("image/png"), nativePNG, `${variant.id}: Canvas scene pixels`);
      const svgScene = JSON.parse(JSON.stringify(createTransitionScene(program)));
      await equalPixels(Buffer.from(sceneSVG(svgScene)), Buffer.from(productSVG), `${variant.id}: SVG scene pixels`);
      const checks = {
        png: checkSamples(await decode(productPNG), variant, "Node PNG"),
        svg: checkSamples(await decode(Buffer.from(productSVG)), variant, "SVG"),
        pdf: checkSamples(await decode(productPDFPNG), variant, "PDF"),
        canvas: checkSamples(await decode(bytes(browserOutput.actual)), variant, "Browser Canvas")
      };
      evidence.push({ variant: variant.id, independentNativePixelsEqual: true, publicIntegration: "passed", scenes: "passed", checks,
        sha256: { png: hash(productPNG), svg: hash(productSVG), pdf: hash(productPDF), browser: hash(bytes(browserOutput.actual)) } });
    }
    assertNoBrowserErrors(opened.errors, "Compound primitive reference");
    await opened.page.close();
    const sheet = createCanvas(frame.width * 3, (frame.height + 38) * 2 + 55), context = sheet.getContext("2d");
    context.fillStyle = "#e9edf3"; context.fillRect(0, 0, sheet.width, sheet.height);
    context.fillStyle = "#172b4d"; context.font = "bold 22px sans-serif";
    context.fillText("Compound paths · renderer equivalence", 20, 30);
    for (let i = 0; i < variants.length; i++) {
      const x = i % 3 * frame.width, y = 55 + Math.floor(i / 3) * (frame.height + 38);
      context.font = "16px sans-serif"; context.fillStyle = "#172b4d"; context.fillText(variants[i].title, x + 16, y + 24);
      context.drawImage(await loadImage(path.join(directory, variants[i].id, "primitive.png")), x, y + 38);
    }
    await writeFile(path.join(directory, "contact-sheet.png"), sheet.toBuffer("image/png"));
    await writeFile(path.join(directory, "results.json"), JSON.stringify({ productIntegration: "passed", variants: evidence }, null, 2) + "\n");
    assert.equal(evidence.length, 6);
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});
