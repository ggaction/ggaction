// Read-only public-API probe. Optional argument selects another public module entry.
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const entry=process.argv[2]??new URL('../../../src/index.js',import.meta.url).pathname;
const {chart}=await import(pathToFileURL(path.resolve(entry)));
function result(expression,rows=[{value:1.8},{value:-1.8},{value:0}]){try{const p=chart().createData({values:rows}).createComputedData({id:'rounded',as:'rounded',expression});return{accepted:true,values:p.semanticSpec.datasets.at(-1).values.map(r=>r.rounded)};}catch(error){return{accepted:false,name:error.name,message:error.message};}}
console.log(JSON.stringify({operation:result({op:'floor',operand:{field:'value'}}),existingNullNumericPolicy:result({op:'sqrt',operand:{field:'value'}},[{value:null}]),existingMissingNumericPolicy:result({op:'sqrt',operand:{field:'value'}},[{}]),nativeSignedZero:Object.is(Math.floor(-0),-0)},null,2));
