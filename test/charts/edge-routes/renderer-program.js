import { readFileSync } from "node:fs";
import { createEdgeRoutes } from "../../../examples/edge-routes/program.js";
import { deserializeProgram } from "../../../src/persistence.js";

// This is the canonical Node 22.23.1 public output paired with the fixed
// primitive coordinates. Loading it tests renderer/codec portability without
// asserting that transcendental solver arithmetic is bit-identical in engines.
// Fresh density computation is tested separately against numeric oracles and
// source, endpoint, iteration, order and immutable-replay invariants.
export function createEdgeRouteRendererProgram(method) {
  return method === "density"
    ? deserializeProgram(readFileSync(new URL("./density.public.json", import.meta.url), "utf8"))
    : createEdgeRoutes(method);
}
