import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chart} from '../../../src/index.js';
const paint={type:'linear-gradient',from:{x:0,y:1},to:{x:0,y:0},stops:[{offset:0,color:'white'},{offset:1,color:'#fc6721'}]};
const base=chart().createCanvas({width:240,height:160,margin:20}).createData({values:[{x:0,y:1},{x:1,y:3},{x:2,y:2}]}).createAreaPlot({x:'x',y:'y',guides:false});
const before=JSON.stringify({semantic:base.semanticSpec,graphic:base.graphicSpec});
const errors=[];
for(const [action,run] of [['editAreaMark',()=>base.editAreaMark({fill:paint})],['createAreaPlot',()=>chart().createCanvas({width:240,height:160,margin:20}).createData({values:[{x:0,y:1},{x:1,y:3},{x:2,y:2}]}).createAreaPlot({x:'x',y:'y',area:{fill:paint}})]]){assert.throws(run,error=>{errors.push({action,name:error.name,message:error.message});return /fill.*non-empty string/i.test(error.message);});}
assert.equal(JSON.stringify({semantic:base.semanticSpec,graphic:base.graphicSpec}),before);
const report={reviewer:'codex',gate:'ready-for-review',runtimeCommit:'8700172097655fb229745f26161b56403fe03822',kind:'existing-public-area-gradient-rejection',requestedPaint:paint,errors,priorProgramUnchanged:true,syntheticRows:3,chartPixelsInspected:false,modelCalls:0};
await fs.writeFile(new URL('./rejection-evidence.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
