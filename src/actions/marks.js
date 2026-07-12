import { action } from "../core/action.js";
import { validateUserId } from "../core/identifiers.js";
import { getPointGraphicType } from "../core/markSchema.js";

const POINT_MARK_OPTIONS = Object.freeze(["id", "data", "shape"]);
const LINE_MARK_OPTIONS = Object.freeze(["id", "data"]);

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function resolveData(program, requested) {
  const data = Object.hasOwn(requested, "data")
    ? validateUserId(requested.data, "Dataset id")
    : program.context.currentData;

  if (data === undefined) {
    throw new Error("Mark creation requires data or a current dataset.");
  }

  const dataset = program.semanticSpec.datasets.find(item => item.id === data);

  if (dataset === undefined) {
    throw new Error(`Unknown dataset "${data}".`);
  }

  return { data, dataset };
}

function assertMarkAvailable(program, id, label) {
  if (program.semanticSpec.layers.some(layer => layer.id === id)) {
    throw new Error(`${label} "${id}" already exists.`);
  }

  if (program.graphicSpec.objects[id] !== undefined) {
    throw new Error(`Graphic "${id}" already exists.`);
  }
}

const createPointMark = action(
  {
    op: "createPointMark",
    description: "Create a semantic point mark and concrete point graphics."
  },
  function (args = {}) {
    validateOptions(args, POINT_MARK_OPTIONS, "createPointMark");
    const id = validateUserId(args.id, "Point mark id");
    const { data, dataset } = resolveData(this, args);
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    const graphicType = getPointGraphicType(shape);

    assertMarkAvailable(this, id, "Mark");

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

const createLineMark = action(
  {
    op: "createLineMark",
    description: "Create a semantic line mark and empty path collection."
  },
  function (args = {}) {
    validateOptions(args, LINE_MARK_OPTIONS, "createLineMark");
    const id = validateUserId(args.id, "Line mark id");
    const { data } = resolveData(this, args);
    assertMarkAvailable(this, id, "Mark");

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "line"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: "path",
        length: 0
      });
  }
);

export function registerMarkActions(ProgramClass) {
  ProgramClass.prototype.createPointMark = createPointMark;
  ProgramClass.prototype.createLineMark = createLineMark;
}
