import { planColorLegendTransition, applyColorLegendTransition } from "../guides/legends/transition.js";
import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { getMarkMaterializationStep } from "../../materialization/marks/index.js";
import {
  applyMaterializationPlan
} from "../../materialization/dependencies.js";
import {
  findSemanticScale,
  requireSemanticScale
} from "../../selectors/scales.js";
import { findScaleConsumers } from "./consumers/index.js";
import {
  prepareScaleEdit,
  resolveScaleConsumerChannel
} from "./editPolicy.js";

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
  return plan;
}

function applyScaleEdit(program, { id, scale, consumers, definition, legendTransition }) {
  let next = legendTransition === undefined ? program
    : program.removeLegend({ target: legendTransition.args.target, channels: ["color"] });
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

  next = next.rematerializeScale({ id });
  next = applyMaterializationPlan(next, planMarkRematerialization(next, consumers));
  return legendTransition === undefined ? next : applyColorLegendTransition(next, legendTransition);
}

export const editScale = action(
  {
    op: "editScale",
    description: "Edit an existing scale and rematerialize its consumers."
  },
  function (args = {}) {
    validateOptionObject(args, OPTIONS, "editScale");
    if (!REQUESTED_CHANGES.some(property => Object.hasOwn(args, property))) {
      throw new Error("editScale requires at least one editable property.");
    }
    const id = resolveScaleId(this, args.id);
    const scale = requireSemanticScale(this, id);
    const consumers = findScaleConsumers(this, id);
    const channel = resolveScaleConsumerChannel(consumers, id);
    const definition = prepareScaleEdit(this, scale, channel, consumers, args);

    const legendTransition = planColorLegendTransition(this, scale, definition.type);
    const proposal = { id, scale, consumers, definition, legendTransition };
    // Preflight every dependent mark and guide on a discarded immutable branch.
    if (scale.type !== definition.type) applyScaleEdit(this, proposal);
    return applyScaleEdit(this, proposal);
  }
);
