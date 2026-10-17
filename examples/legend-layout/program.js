import {chart} from '../../src/index.js';

export function createGradientBlockProgram() {
 return chart().createCanvas({width:480,height:270,margin:0})
  .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:10}]})
  .createScatterPlot({x:'x',y:'y',guides:false})
  .editPointMark({opacity:0})
  .encodeColor({field:'v',fieldType:'quantitative',scale:{domain:[0,10],range:['#31688e','#fde725']}})
  .encodeSize({field:'v',scale:{domain:[0,10],range:[25,100]}})
  .createLegend({channels:['color'],title:'Bottom title',at:{x:30,y:48}})
  .editLegend({gradient:{length:120,thickness:16},count:2})
  .editLegendLayout({channel:'color',direction:'horizontal',titlePosition:'bottom'})
  .editLegendBorder({border:{color:'#999',strokeDash:[4,2,6,1]}})
  .createLegend({channels:['size'],values:[0,10],title:false})
  .editLegendBlock({target:'scatterPlot',channel:'size',position:'bottom-left'});
}

export const gradientBlockCalls=[
 {op:'createCanvas',args:{width:480,height:270,margin:0}},
 {op:'createData',args:{values:[{x:0,y:0,v:0},{x:1,y:1,v:10}]}},
 {op:'createScatterPlot',args:{x:'x',y:'y',guides:false}},
 {op:'editPointMark',args:{opacity:0}},
 {op:'encodeColor',args:{field:'v',fieldType:'quantitative',scale:{domain:[0,10],range:['#31688e','#fde725']}}},
 {op:'encodeSize',args:{field:'v',scale:{domain:[0,10],range:[25,100]}}},
 {op:'createLegend',args:{channels:['color'],title:'Bottom title',at:{x:30,y:48}}},
 {op:'editLegend',args:{gradient:{length:120,thickness:16},count:2}},
 {op:'editLegendLayout',args:{channel:'color',direction:'horizontal',titlePosition:'bottom'}},
 {op:'editLegendBorder',args:{border:{color:'#999',strokeDash:[4,2,6,1]}}},
 {op:'createLegend',args:{channels:['size'],values:[0,10],title:false}},
 {op:'editLegendBlock',args:{target:'scatterPlot',channel:'size',position:'bottom-left'}}
];
