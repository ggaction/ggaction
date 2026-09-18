import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";
import { resolvePolarFrame } from "../../../../src/grammar/polar.js";

const values = [{ category: "A", value: 75 }, { category: "B", value: 25 }];
function source() {
  return chart().createCanvas({ width: 330, height: 470,
    margin: { top: 50, right: 40, bottom: 70, left: 40 } })
    .createData({ values })
    .createPiePlot({ category: "category", value: "value", aggregate: "sum",
      arc: { innerRadius: { unit: "px", value: 60 }, padAngle: 2 }, guides: false });
}
function sectors(program) {
  return resolveStoredSelection(program.selectMarks({ target: "piePlot",
    field: "category", op: "eq", value: "A" })).items.map(item => item.geometry);
}
function overflow(program, radius = 160) {
  return program.editCoordinate({ target: "polar", polarFrame: {
    radius: { unit: "px", value: radius }, overflow: "allow"
  } });
}

test("opts into overflowing proportional donuts while preserving plot dimensions and padding", () => {
  const base = source();
  const before = serializeProgram(base);
  assert.throws(() => base.editCoordinate({ target: "polar", polarFrame: {
    radius: { unit: "px", value: 160 }
  } }), /exceeds the maximum radius 125/);
  const program = overflow(base);
  assert.deepEqual(program.graphicSpec.objects.canvas.properties,
    base.graphicSpec.objects.canvas.properties);
  const geometry = sectors(program);
  assert.equal(geometry.length, 2);
  assert.deepEqual(geometry.map(item => [item.innerRadius, item.outerRadius]), [[60,160],[60,160]]);
  assert.deepEqual(geometry.map(item => [item.startTheta,item.endTheta]), [[1,269],[271,359]]);
  assert.equal(geometry[0].centerX, 165);
  assert.equal(geometry[0].centerY, 225);
  assert.match(renderToSVG(program), /<path/);
  assert.equal(serializeProgram(base), before);
});

test("preserves absolute radii through resize, mark edits, and serialization", () => {
  const base = overflow(source());
  const resized = base.editCanvas({ width: 430 });
  assert.deepEqual(sectors(resized).map(item => [item.innerRadius,item.outerRadius,item.centerX]),
    [[60,160,215],[60,160,215]]);
  const edited = resized.editArcMark({ target: "piePlot", innerRadius: { unit: "px", value: 80 } });
  assert.equal(sectors(edited)[0].innerRadius, 80);
  assert.deepEqual(sectors(deserializeProgram(serializeProgram(edited))), sectors(edited));
  assert.equal(sectors(edited.editArcMark({ target: "piePlot", innerRadius: 0.25 }))[0].innerRadius,40);
  assert.equal(sectors(base)[0].innerRadius,60);
});

test("supports pixel inner radii beyond a small plot when its explicit frame allows them", () => {
  const program = chart().createCanvas({ width: 130, height: 130, margin: 50 })
    .createCoordinate({ id: "polar", type: "polar" })
    .editCoordinate({ target: "polar", polarFrame: {
      radius: { unit: "px", value: 30 }, overflow: "allow"
    } }).createData({ values })
    .createPiePlot({ category: "category", arc: { innerRadius: { unit: "px", value: 22 } }, guides: false });
  assert.deepEqual(sectors(program).map(item => [item.innerRadius,item.outerRadius]), [[22,30],[22,30]]);
  assert.throws(() => program.editCoordinate({ target: "polar", polarFrame: "auto" }), /smaller than/);
  assert.throws(() => program.editArcMark({ target: "piePlot", innerRadius: { unit: "px", value: 30 } }), /smaller than/);
});

test("keeps overflow opt-in validation and off-center geometry deterministic", () => {
  const bounds = { x: 0, y: 0, width: 200, height: 280 };
  assert.deepEqual(resolvePolarFrame(bounds, { center: { x: .25, y: .5 },
    radius: { unit: "px", value: 120 }, overflow: "allow" }),
  { centerX:50, centerY:140, availableRadius:120 });
  for (const value of [0,-1,NaN,Infinity]) {
    assert.throws(() => resolvePolarFrame(bounds, { radius:{unit:"px",value}, overflow:"allow" }));
  }
  assert.throws(() => resolvePolarFrame(bounds, { overflow:"clip" }), /overflow/);
  for (const innerRadius of [{unit:"px",value:-1},{unit:"em",value:1},{unit:"px",value:Infinity},{unit:"px",value:1,extra:true}]) {
    assert.throws(() => source().editArcMark({target:"piePlot",innerRadius}));
  }
});

test("retains overflow and pixel radii in composed facet children", () => {
  const faceted = overflow(source()).facet({ field: "category" });
  assert.equal(Object.keys(faceted.children).length, 2);
  for (const child of Object.values(faceted.children)) {
    const geometry = sectors(child);
    assert.equal(geometry.length, 1);
    assert.equal(geometry[0].innerRadius, 60);
    assert.equal(geometry[0].outerRadius, 160);
  }
  assert.match(renderToSVG(faceted), /<path/);
});

test("uses pixel inner radii for automatic radial scale baselines and explicit measured ranges", () => {
  const base = chart().createCanvas({ width: 300, height: 300, margin: 30 })
    .createData({ values }).createArcMark({ innerRadius:{unit:"px",value:30} })
    .encodeTheta({ field:"category", fieldType:"nominal" }).encodeR({ field:"value" });
  assert.equal(base.resolvedScales.radius.range[0],30);
  assert.equal(base.editCanvas({width:400,height:400}).resolvedScales.radius.range[0],30);
  const measured = chart().createCanvas({width:300,height:300,margin:30}).createData({values})
    .createRosePlot({category:"category",value:"value",aggregate:"sum",
      radiusScale:{range:[30,120]},arc:{innerRadius:{unit:"px",value:30}},guides:false});
  assert.equal(measured.resolvedScales.radius.range[0],30);
  assert.throws(() => measured.editArcMark({innerRadius:{unit:"px",value:31}}),/agree/);
});
