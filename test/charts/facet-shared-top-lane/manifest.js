import {createFacetSharedTopLaneProgram} from '../../../examples/facet-shared-top-lane/program.js';
import {createPrimitiveProgram} from './primitive.program.js';
import {defineVisualVariant} from '../../support/visual-variants.js';
export {createFacetSharedTopLaneProgram as createPublicProgram,createPrimitiveProgram};
export const visualVariants=[defineVisualVariant({
  chart:'facet-shared-top-lane',variant:'seven-panels',title:'Title and headers sharing the existing top margin',
  width:508,height:262,userFacing:createFacetSharedTopLaneProgram,primitive:createPrimitiveProgram,
  callChain:'panels.editCompositionLayout({ topLane: "shared" });',
  compareSemanticSpec:false,programEquivalence:'render',artifact:{scope:'charts',capability:'facet-top-lane'},colors:[],
  regions:[{name:'seven unchanged grouped bar plots',x:40,y:43,width:412,height:200,minimumInkPixels:5000},
    {name:'parent title and seven headers',x:40,y:0,width:412,height:33,minimumInkPixels:200}]
})];
