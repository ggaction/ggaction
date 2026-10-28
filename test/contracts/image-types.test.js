import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("image declarations preserve opaque preparations and Full/Basic rendering boundaries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-images-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, prepareImageResource, prepareImageRendering, render, type PreparedImageResource, type PreparedImageRendering, type GraphicLineageRef } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic, prepareImageRendering as prepareBasic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import { renderTransitionScene, type CanvasTransitionScene } from ${JSON.stringify(path.join(root, "types/scene.js"))};
const p = chart().createCanvas();
const source = { uri: "fixture:logo", expectedHash: "a".repeat(64), mimeType: "image/png" as const };
const host = { requestToken: "now", load: () => ({ bytes: new Uint8Array(), mimeType: "image/png" as const }), decode: () => ({ width: 20, height: 10, originClean: true as const }) };
const prepared = await prepareImageResource(p, { kind: "create", id: "logo", ...source }, host);
const next = p.createImageResource({ prepared, requestToken: "now" }).createImageMark({ image: "logo", alt: "Logo", fit: "cover", align: [0, 1], viewport: { x: 0, y: 0, width: 40, height: 40 }, clip: { x: 0, y: 0, width: 10, height: 10 } }).editImageMark({ opacity: 0.5, viewport: "auto" });
const replacement = await prepareImageResource(next, { kind: "replace", target: "logo", ...source }, host);
next.replaceImageResource({ prepared: replacement, requestToken: "now" });
const decode = () => ({ image: {} as HTMLImageElement, width: 20, height: 10, originClean: true as const });
const images = await prepareImageRendering(next, { decode });
render(next, {} as CanvasRenderingContext2D, { images });
await prepareBasic(basic(), { decode });
declare const scene: CanvasTransitionScene;
const frame = await prepareImageRendering(scene, { decode });
renderTransitionScene(scene, {} as CanvasRenderingContext2D, { images: frame });
const lineage: GraphicLineageRef = { kind: "resource", resource: { kind: "image", id: "logo", revision: 1 } };
// @ts-expect-error handles are opaque
const forged: PreparedImageResource = { kind: "image-resource", request: { kind: "create", id: "logo" } };
// @ts-expect-error renderer evidence is opaque
const renderForgery: PreparedImageRendering = { kind: "image-rendering", imageCount: 1 };
// @ts-expect-error create and replace are distinct preparations
p.createImageResource({ prepared: replacement, requestToken: "now" });
// @ts-expect-error host token required
p.createImageResource({ prepared });
// @ts-expect-error Basic has no image authoring
basic().createImageMark();
// @ts-expect-error MIME vocabulary is closed
await prepareImageResource(p, { kind: "create", id: "logo", ...source, mimeType: "image/gif" }, host);
// @ts-expect-error viewport reset is explicit
next.editImageMark({ viewport: null });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
