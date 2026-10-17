import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {serializeProgram,deserializeProgram} from "../../../../src/persistence.js";

const floor = {op:"floor",operand:{field:"value"}};
test("floor preserves independent rows, signed zero and immutable provenance",()=>{
 const values=[1.8,-1.8,-0.2,0,-0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE].map(value=>Object.freeze({value}));
 const base=chart().createData({id:"raw",values}); const before=serializeProgram(base);
 const next=base.createComputedData({id:"rounded",as:"lower",expression:floor});
 const output=next.semanticSpec.datasets[1].values.map(row=>row.lower);
 assert.deepEqual(output,[1,-2,-1,0,-0,0,-1,Number.MAX_VALUE]);
 assert.equal(serializeProgram(base),before);
 assert.deepEqual(deserializeProgram(serializeProgram(next)).semanticSpec,next.semanticSpec);
 const edited=next.editComputedData({target:"rounded",expression:{op:"negate",operand:floor}});
 const current=edited.materializationConfigs.data.computed.rounded.current;
 assert.deepEqual(edited.semanticSpec.datasets.find(d=>d.id===current).values.map(r=>r.lower),output.map(v=>-v));
});
test("floor rejects invalid operands and preserves lazy evaluation and existing bounds",()=>{
 const base=chart().createData({values:[{value:"1.8"}]}); const before=serializeProgram(base);
 for(const expression of [floor,{op:"floor"},{...floor,extra:true},{op:"floor",operand:{constant:null}}]){
  assert.throws(()=>base.createComputedData({id:"bad",as:"n",expression}));
  assert.equal(serializeProgram(base),before);
 }
 const parsed=base.createComputedData({id:"parsed",as:"n",expression:{op:"floor",operand:{op:"toNumber",operand:{field:"value"}}}});
 assert.equal(parsed.semanticSpec.datasets[1].values[0].n,1);
 const lazy=base.createComputedData({id:"lazy",as:"n",expression:{op:"if",condition:{constant:false},then:floor,else:{constant:null}}});
 assert.equal(lazy.semanticSpec.datasets[1].values[0].n,null);
 let expression={constant:1};for(let i=0;i<16;i++)expression={op:"floor",operand:expression};
 assert.throws(()=>base.createComputedData({id:"deep",as:"n",expression}),/depth 16/);
});
test("floor derives all 20000 interval endpoints without aggregating 5000 observations",()=>{
 const values=Array.from({length:5000},(_,i)=>({x:(i-2500)*0.37,y:(i-2500)*17.25}));
 let program=chart().createData({id:"raw",values});
 for(const [field,width] of [["x",5],["y",1000]]) {
  program=program.createComputedData({id:field+"-lower",as:field+"Lower",expression:{op:"multiply",left:{op:"floor",operand:{op:"divide",left:{field},right:{constant:width}}},right:{constant:width}}})
   .createComputedData({id:field+"-upper",as:field+"Upper",expression:{op:"add",left:{field:field+"Lower"},right:{constant:width}}});
 }
 const rows=program.semanticSpec.datasets.at(-1).values;
 assert.equal(rows.length,5000);
 for(let i=0;i<5000;i++)for(const [field,width] of [["x",5],["y",1000]]) {
  const expected=width*Math.floor(values[i][field]/width);
  assert.equal(rows[i][field+"Lower"],expected);assert.equal(rows[i][field+"Upper"],expected+width);
 }
 assert.deepEqual(program.semanticSpec.datasets[0].values,values);
});

