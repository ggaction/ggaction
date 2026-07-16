import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

test("edits a single graphic without mutating an earlier program", () => {
  const canvas = chart().createGraphics({ id: "canvas", type: "canvas" });
  const resized = canvas.editGraphics({
    target: "canvas",
    property: "width",
    value: 640
  });

  assert.deepEqual(canvas.graphicSpec.objects.canvas.properties, {});
  assert.deepEqual(resized.graphicSpec.objects.canvas.properties, { width: 640 });
  assert.equal(resized.graphicSpec.order, canvas.graphicSpec.order);
  assert.equal(resized.trace.children.at(-1).op, "editGraphics");
});

test("removes one top-level graphic and its render-order entry", () => {
  const program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .createGraphics({ id: "legend", type: "rect" });
  const removed = program.editGraphics({ target: "legend", remove: true });

  assert.equal(program.graphicSpec.objects.legend.type, "rect");
  assert.deepEqual(removed.graphicSpec, {
    objects: { canvas: program.graphicSpec.objects.canvas },
    order: ["canvas"]
  });
  assert.deepEqual(removed.trace.children.at(-1).args, {
    target: "legend",
    remove: true
  });
});

test("validates whole-graphic removal mode", () => {
  const program = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });

  assert.throws(
    () => program.editGraphics({
      target: "points",
      property: "x",
      remove: true
    }),
    /cannot include property or value/
  );
  assert.throws(
    () => program.editGraphics({ target: "points", remove: "yes" }),
    /remove must be a boolean/
  );
  assert.throws(
    () => program.editGraphics({ target: "points:0", remove: true }),
    /cannot remove a generated child/
  );
  assert.throws(
    () => program.editGraphics({ target: "missing", remove: true }),
    /Unknown graphic target/
  );
});

test("distributes arrays and broadcasts scalar values to collection children", () => {
  const points = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });
  const positioned = points.editGraphics({
    target: "points",
    property: "x",
    value: [32.5, 81.4]
  });
  const sized = positioned.editGraphics({
    target: "points",
    property: "radius",
    value: 3
  });

  assert.deepEqual(
    sized.graphicSpec.objects.points.children.map(child => child.properties),
    [
      { x: 32.5, radius: 3 },
      { x: 81.4, radius: 3 }
    ]
  );
  assert.deepEqual(points.graphicSpec.objects.points.children[0].properties, {});
});

test("stores nested path commands intact and can target one child", () => {
  const paths = [
    [{ op: "M", x: 0, y: 1 }, { op: "L", x: 2, y: 3 }],
    [{ op: "M", x: 4, y: 5 }, { op: "L", x: 6, y: 7 }]
  ];
  const program = chart()
    .createGraphics({ id: "paths", type: "path", length: 2 })
    .editGraphics({ target: "paths", property: "commands", value: paths })
    .editGraphics({ target: "paths:1", property: "opacity", value: 0.4 });

  paths[0][0].x = 99;

  assert.deepEqual(
    program.graphicSpec.objects.paths.children[0].properties.commands,
    [{ op: "M", x: 0, y: 1 }, { op: "L", x: 2, y: 3 }]
  );
  assert.equal(
    program.graphicSpec.objects.paths.children[1].properties.opacity,
    0.4
  );
  assert.equal(
    "opacity" in program.graphicSpec.objects.paths.children[0].properties,
    false
  );
});

test("replaces heterogeneous children and broadcasts shared properties", () => {
  const children = [
    {
      type: "circle",
      properties: { x: 20, y: 30, radius: 4, fill: "red" }
    },
    {
      type: "rect",
      properties: {
        x: 36,
        y: 46,
        width: 8,
        height: 8,
        fill: "blue",
        stroke: "blue",
        strokeWidth: 0
      }
    }
  ];
  const empty = chart().createGraphics({ id: "symbols", type: "collection" });
  const populated = empty.editGraphics({
    target: "symbols",
    property: "children",
    value: children
  });
  const faded = populated.editGraphics({
    target: "symbols",
    property: "opacity",
    value: 0.4
  });
  const resized = faded.editGraphics({
    target: "symbols:0",
    property: "radius",
    value: 6
  });

  children[0].properties.fill = "black";

  assert.deepEqual(empty.graphicSpec.objects.symbols.children, []);
  assert.deepEqual(
    resized.graphicSpec.objects.symbols.children,
    [
      {
        id: "symbols:0",
        type: "circle",
        properties: {
          x: 20,
          y: 30,
          radius: 6,
          fill: "red",
          opacity: 0.4
        }
      },
      {
        id: "symbols:1",
        type: "rect",
        properties: {
          x: 36,
          y: 46,
          width: 8,
          height: 8,
          fill: "blue",
          stroke: "blue",
          strokeWidth: 0,
          opacity: 0.4
        }
      }
    ]
  );
  assert.equal(populated.graphicSpec.objects.symbols.children[0].properties.radius, 4);
});

test("keeps a homogeneous collection type when replacing ordered children", () => {
  const base = chart().createGraphics({ id: "bars", type: "rect", length: 2 });
  const replaced = base.editGraphics({
    target: "bars",
    property: "children",
    value: [
      {
        type: "rect",
        properties: {
          x: 0, y: 0, width: 4, height: 8,
          fill: "red", stroke: "white", strokeWidth: 0
        }
      },
      {
        type: "rect",
        properties: {
          x: 5, y: 0, width: 4, height: 6,
          fill: "blue", stroke: "white", strokeWidth: 0
        }
      }
    ]
  });

  assert.equal(replaced.graphicSpec.objects.bars.type, "rect");
  assert.equal(replaced.graphicSpec.objects.bars.children[0].type, undefined);
  assert.deepEqual(
    replaced.graphicSpec.objects.bars.children.map(child => child.id),
    ["bars:0", "bars:1"]
  );
});

test("validates heterogeneous child types and type-specific properties", () => {
  const collection = chart().createGraphics({
    id: "symbols",
    type: "collection"
  });

  for (const [children, message] of [
    [[{ type: "canvas", properties: {} }], /primitive drawable type/],
    [[{ type: "circle", properties: { width: 4 } }], /Unknown circle graphic property/],
    [[{ type: "circle", properties: null }], /requires plain properties/],
    [[{ type: "circle", properties: {}, id: "custom" }], /Unknown collection child property/]
  ]) {
    assert.throws(
      () => collection.editGraphics({
        target: "symbols",
        property: "children",
        value: children
      }),
      message
    );
  }

  const populated = collection.editGraphics({
    target: "symbols",
    property: "children",
    value: [
      { type: "circle", properties: {} },
      { type: "rect", properties: {} }
    ]
  });
  assert.throws(
    () => populated.editGraphics({
      target: "symbols",
      property: "radius",
      value: 4
    }),
    /Unknown rect graphic property/
  );
});

test("resizes a drawable collection while preserving existing children", () => {
  const onePoint = chart()
    .createGraphics({ id: "points", type: "circle", length: 1 })
    .editGraphics({ target: "points", property: "x", value: [10] });
  const twoPoints = onePoint.editGraphics({
    target: "points",
    property: "length",
    value: 2
  });

  assert.equal(twoPoints.graphicSpec.objects.points.children.length, 2);
  assert.deepEqual(twoPoints.graphicSpec.objects.points.children[0].properties, {
    x: 10
  });
  assert.equal(twoPoints.graphicSpec.objects.points.children[1].id, "points:1");
  assert.equal(onePoint.graphicSpec.objects.points.children.length, 1);
});

test("turns a single drawable into a collection through length", () => {
  const program = chart()
    .createGraphics({ id: "points", type: "circle" })
    .editGraphics({ target: "points", property: "length", value: 2 });

  assert.deepEqual(program.graphicSpec.objects.points, {
    type: "circle",
    children: [
      { id: "points:0", properties: {} },
      { id: "points:1", properties: {} }
    ]
  });
});

test("rejects unknown targets, properties, and mismatched value arrays", () => {
  const program = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });

  assert.throws(
    () => program.editGraphics({ target: "missing", property: "x", value: 1 }),
    /Unknown graphic target/
  );
  assert.throws(
    () => program.editGraphics({ target: "points", property: "cx", value: 1 }),
    /Unknown circle graphic property/
  );
  assert.throws(
    () =>
      program.editGraphics({ target: "points", property: "x", value: [1] }),
    /requires 2 values/
  );
});

test("shares concrete value validation with renderers", () => {
  const circle = chart().createGraphics({ id: "point", type: "circle" });
  assert.throws(
    () => circle.editGraphics({
      target: "point",
      property: "fill",
      value: 3
    }),
    /circle\.fill must be a non-empty string/
  );

  const text = chart().createGraphics({ id: "label", type: "text" });
  assert.throws(
    () => text.editGraphics({
      target: "label",
      property: "textAlign",
      value: "diagonal"
    }),
    /Unsupported text\.textAlign/
  );
});
