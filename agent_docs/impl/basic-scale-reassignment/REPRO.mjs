import {chart} from '../../../src/basic.js';
import {editScale} from '../../../src/actions/scales/edit.js';
const values=[{x:0,y:1,g:'a'},{x:1,y:2,g:'a'},{x:0,y:2,g:'b'},{x:1,y:3,g:'b'}];
const program=chart().createCanvas({width:420,height:240,margin:60}).createData({values})
  .createLinePlot({x:'x',y:'y',guides:false}).encodeStrokeDash({field:'g'}).createLegend();
const results=[];
for(const[route,run]of[
 ['public-existing-encoding-reassignment',()=>program.encodeStrokeDash({field:'g',scale:{range:['dotted']}})],
 ['existing-wrapped-owner-capability-control',()=>editScale.call(program,{id:'strokeDash',range:['dotted']})]
]){
 try{const p=run();results.push({route,status:'built',patterns:p.graphicSpec.objects.linePlot.items.map(x=>x.properties.strokeDash),publicEditScale:typeof p.editScale,publicEditLegend:typeof p.editLegend});}
 catch(e){results.push({route,status:'rejected',error:e.message});}
}
console.log(JSON.stringify({results},null,2));
