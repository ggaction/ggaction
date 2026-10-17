import {triangleGeometry,triangleCommands}from'../../oracles/combined-category-geometry.js';
import {chart,hconcat} from '../../../src/index.js';
// Independent physical target: x10/205/400, y290/150/10, areas π/4π/9π.
// One 7px stroked sample slot, 12px label gap and 18px row pitch. The ordinary
// side group aligns its occupied title top at10 and left at400+30.
export function createPrimitiveProgram(){
 return chart().createCanvas({width:600,height:300,margin:{left:10,right:200,top:10,bottom:10}})
  .createGraphics({id:'plot-main',type:'collection',parent:'canvas'})
  .createGraphics({id:'scatterPlot',type:'circle',parent:'plot-main',length:3})
  .editGraphics({target:'scatterPlot',property:'x',value:[10,205,400]})
  .editGraphics({target:'scatterPlot',property:'y',value:[290,150,10]})
  .editGraphics({target:'scatterPlot',property:'radius',value:[1,2,3]})
  .editGraphics({target:'scatterPlot',property:'fill',value:['#000000','#808080','#ffffff']})
  .createGraphics({id:'colorSizeLegendSymbols',type:'circle',parent:'canvas',length:3})
  .editGraphics({target:'colorSizeLegendSymbols',property:'x',value:433.5})
  .editGraphics({target:'colorSizeLegendSymbols',property:'y',value:[48.5,66.5,84.5]})
  .editGraphics({target:'colorSizeLegendSymbols',property:'radius',value:[1,2,3]})
  .editGraphics({target:'colorSizeLegendSymbols',property:'fill',value:['#000000','#808080','#ffffff']})
  .editGraphics({target:'colorSizeLegendSymbols',property:'stroke',value:'#777'})
  .editGraphics({target:'colorSizeLegendSymbols',property:'strokeWidth',value:1})
  .editGraphics({target:'colorSizeLegendSymbols',property:'opacity',value:1})
  .createGraphics({id:'colorSizeLegendLabels',type:'text',parent:'canvas',length:3})
  .editGraphics({target:'colorSizeLegendLabels',property:'x',value:449})
  .editGraphics({target:'colorSizeLegendLabels',property:'y',value:[42.5,60.5,78.5]})
  .editGraphics({target:'colorSizeLegendLabels',property:'text',value:['0','5','10']})
  .editGraphics({target:'colorSizeLegendLabels',property:'fontSize',value:12})
  .editGraphics({target:'colorSizeLegendLabels',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'colorSizeLegendLabels',property:'fontWeight',value:'normal'})
  .editGraphics({target:'colorSizeLegendLabels',property:'fill',value:'#334155'})
  .editGraphics({target:'colorSizeLegendLabels',property:'textAlign',value:'left'})
  .editGraphics({target:'colorSizeLegendLabels',property:'textBaseline',value:'top'})
  .createGraphics({id:'colorSizeLegendTitle',type:'text',parent:'canvas'})
  .editGraphics({target:'colorSizeLegendTitle',property:'x',value:430})
  .editGraphics({target:'colorSizeLegendTitle',property:'y',value:10})
  .editGraphics({target:'colorSizeLegendTitle',property:'text',value:'Value'})
  .editGraphics({target:'colorSizeLegendTitle',property:'fontSize',value:13})
  .editGraphics({target:'colorSizeLegendTitle',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'colorSizeLegendTitle',property:'fontWeight',value:600})
  .editGraphics({target:'colorSizeLegendTitle',property:'fill',value:'#0f172a'})
  .editGraphics({target:'colorSizeLegendTitle',property:'textAlign',value:'left'})
  .editGraphics({target:'colorSizeLegendTitle',property:'textBaseline',value:'top'});
}

// Physical areas25/100/225 are independently drawn as a circle, square and
// equilateral triangle. Native item pitch reserves twice the triangle's radius.
export function createCategoricalPrimitiveProgram(){
 const {halfSlot,pitch}=triangleGeometry(225),center=408+halfSlot,label=408+2*halfSlot+10;
 return chart().createCanvas({width:600,height:300,margin:{left:20,right:200,top:30,bottom:30}})
  .createGraphics({id:'plot-main',type:'collection',parent:'canvas'})
  .createGraphics({id:'points',type:'collection',parent:'plot-main'})
  .editGraphics({target:'points',property:'items',value:[
   {type:'circle',properties:{x:20,y:270,radius:Math.sqrt(25/Math.PI),fill:'#4c78a8'}},
   {type:'rect',properties:{x:205,y:145,width:10,height:10,fill:'#4c78a8',stroke:'#4c78a8',strokeWidth:0}},
   {type:'path',properties:{commands:triangleCommands(225,400,30),fill:'#4c78a8'}}]})
  .createGraphics({id:'seriesLegendSymbolPoints',type:'collection',parent:'canvas'})
  .editGraphics({target:'seriesLegendSymbolPoints',property:'items',value:[
   {type:'circle',properties:{x:center,y:68.5,radius:Math.sqrt(25/Math.PI),fill:'#4c78a8',stroke:'white',strokeWidth:0}},
   {type:'rect',properties:{x:center-5,y:68.5+pitch-5,width:10,height:10,fill:'#4c78a8',stroke:'white',strokeWidth:0}},
   {type:'path',properties:{commands:triangleCommands(225,center,68.5+2*pitch),fill:'#4c78a8',stroke:'white',strokeWidth:0}}]})
  .createGraphics({id:'seriesLegendLabels',type:'text',parent:'canvas',length:3})
  .editGraphics({target:'seriesLegendLabels',property:'x',value:label})
  .editGraphics({target:'seriesLegendLabels',property:'y',value:[62.5,62.5+pitch,62.5+2*pitch]})
  .editGraphics({target:'seriesLegendLabels',property:'text',value:['A','B','C']})
  .editGraphics({target:'seriesLegendLabels',property:'fontSize',value:12})
  .editGraphics({target:'seriesLegendLabels',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'seriesLegendLabels',property:'fontWeight',value:'normal'})
  .editGraphics({target:'seriesLegendLabels',property:'fill',value:'#334155'})
  .editGraphics({target:'seriesLegendLabels',property:'textAlign',value:'left'})
  .editGraphics({target:'seriesLegendLabels',property:'textBaseline',value:'top'})
  .createGraphics({id:'seriesLegendTitle',type:'text',parent:'canvas'})
  .editGraphics({target:'seriesLegendTitle',property:'x',value:408})
  .editGraphics({target:'seriesLegendTitle',property:'y',value:30})
  .editGraphics({target:'seriesLegendTitle',property:'text',value:'Category'})
  .editGraphics({target:'seriesLegendTitle',property:'fontSize',value:13})
  .editGraphics({target:'seriesLegendTitle',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'seriesLegendTitle',property:'fontWeight',value:600})
  .editGraphics({target:'seriesLegendTitle',property:'fill',value:'#334155'})
  .editGraphics({target:'seriesLegendTitle',property:'textAlign',value:'left'})
  .editGraphics({target:'seriesLegendTitle',property:'textBaseline',value:'top'});
}
export function createComparisonPrimitiveProgram(){
 const categorical=createCategoricalPrimitiveProgram(),quantitative=createPrimitiveProgram();
 return hconcat({id:'combinedSampleComparison',programs:[{id:'categorical',program:categorical},{id:'quantitative',program:quantitative}],gap:24,padding:0,align:'start'});
}
export function createMappedPrimitiveProgram(){
 return createPrimitiveProgram().editGraphics({target:'colorSizeLegendLabels',property:'text',value:['0','Five','10']});
}
export function createOpacityPrimitiveProgram(){
 // The first block ends at96.5 (last12px text line); the native group gap18
 // places the next title at114.5. The14px samples reserve18px row pitch.
 return createPrimitiveProgram()
  .editGraphics({target:'scatterPlot',property:'opacity',value:[0,.5,1]})
  .createGraphics({id:'opacityLegendSymbols',type:'circle',parent:'canvas',length:2})
  .editGraphics({target:'opacityLegendSymbols',property:'x',value:437})
  .editGraphics({target:'opacityLegendSymbols',property:'y',value:[147,165]})
  .editGraphics({target:'opacityLegendSymbols',property:'radius',value:7})
  .editGraphics({target:'opacityLegendSymbols',property:'fill',value:'#4c78a8'})
  .editGraphics({target:'opacityLegendSymbols',property:'opacity',value:[0,1]})
  .createGraphics({id:'opacityLegendLabels',type:'text',parent:'canvas',length:2})
  .editGraphics({target:'opacityLegendLabels',property:'x',value:456})
  .editGraphics({target:'opacityLegendLabels',property:'y',value:[142,160]})
  .editGraphics({target:'opacityLegendLabels',property:'text',value:['0','10']})
  .editGraphics({target:'opacityLegendLabels',property:'fontSize',value:10})
  .editGraphics({target:'opacityLegendLabels',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'opacityLegendLabels',property:'fontWeight',value:'normal'})
  .editGraphics({target:'opacityLegendLabels',property:'fill',value:'#334155'})
  .editGraphics({target:'opacityLegendLabels',property:'textAlign',value:'left'})
  .editGraphics({target:'opacityLegendLabels',property:'textBaseline',value:'top'})
  .createGraphics({id:'opacityLegendTitle',type:'text',parent:'canvas'})
  .editGraphics({target:'opacityLegendTitle',property:'x',value:430})
  .editGraphics({target:'opacityLegendTitle',property:'y',value:114.5})
  .editGraphics({target:'opacityLegendTitle',property:'text',value:'Opacity'})
  .editGraphics({target:'opacityLegendTitle',property:'fontSize',value:13})
  .editGraphics({target:'opacityLegendTitle',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'opacityLegendTitle',property:'fontWeight',value:600})
  .editGraphics({target:'opacityLegendTitle',property:'fill',value:'#334155'})
  .editGraphics({target:'opacityLegendTitle',property:'textAlign',value:'left'})
  .editGraphics({target:'opacityLegendTitle',property:'textBaseline',value:'top'});
}
