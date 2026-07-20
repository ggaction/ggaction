import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

test("stores and removes Polar guide semantics through canonical paths", () => {
  const program = chart()
    .editSemantic({ property: "guide.axis.theta.scale", value: "theta" })
    .editSemantic({ property: "guide.axis.theta.coordinate", value: "polar" })
    .editSemantic({ property: "guide.axis.theta.title", value: "Angle" })
    .editSemantic({ property: "guide.axis.radius.scale", value: "radius" })
    .editSemantic({ property: "guide.grid.theta.scale", value: "theta" })
    .editSemantic({ property: "guide.grid.radial.coordinate", value: "polar" });

  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      theta: { scale: "theta", coordinate: "polar", title: "Angle" },
      radius: { scale: "radius" }
    },
    grid: {
      theta: { scale: "theta" },
      radial: { coordinate: "polar" }
    }
  });
  const removed = program.editSemantic({
    property: "guide.axis.theta",
    remove: true
  });
  assert.equal(removed.semanticSpec.guides.axis.theta, undefined);
  assert.equal(program.semanticSpec.guides.axis.theta.title, "Angle");
  assert.throws(
    () => chart().editSemantic({
      property: "guide.axis.theta.title",
      value: ""
    }),
    /Axis title/
  );
});

test("validates semantic scale values through the primitive API", () => {
  const transformed = chart()
    .editSemantic({ property: "scale[x].type", value: "log" })
    .editSemantic({ property: "scale[x].base", value: 10 })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "sqrt" })
    .editSemantic({ property: "scale[y].zero", value: false });
  assert.deepEqual(transformed.semanticSpec.scales, [
    { id: "x", type: "log", base: 10, nice: true },
    { id: "y", type: "sqrt", zero: false }
  ]);
  assert.throws(
    () =>
      chart().editSemantic({
        property: "scale[x].type",
        value: "linar"
      }),
    /Unsupported scale type/
  );
  assert.throws(
    () =>
      chart().editSemantic({
        property: "scale[x].domain",
        value: []
      }),
    /non-empty array/
  );
  assert.throws(
    () =>
      chart().editSemantic({
        property: "scale[x].range",
        value: { palette: "unknown" }
      }),
    /Unknown palette/
  );
  assert.throws(
    () => chart()
      .editSemantic({ property: "scale[x].type", value: "log" })
      .editSemantic({ property: "scale[x].zero", value: false }),
    /does not support zero/
  );
  assert.throws(
    () => chart()
      .editSemantic({ property: "scale[x].type", value: "sqrt" })
      .editSemantic({ property: "scale[x].base", value: 10 }),
    /does not support base/
  );
});

test("owns the explicit path-order semantic vocabulary", () => {
  const program = chart()
    .editSemantic({
      property: "layer[path].encoding.pathOrder.field",
      value: "year"
    })
    .editSemantic({
      property: "layer[path].encoding.pathOrder.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[path].encoding.pathOrder.order",
      value: "descending"
    });
  assert.deepEqual(program.semanticSpec.layers[0].encoding.pathOrder, {
    field: "year",
    fieldType: "quantitative",
    order: "descending"
  });
  assert.throws(
    () => program.editSemantic({
      property: "layer[path].encoding.pathOrder.fieldType",
      value: "temporal"
    }),
    /must be quantitative/
  );
  assert.throws(
    () => program.editSemantic({
      property: "layer[path].encoding.pathOrder.order",
      value: "forward"
    }),
    /Unsupported path order/
  );
  assert.throws(
    () => program.editSemantic({
      property: "layer[path].encoding.pathOrder.datum",
      value: 1
    }),
    /Unknown semantic property/
  );
});

test("validates band and point layout values through the primitive API", () => {
  const program = chart()
    .editSemantic({ property: "scale[band].type", value: "band" })
    .editSemantic({ property: "scale[band].paddingInner", value: 0.2 })
    .editSemantic({ property: "scale[band].paddingOuter", value: 0.1 })
    .editSemantic({ property: "scale[band].align", value: 0.5 })
    .editSemantic({ property: "scale[point].type", value: "point" })
    .editSemantic({ property: "scale[point].padding", value: 0.5 })
    .editSemantic({ property: "scale[point].align", value: 0.5 });

  assert.deepEqual(program.semanticSpec.scales, [
    {
      id: "band",
      type: "band",
      paddingInner: 0.2,
      paddingOuter: 0.1,
      align: 0.5
    },
    { id: "point", type: "point", padding: 0.5, align: 0.5 }
  ]);

  for (const [property, value] of [
    ["paddingInner", 1],
    ["paddingOuter", -0.1],
    ["padding", Infinity],
    ["align", 1.1]
  ]) {
    assert.throws(
      () => chart()
        .editSemantic({ property: "scale[x].type", value: "band" })
        .editSemantic({ property: `scale[x].${property}`, value }),
      new RegExp(property)
    );
  }

  assert.throws(
    () => chart()
      .editSemantic({ property: "scale[x].type", value: "point" })
      .editSemantic({ property: "scale[x].paddingInner", value: 0.2 }),
    /does not support paddingInner/
  );
  assert.throws(
    () => chart()
      .editSemantic({ property: "scale[x].type", value: "band" })
      .editSemantic({ property: "scale[x].padding", value: 0.5 }),
    /does not support padding/
  );
});

test("validates aggregate semantic values needed by primitive authoring", () => {
  const scalarOperations = [
    "count", "sum", "mean", "median", "min", "max",
    "distinct", "valid", "missing",
    "variance", "varianceP", "stdev", "stdevP", "stderr",
    "q1", "q3", "ciLower", "ciUpper"
  ];
  for (const aggregate of scalarOperations) {
    for (const channel of ["x", "y", "color"]) {
      const program = chart().editSemantic({
        property: `layer[lines].encoding.${channel}.aggregate`,
        value: aggregate
      });
      assert.equal(
        program.semanticSpec.layers[0].encoding[channel].aggregate,
        aggregate
      );
    }
  }
  for (const aggregate of [
    { op: "quantile", probability: 0.75 },
    { op: "first", orderBy: "Horsepower" },
    { op: "last", orderBy: "Horsepower", order: "descending" }
  ]) {
    const program = chart().editSemantic({
      property: "layer[lines].encoding.y.aggregate",
      value: aggregate
    });
    assert.deepEqual(program.semanticSpec.layers[0].encoding.y.aggregate, aggregate);
  }

  for (const value of [
    "average",
    { op: "quantile", probability: -0.1 },
    { op: "quantile", probability: 0.5, orderBy: "x" },
    { op: "first", orderBy: "" },
    { op: "last", orderBy: "x", order: "sideways" }
  ]) {
    assert.throws(
      () => chart().editSemantic({
        property: "layer[lines].encoding.y.aggregate",
        value
      }),
      /aggregate|probability|orderBy|property|order/i
    );
  }
});

test("validates resolved interval provenance needed by primitive authoring", () => {
  const base = chart().createData({ id: "cars", values: [] });
  const transform = {
    type: "interval",
    field: "Acceleration",
    groupBy: ["Origin"],
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: {
      center: "__errorBar_center",
      lower: "__errorBar_lower",
      upper: "__errorBar_upper"
    }
  };
  const program = base
    .editSemantic({ property: "dataset[summary].source", value: "cars" })
    .editSemantic({ property: "dataset[summary].transform", value: [transform] });

  assert.deepEqual(program.semanticSpec.datasets[1].transform, [transform]);
  assert.doesNotThrow(() => base.editSemantic({
    property: "dataset[ungrouped].transform",
    value: [{ ...transform, groupBy: [] }]
  }));
  for (const invalid of [
    { ...transform, center: "median" },
    { ...transform, extent: "stderr", level: 0.95 },
    { ...transform, level: 1 },
    { ...transform, as: { ...transform.as, upper: "Origin" } }
  ]) {
    assert.throws(
      () => base.editSemantic({
        property: "dataset[summary].transform",
        value: [invalid]
      }),
      /Interval|interval/
    );
  }
});

test("validates resolved density kernel and normalization provenance", () => {
  const baseTransform = {
    type: "density",
    field: "value",
    bandwidth: 1,
    extent: [0, 2],
    steps: 3,
    as: ["sample", "density"],
    resolve: "shared"
  };
  const program = chart().editSemantic({
    property: "dataset[density].transform",
    value: [{
      ...baseTransform,
      kernel: "epanechnikov",
      normalization: "count"
    }]
  });

  assert.equal(
    program.semanticSpec.datasets[0].transform[0].kernel,
    "epanechnikov"
  );
  assert.equal(
    program.semanticSpec.datasets[0].transform[0].normalization,
    "count"
  );
  assert.throws(
    () => chart().editSemantic({
      property: "dataset[density].transform",
      value: [{ ...baseTransform, kernel: "round" }]
    }),
    /Unsupported density kernel/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "dataset[density].transform",
      value: [{ ...baseTransform, normalization: "probability" }]
    }),
    /Unsupported density normalization/
  );
});

test("validates comparison and range filter transform provenance", () => {
  const comparison = chart().editSemantic({
    property: "dataset[selected].transform",
    value: [{
      type: "filter",
      field: "Horsepower",
      predicate: { op: "gte", value: 150 }
    }]
  });
  const range = chart().editSemantic({
    property: "dataset[selected].transform",
    value: [{
      type: "filter",
      field: "Displacement",
      range: { min: 100, max: 300, inclusive: true }
    }]
  });

  assert.deepEqual(comparison.semanticSpec.datasets[0].transform[0].predicate, {
    op: "gte",
    value: 150
  });
  assert.deepEqual(range.semanticSpec.datasets[0].transform[0].range, {
    min: 100,
    max: 300,
    inclusive: true
  });

  for (const transform of [{
    type: "filter",
    field: "value",
    oneOf: [1],
    predicate: { op: "gte", value: 1 }
  }, {
    type: "filter",
    field: "value",
    predicate: { op: "near", value: 1 }
  }, {
    type: "filter",
    field: "value",
    range: { min: 3, max: 1 }
  }, {
    type: "filter",
    field: "value",
    range: { min: 1, max: "3" }
  }]) {
    assert.throws(
      () => chart().editSemantic({
        property: "dataset[selected].transform",
        value: [transform]
      }),
      /filter|operator|range/i
    );
  }
});

test("validates exact histogram bin semantics through the primitive API", () => {
  const withStep = chart().editSemantic({
    property: "layer[bars].encoding.x.bin.step",
    value: 60
  });
  const withBoundaries = chart().editSemantic({
    property: "layer[bars].encoding.x.bin.boundaries",
    value: [50, 100, 150, 225]
  });

  assert.equal(withStep.semanticSpec.layers[0].encoding.x.bin.step, 60);
  assert.deepEqual(
    withBoundaries.semanticSpec.layers[0].encoding.x.bin.boundaries,
    [50, 100, 150, 225]
  );

  for (const value of [0, -1, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => chart().editSemantic({
        property: "layer[bars].encoding.x.bin.step",
        value
      }),
      /positive finite/
    );
  }
  for (const value of [
    [0],
    [0, 0],
    [1, 0],
    [0, Number.NaN]
  ]) {
    assert.throws(
      () => chart().editSemantic({
        property: "layer[bars].encoding.x.bin.boundaries",
        value
      }),
      /strictly increasing finite/
    );
  }
});

test("validates planned stack and color-layout semantics through primitives", () => {
  for (const stack of ["zero", "normalize", null]) {
    for (const channel of ["x", "y"]) {
      const program = chart().editSemantic({
        property: `layer[bars].encoding.${channel}.stack`,
        value: stack
      });
      assert.equal(program.semanticSpec.layers[0].encoding[channel].stack, stack);
    }
  }
  for (const layout of ["stack", "fill", "group", "overlay", "diverging"]) {
    const program = chart().editSemantic({
      property: "layer[bars].encoding.color.layout",
      value: layout
    });
    assert.equal(program.semanticSpec.layers[0].encoding.color.layout, layout);
  }
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: "center"
    }),
    /Unsupported stack/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.color.layout",
      value: "center"
    }),
    /Unsupported color layout/
  );
});

test("stores and validates semantic encoding titles", () => {
  const program = chart().editSemantic({
    property: "layer[interval].encoding.y.title",
    value: "Mean value"
  });

  assert.equal(
    program.semanticSpec.layers[0].encoding.y.title,
    "Mean value"
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[interval].encoding.y.title",
      value: ""
    }),
    /Encoding title must be a non-empty string/
  );
});
