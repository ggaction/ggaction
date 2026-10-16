import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chart} from '../../../src/index.js';
const rows=[{Change:'1.15%'},{Change:'-2.50%'},{Change:'0%'}];
const base=chart().createData({values:rows});
const before=JSON.stringify(base.semanticSpec),errors=[];
for(const [kind,expression] of [['existing finite decimal conversion',{op:'toNumber',operand:{field:'Change'}}],['proposed literal-only replacement',{op:'replaceLiteral',operand:{field:'Change'},search:'%',replacement:''}]]){
  assert.throws(()=>base.createComputedData({id:'changes',as:'change',expression}),error=>{errors.push({kind,name:error.name,message:error.message});return true;});
}
assert.equal(JSON.stringify(base.semanticSpec),before);
assert.deepEqual(rows,[{Change:'1.15%'},{Change:'-2.50%'},{Change:'0%'}]);
const report={reviewer:'codex',gate:'ready-for-review',kind:'existing-public-computed-literal-string-replace-gap',runtimeCommit:'8700172097655fb229745f26161b56403fe03822',syntheticRawRows:rows,errors,priorProgramAndCallerRowsUnchanged:true,proposedReplacedStrings:['1.15','-2.50','0'],proposedNumericShares:[.0115,-.025,0],modelCalls:0,chartPixelsInspected:false};
await fs.writeFile(new URL('./rejection-evidence.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
