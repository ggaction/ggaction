import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chart} from 'ggaction';
import {planTransition,sampleTransition} from 'ggaction/animation';
function cycles(){
 const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',values:[{key:'r',parent:null,value:0},{key:'a',parent:'r',value:1}]}).createHierarchyData({id:'h',key:'key',parent:'parent',value:'value'}).layoutHierarchy({id:'l',method:'partition'}).createPartitionPlot({labels:false});
 const plan=planTransition({from,to:from.editCanvas({width:600}),options:{durationMs:100,easing:'linear'}}),refs=[];
 for(let i=0;i<100;i++){const frame=sampleTransition(plan,25+i%50);assert.equal(frame.decisions.filter(d=>d.kernel==='partition').length,2);refs.push(new WeakRef(frame));}
 return refs;
}
const refs=cycles();
for(let i=0;i<8;i++){await new Promise(resolve=>setTimeout(resolve,0));globalThis.gc();}
const alive=refs.filter(ref=>ref.deref()!==undefined).length;assert.equal(alive,0);
const result={cycles:100,nodes:2,oldFrames:100,alive,kind:'Small installed frame retention smoke; not canonical memory workload or P95'};
writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
