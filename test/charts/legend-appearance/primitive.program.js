import {chart} from '../../../src/index.js';
// Literal geometry: radius20 + stroke2 gives pitch44. Plot-right220 + gap8
// + occupied radius22 gives x250; first center10+22=32, labels offset10.
export function createPrimitiveProgram(){
 return chart().createCanvas({width:400,height:240,margin:{left:10,right:180,top:10,bottom:10}})
  .createGraphics({id:'plot-main',type:'collection',parent:'canvas'})
  .createGraphics({id:'scatterPlot',type:'circle',parent:'plot-main',length:2})
  .editGraphics({target:'scatterPlot',property:'x',value:[10,220]})
  .editGraphics({target:'scatterPlot',property:'y',value:[230,10]})
  .editGraphics({target:'scatterPlot',property:'radius',value:3})
  .editGraphics({target:'scatterPlot',property:'fill',value:['red','green']})
  .createGraphics({id:'colorLegendSymbolPoints',type:'circle',parent:'canvas',length:2})
  .editGraphics({target:'colorLegendSymbolPoints',property:'x',value:250})
  .editGraphics({target:'colorLegendSymbolPoints',property:'y',value:[32,76]})
  .editGraphics({target:'colorLegendSymbolPoints',property:'radius',value:20})
  .editGraphics({target:'colorLegendSymbolPoints',property:'fill',value:['red','green']})
  .editGraphics({target:'colorLegendSymbolPoints',property:'stroke',value:'blue'})
  .editGraphics({target:'colorLegendSymbolPoints',property:'strokeWidth',value:4})
  .editGraphics({target:'colorLegendSymbolPoints',property:'opacity',value:.7})
  .editGraphics({target:'colorLegendSymbolPoints',property:'blend',value:'normal'})
  .createGraphics({id:'colorLegendLabels',type:'text',parent:'canvas',length:2})
  .editGraphics({target:'colorLegendLabels',property:'x',value:280})
  .editGraphics({target:'colorLegendLabels',property:'y',value:[26,70]})
  .editGraphics({target:'colorLegendLabels',property:'text',value:['A','B']})
  .editGraphics({target:'colorLegendLabels',property:'fontSize',value:12})
  .editGraphics({target:'colorLegendLabels',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'colorLegendLabels',property:'fontWeight',value:'normal'})
  .editGraphics({target:'colorLegendLabels',property:'fill',value:'#334155'})
  .editGraphics({target:'colorLegendLabels',property:'textAlign',value:'left'})
  .editGraphics({target:'colorLegendLabels',property:'textBaseline',value:'top'});
}

export {createGradientBlockPrimitive,createRecipeOpacityPrimitive} from "./target-primitive.program.js";
