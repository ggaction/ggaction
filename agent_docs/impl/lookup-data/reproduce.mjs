// Current public capability diagnostic; does not claim an implementation.
import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';
export const people=['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota'].map((name,i)=>({name,age:[25,32,39,42,23,21,51,63,54][i]}));
export const groups=people.map((p,i)=>({group:String(Math.floor(i/3)+1),person:p.name}));
const seed=chart().createData({id:'people',values:people}).createData({id:'groups',values:groups});
assert.equal(typeof seed.createLookupData,'undefined');
assert.throws(()=>seed.createLookupData({id:'ages',field:'person',lookup:{data:'people',key:'name',fields:['age']}}),TypeError);
const expected=groups.map(row=>({...row,age:people.find(p=>p.name===row.person).age}));
const means=['1','2','3'].map(group=>{const rows=expected.filter(r=>r.group===group);return rows.reduce((s,r)=>s+r.age,0)/rows.length;});
assert.deepEqual(means,[32,86/3,56]);
console.log(JSON.stringify({status:'missing-public-lookup-reproduced',leftRows:9,rightRows:9,expectedRows:expected,expectedMeans:means,inputsUnchanged:seed.semanticSpec.datasets[0].values.length===9&&seed.semanticSpec.datasets[1].values.length===9},null,2));
