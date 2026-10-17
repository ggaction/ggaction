import {chart} from '../../src/index.js';

export function createSymbolWindowProgram() {
  return chart().createCanvas({width:400,height:200,margin:{left:10,right:180,top:10,bottom:10}})
    .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:10}]})
    .createScatterPlot({x:{field:'x',scale:{domain:[-0.5,1.5]}},y:{field:'y',scale:{domain:[-0.5,1.5]}},guides:false})
    .encodeSize({field:'v',scale:{domain:[0,10],range:[706.8583470577034,5000]}})
    .createLegend({channels:['size'],values:[10],title:false,clipHeight:30});
}
