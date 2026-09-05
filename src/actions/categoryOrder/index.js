import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { findScaleConsumers } from "../scales/consumers/index.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import { getMarkMaterializationStep } from "../../materialization/marks/index.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
import {
  CATEGORY_ORDER_CHANNELS,
  normalizeCategoryOrder,
  resolveCategoryOrder
} from "../../grammar/categoryOrder.js";

const ORDER_OPTIONS = Object.freeze(["target", "channel", "values", "by", "direction"]);
const REMOVE_OPTIONS = Object.freeze(["target", "channel"]);

function resolveAssignment(program, args, operation, { activeOnly = false } = {}) {
  if (!CATEGORY_ORDER_CHANNELS.includes(args.channel)) {
    throw new Error(`${operation} channel must be x, y, or theta.`);
  }
  const requested = args.target === undefined
    ? undefined
    : validateUserId(args.target, "Mark id");
  const layer = resolveEligibleLayer(program, {
    target: requested,
    label: "categorical position mark",
    predicate: candidate => {
      const encoding = candidate.encoding?.[args.channel];
      return ["nominal", "ordinal"].includes(encoding?.fieldType) &&
        typeof encoding.field === "string" && encoding.scale !== undefined &&
        (!activeOnly || encoding.categoryOrder !== undefined);
    }
  });
  const encoding = layer.encoding[args.channel];
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Mark "${layer.id}" requires an existing dataset.`);
  }
  const consumers = findScaleConsumers(program, encoding.scale);
  const incompatible = consumers.find(consumer =>
    consumer.layer.id !== layer.id &&
    (consumer.layer.data !== layer.data || consumer.encoding.field !== encoding.field)
  );
  if (incompatible !== undefined) {
    throw new Error(
      `Category order scale "${encoding.scale}" has an incompatible shared consumer.`
    );
  }
  return { layer, encoding, dataset };
}

function rematerializeAssignment(program, scaleId) {
  const consumers = findScaleConsumers(program, scaleId);
  return applyMaterializationPlan(program, buildMaterializationPlan({
    scales: [{
      op: "rematerializeScale",
      args: { id: scaleId, guides: false, marks: false }
    }],
    marks: consumers.map(consumer =>
      getMarkMaterializationStep(program, consumer.layer)
    ),
    guides: planScaleGuideRematerialization(program, scaleId)
  }));
}

export const orderCategories = action(
  { op: "orderCategories", description: "Assign semantic order to a categorical position." },
  function (args = {}) {
    validateKeys(args, ORDER_OPTIONS, "orderCategories");
    const { layer, encoding, dataset } = resolveAssignment(this, args, "orderCategories");
    const order = normalizeCategoryOrder(args);
    resolveCategoryOrder(dataset.values, encoding.field, order);
    const edited = this.editSemantic({
      property: `layer[${layer.id}].encoding.${args.channel}.categoryOrder`,
      value: order
    });
    return rematerializeAssignment(edited, encoding.scale);
  }
);

export const removeCategoryOrder = action(
  { op: "removeCategoryOrder", description: "Restore automatic category order." },
  function (args = {}) {
    validateKeys(args, REMOVE_OPTIONS, "removeCategoryOrder");
    const { layer, encoding } = resolveAssignment(
      this,
      args,
      "removeCategoryOrder",
      { activeOnly: args.target === undefined }
    );
    if (encoding.categoryOrder === undefined) {
      throw new Error(
        `Mark "${layer.id}" ${args.channel} encoding has no category order assignment.`
      );
    }
    const edited = this.editSemantic({
        property: `layer[${layer.id}].encoding.${args.channel}.categoryOrder`,
        remove: true
      });
    return rematerializeAssignment(edited, encoding.scale);
  }
);

export function registerCategoryOrderActions(ProgramClass) {
  ProgramClass.prototype.orderCategories = orderCategories;
  ProgramClass.prototype.removeCategoryOrder = removeCategoryOrder;
}
