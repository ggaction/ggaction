import { createBullet } from "../../../examples/bullet/program.js";
import { createBulletPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({ chart: "bullet", variant: "actual-target", title: "Reference ranges, actual measure and target",
  width: 360, height: 160, primitive: createBulletPrimitive, userFacing: createBullet,
  programEquivalence: "render", compareSemanticSpec: false,
  callChain: `chart().createCanvas(canvas)
    .createData({id:"reference",values:ranges,keyField:"id"})
    .createRectMark({id:"ranges",data:"reference",stroke:false})
    .encodeXRange({lower:"lower",upper:"upper",scale:amountScale})
    .encodeColor(color)
    .createData({id:"observed",values:observations,keyField:"id"})
    .createBarMark({id:"measure",data:"observed",fill:"#2563eb",stroke:false})
    .encodeY(position).encodeX({field:"actual",aggregate:"sum",scale:{id:"amount"}})
    .encodeBarWidth({band:0.35})
    .createRuleMark({id:"target",data:"observed",stroke:"#0f172a",strokeWidth:3})
    .encodeX({field:"target",fieldType:"quantitative",scale:{id:"amount"}})
    .createMarkLabels({id:"measure-label",source:"measure",content:"value",fill:"#ffffff",placement:{anchor:"center"}})
    .createTitle({text:"Revenue: actual and target",titleStyle:{fontSize:14}});`,
  artifact: { capability: "composition-recipes" }, colors: ["#2563eb", "#94a3b8"],
  regions: [{ name: "reference and measure", x: 30, y: 45, width: 300, height: 70, minimumInkPixels: 15000 }]
})];
