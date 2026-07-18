import { hasMaterializedLegend } from "./legends.js";
import { requireLayer } from "../selectors/layers.js";
import {
  getEncodingMaterializationStages
} from "./marks.js";
import { buildMaterializationPlan } from "./planner.js";
import { getSourceDependentMarkSteps } from "./marks.js";

export function planEncodingRematerialization(program, {
  target,
  channel,
  scale
}) {
  const layer = requireLayer(
    program,
    target,
    `Unknown encoding materialization target "${target}"`
  );

  const { scales, marks: directMarks } = getEncodingMaterializationStages(
    program,
    layer,
    channel,
    scale
  );
  const marks = [
    ...directMarks,
    ...getSourceDependentMarkSteps(program, target)
  ];

  const guides = [];
  if (hasMaterializedLegend(program)) {
    guides.push({ op: "rematerializeLegend" });
  }
  return buildMaterializationPlan({ scales, marks, guides });
}
