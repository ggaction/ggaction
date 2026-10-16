import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chart} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';

const base=chart().createCanvas({width:500,height:320,margin:{left:104,right:21,top:34,bottom:86}})
 .createData({values:[{x:'1',y:'A'},{x:'2',y:'A'},{x:'3',y:'A'},{x:'1',y:'B'},{x:'2',y:'B'},{x:'3',y:'B'}]})
 .createHeatmap({x:{field:'x',fieldType:'ordinal',scale:{domain:['1','2','3'],paddingInner:0,paddingOuter:0}},y:{field:'y',fieldType:'ordinal'},guides:false});
const parent=JSON.stringify(base),examples=[];
for(const at of ['start','center','end',1,2,3,272.5]){
 try{
  const p=base.createXAxis({line:false,ticksAndLabels:false,title:{text:'Source attribution',at,offset:10,fontSize:11,fontWeight:300}});
  renderToSVG(p);
  examples.push({at,status:'accepted',titleConfig:p.materializationConfigs.axis?.x?.title??null,graphic:p.graphicSpec.objects.xAxisTitle});
 }catch(error){examples.push({at,status:'rejected',error:error.message});}
 assert.equal(JSON.stringify(base),parent);
}
const report={status:'gap-confirmed',runtime:'c53d1edda3625376b75f3157f798a3b099e1a750',plot:{left:104,width:375},desiredAnchorX:376.5,desiredLocalAlong:272.5,currentAnchors:examples,parentUnchanged:JSON.stringify(base)===parent,proposalOnly:true,implementationAdded:false,chartPixelsInspected:false};
assert(examples.find(e=>e.at===272.5).error.includes('inside the scale domain'));
await fs.writeFile(new URL('./EVIDENCE.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,parentUnchanged:report.parentUnchanged,requestedNumericAt:examples.at(-1)}));
