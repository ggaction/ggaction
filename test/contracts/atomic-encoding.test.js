import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";

const canvas = Object.freeze({
  width: 400,
  height: 300,
  margin: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 })
});

function pointBase(values = [
  { a: 2, b: 8, group: "A", outline: "U", measure: 1 },
  { a: 8, b: 2, group: "B", outline: "V", measure: 9 }
], canvasOptions = canvas) {
  return chart()
    .createCanvas(canvasOptions)
    .createData({ id: "rows", values })
    .createPointMark({ id: "points" })
    .encodeX({
      target: "points",
      field: "a",
      scale: { id: "x", domain: [0, 10], range: [0, 100] }
    })
    .encodeY({
      target: "points",
      field: "b",
      scale: { id: "y", domain: [0, 10], range: [0, 100] }
    });
}

function stateWithoutTrace(program) {
  return {
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    materializationConfigs: program.materializationConfigs,
    resolvedScales: program.resolvedScales,
    context: program.context,
    children: program.children,
    compositionSpec: program.compositionSpec
  };
}

test("exposes atomic encoding only from the full program", () => {
  assert.equal(typeof chart().encodeChannels, "function");
  assert.equal(basicChart().encodeChannels, undefined);
});

test("matches the corresponding focused action for one channel", () => {
  const base = pointBase();
  const payload = Object.freeze({
    field: "b",
    scale: Object.freeze({ id: "x", domain: Object.freeze([0, 10]), range: Object.freeze([0, 100]) })
  });
  const focused = base.encodeX({ target: "points", ...payload });
  const batched = base.encodeChannels({
    target: "points",
    channels: Object.freeze({ x: payload })
  });

  assert.deepEqual(stateWithoutTrace(batched), stateWithoutTrace(focused));
  assert.equal(batched.trace.children.at(-1).op, "encodeChannels");
  assert.equal(
    batched.trace.children.at(-1).children.some(node => node.op === "editSemantic"),
    true
  );
  assert.equal(
    batched.trace.children.at(-1).children.some(node => node.op === "encodeX"),
    false
  );
});

test("uses canonical channel order independently of property insertion order", () => {
  const base = pointBase();
  const forward = base.encodeChannels({
    target: "points",
    channels: {
      x: { field: "b", scale: { id: "x", domain: [0, 10], range: [0, 100] } },
      y: { field: "a", scale: { id: "y", domain: [0, 10], range: [0, 100] } },
      color: { field: "group" },
      stroke: { field: "outline" },
      size: { field: "measure", scale: { domain: [0, 10], range: [20, 120] } }
    }
  });
  const reverse = base.encodeChannels({
    target: "points",
    channels: {
      size: { field: "measure", scale: { domain: [0, 10], range: [20, 120] } },
      stroke: { field: "outline" },
      color: { field: "group" },
      y: { field: "a", scale: { id: "y", domain: [0, 10], range: [0, 100] } },
      x: { field: "b", scale: { id: "x", domain: [0, 10], range: [0, 100] } }
    }
  });

  assert.deepEqual(forward, reverse);
  const operations = forward.trace.children.at(-1).children.map(node => node.op);
  assert.deepEqual(
    operations,
    reverse.trace.children.at(-1).children.map(node => node.op)
  );
  assert.deepEqual(
    operations.slice(-2),
    ["rematerializeEncodingScales", "rematerializePointMark"]
  );
  assert.equal(
    operations.some(operation => [
      "encodeX", "encodeY", "encodeColor", "encodeStroke", "encodeSize"
    ].includes(operation)),
    false
  );
});

test("swaps x and y fields against the final fixed scales", () => {
  const swapped = pointBase().encodeChannels({
    target: "points",
    channels: {
      x: { field: "b", scale: { id: "x", domain: [0, 10], range: [0, 100] } },
      y: { field: "a", scale: { id: "y", domain: [0, 10], range: [0, 100] } }
    }
  });

  assert.deepEqual(
    swapped.graphicSpec.objects.points.items.map(item => [
      item.properties.x,
      item.properties.y
    ]),
    [[80, 20], [20, 80]]
  );
});

test("updates primary and secondary rectangle endpoints from one final draft", () => {
  const base = chart()
    .createCanvas(canvas)
    .createData({
      id: "rows",
      values: [{ x0: 1, x1: 2, y0: 3, y1: 4, ax0: 2, ax1: 4, ay0: 1, ay1: 5 }]
    })
    .createRectMark({ id: "cells" })
    .encodeX({ target: "cells", field: "x0" })
    .encodeX2({ target: "cells", field: "x1" })
    .encodeY({ target: "cells", field: "y0" })
    .encodeY2({ target: "cells", field: "y1" });
  const encoded = base.encodeChannels({
    target: "cells",
    channels: {
      x: { field: "ax0" },
      x2: { field: "ax1" },
      y: { field: "ay0" },
      y2: { field: "ay1" }
    }
  });

  assert.deepEqual(encoded.semanticSpec.layers[0].encoding, {
    x: { field: "ax0", fieldType: "quantitative", scale: "x" },
    x2: { field: "ax1", fieldType: "quantitative", scale: "x" },
    y: { field: "ay0", fieldType: "quantitative", scale: "y" },
    y2: { field: "ay1", fieldType: "quantitative", scale: "y" }
  });
  assert.equal(encoded.graphicSpec.objects.cells.items.length, 1);
  assert.equal(
    encoded.trace.children.at(-1).children.filter(
      node => node.op === "rematerializeRectMark"
    ).length,
    1
  );
});

test("validates an offset against the final categorical parent encoding", () => {
  const values = [
    { year: 1850, category: "A", value: 2, sex: "men", team: "x" },
    { year: 1850, category: "A", value: 4, sex: "women", team: "y" },
    { year: 1860, category: "B", value: 8, sex: "men", team: "x" },
    { year: 1860, category: "B", value: 10, sex: "women", team: "y" }
  ];
  const base = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ target: "bars", field: "year", fieldType: "ordinal" })
    .encodeY({ target: "bars", field: "value" })
    .encodeXOffset({ target: "bars", field: "sex" });
  const encoded = base.encodeChannels({
    target: "bars",
    channels: {
      x: { field: "category", fieldType: "nominal" },
      xOffset: { field: "team", paddingInner: 0.2 }
    }
  });
  const layer = encoded.semanticSpec.layers[0];

  assert.equal(layer.encoding.x.field, "category");
  assert.equal(layer.encoding.xOffset.field, "team");
  assert.equal(layer.encoding.group.field, "team");
  assert.equal(layer.layout.mode, "group");
  assert.deepEqual(encoded.resolvedScales.xOffset.domain, ["x", "y"]);
  assert.equal(encoded.resolvedScales.xOffset.paddingInner, 0.2);
  assert.equal(encoded.graphicSpec.objects.bars.items.length, 4);
});

test("transposes aggregate bar roles from one final x/y state", () => {
  const base = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 30, bottom: 50, left: 60 }
    })
    .createData({
      id: "rows",
      values: [
        { category: "A", amount: 2 },
        { category: "B", amount: 8 }
      ]
    })
    .createBarMark({ id: "bars" })
    .encodeX({
      target: "bars",
      field: "category",
      fieldType: "nominal",
      scale: { id: "categoryX" }
    })
    .encodeY({
      target: "bars",
      field: "amount",
      scale: { id: "amountY" }
    })
    .createAxes();
  const encoded = base.encodeChannels({
    target: "bars",
    channels: {
      x: { field: "amount", scale: { id: "amountX" } },
      y: {
        field: "category",
        fieldType: "nominal",
        scale: { id: "categoryY" }
      }
    }
  });
  const layer = encoded.semanticSpec.layers[0];

  assert.equal(layer.encoding.x.field, "amount");
  assert.equal(layer.encoding.x.fieldType, "quantitative");
  assert.equal(layer.encoding.x.scale, "amountX");
  assert.equal(layer.encoding.y.field, "category");
  assert.equal(layer.encoding.y.fieldType, "nominal");
  assert.equal(layer.encoding.y.scale, "categoryY");
  assert.equal(encoded.semanticSpec.guides.axis.x.scale, "amountX");
  assert.equal(encoded.semanticSpec.guides.axis.y.scale, "categoryY");
  assert.equal(encoded.guideConfigs.axis.x.ticks.mode, "count");
  assert.equal(encoded.guideConfigs.axis.x.labels.mode, "count");
  assert.equal(encoded.guideConfigs.axis.y.ticks.mode, "values");
  assert.equal(encoded.guideConfigs.axis.y.labels.mode, "values");
  assert.deepEqual(encoded.guideConfigs.axis.y.ticks.values, ["A", "B"]);
  assert.deepEqual(encoded.guideConfigs.axis.y.labels.values, ["A", "B"]);
  assert.equal(encoded.graphicSpec.objects.bars.items.length, 2);
  assert.equal(encoded.graphicSpec.objects.xAxisTicks.items.length > 0, true);
  assert.equal(encoded.graphicSpec.objects.yAxisTicks.items.length, 2);
  assert.equal(base.semanticSpec.layers[0].encoding.x.field, "category");
  assert.equal(base.semanticSpec.layers[0].encoding.y.field, "amount");
});

test("rejects a transpose when its final categorical channel cannot own a continuous grid", () => {
  const base = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 30, bottom: 50, left: 60 }
    })
    .createData({
      id: "rows",
      values: [
        { category: "A", amount: 2 },
        { category: "B", amount: 8 }
      ]
    })
    .createBarMark({ id: "bars" })
    .encodeX({ target: "bars", field: "category", fieldType: "nominal" })
    .encodeY({ target: "bars", field: "amount" })
    .createHorizontalGrid();
  const before = stateWithoutTrace(base);
  const trace = base.trace;

  assert.throws(
    () => base.encodeChannels({
      target: "bars",
      channels: {
        x: { field: "amount", scale: { id: "amountX" } },
        y: {
          field: "category",
          fieldType: "nominal",
          scale: { id: "categoryY" }
        }
      }
    }),
    /continuous scale/
  );
  assert.deepEqual(stateWithoutTrace(base), before);
  assert.strictEqual(base.trace, trace);
});

test("updates path grouping and ordering before one final series materialization", () => {
  const values = [
    { x: 0, y: 1, series: "A", nextSeries: "U", order: 2 },
    { x: 1, y: 2, series: "A", nextSeries: "U", order: 1 },
    { x: 0, y: 3, series: "B", nextSeries: "V", order: 2 },
    { x: 1, y: 4, series: "B", nextSeries: "V", order: 1 }
  ];
  const base = chart()
    .createCanvas(canvas)
    .createData({ id: "rows", values })
    .createLineMark({ id: "lines" })
    .encodeX({ target: "lines", field: "x" })
    .encodeY({ target: "lines", field: "y" })
    .encodeGroup({ target: "lines", field: "series" })
    .encodePathOrder({ target: "lines", field: "x" });
  const encoded = base.encodeChannels({
    target: "lines",
    channels: {
      group: { field: "nextSeries" },
      pathOrder: { field: "order", order: "descending" }
    }
  });

  assert.deepEqual(encoded.semanticSpec.layers[0].encoding.group, {
    field: "nextSeries",
    fieldType: "nominal"
  });
  assert.deepEqual(encoded.semanticSpec.layers[0].encoding.pathOrder, {
    field: "order",
    fieldType: "quantitative",
    order: "descending"
  });
  assert.equal(encoded.graphicSpec.objects.lines.items.length, 2);
  assert.equal(
    encoded.trace.children.at(-1).children.filter(
      node => node.op === "rematerializeLineMark"
    ).length,
    1
  );
});

test("updates supported Parallel appearance without replacing its dimensions", () => {
  const base = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 80, bottom: 30, left: 30 }
    })
    .createData({
      id: "rows",
      values: [
        { a: 1, b: 2, group: "A" },
        { a: 2, b: 3, group: "B" }
      ]
    })
    .createParallelCoordinates({
      id: "lines",
      dimensions: ["a", "b"],
      guides: false
    });
  const beforeDimensions = base.semanticSpec.layers[0].encoding.parallel;
  const encoded = base.encodeChannels({
    target: "lines",
    channels: { color: { field: "group" } }
  });

  assert.deepEqual(
    encoded.semanticSpec.layers[0].encoding.parallel,
    beforeDimensions
  );
  assert.deepEqual(
    encoded.graphicSpec.objects.lines.items.map(item => item.properties.stroke),
    ["#4c78a8", "#f58518"]
  );
});

test("updates theta and r through the public r alias", () => {
  const base = chart()
    .createCanvas(canvas)
    .createData({
      id: "rows",
      values: [
        { theta: 0, nextTheta: 90, radius: 1, nextRadius: 4 },
        { theta: 180, nextTheta: 270, radius: 2, nextRadius: 3 }
      ]
    })
    .createPointMark({ id: "polar" })
    .encodeTheta({ target: "polar", field: "theta" })
    .encodeR({ target: "polar", field: "radius" });
  const encoded = base.encodeChannels({
    target: "polar",
    channels: {
      theta: { field: "nextTheta" },
      r: { field: "nextRadius" }
    }
  });

  assert.equal(encoded.semanticSpec.layers[0].encoding.theta.field, "nextTheta");
  assert.equal(encoded.semanticSpec.layers[0].encoding.radius.field, "nextRadius");
  assert.equal(encoded.semanticSpec.layers[0].encoding.r, undefined);
  assert.equal(encoded.graphicSpec.objects.polar.items.length, 2);
});

test("rebuilds combined and sampled legends from final appearance channels", () => {
  const values = [
    { x: 0, y: 1, group: "A", nextGroup: "U", measure: 1, nextMeasure: 9 },
    { x: 1, y: 2, group: "B", nextGroup: "V", measure: 9, nextMeasure: 1 }
  ];
  const base = chart()
    .createCanvas({
      width: 500,
      height: 400,
      margin: { top: 40, right: 140, bottom: 40, left: 40 }
    })
    .createData({ id: "rows", values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeStroke({ field: "group" })
    .encodeSize({ field: "measure" })
    .createLegend({ target: "points", channels: ["color", "stroke"] })
    .createLegend({ target: "points", channels: ["size"] });
  const encoded = base.encodeChannels({
    target: "points",
    channels: {
      color: { field: "nextGroup" },
      stroke: { field: "nextGroup" },
      size: {
        field: "nextMeasure",
        scale: { domain: [0, 10], range: [20, 120] }
      }
    }
  });
  const root = encoded.trace.children.at(-1);

  assert.equal(encoded.semanticSpec.guides.legend.series.title, "nextGroup");
  assert.equal(encoded.semanticSpec.guides.legend.size.title, "nextMeasure");
  assert.deepEqual(
    encoded.graphicSpec.objects.points.items.map(item => [
      item.properties.fill,
      item.properties.stroke
    ]),
    [["#4c78a8", "#4c78a8"], ["#f58518", "#f58518"]]
  );
  assert.equal(root.children.filter(node => node.op === "rematerializePointMark").length, 1);
  assert.equal(root.children.filter(node => node.op === "rematerializeLegend").length, 1);
});

test("assigns point shape, opacity, and angle from one final appearance draft", () => {
  const base = pointBase([
    { a: 2, b: 8, symbol: "A", alpha: 0.25, direction: 15 },
    { a: 8, b: 2, symbol: "B", alpha: 0.75, direction: 195 }
  ]);
  const encoded = base.encodeChannels({
    target: "points",
    channels: {
      shape: { field: "symbol" },
      opacity: {
        field: "alpha",
        scale: { domain: [0, 1], range: [0.1, 0.9] }
      },
      angle: { field: "direction" }
    }
  });
  const layer = encoded.semanticSpec.layers[0];
  const root = encoded.trace.children.at(-1);

  assert.equal(layer.encoding.shape.field, "symbol");
  assert.equal(layer.encoding.opacity.field, "alpha");
  assert.equal(layer.encoding.angle.field, "direction");
  assert.deepEqual(
    encoded.graphicSpec.objects.points.items.map(item => item.properties.opacity),
    [0.30000000000000004, 0.7000000000000001]
  );
  assert.equal(root.children.filter(node => node.op === "rematerializePointMark").length, 1);
});

test("assigns line stroke width, dash, and opacity at final series grain", () => {
  const values = [
    { x: 0, y: 1, series: "A", width: 1, dash: "solid", alpha: 0.25 },
    { x: 1, y: 2, series: "A", width: 1, dash: "solid", alpha: 0.25 },
    { x: 0, y: 3, series: "B", width: 4, dash: "dashed", alpha: 0.75 },
    { x: 1, y: 4, series: "B", width: 4, dash: "dashed", alpha: 0.75 }
  ];
  const base = chart()
    .createCanvas(canvas)
    .createData({ id: "rows", values })
    .createLineMark({ id: "lines" })
    .encodeX({ target: "lines", field: "x" })
    .encodeY({ target: "lines", field: "y" })
    .encodeGroup({ target: "lines", field: "series" });
  const encoded = base.encodeChannels({
    target: "lines",
    channels: {
      opacity: {
        field: "alpha",
        scale: { domain: [0, 1], range: [0.2, 1] }
      },
      strokeWidth: {
        field: "width",
        scale: { domain: [0, 5], range: [1, 6] }
      },
      strokeDash: { field: "dash" }
    }
  });
  const layer = encoded.semanticSpec.layers[0];
  const root = encoded.trace.children.at(-1);

  assert.equal(layer.encoding.opacity.field, "alpha");
  assert.equal(layer.encoding.strokeWidth.field, "width");
  assert.equal(layer.encoding.strokeDash.field, "dash");
  assert.deepEqual(
    encoded.graphicSpec.objects.lines.items.map(item => [
      item.properties.opacity,
      item.properties.strokeWidth,
      item.properties.strokeDash
    ]),
    [[0.4, 2, []], [0.8, 5, [8, 4]]]
  );
  assert.equal(root.children.filter(node => node.op === "rematerializeLineMark").length, 1);
});

test("assigns independent text position and content from one final draft", () => {
  const base = chart()
    .createCanvas(canvas)
    .createData({
      id: "rows",
      values: [
        { x: 1, y: 3, nextX: 2, nextY: 4, label: "first" },
        { x: 2, y: 4, nextX: 3, nextY: 5, label: "second" }
      ]
    })
    .createTextMark({ id: "labels" })
    .encodeX({ target: "labels", field: "x" })
    .encodeY({ target: "labels", field: "y" })
    .encodeText({ target: "labels", value: "old" });
  const encoded = base.encodeChannels({
    target: "labels",
    channels: {
      x: { field: "nextX" },
      y: { field: "nextY" },
      text: { field: "label" }
    }
  });
  const items = encoded.graphicSpec.objects.labels.items;
  const root = encoded.trace.children.at(-1);

  assert.deepEqual(items.map(item => item.properties.text), ["first", "second"]);
  assert.equal(encoded.semanticSpec.layers[0].encoding.x.field, "nextX");
  assert.equal(encoded.semanticSpec.layers[0].encoding.y.field, "nextY");
  assert.equal(root.children.filter(node => node.op === "rematerializeTextMark").length, 1);
});

test("accepts identical explicit patches when two channels share one scale", () => {
  const encoded = pointBase().encodeChannels({
    target: "points",
    channels: {
      color: {
        field: "group",
        scale: { id: "paint", domain: ["A", "B"], range: ["red", "blue"] }
      },
      stroke: {
        field: "group",
        scale: { id: "paint", domain: ["A", "B"], range: ["red", "blue"] }
      }
    }
  });

  assert.equal(encoded.semanticSpec.layers[0].encoding.color.scale, "paint");
  assert.equal(encoded.semanticSpec.layers[0].encoding.stroke.scale, "paint");
  assert.deepEqual(encoded.resolvedScales.paint.domain, ["A", "B"]);
  assert.deepEqual(
    encoded.graphicSpec.objects.points.items.map(item => [
      item.properties.fill,
      item.properties.stroke
    ]),
    [["red", "red"], ["blue", "blue"]]
  );
});

test("refreshes every external consumer of a reassigned shared scale", () => {
  const base = chart()
    .createCanvas(canvas)
    .createData({ id: "leftRows", values: [{ a: 0, b: 100 }, { a: 10, b: 200 }] })
    .createPointMark({ id: "left", data: "leftRows" })
    .encodeX({ target: "left", field: "a", scale: { id: "sharedX" } })
    .encodeY({ target: "left", datum: 20 })
    .createData({ id: "rightRows", values: [{ a: 5 }] })
    .createPointMark({ id: "right", data: "rightRows" })
    .encodeX({ target: "right", field: "a", scale: { id: "sharedX" } })
    .encodeY({ target: "right", datum: 40 });
  const beforeRightX = base.graphicSpec.objects.right.items[0].properties.x;
  const encoded = base.encodeChannels({
    target: "left",
    channels: { x: { field: "b", scale: { id: "sharedX" } } }
  });
  const root = encoded.trace.children.at(-1);

  assert.deepEqual(encoded.resolvedScales.sharedX.domain, [5, 200]);
  assert.notEqual(
    encoded.graphicSpec.objects.right.items[0].properties.x,
    beforeRightX
  );
  assert.equal(
    root.children.filter(node => node.op === "rematerializePointMark").length,
    2
  );
});

test("removes a field stroke and its legend without leaving stale graphics", () => {
  const base = pointBase(undefined, {
    width: 500,
    height: 400,
    margin: { top: 40, right: 140, bottom: 40, left: 40 }
  })
    .encodeStroke({ target: "points", field: "outline" })
    .createLegend({ target: "points", channels: ["stroke"] });
  const encoded = base.encodeChannels({
    target: "points",
    channels: {
      x: { field: "b" },
      stroke: { value: "#123456" }
    }
  });

  assert.equal(encoded.semanticSpec.layers[0].encoding.stroke, undefined);
  assert.equal(encoded.markConfigs.points.stroke, "#123456");
  assert.equal(encoded.semanticSpec.guides.legend?.stroke, undefined);
  assert.equal(encoded.guideConfigs.legend?.stroke, undefined);
  assert.equal(encoded.graphicSpec.objects.strokeLegendSymbolPoints, undefined);
  assert.deepEqual(
    encoded.graphicSpec.objects.points.items.map(item => item.properties.stroke),
    ["#123456", "#123456"]
  );
});

test("keeps the original program unchanged when any requested channel is invalid", () => {
  const base = pointBase();
  const before = stateWithoutTrace(base);
  const trace = base.trace;
  const channels = Object.freeze({
    x: Object.freeze({ field: "b" }),
    stroke: Object.freeze({ field: "missing" })
  });

  assert.throws(
    () => base.encodeChannels({ target: "points", channels }),
    /missing|does not exist|Unknown/
  );
  assert.deepEqual(stateWithoutTrace(base), before);
  assert.strictEqual(base.trace, trace);
  assert.deepEqual(channels, { x: { field: "b" }, stroke: { field: "missing" } });
});

test("rejects an unsupported mark and channel combination without any write", () => {
  const base = pointBase();
  const before = stateWithoutTrace(base);
  const trace = base.trace;

  assert.throws(
    () => base.encodeChannels({
      target: "points",
      channels: {
        x: { field: "b" },
        pathOrder: { field: "measure" }
      }
    }),
    /path order|eligible|line|area/i
  );
  assert.deepEqual(stateWithoutTrace(base), before);
  assert.strictEqual(base.trace, trace);
});

test("rejects conflicting explicit patches for one shared scale before writing", () => {
  const base = pointBase();
  const trace = base.trace;
  assert.throws(
    () => base.encodeChannels({
      target: "points",
      channels: {
        x: { field: "a", scale: { id: "shared", domain: [0, 10] } },
        y: { field: "b", scale: { id: "shared", domain: [0, 20] } }
      }
    }),
    /conflicting explicit domain requests.*x and y/
  );
  assert.strictEqual(base.trace, trace);
});

test("rejects malformed, empty, aliased, and injected channel payloads", () => {
  const base = pointBase();
  assert.throws(
    () => base.encodeChannels({ target: "points", channels: {} }),
    /at least one channel/
  );
  assert.throws(
    () => base.encodeChannels({ target: "points", channels: { radius: { field: "measure" } } }),
    /does not support channel "radius"/
  );
  assert.throws(
    () => base.encodeChannels({ target: "points", channels: { x: null } }),
    /x payload must be a plain object/
  );
  assert.throws(
    () => base.encodeChannels({ target: "points", channels: { x: { target: "other", field: "a" } } }),
    /cannot specify target/
  );
  assert.throws(
    () => base.encodeChannels({ target: "points", channels: { x: { id: "x", field: "a" } } }),
    /cannot specify id/
  );
  assert.throws(
    () => base.encodeChannels({ target: "points", channels: { x: { field: "a" } }, mode: "best-effort" }),
    /Unknown encodeChannels option "mode"/
  );
});
