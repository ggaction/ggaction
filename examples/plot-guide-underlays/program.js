import {chart} from '../../src/index.js';
export const rows=[{category:'a',value:6},{category:'b',value:9}];
export function createPlotUnderlayProgram({axisUnderlay=true,borderUnderlay=true,blend="difference"}={}){return chart()
 .createCanvas({width:240,height:180,margin:{left:40,right:20,top:20,bottom:40}})
 .editCanvas({plotBorder:{color:'#ddd',lineWidth:1,underlay:borderUnderlay}})
 .createData({values:rows})
 .createBarPlot({x:'category',y:{field:'value',scale:{domain:[0,10],nice:false}},guides:false})
 .encodeBarWidth({band:1})
 .editBarMark({fill:'yellow',stroke:'yellow',strokeWidth:4})
 .editBarMark({cornerRadius:10,blend})
 .createXAxis({line:{color:'#888',lineWidth:2},ticksAndLabels:false,title:false})
 .createGrid({horizontal:{values:[0,5,10],color:'#ddd',lineWidth:1},vertical:false})
 .editXAxis({underlay:axisUnderlay});}
