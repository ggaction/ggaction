import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chart, prepareImageResource, hconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { getMarkItems, comparePrograms, inspectProgram, describeAction } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>');
const asset = { uri: "fixture:logo", mimeType: "image/svg+xml", expectedHash: createHash("sha256").update(bytes).digest("hex") };
const host = { requestToken: "current", load: () => ({ bytes, mimeType: asset.mimeType }), decode: () => ({ width: 20, height: 10, originClean: true }) };
const frame = () => chart().createCanvas({ width: 200, height: 160, margin: { left: 10, right: 10, top: 20, bottom: 20 } });
async function create(program = frame(), id = "logo") {
  const prepared = await prepareImageResource(program, { kind: "create", id, ...asset }, host);
  return program.createImageResource({ prepared, requestToken: host.requestToken });
}
const properties = p => p.graphicSpec.objects.image.items[0].properties;
const code = expected => error => error.assetCode === expected;

test("creates retained image data with exact receiver/token and a bounded trace descriptor", async () => {
  const base = frame(), prepared = await prepareImageResource(base, { kind: "create", id: "logo", ...asset }, host);
  assert.deepEqual(prepared, { kind: "image-resource", request: { kind: "create", id: "logo" } });
  assert.throws(() => base.createImageResource({ prepared: { ...prepared }, requestToken: "current" }), /authentic/);
  assert.throws(() => base.createImageResource({ prepared, requestToken: "old" }), code("stale-result"));
  assert.throws(() => base.editCanvas({ width: 201 }).createImageResource({ prepared, requestToken: "current" }), code("stale-result"));
  assert.throws(() => base.replaceImageResource({ prepared, requestToken: "current" }), code("stale-result"));
  const next = base.createImageResource({ prepared, requestToken: "current" });
  assert.equal(base.semanticSpec.resources.length, 0);
  assert.equal(next.semanticSpec.resources[0].result.payload.data, bytes.toString("base64"));
  assert.ok(!JSON.stringify(next.trace).includes(bytes.toString("base64")));
  assert.equal(base.createImageResource({ prepared, requestToken: "current" }).semanticSpec.resources[0].revision, 0);
  assert.equal(basic().createImageResource, undefined);
  await assert.rejects(prepareImageResource(basic(), { kind: "create", id: "logo", ...asset }, host), /image-authoring/);
});

test("preflights identity, options, existing state and abort before loader work", async () => {
  const base = frame(); let calls = 0;
  const observer = { ...host, load: () => { calls++; return host.load(); } };
  for (const request of [{ kind: "no", id: "logo", ...asset }, { kind: "create", id: "logo", target: "logo", ...asset },
    { kind: "replace", target: "missing", ...asset }, { kind: "create", id: "", ...asset },
    { kind: "create", id: "logo", ...asset, expectedHash: "invalid" }]) await assert.rejects(prepareImageResource(base, request, observer));
  const occupied = await create(base);
  await assert.rejects(prepareImageResource(occupied, { kind: "create", id: "logo", ...asset }, observer), code("duplicate-id"));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(prepareImageResource(base, { kind: "create", id: "logo", ...asset }, { ...observer, signal: controller.signal }), code("aborted"));
  assert.equal(calls, 0);
});

test("aborted prepared resources never enter state and descriptor getters never execute", async () => {
  const base = frame(), controller = new AbortController(); let reads = 0;
  await assert.rejects(prepareImageResource(base, { kind: "create", id: "logo", ...asset, get attribution() { reads++; return "value"; } }, host), /accessors/);
  assert.equal(reads, 0);
  const prepared = await prepareImageResource(base, { kind: "create", id: "logo", ...asset }, { ...host, signal: controller.signal });
  controller.abort(); assert.throws(() => base.createImageResource({ prepared, requestToken: "current" }), code("aborted"));
  assert.equal(base.semanticSpec.resources.length, 0);
});

test("creates one dataset-free image item with literal contain, cover, fill and auto-resize geometry", async () => {
  const base = await create(); const p = base.createImageMark();
  assert.equal(p.semanticSpec.datasets.length, 0); assert.equal(p.semanticSpec.scales.length, 0); assert.equal(p.semanticSpec.coordinates.length, 0);
  assert.deepEqual([properties(p).x, properties(p).y, properties(p).width, properties(p).height], [10, 35, 180, 90]);
  const key = p.graphicSpec.objects.image.items[0].identity.key;
  const cover = p.editImageMark({ fit: "cover" });
  assert.deepEqual([properties(cover).x, properties(cover).y, properties(cover).width, properties(cover).height], [-20, 20, 240, 120]);
  const fill = p.editImageMark({ fit: "fill" });
  assert.deepEqual([properties(fill).x, properties(fill).y, properties(fill).width, properties(fill).height], [10, 20, 180, 120]);
  const resized = p.editCanvas({ width: 300 });
  assert.deepEqual([properties(resized).x, properties(resized).y, properties(resized).width, properties(resized).height], [30, 20, 240, 120]);
  assert.equal(resized.graphicSpec.objects.image.items[0].identity.key, key);
  assert.throws(() => p.createImageMark(), /already|explicit/);
});

test("keeps explicit viewport size on resize, moves with plot margins, and resets only with auto", async () => {
  const p = (await create()).createImageMark({ viewport: { x: 5, y: 7, width: 80, height: 80 } });
  const resized = p.editCanvas({ width: 300, margin: { left: 30 } });
  assert.deepEqual([properties(resized).x, properties(resized).y, properties(resized).width, properties(resized).height], [35, 47, 80, 40]);
  assert.deepEqual(resized.graphicSpec.objects.image.clip, { x: 35, y: 27, width: 80, height: 80 });
  assert.equal(p.editImageMark({ viewport: "auto" }).markConfigs.image.viewport, "auto");
  for (const options of [{ viewport: null }, { viewport: { x: 0, y: 0, width: 0, height: 1 } }, { fit: "crop" }, { align: [2, 0] }, { opacity: -1 }, { alt: null }, {}]) {
    assert.throws(() => p.editImageMark(options));
  }
});

test("retains both viewport and explicit clip, reports clipped bounds and removes the owned wrapper", async () => {
  const p = (await create()).createImageMark({ fit: "cover", clip: { x: 20, y: 10, width: 40, height: 30 }, alt: "Red logo" });
  assert.deepEqual(getMarkItems(p)[0].bounds, { left: 30, top: 30, right: 70, bottom: 60 });
  assert.equal(exportAccessibleData(p).views[0].rows[0].values["image:alt"], "Red logo");
  assert.ok(renderToSVG(p).match(/clip-path/g).length >= 2);
  const next = p.removeMark();
  assert.equal(next.graphicSpec.objects.image, undefined); assert.equal(next.graphicSpec.objects["image-image-clip"], undefined);
  assert.equal(next.semanticSpec.resources[0].kind, "image");
});

test("selection, opacity highlight, editing and offline restore keep one stable image identity", async () => {
  const p = (await create()).createImageMark({ alt: "Logo" }).selectMarks({ property: "opacity", op: "eq", value: 1 }).highlightMarks({ opacity: 0.25 });
  assert.equal(properties(p).opacity, 0.25);
  const edited = p.editImageMark({ fit: "fill" });
  assert.equal(properties(edited).opacity, 0.25); assert.deepEqual(getMarkItems(edited)[0].rows, []);
  assert.equal(properties(edited.removeMarkHighlight()).opacity, 1);
  const restored = deserializeProgram(serializeProgram(edited));
  assert.equal(renderToSVG(restored), renderToSVG(edited));
  assert.equal(getMarkItems(restored)[0].key, getMarkItems(p)[0].key);
  assert.throws(() => p.encodeX({ field: "fake" }));
  assert.throws(() => p.highlightMarks({ color: "blue" }), /does not support/);
});

test("inference rejects multiple images and marks while explicit targets and concat children remain editable", async () => {
  const base = await create(await create(), "other");
  assert.throws(() => base.createImageMark(), /ambiguous/);
  const left = base.createImageMark({ image: "logo" }).createImageMark({ id: "another", image: "other" });
  assert.throws(() => left.editImageMark({ opacity: 0.5 }), /ambiguous/);
  const right = (await create()).createImageMark();
  const composed = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }] });
  const changed = composed.editImageMark({ target: { childPath: ["left"], id: "another" }, opacity: 0.5 });
  assert.equal(changed.children.left.markConfigs.another.opacity, 0.5);
  assert.equal(changed.children.right.markConfigs.image.opacity, 1);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(changed))), renderToSVG(changed));
});

test("replacement updates all exact bindings once and preserves selection and immutable branches", async () => {
  const p = (await create()).createImageMark({ alt: "Logo" }).createImageMark({ id: "other", viewport: { x: 0, y: 0, width: 30, height: 30 } })
    .selectMarks({ target: "image", property: "opacity", op: "eq", value: 1 }).highlightMarks({ opacity: 0.4 });
  const replacement = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"><rect width="10" height="20" fill="blue"/></svg>');
  const prepared = await prepareImageResource(p, { kind: "replace", target: "logo", ...asset,
    expectedHash: createHash("sha256").update(replacement).digest("hex") }, { ...host,
    load: () => ({ bytes: replacement, mimeType: asset.mimeType }), decode: () => ({ width: 10, height: 20, originClean: true }) });
  const next = p.replaceImageResource({ prepared, requestToken: "current" });
  assert.equal(next.semanticSpec.resources[0].revision, 1);
  for (const layer of next.semanticSpec.layers) assert.equal(layer.image.revision, 1);
  assert.equal(next.graphicSpec.objects.image.items[0].identity.key, p.graphicSpec.objects.image.items[0].identity.key);
  assert.equal(properties(next).opacity, 0.4);
  assert.deepEqual([properties(next).x, properties(next).y, properties(next).width, properties(next).height], [70, 20, 60, 120]);
  assert.equal(p.semanticSpec.resources[0].revision, 0);
  assert.equal(properties(p).image.width, 20);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(next))), renderToSVG(next));
});

test("facets and repeated fields retain independent image overlays and native data anchors", async () => {
  const source = (await create()).createData({ id: "rows", values: [{ g: "a", x: 1, y: 2 }, { g: "b", x: 3, y: 4 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: { axes: false } }).createImageMark({ viewport: { x: 5, y: 5, width: 20, height: 20 } });
  for (const p of [source.facet({ field: "g" }), source.repeatCharts({ target: "points", channel: "y", fields: ["x", "y"] })]) {
    assert.equal(Object.keys(p.children).length, 2);
    for (const child of Object.values(p.children)) {
      assert.equal(child.semanticSpec.layers.find(layer => layer.id === "image").data, undefined);
      assert.equal(child.graphicSpec.objects.image.items.length, 1);
      assert.equal(child.graphicSpec.objects.image.items[0].properties.image.contentHash, asset.expectedHash);
    }
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
    for (const child of Object.values(p.children)) assert.equal(child.editCanvas({ width: 500 }).graphicSpec.objects.image.items.length, 1);
  }
  assert.throws(() => (source.removeMark({ target: "points" })).facet({ field: "g" }), /primary/);
});

test("typed resource deletion restricts live images and cascades only their mark owners", async () => {
  const p = (await create(await create(), "other")).createImageMark({ image: "logo" }).createImageMark({ id: "second", image: "logo" })
    .selectMarks({ target: "image", property: "opacity", op: "eq", value: 1 }).highlightMarks({ opacity: 0.3 });
  assert.throws(() => p.removeResource({ kind: "image", id: "logo" }), /referenc/);
  assert.throws(() => p.removeResource({ kind: "image", id: "logo", cascade: "yes" }), /boolean/);
  const next = p.removeResource({ kind: "image", id: "logo", cascade: true });
  assert.equal(next.semanticSpec.layers.length, 0);
  assert.deepEqual(next.semanticSpec.resources.filter(value => value.kind === "image").map(value => value.id), ["other"]);
  for (const id of ["image", "second", "image-image-clip", "second-image-clip"]) assert.equal(next.graphicSpec.objects[id], undefined);
  assert.equal(Object.keys(next.markConfigs).length, 0);
  assert.equal(p.semanticSpec.layers.length, 2);
  assert.equal(next.removeResource({ kind: "image", id: "other" }).semanticSpec.resources.filter(value => value.kind === "image").length, 0);
  assert.equal(Object.keys(next.materializationConfigs.selections ?? {}).length, 0);
  assert.equal(Object.keys(next.materializationConfigs.highlights ?? {}).length, 0);
  assert.equal(next.semanticSpec.resources.filter(value => value.kind === "persistent-selection").length, 1);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(next))), renderToSVG(next));
});


for (const blend of ["multiply", "screen"]) test(`image overlays remain independent of conditional ${blend} replay`, async () => {
  const rows = [{category: "a", group: "east", value: 1}, {category: "b", group: "west", value: 2}];
  const original = (await create()).createParameter({id: "warm", value: true})
    .createData({id: "rows", values: rows})
    .createBarPlot({id: "bars", x: "category", y: {field: "value", aggregate: "sum"}, guides: false})
    .editBarMark({target: "bars", blend, stroke: false})
    .encodeColor({target: "bars", conditions: [{when: {version: 2, registry: "standard@1", root: {type: "parameter", id: "warm"}}, value: {value: "red"}}], otherwise: {value: "blue"}})
    .selectMarks({id: "chosen", target: "bars", field: "category", op: "eq", value: "a"})
    .encodeOpacity({target: "bars", conditions: [{when: {selection: "chosen"}, value: {value: 0.5}}], otherwise: {value: 1}})
    .createImageMark({viewport: {x: 5, y: 5, width: 20, height: 20}, alt: "Logo"});
  const before = serializeProgram(original), imageProperties = properties(original);
  const parameter = original.editParameter({target: "warm", value: false});
  const selected = parameter.editMarkSelection({selection: "chosen", field: "category", op: "eq", value: "b"});
  const revised = selected.reviseData({source: "rows", id: "next", values: [...rows].reverse(), rowMap: [1, 0]});
  for (const program of [parameter, selected, revised, revised.editBarMark({target: "bars", blend: "normal"})]) {
    assert.deepEqual(properties(program), imageProperties);
    assert.deepEqual(program.graphicSpec.objects.bars.items.map(item => item.properties.fill), ["blue", "blue"]);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(program))), renderToSVG(program));
  }
  const faceted = original.facet({field: "group"}).editParameter({target: "warm", value: false});
  for (const child of Object.values(faceted.children)) {
    assert.equal(properties(child).image.contentHash, asset.expectedHash);
    assert.ok(child.graphicSpec.objects.bars.items.every(item => item.properties.fill === "blue" && item.properties.blend === blend));
  }
  assert.equal(serializeProgram(original), before);
  assert.throws(() => original.encodeX({target: "image", field: "value"}), /image|support|encoding/i);
});


test("inspection reports unbound image changes and follows explicit resource consumers", async () => {
  const base = await create();
  const prepared = await prepareImageResource(base, {kind: "replace", target: "logo", ...asset}, host);
  const next = base.replaceImageResource({prepared, requestToken: "current"});
  const comparison = comparePrograms(base, next);
  assert.equal(comparison.equivalence, "different");
  assert.deepEqual(comparison.affected, [{kind: "image", id: "logo"}]);
  assert.equal(comparison.changes[0].effect, "structure");
  const marked = base.createImageMark({alt: "Logo"});
  const replacement = await prepareImageResource(marked, {kind: "replace", target: "logo", ...asset}, host);
  const replaced = marked.replaceImageResource({prepared: replacement, requestToken: "current"});
  assert.deepEqual(comparePrograms(marked, replaced, {target: {kind: "image", id: "logo"}}).affected,
    [{kind: "image", id: "logo"}, {kind: "mark", id: "image"}]);
  const inspection = inspectProgram(replaced, {target: {kind: "image", id: "logo"}});
  assert.equal(inspection.views.length, 1);
  assert.deepEqual(inspection.views[0].sourceRefs, [{kind: "image", id: "logo"}]);
  assert.equal(inspection.views[0].logicalDataItems, 1);
  assert.doesNotThrow(() => describeAction(replaced, {action: "editImageMark", target: {kind: "mark", id: "image"}, options: {opacity: 0.4}}));
});


test("image selection rejects a removed concrete owner and keeps default opacity explicit", async () => {
  const p = (await create()).createImageMark().selectMarks({property: "opacity", op: "eq", value: 1});
  assert.equal(properties(p.highlightMarks({})).opacity, 1);
  assert.throws(() => p.highlightMarks({opacity: 2}), /opacity|between|interval/);
  assert.throws(() => getMarkItems(p.editGraphics({target: "image", remove: true})), /materialized image item/);
});
