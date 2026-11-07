import { chart } from "../../../src/index.js";
import { canvas } from "../../../examples/bullet/fixture.js";
export function createBulletPrimitive() {
  return chart().createCanvas(canvas)
    .createGraphics({ id: "ranges", type: "rect", parent: "plot-main", length: 3 })
    .editGraphics({ target: "ranges", property: "x", value: [30,180,255] })
    .editGraphics({ target: "ranges", property: "y", value: 45 })
    .editGraphics({ target: "ranges", property: "width", value: [150,75,75] })
    .editGraphics({ target: "ranges", property: "height", value: 70 })
    .editGraphics({ target: "ranges", property: "fill", value: ["#e2e8f0","#cbd5e1","#94a3b8"] })
    .editGraphics({ target: "ranges", property: "opacity", value: 1 })
    .editGraphics({ target: "ranges", property: "stroke", value: "transparent" })
    .editGraphics({ target: "ranges", property: "strokeWidth", value: 0 })
    .createGraphics({ id: "measure", type: "rect", parent: "plot-main", length: 1 })
    .editGraphics({ target: "measure", property: "items", value: [{ type: "rect", properties: { x:30,y:67.75,width:195,height:24.5,fill:"#2563eb",stroke:"transparent",strokeWidth:0 } }] })
    .createGraphics({ id: "target", type: "line", parent: "plot-main", length: 1 })
    .editGraphics({ target: "target", property: "items", value: [{ type: "line", properties: { x1:270,y1:45,x2:270,y2:115,stroke:"#0f172a",strokeWidth:3,strokeDash:[],opacity:1 } }] })
    .createGraphics({ id: "measure-label", type: "text", parent: "plot-main", length: 1 })
    .editGraphics({ target: "measure-label", property: "items", value: [{ type: "text", properties: { x:127.5,y:80,text:"65",fill:"#ffffff",opacity:1,fontSize:12,fontFamily:"sans-serif",fontWeight:"normal",textAlign:"center",textBaseline:"middle",rotation:0 } }] })
    .createTitle({ text: "Revenue: actual and target", titleStyle: { fontSize: 14 } });
}
