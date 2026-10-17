import { selectCartesianAxis } from "../../../selectors/axes.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import { axisGraphicIds } from
  "../../../materialization/guides/resources.js";

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
  return action(
    {
      op: operation,
      description: `Remove the complete ${channel}-axis resource.`
    },
    withGuideLayoutValidation(function (args = {}) {
      const cartesian = ["x", "y"].includes(channel);
      validateKeys(args, cartesian ? [...OPTIONS, "target"] : OPTIONS, operation);
      const selected = cartesian ? selectCartesianAxis(this, channel, args, { whole: true }) : { id: channel, options: args };
      const axisId = selected.id; args = selected.options;
      const graphicIds = axisGraphicIds(channel, axisId);
      const semantic = this.semanticSpec.guides.axis?.[axisId];
      const config = this.guideConfigs.axis?.[axisId];
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
            property: `guide.axis.${axisId}`,
            remove: true
          });
      for (const id of graphicIds) {
        if (next.graphicSpec.objects[id] !== undefined) {
          next = next.editGraphics({ target: id, remove: true });
        }
      }
      return next._withoutMaterializationConfig(["guides", "axis", axisId]);
    })
  );
}

export const removeXAxis = /* @__PURE__ */ makeRemoveAxis("x");
export const removeYAxis = /* @__PURE__ */ makeRemoveAxis("y");
export const removeThetaAxis = /* @__PURE__ */ makeRemoveAxis("theta");
export const removeRadialAxis = /* @__PURE__ */ makeRemoveAxis("radius");
