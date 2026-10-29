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
  const yDomain = [Math.min(0, ...rows.map(row => row.value)), Math.max(1, ...rows.map(row => row.value))];
  const xScale = { id: "conditional-order", domain: [0, rows.length], nice: false, zero: false };
  const yScale = { id: "conditional-value", domain: yDomain, nice: false, zero: false };
  const atCutoff = expression(binary("eq", field("order"), parameter("cutoff")));
  const program = chart().createCanvas({ width: 600, height: 400, margin: 60 })
    .createData({ id: "observations", values: rows, keyField: "id" })
    .createParameter({ id: "cutoff", value: cutoff })
    .createScatterPlot({ id: "all", data: "observations", x: { field: "order", scale: xScale }, y: { field: "value", scale: yScale }, guides: false })
    .selectMarks({ id: "tail", target: "all", field: "order", op: "gte", value: cutoff })
    .filterData({ id: "filtered", source: "observations", where: expression(
      binary("gte", field("order"), parameter("cutoff"))) })
    .editFilteredData({ target: "filtered", where: conditionalFilterPredicate })
    .createScatterPlot({ id: "selected", data: "filtered", x: { field: "order", scale: xScale }, y: { field: "value", scale: yScale }, guides: false })
    .encodeColor({ target: "selected", conditions: [
      { when: { selection: "tail" }, value: { value: "#dc2626" } }
    ], otherwise: { value: "#2563eb" } })
    .encodeStroke({ target: "selected", conditions: [
      { when: { selection: "tail" }, value: { value: "#0f172a" } }
    ], otherwise: { value: "#94a3b8" } })
    .encodeOpacity({ target: "selected", conditions: [
      { when: expression(binary("eq", field("order"), parameter("cutoff"))), value: { value: 0 } },
      { when: expression({ type: "literal", value: true }), value: { value: 0.75 } }
    ], otherwise: { value: 1 } })
    .encodeX({ target: "selected", conditions: [
      { when: atCutoff, value: { datum: 0, scale: xScale } }
    ], otherwise: { field: "order", scale: xScale } })
    .encodeY({ target: "selected", conditions: [
      { when: { selection: "tail" }, value: { datum: 0, scale: yScale } }
    ], otherwise: { field: "value", scale: yScale } })
    .encodePointRadius({ target: "selected", conditions: [
      { when: { selection: "tail" }, value: { value: 6 } }
    ], otherwise: { value: 3 } })
    .createTextMark({ id: "labels", data: "filtered" })
    .encodeX({ target: "labels", field: "order", scale: xScale })
    .encodeY({ target: "labels", field: "value", scale: yScale })
    .encodeText({ target: "labels", conditions: [
      { when: { selection: "tail" }, value: { value: "Selected" } }
    ], otherwise: { field: "category" } })
    .encodeDx({ target: "labels", conditions: [
      { when: { selection: "tail" }, value: { value: 8 } }
    ], otherwise: { value: 0 } })
    .encodeDy({ target: "labels", conditions: [
      { when: atCutoff, value: { value: -4 } }
    ], otherwise: { value: 2 } });
  return { program, rows, cutoff, yDomain, provenance: view.provenance };
}
