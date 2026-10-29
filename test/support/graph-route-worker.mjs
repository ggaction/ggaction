import { parentPort } from "node:worker_threads";
import { computeGraphEdgeRoutes } from "../../src/graph.js";

parentPort.on("message", ({ job }) => parentPort.postMessage(computeGraphEdgeRoutes(job)));
