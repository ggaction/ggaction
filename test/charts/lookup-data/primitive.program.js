import { chart } from "../../../src/index.js";

// Independent literal prejoined input; no lookup helper or reference-data derivation.
export function createLookupPrimitives() {
  return chart()
    .createCanvas({ width: 400, height: 280, margin: 50 })
    .createData({ id: "ages", values: [
      { person: "A", group: "First", age: 25 },
      { person: "B", group: "First", age: 32 },
      { person: "C", group: "First", age: 39 },
      { person: "D", group: "Second", age: 42 },
      { person: "E", group: "Second", age: 23 },
      { person: "F", group: "Second", age: 21 },
      { person: "G", group: "Third", age: 51 },
      { person: "H", group: "Third", age: 63 },
      { person: "I", group: "Third", age: 54 }
    ] })
    .createBarPlot({ x: "group", y: { field: "age", aggregate: "mean" } });
}
