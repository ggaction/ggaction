import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';

const cases=[];
for(const groups of [10000,10001,30000,30001]){
 const values=Array.from({length:groups},(_,group)=>({group,value:group%17}));
 const input=JSON.stringify(values),parent=chart().createData({values});
 const parentSemantic=JSON.stringify(parent.semanticSpec),parentGraphic=JSON.stringify(parent.graphicSpec);
 let accepted=false,error;
 try{
  const next=parent.createSummaryData({id:'means',groupBy:['group'],aggregates:[{op:'mean',field:'value',as:'mean'}]});
  const output=next.semanticSpec.datasets.find(d=>d.id==='means').values;
  assert.equal(output.length,groups);
  for(let i=0;i<groups;i++)assert.deepEqual(output[i],{group:i,mean:i%17});
  accepted=true;
 }catch(e){error={name:e.name,message:e.message};assert.equal(e.message,'Summary output cannot exceed 10000 groups.');}
 assert.equal(JSON.stringify(values),input);
 assert.equal(JSON.stringify(parent.semanticSpec),parentSemantic);
 assert.equal(JSON.stringify(parent.graphicSpec),parentGraphic);
 cases.push({groups,currentAccepted:accepted,proposedAccepted:groups<=30000,...(error?{error}:{}),callerInputUnchanged:true,parentSemanticAndGraphicUnchanged:true});
}
assert.deepEqual(cases.map(c=>c.currentAccepted),[true,false,false,false]);
console.log(JSON.stringify({runtimeCommit:'690767d53415b93d22321c7915b0e2eddda24071',proposalOnly:true,implemented:false,cases},null,2));
