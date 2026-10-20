import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveFlattenRows, normalizeFlattenTransform } from "../../../../src/grammar/flatten.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const rows = [
  { amounts: [1, 2], labels: ["A", "B"], group: "alpha" },
  { amounts: [3, 4, 5], labels: ["C", "D"], group: "beta" }
];
const options = { id: "expanded", fields: ["amounts", "labels"], as: ["x", "label"] };
const expected = [
  { ...rows[0], x: 1, label: "A" },
  { ...rows[0], x: 2, label: "B" },
  { ...rows[1], x: 3, label: "C" },
  { ...rows[1], x: 4, label: "D" },
  { ...rows[1], x: 5, label: null }
];
const expanded = p => p.semanticSpec.datasets.find(d => d.id === "expanded");

for (const [name, create] of [["Full", chart], ["Basic", basicChart]]) {
  test(`${name} aligned expansion preserves five observations and immutable raw arrays`, () => {
    const input = structuredClone(rows), args = structuredClone(options);
    const source = create().createData({ values: input }), before = JSON.stringify(source);
    const p = source.createFlattenData(args);
    assert.deepEqual(expanded(p).values, expected);
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.equal(JSON.stringify(source), before);
    assert.deepEqual(input, rows);
    assert.deepEqual(args, options);
    assert(Object.isFrozen(expanded(p).values[0].amounts));
    assert.deepEqual(expanded(p).transform, [{type:"flatten",fields:options.fields,as:options.as}]);
    assert.deepEqual(p.trace.children.at(-1).children.map(n => n.op), ["createDerivedData", "materializeFlattenData"]);
    const schema = expanded(p).schema.fields;
    assert.deepEqual(schema.find(f=>f.name==="x").lineage, {inputs:[{data:"data",field:"amounts"}],owner:"expanded",role:"value:amounts"});
    assert.equal(schema.find(f=>f.name==="x").storageType,"number");
    assert.equal(schema.find(f=>f.name==="label").storageType,"string");
    assert.equal(schema.find(f=>f.name==="label").nullable,true);
    assert.equal(schema.find(f=>f.name==="group").nullable,false);
  });
  test(`${name} defaults replace selected arrays only in derived rows`, () => {
    const p=create().createData({values:rows}).createFlattenData({id:"expanded",fields:["labels","amounts"]});
    assert.deepEqual(expanded(p).values.map(r=>[r.labels,r.amounts]),[["A",1],["B",2],["C",3],["D",4],[null,5]]);
    assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
  });
  test(`${name} rejects invalid inputs without changing earlier state or trace`, () => {
    const source=create().createData({values:rows}),before=JSON.stringify(source);
    for(const bad of [
      {fields:[]}, {fields:["amounts","amounts"]}, {fields:["amounts"],as:[]},
      {fields:["amounts","labels"],as:["same","same"]},
      {fields:["amounts"],as:[""]}, {fields:["amounts"],as:["group"]},
      {fields:["group"]}, {fields:["missing"]}, {fields:["amounts"],extra:true}
    ])assert.throws(()=>source.createFlattenData({id:"bad",...bad}));
    assert.equal(JSON.stringify(source),before);
  });
  test(`${name} empty/null/missing arrays align without fabricating rows`, () => {
    const input=[{a:[],b:[]},{a:null,b:["C","D"]},{b:["E"]},{a:[0],b:null}];
    const p=create().createData({values:input}).createFlattenData({id:"expanded",fields:["a","b"],as:["x","y"]});
    assert.deepEqual(expanded(p).values.map(r=>[r.x,r.y]),[[null,"C"],[null,"D"],[null,"E"],[0,null]]);
    assert.deepEqual(p.semanticSpec.datasets[0].values,input);
  });
  test(`${name} empty source with declared fields and JSON array elements is supported`, () => {
    const empty=create().createData({values:[],schema:{fields:[{name:"a",storageType:"array"}]}}).createFlattenData({id:"expanded",fields:["a"]});
    assert.deepEqual(expanded(empty).values,[]);
    const nested=[{a:[{value:1},[2],false,null],other:"kept"}];
    const p=create().createData({values:nested}).createFlattenData({id:"expanded",fields:["a"],as:["value"]});
    assert.deepEqual(expanded(p).values.map(r=>r.value),[{value:1},[2],false,null]);
    assert.deepEqual(p.semanticSpec.datasets[0].values,nested);
  });
  test(`${name} ordinary scatter facade consumes every expanded numeric observation`, () => {
    const p=create().createCanvas().createData({values:rows})
      .createFlattenData({id:"expanded",fields:["amounts"],as:["x"]})
      .createScatterPlot({x:"x",y:"x",guides:false});
    assert.equal(p.graphicSpec.objects.scatterPlot.items.length,5);
    assert(renderToSVG(p).includes("<circle"));
  });
}

test("aligned expansion bounds fields and total rows with exact inclusive boundary", () => {
  assert.throws(()=>normalizeFlattenTransform({fields:Array.from({length:65},(_,i)=>`f${i}`)}),/more than 64/);
  const t=normalizeFlattenTransform({fields:["a"]});
  assert.equal(deriveFlattenRows([{a:Array(10000).fill(1)}],t).length,10000);
  assert.throws(()=>deriveFlattenRows([{a:Array(10001).fill(1)}],t),/cannot exceed 10000 rows/);
  assert.throws(()=>deriveFlattenRows([{a:[1]},{a:7}],t),/row 1/);
  assert.throws(()=>normalizeFlattenTransform({fields:["a"],as:"x"}),/one alias per field/);
  assert.throws(()=>normalizeFlattenTransform({fields:["a"],as:null}),/one alias per field/);
  assert.throws(()=>normalizeFlattenTransform({fields:["a",,]}));
  assert.throws(()=>normalizeFlattenTransform({fields:["a"],as:Array(1)}));
});

test("Full persistence retains transform, typed schema, raw ancestors and output exactly", () => {
  const p=chart().createData({values:rows}).createFlattenData(options);
  const revived=deserializeProgram(serializeProgram(p));
  assert.deepEqual(revived.semanticSpec,p.semanticSpec);
  assert.deepEqual(revived.materializationConfigs,p.materializationConfigs);
});

test("Full flattened edits create immutable revisions and rebind renamed scalar outputs", () => {
  const p=chart().createCanvas().createData({values:rows}).createFlattenData({id:"expanded",fields:["amounts"],as:["x"]})
    .createScatterPlot({x:"x",y:"x",guides:false});
  const before=JSON.stringify(p),next=p.editFlattenData({target:"expanded",as:["value"]});
  assert.equal(JSON.stringify(p),before);
  assert.equal(next.semanticSpec.layers[0].encoding.x.field,"value");
  assert.equal(next.semanticSpec.layers[0].encoding.y.field,"value");
  assert.equal(next.graphicSpec.objects.scatterPlot.items.length,5);
  assert.deepEqual(next.graphicSpec,p.graphicSpec);
  assert.deepEqual(next.semanticSpec.datasets[0].values,rows);
  assert.throws(()=>p.editFlattenData({target:"expanded"}),/empty|requires|at least/i);
});

test("Full dependent replay rejects by default and recomputes an expansion chain atomically", () => {
  const source=chart().createData({values:[{a:[1,2],b:[3,4]}]})
    .createFlattenData({id:"expanded",fields:["a"],as:["x"]})
    .createComputedData({id:"twice",as:"twice",expression:{op:"multiply",left:{field:"x"},right:{constant:2}}});
  const before=JSON.stringify(source);
  assert.throws(()=>source.editFlattenData({target:"expanded",fields:["b"]}),/dependents/);
  const next=source.editFlattenData({target:"expanded",fields:["b"],dependents:"recompute"});
  assert.deepEqual(next.semanticSpec.datasets.at(-1).values.map(r=>r.twice),[6,8]);
  assert.equal(JSON.stringify(source),before);
  assert.throws(()=>source.editFlattenData({target:"expanded",as:["b","x"],dependents:"recompute"}));
  assert.equal(JSON.stringify(source),before);
});

test("source revisions replay aligned array data and leave all old snapshots unchanged", () => {
  const p=chart().createCanvas().createData({values:[{a:[1,2]}]})
    .createFlattenData({id:"expanded",fields:["a"],as:["x"]})
    .createScatterPlot({x:"x",y:"x",guides:false});
  const before=JSON.stringify(p);
  const next=p.reviseData({source:"data",id:"revised",values:[{a:[3,4,5]}]});
  assert.equal(next.graphicSpec.objects.scatterPlot.items.length,3);
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(next.semanticSpec.datasets.find(d=>d.id==="data").values,[{a:[1,2]}]);
  assert.deepEqual(next.semanticSpec.datasets.find(d=>d.id===next.semanticSpec.layers[0].data).values.map(r=>r.x),[3,4,5]);
  assert.throws(()=>p.reviseData({source:"data",id:"invalid",values:[{a:9}]}),/array/);
  assert.equal(JSON.stringify(p),before);
});

test("faceting keeps original raw ancestors and partitions the expanded observations", () => {
  const p=chart().createCanvas({width:180,height:160,margin:20}).createData({values:rows})
    .createFlattenData({id:"expanded",fields:["amounts"],as:["x"]})
    .createScatterPlot({x:"x",y:"x",guides:false}).facet({field:"group",data:"expanded"});
  assert.deepEqual(p.compositionSpec.facet.values,["alpha","beta"]);
  assert.deepEqual(p.compositionSpec.children.map(id=>{
    const c=p.children[id];assert.deepEqual(c.semanticSpec.datasets[0].values,rows);
    return c.semanticSpec.datasets.find(d=>d.id===c.semanticSpec.layers[0].data).values.map(r=>r.x);
  }),[[1,2],[3,4,5]]);
});

test("generic derived editing keeps independent array output roles and exact raw values", () => {
  const p=chart().createData({values:rows}).createFlattenData(options);
  const next=p.editDerivedData({target:"expanded",definition:{type:"flatten",fields:["amounts"],as:["value"]}});
  const actual=next.semanticSpec.datasets.find(d=>d.id===next.context.currentData);
  assert.deepEqual(actual.values.map(r=>r.value),[1,2,3,4,5]);
  assert.deepEqual(next.semanticSpec.datasets[0].values,rows);
});
