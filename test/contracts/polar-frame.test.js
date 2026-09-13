import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { resolvePolarFrame } from "../../src/grammar/polar.js";
import { resolveStoredSelection } from
  "../../src/materialization/selection/state.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

const MOVED_FRAME = Object.freeze({
  center: Object.freeze({ x: 0.25, y: 0.5 }),
  radius: Object.freeze({ unit: "fraction", value: 0.8 })
});

function state(program) {
  return {
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: program.materializationConfigs,
    guideConfigs: program.guideConfigs,
    context: program.context,
    trace: program.trace
  };
}

function polarPointProgram(canvas = { width: 400, height: 200, margin: 0 }) {
  return chart()
    .createCanvas(canvas)
    .createData({
      id: "rows",
      values: [{ angle: 0, radius: 80 }, { angle: 90, radius: 80 }]
    })
    .createPolarScatterPlot({
      id: "points",
      theta: { field: "angle", scale: { id: "theta", domain: [0, 360] } },
      radius: { field: "radius", scale: { id: "radius", domain: [0, 80] } },
      guides: false
    });
}

function movedPointProgram() {
  return polarPointProgram()
    .createThetaAxisLine({ coordinate: "polar", scale: "theta" })
    .createRadialAxisLine({
      coordinate: "polar",
      scale: "radius",
      angle: 90
    })
    .createThetaGrid({
      coordinate: "polar",
      scale: "theta",
      values: [0, 90]
    })
    .createRadialGrid({
      coordinate: "polar",
      scale: "radius",
      values: [40, 80]
    })
    .editCoordinate({ target: "polar", polarFrame: MOVED_FRAME });
}

test("resolves the three fixed Polar frame geometry oracles", () => {
  assert.deepEqual(resolvePolarFrame(
    { x: 0, y: 0, width: 400, height: 200 },
    MOVED_FRAME
  ), {
    centerX: 100,
    centerY: 100,
    availableRadius: 80
  });
  assert.deepEqual(resolvePolarFrame(
    { x: 20, y: 30, width: 400, height: 200 },
    MOVED_FRAME
  ), {
    centerX: 120,
    centerY: 130,
    availableRadius: 80
  });
  const frame = resolvePolarFrame(
    { x: 0, y: 0, width: 400, height: 200 },
    MOVED_FRAME
  );
  assert.deepEqual([
    [frame.centerX, frame.centerY - frame.availableRadius],
    [frame.centerX + frame.availableRadius, frame.centerY]
  ], [[100, 20], [180, 100]]);
});

test("moves point, line, arc, axes, and grids through one requested frame", () => {
  const points = movedPointProgram();
  assert.deepEqual(points.semanticSpec.coordinates[0].polarFrame, MOVED_FRAME);
  assert.deepEqual(points.resolvedScales.radius.range, [0, 80]);
  assert.deepEqual(
    points.graphicSpec.objects.points.items.map(item => [
      Math.round(item.properties.x),
      Math.round(item.properties.y)
    ]),
    [[100, 20], [180, 100]]
  );
  assert.deepEqual(points.graphicSpec.objects.radialAxisLine.properties, {
    x1: 100,
    y1: 100,
    x2: 180,
    y2: 100,
    stroke: "#475569",
    strokeWidth: 1.25
  });
  assert.deepEqual(
    points.graphicSpec.objects.thetaGridLines.items.map(item => [
      item.properties.x1,
      item.properties.y1,
      Math.round(item.properties.x2),
      Math.round(item.properties.y2)
    ]),
    [[100, 100, 100, 20], [100, 100, 180, 100]]
  );
  assert.deepEqual(
    points.graphicSpec.objects.radialGridCircles.items.map(
      item => item.properties.commands[0]
    ),
    [{ op: "M", x: 100, y: 60 }, { op: "M", x: 100, y: 20 }]
  );

  const line = chart()
    .createCanvas({ width: 400, height: 200, margin: 0 })
    .createData({
      id: "rows",
      values: [{ angle: 0, radius: 80 }, { angle: 90, radius: 80 }]
    })
    .createPolarLinePlot({
      id: "line",
      theta: { field: "angle", scale: { domain: [0, 360] } },
      radius: { field: "radius", scale: { domain: [0, 80] } },
      guides: false
    })
    .editCoordinate({ target: "polar", polarFrame: MOVED_FRAME });
  assert.deepEqual(
    line.graphicSpec.objects.line.items[0].properties.commands,
    [{ op: "M", x: 100, y: 20 }, { op: "L", x: 180, y: 100 }]
  );

  const pie = chart()
    .createCanvas({ width: 400, height: 200, margin: 0 })
    .createData({ values: [{ category: "A" }, { category: "B" }] })
    .createPiePlot({ id: "pie", category: "category", guides: false })
    .editCoordinate({ target: "polar", polarFrame: MOVED_FRAME });
  assert.deepEqual(
    pie.graphicSpec.objects.pie.items[0].properties.commands[0],
    { op: "M", x: 100, y: 20 }
  );
  assert.deepEqual(
    pie.graphicSpec.objects.pie.items[0].properties.commands.at(-2),
    { op: "L", x: 100, y: 100 }
  );
  const selected = resolveStoredSelection(pie.selectMarks({
    target: "pie",
    field: "category",
    op: "eq",
    value: "A"
  }));
  assert.deepEqual(selected.keys, ["pie/sector/0"]);
  assert.deepEqual(
    [selected.items[0].properties.x, selected.items[0].properties.y],
    [140, 100]
  );

  const labels = polarPointProgram({ width: 500, height: 300, margin: 50 })
    .createThetaAxisLabels({
      coordinate: "polar",
      scale: "theta",
      values: [0, 90]
    })
    .createRadialAxisLabels({
      coordinate: "polar",
      scale: "radius",
      values: [0, 80],
      angle: 90
    })
    .editCoordinate({ target: "polar", polarFrame: MOVED_FRAME });
  assert.deepEqual(
    labels.graphicSpec.objects.thetaAxisLabels.items.map(item => [
      item.properties.x,
      item.properties.y
    ]),
    [[150, 52], [248, 150]]
  );
  assert.deepEqual(
    labels.graphicSpec.objects.radialAxisLabels.items.map(item => [
      item.properties.x,
      item.properties.y
    ]),
    [[150, 140], [230, 140]]
  );
});

test("applies aspect before Polar frame and replaces frame objects completely", () => {
  const combined = polarPointProgram().editCoordinate({
    target: "polar",
    aspect: { mode: "frame", ratio: 1 },
    polarFrame: MOVED_FRAME
  });
  assert.deepEqual(combined.resolvedScales.radius.range, [0, 40]);
  assert.deepEqual(
    combined.graphicSpec.objects.points.items.map(item => [
      Math.round(item.properties.x),
      Math.round(item.properties.y)
    ]),
    [[150, 60], [190, 100]]
  );

  const replaced = polarPointProgram()
    .editCoordinate({
      target: "polar",
      polarFrame: {
        center: { x: 0.25, y: 0.5 },
        radius: { unit: "px", value: 40 }
      }
    })
    .editCoordinate({
      target: "polar",
      polarFrame: { radius: { unit: "fraction", value: 1 } }
    });
  assert.deepEqual(replaced.semanticSpec.coordinates[0].polarFrame, {
    center: { x: 0.5, y: 0.5 },
    radius: { unit: "fraction", value: 1 }
  });
  assert.deepEqual(replaced.resolvedScales.radius.range, [0, 100]);
});

test("replays fraction and pixel frames across Canvas edits and restores auto", () => {
  const fraction = polarPointProgram().editCoordinate({
    target: "polar",
    polarFrame: MOVED_FRAME
  });
  const enlarged = fraction.editCanvas({ width: 800, height: 400 });
  assert.deepEqual(enlarged.resolvedScales.radius.range, [0, 160]);
  assert.deepEqual(
    enlarged.graphicSpec.objects.points.items.map(item => [
      Math.round(item.properties.x),
      Math.round(item.properties.y)
    ]),
    [[200, 40], [360, 200]]
  );
  const domainEdited = fraction.editScale({ id: "radius", domain: [0, 160] });
  assert.deepEqual(domainEdited.resolvedScales.radius.range, [0, 80]);
  assert.deepEqual(
    domainEdited.graphicSpec.objects.points.items.map(item => [
      Math.round(item.properties.x),
      Math.round(item.properties.y)
    ]),
    [[100, 60], [140, 100]]
  );

  const pixels = polarPointProgram().editCoordinate({
    target: "polar",
    polarFrame: { radius: { unit: "px", value: 60 } }
  });
  assert.deepEqual(pixels.resolvedScales.radius.range, [0, 60]);
  assert.deepEqual(
    pixels.editCanvas({ width: 800, height: 400 }).resolvedScales.radius.range,
    [0, 60]
  );
  assert.throws(() => pixels.editCanvas({ width: 100, height: 100 }), /maximum radius 50/);
  assert.deepEqual(state(pixels), state(
    polarPointProgram().editCoordinate({
      target: "polar",
      polarFrame: { radius: { unit: "px", value: 60 } }
    })
  ));

  const automatic = fraction.editCoordinate({
    target: "polar",
    polarFrame: "auto"
  });
  assert.equal(automatic.semanticSpec.coordinates[0].polarFrame, undefined);
  assert.deepEqual(automatic.resolvedScales.radius.range, [0, 100]);
  assert.deepEqual(automatic.graphicSpec, polarPointProgram().graphicSpec);
});

test("rejects invalid frame edits and range conflicts atomically", () => {
  const base = polarPointProgram();
  const cartesian = chart().createCanvas().createCoordinate({
    id: "cartesian",
    type: "cartesian"
  });
  const attempts = [
    () => base.editCoordinate({ target: "polar" }),
    () => base.editCoordinate({ target: "polar", polarFrame: false }),
    () => base.editCoordinate({
      target: "polar",
      polarFrame: { center: { x: 0, y: 0.5 } }
    }),
    () => base.editCoordinate({
      target: "polar",
      polarFrame: {
        center: { x: 0.9, y: 0.5 },
        radius: { unit: "px", value: 80 }
      }
    }),
    () => base.editCoordinate({
      target: "polar",
      polarFrame: { radius: { unit: "fraction", value: 0 } }
    }),
    () => base.editCoordinate({
      target: "polar",
      polarFrame: { center: { x: NaN, y: 0.5 } }
    }),
    () => base.editCoordinate({
      target: "polar",
      polarFrame: {},
      extra: true
    })
  ];
  for (const attempt of attempts) {
    assert.throws(attempt);
    assert.deepEqual(state(base), state(polarPointProgram()));
  }
  assert.throws(
    () => cartesian.editCoordinate({
      target: "cartesian",
      polarFrame: "auto"
    }),
    /requires a Polar coordinate/
  );

  const explicit = chart()
    .createCanvas({ width: 400, height: 200, margin: 0 })
    .createData({ values: [{ angle: 0, radius: 80 }] })
    .createPolarScatterPlot({
      theta: { field: "angle", scale: { domain: [0, 360] } },
      radius: {
        field: "radius",
        scale: { domain: [0, 80], range: [0, 100] }
      },
      guides: false
    });
  assert.throws(
    () => explicit.editCoordinate({
      target: "polar",
      polarFrame: MOVED_FRAME
    }),
    /fit within the available radius 80/
  );
  assert.equal(explicit.semanticSpec.coordinates[0].polarFrame, undefined);
});

test("renders a moved Polar frame through Canvas, SVG, PNG, and PDF", async t => {
  const program = movedPointProgram();
  const context = createMockCanvasContext();
  render(program, context);
  assert.equal(
    findCanvasCalls(context, "arc").some(
      call => call.args[0] === 100 && call.args[1] === 20
    ),
    true
  );
  const svg = renderToSVG(program);
  assert.match(svg, /cx="100" cy="20"/);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-polar-frame-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pngPath = join(directory, "polar-frame.png");
  const pdfPath = join(directory, "polar-frame.pdf");
  const png = await renderToPNG(program, { output: pngPath, pixelRatio: 2 });
  const pdf = await renderToPDF(program, { output: pdfPath });
  const pngBytes = await readFile(pngPath);
  const pdfBytes = await readFile(pdfPath);
  assert.deepEqual(
    [...pngBytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );
  assert.deepEqual([png.width, png.height], [800, 400]);
  assert.equal(pdf.bytes, pdfBytes.length);
  assert.match(pdfBytes.toString("latin1", 0, 8), /^%PDF-/);
});
