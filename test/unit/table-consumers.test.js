import test from "node:test";
import assert from "node:assert/strict";
import { ChartProgram } from "../../src/ChartProgram.js";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../src/materialization/selection/policies/index.js";
const rows = [{id:1,v:2,g:"a"},{id:"1",v:-1,g:"b"}];
const base = () => chart().createCanvas({width:500,height:240,margin:{left:20,top:20,bottom:20,right:140}}).createData({id:"d",values:rows,keyField:"id"});
const create = patch => base().createTablePlot({columns:[{field:"v",footer:"sum",cell:"bar"}],...patch});
test("Table color reassignment removes the old legend explicitly and accepts inherited categorical or temporal scales", () => {
  const p=create({color:"g"}).createLegend();
  const q=p.editTablePlot({color:false});
  assert.equal(q.semanticSpec.layers[0].encoding?.color,undefined);
  assert.equal(q.semanticSpec.guides.legend,undefined);
  const ordinal=q.editTablePlot({color:{field:"g",fieldType:"ordinal"}});
  assert.equal(ordinal.semanticSpec.layers[0].encoding.color.fieldType,"ordinal");
  const temporal=q.editTablePlot({color:{field:"v",fieldType:"temporal"}});
  assert.equal(temporal.semanticSpec.layers[0].encoding.color.fieldType,"temporal");
  assert.throws(()=>q.editTablePlot({color:{field:"v",fieldType:"unknown"}}),/fieldType/);
  assert.throws(()=>q.editTablePlot({color:{field:"v",extra:true}}),/unknown|Unknown/);
});
test("Table source-only items retain identities without graphical materialization; stale concrete identity is rejected", () => {
  const p=create(), source=resolveMarkSourceItems(p,"table"), concrete=resolveMarkItems(p,"table");
  assert.deepEqual(source.map(item=>item.key),concrete.map(item=>item.key));
  assert.deepEqual(source.map(item=>item.rows),concrete.map(item=>item.rows));
  const objects={...p.graphicSpec.objects}; for (const id of p.graphicSpec.objects.table.children) delete objects[id]; delete objects.table;
  const detached=new ChartProgram({...p,graphicSpec:{...p.graphicSpec,objects}});
  assert.deepEqual(resolveMarkSourceItems(detached,"table").map(item=>item.key),source.map(item=>item.key));
  assert.throws(()=>resolveMarkItems(detached,"table"),/materialized/);
  const first=p.graphicSpec.objects.table.children[0], child=p.graphicSpec.objects[first];
  const stale=new ChartProgram({...p,graphicSpec:{...p.graphicSpec,objects:{...p.graphicSpec.objects,[first]:{...child,items:child.items.map(({identity,...item})=>item)}}}});
  assert.throws(()=>resolveMarkItems(stale,"table"),/stale cell identity/);
});
test("Table structured fills and effects remain concrete through resize, reset and visible row count notices", () => {
  const pattern={type:"pattern",style:"diagonal",pitch:8,strokeWidth:2,foreground:"#ef4444",background:"#ffffff",coordinateSpace:"plot"};
  const radial={type:"radial-gradient",center:{x:.5,y:.5},focal:{x:.5,y:.5},radius:.5,stops:[{offset:0,color:"#fff"},{offset:1,color:"#000"}]};
  const p=create({rowLimit:1,cells:{fill:pattern,outline:{color:"#000",width:1},shadow:{color:"#00000080",offsetX:1,offsetY:1,blurRadius:1}},labels:{fill:radial},clip:false});
  const q=p.editCanvas({width:600}).editTablePlot({cells:{outline:false,shadow:false},labels:{outline:false,shadow:false}});
  const children=q.graphicSpec.objects.table.children.flatMap(id=>q.graphicSpec.objects[id].items);
  assert.ok(children.filter(item=>item.type==="rect"&&item.identity.role==="body"&&item.identity.lineage.rowKeys.length===1).every(item=>item.properties.fill.type==="pattern"));
  assert.ok(children.every(item=>item.properties.outline===undefined&&item.properties.shadow===undefined));
  assert.ok(q.graphicSpec.objects.table.items[0].properties.fillBounds);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.equal(q.graphicSpec.objects.table.clip,undefined);
});
test("Table single-sample sparklines preserve their style and exact cell clip while effect resets disappear", () => {
  const p=chart().createCanvas().createData({values:[{trend:[{x:0,y:3}]}]}).createTablePlot({columns:[{field:"trend",cell:{type:"sparkline",x:"x",y:"y"}}],
    sparklines:{stroke:"#f00",strokeWidth:6,opacity:.5,shadow:{color:"#00000080",offsetX:1,offsetY:1,blurRadius:1}}}).editTablePlot({sparklines:{outline:{color:"#000",width:2}}});
  const item=p.graphicSpec.objects.table.children.flatMap(id=>p.graphicSpec.objects[id].items).find(item=>item.type==="circle");
  assert.equal(item.properties.radius,3); assert.equal(item.properties.fill,"#f00"); assert.equal(item.properties.stroke,"none");
  assert.equal(item.properties.outline.width,2); assert.equal(item.properties.shadow.blurRadius,1);
  assert.throws(()=>p.materializeTablePlot({id:"table",scales:"yes"}),/boolean/);
  const point=base().createPointMark({id:"point",data:"d"});
  assert.throws(()=>point.materializeTablePlot({id:"point"}),/Table mark/);
});
test("Table edits preserve omitted columns and reconcile removal of the last cell collection", () => {
  const p=create({header:false});
  const q=p.editTablePlot({columns:["v"],rowLimit:0,clip:false});
  assert.equal(q.graphicSpec.objects.table.children.length,0);
  assert.equal(getMarkItems(q,{target:"table"}).length,0);
  assert.equal(q.graphicSpec.objects.table.items[0].properties.text,"0 of 2 rows shown");
  assert.throws(()=>q.editTablePlot({}),/nonempty/);
  assert.throws(()=>q.editTablePlot({rowLimit:undefined}),/undefined/);
  assert.throws(()=>q.createTablePlot({columns:["v"]}),/already|exists|unique|id/);
});

test("Table pattern palettes apply only to source-colored body backgrounds and preserve explicit cell fills", () => {
  const pattern={type:"pattern",style:"dots",pitch:8,strokeWidth:2,foreground:"#000",background:"#fff",coordinateSpace:"plot"};
  const p=create({color:"g"}), themed=p.applyTheme({theme:{base:"light",tokens:{patternPalette:[pattern]}}});
  const cells=themed.graphicSpec.objects.table.children.flatMap(id=>themed.graphicSpec.objects[id].items);
  assert.ok(cells.filter(item=>item.identity.role==="body"&&item.identity.lineage.rowKeys.length===1).every(item=>item.properties.fill.type==="pattern"));
  assert.ok(cells.filter(item=>item.identity.role==="bar"||item.type==="text").every(item=>typeof item.properties.fill==="string"));
  assert.deepEqual(themed.removeTheme().graphicSpec,p.graphicSpec);
  const explicit=p.editTablePlot({cells:{fill:"#eee"}}).applyTheme({theme:{base:"light",tokens:{patternPalette:[pattern]}}});
  assert.ok(explicit.graphicSpec.objects.table.children.flatMap(id=>explicit.graphicSpec.objects[id].items).filter(item=>item.identity.role==="body"&&item.identity.lineage.rowKeys.length===1).every(item=>typeof item.properties.fill==="string"));
});
