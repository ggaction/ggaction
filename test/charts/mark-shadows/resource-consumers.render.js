import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { prepareShadowRendering, prepareImageRendering, prepareFontRendering, render } from "../../../src/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { effectConsumers, resourceEffectPair } from "../../support/resource-effect-programs.js";
import { resolveGraphicBounds } from "../../../src/layout/canvas.js";
import { ensureVariantMetadata } from "../../support/artifact-metadata.js";
import { registerFont } from "../../../examples/font-assets/host.js";
import { startStaticServer } from "../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../../support/browser.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = new URL("../../../.artifacts/test/png/charts/mark-shadows/resource-consumers/", import.meta.url);
const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
async function pixels(buffer) {
  const image = await loadImage(buffer), canvas = createCanvas(image.width, image.height), context = canvas.getContext("2d");
  context.drawImage(image, 0, 0); return context.getImageData(0, 0, image.width, image.height).data;
}
test("resource role effects match explicit concrete appearance across Canvas, SVG, PNG and PDF", async () => {
  const server = await startStaticServer(root), browser = await chromium.launch({ headless: true });
  const evidence = [];
  try {
    const opened = await openBrowserPage(browser, `${server.baseUrl}examples/mark-shadows/`);
    for (const name of effectConsumers) {
      console.log(`Resource effect consumer: ${name}`);
      const output = new URL(`${name}/`, directory); await mkdir(output, { recursive: true });
      const { publicProgram, primitive, effectEdit } = await resourceEffectPair(name), snapshot = serializeGraphic(publicProgram);
      assert.equal(publicProgram.trace.children.at(-1).op, effectEdit.op);
      await ensureVariantMetadata({ scope: "charts", capability: "mark-shadows", chart: "resource-consumers", variant: name, kind: "user-facing",
        title: `${name} outlines and shadows`, userFacingCallChain: `import { resourceEffectPair } from "./test/support/resource-effect-programs.js";\nconst { base } = await resourceEffectPair(${JSON.stringify(name)});\nconst program = base.${effectEdit.op}(${JSON.stringify(effectEdit.options)});` });
      const png = (await renderToPNGBuffer(publicProgram)).buffer;
      const raw = await pixels(png), frame = resolveGraphicBounds(publicProgram), width = publicProgram.graphicSpec.objects.canvas.properties.width;
      let ink = 0;
      for (let y = Math.max(0, Math.ceil(frame.y)); y < Math.floor(frame.y + frame.height); y++) for (let x = Math.max(0, Math.ceil(frame.x)); x < Math.floor(frame.x + frame.width); x++) {
        const offset = (y * width + x) * 4;
        if (raw[offset + 3] > 0 && Math.min(raw[offset], raw[offset + 1], raw[offset + 2]) < 245) ink++;
      }
      assert.ok(ink > 50, `${name} plot-region ink`);
      assert.deepEqual(await pixels(png), await pixels((await renderToPNGBuffer(primitive)).buffer), `${name} native primitive/public`);
      assert.deepEqual(png, (await renderToPNGBuffer(deserializeGraphic(snapshot))).buffer);
      const images = await prepareImageRendering(publicProgram, { decode });
      const fonts = await prepareFontRendering(publicProgram, { register: registerFont });
      const shadows = await prepareShadowRendering(publicProgram, { createCanvas, decode, fonts });
      try { const canvas = createCanvas(1, 1); render(publicProgram, canvas.getContext("2d"), { images, shadows, fonts }); assert.deepEqual(png, canvas.toBuffer("image/png")); }
      finally { shadows.dispose(); fonts.dispose(); }
      await writeFile(new URL("public.png", output), png);
      for (const [kind, program] of [["public", publicProgram], ["primitive", primitive]]) {
        await writeFile(new URL(`${kind}.pdf`, output), (await renderToPDFBuffer(program)).buffer);
        execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", fileURLToPath(new URL(`${kind}.pdf`, output)), fileURLToPath(new URL(`${kind}-pdf`, output))], { stdio: "pipe" });
      }
      assert.deepEqual(await pixels(await readFile(new URL("public-pdf.png", output))), await pixels(await readFile(new URL("primitive-pdf.png", output))), `${name} PDF pair`);
      const pair = await opened.page.evaluate(async name => {
        const { resourceEffectPair } = await import("/test/support/resource-effect-programs.js");
        const { prepareShadowRendering, prepareImageRendering, prepareFontRendering, render } = await import("/src/index.js");
        const { renderToSVG } = await import("/src/renderers/svg.js");
        const { registerFont } = await import("/examples/font-assets/host.js");
        const createCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
        const { decodeImage: decode } = await import("/examples/image-assets/host.js");
        const { publicProgram, primitive } = await resourceEffectPair(name), results = [];
        for (const program of [publicProgram, primitive]) {
          const images = await prepareImageRendering(program, { decode }), fonts = await prepareFontRendering(program, { register: registerFont }), shadows = await prepareShadowRendering(program, { createCanvas, decode, fonts });
          try {
            const canvas = createCanvas(1, 1); render(program, canvas.getContext("2d"), { images, shadows, fonts });
            const svg = renderToSVG(program, { shadows }), image = new Image(); image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await image.decode();
            const raster = createCanvas(canvas.width, canvas.height); raster.getContext("2d").drawImage(image, 0, 0);
            results.push({ canvas: canvas.toDataURL(), svg: raster.toDataURL(), source: svg });
          } finally { shadows.dispose(); fonts.dispose(); }
        }
        return results;
      }, name);
      for (const backend of ["canvas", "svg"]) {
        const decoded = pair.map(value => Buffer.from(value[backend].split(",")[1], "base64"));
        assert.deepEqual(await pixels(decoded[0]), await pixels(decoded[1]), `${name} browser ${backend} pair`);
        await writeFile(new URL(`browser-${backend}.png`, output), decoded[0]);
      }
      await writeFile(new URL("public.svg", output), pair[0].source);
      assert.equal(serializeGraphic(publicProgram), snapshot);
      evidence.push({ consumer: name, exactPairs: ["browser-canvas", "browser-svg", "native-png", "native-pdf"], graphicOffline: true });
    }
    assertNoBrowserErrors(opened.errors, "Resource effect consumers");
    await writeFile(new URL("results.json", directory), JSON.stringify(evidence, null, 2) + "\n");
  } finally { await closeBrowserWithEvidence(browser); await server.close(); }
});
