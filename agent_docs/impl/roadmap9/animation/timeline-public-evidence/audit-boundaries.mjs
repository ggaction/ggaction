import assert from 'node:assert/strict';
import {chart} from '../../../../../src/index.js';
import {planTransition,createAnimationPlayer,sampleTransition} from '../../../../../src/animation.js';
const from=chart().createCanvas({width:300,height:200}).createData({values:[{x:1,y:2}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'});
const prepare=extra=>planTransition({from,to:from,options:{durationMs:100,easing:'linear',...extra}});
const ordinary=prepare({}),decision=sampleTransition(ordinary,50).decisions.find(d=>d.itemKey);
const track={target:{itemKey:decision.itemKey},property:'opacity',kernel:'number',keyframes:[{timeMs:0,value:1},{timeMs:100,value:1}]};
let reads=0;const probes=[
 ()=>prepare({tracks:[{...track,target:{get itemKey(){reads++;return decision.itemKey;}}}]}),
 ()=>prepare({tracks:[{...track,keyframes:[{timeMs:0,get value(){reads++;return 1;}}]}]}),
 ()=>prepare({markers:[{get id(){reads++;return 'x'},timeMs:1}]}),
 ()=>prepare({markers:Array.from({length:10001},(_,i)=>({id:String(i),timeMs:1}))}),
 ()=>prepare({tracks:[{...track,priority:undefined}]}),
 ()=>prepare({tracks:[{...track,priority:.1}]}),
 ()=>prepare({tracks:[track,track]}),
 ()=>prepare({tracks:[{...track,keyframes:[{timeMs:0,value:1},{timeMs:100.1,value:1}]}]}),
 ()=>prepare({tracks:[{...track,keyframes:[{timeMs:0,value:1},{timeMs:50,value:-.1},{timeMs:100,value:1}]}]}),
 ()=>prepare({markers:[{id:'a',timeMs:Infinity}]}),
 ()=>prepare({tracks:[{...track,target:{itemKey:decision.itemKey,role:undefined}}]}),
 ()=>prepare({tracks:[{...track,kernel:'positive-scale',keyframes:[{timeMs:0,value:1},{timeMs:50,value:0},{timeMs:100,value:1}]}]})
];
probes.forEach((probe,index)=>assert.throws(probe,undefined,`boundary ${index}`));assert.equal(reads,0);
const frozen=prepare({tracks:[track]});track.target.itemKey='changed';track.keyframes[0].value=0;sampleTransition(frozen,50);
console.log(JSON.stringify({invalidCases:probes.length,getterReads:reads,callerIsolation:'passed'}));
