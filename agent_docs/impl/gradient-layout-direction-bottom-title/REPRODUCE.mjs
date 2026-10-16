import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chart} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';

const parent=chart().createCanvas({width:620,height:460,margin:{left:60,top:100,right:260,bottom:160}})
 .createData({values:[{x:0,y:0,value:0},{x:1,y:1,value:1}]})
 .createScatterPlot({x:{field:'x'},y:{field:'y'},guides:false})
 .encodeColor({field:'value',fieldType:'quantitative',scale:{domain:[0,1]}});
const parentBytes=JSON.stringify(parent),variants=[];
for(const [name,options] of [
 ['legacy-right',{position:'right',gradient:{length:120},title:'Score'}],
 ['legacy-top',{position:'top',gradient:{length:120},title:'Score'}],
 ['right-horizontal',{position:'right',gradient:{length:120},direction:'horizontal'}],
 ['right-bottom-title',{position:'right',gradient:{length:100},titlePosition:'bottom'}],
 ['edit-horizontal',{position:'right',gradient:{length:120},title:'Score'}],
 ['edit-bottom-title',{position:'right',gradient:{length:100},title:'Score'}]
]) {
 try {
  let p=parent.createLegend(options);
  if(name==='edit-horizontal')p=p.editLegend({direction:'horizontal'});
  if(name==='edit-bottom-title')p=p.editLegend({titlePosition:'bottom'});
  const svg=renderToSVG(p);
  variants.push({name,status:'accepted',config:p.guideConfigs.legend.color,
   objects:Object.fromEntries(Object.entries(p.graphicSpec.objects).filter(([key])=>key.toLowerCase().includes('legend'))),svgBytes:Buffer.byteLength(svg)});
 }catch(error){variants.push({name,status:'rejected',message:error.message});}
 assert.equal(JSON.stringify(parent),parentBytes);
}
for(const name of ['right-horizontal','right-bottom-title','edit-horizontal','edit-bottom-title'])assert.equal(variants.find(v=>v.name===name).status,'rejected');
assert.equal(variants.filter(v=>v.status==='accepted').length,2);
const report={status:'existing-public-gap-confirmed',runtimeCommit:'c53d1edda3625376b75f3157f798a3b099e1a750',syntheticPublicProbe:true,
 desired:[{position:'right',direction:'horizontal',stripWidth:120,stripHeight:16,titlePosition:'top'},{position:'right',direction:'vertical',stripWidth:16,stripHeight:100,titlePosition:'bottom'}],
 variants,parentUnchanged:JSON.stringify(parent)===parentBytes,proposalOnly:true,implementationAdded:false,chartPixelsInspected:false};
await fs.writeFile(new URL('./EVIDENCE.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,parentUnchanged:report.parentUnchanged,variants:variants.map(({name,status,message})=>({name,status,message}))}));
