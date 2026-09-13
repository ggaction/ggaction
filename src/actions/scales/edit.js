import { withGuideLayoutValidation } from "../../materialization/guides/layout.js";
import {
  applyColorLegendTransition,
  planColorLegendTransitions
} from "../guides/legends/transition.js";
import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { getMarkMaterializationStep, getSourceDependentMarkSteps } from "../../materialization/marks/index.js";
import {
  applyMaterializationPlan,
  planCoordinateRematerialization
} from "../../materialization/dependencies.js";
import { findDataAspectCoordinatesForScale } from
  "../../materialization/coordinateBounds.js";
import {
  findSemanticScale,
  requireSemanticScale
} from "../../selectors/scales.js";
import { findScaleConsumers } from "./consumers/index.js";
import {
  prepareScaleEdit,
  resolveScaleConsumerChannel
} from "./editPolicy.js";
import { hasExactLegendSamplingForScale } from
  "../guides/legends/sampling.js";

const OPTIONS = Object.freeze([
  "id", "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "paddingInner", "paddingOuter", "padding",
  "align", "interpolate", "midpoint", "unknown", "palette", "radialMapping"
]);
const EDITABLE = Object.freeze(
  OPTIONS.filter(option => !["id", "palette"].includes(option))
);
const REQUESTED_CHANGES = Object.freeze(OPTIONS.filter(option => option !== "id"));

function resolveScaleId(program, requested) {
  if (requested !== undefined) {
    const id = validateUserId(requested, "Scale id");
    requireSemanticScale(program, id);
    return id;
  }
  const current = program.context.currentScale;
  if (
    typeof current === "string" && findSemanticScale(program, current) !== undefined
  ) {
    return current;
  }
  if (program.semanticSpec.scales.length === 1) {
    return program.semanticSpec.scales[0].id;
  }
  throw new Error(
    "editScale requires id when no unique current scale can be inferred."
  );
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function planMarkRematerialization(program, consumers) {
  const plan = [];
  const seen = new Set();
  for (const consumer of consumers) {
    const step = getMarkMaterializationStep(program, consumer.layer);
    if (step === undefined || seen.has(consumer.layer.id)) continue;
    const pointHandledByScale =
      consumer.layer.mark?.type === "point" &&
      !["size", "shape"].includes(consumer.channel) &&
      program.graphicSpec.objects[consumer.layer.id]?.type !== "collection";
    if (pointHandledByScale) continue;
    seen.add(consumer.layer.id);
    plan.push(step);
  }
  return [
    ...plan,
    ...consumers.flatMap(consumer => getSourceDependentMarkSteps(program, consumer.layer.id))
  ];
}

function applyScaleEdit(program, {
  id,
  scale,
  channel,
  consumers,
  definition,
  legendTransitions
}) {
  let next = program;
  for (const transition of legendTransitions) {
    next = next.removeLegend({
      target: transition.args.target,
      channels: [transition.channel]
    });
  }
  for (const property of EDITABLE) {
    if (
      Object.hasOwn(scale, property) &&
      !Object.hasOwn(definition, property)
    ) {
      next = next.editSemantic({
        property: `scale[${id}].${property}`,
        remove: true
      });
    }
  }
  for (const property of EDITABLE) {
    if (
      !Object.hasOwn(definition, property) ||
      sameValue(scale[property], definition[property])
    ) continue;
    next = next.editSemantic({
      property: `scale[${id}].${property}`,
      value: definition[property]
    });
  }
  if (consumers.length === 0) return next;

  const aspectCoordinates = findDataAspectCoordinatesForScale(next, id);
  if (aspectCoordinates.length > 0) {
    for (const coordinate of aspectCoordinates) {
      next = applyMaterializationPlan(
        next,
        planCoordinateRematerialization(next, coordinate.id)
      );
    }
  } else {
    next = next.rematerializeScale({ id });
    next = applyMaterializationPlan(
      next,
      planMarkRematerialization(next, consumers)
    );
  }
  if (["xOffset", "yOffset"].includes(channel)) {
    for (const consumer of consumers) {
      next = next._withoutMaterializationConfig([
        "marks", consumer.layer.id, channel
      ]);
    }
  }
  for (const transition of legendTransitions) {
    next = applyColorLegendTransition(next, transition);
  }
  return next;
}

export const editScale = action(
  {
    op: "editScale",
    description: "Edit an existing scale and rematerialize its consumers."
  },
  withGuideLayoutValidation(function (args = {}) {
    validateOptionObject(args, OPTIONS, "editScale");
    if (!REQUESTED_CHANGES.some(property => Object.hasOwn(args, property))) {
      throw new Error("editScale requires at least one editable property.");
    }
    const id = resolveScaleId(this, args.id);
    const scale = requireSemanticScale(this, id);
    const consumers = findScaleConsumers(this, id);
    const channel = resolveScaleConsumerChannel(consumers, id);
    const definition = prepareScaleEdit(this, scale, channel, consumers, args);

    const legendTransitions = planColorLegendTransitions(this, scale, definition.type);
    const proposal = {
      id,
      scale,
      channel,
      consumers,
      definition,
      legendTransitions
    };
    // Preflight every dependent mark and guide on a discarded immutable branch.
    if (
      scale.type !== definition.type ||
      hasExactLegendSamplingForScale(this, id)
    ) {
      applyScaleEdit(this, proposal);
    }
    return applyScaleEdit(this, proposal);
  })
);
