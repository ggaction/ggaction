import assert from "node:assert/strict";
import test from "node:test";

import {
  createCompositeLegendBottomCarsLineChart,
  createCompositeLegendTopCarsLineChart,
  createConstantDashCarsLineChart,
  createDashReassignmentCarsLineChart,
  createDispersionCarsLineChart,
  createGroupReassignmentCarsLineChart,
  createMedianCarsLineChart,
  createMonotoneEditCarsLineChart,
  createNamedDashVocabularyCarsLineChart,
  createOrderedCarsLineChart,
  createQuantileCarsLineChart,
  createStepCarsLineChart
} from "../../../../examples/cars-line-chart/program.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import {
  createAggregateDispersionPrimitives,
  createAggregateMedianPrimitives,
  createAggregateOrderedPrimitives,
  createAggregateQuantilePrimitives,
  createCompositeLegendBottomPrimitives,
  createCompositeLegendTopPrimitives,
  createConstantDashPrimitives,
  createCurveMonotoneEditPrimitives,
  createCurveStepPrimitives,
  createDashReassignmentPrimitives,
  createGroupReassignmentPrimitives,
  createNamedDashVocabularyPrimitives
} from "./primitive-programs.js";
import {
  DEFAULT_DASH_PATTERNS,
  NAMED_DASH_PATTERNS,
  createAggregatePrimitiveValues,
  createCarsLineCurvePrimitiveValues,
  createCompositeLegendPrimitiveValues,
  createConstantDashPrimitiveValues,
  createDashReassignmentPrimitiveValues,
  createDispersionPrimitiveValues,
  createGroupReassignmentPrimitiveValues,
  createMedianPrimitiveValues,
  createNamedDashPrimitiveValues,
  createMonotoneReferenceCommands,
  createOrderedPrimitiveValues,
  createQuantilePrimitiveValues,
  createStepReferenceCommands
} from "./reference-values.js";
import {
  createCarsLineChartPrimitives,
  renderCarsLineChartPrimitives
} from "../primitive.program.js";

const cars = loadCars();

function withoutTrends(graphicSpec) {
  const { trends: _, ...objects } = graphicSpec.objects;
  return { objects, order: graphicSpec.order };
}

test("locks the midpoint step command fixture independently", () => {
  assert.deepEqual(
    createStepReferenceCommands([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 1 }
    ]),
    [
      { op: "M", x: 0, y: 0 },
      { op: "L", x: 1, y: 0 },
      { op: "L", x: 1, y: 2 },
      { op: "L", x: 2, y: 2 },
      { op: "L", x: 3, y: 2 },
      { op: "L", x: 3, y: 1 },
      { op: "L", x: 4, y: 1 }
    ]
  );
});

test("locks the monotone cubic command fixture independently", () => {
  assert.deepEqual(
    createMonotoneReferenceCommands([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 1 }
    ]),
    [
      { op: "M", x: 0, y: 0 },
      {
        op: "C",
        x1: 2 / 3,
        y1: 2 / 3,
        x2: 2 - 2 / 3,
        y2: 2,
        x: 2,
        y: 2
      },
      {
        op: "C",
        x1: 8 / 3,
        y1: 2,
        x2: 10 / 3,
        y2: 4 / 3,
        x: 4,
        y: 1
      }
    ]
  );
  assert.throws(
    () => createMonotoneReferenceCommands([
      { x: 1, y: 0 },
      { x: 1, y: 2 }
    ]),
    /strictly increasing x/
  );
});

test("authors the approved-target step geometry with raw primitive commands", () => {
  const values = createCarsLineCurvePrimitiveValues(cars);
  const baseline = createCarsLineChartPrimitives(cars);
  const program = createCurveStepPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsLineChartPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(withoutTrends(program.graphicSpec), withoutTrends(baseline.graphicSpec));
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.commands
    ),
    values.stepCommands
  );
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.commands.length
    ),
    [34, 34, 34]
  );
  assert.equal(findCanvasCalls(context, "bezierCurveTo").length, 0);
  assert.equal(findCanvasCalls(context, "lineTo").length, 123);
  assert.deepEqual(baseline.graphicSpec.objects.trends.children.map(
    child => child.properties.commands.length
  ), [12, 12, 12]);
});

test("authors the approved-target monotone edit with cubic commands", () => {
  const values = createCarsLineCurvePrimitiveValues(cars);
  const baseline = createCarsLineChartPrimitives(cars);
  const program = createCurveMonotoneEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsLineChartPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(withoutTrends(program.graphicSpec), withoutTrends(baseline.graphicSpec));
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.commands
    ),
    values.monotoneCommands
  );
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.strokeWidth
    ),
    [4, 4, 4]
  );
  assert.equal(findCanvasCalls(context, "bezierCurveTo").length, 33);
  assert.equal(findCanvasCalls(context, "lineTo").length, 24);
  assert.deepEqual(baseline.graphicSpec.objects.trends.children.map(
    child => child.properties.strokeWidth
  ), [2, 2, 2]);
});

test("keeps curve primitive programs free of future public curve actions", () => {
  for (const program of [
    createCurveStepPrimitives(cars),
    createCurveMonotoneEditPrimitives(cars)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    assert.equal(operations.includes("editLineMark"), false);
    assert.equal(operations.includes("createLineMark"), false);
    assert.equal(operations.at(-1), "editGraphics");
    assert.deepEqual(program.actionStack, []);
  }
});

test("matches approved curve primitives with user-facing action flows", () => {
  const pairs = [
    [createCurveStepPrimitives(cars), createStepCarsLineChart(cars), "createTitle"],
    [
      createCurveMonotoneEditPrimitives(cars),
      createMonotoneEditCarsLineChart(cars),
      "editLineMark"
    ]
  ];

  for (const [primitive, publicProgram, finalAction] of pairs) {
    const primitiveContext = createMockCanvasContext();
    const publicContext = createMockCanvasContext();
    renderCarsLineChartPrimitives(primitive, primitiveContext);
    renderCarsLineChartPrimitives(publicProgram, publicContext);

    assert.deepEqual(publicProgram.semanticSpec, primitive.semanticSpec);
    assert.deepEqual(publicProgram.graphicSpec, primitive.graphicSpec);
    assert.deepEqual(publicProgram.graphicSpec.order, primitive.graphicSpec.order);
    assert.deepEqual(publicContext.calls, primitiveContext.calls);
    assert.equal(publicProgram.trace.children.at(-1).op, finalAction);
    assert.deepEqual(publicProgram.actionStack, []);
  }
});

test("locks named and default dash recipes independently", () => {
  assert.deepEqual(NAMED_DASH_PATTERNS, {
    solid: [],
    dashed: [6, 4],
    dotted: [1, 3],
    dashdot: [6, 3, 1, 3]
  });
  assert.deepEqual(DEFAULT_DASH_PATTERNS, [
    [], [8, 4], [3, 3], [12, 4], [8, 3, 2, 3]
  ]);
});

test("authors four named dash styles and a matching dash legend", () => {
  const values = createNamedDashPrimitiveValues(cars);
  const program = createNamedDashVocabularyPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsLineChartPrimitives(program, context);

  assert.deepEqual(values.keys, [8, 4, 6, 3]);
  assert.equal(values.validCars.some(row => row.Cylinders === 5), false);
  assert.deepEqual(
    program.semanticSpec.scales.find(scale => scale.id === "strokeDash").range,
    ["solid", "dashed", "dotted", "dashdot"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(child => child.properties.strokeDash),
    Object.values(NAMED_DASH_PATTERNS)
  );
  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendSymbols.children.map(
      child => child.properties.strokeDash
    ),
    Object.values(NAMED_DASH_PATTERNS)
  );
  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendLabels.children.map(
      child => child.properties.text
    ),
    ["8", "4", "6", "3"]
  );
  assert.equal(findCanvasCalls(context, "setLineDash").length > 0, true);
});

test("authors a scale-free constant dotted line after legend cleanup", () => {
  const values = createConstantDashPrimitiveValues(cars);
  const program = createConstantDashPrimitives(cars);

  assert.equal(values.series.length, 1);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.strokeDash, {
    datum: "dotted"
  });
  assert.deepEqual(
    program.semanticSpec.scales.map(scale => scale.id),
    ["x", "y", "originDash"]
  );
  assert.equal(program.semanticSpec.guides.legend, undefined);
  assert.deepEqual(program.graphicSpec.order, ["canvas", "trends"]);
  assert.deepEqual(
    program.graphicSpec.objects.trends.children[0].properties.strokeDash,
    [1, 3]
  );
});

test("authors group-only Cylinder series with no scale or legend", () => {
  const values = createGroupReassignmentPrimitiveValues(cars);
  const program = createGroupReassignmentPrimitives(cars);

  assert.deepEqual(values.keys, [8, 4, 6, 3, 5]);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.group, {
    field: "Cylinders",
    fieldType: "nominal"
  });
  assert.equal(program.semanticSpec.layers[0].encoding.strokeDash, undefined);
  assert.equal(program.semanticSpec.guides.legend, undefined);
  assert.equal(program.graphicSpec.objects.trends.children.length, 5);
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(child => child.properties.strokeDash),
    [[], [], [], [], []]
  );
});

test("authors dash reassignment with retained old scale and refreshed legend", () => {
  const values = createDashReassignmentPrimitiveValues(cars);
  const program = createDashReassignmentPrimitives(cars);

  assert.deepEqual(values.keys, [8, 4, 6, 3, 5]);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.strokeDash, {
    field: "Cylinders",
    fieldType: "nominal",
    scale: "strokeDash"
  });
  assert.deepEqual(
    program.semanticSpec.scales.map(scale => scale.id),
    ["x", "y", "originDash", "strokeDash"]
  );
  assert.deepEqual(program.semanticSpec.guides.legend.series, {
    channels: ["strokeDash"],
    scales: ["strokeDash"],
    title: "Cylinders"
  });
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(child => child.properties.strokeDash),
    DEFAULT_DASH_PATTERNS
  );
  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendLabels.children.map(
      child => child.properties.text
    ),
    ["8", "4", "6", "3", "5"]
  );
});

test("keeps dash and reassignment targets primitive-only", () => {
  for (const program of [
    createNamedDashVocabularyPrimitives(cars),
    createConstantDashPrimitives(cars),
    createGroupReassignmentPrimitives(cars),
    createDashReassignmentPrimitives(cars)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    for (const futureAction of [
      "createLineMark", "encodeGroup", "encodeStrokeDash", "createLegend"
    ]) {
      assert.equal(operations.includes(futureAction), false, futureAction);
    }
    assert.deepEqual(program.actionStack, []);
  }
});

test("matches approved dash and reassignment primitives with public actions", () => {
  const pairs = [
    [
      createNamedDashVocabularyPrimitives(cars),
      createNamedDashVocabularyCarsLineChart(cars),
      "createLegend"
    ],
    [
      createConstantDashPrimitives(cars),
      createConstantDashCarsLineChart(cars),
      "encodeStrokeDash"
    ],
    [
      createGroupReassignmentPrimitives(cars),
      createGroupReassignmentCarsLineChart(cars),
      "encodeGroup"
    ],
    [
      createDashReassignmentPrimitives(cars),
      createDashReassignmentCarsLineChart(cars),
      "encodeStrokeDash"
    ]
  ];

  for (const [primitive, publicProgram, finalAction] of pairs) {
    const primitiveContext = createMockCanvasContext();
    const publicContext = createMockCanvasContext();
    renderCarsLineChartPrimitives(primitive, primitiveContext);
    renderCarsLineChartPrimitives(publicProgram, publicContext);

    assert.deepEqual(publicProgram.semanticSpec, primitive.semanticSpec);
    assert.deepEqual(publicProgram.graphicSpec, primitive.graphicSpec);
    assert.deepEqual(publicProgram.graphicSpec.order, primitive.graphicSpec.order);
    assert.deepEqual(publicContext.calls, primitiveContext.calls);
    assert.equal(publicProgram.trace.children.at(-1).op, finalAction);
    assert.deepEqual(publicProgram.actionStack, []);
  }
});

test("locks aggregate reference values at the Year by Origin grain", () => {
  const median = createMedianPrimitiveValues(cars);
  const dispersion = createDispersionPrimitiveValues(cars);
  const quantile = createQuantilePrimitiveValues(cars);
  const ordered = createOrderedPrimitiveValues(cars);

  for (const values of [median, dispersion, quantile, ordered]) {
    assert.equal(values.validCars.length, 406);
    assert.equal(values.aggregates.length, 36);
    assert.deepEqual(values.origins, ["USA", "Europe", "Japan"]);
    assert.deepEqual(values.series.map(series => series.values.length), [12, 12, 12]);
  }
  assert.deepEqual(
    median.aggregates.slice(0, 6).map(item => item.value),
    [11, 17.5, 14.75, 16.25, 14.25, 19]
  );
  assert.deepEqual(
    dispersion.aggregates.slice(0, 6).map(item => item.value),
    [
      2.77401454487115,
      2.786873995477131,
      0.3535533905932738,
      2.4958298553119898,
      2.5663562127121624,
      2.9025850547399985
    ]
  );
  assert.deepEqual(
    quantile.aggregates.slice(0, 6).map(item => item.value),
    [13.75, 17.5, 14.875, 18.25, 15.5, 19.5]
  );
  assert.deepEqual(
    ordered.aggregates.slice(0, 6).map(item => item.value),
    [16, 20.5, 14.5, 19, 20.5, 20]
  );
});

test("omits aggregate groups that do not have a required valid sample", () => {
  const rows = [
    { Year: "2020-01-01", Origin: "A", Acceleration: 1, Horsepower: null },
    { Year: "2021-01-01", Origin: "A", Acceleration: 2, Horsepower: 20 },
    { Year: "2021-01-01", Origin: "A", Acceleration: 4, Horsepower: 10 },
    { Year: "2022-01-01", Origin: "A", Acceleration: 3, Horsepower: 30 },
    { Year: "2022-01-01", Origin: "A", Acceleration: 5, Horsepower: 40 }
  ];
  const dispersion = createAggregatePrimitiveValues(rows, "stdev");
  const ordered = createAggregatePrimitiveValues(rows, {
    op: "first",
    orderBy: "Horsepower"
  });

  assert.deepEqual(dispersion.aggregates.map(item => item.year), [2021, 2022]);
  assert.deepEqual(ordered.aggregates.map(item => item.year), [2021, 2022]);
  assert.deepEqual(ordered.aggregates.map(item => item.value), [4, 3]);
});

test("authors the four aggregate targets with concrete paths and inferred guides", () => {
  const cases = [
    [
      createAggregateMedianPrimitives(cars),
      "median",
      "median(Acceleration)",
      [10, 12, 14, 16, 18, 20]
    ],
    [
      createAggregateDispersionPrimitives(cars),
      "stdev",
      "stdev(Acceleration)",
      [0, 1, 2, 3, 4, 5, 6]
    ],
    [
      createAggregateQuantilePrimitives(cars),
      { op: "quantile", probability: 0.75 },
      "quantile(Acceleration, 0.75)",
      [12, 14, 16, 18, 20, 22]
    ],
    [
      createAggregateOrderedPrimitives(cars),
      { op: "first", orderBy: "Horsepower", order: "ascending" },
      "first(Acceleration, Horsepower ascending)",
      [12, 15, 18, 21, 24, 27]
    ]
  ];

  for (const [program, aggregate, title, ticks] of cases) {
    const context = createMockCanvasContext();
    renderCarsLineChartPrimitives(program, context);

    assert.deepEqual(program.semanticSpec.layers[0].encoding.y.aggregate, aggregate);
    assert.equal(program.semanticSpec.guides.axis.y.title, title);
    assert.equal(program.graphicSpec.objects.yAxisTitle.properties.text, title);
    assert.equal(program.graphicSpec.objects.trends.children.length, 3);
    assert.deepEqual(
      program.graphicSpec.objects.trends.children.map(child => child.properties.commands.length),
      [12, 12, 12]
    );
    assert.deepEqual(
      program.graphicSpec.objects.yAxisLabels.children.map(child => Number(child.properties.text)),
      ticks
    );
    assert.equal(findCanvasCalls(context, "stroke").length > 0, true);
    const yValues = program.graphicSpec.objects.trends.children.flatMap(child =>
      child.properties.commands.map(command => command.y)
    );
    assert.equal(yValues.every(Number.isFinite), true);
  }
});

test("matches approved aggregate primitives with public programs", () => {
  for (const [primitive, publicProgram] of [
    [createAggregateMedianPrimitives(cars), createMedianCarsLineChart(cars)],
    [createAggregateDispersionPrimitives(cars), createDispersionCarsLineChart(cars)],
    [createAggregateQuantilePrimitives(cars), createQuantileCarsLineChart(cars)],
    [createAggregateOrderedPrimitives(cars), createOrderedCarsLineChart(cars)]
  ]) {
    const primitiveContext = createMockCanvasContext();
    const publicContext = createMockCanvasContext();
    renderCarsLineChartPrimitives(primitive, primitiveContext);
    renderCarsLineChartPrimitives(publicProgram, publicContext);

    assert.deepEqual(publicProgram.semanticSpec, primitive.semanticSpec);
    assert.deepEqual(publicProgram.graphicSpec, primitive.graphicSpec);
    assert.deepEqual(publicProgram.graphicSpec.order, primitive.graphicSpec.order);
    assert.deepEqual(publicContext.calls, primitiveContext.calls);
    assert.deepEqual(publicProgram.actionStack, []);
  }
});

test("locks composite legend item-local anchors and occupied bounds", () => {
  for (const position of ["top", "bottom"]) {
    const values = createCompositeLegendPrimitiveValues(cars, { position });
    const { background } = values.legend;

    assert.equal(values.legend.items.length, 3);
    assert.equal(background.x >= 0, true);
    assert.equal(background.y >= 0, true);
    assert.equal(background.x + background.width <= values.canvas.width, true);
    assert.equal(background.y + background.height <= values.canvas.height, true);
    for (const item of values.legend.items) {
      assert.equal(item.pointX, (item.x1 + item.x2) / 2);
      assert.equal(item.labelX - item.x2, 10);
      assert.equal(item.x1 >= background.x, true);
      assert.equal(item.labelX <= background.x + background.width, true);
    }
  }
});

test("authors top and bottom layered legend primitives in declared order", () => {
  for (const [position, program] of [
    ["top", createCompositeLegendTopPrimitives(cars)],
    ["bottom", createCompositeLegendBottomPrimitives(cars)]
  ]) {
    const values = createCompositeLegendPrimitiveValues(cars, { position });
    const context = createMockCanvasContext();
    renderCarsLineChartPrimitives(program, context);
    const order = program.graphicSpec.order;
    const background = order.indexOf("seriesLegendBackground");
    const lines = order.indexOf("seriesLegendSymbolLines");
    const points = order.indexOf("seriesLegendSymbolPoints");
    const labels = order.indexOf("seriesLegendLabels");
    const title = order.indexOf("seriesLegendTitle");

    assert.equal(background < lines && lines < points, true);
    assert.equal(points < labels && labels < title, true);
    assert.deepEqual(
      program.graphicSpec.objects.seriesLegendSymbolLines.children.map(
        child => [child.properties.x1, child.properties.y1,
          child.properties.x2, child.properties.y2]
      ),
      values.legend.items.map(item => [item.x1, item.y, item.x2, item.y])
    );
    assert.deepEqual(
      program.graphicSpec.objects.seriesLegendSymbolPoints.children.map(
        child => [child.properties.x, child.properties.y]
      ),
      values.legend.items.map(item => [item.pointX, item.y])
    );
    assert.deepEqual(
      program.graphicSpec.objects.seriesLegendLabels.children.map(
        child => child.properties.x
      ),
      values.legend.items.map(item => item.labelX)
    );
    assert.equal(
      program.graphicSpec.objects.seriesLegendSymbolLines.children.every(
        child => child.properties.strokeWidth === 3
      ),
      true
    );
    assert.equal(
      program.graphicSpec.objects.seriesLegendSymbolPoints.children.every(
        child => child.properties.radius === 5
      ),
      true
    );
    assert.equal(findCanvasCalls(context, "arc").length >= 3, true);
    assert.deepEqual(program.actionStack, []);
  }
});

test("keeps approved composite legend targets primitive-only", () => {
  for (const program of [
    createCompositeLegendTopPrimitives(cars),
    createCompositeLegendBottomPrimitives(cars)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    for (const futureAction of ["createLegend", "createGuides", "createTitle"]) {
      assert.equal(operations.includes(futureAction), false, futureAction);
    }
    assert.equal(operations.at(-1), "editGraphics");
  }
});

test("matches approved composite legend primitives with public actions", () => {
  for (const [primitive, publicProgram] of [
    [
      createCompositeLegendTopPrimitives(cars),
      createCompositeLegendTopCarsLineChart(cars)
    ],
    [
      createCompositeLegendBottomPrimitives(cars),
      createCompositeLegendBottomCarsLineChart(cars)
    ]
  ]) {
    const primitiveContext = createMockCanvasContext();
    const publicContext = createMockCanvasContext();
    renderCarsLineChartPrimitives(primitive, primitiveContext);
    renderCarsLineChartPrimitives(publicProgram, publicContext);

    assert.deepEqual(publicProgram.semanticSpec, primitive.semanticSpec);
    assert.deepEqual(publicProgram.graphicSpec, primitive.graphicSpec);
    assert.deepEqual(publicProgram.graphicSpec.order, primitive.graphicSpec.order);
    assert.deepEqual(publicContext.calls, primitiveContext.calls);
    assert.equal(publicProgram.trace.children.at(-1).op, "createTitle");
    assert.deepEqual(publicProgram.actionStack, []);
  }
});

test("rejects composite legend layouts that do not fit their margin", () => {
  assert.throws(
    () => createCompositeLegendPrimitiveValues(cars, {
      position: "top",
      margin: { top: 100, right: 40, bottom: 60, left: 80 }
    }),
    /more top-margin space/
  );
  assert.throws(
    () => createCompositeLegendPrimitiveValues(cars, {
      position: "bottom",
      margin: { top: 80, right: 40, bottom: 100, left: 80 }
    }),
    /more bottom-margin space/
  );
  assert.throws(
    () => createCompositeLegendPrimitiveValues(cars, { position: "left" }),
    /must be "top" or "bottom"/
  );
});
