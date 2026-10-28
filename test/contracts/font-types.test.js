import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("font declarations preserve opaque preparations, exact profile union and Basic rendering", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-fonts-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, prepareFontResource, prepareTextMetrics, prepareFontRendering, render,
  type PreparedFontResource, type PreparedTextMetrics, type PreparedFontRendering, type FontResourceHost,
  type TextMetricsHost, type FontRenderingHost } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic, prepareFontRendering as basicPrepare } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import { renderTransitionScene, type CanvasTransitionScene } from ${JSON.stringify(path.join(root, "types/scene.js"))};
const p = chart().createCanvas();
const source = { uri: "fixture:font", expectedHash: "a".repeat(64), mimeType: "font/ttf" as const,
  family: "Fixture", style: "normal" as const, weight: 400 as const, metricsProviderVersion: "fixture@1" };
declare const host: FontResourceHost;
declare const metricsHost: TextMetricsHost;
declare const renderHost: FontRenderingHost;
const created = await prepareFontResource(p, { kind: "create", id: "font", ...source }, host);
const next = p.createFontResource({ prepared: created, requestToken: "now" });
const replaced = await prepareFontResource(next, { kind: "replace", target: "font", ...source }, host);
next.replaceFontResource({ prepared: replaced, requestToken: "now" });
const metrics = await prepareTextMetrics(next, { id: "metric", fonts: ["font"] }, metricsHost);
const measured = next.applyTextMetrics({ prepared: metrics, requestToken: "now" });
measured.applyTextMetrics({ profile: { schemaVersion: 1, id: "legacy", measurements: [] } });
measured.removeResource({ kind: "font", id: "font", cascade: true });
const fonts = await prepareFontRendering(measured, renderHost);
render(measured, {} as CanvasRenderingContext2D, { fonts }); fonts.dispose();
await basicPrepare(basic(), renderHost);
declare const scene: CanvasTransitionScene;
const sceneFonts = await prepareFontRendering(scene, renderHost);
renderTransitionScene(scene, {} as CanvasRenderingContext2D, { fonts: sceneFonts }); sceneFonts.dispose();
// @ts-expect-error resource handles are opaque
const forged: PreparedFontResource = { kind: "font-resource", request: { kind: "create", id: "font" } };
// @ts-expect-error metric evidence is opaque
const forgedMetrics: PreparedTextMetrics = { kind: "text-metrics", request: { id: "metric", fonts: ["font"] } };
// @ts-expect-error rendering registrations are opaque
const forgedRendering: PreparedFontRendering = { kind: "font-rendering", fontCount: 1, dispose() {} };
// @ts-expect-error create cannot consume a replace handle
p.createFontResource({ prepared: replaced, requestToken: "now" });
// @ts-expect-error measured profile and prepared evidence are exclusive
next.applyTextMetrics({ prepared: metrics, requestToken: "now", profile: { schemaVersion: 1, id: "m", measurements: [] } });
// @ts-expect-error prepared metrics belong to their exact receiver
next.applyTextMetrics({ prepared: metrics, requestToken: "now", target: { childPath: ["left"], id: "x" } });
// @ts-expect-error schema 2 is not a manually authored profile
next.applyTextMetrics({ profile: { schemaVersion: 2, id: "m", fonts: [], measurements: [] } });
// @ts-expect-error Basic does not author font resources
basic().createFontResource({ prepared: created, requestToken: "now" });
// @ts-expect-error resource token is required
p.createFontResource({ prepared: created });
// @ts-expect-error MIME vocabulary is closed
await prepareFontResource(p, { kind: "create", id: "font", ...source, mimeType: "font/unknown" }, host);
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
