import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, render } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { resolveGraphicItemCapacity } from "../../../../src/selectors/graphicCapacity.js";
import { validateGraphicItemLimit, MAX_GENERATED_ITEMS, MAX_WORK_ITEMS } from "../../../../src/core/validation.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { prepareProgramHitFrame } from "../../../../src/interaction/hitProgram.js";
import { planTransition } from "../../../../src/animation.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { inflateSync } from "node:zlib";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rows = count => Array.from({ length: count }, (_, x) => ({ x, y: x % 101, group: x % 2 }));
function point(count, factory = chart, maxItems = 100000) {
  return factory().createData({ id: "raw", values: rows(count) }).createPointMark({ maxItems });
}
function scatter(count, factory = chart) {
  return factory().createCanvas({ width: 400, height: 300, margin: 20 })
    .createData({ id: "raw", values: rows(count) })
    .createScatterPlot({ x: "x", y: "y", point: { maxItems: 100000 }, guides: false });
}
function corrupt(snapshot, mutate) {
  const document = JSON.parse(snapshot), state = decodeValue(document.payload);
  mutate(state); document.payload = encodeValue(state);
  return JSON.stringify(document);
}

test("explicit point capacity admits every raw and concrete item through 100000 in Full and Basic", () => {
  for (const factory of [chart, basicChart]) {
    for (const count of [50001, 99999, 100000]) {
      const program = point(count, factory);
      assert.equal(program.markConfigs.point.maxItems, 100000);
      assert.equal(program.graphicSpec.objects.point.items.length, count);
      assert.equal(program.semanticSpec.datasets[0].values.length, count);
      for (let index = 0; index < count; index++) {
        assert.equal(program.semanticSpec.datasets[0].values[index].x, index);
        assert.equal(program.graphicSpec.objects.point.items[index].id, `point:${index}`);
      }
    }
    assert.throws(() => point(100001, factory), /100000/);
    assert.throws(() => factory().createData({ values: rows(50001) }).createPointMark(), /50000/);
  }
});

test("point capacity is bounded and immutable, editable, preserved, and explicitly removable", () => {
  const input = rows(3), base = chart().createData({ values: input });
  for (const maxItems of [0, -1, 1.5, NaN, Infinity, 100001, "100000", null, false]) {
    assert.throws(() => base.createPointMark({ maxItems }), /maxItems/);
  }
  const initial = base.createPointMark({ maxItems: 3 });
  assert.equal(initial.editPointMark({ fill: "red" }).markConfigs.point.maxItems, 3);
  const raised = initial.editPointMark({ maxItems: 100000 });
  const removed = raised.editPointMark({ maxItems: undefined });
  assert.equal(Object.hasOwn(removed.markConfigs.point, "maxItems"), false);
  assert.equal(raised.markConfigs.point.maxItems, 100000);
  assert.throws(() => initial.editPointMark({ maxItems: 2 }), /must not exceed 2/);
  assert.deepEqual(input, rows(3));
  assert.equal(base.semanticSpec.layers.length, 0);
  assert.equal(initial.graphicSpec.objects.point.items.length, 3);
  const large = point(50001), trace = large.trace;
  assert.throws(() => large.editPointMark({ maxItems: undefined }), /50000/);
  assert.throws(() => large.editPointMark({ maxItems: 50000 }), /50000/);
  assert.equal(large.trace, trace);
  assert.equal(large.markConfigs.point.maxItems, 100000);
});

test("point style facades forward the native capacity without widening sibling mark families", () => {
  for (const factory of [chart, basicChart]) {
    const base = factory().createCanvas().createData({ values: [
      { x: 0, y: 1, category: "a", start: 1, end: 2 }, { x: 1, y: 2, category: "b", start: 2, end: 3 }
    ] });
    const style = { maxItems: 2 };
    for (const program of [
      base.createScatterPlot({ x: "x", y: "y", point: style, guides: false }),
      ...(factory === basicChart ? [] : [base.createPolarScatterPlot({ theta: "x", radius: "y", point: style, guides: false }),
      base.createStripPlot({ x: "x", point: style, guides: false }),
      base.createBeeswarmPlot({ x: "category", y: "y", packing: false, point: style, guides: false }),
      base.createDotPlot({ category: "category", value: "y", summary: false, point: style, guides: false }),
      base.createLollipopPlot({ category: "category", value: "y", point: style, guides: false }),
      base.createDumbbellPlot({ category: "category", start: "start", end: "end", startPoint: style, endPoint: style, guides: false }),
      base.createIntervalPlot({ x: "category", y: { center: "y", lower: "start", upper: "end" }, point: style, guides: false })])
    ]) assert.ok(Object.values(program.markConfigs).some(config => config.maxItems === 2));
  }
  assert.equal(MAX_GENERATED_ITEMS, 10000); assert.equal(MAX_WORK_ITEMS, 10000000);
  assert.throws(() => chart().createGraphics({ id: "raw", type: "circle", length: 10001 }), /10000/);
  assert.throws(() => chart().createPointMark({ maxItems: 100000 }), /dataset|data/i);
  const p = point(1);
  assert.throws(() => p.createGraphics({ id: "unowned", type: "circle", length: 10001 }), /10000/);
  assert.throws(() => validateGraphicItemLimit(10001, { pointOwned: true, graphicType: "text", maxItems: 100000 }), /10000/);
  assert.throws(() => p._withMarkConfig("point", { maxItems: 100001 }).editGraphics({ target: "point", property: "length", value: 2 }), /maxItems/);
});

test("raw missing rows, source revisions, and rebind preserve the exact point limit", () => {
  const p = point(2).editPointMark({ missing: "skip" });
  const revised = p.reviseData({ source: "raw", id: "revised", values: rows(100000) });
  assert.equal(revised.graphicSpec.objects.point.items.length, 100000);
  assert.equal(revised.markConfigs.point.maxItems, 100000);
  assert.throws(() => p.reviseData({ source: "raw", id: "overflow", values: rows(100001).map(row => ({ ...row, y: null })) }), /100000/);
  const rebound = p.createData({ id: "new", values: rows(100000) }).bindMarkData({ target: "point", data: "new" });
  assert.equal(rebound.graphicSpec.objects.point.items.length, 100000);
  assert.equal(p.graphicSpec.objects.point.items.length, 2);
});

test("large homogeneous, mixed, and property-array edits obey raw and output capacities independently", () => {
  const p = point(50001);
  for (const shape of ["square", "star"]) {
    const edited = p.editPointMark({ shape });
    assert.equal(edited.graphicSpec.objects.point.items.length, 50001);
    assert.equal(edited.markConfigs.point.maxItems, 100000);
  }
  const mixed = p.encodeShape({ field: "group", fieldType: "nominal", scale: { range: ["circle", "square"] } });
  assert.equal(mixed.graphicSpec.objects.point.type, "collection");
  assert.equal(mixed.editGraphics({ target: "point", property: "opacity", value: Array(50001).fill(.5) })
    .graphicSpec.objects.point.items.at(-1).properties.opacity, .5);
  const enlarged = point(2).editGraphics({ target: "point", property: "length", value: 100000 });
  assert.throws(() => enlarged.editPointMark({ maxItems: 99999 }), /99999/);
  assert.throws(() => enlarged.editGraphics({ target: "point", property: "length", value: 100001 }), /100000/);
  const base = point(1), snapshot = serializeProgram(base);
  const forged = corrupt(snapshot, state => {
    const data = state.semanticSpec.datasets[0];
    data.values = rows(100001);
    data.rowKeys = data.values.map((_, index) => JSON.stringify(["generated", data.allocationId, index]));
    data.nextGeneratedKey = 100001;
  });
  assert.throws(() => deserializeProgram(forged), /100000/);
});

test("editable codec validates the point capacity owner and both stored counts", () => {
  const p = point(50001), snapshot = serializeProgram(p);
  const restored = deserializeProgram(snapshot);
  assert.equal(restored.markConfigs.point.maxItems, 100000);
  assert.equal(restored.graphicSpec.objects.point.items.length, 50001);
  for (const mutate of [
    state => { delete state.materializationConfigs.marks.point.maxItems; },
    state => { state.materializationConfigs.marks.point.maxItems = 50000; },
    state => { state.materializationConfigs.marks.point.maxItems = 100001; },
    state => { state.materializationConfigs.marks.point.maxItems = undefined; },
    state => { state.semanticSpec.layers[0].mark.type = "rect"; },
    state => { state.graphicSpec.objects.point.type = "text"; }
  ]) assert.throws(() => deserializeProgram(corrupt(snapshot, mutate)));
  const capacity = resolveGraphicItemCapacity(p, { id: "point" });
  assert.equal(capacity.rawCount, 50001); assert.equal(capacity.maxItems, 100000);
  assert.throws(() => validateGraphicItemLimit(100001, capacity), /100000/);
});

test("facet and nested retained owners preserve individual limits above the combined 100000 total", () => {
  const p = scatter(100000);
  const faceted = p.facet({ field: "group", guides: { legend: false } });
  for (const child of Object.values(faceted.children)) {
    assert.equal(child.graphicSpec.objects.scatterPlot.items.length, 50000);
    assert.equal(child.markConfigs.scatterPlot.maxItems, 100000);
  }
  const second = point(2).createCanvas({ width: 100, height: 100, margin: 10 });
  const nested = hconcat({ programs: [{ id: "panels", program: faceted }, { id: "small", program: second }] });
  let total = 0;
  for (const [id, graphic] of Object.entries(nested.graphicSpec.objects)) {
    const capacity = resolveGraphicItemCapacity(nested, { id });
    if (!capacity.pointOwned) continue;
    assert.equal(capacity.maxItems, 100000);
    validateGraphicItemLimit(graphic.items.length, capacity);
    total += graphic.items.length;
  }
  assert.equal(total, 100002);
  assert.equal(deserializeProgram(serializeProgram(nested)).compositionSpec.children.length, 2);
});

test("all 100000 native point positions and four renderer outputs remain intact while hit and animation limits stay independent", async () => {
  const program = scatter(100000), items = program.graphicSpec.objects.scatterPlot.items;
  for (let index = 0; index < items.length; index++) {
    assert.ok(Math.abs(items[index].properties.x - (20 + 360 * index / 99999)) < 1e-9);
    assert.ok(Math.abs(items[index].properties.y - (280 - 260 * (index % 101) / 100)) < 1e-9);
  }
  const canvas = createCanvas(400, 300), context = canvas.getContext("2d");
  let count = 0;
  const recorded = new Proxy(context, { get(target, key) {
    if (key === "arc") return (...args) => { count++; return target.arc(...args); };
    const value = target[key]; return typeof value === "function" ? value.bind(target) : value;
  }, set(target, key, value) { target[key] = value; return true; } });
  render(program, recorded); assert.equal(count, 100000);
  const svg = renderToSVG(program); assert.equal((svg.match(/<circle\b/g) ?? []).length, 100000);
  const png = await renderToPNGBuffer(program), pdf = await renderToPDFBuffer(program);
  const streams = [...pdf.buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .flatMap(match => { try { return [inflateSync(Buffer.from(match[1], "latin1")).toString()]; } catch { return []; } }).join("\n");
  assert.equal((streams.match(/^f$/gm) ?? []).length, 100001); // background and every circle
  const directory = await mkdtemp(path.join(tmpdir(), "point-capacity-"));
  try {
    const stem = path.join(directory, "points"); await writeFile(`${stem}.pdf`, pdf.buffer);
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
    for (const input of [png.buffer, Buffer.from(svg), `${stem}.png`]) {
      const image = await loadImage(input), actual = createCanvas(400, 300).getContext("2d"); actual.drawImage(image, 0, 0);
      for (const [x, y] of [[22, 150], [200, 150], [378, 150]]) {
        const pixel = actual.getImageData(x, y, 1, 1).data;
        assert.ok(pixel[2] > pixel[0] && pixel[0] < 150, `${String(input).slice(0, 8)} has point ink at ${x},${y}`);
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
  assert.throws(() => prepareProgramHitFrame(program), /item budget/);
  const tenK = scatter(10000);
  assert.throws(() => planTransition({ from: tenK, to: tenK, options: { durationMs: 1000 } }), /10000/);
});
