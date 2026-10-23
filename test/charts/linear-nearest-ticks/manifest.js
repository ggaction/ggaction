import { defineVisualVariant } from "../../support/visual-variants.js";
import { createLinearNearestTicks } from "../../../examples/linear-nearest-ticks/program.js";
import { createLinearNearestTicksPrimitives } from "./primitive.program.js";

export const visualVariants = [defineVisualVariant({
  chart: "linear-nearest-ticks", variant: "default", title: "Nearest-step automatic linear ticks",
  width: 260, height: 170,
  callChain: `chart()
  .createCanvas({plot:{width:200,height:120},margin:{left:40,top:20,right:20,bottom:30}})
  .createData({values:[{x:0,y:0},{x:1,y:133}]})
  .createLinePlot({x:{field:"x",scale:{domain:[0,1]}},y:{field:"y",scale:{domain:[0,140]}},guides:{axes:{x:false,y:{title:false,ticksAndLabels:{rounding:"nearest"}}},grid:false,legend:false}});`,
  primitive: createLinearNearestTicksPrimitives, userFacing: createLinearNearestTicks,
  compareSemanticSpec: false,
  artifact: { scope: "charts", capability: "axes" }, colors: ["#4c78a8"],
  regions: [{ name: "plot", x: 40, y: 20, width: 200, height: 120, minimumInkPixels: 100 }]
})];
