import { chart } from "../../../src/index.js";
import { realisticRecordView } from "./realistic-data.js";

export const CONDITIONAL_WITNESS_DATASETS = Object.freeze([
  "tt-penguins", "tt-london-marathon-winners", "tt-astronauts",
  "tt-us-births", "tt-chocolate-ratings"
]);
const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
export const conditionalFilterPredicate = expression(
  binary("lte", field("order"), parameter("cutoff"))
);

export function buildConditionalLifecycleWitness(dataset) {
  const view = realisticRecordView(dataset, {
    includeSecondaryMeasure: true, deriveSubgroup: true, rowLimit: 48, groupLimit: 8
  });
  const rows = view.rows.map((row, index) => ({
    id: row.key, sourceRowIndex: row.sourceRowIndex, category: String(row.category),
    order: index + 1, value: row.value
  }));
  const cutoff = Math.ceil(rows.length / 2);
  const program = chart().createCanvas({ width: 600, height: 400, margin: 60 })
    .createData({ id: "observations", values: rows, keyField: "id" })
    .createParameter({ id: "cutoff", value: cutoff })
    .createScatterPlot({ id: "all", data: "observations", x: "order", y: "value", guides: false })
    .selectMarks({ id: "tail", target: "all", field: "order", op: "gte", value: cutoff })
    .filterData({ id: "filtered", source: "observations", where: expression(
      binary("gte", field("order"), parameter("cutoff"))) })
    .editFilteredData({ target: "filtered", where: conditionalFilterPredicate })
    .createScatterPlot({ id: "selected", data: "filtered", x: "order", y: "value", guides: false })
    .encodeColor({ target: "selected", conditions: [
      { when: { selection: "tail" }, value: { value: "#dc2626" } }
    ], otherwise: { value: "#2563eb" } })
    .encodeStroke({ target: "selected", conditions: [
      { when: { selection: "tail" }, value: { value: "#0f172a" } }
    ], otherwise: { value: "#94a3b8" } })
    .encodeOpacity({ target: "selected", conditions: [
      { when: expression(binary("eq", field("order"), parameter("cutoff"))), value: { value: 0 } },
      { when: expression({ type: "literal", value: true }), value: { value: 0.75 } }
    ], otherwise: { value: 1 } });
  return { program, rows, cutoff, provenance: view.provenance };
}
