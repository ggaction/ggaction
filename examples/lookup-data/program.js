import { chart } from "../../src/index.js";
import { people, groups } from "./data.js";

export function createLookupExample() {
  return chart()
    .createCanvas({ width: 400, height: 280, margin: 50 })
    .createData({ id: "people", values: people })
    .createData({ id: "groups", values: groups })
    .createLookupData({ id: "ages", field: "person", lookup: { data: "people", key: "name", fields: ["age"] } })
    .createBarPlot({ x: "group", y: { field: "age", aggregate: "mean" } });
}
