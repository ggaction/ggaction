import {chart} from '../../src/index.js';
export function createLegendAppearanceProgram() {
 return chart().createCanvas({width:400,height:240,margin:{left:10,right:180,top:10,bottom:10}})
  .createData({values:[{x:0,y:0,g:'A'},{x:1,y:1,g:'B'}]})
  .createScatterPlot({x:'x',y:'y',guides:false})
  .encodeColor({field:'g',scale:{domain:['A','B'],range:['red','green']}})
  .createLegend({channels:['color'],title:false,symbol:{layers:[{type:'point',size:20,stroke:'blue',strokeWidth:4,opacity:.7}]}});
}
