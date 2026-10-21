import test from "node:test";
import assert from "node:assert/strict";
import {normalizeLookupTransform, validateLookupTransform, deriveLookupRows} from "../../../src/grammar/lookup.js";

const options={field:"person",lookup:{data:"people",key:"name",fields:["age","height"]}};
test("lookup preserves primary grain and independent typed source values",()=>{
  const people=[{name:"A",age:25,height:180},{name:"B",age:32,height:174},{name:"C",age:39,height:182}];
  const rows=[{person:"C",group:"1","":12},{person:"A",group:"1","":13},{person:"B",group:"1","":14}];
  const snapshot=structuredClone({rows,people}),definition=normalizeLookupTransform(options);
  assert.deepEqual(deriveLookupRows(rows,people,definition),[
    {person:"C",group:"1","":12,age:39,height:182},
    {person:"A",group:"1","":13,age:25,height:180},
    {person:"B",group:"1","":14,age:32,height:174}
  ]);
  assert.deepEqual({rows,people},snapshot);
  assert(Object.isFrozen(definition.lookup.fields));
});
test("lookup keys retain scalar types and never match absent values",()=>{
  const definition=normalizeLookupTransform({field:"k",lookup:{data:"right",key:"key",fields:["value"]}});
  const left=[{k:1},{k:"1"},{k:true},{k:""},{k:null},{}, {k:false}];
  const right=[{key:1,value:"number"},{key:"1",value:"string"},{key:true,value:"boolean"},{key:"",value:"empty"},{key:null,value:"null"},{value:"absent"}];
  assert.deepEqual(deriveLookupRows(left,right,definition).map(r=>r.value),["number","string","boolean","empty",null,null,null]);
});
test("lookup explicit aliases preserve nested values through independent frozen copies",()=>{
  const nested={a:[1,{b:2}]},left=[{person:"A",age:"original"}],right=[{name:"A",age:nested}];
  const definition=normalizeLookupTransform({field:"person",lookup:{data:"right",key:"name",fields:["age"],as:["matchedAge"]}});
  const result=deriveLookupRows(left,right,definition);
  assert.deepEqual(result,[{person:"A",age:"original",matchedAge:nested}]);
  assert.notEqual(result[0].matchedAge,nested);assert(Object.isFrozen(result[0].matchedAge.a));
  assert(!Object.isFrozen(nested));
});
test("lookup missing selected fields and missing matches become explicit nulls",()=>{
  assert.deepEqual(deriveLookupRows([{person:"A"},{person:"B"}],[{name:"A",age:undefined,height:null}],normalizeLookupTransform(options)),[{person:"A",age:null,height:null},{person:"B",age:null,height:null}]);
  assert.deepEqual(deriveLookupRows([{person:"A"}],[],normalizeLookupTransform(options)),[{person:"A",age:null,height:null}]);
  assert.deepEqual(deriveLookupRows([],[],normalizeLookupTransform(options)),[]);
});
test("lookup rejects duplicate non-null right keys even for empty primary data",()=>{
  for(const rows of [[],[{person:"A"}]])assert.throws(()=>deriveLookupRows(rows,[{name:"A"},{name:"A"}],normalizeLookupTransform(options)),/duplicate/);
  assert.deepEqual(deriveLookupRows([],[{name:null},{name:null},{},{}],normalizeLookupTransform(options)),[]);
});
test("lookup does not overwrite primary keys",()=>assert.throws(()=>deriveLookupRows([{person:"A",age:0}],[{name:"A",age:25}],normalizeLookupTransform(options)),/already exists/));
test("lookup own-property aliases do not mutate object prototypes",()=>{
  const definition=normalizeLookupTransform({field:"person",lookup:{data:"right",key:"name",fields:["value"],as:["__proto__"]}});
  const result=deriveLookupRows([{person:"A"}],[{name:"A",value:{safe:true}}],definition);
  assert(Object.hasOwn(result[0],"__proto__"));assert.deepEqual(result[0].__proto__,{safe:true});
  assert.equal(Object.getPrototypeOf(result[0]),Object.prototype);assert.equal({}.safe,undefined);
});
test("lookup rejects structured and nonfinite keys on either side",()=>{
  for(const value of [{},[],Infinity,NaN]){
    assert.throws(()=>deriveLookupRows([{person:value}],[],normalizeLookupTransform(options)),/key field/);
    assert.throws(()=>deriveLookupRows([],[{name:value}],normalizeLookupTransform(options)),/key field/);
  }
});
test("lookup retains row-preserving data above the generated-glyph limit",()=>{
  const rows=Array.from({length:10_001},(_,id)=>({person:"A",id}));
  const result=deriveLookupRows(rows,[{name:"A",age:25,height:180}],normalizeLookupTransform(options));
  assert.equal(result.length,10_001);assert.equal(result.at(-1).id,10_000);
});
test("lookup bounds linear work before creating output",()=>{
  const fields=Array.from({length:64},(_,i)=>"f"+i),rows=Array(200_000).fill({person:"A"});
  assert.throws(()=>deriveLookupRows(rows,[],normalizeLookupTransform({field:"person",lookup:{data:"right",key:"name",fields}})),/Lookup work/);
});
for(const[name,patch]of Object.entries({
  "missing field":x=>delete x.field,
  "missing lookup":x=>delete x.lookup,"unknown lookup key":x=>x.lookup.extra=true,
  "missing dataset":x=>delete x.lookup.data,"blank key":x=>x.lookup.key="",
  "empty fields":x=>x.lookup.fields=[],"duplicate fields":x=>x.lookup.fields=["age","age"],
  "alias count":x=>x.lookup.as=["age"],"duplicate aliases":x=>x.lookup.as=["a","a"],
  "null aliases":x=>x.lookup.as=null,
  "blank alias":x=>x.lookup.as=["","b"],"sparse fields":x=>{x.lookup.fields=Array(2);}
}))test("lookup rejects "+name,()=>{const input=structuredClone(options);patch(input);assert.throws(()=>normalizeLookupTransform(input));});
test("stored lookup definitions require complete normalized aliases",()=>{
  const transform=structuredClone(normalizeLookupTransform(options));delete transform.lookup.as;
  assert.throws(()=>validateLookupTransform(transform),/one alias/);
});
test("stored lookup definitions reject unknown properties",()=>{
  const transform=structuredClone(normalizeLookupTransform(options));transform.extra=true;
  assert.throws(()=>validateLookupTransform(transform),/Unknown/);
});
