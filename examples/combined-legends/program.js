import {chart,hconcat} from '../../src/index.js';
export function createNumericCombinedProgram(){
 return chart().createCanvas({width:600,height:300,margin:{left:10,right:200,top:10,bottom:10}})
  .createData({values:[{x:0,y:0,v:0},{x:5,y:5,v:5},{x:10,y:10,v:10}]})
  .createScatterPlot({x:'x',y:'y',guides:false})
  .encodeColor({field:'v',fieldType:'quantitative',scale:{domain:[0,10],range:['#000000','#ffffff']}})
  .encodeSize({field:'v',scale:{type:'pow',exponent:1.4150374992788437,domain:[0,10],range:[3.141592653589793,28.274333882308138]}})
  .createLegend({combine:'color-size',values:[0,5,10],title:'Value',symbol:{stroke:'#777',strokeWidth:1}});
}

export function createCategoricalCombinedProgram(){
 return chart().createCanvas({width:600,height:300,margin:{left:20,right:200,top:30,bottom:30}})
  .createData({values:[{x:0,y:0,g:'A'},{x:5,y:5,g:'B'},{x:10,y:10,g:'C'}]})
  .createPointMark({id:'points'}).encodeX({field:'x',scale:{domain:[0,10]}}).encodeY({field:'y',scale:{domain:[0,10]}})
  .encodeShape({field:'g',scale:{domain:['A','B','C'],range:['circle','square','triangle-up']}})
  .encodeSize({field:'g',fieldType:'ordinal',scale:{domain:['A','B','C'],range:[25,100,225]}})
  .createLegend({combine:'size-shape',title:'Category'});
}
export function createMappedCombinedProgram(){
 return createNumericCombinedProgram().editLegendBlock({target:'scatterPlot',channel:'size',labelMap:[{value:5,label:'Five'}]});
}
export function createOpacitySelectedProgram(){
 return createNumericCombinedProgram()
  .encodeOpacity({target:'scatterPlot',field:'v',scale:{domain:[0,10],range:[0,1]}})
  .createLegend({target:'scatterPlot',channels:['opacity'],values:[0,10],title:'Opacity'})
  .editLegendLabels({channel:'opacity',fontSize:10});
}
export function createCombinedLegendsProgram(){
 const categorical=createCategoricalCombinedProgram(),quantitative=createNumericCombinedProgram();
 return hconcat({id:'combinedSampleComparison',programs:[{id:'categorical',program:categorical},{id:'quantitative',program:quantitative}],gap:24,padding:0,align:'start'});
}
