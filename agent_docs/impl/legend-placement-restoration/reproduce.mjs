// 제안 전 현재 public API 한계를 재현한다. 출력은 JSON뿐이며 파일/이미지를 만들지 않는다.
import {chart} from '../../../src/index.js';
const base = chart()
  .createCanvas({width:1200,height:700,margin:{left:40,top:120,right:860,bottom:280}})
  .createData({values:[
    {x:1,y:2,category:'Alpha',sizeValue:0,alphaValue:0.2},
    {x:2,y:3,category:'Beta',sizeValue:100,alphaValue:0.6},
    {x:3,y:1,category:'Gamma',sizeValue:200,alphaValue:0.9}
  ]})
  .createScatterPlot({x:{field:'x',fieldType:'quantitative'},y:{field:'y',fieldType:'quantitative'},guides:false})
  .encodeColor({field:'category'})
  .encodeSize({field:'sizeValue',fieldType:'quantitative'})
  .editSizeScale({domain:[0,200],range:[4,361]})
  .encodeOpacity({field:'alphaValue',fieldType:'quantitative'});
const original = JSON.stringify(base.graphicSpec), probes=[];
function probe(name, call, run){
  try {const result=run();probes.push({name,call,status:'supported',legendKinds:Object.keys(result.guideConfigs.legend??{})});}
  catch(error){probes.push({name,call,status:'unsupported',message:error.message});}
  if(JSON.stringify(base.graphicSpec)!==original)throw Error('실패/성공 probe가 이전 program을 변경했습니다.');
}
for(const channel of ['color','size','opacity'])for(const position of ['top-left','top-right','bottom-left','bottom-right']){
  const args={channels:[channel],position};
  probe(`${channel}-${position}`,`.createLegend(${JSON.stringify(args)})`,()=>base.createLegend(args));
}
for(const position of ['top','bottom']){
  const args={channels:['color','size'],position,align:'left'};
  probe(`wide-${position}`,`.createLegend(${JSON.stringify(args)})`,()=>base.createLegend(args));
}
const categorical=base.createLegend({channels:['color']});
probe('new-block-row',`.editLegendLayout({position:'top',blockLayout:'row'})`,()=>categorical.editLegendLayout({position:'top',blockLayout:'row'}));
probe('new-free-at',`.editLegendLayout({at:{x:201,y:79}})`,()=>categorical.editLegendLayout({at:{x:201,y:79}}));
console.log(JSON.stringify({kind:'pre-implementation-public-api-reproduction',plot:{width:300,height:300},canvas:{width:1200,height:700},chartPixelsInspected:false,paidCalls:0,previousProgramUnchanged:true,probes},null,2));
