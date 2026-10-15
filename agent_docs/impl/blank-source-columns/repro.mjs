// Source-neutral stored-row boundary repro; no translated chart or rendering.
import assert from 'node:assert/strict';
import {chart} from 'ggaction';
const rows=[{x:1,y:2,'':'unreferenced CSV cell'}],input=JSON.stringify(rows),before=chart(),snapshot=JSON.stringify(before);
const cases=[
  {name:'inferred-schema',options:{values:rows}},
  {name:'declared-schema-omits-unused-column',options:{values:rows,schema:{fields:[{name:'x',storageType:'number'},{name:'y',storageType:'number'}]}}},
  {name:'declared-schema-preserves-column',options:{values:rows,schema:{fields:[{name:'x',storageType:'number'},{name:'y',storageType:'number'},{name:'',storageType:'string'}]}}}
];
const results=cases.map(({name,options})=>{let error;try{before.createData(options);}catch(e){error=e.message;}assert.ok(error);assert.equal(JSON.stringify(before),snapshot);assert.equal(JSON.stringify(rows),input);return{name,error,previousProgramUnchanged:true,callerInputUnchanged:true};});
console.log(JSON.stringify({status:'confirmed-stored-row-schema-boundary',rows,results},null,2));
