import { batchGraphicRow, batchGraphicRowCount, batchGraphicRowKey, batchGraphicRowType, isBatchGraphicType } from "./batchGraphic.js";
import { walkGraphicTreeEvents } from "./graphicTree.js";
import { validateConcreteGraphicProperties } from "./concreteGraphic.js";

// Embedded sources have no independent named registry identity. The exact source
// object is their preparation key, disjoint from every user-authored string ID.
export function visitGraphicSources(id, object, type, visit) {
  if (isBatchGraphicType(type)) {
    validateConcreteGraphicProperties(type, object.properties);
    const rowType = batchGraphicRowType(type);
    for (let index = 0; index < batchGraphicRowCount(type, object.properties); index++) {
      visit(batchGraphicRowKey(object, index), { type: rowType, properties: batchGraphicRow(type, object.properties, index) }, rowType);
    }
    return;
  }
  if (type !== "weighted-blend") { visit(id, object, type); return; }
  validateConcreteGraphicProperties(type, object.properties);
  for (const source of object.properties.sources) visit(source, source, source.type);
}

export function walkGraphicSources(graphicSpec, visit) {
  walkGraphicTreeEvents(graphicSpec, {
    enter({ id, object }) { if (!object.items) visitGraphicSources(id, object, object.type, visit); },
    item({ id, object, owner }) { visitGraphicSources(id, object, object.type ?? owner.type, visit); }
  });
}
