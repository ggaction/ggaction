import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";

test("stores the line-chart semantic contract immutably", () => {
  const before = chart();
  const program = before
    .editSemantic({
      property: "layer[trends].encoding.x.fieldType",
      value: "temporal"
    })
    .editSemantic({
      property: "layer[trends].encoding.y.aggregate",
      value: "mean"
    })
    .editSemantic({
      property: "layer[trends].encoding.strokeDash.field",
      value: "Origin"
    })
    .editSemantic({ property: "scale[x].type", value: "time" })
    .editSemantic({ property: "scale[x].nice", value: true })
    .editSemantic({ property: "scale[y].type", value: "linear" })
    .editSemantic({ property: "scale[y].zero", value: false })
    .editSemantic({
      property: "guide.legend.series.channels",
      value: ["color", "strokeDash"]
    })
    .editSemantic({
      property: "guide.legend.series.scales",
      value: ["color", "strokeDash"]
    })
    .editSemantic({ property: "guide.legend.series.title", value: "Origin" })
    .editSemantic({
      property: "title.text",
      value: "The trend of acceleration by year"
    })
    .editSemantic({ property: "title.subtitle", value: "from 1970 to 1982" });

  assert.deepEqual(before.semanticSpec.title, {});
  assert.equal(before.semanticSpec.layers.length, 0);
  assert.deepEqual(program.semanticSpec.layers[0], {
    id: "trends",
    encoding: {
      x: { fieldType: "temporal" },
      y: { aggregate: "mean" },
      strokeDash: { field: "Origin" }
    }
  });
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "time", nice: true },
    { id: "y", type: "linear", zero: false }
  ]);
  assert.deepEqual(program.semanticSpec.guides.legend.series, {
    channels: ["color", "strokeDash"],
    scales: ["color", "strokeDash"],
    title: "Origin"
  });
  assert.deepEqual(program.semanticSpec.title, {
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });
  assert.equal(program.context.undefined, undefined);
  assert.equal(Object.isFrozen(program.semanticSpec.title), true);
});

test("validates Phase 2 semantic closed vocabularies", () => {
  assert.throws(
    () => chart().editSemantic({
      property: "layer[trends].encoding.x.fieldType",
      value: "date"
    }),
    /Unsupported semantic field type/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "layer[trends].encoding.y.aggregate",
      value: "average"
    }),
    /Unsupported aggregate/
  );
  assert.throws(
    () => chart().editSemantic({ property: "scale[x].type", value: "utc" }),
    /Unsupported scale type/
  );
  assert.throws(
    () => chart().editSemantic({ property: "scale[x].nice", value: 1 }),
    /nice must be a boolean/
  );
  assert.throws(
    () => chart()
      .editSemantic({ property: "scale[x].type", value: "time" })
      .editSemantic({ property: "scale[x].zero", value: false }),
    /does not support zero/
  );
  assert.throws(
    () => chart().editSemantic({
      property: "guide.legend.series.channels",
      value: ["color", "size"]
    }),
    /only color, strokeDash, and shape/
  );
  assert.throws(
    () => chart().editSemantic({ property: "title.text", value: "" }),
    /non-empty string/
  );
});
