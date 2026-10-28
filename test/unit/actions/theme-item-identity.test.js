import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { createTransitionScene } from "../../../src/scene.js";

const rows = [
  { id: "a", x: 1, y: 2, group: "one" },
  { id: "b", x: 2, y: 5, group: "one" },
  { id: "c", x: 3, y: 3, group: "one" },
  { id: "d", x: 1, y: 4, group: "two" },
  { id: "e", x: 2, y: 7, group: "two" },
  { id: "f", x: 3, y: 6, group: "two" }
];
const base = () => chart().createCanvas({ width: 400, height: 300, margin: 50 })
  .createData({ id: "data", values: rows, keyField: "id" });
const identities = object => object.items.map(({ id, identity }) => ({ id, identity }));
const paint = object => object.items.map(item => [item.properties.fill, item.properties.stroke]);

for (const [name, build, ids, clip] of [
  ["Area", () => base().createAreaPlot({ id: "area", x: "x", y: "y", groupBy: ["group"], guides: false }),
    ["area"], { x: 0, y: 0, width: 200, height: 180 }],
  ["BoxPlot rules", () => base().createBoxPlot({ x: { field: "group", fieldType: "nominal" }, y: { field: "y" }, guides: false }),
    ["boxPlotWhisker", "boxPlotWhiskerLowerCap", "boxPlotWhiskerUpperCap", "boxPlotMedian"],
    { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 200, y: 0 }, { op: "L", x: 200, y: 180 }, { op: "Z" }] }]
]) {
  test(`${name} theme replacement preserves collection identity and owner clipping`, () => {
    let before = build();
    for (const id of ids) before = before.editGraphics({ target: id, property: "clip", value: clip });
    const saved = serializeProgram(before);
    const expected = new Map(ids.map(id => [id, identities(before.graphicSpec.objects[id])]));
    assert.ok([...expected.values()].flat().every(item => item.identity !== undefined));
    const dark = before.applyTheme({ theme: "dark" });
    assert.notDeepEqual(paint(dark.graphicSpec.objects[ids[0]]), paint(before.graphicSpec.objects[ids[0]]));
    const light = dark.applyTheme({ theme: "light" });
    for (const current of [dark, light, light.removeTheme(), deserializeProgram(serializeProgram(dark))]) {
      for (const id of ids) {
        const object = current.graphicSpec.objects[id];
        assert.deepEqual(identities(object), expected.get(id));
        assert.deepEqual(object.clip, clip);
        assert.deepEqual(getMarkItems(current, { target: id }).map(item => item.key),
          getMarkItems(before, { target: id }).map(item => item.key));
      }
      for (const format of ["canvas", "svg"]) {
        const original = createTransitionScene(before, { format });
        const revised = createTransitionScene(current, { format });
        const state = scene => scene.nodes.map(({ key, topology, clip: frame, clips }) => ({ key, topology, frame, clips }));
        assert.deepEqual(state(revised), state(original));
      }
    }
    assert.equal(serializeProgram(before), saved);
  });
}

test("themed Area identities remain selectable after offline restoration", () => {
  const before = base().createAreaPlot({ id: "area", x: "x", y: "y", groupBy: ["group"], guides: false });
  const key = getMarkItems(before, { target: "area" })[0].key;
  const restored = deserializeProgram(serializeProgram(before.applyTheme({ theme: "dark" })));
  const selected = restored.highlightMarks({ id: "picked", target: "area", select: { rows: { data: "data", indices: [0] } }, opacity: 0.6 });
  for (const current of [selected, selected.applyTheme({ theme: "light" }), selected.removeTheme()]) {
    assert.equal(getMarkItems(current, { target: "area" }).find(item => item.key === key).properties.opacity, 0.6);
    // Highlighting may move the selected series to the front without changing its identity.
    const sorted = object => identities(object).sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(sorted(current.graphicSpec.objects.area), sorted(before.graphicSpec.objects.area));
  }
});
