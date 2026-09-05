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
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    encoding: Object.freeze({ scaleFirst: true, completeOnly: true }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  area: Object.freeze({
    canMaterialize: canMaterializeArea,
    op: "rematerializeAreaMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: true }),
    encoding: Object.freeze({
      sharedChannels: Object.freeze(["color"]),
      skipRematerialization: isIntentionallyEmptyArea
    }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  arc: Object.freeze({
    canMaterialize: canMaterializeArc,
    op: "rematerializeArcMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    encoding: Object.freeze({ completeOnly: true }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  bar: Object.freeze({
    canMaterialize: canMaterializeBar,
    op: "rematerializeBarMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  rule: Object.freeze({
    canMaterialize: canMaterializeRule,
    op: "rematerializeRuleMark",
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
