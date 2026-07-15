import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMaterializationPlan
} from "../../src/materialization/dependencies.js";
import {
  planEncodingRematerialization
} from "../../src/materialization/encodings.js";
import { planDensityRematerialization } from
  "../../src/materialization/density.js";

test("executes materialization plans in order and deduplicates equivalent steps", () => {
  const calls = [];
  const program = {
    materialize(args) {
      calls.push(args.id);
      return this;
    },
    finish() {
      calls.push("finish");
      return this;
    }
  };

  const result = applyMaterializationPlan(program, [
    { op: "materialize", args: { id: "x" } },
    { op: "materialize", args: { id: "x" } },
    { op: "materialize", args: { id: "y" } },
    { op: "finish" },
    { op: "finish" }
  ]);

  assert.equal(result, program);
  assert.deepEqual(calls, ["x", "y", "finish"]);
});

test("plans point encoding scale, mark, and existing legend in order", () => {
  const program = {
    semanticSpec: {
      layers: [{ id: "points", mark: { type: "point" }, encoding: {} }],
      guides: { legend: { series: {} } }
    },
    guideConfigs: { legend: { series: {} } }
  };

  assert.deepEqual(
    planEncodingRematerialization(program, {
      target: "points",
      channel: "shape",
      scale: "shape"
    }),
    [
      { op: "rematerializeScale", args: { id: "shape" } },
      { op: "rematerializePointMark", args: { id: "points" } },
      { op: "rematerializeLegend" }
    ]
  );
});

test("plans every area consumer of one shared color scale", () => {
  const program = {
    semanticSpec: {
      layers: [
        {
          id: "first",
          mark: { type: "area" },
          encoding: { color: { scale: "color" } }
        },
        {
          id: "second",
          mark: { type: "area" },
          encoding: { color: { scale: "color" } }
        },
        {
          id: "other",
          mark: { type: "area" },
          encoding: { color: { scale: "otherColor" } }
        }
      ],
      guides: {}
    },
    guideConfigs: {}
  };

  assert.deepEqual(
    planEncodingRematerialization(program, {
      target: "first",
      channel: "color",
      scale: "color"
    }),
    [
      { op: "rematerializeAreaMark", args: { id: "first" } },
      { op: "rematerializeAreaMark", args: { id: "second" } }
    ]
  );
  assert.throws(
    () => planEncodingRematerialization(program, {
      target: "missing",
      channel: "color",
      scale: "color"
    }),
    /Unknown encoding materialization target/
  );
});

test("plans the revised density target before every shared-scale mark", () => {
  const program = {
    semanticSpec: {
      datasets: [{
        id: "density",
        transform: [{ type: "density" }]
      }],
      layers: [{
        id: "densityArea",
        data: "density",
        mark: { type: "area" },
        encoding: {
          x: { scale: "x" },
          y: { scale: "y" }
        }
      }, {
        id: "samples",
        mark: { type: "point" },
        encoding: {
          x: { scale: "x" },
          y: { scale: "y" }
        }
      }, {
        id: "unrelated",
        mark: { type: "point" },
        encoding: {
          x: { scale: "otherX" },
          y: { scale: "otherY" }
        }
      }]
    },
    markConfigs: {}
  };

  assert.deepEqual(
    planDensityRematerialization(program, "densityArea"),
    [
      { op: "rematerializeAreaMark", args: { id: "densityArea" } },
      { op: "rematerializePointMark", args: { id: "samples" } }
    ]
  );
  assert.throws(
    () => planDensityRematerialization(program, "missing"),
    /Unknown density materialization target/
  );
});
