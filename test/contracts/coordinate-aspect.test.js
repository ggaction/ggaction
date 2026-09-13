import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { resolveEffectiveBounds } from "../../src/layout/aspect.js";

const zeroMarginCanvas = Object.freeze({
  width: 400,
  height: 300,
  margin: 0
});

function pointProgram({
  canvas = zeroMarginCanvas,
  xDomain = [0, 100],
  yDomain = [0, 50],
  xScale = {},
  yScale = {}
} = {}) {
  return chart()
    .createCanvas(canvas)
    .createData({
      id: "rows",
      values: [{ x: xDomain[0], y: yDomain[0] }, { x: xDomain[1], y: yDomain[1] }]
    })
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({
      target: "points",
      field: "x",
      scale: { id: "x", domain: xDomain, ...xScale }
    })
    .encodeY({
      target: "points",
      field: "y",
      scale: { id: "y", domain: yDomain, ...yScale }
    });
}

function state(program) {
  return {
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: program.materializationConfigs,
    context: program.context,
    trace: program.trace
  };
}

test("exposes coordinate editing only from the full program", () => {
  assert.equal(typeof chart().editCoordinate, "function");
  assert.equal(basicChart().editCoordinate, undefined);
});

test("resolves frame and data aspect bounds from independent literal oracles", () => {
  assert.deepEqual(resolveEffectiveBounds(
    { x: 0, y: 0, width: 400, height: 300 },
    { mode: "data", ratio: 1 },
    { x: [0, 100], y: [0, 50] }
  ), { x: 0, y: 50, width: 400, height: 200 });
  assert.deepEqual(resolveEffectiveBounds(
    { x: 0, y: 0, width: 400, height: 300 },
    { mode: "data", ratio: 2 },
    { x: [0, 100], y: [0, 50] }
  ), { x: 0, y: 100, width: 400, height: 100 });
  assert.deepEqual(resolveEffectiveBounds(
    { x: 10, y: 20, width: 300, height: 200 },
    { mode: "frame", ratio: 1, alignX: "end" }
  ), { x: 110, y: 20, width: 200, height: 200 });
});

test("stores a normalized data aspect and gives x and y units the requested ratio", () => {
  const before = pointProgram();
  const options = Object.freeze({
    target: "main",
    aspect: Object.freeze({ mode: "data", ratio: 1 })
  });
  const program = before.editCoordinate(options);

  assert.deepEqual(program.semanticSpec.coordinates[0].aspect, {
    mode: "data",
    ratio: 1,
    alignX: "center",
    alignY: "center"
  });
  assert.deepEqual(program.resolvedScales.x.range, [0, 400]);
  assert.deepEqual(program.resolvedScales.y.range, [250, 50]);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(item => [
      item.properties.x,
      item.properties.y
    ]),
    [[0, 250], [400, 50]]
  );
  const xPixelsPerUnit = 400 / 100;
  const yPixelsPerUnit = 200 / 50;
  assert.equal(xPixelsPerUnit / yPixelsPerUnit, 1);
  assert.equal(Object.isFrozen(options.aspect), true);
  assert.equal(before.semanticSpec.coordinates[0].aspect, undefined);
  assert.deepEqual(before.resolvedScales.x.range, [0, 400]);
  assert.deepEqual(before.resolvedScales.y.range, [300, 0]);
});

test("uses absolute reversed domain spans without rewriting the domains", () => {
  const program = pointProgram({
    xDomain: [100, 0],
    yDomain: [50, 0]
  }).editCoordinate({
    target: "main",
    aspect: { mode: "data", ratio: 2 }
  });

  assert.deepEqual(program.resolvedScales.x.domain, [100, 0]);
  assert.deepEqual(program.resolvedScales.y.domain, [50, 0]);
  assert.deepEqual(program.resolvedScales.x.range, [0, 400]);
  assert.deepEqual(program.resolvedScales.y.range, [200, 100]);
});

test("rematerializes axes and grids against the shared effective bounds", () => {
  const program = pointProgram({
    canvas: {
      width: 500,
      height: 400,
      margin: { top: 50, right: 50, bottom: 50, left: 50 }
    }
  })
    .createXAxis({
      coordinate: "main",
      line: {},
      ticksAndLabels: false,
      title: false
    })
    .createYAxis({
      coordinate: "main",
      line: {},
      ticksAndLabels: false,
      title: false
    })
    .createGrid({
      vertical: { coordinate: "main", values: [0, 50, 100] },
      horizontal: { coordinate: "main", values: [0, 25, 50] }
    })
    .editCoordinate({
      target: "main",
      aspect: { mode: "data", ratio: 1 }
    });

  assert.deepEqual(program.graphicSpec.objects.xAxisLine.properties, {
    x1: 50, y1: 300, x2: 450, y2: 300,
    stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(program.graphicSpec.objects.yAxisLine.properties, {
    x1: 50, y1: 300, x2: 50, y2: 100,
    stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(
    program.graphicSpec.objects.verticalGridLines.items.map(item => [
      item.properties.x1, item.properties.y1,
      item.properties.x2, item.properties.y2
    ]),
    [[50, 100, 50, 300], [250, 100, 250, 300], [450, 100, 450, 300]]
  );
});

test("recomputes coupled ranges after domain and Canvas edits and auto restores allocation", () => {
  const initial = pointProgram().editCoordinate({
    target: "main",
    aspect: { mode: "data", ratio: 1 }
  });
  const domainEdited = initial.editScale({ id: "y", domain: [0, 100] });
  assert.deepEqual(domainEdited.resolvedScales.x.range, [50, 350]);
  assert.deepEqual(domainEdited.resolvedScales.y.range, [300, 0]);

  const enlarged = domainEdited.editCanvas({ width: 600 });
  assert.deepEqual(enlarged.resolvedScales.x.range, [150, 450]);
  assert.deepEqual(enlarged.resolvedScales.y.range, [300, 0]);
  const restored = enlarged.editCanvas({ width: 400 });
  assert.deepEqual(restored.resolvedScales.x.range, [50, 350]);
  assert.deepEqual(restored.resolvedScales.y.range, [300, 0]);

  const automatic = restored.editCoordinate({ target: "main", aspect: "auto" });
  assert.equal(automatic.semanticSpec.coordinates[0].aspect, undefined);
  assert.deepEqual(automatic.resolvedScales.x.range, [0, 400]);
  assert.deepEqual(automatic.resolvedScales.y.range, [300, 0]);
});

test("rejects invalid or ambiguous data aspects atomically", () => {
  const base = pointProgram();
  for (const operation of [
    program => program.editCoordinate({ target: "main" }),
    program => program.editCoordinate({ aspect: { mode: "frame", ratio: 1 } }),
    program => program.editCoordinate({ target: "main", aspect: false }),
    program => program.editCoordinate({ target: "main", aspect: {} }),
    program => program.editCoordinate({
      target: "main",
      aspect: { mode: "frame", ratio: 1 },
      type: "polar"
    }),
    program => program.editCoordinate({ target: "main", aspect: { mode: "data", ratio: 0 } }),
    program => program.editCoordinate({ target: "main", aspect: { mode: "data", ratio: Infinity } }),
    program => program.editCoordinate({ target: "main", aspect: { mode: "unknown", ratio: 1 } }),
    program => program.editCoordinate({ target: "main", aspect: { mode: "frame", ratio: 1, alignX: "middle" } }),
    program => program.editCoordinate({ target: "missing", aspect: { mode: "frame", ratio: 1 } })
  ]) {
    assert.throws(() => operation(base));
    assert.deepEqual(state(base), state(pointProgram()));
  }

  const zeroSpan = pointProgram({ xDomain: [1, 1] });
  assert.throws(
    () => zeroSpan.editCoordinate({
      target: "main",
      aspect: { mode: "data", ratio: 1 }
    }),
    /positive x domain span/
  );
  assert.equal(zeroSpan.semanticSpec.coordinates[0].aspect, undefined);

  const transformed = pointProgram({
    xDomain: [1, 100],
    xScale: { type: "log" }
  });
  assert.throws(
    () => transformed.editCoordinate({
      target: "main",
      aspect: { mode: "data", ratio: 1 }
    }),
    /linear x scale/
  );
  assert.equal(transformed.semanticSpec.coordinates[0].aspect, undefined);

  const explicitRange = pointProgram({ xScale: { range: [10, 390] } });
  assert.throws(
    () => explicitRange.editCoordinate({
      target: "main",
      aspect: { mode: "data", ratio: 1 }
    }),
    /conflicts with explicit x scale range/
  );
  assert.equal(explicitRange.semanticSpec.coordinates[0].aspect, undefined);
});

test("rejects multiple Cartesian scale pairs for one data-aspect coordinate", () => {
  const base = pointProgram()
    .createData({ id: "otherRows", values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
    .createPointMark({ id: "other", data: "otherRows" })
    .encodeX({ target: "other", field: "x", scale: { id: "otherX" } })
    .encodeY({ target: "other", field: "y", scale: { id: "otherY" } });
  assert.throws(
    () => base.editCoordinate({
      target: "main",
      aspect: { mode: "data", ratio: 1 }
    }),
    /one consistent x\/y scale pair/
  );
  assert.equal(base.semanticSpec.coordinates[0].aspect, undefined);
});

test("applies frame aspect to Polar and Parallel coordinate consumers", () => {
  const polar = chart()
    .createCanvas(zeroMarginCanvas)
    .createData({
      id: "polarRows",
      values: [{ angle: 0, radius: 10 }, { angle: 90, radius: 10 }]
    })
    .createPolarScatterPlot({
      id: "polarPoints",
      theta: { field: "angle", scale: { domain: [0, 360] } },
      radius: { field: "radius", scale: { domain: [0, 10] } },
      guides: false
    })
    .editCoordinate({
      target: "polar",
      aspect: { mode: "frame", ratio: 2 }
    });
  assert.deepEqual(polar.resolvedScales.radius.range, [0, 100]);
  assert.deepEqual(
    polar.graphicSpec.objects.polarPoints.items.map(item => [
      Math.round(item.properties.x),
      Math.round(item.properties.y)
    ]),
    [[200, 50], [300, 150]]
  );

  const parallel = chart()
    .createCanvas(zeroMarginCanvas)
    .createData({
      id: "parallelRows",
      values: [{ a: 0, b: 100 }, { a: 10, b: 0 }]
    })
    .createLineMark({ id: "parallelLines", data: "parallelRows" })
    .encodeParallelCoordinates({
      target: "parallelLines",
      dimensions: ["a", "b"]
    })
    .editCoordinate({
      target: "parallel",
      aspect: { mode: "frame", ratio: 2 }
    });
  assert.deepEqual(
    parallel.graphicSpec.objects.parallelLines.items[0].properties.commands,
    [{ op: "M", x: 0, y: 250 }, { op: "L", x: 400, y: 50 }]
  );

  assert.throws(
    () => polar.editCoordinate({
      target: "polar",
      aspect: { mode: "data", ratio: 1 }
    }),
    /requires a Cartesian coordinate/
  );
  assert.throws(
    () => parallel.editCoordinate({
      target: "parallel",
      aspect: { mode: "data", ratio: 1 }
    }),
    /requires a Cartesian coordinate/
  );
});
