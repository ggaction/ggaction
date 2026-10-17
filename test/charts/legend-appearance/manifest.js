import {createLegendAppearanceProgram} from '../../../examples/legend-appearance/program.js';
import {createPrimitiveProgram} from './primitive.program.js';
export {createLegendAppearanceProgram as createPublicProgram,createPrimitiveProgram};
export const variant={capability:'legend-appearance',chart:'whole-symbol',variant:'single-opacity',title:'One opacity for a complete fill and outline',width:400,height:240,calls:[
 'chart().createCanvas({width:400,height:240,margin:{left:10,right:180,top:10,bottom:10}})',
 '.createData({values:[{x:0,y:0,g:"A"},{x:1,y:1,g:"B"}]})',
 '.createScatterPlot({x:"x",y:"y",guides:false})',
 '.encodeColor({field:"g",scale:{domain:["A","B"],range:["red","green"]}})',
 '.createLegend({channels:["color"],title:false,symbol:{layers:[{type:"point",size:20,stroke:"blue",strokeWidth:4,opacity:0.7}]}})'
]};
export const visualVariants=[{...variant,chart:'legend-appearance',programEquivalence:'state',compareSemanticSpec:false,
 callChain:variant.calls.join('\n')+';',userFacing:createLegendAppearanceProgram,primitive:createPrimitiveProgram}];
