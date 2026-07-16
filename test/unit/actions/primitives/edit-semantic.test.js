import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

test("creates and replaces semantic properties without mutating earlier programs", () => {
  const empty = chart();
  const withMark = empty.editSemantic({
    property: "layer[points].mark.type",
    value: "point"
  });
  const withData = withMark.editSemantic({
    property: "layer[points].data",
    value: "cars"
  });

  assert.deepEqual(empty.semanticSpec.layers, []);
  assert.deepEqual(withMark.semanticSpec.layers, [
    { id: "points", mark: { type: "point" } }
  ]);
  assert.deepEqual(withData.semanticSpec.layers, [
    { id: "points", mark: { type: "point" }, data: "cars" }
  ]);
  assert.equal(withMark.semanticSpec.datasets, empty.semanticSpec.datasets);
  assert.equal(withData.semanticSpec.datasets, withMark.semanticSpec.datasets);
  assert.equal(withData.semanticSpec.scales, withMark.semanticSpec.scales);
  assert.equal(withData.context.currentMark, "points");
  assert.equal(withData.trace.children.at(-1).op, "editSemantic");
});

test("removes semantic encoding and guide branches with structural pruning", () => {
  const encoded = chart()
    .editSemantic({
      property: "layer[points].mark.type",
      value: "point"
    })
    .editSemantic({
      property: "layer[points].encoding.opacity.field",
      value: "value"
    })
    .editSemantic({
      property: "layer[points].encoding.opacity.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "guide.legend.opacity.scale",
      value: "opacity"
    });
  const withoutEncoding = encoded.editSemantic({
    property: "layer[points].encoding.opacity",
    remove: true
  });
  const withoutGuide = withoutEncoding.editSemantic({
    property: "guide.legend.opacity",
    remove: true
  });
  const idempotent = withoutGuide.editSemantic({
    property: "guide.legend.opacity",
    remove: true
  });

  assert.equal(encoded.semanticSpec.layers[0].encoding.opacity.field, "value");
  assert.deepEqual(withoutEncoding.semanticSpec.layers[0], {
    id: "points",
    mark: { type: "point" }
  });
  assert.deepEqual(withoutGuide.semanticSpec.guides, {});
  assert.equal(idempotent.semanticSpec, withoutGuide.semanticSpec);
  assert.deepEqual(idempotent.trace.children.at(-1).args, {
    property: "guide.legend.opacity",
    remove: true
  });
});

test("validates semantic removal mode and preserves dataset immutability", () => {
  const data = chart().editSemantic({
    property: "dataset[cars].values",
    value: []
  });

  assert.throws(
    () => data.editSemantic({
      property: "dataset[cars].values",
      remove: true
    }),
    /immutable after creation/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[points].encoding.opacity",
      value: 1,
      remove: true
    }),
    /cannot combine value and remove/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[points].encoding.opacity",
      remove: "yes"
    }),
    /remove must be a boolean/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[points].encoding.unknown",
      remove: true
    }),
    /Unknown semantic property/
  );
});

test("removes only complete unreferenced derived dataset resources", () => {
  const source = chart().editSemantic({
    property: "dataset[source].values",
    value: [{ value: 1 }]
  });
  const derived = source
    .editSemantic({ property: "dataset[derived].source", value: "source" })
    .editSemantic({
      property: "dataset[derived].transform",
      value: [{ type: "filter", field: "value", oneOf: [1] }]
    });
  const removed = derived.editSemantic({
    property: "dataset[derived]",
    remove: true
  });

  assert.deepEqual(removed.semanticSpec.datasets.map(dataset => dataset.id), [
    "source"
  ]);
  assert.deepEqual(derived.semanticSpec.datasets.map(dataset => dataset.id), [
    "source",
    "derived"
  ]);
  assert.throws(
    () => source.editSemantic({ property: "dataset[source]", remove: true }),
    /Source dataset.*immutable/
  );
  const referenced = derived.editSemantic({
    property: "layer[points].data",
    value: "derived"
  });
  assert.throws(
    () => referenced.editSemantic({
      property: "dataset[derived]",
      remove: true
    }),
    /still referenced/
  );
});

test("takes ownership of dataset rows and keeps datasets immutable", () => {
  const rows = Object.freeze([{ nested: { value: 1 } }]);
  const program = chart().editSemantic({
    property: "dataset[cars].values",
    value: rows
  });

  rows[0].nested.value = 2;

  assert.equal(program.semanticSpec.datasets[0].values[0].nested.value, 1);
  assert.equal(program.context.currentData, "cars");
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[0].values[0]), true);
  assert.throws(
    () =>
      program.editSemantic({
        property: "dataset[cars].values",
        value: []
      }),
    /immutable after creation/
  );
});

test("rejects unsupported paths and invalid dataset values", () => {
  assert.throws(
    () =>
      chart().editSemantic({
        property: "layer[points].appearance.fill",
        value: "red"
      }),
    /Unknown semantic property/
  );

  assert.throws(
    () =>
      chart().editSemantic({
        property: "dataset[cars].values",
        value: [1, 2]
      }),
    /array of plain row objects/
  );

  assert.throws(
    () =>
      chart().editSemantic({
        property: "layer[points].mark.type",
        value: "piont"
      }),
    /Unknown mark type/
  );
});

test("summarizes array values in the trace", () => {
  const program = chart().editSemantic({
    property: "dataset[cars].values",
    value: [{ x: 1 }, { x: 2 }]
  });

  assert.deepEqual(program.trace.children[0].args, {
    property: "dataset[cars].values",
    valueCount: 2
  });
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

test("validates aggregate semantic values needed by primitive authoring", () => {
  const scalarOperations = [
    "count", "sum", "mean", "median", "min", "max",
    "distinct", "valid", "missing",
    "variance", "varianceP", "stdev", "stdevP", "stderr",
    "q1", "q3", "ciLower", "ciUpper"
  ];
  for (const aggregate of scalarOperations) {
    for (const channel of ["x", "y"]) {
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
