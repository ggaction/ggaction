import {createPlotUnderlayProgram} from '../../../examples/plot-guide-underlays/program.js';
import {createPrimitiveProgram} from './primitive.program.js';
import {defineVisualVariant} from '../../support/visual-variants.js';
export {createPlotUnderlayProgram as createPublicProgram,createPrimitiveProgram};
export const visualVariants=[defineVisualVariant({
  chart:'plot-guide-underlays',variant:'difference-bars',title:'Composite bars over the axis and plot border',
  width:240,height:180,userFacing:createPlotUnderlayProgram,primitive:createPrimitiveProgram,
  callChain:'program.editXAxis({ underlay: true });',compareSemanticSpec:false,programEquivalence:'render',
  artifact:{scope:'charts',capability:'plot-guide-underlays'},colors:[],
  regions:[{name:'two rounded bars over the gray guides',x:40,y:20,width:180,height:120,minimumInkPixels:5000}]
})];
