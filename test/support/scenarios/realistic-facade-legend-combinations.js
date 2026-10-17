import assert from 'node:assert/strict';

// Each witness imports the caller's authentic rows unchanged. The facade's own
// point mark owns both channels; a second mark is never used as a proxy.
export function appendFacadeLegendCombinations(program, {
 action, data = 'analysisRows', xField, yField, categoryField, numberField,
 modes = ['size-shape', 'color-size']
}) {
 let next=program;
 const rows=program.semanticSpec.datasets.find(dataset=>dataset.id===data).values;
 for(const mode of modes) {
  const id=`legend-witness-${action}-${mode}`;
  const domain=mode==='size-shape'
   ? [...new Set(rows.map(row=>row[categoryField]))]
   : [Math.min(...rows.map(row=>row[numberField])),Math.max(...rows.map(row=>row[numberField]))];
  assert.ok(domain.length>0 && (mode==='size-shape'||domain[1]>domain[0]));
  const pair=mode==='size-shape' ? {
   shape:{field:categoryField,fieldType:'nominal',scale:{id:`${id}-shape`,type:'ordinal',domain,range:domain.map((_,index)=>['circle','square','triangle-up','diamond','wedge','arrow'][index%6])}},
   size:{field:categoryField,fieldType:'ordinal',scale:{id:`${id}-size`,type:'ordinal',domain,range:domain.map((_,index)=>25+index*25)}}
  } : {
   color:{field:numberField,fieldType:'quantitative',scale:{id:`${id}-color`,type:'sequential',domain,range:['#17365d','#8fbbe8']}},
   size:{field:numberField,fieldType:'quantitative',scale:{id:`${id}-size`,type:'linear',domain,range:[25,100]}},point:{shape:'circle'}
  };
  const position=action==='createPolarScatterPlot' ? {theta:{field:xField,fieldType:'quantitative',scale:{id:`${id}-theta`,type:'linear',domain:'auto'}},radius:{field:yField,fieldType:'quantitative',scale:{id:`${id}-radius`,type:'linear',domain:'auto'}}}
   : action==='createRaincloudPlot' ? {category:{field:categoryField,scale:{id:`${id}-category`,type:'band',domain:'auto'}},value:{field:yField,scale:{id:`${id}-value`,type:'linear',domain:'auto'}},density:false,summary:false,
      points:{type:'strip',jitter:false,size:pair.size,shape:pair.shape}}
   : {x:{field:xField,fieldType:'quantitative',scale:{id:`${id}-x`,type:'linear',domain:'auto'}},y:action==='createScatterPlot'?{field:yField,fieldType:'quantitative',scale:{id:`${id}-y`,type:'linear',domain:'auto'}}:{field:categoryField,fieldType:'ordinal',scale:{id:`${id}-y`,type:'band',domain:'auto'}}};
  const channels=mode==='size-shape'?['size','shape']:['color','size'];
  const options={id,data,...(action==='createBeeswarmPlot'?{packing:{overflow:'overlap'}}:{}),coordinate:`${id}-coordinate`,...position,
   ...(action==='createRaincloudPlot'?{}:pair),
   guides:{axes:false,grid:false,legend:{combine:mode,channels,
    border:{strokeDash:[4,2,6,1]},...(mode==='color-size'?{symbol:{opacity:0.7},values:[domain[0],(domain[0]+domain[1])/2,domain[1]]}:{})}}};
  const created=next[action](options);
  const config=created.guideConfigs.legend[mode==='size-shape'?'series':'colorSize'];
  assert.equal(config.combine,mode);
  assert.deepEqual(created.semanticSpec.datasets.find(dataset=>dataset.id===data).values,rows);
  const owner=action==='createRaincloudPlot'
   ? Object.keys(created.markConfigs).find(key=>created.markConfigs[key].raincloudPlot?.id===id) : id;
  next=created.removeMark({target:owner});
 }
 return next;
}
