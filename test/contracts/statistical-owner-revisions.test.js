import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { renderToPNG } from "../../src/renderers/png.js";
import {
  ACTION_INDEX,
  REPOSITORY_ROOT
} from "../support/action-contracts.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

const declarations = readFileSync(
  path.join(REPOSITORY_ROOT, "types/program.d.ts"),
  "utf8"
);

test("publishes statistical-owner revision options as current behavior", () => {
  assert.doesNotMatch(
    JSON.stringify(ACTION_INDEX.plannedCapabilities),
    /statistical-owner-revisions/
  );
  assert.match(
    declarations,
    /interface EditErrorBarOptions \{[\s\S]*statistics\?: \{[\s\S]*center\?: IntervalCenter;[\s\S]*extent\?: IntervalExtent;[\s\S]*level\?: number;/
  );
  assert.match(
    declarations,
    /interface EditErrorBandOptions \{[\s\S]*statistics\?: \{[\s\S]*boundaries\?: false \| \{/
  );
  assert.match(
    declarations,
    /interface EditDensityOptions \{[\s\S]*source\?: string;[\s\S]*field\?: string;[\s\S]*groupBy\?: string \| false;/
  );
  assert.match(
    declarations,
    /interface EditRegressionOptions \{[\s\S]*data\?: string;[\s\S]*x\?: string;[\s\S]*y\?: string;[\s\S]*groupBy\?: string \| false;/
  );
});

function intervalRows() {
  return [
    { group: "A", time: 1, value: 1 },
    { group: "A", time: 1, value: 3 },
    { group: "A", time: 2, value: 2 },
    { group: "A", time: 2, value: 6 },
    { group: "B", time: 1, value: 4 },
    { group: "B", time: 1, value: 8 },
    { group: "B", time: 2, value: 5 },
    { group: "B", time: 2, value: 9 }
  ];
}

function revisedPrograms() {
  const base = () => chart()
    .createCanvas({ width: 260, height: 200, margin: 35 })
    .createData({ id: "samples", values: intervalRows() });
  const errorBar = base()
    .createErrorBar({
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" }
    })
    .editErrorBar({ statistics: { center: "median", extent: "iqr" } });
  const errorBand = base()
    .createErrorBand({
      x: { field: "time" },
      y: { field: "value" },
      groupBy: "group",
      boundaries: {}
    })
    .editErrorBand({
      statistics: { extent: "ci", level: 0.9 },
      boundaries: false
    })
    .editErrorBand({
      boundaries: { stroke: "#334155", strokeWidth: 1.5 }
    });
  const density = base()
    .createData({ id: "observations", values: intervalRows() })
    .createAreaMark({ id: "density" })
    .encodeDensity({ field: "time", groupBy: "group", bandwidth: 1 })
    .editDensity({
      source: "observations",
      field: "value",
      groupBy: false
    });
  const regression = base()
    .createData({ id: "observations", values: intervalRows() })
    .createPointMark({ id: "points", data: "samples" })
    .encodeX({ field: "time" })
    .encodeY({ field: "value" })
    .createRegression({ groupBy: "group" })
    .editRegression({
      data: "observations",
      x: "time",
      y: "value",
      groupBy: false
    });
  return { errorBar, errorBand, density, regression };
}

test("renders every revised statistical owner through Canvas and Node PNG", async () => {
  const directory = await mkdtemp(path.join(
    tmpdir(),
    "ggaction-statistical-owner-revisions-"
  ));
  try {
    for (const [name, program] of Object.entries(revisedPrograms())) {
      const context = createMockCanvasContext();
      render(program, context);
      assert.equal(
        findCanvasCalls(context, "stroke").length > 0 ||
          findCanvasCalls(context, "fill").length > 0,
        true,
        name
      );
      const result = await renderToPNG(program, {
        output: path.join(directory, `${name}.png`),
        pixelRatio: 2
      });
      assert.equal(result.width, 520, name);
      assert.equal(result.height, 400, name);
      assert.equal(result.bytes > 0, true, name);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
