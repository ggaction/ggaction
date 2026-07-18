import { graphicDrawOrder } from "../../../support/graphic-tree.js";
import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

function createCanvas() {
  return chart().createCanvas({
    width: 400,
    height: 200,
    margin: { top: 80, right: 20, bottom: 20, left: 20 }
  });
}

test("creates semantic title state and concrete title graphics", () => {
  const before = createCanvas();
  const program = before.createTitle({
    text: "Acceleration by year",
    subtitle: "1970 to 1982"
  });

  assert.deepEqual(program.semanticSpec.title, {
    text: "Acceleration by year",
    subtitle: "1970 to 1982"
  });
  assert.deepEqual(program.graphicSpec.objects.chartTitle, {
    type: "text",
    properties: {
      x: 20,
      y: 27,
      text: "Acceleration by year",
      fill: "#0f172a",
      fontSize: 22,
      fontFamily: "sans-serif",
      fontWeight: 600,
      textAlign: "left",
      textBaseline: "middle"
    }
  });
  assert.deepEqual(program.graphicSpec.objects.chartSubtitle, {
    type: "text",
    properties: {
      x: 20,
      y: 53,
      text: "1970 to 1982",
      fill: "#64748b",
      fontSize: 14,
      fontFamily: "sans-serif",
      fontWeight: "normal",
      textAlign: "left",
      textBaseline: "middle"
    }
  });
  assert.equal(before.semanticSpec.title.text, undefined);
  assert.equal(before.titleConfig, undefined);
  assert.equal(Object.isFrozen(program.titleConfig.titleStyle), true);
});

test("records semantic and component actions beneath createTitle", () => {
  const program = createCanvas().createTitle({
    text: "Title",
    subtitle: "Subtitle"
  });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "createTitle");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createTitleText",
    "createSubtitleText"
  ]);
  assert.deepEqual(node.children[2].children.map(child => child.op), [
    "createGraphics",
    "editTitleText"
  ]);
  assert.deepEqual(node.children[3].children.map(child => child.op), [
    "createGraphics",
    "editSubtitleText"
  ]);
});

test("supports a title without a subtitle", () => {
  const program = createCanvas().createTitle({ text: "Title only" });

  assert.deepEqual(program.semanticSpec.title, { text: "Title only" });
  assert.equal(program.graphicSpec.objects.chartSubtitle, undefined);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "editSemantic",
    "createTitleText"
  ]);
});

test("applies alignment, offset, gap, and text styles", () => {
  const program = createCanvas().createTitle({
    text: "Centered",
    subtitle: "Styled",
    align: "center",
    offset: 4,
    gap: 6,
    titleStyle: {
      color: "navy",
      fontSize: 20,
      fontWeight: 700
    },
    subtitleStyle: {
      color: "gray",
      fontSize: 10,
      fontFamily: "serif"
    }
  });

  assert.deepEqual(
    {
      x: program.graphicSpec.objects.chartTitle.properties.x,
      y: program.graphicSpec.objects.chartTitle.properties.y,
      align: program.graphicSpec.objects.chartTitle.properties.textAlign,
      fill: program.graphicSpec.objects.chartTitle.properties.fill,
      size: program.graphicSpec.objects.chartTitle.properties.fontSize
    },
    { x: 200, y: 30, align: "center", fill: "navy", size: 20 }
  );
  assert.deepEqual(
    {
      y: program.graphicSpec.objects.chartSubtitle.properties.y,
      fill: program.graphicSpec.objects.chartSubtitle.properties.fill,
      size: program.graphicSpec.objects.chartSubtitle.properties.fontSize,
      family: program.graphicSpec.objects.chartSubtitle.properties.fontFamily
    },
    { y: 51, fill: "gray", size: 10, family: "serif" }
  );
});

test("rematerializes title layout after Canvas edits", () => {
  const before = createCanvas().createTitle({
    text: "Centered",
    subtitle: "Subtitle",
    align: "center"
  });
  const program = before.editCanvas({ width: 500 });

  assert.equal(program.graphicSpec.objects.chartTitle.properties.x, 250);
  assert.equal(program.graphicSpec.objects.chartSubtitle.properties.x, 250);
  assert.equal(
    program.trace.children.at(-1).children.filter(
      child => child.op === "rematerializeTitle"
    ).length,
    1
  );
  assert.equal(before.graphicSpec.objects.chartTitle.properties.x, 200);
});

test("centers horizontal titles on asymmetric plot bounds", () => {
  const before = chart().createCanvas({
    width: 400,
    height: 240,
    margin: { top: 80, right: 20, bottom: 30, left: 70 }
  }).createTitle({ text: "Plot centered", align: "center" });
  const after = before.editCanvas({ width: 500 });

  assert.equal(before.graphicSpec.objects.chartTitle.properties.x, 225);
  assert.equal(after.graphicSpec.objects.chartTitle.properties.x, 275);
  assert.notEqual(before.graphicSpec.objects.chartTitle.properties.x, 200);

  const side = chart().createCanvas({
    width: 520,
    height: 420,
    margin: { top: 90, right: 120, bottom: 130, left: 120 }
  }).createTitle({
    text: "Plot centered",
    position: "left",
    align: "center"
  });
  assert.equal(side.graphicSpec.objects.chartTitle.properties.y, 190);
  assert.notEqual(side.graphicSpec.objects.chartTitle.properties.y, 210);
});

test("validates title options, layout, duplicates, and component state", () => {
  assert.throws(() => createCanvas().createTitle(), /text must be a non-empty/);
  assert.throws(
    () => createCanvas().createTitle({ text: "Title", subtitle: "" }),
    /subtitle must be a non-empty/
  );
  assert.throws(
    () => createCanvas().createTitle({ text: "Title", position: "middle" }),
    /Unsupported title position/
  );
  assert.throws(
    () => createCanvas().createTitle({ text: "Title", align: "start" }),
    /Unsupported title align/
  );
  assert.throws(
    () => createCanvas().createTitle({ text: "Title", gap: -1 }),
    /gap must be a non-negative/
  );
  assert.throws(
    () => createCanvas().createTitle({
      text: "Title",
      titleStyle: { fontSize: 0 }
    }),
    /fontSize must be a positive/
  );
  assert.throws(
    () => chart().createCanvas().createTitle({ text: "Title" }),
    /more top-margin space/
  );
  assert.throws(
    () => createCanvas().createTitle({ text: "Title" }).createTitle({ text: "Again" }),
    /missing semantic title state/
  );
  assert.throws(() => createCanvas().createTitleText(), /configuration/);
  assert.throws(() => createCanvas().rematerializeTitle(), /configuration/);
});

function createFourEdgeCanvas() {
  return chart().createCanvas({
    width: 520,
    height: 420,
    margin: { top: 100, right: 120, bottom: 120, left: 120 }
  });
}

test("places titles on all four Canvas edges", () => {
  const top = createFourEdgeCanvas().createTitle({ text: "Top" });
  const bottom = createFourEdgeCanvas().createTitle({
    text: "Bottom",
    position: "bottom"
  });
  const left = createFourEdgeCanvas().createTitle({
    text: "Left",
    position: "left",
    align: "center"
  });
  const right = createFourEdgeCanvas().createTitle({
    text: "Right",
    position: "right",
    align: "right"
  });

  assert.equal(top.graphicSpec.objects.chartTitle.properties.rotation, undefined);
  assert.equal(bottom.graphicSpec.objects.chartTitle.properties.rotation, 0);
  assert.equal(left.graphicSpec.objects.chartTitle.properties.rotation, -Math.PI / 2);
  assert.equal(right.graphicSpec.objects.chartTitle.properties.rotation, Math.PI / 2);
  assert.equal(left.graphicSpec.objects.chartTitle.properties.textAlign, "center");
  assert.equal(right.graphicSpec.objects.chartTitle.properties.y > 210, true);
});

test("creates deterministic wrapped title and subtitle collections", () => {
  const program = chart().createCanvas({
    width: 720,
    height: 620,
    margin: { top: 130, right: 40, bottom: 190, left: 80 }
  }).createTitle({
    text: "Distribution of Acceleration Across Vehicle Origins",
    subtitle: "Kernel density estimates for acceleration, grouped by origin in the cars dataset",
    position: "bottom",
    align: "center",
    offset: 60,
    gap: 12,
    maxWidth: 270,
    wrap: "word",
    lineHeight: 26
  });

  assert.deepEqual(
    program.graphicSpec.objects.chartTitle.items.map(child => child.properties.text),
    ["Distribution of Acceleration", "Across Vehicle Origins"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.chartSubtitle.items.map(child => child.properties.text),
    [
      "Kernel density estimates for acceleration,",
      "grouped by origin in the cars dataset"
    ]
  );
  assert.deepEqual(
    program.graphicSpec.objects.chartTitle.items.map(child => child.properties.y),
    [501, 527]
  );
  assert.deepEqual(
    program.graphicSpec.objects.chartSubtitle.items.map(child => child.properties.y),
    [557, 583]
  );
});

test("partially edits title semantics, layout, styles, and subtitle presence", () => {
  const before = createFourEdgeCanvas().createTitle({
    text: "Original",
    subtitle: "Remove me",
    titleStyle: { color: "navy", fontFamily: "serif" }
  });
  const after = before.editTitle({
    text: "Edited",
    subtitle: false,
    position: "bottom",
    align: "center",
    offset: 30,
    titleStyle: { fontSize: 24 }
  });

  assert.deepEqual(before.semanticSpec.title, {
    text: "Original",
    subtitle: "Remove me"
  });
  assert.deepEqual(after.semanticSpec.title, { text: "Edited" });
  assert.equal(after.graphicSpec.objects.chartSubtitle, undefined);
  assert.equal(after.graphicSpec.objects.chartTitle.properties.fill, "navy");
  assert.equal(after.graphicSpec.objects.chartTitle.properties.fontFamily, "serif");
  assert.equal(after.graphicSpec.objects.chartTitle.properties.fontSize, 24);
  assert.equal(after.graphicSpec.objects.chartTitle.properties.rotation, 0);
  assert.deepEqual(after.trace.children.at(-1).children.map(node => node.op), [
    "editSemantic",
    "editSemantic",
    "rematerializeTitle"
  ]);

  const restored = after.editTitle({ subtitle: "Restored" });
  assert.equal(restored.semanticSpec.title.subtitle, "Restored");
  assert.equal(restored.graphicSpec.objects.chartSubtitle.properties.text, "Restored");
});

test("reconciles wrapped collections and side rotations through edits", () => {
  const wrapped = createFourEdgeCanvas().createTitle({
    text: "Acceleration density by vehicle origin",
    maxWidth: 130,
    lineHeight: 24
  });
  const side = wrapped.editTitle({
    position: "left",
    align: "center",
    offset: 10
  });

  assert.equal(side.graphicSpec.objects.chartTitle.items.length > 1, true);
  assert.equal(side.graphicSpec.objects.chartTitle.items.every(child =>
    child.properties.rotation === -Math.PI / 2
  ), true);
  assert.equal(
    graphicDrawOrder(side).filter(id => id === "chartTitle").length,
    1
  );
});

test("validates wrapping, editing, and edge layout atomically", () => {
  const base = createFourEdgeCanvas();
  assert.throws(() => base.createTitle({
    text: "Title",
    wrap: "word"
  }), /require maxWidth/);
  assert.throws(() => base.createTitle({
    text: "Title",
    maxWidth: 100,
    wrap: "line"
  }), /Unsupported title wrap/);
  assert.throws(() => base.createTitle({
    text: "Title",
    maxWidth: 100,
    lineHeight: 10
  }), /cover every visible fontSize/);
  assert.throws(() => base.createTitle({ text: "Title\nSecond" }), /newlines/);
  assert.throws(() => base.editTitle({ text: "Missing" }), /existing chart title/);

  const title = base.createTitle({ text: "Stable" });
  const before = title.graphicSpec;
  assert.throws(() => title.editTitle(), /at least one change/);
  assert.throws(() => title.editTitle({ unknown: true }), /Unknown editTitle option/);
  assert.throws(() => title.editTitle({ subtitle: 3 }), /subtitle/);
  assert.equal(title.graphicSpec, before);
  assert.throws(() => createCanvas().createTitle({
    text: "Bottom",
    position: "bottom",
    offset: 5
  }), /bottom-margin space/);
});

test("rejects same-edge axis collisions and accepts reserved spacing", () => {
  const chartWithAxes = chart()
    .createCanvas({
      width: 520,
      height: 420,
      margin: { top: 80, right: 60, bottom: 120, left: 80 }
    })
    .createData({ id: "rows", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes();

  assert.throws(() => chartWithAxes.createTitle({
    text: "Too close",
    position: "bottom",
    align: "center",
    offset: 30
  }), /bottom guides/);
  const spaced = chartWithAxes.createTitle({
    text: "Spaced",
    position: "bottom",
    align: "center",
    offset: 60
  });
  assert.equal(spaced.graphicSpec.objects.chartTitle.properties.y, 371);
});

test("converges across Canvas and title edit order", () => {
  const start = createFourEdgeCanvas().createTitle({
    text: "Acceleration density by vehicle origin",
    maxWidth: 130,
    lineHeight: 24
  });
  const canvasOptions = {
    width: 560,
    height: 460,
    margin: { top: 110, right: 140, bottom: 130, left: 140 }
  };
  const titleOptions = {
    position: "right",
    align: "center",
    offset: -10,
    subtitle: "Cars"
  };
  const titleThenCanvas = start
    .editTitle(titleOptions)
    .editCanvas(canvasOptions);
  const canvasThenTitle = start
    .editCanvas(canvasOptions)
    .editTitle(titleOptions);

  assert.deepEqual(titleThenCanvas.semanticSpec, canvasThenTitle.semanticSpec);
  assert.deepEqual(titleThenCanvas.graphicSpec, canvasThenTitle.graphicSpec);
});
