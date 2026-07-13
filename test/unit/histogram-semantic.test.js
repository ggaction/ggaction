import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

test("stores the histogram semantic contract immutably", () => {
  const before = chart();
  const program = before
    .editSemantic({
      property: "layer[bars].encoding.x.bin.maxBins",
      value: 7
    })
    .editSemantic({
      property: "layer[bars].encoding.y.aggregate",
      value: "count"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: "zero"
    })
    .editSemantic({
      property: "guide.grid.horizontal.scale",
      value: "y"
    })
    .editSemantic({
      property: "guide.grid.horizontal.coordinate",
      value: "main"
    });

  assert.deepEqual(before.semanticSpec.layers, []);
  assert.deepEqual(program.semanticSpec.layers, [
    {
      id: "bars",
      encoding: {
        x: { bin: { maxBins: 7 } },
        y: { aggregate: "count", stack: "zero" }
      }
    }
  ]);
  assert.deepEqual(program.semanticSpec.guides.grid.horizontal, {
    scale: "y",
    coordinate: "main"
  });
  assert.equal(Object.isFrozen(program.semanticSpec.layers[0].encoding.x.bin), true);
  assert.equal(before.semanticSpec.guides.grid, undefined);
});

test("validates histogram and grid primitive values", () => {
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.x.bin.maxBins",
      value: 0
    }),
    /positive integer/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.y.aggregate",
      value: "sum"
    }),
    /Unsupported aggregate/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: "normalize"
    }),
    /Unsupported stack/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "guide.grid.vertical.scale",
      value: "bad id"
    }),
    /Grid scale id/
  );
});
