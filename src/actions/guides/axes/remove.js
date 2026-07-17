import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";

const OPTIONS = Object.freeze(["coordinate", "scale"]);

function makeRemoveAxis(channel) {
  const prefix = channel === "x"
    ? "X"
    : channel === "y"
      ? "Y"
      : channel === "theta"
        ? "Theta"
        : "Radial";
  const operation = `remove${prefix}Axis`;
  const graphicPrefix = channel === "radius" ? "radial" : channel;
  const graphicIds = [
    `${graphicPrefix}AxisLine`,
    `${graphicPrefix}AxisTicks`,
    `${graphicPrefix}AxisLabels`,
    `${graphicPrefix}AxisTitle`
  ];
  return action(
    {
      op: operation,
      description: `Remove the complete ${channel}-axis resource.`
    },
    function (args = {}) {
      validateKeys(args, OPTIONS, operation);
      const semantic = this.semanticSpec.guides.axis?.[channel];
      const config = this.guideConfigs.axis?.[channel];
      const hasGraphic = graphicIds.some(
        id => this.graphicSpec.objects[id] !== undefined
      );
      if (semantic === undefined && config === undefined && !hasGraphic) {
        throw new Error(`${operation} requires an existing ${channel}-axis.`);
      }
      if (args.scale !== undefined && semantic?.scale !== args.scale) {
        throw new Error(`${operation} found no axis for scale "${args.scale}".`);
      }
      if (args.coordinate !== undefined && semantic?.coordinate !== args.coordinate) {
        throw new Error(
          `${operation} found no axis for coordinate "${args.coordinate}".`
        );
      }
      let next = semantic === undefined
        ? this
        : this.editSemantic({
            property: `guide.axis.${channel}`,
            remove: true
          });
      for (const id of graphicIds) {
        if (next.graphicSpec.objects[id] !== undefined) {
          next = next.editGraphics({ target: id, remove: true });
        }
      }
      return next._withoutMaterializationConfig(["guides", "axis", channel]);
    }
  );
}

export const removeXAxis = makeRemoveAxis("x");
export const removeYAxis = makeRemoveAxis("y");
export const removeThetaAxis = makeRemoveAxis("theta");
export const removeRadialAxis = makeRemoveAxis("radius");
