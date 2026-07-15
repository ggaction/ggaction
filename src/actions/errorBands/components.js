import { action } from "../../core/action.js";

function positionOptions({ target, field, fieldType, coordinate, scale }) {
  return {
    target,
    field,
    fieldType,
    coordinate,
    scale: { id: scale }
  };
}

export const createErrorBandBoundary = action(
  {
    op: "createErrorBandBoundary",
    description: "Create one lower or upper error-band boundary line."
  },
  function ({
    id,
    data,
    orientation,
    bound,
    position,
    coordinate,
    intervalScale,
    positionScale,
    groupBy,
    stroke,
    strokeWidth
  } = {}) {
    let next = this.createLineMark({ id, data, strokeWidth });
    if (orientation === "vertical") {
      next = next
        .encodeY(positionOptions({
          target: id,
          field: bound,
          fieldType: "quantitative",
          coordinate,
          scale: intervalScale
        }))
        .encodeX(positionOptions({
          target: id,
          field: position.field,
          fieldType: position.fieldType,
          coordinate,
          scale: positionScale
        }));
    } else {
      next = next
        .encodeY(positionOptions({
          target: id,
          field: position.field,
          fieldType: position.fieldType,
          coordinate,
          scale: positionScale
        }))
        .encodeX(positionOptions({
          target: id,
          field: bound,
          fieldType: "quantitative",
          coordinate,
          scale: intervalScale
        }));
    }
    if (groupBy !== undefined) {
      next = next.encodeGroup({ target: id, field: groupBy });
    }
    return next
      .editGraphics({ target: id, property: "stroke", value: stroke })
      .editGraphics({ target: id, property: "opacity", value: 1 });
  }
);
