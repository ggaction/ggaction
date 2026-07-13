import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

test("stores ordinal grouped-bar semantics immutably", () => {
  const before = chart();
  const program = before
    .editSemantic({
      property: "layer[bars].encoding.x.fieldType",
      value: "ordinal"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.aggregate",
      value: "mean"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: null
    })
    .editSemantic({
      property: "layer[bars].encoding.xOffset.field",
      value: "sex"
    })
    .editSemantic({
      property: "layer[bars].encoding.xOffset.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[bars].encoding.xOffset.scale",
      value: "xOffset"
    });

  assert.deepEqual(before.semanticSpec.layers, []);
  assert.deepEqual(program.semanticSpec.layers, [{
    id: "bars",
    encoding: {
      x: { fieldType: "ordinal" },
      y: { aggregate: "mean", stack: null },
      xOffset: { field: "sex", fieldType: "nominal", scale: "xOffset" }
    }
  }]);
  assert.equal(Object.isFrozen(program.semanticSpec.layers[0].encoding.xOffset), true);
});

test("validates grouped-bar semantic vocabulary", () => {
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.x.fieldType",
      value: "ordered"
    }),
    /Unsupported semantic field type/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: "group"
    }),
    /Unsupported stack/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.xOffset.offset",
      value: 1
    }),
    /Unknown semantic property/
  );
});
