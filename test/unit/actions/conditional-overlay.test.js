import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const rows = [{ x: 1, category: "A", a: 2, b: 5, selected: true }, { x: 2, category: "B", a: 3, b: 7, selected: false }];
const start = values => chart().createCanvas({ width: 300, height: 200, margin: 20 }).createData({ id: "data", values });
const conditional = aggregate => ({ conditions: [{ when: expression({ type: "field", name: "selected" }), value: { field: "a", ...(aggregate ? { aggregate } : {}), scale: { id: "measure", domain: [0, 10] } } }], otherwise: { field: "b", ...(aggregate ? { aggregate } : {}), scale: { id: "measure", domain: [0, 10] } } });
const anchor = program => program.graphicSpec.objects.overlay.items.map(item => [item.properties.x, item.properties.y]);
const overlay = program => program.createOverlay({ id: "overlay", source: "source", type: "point" });

for (const kind of ["point", "bar", "line", "area"]) {
  test(`conditional ${kind} positions feed their chosen geometry to source overlays`, () => {
    const create = values => {
      let program = start(values)[`create${kind[0].toUpperCase()}${kind.slice(1)}Mark`]({ id: "source" })
        .encodeX(kind === "bar" ? { field: "category", fieldType: "nominal" } : { field: "x" });
      if (kind === "area") program = program.encodeY({ field: "b", scale: { id: "measure", domain: [0, 10] } }).encodeY2({ datum: 0 });
      return program;
    };
    const source = create(rows).encodeY(conditional(kind === "bar" ? "sum" : undefined));
    const actual = overlay(source);
    const native = overlay(create(rows.map(row => ({ ...row, chosen: row.selected ? row.a : row.b }))).encodeY({ field: "chosen", ...(kind === "bar" ? { aggregate: "sum" } : {}), scale: { id: "measure", domain: [0, 10] } }));
    assert.deepEqual(anchor(actual), anchor(native));
    assert.equal(anchor(actual).length, 2);
    assert.deepEqual(deserializeProgram(serializeProgram(actual)).editCanvas({ width: 420 }).graphicSpec.objects.overlay.items.map(item => [item.properties.x, item.properties.y]),
      native.editCanvas({ width: 420 }).graphicSpec.objects.overlay.items.map(item => [item.properties.x, item.properties.y]));
    assert.doesNotThrow(() => actual.editOverlay({ target: "overlay", follow: false }));
  });
}

test("conditional bar selections are resolved when overlay scales inspect source items", () => {
  const source = start(rows).createBarMark({ id: "source" }).encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", domain: [0, 10] } })
    .selectMarks({ id: "chosen", target: "source", field: "category", op: "eq", value: "A" })
    .encodeY({ ...conditional("sum"), conditions: [{ when: { selection: "chosen" }, value: conditional("sum").conditions[0].value }] });
  const program = overlay(source).encodeColor({ target: "overlay", field: "category" });
  assert.equal(program.graphicSpec.objects.overlay.items.length, 2);
  assert.equal(program.resolvedScales.color.domain.length, 2);
});
