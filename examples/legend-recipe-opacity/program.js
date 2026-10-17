import {chart} from '../../src/index.js';

// Each recipe has one authored opacity; separate programs retain that ownership.
export function createRecipeOpacityProgram(opacity = 0.7) {
 return chart().createCanvas({width:480,height:270,margin:0})
  .createData({values:[{x:0,y:0,g:`opacity ${opacity}`}]})
  .createScatterPlot({x:'x',y:'y',guides:false})
  .editPointMark({opacity:0})
  .encodeColor({field:'g',scale:{range:['#555']}})
  .createLegend({channels:['color'],title:false,at:{x:275,y:68}})
  .editLegendLabels({offset:20,fontFamily:'Arial',color:'#222'})
  .editLegendSymbols({symbol:{layers:[{type:'line',length:40,lineWidth:3,opacity},{type:'point',size:6,fill:'#f58518',stroke:'#333',strokeWidth:2,opacity}]}});
}
export function recipeOpacityCalls(opacity=.7){return [
 {op:'createCanvas',args:{width:480,height:270,margin:0}},
 {op:'createData',args:{values:[{x:0,y:0,g:`opacity ${opacity}`}]}},
 {op:'createScatterPlot',args:{x:'x',y:'y',guides:false}},
 {op:'editPointMark',args:{opacity:0}},
 {op:'encodeColor',args:{field:'g',scale:{range:['#555']}}},
 {op:'createLegend',args:{channels:['color'],title:false,at:{x:275,y:68}}},
 {op:'editLegendLabels',args:{offset:20,fontFamily:'Arial',color:'#222'}},
 {op:'editLegendSymbols',args:{symbol:{layers:[{type:'line',length:40,lineWidth:3,opacity},{type:'point',size:6,fill:'#f58518',stroke:'#333',strokeWidth:2,opacity}]}}}
];}
