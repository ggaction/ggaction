import {chart} from '../../src/index.js';

export function createLegendContentSpacingProgram() {
  return chart()
    .createCanvas({plot:{width:140,height:160},margin:{left:40,top:30,right:140,bottom:50}})
    .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:80},{x:2,y:2,v:336}]})
    .createScatterPlot({x:{field:'x',scale:{domain:[0,2]}},y:{field:'y',scale:{domain:[0,2]}},guides:false})
    .encodeSize({field:'v',scale:{type:'linear',domain:[0,336],range:[64*Math.PI,400*Math.PI]}})
    .editPointMark({fill:'#2563eb',stroke:'none',opacity:1})
    .createLegend({channels:['size'],values:[0,80,336],title:'v'})
    .editLegendLabels({fontSize:10,fontFamily:'sans-serif',color:'#000'})
    .editLegendTitle({fontSize:14,fontFamily:'sans-serif',color:'#000'})
    .editLegendBlock({target:'scatterPlot',channel:'size',symbol:{fill:'#2563eb',stroke:'#2563eb',strokeWidth:2}})
    .editLegendLayout({rowPadding:7,titlePadding:20});
}

export const legendContentSpacingCalls = [
  {op:'createCanvas',args:{plot:{width:140,height:160},margin:{left:40,top:30,right:140,bottom:50}}},
  {op:'createData',args:{values:[{x:0,y:0,v:0},{x:1,y:1,v:80},{x:2,y:2,v:336}]}},
  {op:'createScatterPlot',args:{x:{field:'x',scale:{domain:[0,2]}},y:{field:'y',scale:{domain:[0,2]}},guides:false}},
  {op:'encodeSize',args:{field:'v',scale:{type:'linear',domain:[0,336],range:[64*Math.PI,400*Math.PI]}}},
  {op:'editPointMark',args:{fill:'#2563eb',stroke:'none',opacity:1}},
  {op:'createLegend',args:{channels:['size'],values:[0,80,336],title:'v'}},
  {op:'editLegendLabels',args:{fontSize:10,fontFamily:'sans-serif',color:'#000'}},
  {op:'editLegendTitle',args:{fontSize:14,fontFamily:'sans-serif',color:'#000'}},
  {op:'editLegendBlock',args:{target:'scatterPlot',channel:'size',symbol:{fill:'#2563eb',stroke:'#2563eb',strokeWidth:2}}},
  {op:'editLegendLayout',args:{rowPadding:7,titlePadding:20}}
];
