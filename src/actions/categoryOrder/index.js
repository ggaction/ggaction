import { resolveCategoryOrderAssignment } from "../../materialization/categoryOrder.js";
import { closedAction } from "../../core/action.js";

import { findScaleConsumers } from "../../materialization/scales/consumers/index.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import {
  getMarkMaterializationStep,
  getSourceDependentMarkSteps
} from "../../materialization/marks/index.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
import {
  normalizeCategoryOrder,
  resolveCategoryOrder
} from "../../grammar/categoryOrder.js";

const ORDER_OPTIONS = Object.freeze(["target", "channel", "values", "by", "direction"]);
const REMOVE_OPTIONS = Object.freeze(["target", "channel"]);


function rematerializeAssignment(program, scaleId) {
  const consumers = findScaleConsumers(program, scaleId);
  const directMarks = consumers.map(consumer =>
    getMarkMaterializationStep(program, consumer.layer)
  );
  return applyMaterializationPlan(program, buildMaterializationPlan({
    scales: [{
      op: "rematerializeScale",
      args: { id: scaleId, guides: false, marks: false }
    }],
    marks: [
      ...directMarks,
      ...directMarks.flatMap(step =>
        step === undefined
          ? []
          : getSourceDependentMarkSteps(program, step.args.id)
      )
    ],
    guides: planScaleGuideRematerialization(program, scaleId)
  }));
}

export const orderCategories = /* @__PURE__ */ closedAction(
  { op: "orderCategories", description: "Assign semantic order to a categorical position." }, ORDER_OPTIONS,
  function (args = {}) {
    const { layer, encoding, dataset } = resolveCategoryOrderAssignment(this, args, "orderCategories");
    const order = normalizeCategoryOrder(args);
    resolveCategoryOrder(dataset.values, encoding.field, order);
    const edited = this.editSemantic({
      property: `layer[${layer.id}].encoding.${args.channel}.categoryOrder`,
      value: order
    });
    return rematerializeAssignment(edited, encoding.scale);
  }
);

export const removeCategoryOrder = /* @__PURE__ */ closedAction(
  { op: "removeCategoryOrder", description: "Restore automatic category order." }, REMOVE_OPTIONS,
  function (args = {}) {
    const { layer, encoding } = resolveCategoryOrderAssignment(
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
