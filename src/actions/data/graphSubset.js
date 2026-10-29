import { deriveGraphSubsetRows } from "../../grammar/graph/subset.js";
import { derivedMaterializer } from "./shared.js";

export const materializeGraphSubsetData = /* @__PURE__ */ derivedMaterializer(
  "materializeGraphSubsetData", "Materialize exact selected graph source identities.",
  "graphSubset", deriveGraphSubsetRows
);
