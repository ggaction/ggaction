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

test("publishes facet policy editing as current behavior", () => {
  const current = new Set(ACTION_INDEX.actions.map(action => action.name));
  const planned = new Set(ACTION_INDEX.plannedActions.map(action => action.name));
  for (const name of ["editFacetScales", "editFacetGuides"]) {
    assert.equal(current.has(name), true, name);
    assert.equal(planned.has(name), false, name);
  }
  assert.equal(
    ACTION_INDEX.plannedCapabilities.some(
      capability => capability.id === "facet-policy-editing"
    ),
    false
  );
  assert.match(
    declarations,
    /interface EditCompositionLayoutOptions \{[\s\S]*columns\?: number;/
  );
  assert.match(
    declarations,
    /editFacetScales\(options: FacetScaleResolutions\): ChartProgram;/
  );
  assert.match(
    declarations,
    /editFacetGuides\(options: FacetGuideOptions\): ChartProgram;/
  );
});

function revisedFacet() {
  const rows = Object.freeze([
    Object.freeze({ x: 0, y: 1, group: "A", category: "u" }),
    Object.freeze({ x: 10, y: 2, group: "A", category: "v" }),
    Object.freeze({ x: 50, y: 3, group: "B", category: "u" }),
    Object.freeze({ x: 70, y: 4, group: "B", category: "v" }),
    Object.freeze({ x: 100, y: 5, group: "C", category: "u" }),
    Object.freeze({ x: 130, y: 6, group: "C", category: "v" })
  ]);
  return chart()
    .createCanvas({
      width: 260,
      height: 200,
      margin: { top: 30, right: 90, bottom: 50, left: 50 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeColor({ field: "category" })
    .createGuides()
    .facet({ field: "group", columns: 1 })
    .editCompositionLayout({ columns: 2 })
    .editFacetScales({ x: "independent" })
    .editFacetGuides({ axes: "outer", legend: "shared" });
}

test("renders edited facet policies through Canvas and Node PNG", async () => {
  const program = revisedFacet();
  assert.equal(program.compositionSpec.columns, 2);
  assert.equal(program.compositionSpec.facet.scales.x, "independent");
  assert.deepEqual(program.compositionSpec.facet.guides, {
    axes: "outer",
    legend: "shared"
  });
  assert.deepEqual(
    Object.values(program.children).map(child => child.resolvedScales.x.domain),
    [[0, 10], [50, 70], [100, 130]]
  );

  const context = createMockCanvasContext();
  render(program, context);
  assert.equal(findCanvasCalls(context, "arc").length, 8);

  const directory = await mkdtemp(path.join(
    tmpdir(),
    "ggaction-facet-policy-editing-"
  ));
  try {
    const output = path.join(directory, "facet-policy.png");
    const result = await renderToPNG(program, { output, pixelRatio: 2 });
    assert.equal(
      result.width,
      program.graphicSpec.objects.canvas.properties.width * 2
    );
    assert.equal(
      result.height,
      program.graphicSpec.objects.canvas.properties.height * 2
    );
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
