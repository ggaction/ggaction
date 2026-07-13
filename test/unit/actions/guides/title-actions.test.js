import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

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

test("validates title options, layout, duplicates, and component state", () => {
  assert.throws(() => createCanvas().createTitle(), /text must be a non-empty/);
  assert.throws(
    () => createCanvas().createTitle({ text: "Title", subtitle: "" }),
    /subtitle must be a non-empty/
  );
  assert.throws(
    () => createCanvas().createTitle({ text: "Title", position: "bottom" }),
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
