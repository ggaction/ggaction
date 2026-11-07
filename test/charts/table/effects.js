import { createTable } from "../../../examples/table/program.js";
import { createTablePrimitive } from "./primitive.program.js";

export const cellEffects = Object.freeze({ outline: { color: "#334155", width: 2 },
  shadow: { color: "#00000080", offsetX: 2, offsetY: 2, blurRadius: 1 } });

export function tableEffectPair() {
  let primitive = createTablePrimitive();
  for (const id of primitive.graphicSpec.objects.table.children) {
    const items = primitive.graphicSpec.objects[id].items.map(({ type, properties }, index) => ({ type, properties: index === 0 ? { ...properties, ...cellEffects } : properties }));
    primitive = primitive.editGraphics({ target: id, property: "items", value: items });
  }
  return [primitive, createTable().editTablePlot({ cells: cellEffects })];
}
