import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chart, prepareImageResource } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems, comparePrograms } from "../../../src/inspection.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

test("keeps image and hierarchy resources independent across revision, restore and removal", async () => {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
  const base = chart().createCanvas({ width: 240, height: 200 });
  const prepared = await prepareImageResource(base, { kind: "create", id: "asset", uri: "fixture:image", mimeType: "image/svg+xml",
    expectedHash: createHash("sha256").update(bytes).digest("hex") }, { requestToken: "image", load: () => ({ bytes, mimeType: "image/svg+xml" }), decode: () => ({ width: 10, height: 10, originClean: true }) });
  const p = base.createImageResource({ prepared, requestToken: "image" }).createImageMark({ id: "logo", image: "asset", viewport: { x: 0, y: 0, width: 20, height: 20 } })
    .createData({ id: "rows", values: [{ id: "r", parent: null }, { id: "a", parent: "r", value: 2 }] })
    .createHierarchyData({ id: "asset", data: "rows", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", hierarchy: "asset", method: "tree", options: { nodeSize: [10, 10], siblingGap: 2, depthGap: 2, orientation: "vertical" } })
    .createTreePlot({ id: "tree", layout: "layout" });
  const prior = JSON.stringify(p);
  const revised = p.reviseData({ source: "rows", id: "revised", values: [{ id: "r", parent: null }, { id: "a", parent: "r", value: 7 }] });
  assert.equal(revised.semanticSpec.resources.find(resource => resource.kind === "image").revision, 0);
  assert.equal(revised.semanticSpec.resources.find(resource => resource.kind === "hierarchy").revision, 1);
  assert.equal(getMarkItems(revised, { target: "tree" }).find(item => item.fields.id === "a").fields.value, 7);
  assert.equal(getMarkItems(revised, { target: "logo" }).length, 1);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(revised))), renderToSVG(revised));
  assert.throws(() => revised.removeResource({ kind: "hierarchy", id: "asset", cascade: true }));
  const withoutImage = revised.removeResource({ kind: "image", id: "asset", cascade: true });
  assert.equal(withoutImage.semanticSpec.layers.some(layer => layer.id === "logo"), false);
  assert.equal(getMarkItems(withoutImage, { target: "tree" }).length, 2);
  assert.equal(withoutImage.semanticSpec.resources.some(resource => resource.kind === "hierarchy" && resource.id === "asset"), true);
  const comparison = comparePrograms(revised, withoutImage);
  assert.ok(comparison.affected.some(ref => ref.kind === "image" && ref.id === "asset"));
  assert.equal(comparison.affected.some(ref => ref.kind === "hierarchy"), false);
  assert.equal(JSON.stringify(p), prior);
});
