import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { axisLabelSourceResolver } from "../../../src/interaction/hitAxisLabels.js";

const native = () => chart().createCanvas({width:400,height:300,margin:60})
  .createData({values:[{x:0,y:1},{x:2,y:2}]}).createPointMark().encodeX({field:"x"}).encodeY({field:"y"})
  .createXAxis({title:false,ticksAndLabels:{values:[0,1,2],labels:{maxWidth:30,labelMap:[{value:1,label:""}]}}});
const identity = (namespaces=[],value=1) => ({namespaces,owner:"x",component:"labels",value,line:0});
const origin = program => ({kind:"guide-label",program,childPath:[],ownerId:"x",value:1});

test("axis source metadata reads hidden raw ticks once per exact native owner and scope",()=>{
  const unit=native(),program=hconcat({id:"panels",programs:[{id:"left",program:unit},{id:"right",program:unit}]}),checked=[];
  let work=0;const resolve=axisLabelSourceResolver((amount=1)=>work+=amount,p=>{assert.ok(p===program||p===unit);checked.push(p);});
  const source={...origin(program),childPath:["left"]},first=resolve(source,identity(["panels-left"])),initial=work;
  assert.deepEqual(first.metadata,{itemKey:JSON.stringify(["guide",["panels-left"],"x","axis-tick",["array",["axis",1]]]),ownerId:"x",role:"axis-tick",childPath:["left"],rowKeys:[],resourceRefs:[]});
  assert.strictEqual(first.metrics,unit.materializationConfigs.textMetrics);assert.equal(Object.isFrozen(first.metadata),true);
  assert.deepEqual(resolve(source,identity(["panels-left"])),first);assert.equal(work-initial,6);
  const checkedCount=checked.length;assert.equal(resolve(source).metadata,undefined);assert.equal(checked.length,checkedCount);
  assert.notEqual(resolve({...source,childPath:["right"]},identity(["panels-right"])).metadata.itemKey,first.metadata.itemKey);
});

test("axis source metadata rejects unknown scope, owner, typed value and mismatched guide identity",()=>{
  const program=native(),source=origin(program),resolve=axisLabelSourceResolver(()=>{},p=>assert.strictEqual(p,program));
  for(const patch of [{childPath:null},{childPath:[""]},{childPath:Array(1025).fill("x")},{childPath:[2]},{ownerId:""},{ownerId:2}])assert.throws(()=>resolve({...source,...patch}),/child path|scope|array/i);
  assert.throws(()=>resolve({...source,childPath:["missing"]}),/unknown child path/);
  assert.throws(()=>resolve({...source,ownerId:"absent"}),/native label owner/);
  assert.throws(()=>resolve({...source,value:"1"}),/absent/);
  for(const patch of [{namespaces:["elsewhere"]},{owner:"y"},{component:"ticks"},{value:2}])assert.throws(()=>resolve(source,{...identity(),...patch}),/differs/);
  const without=chart().createCanvas(),empty=axisLabelSourceResolver(()=>{},p=>assert.strictEqual(p,without));
  assert.throws(()=>empty(origin(without)),/native label owner/);
  assert.throws(()=>axisLabelSourceResolver(()=>{throw new RangeError("work budget");},()=>{})(source),/work budget/);
});
