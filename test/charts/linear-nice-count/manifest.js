import { defineVisualVariant } from "../../support/visual-variants.js";
import { createLinearNiceCount } from "../../../examples/linear-nice-count/program.js";
import { createLinearNiceCountPrimitives } from "./primitive.program.js";

export const visualVariants=[defineVisualVariant({
  chart:"linear-nice-count",variant:"default",title:"Count-based automatic linear domain",
  width:260,height:170,
  callChain:`chart()
  .createCanvas({plot:{width:200,height:120},margin:{left:40,top:20,right:20,bottom:30}})
  .createData({values:[{x:0,y:0},{x:0.5,y:54},{x:1,y:108}]})
  .createLinePlot({x:{field:"x",scale:{domain:[0,1]}},y:{field:"y",scale:{zero:true,nice:{count:10}}},guides:false});`,
  primitive:createLinearNiceCountPrimitives,userFacing:createLinearNiceCount,compareSemanticSpec:false,
  artifact:{scope:"charts",capability:"scales"},colors:["#4c78a8"],
  regions:[{name:"plot",x:40,y:20,width:200,height:120,minimumInkPixels:100}]
})];
