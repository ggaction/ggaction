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
const legacyVariant={...variant,chart:'legend-appearance',programEquivalence:'render',compareSemanticSpec:false,
 callChain:variant.calls.join('\n')+';',userFacing:createLegendAppearanceProgram,primitive:createPrimitiveProgram};

import {defineVisualVariant}from'../../support/visual-variants.js';
import {createGradientBlockProgram,gradientBlockCalls}from'../../../examples/legend-layout/program.js';
import {createRecipeOpacityProgram,recipeOpacityCalls}from'../../../examples/legend-recipe-opacity/program.js';
import {createGradientBlockPrimitive,createRecipeOpacityPrimitive}from'./primitive.program.js';
const chain=calls=>'chart()\n'+calls.map(({op,args})=>`  .${op}(${JSON.stringify(args)})`).join('\n')+';';
export const appearanceVariants=[defineVisualVariant({
 chart:'legend-layout',variant:'gradient-and-local-size',title:'Horizontal color, bottom title, dashed border and independent size anchor',
 width:480,height:270,userFacing:createGradientBlockProgram,primitive:createGradientBlockPrimitive,callChain:chain(gradientBlockCalls),
 compareSemanticSpec:false,artifact:{scope:'charts',capability:'legend-appearance'},colors:[],
 regions:[{name:'gradient and title',x:29,y:47,width:158,height:92,minimumInkPixels:1800},
  {name:'local size block',x:7,y:230,width:55,height:33,minimumInkPixels:70}]
}),...[0,.7,1].map(opacity=>defineVisualVariant({
 chart:'legend-recipe-opacity',variant:`recipe-opacity-${String(opacity).replace('.','-')}`,title:`Line and outlined point recipe with opacity ${opacity}`,
 width:480,height:270,userFacing:()=>createRecipeOpacityProgram(opacity),primitive:()=>createRecipeOpacityPrimitive(opacity),callChain:chain(recipeOpacityCalls(opacity)),
 compareSemanticSpec:false,programEquivalence:'render',artifact:{scope:'charts',capability:'legend-appearance'},colors:[],
 regions:[{name:'complete sample and unchanged label',x:273,y:66,width:150,height:20,minimumInkPixels:30}]
}))];
export const visualVariants=[legacyVariant,...appearanceVariants];
