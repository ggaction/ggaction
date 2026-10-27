import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { requireLayer } from "../../selectors/layers.js";
import { requireSemanticScale } from "../../selectors/scales.js";

const EDITABLE = Object.freeze([
  "domain", "reverse", "padding", "paddingInner", "paddingOuter", "align"
]);

function createOffsetScaleEditor(channel) {
  const operation = channel === "xOffset"
    ? "editXOffsetScale"
    : "editYOffsetScale";
  return action(
    {
      op: operation,
      description: `Edit the nested ${channel} scale for one mark.`
    },
    function (args = {}) {
      validateOptionObject(args, ["target", ...EDITABLE], operation);
      const target = validateUserId(args.target, `${operation} target`);
      if (!EDITABLE.some(property => Object.hasOwn(args, property))) {
        throw new Error(`${operation} requires at least one editable property.`);
      }
      const layer = requireLayer(this, target, `${operation} target "${target}"`);
      const scaleId = layer.encoding?.[channel]?.scale;
      if (typeof scaleId !== "string") {
        throw new Error(
          `${operation} target "${target}" has no ${channel} scale.`
        );
      }
      requireSemanticScale(this, scaleId);
      const patch = Object.fromEntries(Object.entries(args).filter(
        ([property]) => property !== "target"
      ));
      return this.editScale({ id: scaleId, ...patch });
    }
  );
}

export const editXOffsetScale = /* @__PURE__ */ createOffsetScaleEditor("xOffset");
export const editYOffsetScale = /* @__PURE__ */ createOffsetScaleEditor("yOffset");

export function registerOffsetScaleActions(ProgramClass) {
  ProgramClass.prototype.editXOffsetScale = editXOffsetScale;
  ProgramClass.prototype.editYOffsetScale = editYOffsetScale;
}
