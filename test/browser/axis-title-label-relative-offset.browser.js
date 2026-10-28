import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { createVariantMetadata } from "../support/artifact-paths.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
let server, browser, temporary;
test.before(async () => {
  await mkdir(path.join(root, ".artifacts"), { recursive: true });
  temporary = await mkdtemp(path.join(root, ".artifacts/title-label-relative-"));
  await writeFile(path.join(temporary, "index.html"), "<!doctype html><title>Relative axis titles</title>");
  server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
});
test.after(async () => {
  await closeBrowserWithEvidence(browser); await server?.close();
  await rm(temporary, { recursive: true, force: true });
});
test("four independent title widths exactly match the numeric public reference in decoded RGBA", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto(server.baseUrl + path.relative(root, temporary) + "/");
    const result = await page.evaluate(async () => {
      const { buildNumericTitleReference, buildRelativeTitleFacet } = await import("/test/support/axis-title-label-relative.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const programs = [buildNumericTitleReference(), buildRelativeTitleFacet()];
      await document.fonts.ready;
      const records = [];
      for (const p of programs) {
        const svg = renderToSVG(p), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        try {
          const image = new Image(); image.src = url; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
          records.push({ width: image.width, height: image.height, pixels: ctx.getImageData(0, 0, image.width, image.height).data,
            png: canvas.toDataURL("image/png").slice("data:image/png;base64,".length),
            axes: Object.values(p.children).map(child => ({ plot: child.materializationConfigs.canvas.plot,
              x: child.graphicSpec.objects.yAxisTitle.properties.x, y: child.graphicSpec.objects.yAxisTitle.properties.y,
              offset: child.guideConfigs.axis.y.title.offset })) });
        } finally { URL.revokeObjectURL(url); }
      }
      const [a, b] = records;
      let differences = a.pixels.length === b.pixels.length ? 0 : 1, plotInk = 0;
      if (!differences) for (let i = 0; i < a.pixels.length; i++) differences += a.pixels[i] !== b.pixels[i] ? 1 : 0;
      for (let y = 59; y < 259; y++) for (let x = 34; x < 234; x++) {
        const at = (y * a.width + x) * 4;
        if (a.pixels[at + 3] > 0 && (a.pixels[at] < 240 || a.pixels[at + 1] < 240 || a.pixels[at + 2] < 240)) plotInk++;
      }
      return { differences, plotInk, records: records.map(({ pixels, ...record }) => record) };
    });
    assert.equal(result.differences, 0, "numeric and relative public programs must be pixel-exact");
    assert.ok(result.plotInk > 100, "reference must include actual plot-region ink");
    const fixture = JSON.parse(await readFile(path.join(root, "test/support/axis-title-label-relative.json")));
    for (const record of result.records) {
      assert.equal(record.width, 1016); assert.equal(record.height, 302);
      assert.deepEqual(record.axes.map(axis => axis.x), fixture.groups.map(group => group.expectedTitleAnchorX));
      assert(record.axes.every(axis => axis.y === 159.5 && axis.plot.width === 200 && axis.plot.height === 200));
    }
    assert(result.records[1].axes.every(axis => axis.offset.from === "labels" && axis.offset.gap === 3.421875));
    const out = path.join(root, ".artifacts/test/png/charts/guides/axis-title-label-relative-offset/four-independent-label-widths");
    await mkdir(out, { recursive: true });
    for (const [i, name] of ["primitive", "user-facing"].entries()) {
      await writeFile(path.join(out, name + ".png"), Buffer.from(result.records[i].png, "base64"));
    }
    const source = await readFile(path.join(root, "test/support/axis-title-label-relative.js"), "utf8");
    await writeFile(path.join(out, "variant.json"), JSON.stringify(createVariantMetadata({
      scope: "charts", capability: "guides", chart: "axis-title-label-relative-offset",
      variant: "four-independent-label-widths", kind: "user-facing", title: "Axis titles follow independent label widths",
      userFacingCallChain: source.slice(source.indexOf("export function buildRelativeTitleFacet"))
    }), null, 2) + "\n");
    await writeFile(path.join(out, "evidence.json"), JSON.stringify({
      publicTargetSource: "test/support/axis-title-label-relative.js#buildRelativeTitleFacet", width: 1016, height: 302,
      exactDecodedRGBA: true, differingChannels: result.differences, plotInk: result.plotInk,
      axes: result.records[1].axes, imagesInspected: false }, null, 2) + "\n");
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
