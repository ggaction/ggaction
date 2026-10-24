import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const options = { text: "Main heading", subtitle: "First credit\nSecond credit",
  titleStyle: { fontSize: 13 }, subtitleStyle: { fontSize: 8 } };
const base = () => chart().createCanvas({ width: 800, height: 800, margin: 250 });
const properties = (p, id = "chartSubtitle") => {
  const graphic = p.graphicSpec.objects[id];
  return (graphic.items ?? [graphic]).map(item => item.properties);
};
const pitch = p => {
  const [a, b] = properties(p);
  return Math.hypot(b.x - a.x, b.y - a.y);
};

test("subtitle-only spacing supports small credits without changing the larger heading", () => {
  const original = base().createTitle(options), saved = serializeProgram(original);
  const edited = original.editTitle({ subtitleLineHeight: 10 });
  assert.equal(pitch(edited), 10);
  assert.deepEqual(properties(original).map(p => p.y), [41, 50.6]);
  assert.deepEqual(properties(edited, "chartTitle"), properties(original, "chartTitle"));
  assert.deepEqual(edited.semanticSpec, original.semanticSpec);
  assert.equal(edited.titleConfig.subtitleLineHeight, 10);
  assert.equal(Object.hasOwn(original.titleConfig, "subtitleLineHeight"), false);
  assert.equal(serializeProgram(original), saved);
  assert.deepEqual(base().createTitle({ ...options, subtitleLineHeight: 10 }).graphicSpec, edited.graphicSpec);
  assert.deepEqual(options.subtitleStyle, { fontSize: 8 });
});

test("omitted and shared spacing keep the existing concrete output and validation", () => {
  const omitted = base().createTitle(options);
  assert.deepEqual(omitted.editTitle({ subtitleLineHeight: 8 * 1.2 }).graphicSpec, omitted.graphicSpec);
  const shared = base().createTitle({ ...options, text: "First\nSecond", maxWidth: 200, lineHeight: 20 });
  assert.equal(pitch(shared), 20);
  const overridden = shared.editTitle({ subtitleLineHeight: 10 });
  assert.equal(pitch(overridden), 10);
  assert.deepEqual(properties(shared, "chartTitle"), properties(overridden, "chartTitle"));
  assert.throws(() => base().createTitle({ ...options, lineHeight: 10 }), /require maxWidth/);
  assert.throws(() => base().createTitle({ ...options, maxWidth: 200, lineHeight: 10,
    subtitleLineHeight: 10 }), /cover every visible fontSize/);
});

for (const position of ["top", "bottom", "left", "right"]) {
  test(`${position} credits retain spacing through edits, Canvas replay, and persistence`, () => {
    const created = base().createTitle({ ...options, position, subtitleLineHeight: 10 });
    for (const p of [created, created.editTitle({ gap: 6 }), created.editCanvas({ width: 840 }),
      deserializeProgram(serializeProgram(created))]) {
      assert.equal(pitch(p), 10);
      assert.equal(p.titleConfig.subtitleLineHeight, 10);
      assert.match(renderToSVG(p), />First credit</);
    }
    const restored = created.editTitle({ subtitle: false }).editTitle({ subtitle: options.subtitle });
    assert.deepEqual(restored.graphicSpec, created.graphicSpec);
    assert.equal(created.removeTitle().titleConfig, undefined);
  });
}

test("blank and wrapped subtitle lines reserve their own requested spacing", () => {
  const blank = base().createTitle({ ...options, subtitle: "First\n\nThird", subtitleLineHeight: 10 });
  assert.equal(pitch(blank), 20);
  const wrapped = base().createTitle({ ...options, subtitle: "Alpha beta gamma delta",
    maxWidth: 30, subtitleLineHeight: 10 });
  const rows = properties(wrapped);
  assert(rows.length > 2);
  for (let i = 1; i < rows.length; i++) assert.equal(rows[i].y - rows[i - 1].y, 10);
});

test("invalid spacing, hidden-style conflicts, and overflow leave earlier programs unchanged", () => {
  const p = base().createTitle({ ...options, subtitleLineHeight: 10 }), saved = serializeProgram(p);
  for (const value of [0, -1, 7.99, NaN, Infinity, -Infinity, "10", null, false]) {
    assert.throws(() => p.editTitle({ subtitleLineHeight: value }), /subtitleLineHeight/);
    assert.throws(() => base().createTitle({ ...options, subtitleLineHeight: value }), /subtitleLineHeight/);
  }
  assert.throws(() => p.editTitle({ subtitleStyle: { fontSize: 11 } }), /subtitleLineHeight/);
  const hidden = p.editTitle({ subtitle: false }), hiddenSaved = serializeProgram(hidden);
  assert.throws(() => hidden.editTitle({ subtitleStyle: { fontSize: 11 } }), /subtitleLineHeight/);
  assert.equal(serializeProgram(hidden), hiddenSaved);
  assert.throws(() => p.editTitle({ subtitleLineHeight: 1000 }), /margin space/);
  assert.equal(serializeProgram(p), saved);
  assert.equal(p.editTitle({ subtitleLineHeight: 8 }).titleConfig.subtitleLineHeight, 8);
});

test("facet parents retain independent subtitle spacing through child layout changes", () => {
  const source = base().createData({ values: [
    { group: "A", x: 1, y: 2 }, { group: "B", x: 2, y: 3 }
  ] }).createScatterPlot({ x: "x", y: "y", guides: false });
  const facet = source.facet({ field: "group", columns: 2 });
  const created = facet.createTitle({ ...options, subtitleLineHeight: 10 });
  assert.deepEqual(facet.createTitle(options).editTitle({ subtitleLineHeight: 10 }).graphicSpec,
    created.graphicSpec);
  for (const p of [created.editCompositionLayout({ gap: 30 }),
    created.editFacetScales({ x: "independent" }), deserializeProgram(serializeProgram(created))]) {
    assert.equal(pitch(p), 10);
    assert.equal(p.titleConfig.subtitleLineHeight, 10);
  }
});
