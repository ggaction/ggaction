import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { applyGeoCamera } from "../../grammar/geo/camera.js";
import { projectionParameters } from "../../grammar/geo/projectionDefinition.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { resolveProjectionResource } from "../../selectors/projections.js";

export const navigateProjection = /* @__PURE__ */ closedAction(
  { op: "navigateProjection", description: "Navigate a projection through explicit camera operations." },
  ["target", "operation"], function (args = {}) {
    const previous = resolveProjectionResource(this, args.target);
    const { operation } = args;
    ownRecord(operation, "Camera operation");
    const parameters = projectionParameters(previous);
    let apply;
    if (operation.type === "fit") {
      rejectUnknownProperties(operation, ["type", "fit"], "camera operation");
      apply = program => program.editProjection({ target: previous.id, fit: operation.fit });
    } else if (operation.type === "resize") {
      rejectUnknownProperties(operation, ["type", "canvas", "scaling"], "camera operation");
      ownRecord(operation.canvas, "Camera resize canvas");
      rejectUnknownProperties(operation.canvas, ["width", "height", "plot"], "camera resize canvas");
      const fromViewport = resolveGraphicBounds(this);
      // Validate the operation before native layout work, including its scaling policy.
      applyGeoCamera(parameters, { type: "resize", fromViewport, toViewport: fromViewport, scaling: operation.scaling });
      apply = program => {
        const resized = program.editCanvas(operation.canvas);
        const next = applyGeoCamera(parameters, { type: "resize", fromViewport,
          toViewport: resolveGraphicBounds(resized), scaling: operation.scaling });
        return resized.editProjection({ target: previous.id, ...next });
      };
    } else {
      const next = applyGeoCamera(parameters, operation);
      apply = program => program.editProjection({ target: previous.id, ...next });
    }
    // Native aggregate preflight uses an independent immutable branch, as parameter
    // revisions do. Only the successful second branch becomes the returned trace.
    apply(this);
    return apply(this);
  });
