import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { variants } from "./manifest.js";
import { fonts } from "../../../examples/font-assets/fonts/manifest.js";
import { startStaticServer } from "../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../../support/browser.js";
import { ensureVariantMetadata } from "../../support/artifact-metadata.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = new URL("../../../.artifacts/test/png/charts/font-assets/font-assets/korean-emoji/", import.meta.url);
const hash = value => createHash("sha256").update(value).digest("hex");
async function pixels(bytes) {
  const image = await loadImage(bytes), canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return { width: image.width, height: image.height, data: canvas.getContext("2d").getImageData(0, 0, image.width, image.height).data };
}
function inkRows(image) {
  return [[12, 47], [48, 79], [80, 114], [115, 151]].map(([top, bottom]) => {
    let ink = 0;
    for (let y = top; y < bottom; y++) for (let x = 35; x < 225; x++) {
      const offset = (y * image.width + x) * 4;
      if (image.data[offset + 3] > 0 && image.data[offset] + image.data[offset + 1] + image.data[offset + 2] < 600) ink++;
    }
    assert.ok(ink > 100, `Visible fixed-font ink required in row ${top}..${bottom}: ${ink}`);
    return ink;
  });
}
test("exact Korean, combining and joined emoji fonts survive Canvas, SVG, PNG and PDF output", async () => {
  let server, browser;
  await mkdir(directory, { recursive: true });
  const variant = variants[0], program = variant.userFacing(), primitive = variant.primitive();
  await ensureVariantMetadata({ scope: "charts", capability: "font-assets", chart: variant.chart, variant: variant.variant,
    kind: "primitive", title: variant.title, userFacingCallChain: variant.callChain });
  const evidence = { fonts: fonts.map(({ file, sha256 }) => ({ file, sha256 })), outputs: {}, inkRows: {} };
  try {
    const publicPNG = (await renderToPNGBuffer(program)).buffer, primitivePNG = (await renderToPNGBuffer(primitive)).buffer;
    assert.deepEqual((await pixels(publicPNG)).data, (await pixels(primitivePNG)).data);
    evidence.inkRows.png = inkRows(await pixels(publicPNG));
    await writeFile(new URL("public.png", directory), publicPNG); await writeFile(new URL("primitive.png", directory), primitivePNG);
    const publicSVG = renderToSVG(program), primitiveSVG = renderToSVG(primitive);
    assert.equal(publicSVG, primitiveSVG);
    await writeFile(new URL("public.svg", directory), publicSVG); await writeFile(new URL("primitive.svg", directory), primitiveSVG);
    for (const [kind, input] of [["public", program], ["primitive", primitive]]) {
      const pdf = (await renderToPDFBuffer(input)).buffer;
      await writeFile(new URL(`${kind}.pdf`, directory), pdf);
      execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", fileURLToPath(new URL(`${kind}.pdf`, directory)),
        fileURLToPath(new URL(`${kind}-pdf`, directory))], { stdio: "pipe" });
    }
    const publicPDF = await readFile(new URL("public-pdf.png", directory)), primitivePDF = await readFile(new URL("primitive-pdf.png", directory));
    assert.deepEqual((await pixels(publicPDF)).data, (await pixels(primitivePDF)).data);
    evidence.inkRows.pdf = inkRows(await pixels(publicPDF));
    server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}examples/font-assets/`, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
    const canvasResult = await opened.page.evaluate(async () => {
      const [{ createFontPrimitive }, { render, prepareFontRendering }, { registerFont }] = await Promise.all([
        import("../../test/charts/font-assets/primitive.program.js"), import("../../src/index.js"), import("./host.js")]);
      const primitive = createFontPrimitive(), fonts = await prepareFontRendering(primitive, { register: registerFont });
      const canvas = document.createElement("canvas");
      try { render(primitive, canvas.getContext("2d"), { fonts });
        return { public: document.querySelector("canvas").toDataURL(), primitive: canvas.toDataURL() }; }
      finally { fonts.dispose(); }
    });
    const browserPNG = Buffer.from(canvasResult.public.split(",")[1], "base64"), browserPrimitive = Buffer.from(canvasResult.primitive.split(",")[1], "base64");
    assert.deepEqual((await pixels(browserPNG)).data, (await pixels(browserPrimitive)).data);
    evidence.inkRows.browserCanvas = inkRows(await pixels(browserPNG));
    await writeFile(new URL("browser-canvas.png", directory), browserPNG);
    assertNoBrowserErrors(opened.errors, "Exact font browser example"); await opened.page.close();
    // Fresh document has no application FontFace registrations. Only SVG's
    // embedded font definitions may satisfy these exact content-addressed names.
    const svgPage = await browser.newPage({ viewport: { width: variant.width, height: variant.height } });
    await svgPage.setContent(`<html><body style="margin:0">${publicSVG}</body></html>`);
    const registered = await svgPage.evaluate(async () => {
      for (const face of document.fonts) await face.load(); await document.fonts.ready;
      return [...document.fonts].map(face => ({ family: face.family, status: face.status }));
    });
    assert.equal(registered.length, 2); assert.ok(registered.every(face => face.status === "loaded" && face.family.includes("ggaction-font-")));
    const svgPNG = await svgPage.locator("svg").screenshot();
    evidence.inkRows.browserSVG = inkRows(await pixels(svgPNG));
    await writeFile(new URL("browser-svg.png", directory), svgPNG); await svgPage.close();
    for (const [name, bytes] of Object.entries({ png: publicPNG, pdf: publicPDF, svg: Buffer.from(publicSVG), browserCanvas: browserPNG, browserSVG: svgPNG })) evidence.outputs[name] = hash(bytes);
    evidence.exactPrimitivePublic = ["graphicSpec", "Node PNG pixels", "Node PDF pixels", "Browser Canvas pixels", "SVG source"];
    evidence.crossBackendPolicy = "Fixed font identities and literal line origins; visible ink in every line. No identical antialiasing claim.";
    await writeFile(new URL("evidence.json", directory), JSON.stringify(evidence, null, 2) + "\n");
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});
