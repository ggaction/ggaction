import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat } from "../../../../src/index.js";
import { describeAction } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { compositionPlotBounds, prepareCompositionSnapshots } from "../../../../src/materialization/composition.js";

const rows = [{ x: 1, y: 2, group: "A" }, { x: 2, y: 4, group: "B" }, { x: 3, y: 3, group: "A" }];
const unit = (height = 180) => chart().createCanvas({ plot: { width: 220, height }, margin: 75 })
  .createData({ id: "data", values: rows }).createBarPlot({ id: "plot", x: "x", y: "y", color: "group" }).createGuides();
const row = () => hconcat({ id: "pair", programs: [{ id: "a", program: unit() }, { id: "b", program: unit(220) }], align: "plot", share: { y: true, color: true } });
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);

for (const position of ["left", "right", "top", "bottom"]) test(`group adjacency ${position} spans the selected group's plot extent`, () => {
  const p = row(), before = serializeProgram(p), source = { childPath: ["a"], id: "plot" };
  const options = { id: "new", source, position };
  assert.equal(describeAction(p, { action: "createAdjacentPlot", options }).applicability, "supported");
  const q = p.createAdjacentPlot(options), horizontal = ["left", "right"].includes(position);
  assert.deepEqual(q.compositionSpec.children, ["left", "top"].includes(position) ? ["new", "pair"] : ["pair", "new"]);
  const existing = compositionPlotBounds(p), sourceBounds = compositionPlotBounds(p.children.a), added = compositionPlotBounds(q.children.new);
  close(added.width, horizontal ? sourceBounds.width : existing.width);
  close(added.height, horizontal ? existing.height : sourceBounds.height);
  const { children, layout } = prepareCompositionSnapshots(q), dimension = horizontal ? "height" : "width", offset = horizontal ? "y" : "x";
  const extents = layout.children.map(placement => {
    const bounds = compositionPlotBounds(children[placement.id]);
    return [placement[offset] + bounds[offset], bounds[dimension]];
  });
  close(extents[0][0],extents[1][0]); close(extents[0][1],extents[1][1]);
  assert.deepEqual(q.compositionSpec.share, horizontal ? { y: true } : { x: true });
  assert.equal(q.trace.children.length, p.trace.children.length + 1);
  assert.equal(q.trace.children.at(-1).op,"createAdjacentPlot");
  assert.equal(serializeProgram(p),before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  const edited = q.encodeOpacity({ target: { childPath: ["pair", "a"], id: "plot" }, value: .3 });
  assert.equal(edited.children.pair.children.a.markConfigs.plot.opacity,.3);
  assert.notEqual(edited.children.new.markConfigs.new?.opacity,.3);
});
test("an inner group's source path is relative and unrelated siblings are preserved", () => {
  const p = vconcat({ id: "outer", programs: [{ id: "pair", program: row() }, { id: "c", program: unit() }], align: "plot" });
  const q = p.createAdjacentPlot({ target: { childPath: ["pair"] }, source: { childPath: ["b"], id: "plot" }, id: "new", position: "bottom" });
  assert.equal(q.children.c,p.children.c);
  assert.deepEqual(q.children.pair.compositionSpec.children,["pair","new"]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.equal(q.children.pair.children.new.semanticSpec.layers[0].data,"data");
});
test("source selectors reject ambiguous groups, overlays, generated facet cells and ID collisions atomically", () => {
  const a=unit().createOverlay({id:"line",source:"plot"});
  const facet=unit().facet({field:"group",columns:2});
  const p=hconcat({id:"pair",programs:[{id:"a",program:a},{id:"f",program:facet}],align:"plot"}), before=serializeProgram(p);
  for(const source of [undefined,"plot",{childPath:[],id:"plot"},{childPath:["missing"],id:"plot"},{childPath:["a"]},
    {childPath:["a"],id:"line"},{childPath:["f",facet.compositionSpec.children[0]],id:"plot"}]) {
    assert.throws(()=>p.createAdjacentPlot({id:"new",source}));
    assert.notEqual(describeAction(p,{action:"createAdjacentPlot",options:{id:"new",source}}).applicability,"supported");
  }
  assert.throws(()=>p.createAdjacentPlot({id:"pair",source:{childPath:["a"],id:"plot"}}),/differ/);
  assert.equal(serializeProgram(p),before);
  const q=p.createAdjacentPlot({id:"new",source:{childPath:["f"],id:"plot"},share:{},position:"bottom"});
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});
test("an original group title remains local and shared color retains one overall guide",()=>{
  const p=row().createTitle({text:"Original pair"});
  const q=p.createAdjacentPlot({id:"new",source:{childPath:["a"],id:"plot"},position:"bottom",share:{x:true,color:true}});
  assert.equal(q.children.pair.semanticSpec.title.text,"Original pair");
  assert.equal(q.semanticSpec.title.text,undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  const shared=Object.keys(q.graphicSpec.objects).filter(id=>id.endsWith("shared-color-legend"));
  assert.equal(shared.length,1);
});
