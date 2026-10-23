// Extend authentic-data facade profiles with the current public option surface.
// These are real creation arguments, never synthesized trace observations.
const polygon = normalization => ({polygon:[{x:0,y:-1},{x:1,y:1},{x:-1,y:1}],normalization});
const clippedPoints = new Set(['createScatterPlot','createStripPlot','createBeeswarmPlot','createRaincloudPlot']);
export function currentFacadeOptionWitnesses(args,{action,index,program}={}) {
  const result=structuredClone(args);
  const statistical=['createBoxPlot','createViolinPlot','createGradientPlot','createHistogram','createHeatmap'].includes(action);
  if(['createAreaPlot','createDensityPlot','createHorizonPlot','createStripPlot','createBeeswarmPlot','createRaincloudPlot'].includes(action)&&[2,6,7,8,9,12].includes(index)) {
    for(const key of ['x','y','value']) {
      const scale=result[key]?.scale;
      if(scale&&['log','pow','sqrt','symlog'].includes(scale.type)) {
        scale.type='linear';for(const property of ['base','exponent','constant'])delete scale[property];
      }
    }
  }
  for(const channel of ['x','y','value']) {
    const scale=result[channel]?.scale;
    if(scale && (scale.type??(result[channel].fieldType==='quantitative'?'linear':undefined))==='linear' &&
        (scale.domain===undefined||scale.domain==='auto') && index%3===0 &&
        !program?.semanticSpec?.scales.some(existing=>existing.id===scale.id)) scale.nice={count:4+Math.floor(index/3)%3};
  }
  if(action==='createScatterPlot') {
    result.missing=index%2?'skip':'error';
    if(index===0){result.size={value:25};if(result.point)delete result.point.radius;}
  }
  if(action==='createBarPlot') {result.missing=index%2?'skip':'error';result.bar={...result.bar,clip:index%2===0};}
  if(action==='createLinePlot') {
    const direct=['x','y'].every(channel=>['quantitative','temporal'].includes(result[channel]?.fieldType)&&result[channel].aggregate===undefined&&result[channel].bin===undefined);
    result.line={...result.line,missing:direct&&index%2?'break':'error'};
  }
  for(const key of ['point','outlier'])if(result[key]&&typeof result[key]==='object'){
    if(index===0||index===1)result[key].shape=polygon(index?'radius':'area');
    if(key==='point'&&clippedPoints.has(action))result[key].clip=index%2===0;
  }
  if(result.shape?.scale&&(index===0||index===1))result.shape.scale.unknown=polygon(index?'radius':'area');
  if(['createPolarScatterPlot','createStripPlot','createBeeswarmPlot'].includes(action)&&index===0) {
    result.size={value:25};if(result.point)delete result.point.radius;
  }
  for(const key of ['valueScale','densityScale']) {
    const scale=result[key];
    if(action==='createDensityPlot'&&[2,6,7,8,9,12].includes(index)&&scale&&['log','pow','sqrt','symlog'].includes(scale.type)) {
      scale.type='linear';for(const property of ['base','exponent','constant'])delete scale[property];
    }
    if(scale?.type==='linear')scale.nice={count:5};
  }
  if(action==='createRaincloudPlot') {
    if(index===1)result.color=false;
    if(index===3)result.color={value:'#2563eb'};
    if(result.points&&typeof result.points==='object') {
      result.points.point={...result.points.point,clip:Math.floor(index/2)%2===0};
      if([0,1,3,5].includes(index))result.points.point.shape=polygon(index===0||index===3?'area':'radius');
      if([3,5].includes(index)&&result.points.shape?.scale)result.points.shape.scale.unknown=polygon(index===3?'area':'radius');
      if(index===0)result.points.point.radius=0.1;
      if(index===4){result.points.size={value:25};delete result.points.point.radius;}
    }
    if(result.summary&&typeof result.summary==='object') {
      if(result.summary.point) {
        result.summary.point.clip=Math.floor(index/2)%2===0;
        if([3,5].includes(index))result.summary.point.shape=polygon(index===3?'area':'radius');
      }
      if(result.summary.outlier&&[0,2].includes(index))result.summary.outlier.shape=polygon(index===0?'area':'radius');
    }
  }
  if(action==='createRugPlot'&&result.tick)result.tick.clip=Math.floor(index/2)%2===0;
  if(['createAreaPlot','createDensityPlot','createHorizonPlot'].includes(action)&&result.area)result.area.clip=index%2===0;
  if(action==='createLinePlot'&&result.line)result.line.clip=index%2===0;
  if(result.strokeDash?.field)result.strokeDash.fieldType=index%2?'ordinal':'nominal';
  if(action==='createLinePlot'&&result.strokeDash?.field){
    result.strokeDash.scale={...result.strokeDash.scale,unknown:['solid','dashed','dotted','dashdot'][Math.floor(index/5)%4]};
  }
  if(action==='createLinePlot'&&result.color?.field&&['nominal','ordinal'].includes(result.color.fieldType)) {
    const rows=program?.semanticSpec?.datasets.find(dataset=>dataset.id===result.data)?.values;
    if(rows?.length&&index%3===0) {
      result.color.fieldType=index%2?'ordinal':'nominal';
      result.color.scale={...result.color.scale,type:'ordinal',
        domain:Array.isArray(result.color.scale?.domain)?result.color.scale.domain:[...new Set(rows.map(row=>row[result.color.field]))],unknown:'#64748b'};
    }
  }
  const scales={...program?.resolvedScales};
  function collect(value){
    if(!value||typeof value!=='object')return;
    if(value.id&&value.type)scales[value.id]=value;
    if(value.scale?.id)scales[value.scale.id]={...value.scale,type:value.scale.type??(value.fieldType==='quantitative'?'linear':undefined)};
    for(const [key,child]of Object.entries(value))if(key!=='guides')collect(child);
  }
  collect(result);
  for(const channel of ['x','y']){
    const axis=result.guides?.axes?.[channel];if(!axis||typeof axis!=='object')continue;
    axis.underlay=Math.floor(index/2)%2===0;
    if(axis.title&&typeof axis.title==='object')axis.title.overlap=Math.floor(index/2)%2?'allow':'error';
    const ticks=axis.ticksAndLabels;
    if(ticks&&typeof ticks==='object'){
      if(statistical&&ticks.labels&&typeof ticks.labels==='object'){
        ticks.labels.flushThreshold=index%2===0?'auto':4;
        if(axis.title&&typeof axis.title==='object')axis.title.offset={from:'labels',gap:12+index%3*4};
      }
      if(statistical&&scales[axis.scale]?.type==='linear') {delete ticks.values;ticks.count=4;}
      if(scales[axis.scale]?.type==='linear'&&!Object.hasOwn(ticks,'values'))ticks.rounding=
        action==='createScatterPlot'?(index>=32?'nearest':'ceiling'):
        statistical?([0,2,3].includes(index)?'nearest':'ceiling'):
        ['createBarPlot','createLinePlot'].includes(action)?(Math.floor(index/2)%2?'nearest':'ceiling'):
        action==='createRugPlot'?(Math.floor(index/2)%2?'nearest':'ceiling'):
        ([2,9,12].includes(index)?'nearest':'ceiling');
      else delete ticks.rounding;
    }
  }
  if(action!=='createGradientPlot'&&result.guides?.legend&&typeof result.guides.legend==='object'){
    const legend=result.guides.legend;
    const owner=program?.semanticSpec?.layers.find(layer=>layer.id===(legend.target??result.id));
    const channels=legend.channels??['color','stroke'];
    const continuous=channels.some(channel=>{
      const paint=result[channel],type=scales[owner?.encoding?.[channel]?.scale]?.type??paint?.scale?.type;
      return ['color','stroke'].includes(channel)&&(['quantitative','temporal'].includes(paint?.fieldType)||type&&type!=='ordinal');
    });
    if(legend.layout==='legacy-bottom') {delete legend.rowPadding;delete legend.titlePadding;}
    else {
      legend.titlePadding=4+index%3;
      if(legend.representation!=='symbols'&&(legend.gradient!==undefined||continuous))delete legend.rowPadding;
      else legend.rowPadding=1+index%2;
    }
  }
  return result;
}
