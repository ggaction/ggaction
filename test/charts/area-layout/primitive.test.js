import assert from "node:assert/strict";
import test from "node:test";
import { render } from "../../../src/renderers/canvas/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { visualVariants } from "./manifest.js";
import { areaReference, barReference, targetDefinitions } from "./reference-values.js";

for (const variant of visualVariants) {
  test(`${variant.variant} stores concrete geometry without renderer inference or input mutation`, () => {
    const target = targetDefinitions.find(t => t.id === variant.variant);
    const before = JSON.stringify(target);
    const program = variant.primitive();
    assert.equal(JSON.stringify(target), before);
    assert.ok(Object.isFrozen(target.publicCalls[1].args.values));
    assert.deepEqual(program.semanticSpec.datasets, [{ id: "data", values: target.publicCalls[1].args.values }]);
    const layer = program.semanticSpec.layers[0];
    const items = program.graphicSpec.objects.m.items;
    assert.equal(layer.encoding.color?.layout, undefined);
    assert.equal(layer.encoding.y.stack, undefined);
    assert.equal(program.semanticSpec.scales.find(s => s.id === "y").domain, "auto");
    if (variant.variant.startsWith("bar-")) {
      const reference = barReference(variant.variant);
      assert.equal(layer.layout.mode, reference.mode);
      assert.equal(layer.encoding.group.field, "series");
      assert.equal(layer.encoding.color, undefined);
      assert.equal(program.semanticSpec.guides.legend, undefined);
      assert.deepEqual(program.resolvedScales.y.domain, reference.domain);
      assert.deepEqual(items.map(i => i.properties), reference.items);
      assert.equal(Boolean(layer.encoding.xOffset), reference.mode === "group");
    } else {
      const reference = areaReference(variant.variant);
      assert.equal(layer.layout.mode, reference.mode);
      assert.equal(layer.mark.missing, reference.options.missing ?? "error");
      assert.deepEqual(program.resolvedScales.x.domain, reference.xDomain);
      assert.deepEqual(program.resolvedScales.y.domain, reference.yDomain);
      const endpoint = layer.encoding[reference.horizontal ? "x2" : "y2"];
      if (typeof reference.secondary === "string") {
        assert.equal(endpoint.field, reference.secondary); assert.equal(endpoint.datum, undefined);
      } else { assert.equal(endpoint.datum, reference.secondary.datum); assert.equal(endpoint.field, undefined); }
      assert.equal(items.length, reference.segments.length);
      items.forEach((item, index) => {
        assert.deepEqual(item.properties.commands, reference.segments[index].commands);
        assert.equal(item.properties.fill, reference.segments[index].fill);
        assert.equal(item.properties.opacity, 0.2);
        assert.equal(item.properties.commands[0].op, "M");
        assert.deepEqual(item.properties.commands.at(-1), { op: "Z" });
        for (const point of item.properties.commands.slice(0, -1)) {
          assert.ok(Number.isFinite(point.x) && point.x >= 150 && point.x <= 850);
          assert.ok(Number.isFinite(point.y) && point.y >= 150 && point.y <= 550);
        }
      });
      if (reference.options.groupBy) {
        assert.equal(layer.encoding.group.field, "series");
        assert.equal(layer.encoding.color.field, "region");
        assert.deepEqual(program.resolvedScales.color.domain, ["north", "south"]);
      }
    }
    const first = createMockCanvasContext(), second = createMockCanvasContext();
    const snapshot = JSON.stringify(program);
    render(program, first);
    render({ graphicSpec: program.graphicSpec }, second);
    assert.deepEqual(first.calls, second.calls);
    assert.equal(JSON.stringify(program), snapshot);
    assert.equal(JSON.stringify(target), before);
  });
}

test("missing sample remains in source while no polygon bridges its gap", () => {
  const program = visualVariants.find(v => v.variant === "area-missing-break").primitive();
  assert.equal(program.semanticSpec.datasets[0].values[2].value, null);
  const paths = program.graphicSpec.objects.m.items.map(i => i.properties.commands.slice(0, -1));
  assert.equal(paths.length, 2);
  assert.deepEqual(paths.map(path => [...new Set(path.map(p => p.x))]), [[150, 325], [675, 850]]);
});

test("primitive chains keep high-level action implementations out of the baseline", () => {
  for (const variant of visualVariants) {
    assert.equal(typeof variant.userFacing, "function");
    const program = variant.primitive();
    assert.equal(program.encodeLayout, undefined);
    assert.ok(program.trace.children.every(call => !["layoutSeries", "createAreaPlot"].includes(call.op)));
  }
});
