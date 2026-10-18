export const clippingFrame = Object.freeze({x:40,y:30,width:160,height:128});
export const clippingCenters = [[36,94],[44,26],[120,158],[204,94],[120,94],[232,-2],[200,30],[24,174]];
export const clippingRows = [[-.25,4],[.25,8.25],[5,0],[10.25,4],[5,4],[12,10],[10,8],[-1,-1]]
  .map(([x,y])=>({x,y,series:'Series A'}));

export function clippingControl(factory) {
  return factory().createCanvas({width:320,height:240,margin:{left:40,top:30,right:120,bottom:82}})
    .createData({id:'raw',values:clippingRows})
    .createScatterPlot({x:{field:'x',scale:{domain:[0,10]}},y:{field:'y',scale:{domain:[0,8]}},guides:false})
    .encodeColor({field:'series',scale:{domain:['Series A'],range:['#4c78a8']}})
    .encodePointRadius({value:8}).editPointMark({opacity:.7})
    .createLegend({title:'Series',titleStyle:{fontSize:11,fontWeight:700},labels:{fontSize:10}})
    .createData({id:'outsideLine',values:[{x:-1,y:9},{x:12,y:9}]})
    .createLinePlot({x:'x',y:'y',guides:false}).editLineMark({stroke:'#f58518',strokeWidth:3});
}

// Existing nested viewport, with literal local geometry. No proposed mark clip
// materializer is used to compute the baseline.
export function clippingPrimitive(factory, control) {
  let p=factory();
  const set=(id,properties)=>{for(const [property,value]of Object.entries(properties??{}))p=p.editGraphics({target:id,property,value});};
  function copy(id,parent){
    const o=control.graphicSpec.objects[id];
    if(id==='scatterPlot'){
      p=p.createGraphics({id:'window',type:'canvas',parent});set('window',clippingFrame);
      p=p.createGraphics({id,type:'circle',length:8,parent:'window'});
      set(id,{x:[-4,4,80,164,80,192,160,-16],y:[64,-4,128,64,64,-32,0,144],radius:8,fill:'#4c78a8',opacity:.7});return;
    }
    p=p.createGraphics({id,type:o.type,...(parent===undefined?{}:{parent}),...(o.items&&o.type!=='collection'?{length:o.items.length}:{})});
    if(o.items)p=p.editGraphics({target:id,property:'items',value:o.items.map(item=>({type:item.type??o.type,properties:item.properties}))});
    else set(id,o.properties);
    for(const child of o.children??[])copy(child,id);
  }
  for(const id of control.graphicSpec.order)copy(id);
  return p;
}
