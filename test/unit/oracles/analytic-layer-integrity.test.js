import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/ChartProgram.js";
import {
  assertAnalyticLayerIntegrity,
  inspectAnalyticLayerIntegrity
} from "../../oracles/analytic-layer-integrity.js";

function pointProgram(id = "points") {
  return {
    semanticSpec: {
      layers: [{ id, mark: { type: "point" } }]
    },
    graphicSpec: {
      objects: {
        [id]: {
          type: "circle",
          items: [{
            id: `${id}:0`,
            properties: { x: 10, y: 20, radius: 3 }
          }]
        }
      }
    }
  };
}

test("accepts materialized semantic layers and reports analytic metrics", () => {
  assert.deepEqual(assertAnalyticLayerIntegrity(pointProgram()), {
    leafProgramCount: 1,
    layerCount: 1,
    itemCount: 1,
    nonDegenerateItemCount: 1
  });
});

test("rejects an authored area whose incomplete encoding leaves an empty owner", () => {
  const program = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] })
    .createAreaMark({ id: "area" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });

  const report = inspectAnalyticLayerIntegrity(program);
  assert.equal(
    report.issues.some(issue => issue.includes("has no materialized items")),
    true
  );
  assert.throws(
    () => assertAnalyticLayerIntegrity(program, "incomplete area"),
    /area.*no materialized items/su
  );
});

test("rejects non-finite and zero-size geometry even when items exist", () => {
  const program = {
    semanticSpec: {
      layers: [
        { id: "bars", mark: { type: "bar" } },
        { id: "rules", mark: { type: "rule" } }
      ]
    },
    graphicSpec: {
      objects: {
        bars: {
          type: "rect",
          items: [{
            id: "bars:0",
            properties: { x: 0, y: 0, width: 10, height: 0 }
          }]
        },
        rules: {
          type: "line",
          items: [{
            id: "rules:0",
            properties: {
              x1: 4,
              y1: Number.NaN,
              x2: 4,
              y2: 9,
              strokeWidth: 1
            }
          }]
        }
      }
    }
  };
  const report = inspectAnalyticLayerIntegrity(program);
  assert.equal(report.issues.length, 2);
  assert.equal(
    report.issues.every(issue => issue.includes("no finite, non-zero geometry")),
    true
  );
});

test("checks every materialized facet or composition leaf independently", () => {
  const valid = pointProgram("facetPoints");
  const empty = pointProgram("facetPoints");
  empty.graphicSpec.objects.facetPoints.items = [];
  const composition = {
    semanticSpec: {
      layers: [{ id: "facetPoints", mark: { type: "point" } }]
    },
    graphicSpec: { objects: {} },
    children: {
      "facet-cell-1": valid,
      "facet-cell-2": empty
    }
  };
  const report = inspectAnalyticLayerIntegrity(composition);
  assert.deepEqual(report.metrics, {
    leafProgramCount: 2,
    layerCount: 2,
    itemCount: 1,
    nonDegenerateItemCount: 1
  });
  assert.equal(report.issues.length, 1);
  assert.match(report.issues[0], /facet-cell-2.*no materialized items/u);
});

test("accepts a facet-grid cell explicitly declared empty", () => {
  const composition = {
    semanticSpec: { layers: [{ id: "points", mark: { type: "point" } }] },
    graphicSpec: { objects: {} },
    compositionSpec: {
      type: "facet",
      facet: {
        grid: {
          cells: [
            { id: "populated", empty: false },
            { id: "missing-pair", empty: true }
          ]
        }
      }
    },
    children: {
      populated: pointProgram("points"),
      "missing-pair": {
        semanticSpec: {
          layers: [{ id: "points", mark: { type: "point" } }]
        },
        graphicSpec: {
          objects: {
            points: { type: "circle", items: [] }
          }
        }
      }
    }
  };

  assert.deepEqual(assertAnalyticLayerIntegrity(composition), {
    leafProgramCount: 2,
    layerCount: 2,
    itemCount: 1,
    nonDegenerateItemCount: 1
  });
});

test("scans large path command lists without argument-spread limits", () => {
  const commands = [
    { op: "M", x: 0, y: 0 },
    ...Array.from({ length: 20_000 }, (_, index) => ({
      op: "L",
      x: index + 1,
      y: index % 2
    }))
  ];
  const program = {
    semanticSpec: {
      layers: [{ id: "largePath", mark: { type: "line" } }]
    },
    graphicSpec: {
      objects: {
        largePath: {
          type: "path",
          items: [{
            id: "largePath:0",
            properties: { commands, strokeWidth: 1 }
          }]
        }
      }
    }
  };

  assert.deepEqual(assertAnalyticLayerIntegrity(program), {
    leafProgramCount: 1,
    layerCount: 1,
    itemCount: 1,
    nonDegenerateItemCount: 1
  });
});


test("accepts filled flow ribbons without stroke and rejects collapsed or non-finite ribbons", () => {
  const ribbon = commands => ({
    semanticSpec: { layers: [{ id: "links", mark: { type: "flow-link" } }] },
    graphicSpec: { objects: { links: { type: "collection", items: [{ type: "path",
      properties: { commands, fill: "#64748b", stroke: "none", strokeWidth: 0 } }] } } }
  });
  const commands = [
    { op: "M", x: 0, y: 0 }, { op: "C", x1: 10, y1: 0, x2: 10, y2: 5, x: 20, y: 5 },
    { op: "L", x: 20, y: 8 }, { op: "C", x1: 10, y1: 8, x2: 10, y2: 3, x: 0, y: 3 }, { op: "Z" }
  ];
  assert.equal(assertAnalyticLayerIntegrity(ribbon(commands)).nonDegenerateItemCount, 1);
  for (const invalid of [
    [{ op: "M", x: 0, y: 0 }, { op: "L", x: 20, y: 0 }, { op: "Z" }],
    commands.map(command => command.op === "L" ? { ...command, y: Infinity } : command)
  ]) assert.throws(() => assertAnalyticLayerIntegrity(ribbon(invalid)), /no finite, non-zero geometry/);
});


test("filled Pyramid paths retain nonzero geometry without a stroke", () => {
  const program = {
    semanticSpec: { layers: [{ id: "stages", mark: { type: "pyramid" } }] },
    graphicSpec: { objects: { stages: { type: "collection", items: [{ type: "path", properties: {
      fill: "#2563eb", strokeWidth: 0,
      commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 20, y: 0 },
        { op: "L", x: 15, y: 10 }, { op: "L", x: 5, y: 10 }, { op: "Z" }]
    } }] } } }
  };
  assert.equal(assertAnalyticLayerIntegrity(program).nonDegenerateItemCount, 1);
  const zero = structuredClone(program);
  for (const command of zero.graphicSpec.objects.stages.items[0].properties.commands) {
    if (Object.hasOwn(command, "y")) command.y = 0;
  }
  assert.throws(() => assertAnalyticLayerIntegrity(zero), /no finite, non-zero geometry/);
});
