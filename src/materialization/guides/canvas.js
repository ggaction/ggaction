import { findCanvasGraphic } from "../graphicHierarchy.js";

// Intrinsic guide measurement keeps the real dimensions for placement. Only
// containment waits for the bounded solve; this record is never persisted.
export function guideCanvasProperties(program) {
  const canvas = findCanvasGraphic(program)?.properties;
  return canvas === undefined ? undefined : program.context.responsiveMeasuring === true
    ? { ...canvas, deferCanvasFit: true } : canvas;
}
