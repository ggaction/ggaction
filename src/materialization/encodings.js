import { hasMaterializedLegend } from "./legends.js";
import { requireLayer } from "../selectors/layers.js";
import { getMarkRematerializationStep } from "./marks.js";
import { buildMaterializationPlan } from "./planner.js";

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

  const scales = [];
  if (layer.mark?.type === "point" && scale !== undefined) {
    scales.push({
      op: "rematerializeScale",
      args: { id: scale, guides: false }
    });
  }

  const marks = [];
  if (
    layer.mark?.type === "area" &&
    channel === "color" &&
    scale !== undefined
  ) {
    for (const candidate of program.semanticSpec.layers) {
      if (
        candidate.mark?.type === "area" &&
        candidate.encoding?.color?.scale === scale
      ) {
        const step = getMarkRematerializationStep(candidate);
        if (step !== undefined) marks.push(step);
      }
    }
  } else {
    const step = getMarkRematerializationStep(layer);
    if (step !== undefined) marks.push(step);
  }

  const guides = [];
  if (hasMaterializedLegend(program)) {
    guides.push({ op: "rematerializeLegend" });
  }
  return buildMaterializationPlan({ scales, marks, guides });
}
