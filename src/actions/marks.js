import { action } from "../core/action.js";
import { validateUserId } from "../core/identifiers.js";
import { getPointGraphicType } from "../core/markSchema.js";

const POINT_MARK_OPTIONS = Object.freeze(["id", "data", "shape"]);

function validateOptions(args) {
  for (const key of Object.keys(args)) {
    if (!POINT_MARK_OPTIONS.includes(key)) {
      throw new Error(`Unknown createPointMark option "${key}".`);
    }
  }
}

const createPointMark = action(
  {
    op: "createPointMark",
    description: "Create a semantic point mark and concrete point graphics."
  },
  function (args = {}) {
    validateOptions(args);
    const id = validateUserId(args.id, "Point mark id");
    const data = Object.hasOwn(args, "data")
      ? validateUserId(args.data, "Dataset id")
      : this.context.currentData;
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    const graphicType = getPointGraphicType(shape);

    if (data === undefined) {
      throw new Error("createPointMark requires data or a current dataset.");
    }

    const dataset = this.semanticSpec.datasets.find(item => item.id === data);

    if (dataset === undefined) {
      throw new Error(`Unknown dataset "${data}".`);
    }

    if (this.semanticSpec.layers.some(layer => layer.id === id)) {
      throw new Error(`Mark "${id}" already exists.`);
    }

    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error(`Graphic "${id}" already exists.`);
    }

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "point"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: graphicType,
        length: dataset.values.length
      });
  }
);

export function registerMarkActions(ProgramClass) {
  ProgramClass.prototype.createPointMark = createPointMark;
}
