import { createFontExample, frame } from "../../../examples/font-assets/program.js";
import { createFontPrimitive } from "./primitive.program.js";
export const variants = [{ chart: "font-assets", variant: "korean-emoji", title: "Prepared Korean and emoji fonts", ...frame,
  programEquivalence: "render",
  source: "examples/font-assets/program.js", userFacing: createFontExample, primitive: createFontPrimitive,
  callChain: "program.createFontResource({ prepared, requestToken }).applyTextMetrics({ prepared: metrics, requestToken });" }];
export const visualVariants = variants;
