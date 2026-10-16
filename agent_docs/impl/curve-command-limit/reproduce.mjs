import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';
const records=[];
for(const count of [10000,10001,12070,20000,20001]){
 const rows=Array.from({length:count},(_,index)=>({x:index,y:Math.sin(index/100)}));
 const beforeRows=JSON.stringify(rows);
 const parent=chart().createCanvas({width:440,height:340,margin:{left:20,top:20,right:20,bottom:20}}).createData({values:rows});
 const before=JSON.stringify(parent);
 let result;
 try { const p=parent.createLinePlot({x:'x',y:'y',guides:false}); const layer=p.semanticSpec.layers[0];const commands=p.graphicSpec.objects[layer.id].items[0].properties.commands;result={accepted:true,commands:commands.length};assert.equal(commands.length,count); }
 catch(error){result={accepted:false,error:{name:error.name,message:error.message}};}
 assert.equal(JSON.stringify(parent),before);assert.equal(JSON.stringify(rows),beforeRows);
 assert.equal(result.accepted,count<=10000);
 if(!result.accepted)assert.match(result.error.message,/Curve path command count must not exceed 10000/);
 records.push({observations:count,...result,callerAndPreviousProgramUnchanged:true});
}
const report={reviewer:'codex',gate:'ready-for-review',currentLimit:10000,proposedLimit:20000,method:'Ordinary public createLinePlot with finite synthetic points; no chart pixels or model calls.',records,newModelResponses:0,chartPixelsInspected:false};
await fs.writeFile(new URL('./rejection-evidence.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
