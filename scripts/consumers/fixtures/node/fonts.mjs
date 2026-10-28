import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { chart, prepareFontResource, prepareTextMetrics, prepareFontRendering, render } from "ggaction";
import { chart as basic, prepareFontRendering as basicPrepare } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";

// Original MIT geometric fixture, copied as source data. No checkout imports.
const bytes = Buffer.from("AAEAAAAKAIAAAwAgT1MvMkVARxsAAAEoAAAAYGNtYXAAVwOLAAABnAAAAERnbHlmD/fnfQAAAewAAABmaGVhZFmHpRQAAACsAAAANmhoZWEFegLCAAAA5AAAACRobXR4CGb/zgAAAYgAAAAUbG9jYQA0AFoAAAHgAAAADG1heHAABwAGAAABCAAAACBuYW1lpua8ewAAAlQAAAIQcG9zdOtXyAoAAARkAAAANgABAAAAAQAABrXagV8PPPUAAwPoAAAAAHwlsIAAAAAAfCWwgP84AAAC7gM0AAAAAwACAAAAAAAAAAEAAANS/2oAAAMg/zgAMgLuAAEAAAAAAAAAAAAAAAAAAAAFAAEAAAAFAAQAAQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwIaAZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAAAAAAAAAAAAAAAAPz8/PwAAACADAQNS/2oAAANSAJYAAAAAAAAAAAAAAAAAAAAgAAAB9AAyAPoAAAJYADIDIAAyAAD/OAAAAAIAAAADAAAAFAADAAEAAAAUAAQAMAAAAAgACAACAAAAIABCAwH//wAAACAAQQMB////4f/B/QMAAQAAAAAAAAAAAAAADQANABoAJwAzAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAACJgK8AAMAADMhESEyAfT+DAK8AAABADIAAALuArwAAwAAMyERITICvP1EArwAAAH/OALk/5wDNAADAAADMzUjyGRkAuRQAAAAAAAMAJYAAQAAAAAAAQAXAAAAAQAAAAAAAgAHABcAAQAAAAAAAwAZAB4AAQAAAAAABAAfADcAAQAAAAAABQALAFYAAQAAAAAABgAdAGEAAwABBAkAAQAuAH4AAwABBAkAAgAOAKwAAwABBAkAAwAyALoAAwABBAkABAA+AOwAAwABBAkABQAWASoAAwABBAkABgA6AUBnZ2FjdGlvbiBNZXRyaWMgRml4dHVyZVJlZ3VsYXJnZ2FjdGlvbi1tZXRyaWMtZml4dHVyZS0xZ2dhY3Rpb24gTWV0cmljIEZpeHR1cmUgUmVndWxhclZlcnNpb24gMS4wZ2dhY3Rpb25NZXRyaWNGaXh0dXJlLVJlZ3VsYXIAZwBnAGEAYwB0AGkAbwBuACAATQBlAHQAcgBpAGMAIABGAGkAeAB0AHUAcgBlAFIAZQBnAHUAbABhAHIAZwBnAGEAYwB0AGkAbwBuAC0AbQBlAHQAcgBpAGMALQBmAGkAeAB0AHUAcgBlAC0AMQBnAGcAYQBjAHQAaQBvAG4AIABNAGUAdAByAGkAYwAgAEYAaQB4AHQAdQByAGUAIABSAGUAZwB1AGwAYQByAFYAZQByAHMAaQBvAG4AIAAxAC4AMABnAGcAYQBjAHQAaQBvAG4ATQBlAHQAcgBpAGMARgBpAHgAdAB1AHIAZQAtAFIAZQBnAHUAbABhAHIAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAwAkACUBAglhY3V0ZWNvbWIAAA==", "base64");
const expectedHash = "cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878";
const family = "ggaction Metric Fixture";
const source = { uri: "fixture:installed-font", mimeType: "font/ttf", expectedHash,
  family, style: "normal", weight: 400, metricsProviderVersion: "installed@1" };
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
const register = request => { const key = GlobalFonts.register(request.bytes, request.family); assert.ok(key);
  return { ...identity(request), dispose() { GlobalFonts.remove(key); } }; };
const decode = request => { const registration = register(request); registration.dispose(); return identity(request); };
const measure = ({ asset, queries }) => {
  const registration = register({ ...asset, bytes: Buffer.from(asset.payload.data, "base64") });
  try {
    const context = createCanvas(1, 1).getContext("2d");
    return { contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(query => { context.font = `${asset.weight} ${query.fontSize}px "${asset.family}"`; return context.measureText(query.text).width; }) };
  } finally { registration.dispose(); }
};
const host = { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode, measure };
async function example() {
  const base = chart().createCanvas({ width: 200, height: 120, margin: 40 })
    .createTitle({ text: "AB", titleStyle: { fontFamily: family, fontSize: 20, fontWeight: 400 } });
  const font = base.createFontResource({ prepared: await prepareFontResource(base, { kind: "create", id: "font", ...source }, host), requestToken: "current" });
  return font.applyTextMetrics({ prepared: await prepareTextMetrics(font, { id: "exact", fonts: ["font"] },
    { requestToken: "current", decode, measure }), requestToken: "current" });
}
export const cases = [
  { id: "fonts/resource-metrics-offline", async run() {
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash);
    const program = await example(), before = serializeProgram(program);
    assert.equal(program.materializationConfigs.textMetrics.measurements.find(value => value.text === "AB").width, 28);
    assert.throws(() => program.editTitle({ text: "BBBB" }), error => error.assetCode === "metrics-required");
    assert.equal(serializeProgram(program), before);
    const prepared = await prepareFontResource(program, { kind: "replace", target: "font", ...source, metricsProviderVersion: "installed@2" }, host);
    assert.throws(() => program.editCanvas({ width: 210 }).replaceFontResource({ prepared, requestToken: "current" }), error => error.assetCode === "stale-result");
    const replaced = program.replaceFontResource({ prepared, requestToken: "current" });
    assert.equal(replaced.materializationConfigs.textMetrics.fonts[0].resource.revision, 1);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(replaced))), renderToSVG(replaced));
    await writeFile("font-snapshot.json", serializeProgram(replaced));
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", 'import{readFileSync}from"node:fs";import{deserializeProgram}from"ggaction/persistence";import{renderToSVG}from"ggaction/svg";const p=deserializeProgram(readFileSync("font-snapshot.json","utf8"));if(!renderToSVG(p).includes("@font-face"))throw new Error("Missing embedded font");console.log(p.materializationConfigs.textMetrics.fonts[0].resource.revision);'], { encoding: "utf8" });
    assert.equal(result.trim(), "1");
    assert.equal(replaced.removeResource({ kind: "font", id: "font", cascade: true }).materializationConfigs.textMetrics, undefined);
    assert.equal(basic().createFontResource, undefined);
  } },
  { id: "fonts/renderers-scene-handles", async run() {
    const generic = chart().createCanvas({ width: 200, height: 120, margin: 40 })
      .createTitle({ text: "Root 0.9", titleStyle: { fontFamily: "sans-serif" } });
    let initialPixels;
    const checkGeneric = async () => {
      const canvas = createCanvas(1, 1); render(generic, canvas.getContext("2d"));
      const png = (await renderToPNGBuffer(generic)).buffer;
      assert.deepEqual(png, canvas.toBuffer("image/png"));
      if (initialPixels === undefined) initialPixels = png;
      else assert.deepEqual(png, initialPixels);
      assert.match((await renderToPDFBuffer(generic)).buffer.toString("latin1"), /\/ToUnicode/);
    };
    await checkGeneric();
    const program = await example(), restored = deserializeGraphic(serializeGraphic(program));
    const fonts = await prepareFontRendering(program, { register }), canvas = createCanvas(1, 1);
    try {
      render(program, canvas.getContext("2d"), { fonts });
      assert.deepEqual((await renderToPNGBuffer(program)).buffer, canvas.toBuffer("image/png"));
      assert.deepEqual((await renderToPNGBuffer(restored)).buffer, canvas.toBuffer("image/png"));
      assert.equal((await renderToPDFBuffer(restored)).buffer.subarray(0, 4).toString(), "%PDF");
      assert.equal(renderToSVG(restored), renderToSVG(program));
      await checkGeneric();
    } finally { fonts.dispose(); }
    await checkGeneric();
    assert.throws(() => render(program, canvas.getContext("2d"), { fonts }), error => error.assetCode === "disposed");
    const scene = createTransitionScene(restored, { format: "canvas" }), prepared = await basicPrepare(scene, { register });
    try { renderTransitionScene(scene, canvas.getContext("2d"), { fonts: prepared });
      assert.deepEqual(canvas.toBuffer("image/png"), (await renderToPNGBuffer(restored)).buffer); }
    finally { prepared.dispose(); }
  } }
];
