import { canvas, values, plot } from "../../../examples/streamgraph/fixture.js";
import { createStreamgraph } from "../../../examples/streamgraph/program.js";
import { createStreamgraphPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({chart:"streamgraph",variant:"wiggle",title:"Streamgraph: moving baseline with preserved thickness",
  width:canvas.width,height:canvas.height,primitive:createStreamgraphPrimitive,userFacing:createStreamgraph,
  programEquivalence:"render",compareSemanticSpec:false,
  callChain:"chart()"+[["createCanvas",canvas],["createData",{id:"data",values}],["createAreaPlot",plot]].map(([op,args])=>`\n  .${op}(${JSON.stringify(args)})`).join("")+";",
  artifact:{scope:"charts",capability:"series-layout"},colors:["#2563eb","#0d9488"],
  regions:[{name:"layers",x:40,y:40,width:300,height:200,minimumInkPixels:10000}]
})];
