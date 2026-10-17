import {chart} from '../../src/index.js';
export function createCombinedLegendsProgram(){
 return chart().createCanvas({width:600,height:300,margin:{left:10,right:200,top:10,bottom:10}})
  .createData({values:[{x:0,y:0,v:0},{x:5,y:5,v:5},{x:10,y:10,v:10}]})
  .createScatterPlot({x:'x',y:'y',guides:false})
  .encodeColor({field:'v',fieldType:'quantitative',scale:{domain:[0,10],range:['#000000','#ffffff']}})
  .encodeSize({field:'v',scale:{type:'pow',exponent:1.4150374992788437,domain:[0,10],range:[3.141592653589793,28.274333882308138]}})
  .createLegend({combine:'color-size',values:[0,5,10],title:'Value'});
}
