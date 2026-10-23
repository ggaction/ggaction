import {createLegendContentSpacingProgram,legendContentSpacingCalls} from '../../../examples/legend-content-spacing/program.js';
import {createPrimitiveProgram} from './primitive.program.js';
import {defineVisualVariant} from '../../support/visual-variants.js';
export {createLegendContentSpacingProgram as createPublicProgram,createPrimitiveProgram};
export const visualVariants=[defineVisualVariant({
  chart:'legend-content-spacing',variant:'variable-rows',title:'Occupied row gaps and independent title padding',
  width:320,height:240,userFacing:createLegendContentSpacingProgram,primitive:createPrimitiveProgram,
  callChain:'chart()\n'+legendContentSpacingCalls.map(({op,args})=>'  .'+op+'('+JSON.stringify(args)+')').join('\n')+';',
  compareSemanticSpec:false,programEquivalence:'render',artifact:{scope:'charts',capability:'legend-content-spacing'},colors:[],
  regions:[{name:'unchanged scatter points',x:40,y:30,width:140,height:160,minimumInkPixels:400},
    {name:'variable legend rows and title',x:210,y:30,width:80,height:140,minimumInkPixels:250}]
})];
