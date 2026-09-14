import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { buildActionRelationshipPrograms } from "../../../../scripts/action-relationship-source.js";

const rows = [{ x: 1, y: 2, group: "a" }, { x: 2, y: 5, group: "b" }];
function points(values = rows) {
  return chart().createCanvas({width: 360, height: 240, margin: 40})
    .createData({id: "source", values}).createPointMark({id: "points"})
    .encodeX({field: "x"}).encodeY({field: "y"}).encodeRadius({value: 5});
}

test("source revision preserves its original, styles, trace, and follows new rows through scales and selections", () => {
  const p = points().selectMarks({id: "max", field: "y", op: "max"})
    .highlightMarks({selection: "max", color: "red"});
  const before = serializeProgram(p);
  const values = [{x: 1, y: 15, group: "a"}, {x: 7, y: 3, group: "b"}, {x: 4, y: 8, group: "c"}];
  const next = p.reviseData({source: "source", id: "updated", values});
  assert.equal(next.semanticSpec.layers[0].data, "updated");
  assert.equal(next.graphicSpec.objects.points.items.length, 3);
  assert.equal(next.graphicSpec.objects.points.items.filter(item => item.properties.fill === "red").length, 1);
  assert.ok(next.resolvedScales.x.domain.at(-1) >= 7);
  assert.ok(next.resolvedScales.y.domain.at(-1) >= 15);
  assert.equal(next.markConfigs.points.radius, p.markConfigs.points.radius);
  assert.deepEqual(next.semanticSpec.datasets.find(d => d.id === "source").values, rows);
  values[0].y = -100;
  assert.equal(next.semanticSpec.datasets.find(d => d.id === "updated").values[0].y, 15);
  assert.equal(serializeProgram(p), before);
  assert.equal(next.trace.children.at(-1).op, "reviseData");
  assert.ok(next.trace.children.at(-1).children.some(node => node.op === "createData"));
  assert.deepEqual(next.actionStack, []);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
});

test("revision recomputes a transitive transform chain and keeps logical editors usable", () => {
  const p = chart().createCanvas().createData({id:"source", values:rows})
    .filterData({id:"filtered",source:"source",field:"x",range:{min:0,max:10}})
    .createSummaryData({id:"summary",source:"filtered",groupBy:"group",aggregates:[{op:"sum",field:"y",as:"total"}]})
    .createBarPlot({data:"summary",x:"group",y:"total",guides:false});
  const n = p.reviseData({source:"source",id:"updated",values:[...rows,{x:3,y:7,group:"a"}]});
  const data = n.semanticSpec.datasets.find(d=>d.id===n.semanticSpec.layers[0].data);
  assert.equal(data.values.find(row=>row.group==="a").total,9);
  assert.equal(n.editFilteredData({target:"filtered",range:{min:0,max:2},dependents:"recompute"}).actionStack.length,0);
});

test("retained facet and repeat revisions refresh children and can be edited again", () => {
  const p=points();
  for (const grouped of [p.facet({field:"group"}),p.repeatCharts({target:"points",channel:"x",fields:["x","y"]})]) {
    const before=serializeProgram(grouped);
    const next=grouped.reviseData({source:"source",id:"updated",values:[...rows,{x:1.5,y:3,group:"a"}]});
    assert.deepEqual(next.compositionSpec.children,grouped.compositionSpec.children);
    assert.equal(next.compositionSpec.facet.data,"updated");
    assert.notEqual(renderToSVG(next),renderToSVG(grouped));
    for(const child of Object.values(next.children)) assert.deepEqual(child.actionStack,[]);
    assert.deepEqual(next.editFacetScales({y:"independent"}).actionStack,[]);
    assert.equal(serializeProgram(grouped),before);
  }
});

test("source revision rejects incompatible fields and unused selection fields atomically", () => {
  for(const p of [points(), points().selectMarks({id:"group",field:"group",op:"eq",value:"a"})]) {
    const before=serializeProgram(p);
    assert.throws(()=>p.reviseData({source:"source",id:"updated",values:[{x:3}]}));
    assert.equal(serializeProgram(p),before);
  }
  const p=points().selectMarks({id:"group",field:"group",op:"eq",value:"a"});
  assert.throws(()=>p.reviseData({source:"source",id:"updated",values:[{x:3,y:4}]}),/Selection field/);
});

test("source revision validates complete inputs, original source identity, and explicit concat child scope", () => {
  const p=points();
  for(const args of [{},{source:"source",id:"source",values:rows},{source:"absent",id:"next",values:rows},
    {source:"source",id:"next",values:[,{}]},{source:"source",id:"next",values:[{fn(){}}]},
    {source:"source",id:"next",values:rows,dependents:"recompute"}]) assert.throws(()=>p.reviseData(args));
  const derived=p.filterData({id:"filtered",source:"source",field:"x",range:{min:0,max:3}});
  assert.throws(()=>derived.reviseData({source:"filtered",id:"next",values:rows}),/original dataset/);
  const joined=hconcat({programs:[{id:"left",program:p},{id:"right",program:p}]});
  assert.throws(()=>joined.reviseData({source:"source",id:"next",values:rows}),/explicit child/);
  assert.equal(typeof basicChart().reviseData,"undefined");
});

test("source revision preserves renderer output across the complete action corpus with unchanged rows", () => {
  let count=0;
  for(const [index,p] of buildActionRelationshipPrograms().entries()) {
    if(p.compositionSpec?.type==="concat")continue;
    for(const d of p.semanticSpec.datasets.filter(data=>data.source===undefined&&Array.isArray(data.values))) {
      let expected;
      try { expected=renderToSVG(p,{resourceNamespace:"sourceRevision"}); } catch { /* Valid incomplete authoring states need not render. */ }
      const next=p.reviseData({source:d.id,id:`sourceRevision${index}`,values:d.values});
      assert.deepEqual(next.actionStack,[]);
      if(expected!==undefined) assert.equal(renderToSVG(next,{resourceNamespace:"sourceRevision"}),expected,`${index}: ${d.id}`);
      count++;
    }
  }
  assert.ok(count>=140);
});

test("data reference rebinding never renames a statistical reference's mark source with the same ID", () => {
  const p=chart().createCanvas().createData({id:"points",values:rows})
    .createPointMark({id:"points"}).encodeX({field:"x"}).encodeY({field:"y"})
    .createReferenceLine({id:"mean",source:"points",axis:"y",statistic:{op:"mean"}});
  const n=p.reviseData({source:"points",id:"updated",values:[{x:1,y:10},{x:2,y:20}]});
  assert.equal(n.markConfigs.mean.statisticalReference.source,"points");
  assert.equal(n.semanticSpec.layers.find(layer=>layer.id==="points").data,"updated");
  const layer=n.semanticSpec.layers.find(layer=>layer.id==="mean");
  const beforeLayer=p.semanticSpec.layers.find(layer=>layer.id==="mean");
  assert.notDeepEqual(n.semanticSpec.datasets.find(d=>d.id===layer.data).values,
    p.semanticSpec.datasets.find(d=>d.id===beforeLayer.data).values);
});
