import test from "node:test";
import assert from "node:assert/strict";
import { createMarginal } from "../../examples/marginal/program.js";
import { highlightMarginalBin } from "../../examples/marginal/selection.js";
import { observations, targets } from "../../examples/marginal/fixture.js";
import { createBullet } from "../../examples/bullet/program.js";
import { createLinkedOverlay, rows as comboRows } from "../../examples/linked-overlay/program.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { createInteractionSession } from "../../src/interaction.js";
const panels = p => [p.children.x, p.children.lower.children.center, p.children.lower.children.y];
function assertRoundTrips(p) {
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(p)).graphicSpec, p.graphicSpec);
}
test("Marginal shares exact source identity, corresponding dimension domains and aligned plot ranges", () => {
  const p = createMarginal(), [x, center, y] = panels(p);
  assert.equal(new Set(panels(p).map(p => p.semanticSpec.datasets[0].logicalId)).size, 1);
  assert.deepEqual(x.resolvedScales.x, center.resolvedScales.x);
  assert.deepEqual(y.resolvedScales.y, center.resolvedScales.y);
  assert.deepEqual(x.semanticSpec.datasets.find(d => d.id === "bins").values.map(row => row.count), [2,1,1,1,1]);
  assert.deepEqual(y.semanticSpec.datasets.find(d => d.id === "bins").values.map(row => row.count), [1,1,2,1,1]);
  assertRoundTrips(p);
});
test("Marginal bin membership links exact row keys across all panels and survives reordering", () => {
  const p = createMarginal(), before = serializeProgram(p), linked = highlightMarginalBin(p, "x", 0);
  const highlighted = getMarkItems(linked, { target: targets[1] }).filter(item => item.properties.fill === "#f97316");
  assert.deepEqual(highlighted.map(item => item.fields.id), ["a", "b"]);
  assert.notEqual(highlighted[0].key, highlighted[1].key);
  let revised = linked;
  for (const target of targets) revised = revised.reviseData({ target: { childPath: target.childPath }, source: "observations", id: "reordered", values: [...observations].reverse() });
  assert.deepEqual(getMarkItems(revised, { target: targets[1] }).filter(item => item.properties.fill === "#f97316").map(item => item.fields.id), ["b", "a"]);
  const relinked = highlightMarginalBin(revised, "x", 0);
  assert.deepEqual(getMarkItems(relinked, { target: targets[1] }).filter(item => item.properties.fill === "#f97316").map(item => item.fields.id), ["b", "a"]);
  const partial = p.reviseData({ target: { childPath: ["x"] }, source: "observations", id: "partial", values: [...observations].reverse() });
  assert.throws(() => highlightMarginalBin(partial, "x", 0), /Revise all/);
  assertRoundTrips(revised); assert.equal(serializeProgram(p), before);
  assert.throws(() => highlightMarginalBin(p, "z", 0));
  assert.throws(() => highlightMarginalBin(p, "x", 12));
  assert.equal(serializeProgram(p), before);
});
test("Marginal explicit panel resize and source revision keep dimension alignment and count provenance", () => {
  let p = createMarginal();
  p = p.editCanvas({ target: [{ childPath: ["x"] }, { childPath: ["lower","center"] }], width: 420 });
  p = p.editCanvas({ target: [{ childPath: ["lower","center"] }, { childPath: ["lower","y"] }], height: 340 });
  const [x,c,y] = panels(p); assert.deepEqual(x.resolvedScales.x, c.resolvedScales.x); assert.deepEqual(y.resolvedScales.y,c.resolvedScales.y);
  const values = observations.map(row => ({ ...row, x: 9 - row.x, y: 9 - row.y }));
  for (const target of targets) p = p.reviseData({ target: { childPath: target.childPath }, source: "observations", id: "revised", values });
  const [rx,,ry] = panels(p);
  for (const child of [rx,ry]) assert.equal(child.semanticSpec.datasets.find(d=>d.id===child.semanticSpec.layers.find(layer=>layer.id==="histogram").data).values.reduce((sum,row)=>sum+row.count,0),6);
  assertRoundTrips(p);
});
test("Marginal zero remains finite while empty unknown schema and duplicate source keys reject", () => {
  assert.throws(() => createMarginal([]), /does not contain field/);
  assert.throws(() => createMarginal(observations, { xBins: [0,2,2,10] }), /boundar|increas/i);
  const zero = createMarginal([{ id: "zero", x: 0, y: 0 }]); assert.equal(getMarkItems(zero,{target:targets[1]}).length,1); assertRoundTrips(zero);
  assert.throws(() => createMarginal([{id:"same",x:1,y:1},{id:"same",x:2,y:2}]), /key|duplicate/i);
});
test("Bullet reference, actual and target reuse one quantitative scale and deterministic layer order", () => {
  const p = createBullet(), layers = p.semanticSpec.layers;
  assert.deepEqual(p.graphicSpec.objects["plot-main"].children, ["ranges","measure","target","measure-label"]);
  assert.deepEqual(layers.filter(layer=>["ranges","measure","target"].includes(layer.id)).map(layer=>layer.encoding.x.scale), ["amount","amount","amount"]);
  assert.equal(p.semanticSpec.scales.filter(scale=>scale.id==="amount").length,1);
  const before = serializeProgram(p), q = p.reviseData({source:"observed",id:"revised",values:[{id:"revenue",metric:"Revenue",actual:40,target:90}]}).editCanvas({width:460});
  assert.equal(q.graphicSpec.objects.measure.items[0].properties.width,160);
  assert.equal(q.graphicSpec.objects.target.items[0].properties.x1,390);
  assert.equal(q.graphicSpec.objects["measure-label"].items[0].properties.text,"40");
  assertRoundTrips(q); assert.equal(serializeProgram(p),before);
});
test("Bullet selection, actual hit, zero and empty measure retain explicit reference semantics", () => {
  const p=createBullet(), selected=p.highlightMarks({target:"measure",select:{field:"id",op:"eq",value:"revenue"},fill:"#f97316"});
  assert.equal(selected.graphicSpec.objects.measure.items[0].properties.fill,"#f97316");
  assert.equal(selected.graphicSpec.objects.ranges.items[0].properties.fill,"#e2e8f0");
  const session=createInteractionSession({program:p}); session.dispatch({type:"inspect",point:{x:50,y:80}});
  assert.equal(session.getState().hit.target.ownerId,"measure"); session.destroy();
  assert.equal(createBullet([{id:"revenue",metric:"Revenue",actual:0,target:80}]).graphicSpec.objects.measure.items.length,0);
  assert.throws(() => createBullet([]), /no values to aggregate/);
  assert.throws(()=>createBullet([{id:"same",metric:"Revenue",actual:1,target:2},{id:"same",metric:"Revenue",actual:2,target:3}]),/key|duplicate/i);
  assertRoundTrips(selected);
});
test("Combo follows bar endpoints on one shared Y owner through revise, resize and selection", () => {
  const p=createLinkedOverlay(), [bars,line]=p.semanticSpec.layers;
  assert.equal(bars.encoding.y.scale,line.encoding.y.scale);
  assert.equal(p.semanticSpec.scales.filter(scale=>scale.id===bars.encoding.y.scale).length,1);
  const q=p.reviseData({source:"data",id:"revised",values:comboRows.map(row=>({...row,sales:row.sales/2}))}).editCanvas({plot:{width:420,height:240}});
  assert.deepEqual(q.graphicSpec.objects["plot-main"].children.filter(id=>["bars","trend"].includes(id)),["bars","trend"]);
  assert.ok(q.graphicSpec.objects.trend.items[0].properties.commands.length>=4);
  assertRoundTrips(q.highlightMarks({target:"bars",select:{field:"month",op:"eq",value:"Feb"},fill:"#f97316"}));
});
