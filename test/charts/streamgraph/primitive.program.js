import { chart } from "../../../src/index.js";
import { canvas } from "../../../examples/streamgraph/fixture.js";
import { commands, colors } from "./reference-values.js";
export function createStreamgraphPrimitive() {
  return chart().createCanvas(canvas)
    .createGraphics({id:"stream",type:"path",parent:"plot-main"})
    .editGraphics({target:"stream",property:"length",value:2})
    .editGraphics({target:"stream",property:"commands",value:[commands(0),commands(1)]})
    .editGraphics({target:"stream",property:"fill",value:colors})
    .editGraphics({target:"stream",property:"opacity",value:1})
    .editGraphics({target:"stream",property:"stroke",value:"none"})
    .editGraphics({target:"stream",property:"strokeWidth",value:0});
}
