import {chart}from'../../../src/index.js';
import {gradientBlockScene,recipeOpacityScene}from'../../oracles/legend-appearance-scenes.js';
export function createGradientBlockPrimitive(){
 const s=gradientBlockScene();
 return chart().createGraphics({id:'canvas',type:'canvas'})
  .editGraphics({target:'canvas',property:'width',value:480})
  .editGraphics({target:'canvas',property:'height',value:270})
  .editGraphics({target:'canvas',property:'background',value:'white'})
  .createGraphics({id:'plot-main',type:'collection',parent:'canvas'})
  .createGraphics({id:'scatterPlot',type:'circle',parent:'plot-main',length:2})
  .editGraphics({target:'scatterPlot',property:'items',value:s.scatterPlot})
  .createGraphics({id:'sizeLegendSymbols',type:'circle',parent:'canvas',length:2})
  .editGraphics({target:'sizeLegendSymbols',property:'items',value:s.sizeLegendSymbols})
  .createGraphics({id:'sizeLegendLabels',type:'text',parent:'canvas',length:2})
  .editGraphics({target:'sizeLegendLabels',property:'items',value:s.sizeLegendLabels})
  .createGraphics({id:'colorGradientBackground',type:'path',parent:'canvas'})
  .editGraphics({target:'colorGradientBackground',property:'commands',value:s.colorGradientBackground.commands})
  .editGraphics({target:'colorGradientBackground',property:'fill',value:'transparent'})
  .editGraphics({target:'colorGradientBackground',property:'stroke',value:'#999'})
  .editGraphics({target:'colorGradientBackground',property:'strokeWidth',value:1})
  .editGraphics({target:'colorGradientBackground',property:'strokeDash',value:[4,2,6,1]})
  .createGraphics({id:'colorGradientStrips',type:'rect',parent:'canvas',length:60})
  .editGraphics({target:'colorGradientStrips',property:'items',value:s.colorGradientStrips})
  .createGraphics({id:'colorGradientTicks',type:'line',parent:'canvas',length:2})
  .editGraphics({target:'colorGradientTicks',property:'items',value:s.colorGradientTicks})
  .createGraphics({id:'colorGradientLabels',type:'text',parent:'canvas',length:2})
  .editGraphics({target:'colorGradientLabels',property:'items',value:s.colorGradientLabels})
  .createGraphics({id:'colorGradientTitle',type:'text',parent:'canvas'})
  .editGraphics({target:'colorGradientTitle',property:'x',value:s.colorGradientTitle.x})
  .editGraphics({target:'colorGradientTitle',property:'y',value:s.colorGradientTitle.y})
  .editGraphics({target:'colorGradientTitle',property:'text',value:'Bottom title'})
  .editGraphics({target:'colorGradientTitle',property:'fill',value:'#334155'})
  .editGraphics({target:'colorGradientTitle',property:'fontSize',value:13})
  .editGraphics({target:'colorGradientTitle',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'colorGradientTitle',property:'fontWeight',value:600})
  .editGraphics({target:'colorGradientTitle',property:'textAlign',value:'center'})
  .editGraphics({target:'colorGradientTitle',property:'textBaseline',value:'top'});
}
export function createRecipeOpacityPrimitive(opacity=.7){
 const s=recipeOpacityScene(opacity);
 return chart().createGraphics({id:'canvas',type:'canvas'})
  .editGraphics({target:'canvas',property:'width',value:480})
  .editGraphics({target:'canvas',property:'height',value:270})
  .editGraphics({target:'canvas',property:'background',value:'white'})
  .createGraphics({id:'plot-main',type:'collection',parent:'canvas'})
  .createGraphics({id:'scatterPlot',type:'circle',parent:'plot-main',length:1})
  .editGraphics({target:'scatterPlot',property:'items',value:s.scatterPlot})
  .createGraphics({id:'colorLegendSymbolLines',type:'line',parent:'canvas',length:1})
  .editGraphics({target:'colorLegendSymbolLines',property:'items',value:s.colorLegendSymbolLines})
  .createGraphics({id:'colorLegendSymbolPoints',type:'circle',parent:'canvas',length:1})
  .editGraphics({target:'colorLegendSymbolPoints',property:'items',value:s.colorLegendSymbolPoints})
  .createGraphics({id:'colorLegendLabels',type:'text',parent:'canvas',length:1})
  .editGraphics({target:'colorLegendLabels',property:'items',value:s.colorLegendLabels});
}
