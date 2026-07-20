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

test("removes a complete layer resource without mutating earlier programs", () => {
  const layered = chart()
    .editSemantic({ property: "layer[points].mark.type", value: "point" })
    .editSemantic({ property: "layer[points].data", value: "cars" })
    .editSemantic({ property: "layer[line].mark.type", value: "line" });
  const removed = layered.editSemantic({
    property: "layer[points]",
    remove: true
  });
  const idempotent = removed.editSemantic({
    property: "layer[points]",
    remove: true
  });

  assert.deepEqual(layered.semanticSpec.layers.map(layer => layer.id), [
    "points",
    "line"
  ]);
  assert.deepEqual(removed.semanticSpec.layers, [
    { id: "line", mark: { type: "line" } }
  ]);
  assert.equal(removed.context.currentMark, "line");
  assert.equal(idempotent.semanticSpec, removed.semanticSpec);

  const current = layered
    .editSemantic({ property: "layer[points].mark.type", value: "point" })
    .editSemantic({ property: "layer[points]", remove: true });
  assert.equal(current.context.currentMark, undefined);
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
