import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chart } from '../../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../../src/persistence.js';
import { deserializeProgram as oldDeserialize, serializeProgram as oldSerialize } from '../../../../../.artifacts/guide-details-baseline/src/persistence.js';
const rows=['Alpha category label','Beta category label','Gamma category label','Delta category label'].map((x,i)=>({x,y:i+1}));
const basic=()=>chart().createCanvas({width:520,height:420,margin:{top:70,right:50,bottom:170,left:90}}).createData({values:rows}).createPointMark().encodeX({field:'x',fieldType:'nominal'}).encodeY({field:'y'});
const cases=[
 {name:'rotated-wrapped-resize',base:basic,edit:p=>p.createXAxisLabels({rotation:-Math.PI/3}).editXAxisLabels({rotation:0,maxWidth:60,wrap:'word',lineHeight:14}).editCanvas({width:600})},
 {name:'both-axis-flush-relative-title',base:basic,edit:p=>p.createXAxisLabels({maxWidth:60,wrap:'word',flush:true,alongOffset:2}).createYAxisLabels({values:[1,2,3,4],align:'center',flush:true,flushThreshold:0}).createXAxisTitle({text:'Category',offset:{from:'labels',gap:12}}).editCanvas({width:650})},
 {name:'responsive-skip-rotate',base:()=>chart().createCanvas({width:400,height:600,margin:10,responsive:{minPlotSize:{width:40,height:40}}}).createData({values:Array.from({length:8},(_,i)=>({x:`Long category ${i}`,y:i+1}))}),
 edit:p=>p.createBarPlot({x:'x',y:'y',guides:{axes:{x:{title:false,ticksAndLabels:{labels:{responsive:{maxLines:1},maxWidth:300}}},y:{title:false}},legend:false}}).editCanvas({width:220})}
];
const results=[];
for(const item of cases){const input=serializeProgram(item.base()); const before=oldSerialize(item.edit(oldDeserialize(input))), after=serializeProgram(item.edit(deserializeProgram(input)));assert.deepEqual(after,before,item.name);results.push({name:item.name,exactSerializedProgramAndTrace:true,sha256:createHash('sha256').update(JSON.stringify(after)).digest('hex')});}
await writeFile('.artifacts/guide-label-layout-equivalence.json',JSON.stringify({baseline:'312026112',cases:results},null,2)+'\n');console.log(JSON.stringify(results));
