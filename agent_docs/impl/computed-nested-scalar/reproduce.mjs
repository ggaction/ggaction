import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chart} from '../../../src/index.js';
const rows=[{venue:{name:'North',capacity:100}},{venue:{name:'South',capacity:200}},{}];
const base=chart().createData({values:rows});
const before=JSON.stringify(base.semanticSpec),errors=[];
for(const [kind,expression] of [['literal dotted field',{field:'venue.name'}],['proposed explicit nested accessor',{op:'getPath',operand:{field:'venue'},path:['name']}]]){
 assert.throws(()=>base.createComputedData({id:'names',as:'venueName',expression}),error=>{errors.push({kind,name:error.name,message:error.message});return true;});
}
assert.equal(JSON.stringify(base.semanticSpec),before);assert.deepEqual(rows,[{venue:{name:'North',capacity:100}},{venue:{name:'South',capacity:200}},{}]);
const report={reviewer:'codex',gate:'ready-for-review',runtimeCommit:'8700172097655fb229745f26161b56403fe03822',kind:'existing-public-computed-nested-scalar-gap',syntheticRawRows:rows,errors,priorProgramAndCallerRowsUnchanged:true,proposedResult:['North','South',null],modelCalls:0,chartPixelsInspected:false};
await fs.writeFile(new URL('./rejection-evidence.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
