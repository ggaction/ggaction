import { computeGraphEdgeRoutes } from "../../src/graph.js";

self.addEventListener("message", ({ data: { job } }) => self.postMessage(computeGraphEdgeRoutes(job)));
