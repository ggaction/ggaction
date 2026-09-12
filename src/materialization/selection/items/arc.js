import { deriveArcSectors } from "../../../grammar/arcs.js";
import { resolvePolarPoint } from "../../../grammar/polarPaths.js";
import { resolvePolarFrame } from "../../../grammar/polar.js";
import { readScaleField } from "../../../grammar/scales/index.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import {
  concreteProperties,
  finalizeItems,
  uniqueFields
} from "./common.js";

export function resolveArcItems(program, layer, dataset) {
  const thetaScale = program.resolvedScales[layer.encoding?.theta?.scale];
  const radiusScale = program.resolvedScales[layer.encoding?.radius?.scale];
  const frame = resolvePolarFrame(resolveGraphicBounds(program));
  const derived = deriveArcSectors(dataset.values, layer, {
    thetaScale,
    ...(radiusScale === undefined ? {} : { radiusScale }),
    frame,
    innerRadiusRatio: program.markConfigs[layer.id]?.innerRadius ?? 0
  });
  const graphic = program.graphicSpec.objects[layer.id];
  const stroke = layer.encoding?.stroke;
  const definitions = derived.sectors.map((sector, index) => {
    const members = sector.sourceIndices.map(index => dataset.values[index]);
    const strokeValues = stroke === undefined ? undefined : readScaleField(
      members,
      stroke.field,
      stroke.fieldType,
      { temporalUnit: stroke.temporalUnit }
    );
    if (strokeValues !== undefined && new Set(strokeValues).size !== 1) {
      throw new Error("Arc stroke requires one value within each sector.");
    }
    return {
      fields: uniqueFields(members),
      channels: {
        theta: sector.theta,
        ...(sector.radius === undefined ? {} : { radius: sector.radius }),
        ...(sector.color === undefined ? {} : { color: sector.color }),
        ...(strokeValues === undefined ? {} : { stroke: strokeValues[0] })
      },
      properties: {
        ...concreteProperties(graphic.items[index]?.properties),
        ...resolvePolarPoint(
          frame,
          (sector.startTheta + sector.endTheta) / 2,
          (sector.innerRadius + sector.outerRadius) / 2
        )
      },
      members
    };
  });
  return finalizeItems(program, layer, "sector", definitions, "path");
}
