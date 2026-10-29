import { imageClipOwner } from "../../grammar/imageMark.js";
import {
  canMaterializeArc,
  canMaterializeArea,
  canMaterializeBar,
  canMaterializeLine,
  canMaterializePoint,
  canMaterializeRect,
  canMaterializeRule,
  canMaterializeText,
  canMaterializeTick,
  isIntentionallyEmptyArea
} from "./capabilities.js";

const MARK_MATERIALIZATION_POLICIES = Object.freeze({
  contour: Object.freeze({ canMaterialize: (_program, layer) => layer.contourBinding !== undefined,
    op: "materializeContourMark", acceptsResolvedScales: true, scaleApplication: Object.freeze({ default: "defer", deferWithMark: true }) }),
  image: Object.freeze({ canMaterialize: (_program, layer) => layer.image !== undefined,
    op: "rematerializeImageMark", graphicOwner: imageClipOwner,
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" }) }),
  tree: Object.freeze({ canMaterialize: (_program, layer) => layer.hierarchyBinding !== undefined, op: "materializeTreePlot", scaleApplication: Object.freeze({ default: "defer" }) }),
  treemap: Object.freeze({ canMaterialize: (_program, layer) => layer.hierarchyBinding !== undefined, op: "materializeTreemapPlot", scaleApplication: Object.freeze({ default: "defer" }) }),
  "flow-node": Object.freeze({ canMaterialize: (_program, layer) => layer.flowBinding !== undefined, op: "materializeFlowNodes", scaleApplication: Object.freeze({ default: "defer" }) }),
  "flow-link": Object.freeze({ canMaterialize: (_program, layer) => layer.flowBinding !== undefined, op: "materializeFlowLinks", scaleApplication: Object.freeze({ default: "defer" }) }),
  point: Object.freeze({
    canMaterialize: canMaterializePoint,
    op: "rematerializePointMark",
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      deferredChannels: Object.freeze(["size", "shape"]),
      default: "direct"
    }),
    rematerializeIncompleteExisting: true
  }),
  tick: Object.freeze({
    canMaterialize: canMaterializeTick,
    op: "rematerializeTickMark",
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      default: "defer"
    }),
    rematerializeIncompleteExisting: true
  }),
  line: Object.freeze({
    canMaterialize: canMaterializeLine,
    op: "rematerializeLineMark",
    acceptsResolvedScales: true,
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    encoding: Object.freeze({ scaleFirst: true, completeOnly: true }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  area: Object.freeze({
    canMaterialize: canMaterializeArea,
    op: "rematerializeAreaMark",
    acceptsResolvedScales: true,
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: true }),
    encoding: Object.freeze({
      completeOnly: true,
      sharedChannels: Object.freeze(["color", "stroke", "opacity"]),
      skipRematerialization: isIntentionallyEmptyArea
    }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  arc: Object.freeze({
    canMaterialize: canMaterializeArc,
    op: "rematerializeArcMark",
    acceptsResolvedScales: true,
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    encoding: Object.freeze({ completeOnly: true }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  bar: Object.freeze({
    canMaterialize: canMaterializeBar,
    op: "rematerializeBarMark",
    acceptsResolvedScales: true,
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  rule: Object.freeze({
    canMaterialize: canMaterializeRule,
    op: "rematerializeRuleMark",
    acceptsResolvedScales: true,
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  text: Object.freeze({
    canMaterialize: canMaterializeText,
    op: "rematerializeTextMark",
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      default: "defer"
    }),
    rematerializeIncompleteExisting: true,
    sourceDependent: true
  }),
  rect: Object.freeze({
    canMaterialize: canMaterializeRect,
    op: "rematerializeRectMark",
    acceptsResolvedScales: true,
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      default: "defer"
    }),
    rematerializeIncompleteExisting: true
  })
});

export function getMarkMaterializationPolicy(layer) {
  return MARK_MATERIALIZATION_POLICIES[layer.mark?.type];
}

export function markGraphicOwner(layer) { return getMarkMaterializationPolicy(layer)?.graphicOwner?.(layer.id) ?? layer.id; }
