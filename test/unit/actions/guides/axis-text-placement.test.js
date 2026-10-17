import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { cartesianTitleAnchor } from "../../../oracles/cartesian-axis-geometry.js";

const plot = { left: 200, top: 200, width: 500, height: 400 };
function base(factory = chart) {
  return factory().createCanvas({ width: 900, height: 800, margin: 200 })
    .createData({ values: [{ x: 0, y: 0, panel: "A" }, { x: 10, y: 10, panel: "B" }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}

test("title oracle has literal anchors for inward displacement and screen translation", () => {
  assert.deepEqual(cartesianTitleAnchor({ plot, channel: "x", side: "bottom", offset: -30, alongOffset: 20 }),
    { x: 470, y: 570 });
  assert.deepEqual(cartesianTitleAnchor({ plot, channel: "y", side: "left", offset: -30, alongOffset: 20 }),
    { x: 230, y: 420 });
});

test("all four sides retain signed title displacement and screen alongOffset on reversed scales", () => {
  for (const reverse of [false, true]) {
    const p = base().editScale({ id: "x", reverse }).editScale({ id: "y", reverse });
    for (const [channel, side] of [["x", "bottom"], ["x", "top"], ["y", "left"], ["y", "right"]]) {
      const create = channel === "x" ? "createXAxis" : "createYAxis";
      const before = serializeProgram(p);
      const q = p[create]({ position: side, ticksAndLabels: false,
        title: { text: "Inside", offset: -30, alongOffset: 20, rotation: 0, align: "left", baseline: "bottom" } });
      const properties = q.graphicSpec.objects[`${channel}AxisTitle`].properties;
      const expected = cartesianTitleAnchor({ plot, channel, side, offset: -30, alongOffset: 20 });
      assert.equal(properties.x, expected.x);
      assert.equal(properties.y, expected.y);
      assert.equal(properties.textAlign, "left");
      assert.equal(properties.textBaseline, "bottom");
      assert.deepEqual(q.graphicSpec.objects.scatterPlot, p.graphicSpec.objects.scatterPlot);
      assert.equal(serializeProgram(p), before);
    }
  }
});

test("complete, whole, focused and Basic title calls converge and reset concrete appearance", () => {
  const options = { text: "Source title", offset: -35, alongOffset: 85, align: "right", baseline: "bottom", rotation: 0 };
  const expected = base().createXAxis({ title: options });
  for (const actual of [
    base().createXAxis().editXAxis({ title: options }),
    base().createXAxis().editXAxisTitle(options),
    base(basicChart).createXAxis({ title: options })
  ]) assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  const kept = expected.editXAxisTitle({ color: "red" });
  assert.equal(kept.guideConfigs.axis.x.title.alongOffset, 85);
  const reset = kept.editXAxisTitle({ align: "center", baseline: "middle", alongOffset: 0 });
  assert.equal(reset.graphicSpec.objects.xAxisTitle.properties.textAlign, "center");
  assert.equal(reset.graphicSpec.objects.xAxisTitle.properties.textBaseline, "middle");
  assert.equal(reset.graphicSpec.objects.xAxisTitle.properties.x, 450);
});

test("axis title local align/baseline and multiline anchors export exactly like concrete text", () => {
  for (const align of ["left", "center", "right"]) {
    for (const baseline of ["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"]) {
      for (const rotation of [0, Math.PI / 4, Math.PI / 2]) {
        const q = base().createXAxis({ ticksAndLabels: false,
          title: { text: "Alpha\nBeta", offset: -80, alongOffset: 30, align, baseline, rotation } });
        const properties = q.graphicSpec.objects.xAxisTitle.properties;
        assert.equal(properties.x, 480);
        assert.equal(properties.y, 520);
        assert.equal(properties.textAlign, align);
        assert.equal(properties.textBaseline, baseline);
        assert.equal(properties.rotation, rotation);
        const primitive = chart().createCanvas({ width: 900, height: 800, margin: 200 })
          .createGraphics({ id: "ownedTitle", type: "text" });
        let drawn = primitive;
        for (const [property, value] of Object.entries(properties)) {
          drawn = drawn.editGraphics({ target: "ownedTitle", property, value });
        }
        const titleSvg = renderToSVG(q).match(/<text[^>]*>.*?<\/text>/su)?.[0];
        assert.equal(titleSvg, renderToSVG(drawn).match(/<text[^>]*>.*?<\/text>/su)?.[0]);
      }
    }
  }
});

test("explicit Cartesian label alignment preserves existing anchors before rotation or flush", () => {
  for (const rotation of [0, Math.PI / 4, Math.PI / 2]) {
    const p = base().createXAxis({ title: false,
      ticksAndLabels: { labels: { rotation, ...(rotation === 0 ? { flush: true } : {}) } } });
    const before = p.graphicSpec.objects.xAxisLabels.items;
    for (const align of ["left", "center", "right"]) {
      const q = p.editXAxisLabels({ align });
      q.graphicSpec.objects.xAxisLabels.items.forEach((item, index) => {
        assert.equal(item.properties.x, before[index].properties.x);
        assert.equal(item.properties.y, before[index].properties.y);
        assert.equal(item.properties.textAlign, align);
      });
      assert.deepEqual(q.graphicSpec.objects.xAxisTicks, p.graphicSpec.objects.xAxisTicks);
    }
  }
});

test("variable-width category labels share an explicit left edge without changing tick positions", () => {
  const p = chart().createCanvas({ width: 900, height: 800, margin: 200 })
    .createData({ values: [{ c: "A", n: 1 }, { c: "Longer category", n: 2 }] })
    .createBarPlot({ x: "n", y: { field: "c", fieldType: "nominal" }, guides: false })
    .createYAxis({ title: false, ticksAndLabels: { labels: { align: "left", offset: 75 } } });
  assert.deepEqual(p.graphicSpec.objects.yAxisLabels.items.map(item => item.properties.x), [125, 125]);
  assert.ok(p.graphicSpec.objects.yAxisLabels.items.every(item => item.properties.textAlign === "left"));
});

test("signed title and explicit label style survive persistence, Canvas, theme and facets", () => {
  const p = base().createXAxis({ title: { offset: -50, align: "right", baseline: "bottom", alongOffset: 30 },
    ticksAndLabels: { labels: { align: "left" } } });
  const saved = deserializeProgram(serializeProgram(p));
  assert.deepEqual(saved.graphicSpec, p.graphicSpec);
  const resized = saved.editCanvas({ width: 1000 });
  assert.equal(resized.graphicSpec.objects.xAxisTitle.properties.x, 530);
  const themed = saved.applyTheme({ theme: "light" });
  assert.equal(themed.guideConfigs.axis.x.title.baseline, "bottom");
  assert.equal(themed.guideConfigs.axis.x.labels.align, "left");
  const faceted = saved.facet({ field: "panel", guides: { axes: "each", legend: false } });
  for (const child of Object.values(faceted.children)) {
    assert.equal(child.guideConfigs.axis.x.title.offset, -50);
    assert.equal(child.guideConfigs.axis.x.title.alongOffset, 30);
    assert.equal(child.guideConfigs.axis.x.labels.align, "left");
  }
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
});

test("invalid placements, own label collision and corrupted snapshots reject atomically", () => {
  const p = base().createXAxis();
  const before = serializeProgram(p);
  for (const patch of [{ alongOffset: NaN }, { alongOffset: undefined }, { offset: Infinity },
    { align: "auto" }, { baseline: "center" }, { baseline: null }, { alongOffset: 10000 }]) {
    assert.throws(() => p.editXAxisTitle(patch));
  }
  for (const align of [null, undefined, "auto", 1]) assert.throws(() => p.editXAxisLabels({ align }));
  assert.throws(() => p.editXAxisTitle({ at: 4, offset: 18 }), /overlap/);
  const envelope = JSON.parse(before), state = decodeValue(envelope.payload);
  state.materializationConfigs.guides.axis.x.title.baseline = "wrong";
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  assert.equal(serializeProgram(p), before);
});
