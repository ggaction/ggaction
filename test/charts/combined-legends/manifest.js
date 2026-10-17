import {createCombinedLegendsProgram,createNumericCombinedProgram,createCategoricalCombinedProgram,createMappedCombinedProgram,createOpacitySelectedProgram} from '../../../examples/combined-legends/program.js';
import {createPrimitiveProgram,createCategoricalPrimitiveProgram,createComparisonPrimitiveProgram,createMappedPrimitiveProgram,createOpacityPrimitiveProgram} from './primitive.program.js';
export {createNumericCombinedProgram as createPublicProgram,createPrimitiveProgram};
export const variant={capability:'combined-legends',chart:'color-size',variant:'shared-numeric-samples',title:'One numeric list maps both color and physical area',width:600,height:300,calls:[
 'chart().createCanvas({width:600,height:300,margin:{left:10,right:200,top:10,bottom:10}})',
 '.createData({values:[{x:0,y:0,v:0},{x:5,y:5,v:5},{x:10,y:10,v:10}]})',
 '.createScatterPlot({x:"x",y:"y",guides:false})',
 '.encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[0,10],range:["#000000","#ffffff"]}})',
 '.encodeSize({field:"v",scale:{type:"pow",exponent:1.4150374992788437,domain:[0,10],range:[3.141592653589793,28.274333882308138]}})',
 '.createLegend({combine:"color-size",values:[0,5,10],title:"Value",symbol:{stroke:"#777",strokeWidth:1}})'
]};

export const categoricalCalls=[
 'chart().createCanvas({width:600,height:300,margin:{left:20,right:200,top:30,bottom:30}})',
 '.createData({values:[{x:0,y:0,g:"A"},{x:5,y:5,g:"B"},{x:10,y:10,g:"C"}]})',
 '.createPointMark({id:"points"})',
 '.encodeX({field:"x",scale:{domain:[0,10]}})',
 '.encodeY({field:"y",scale:{domain:[0,10]}})',
 '.encodeShape({field:"g",scale:{domain:["A","B","C"],range:["circle","square","triangle-up"]}})',
 '.encodeSize({field:"g",fieldType:"ordinal",scale:{domain:["A","B","C"],range:[25,100,225]}})',
 '.createLegend({combine:"size-shape",title:"Category"})'
];
function entry({slug,title,calls,userFacing,primitive,width=600}){
 return {capability:'combined-legends',chart:'combined-legends',variant:slug,title,width,height:300,calls,
  programEquivalence:'render',compareSemanticSpec:false,callChain:calls.join('\n')+';',userFacing,primitive};
}
export const visualVariants=[
 entry({slug:'two-combined-blocks',title:'One label list for each combined block',width:1224,
  calls:['hconcat({id:"combinedSampleComparison",programs:[{id:"categorical",program:categorical},{id:"quantitative",program:quantitative}],gap:24,padding:0,align:"start"})'],
  userFacing:createCombinedLegendsProgram,primitive:createComparisonPrimitiveProgram}),
 entry({slug:variant.variant,title:variant.title,calls:variant.calls,userFacing:createNumericCombinedProgram,primitive:createPrimitiveProgram}),
 entry({slug:'physical-categorical-areas',title:'Mapped categorical areas25/100/225',calls:categoricalCalls,userFacing:createCategoricalCombinedProgram,primitive:createCategoricalPrimitiveProgram}),
 entry({slug:'numeric-display-map',title:'Numeric display changes keep typed samples',calls:[...variant.calls,
  '.editLegendBlock({target:"scatterPlot",channel:"size",labelMap:[{value:5,label:"Five"}]})'],
  userFacing:createMappedCombinedProgram,primitive:createMappedPrimitiveProgram}),
 entry({slug:'selected-opacity-font',title:'Only coexisting opacity labels use10px',calls:[...variant.calls,
  '.encodeOpacity({target:"scatterPlot",field:"v",scale:{domain:[0,10],range:[0,1]}})',
  '.createLegend({target:"scatterPlot",channels:["opacity"],values:[0,10],title:"Opacity"})',
  '.editLegendLabels({channel:"opacity",fontSize:10})'],userFacing:createOpacitySelectedProgram,primitive:createOpacityPrimitiveProgram})
];
export const approvedTargetCases={164:'numeric-display-map',171:'physical-categorical-areas',177:'selected-opacity-font',205:'shared-numeric-samples'};
