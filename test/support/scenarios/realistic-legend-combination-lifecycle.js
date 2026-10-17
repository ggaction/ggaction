import assert from 'node:assert/strict';

// Add real direct-action witnesses before the chart's final presentation. Every
// sample comes from the caller's authentic summary rows; no display rows are made.
export function appendLegendCombinationLifecycle(program) {
 const rows=program.semanticSpec.datasets.find(data=>data.id==='analysisRows').values;
 if(rows.length<2) return program;
 let next=program;
 for(const combine of ['size-shape','color-size']) {
  const id=`direct-legend-${combine}`;
  next=next.createPointMark({id,data:'analysisRows'})
   .encodeX({target:id,field:'rank',scale:{id:`${id}-x`}})
   .encodeY({target:id,field:'value',scale:{id:`${id}-y`}});
  if(combine==='size-shape') {
   const domain=[...new Set(rows.map(row=>row.category))];
   next=next.encodeShape({target:id,field:'category',scale:{id:`${id}-shape`,domain}})
    .encodeSize({target:id,field:'category',fieldType:'ordinal',scale:{id:`${id}-size`,domain,range:domain.map((_,i)=>25+i*25)}});
  } else {
   const domain=[Math.min(...rows.map(row=>row.rank)),Math.max(...rows.map(row=>row.rank))];
   next=next.encodeColor({target:id,field:'rank',fieldType:'quantitative',scale:{id:`${id}-color`,domain,range:['#17365d','#8fbbe8']}})
    .encodeSize({target:id,field:'rank',scale:{id:`${id}-size`,domain,range:[25,100]}});
  }
  const symbol=combine==='size-shape'?{layers:[{type:'line',opacity:0},{type:'point',opacity:0.7},{type:'swatch',opacity:1}]}:{opacity:0.7};
  const options={target:id,combine,clipHeight:8,symbol,border:{strokeDash:[4,2,6,1]}};
  next=next.createGuides({axes:false,grid:false,legend:options})
   .editLegend({target:id,combine:'separate'})
   .editLegend({target:id,combine})
   .removeLegend({target:id})
   .createLegend(options)
   .editLegend({target:id,symbol})
   .editLegendSymbols({target:id,channel:'size',symbol,clipHeight:6})
   .editLegendSymbols({target:id,channel:'size',clipHeight:'auto'})
   .editLegendBlock({target:id,channel:'size',clipHeight:'auto',labelMap:[{value:rows[0][combine==='size-shape'?'category':'rank'],label:'First source group'}]})
   .editLegendBlock({target:id,channel:'size',clipHeight:8,...(combine==='color-size'?{symbol:{opacity:0.7}}:{text:{fontSize:12}})})
   .editLegendBlock({target:id,channel:'size',labelMap:'auto'})
   .editLegend({target:id,channel:'size',clipHeight:'auto'})
   .editLegend({target:id,channel:'size',clipHeight:8})
   .editLegendBorder({target:id,border:{strokeDash:[]}})
   .editLegendLayout({target:id,channel:'size',position:'bottom-left'})
   .editLegendLayout({target:id,channel:'size',position:'inherit'});
  for(const position of ['right','left','bottom','top','top-left','top-right','bottom-left','bottom-right','inherit']) {
   next=next.editLegendBlock({target:id,channel:'size',position})
    .editLegendLayout({target:id,channel:'size',position})
    .editLegend({target:id,channel:'size',position});
  }
  assert.equal(next.guideConfigs.legend[combine==='size-shape'?'series':'colorSize'].combine,combine);
  next=next.removeLegend({target:id}).removeMark({target:id});
 }
 return appendSelectedLegendChannels(next);
}

function appendSelectedLegendChannels(program) {
 const id='direct-selected-legends';
 let next=program.createPointMark({id,data:'analysisRows'})
  .encodeX({target:id,field:'rank',scale:{id:`${id}-x`}})
  .encodeY({target:id,field:'value',scale:{id:`${id}-y`}})
  .encodeColor({target:id,field:'category',scale:{id:`${id}-color`}})
  .encodeStroke({target:id,field:'category',scale:{id:`${id}-stroke`}})
  .encodeShape({target:id,field:'category',scale:{id:`${id}-shape`}})
  .encodeSize({target:id,field:'rank',scale:{id:`${id}-size`}})
  .encodeOpacity({target:id,field:'rank',scale:{id:`${id}-opacity`}});
 const rule=`${id}-rules`;
 next=next.createRuleMark({id:rule,data:'analysisRows'})
  .encodeX({target:rule,field:'rank',fieldType:'quantitative',scale:{id:`${rule}-x`,zero:true}})
  .encodeX2({target:rule,datum:0,fieldType:'quantitative'})
  .encodeY({target:rule,field:'value',fieldType:'quantitative',scale:{id:`${rule}-y`}})
  .encodeStroke({target:rule,field:'category',scale:{id:`${rule}-stroke`}})
  .encodeStrokeDash({target:rule,field:'category',scale:{id:`${rule}-dash`}})
  .encodeStrokeWidth({target:rule,field:'rank',fieldType:'quantitative',scale:{id:`${rule}-width`}});
 for(const channel of ['color','stroke','strokeDash','strokeWidth','shape','size','opacity']) {
  const target=channel==='strokeDash'||channel==='strokeWidth'?rule:id;
  next=next.createGuides({axes:false,grid:false,legend:{target,channels:[channel],combine:'separate',border:{strokeDash:[4,2,6,1]}}})
   .removeLegend({target})
   .createLegend({target,channels:[channel],combine:'separate'})
   .editLegend({target,channel,labels:{fontSize:10}})
   .editLegendLayout({target,channel,offset:32})
   .editLegendLabels({target,channel,fontSize:10})
   .editLegendTitle({target,channel,title:'Source channel'})
   .editLegendSymbols({target,channel,...(['size','strokeWidth','opacity'].includes(channel)?{count:3}:{symbol:'auto'})})
   .editLegendBorder({target,channel,border:{strokeDash:[4,2,6,1]}})
   .editLegendBlock({target,channel,text:{fontSize:10}})
   .removeLegend({target,channels:[channel]});
 }
 return next.removeMark({target:id}).removeMark({target:rule});
}
