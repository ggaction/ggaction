import { validateUserId } from "../core/identifiers.js";
import { findDataset } from "../selectors/datasets.js";
import { resolveEligibleLayer } from "../selectors/layers.js";
import { findScaleConsumers } from "./scales/consumers/index.js";
import { CATEGORY_ORDER_CHANNELS } from "../grammar/categoryOrder.js";

export function resolveCategoryOrderAssignment(program, args, operation, { activeOnly = false } = {}) {
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

