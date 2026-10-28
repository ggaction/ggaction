import { createTextShadowExample } from "../../../../../examples/text-shadows/program.js";
import { frame, styles } from "../../../../../examples/text-shadows/data.js";
import { createTextShadowPrimitive } from "./primitive.program.js";
export const visualVariants=styles.map(style=>({chart:"text-shadows",variant:style,title:`Text shadow · ${style}`,...frame,
 source:"examples/text-shadows/program.js",primitive:()=>createTextShadowPrimitive(style),userFacing:()=>createTextShadowExample(style),
 callChain:"program.createTextMark({ shadow, outline, lineHeight: 30 }).encodeText({ field: 'text' }).createFontResource({ prepared, requestToken }).applyTextMetrics({ prepared: metrics, requestToken });",
 programEquivalence:"render"}));
