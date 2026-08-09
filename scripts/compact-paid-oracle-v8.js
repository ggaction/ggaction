import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { searchGgaction } from "../knowledge/task-resolver.js";
import {
  docsFallbackResources,
  SEARCH_TOOL_NAME
} from "../src/mcp/adapter.js";
import { paidSmokeRouteV6 } from "./compact-paid-smoke-v6.js";
import { root } from "./compact-runtime-closure-v2.js";

export const paidComparisonRootV8 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-comparison-v8"
);
export const routeOracleFileV8 = path.join(paidComparisonRootV8, "ROUTE_ORACLE.json");
const finalRootV3 = path.join(root, "evaluation", "compact-authoring-final-v3");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function role(packet) {
  if (packet.unsupported.length > 0) return "unsupported";
  if (packet.unresolved.length > 0) return "needs-input";
  return "supported";
}

function packetPlan(packet) {
  return packet.actionPlan.map(entry => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    options: entry.requiredOptions
  }));
}

async function sourceTasks(oracle) {
  const [finalOracleBytes, datasetsBytes] = await Promise.all([
    readFile(path.join(finalRootV3, "ROUTE_ORACLE.json")),
    readFile(path.join(finalRootV3, "datasets.json"))
  ]);
  if (sha256(finalOracleBytes) !== oracle.sourceFinalOracleSha256) {
    throw new Error("Paid comparison v8 source final oracle drifted.");
  }
  const finalOracle = JSON.parse(finalOracleBytes);
  const datasets = JSON.parse(datasetsBytes);
  if (finalOracle.productCandidateCommit !== oracle.productCandidateCommit) {
    throw new Error("Paid comparison v8 product candidate drifted from final v3.");
  }
  const datasetById = new Map(datasets.datasets.map(dataset => [dataset.id, dataset]));
  const finalTaskById = new Map(finalOracle.tasks.map(task => [task.id, task]));
  return oracle.tasks.map(selection => {
    const task = finalTaskById.get(selection.id);
    if (!task) throw new Error(`Unknown paid comparison v8 task: ${selection.id}`);
    const dataset = datasetById.get(task.dataset);
    if (!dataset) throw new Error(`${selection.id} uses unknown dataset ${task.dataset}.`);
    if (task.role !== selection.role) throw new Error(`${selection.id} role drifted.`);
    const packet = searchGgaction(task.query);
    const expectedFallbacks = docsFallbackResources(packet).map(resource => resource.uri);
    const checks = [
      [role(packet), task.role, "role"],
      [packetPlan(packet), task.expectedPlan, "plan"],
      [packet.unsupported.map(entry => entry.constraint), task.expectedUnsupported, "unsupported"],
      [packet.unresolved.map(entry => entry.constraint), task.expectedUnresolved, "unresolved"],
      [expectedFallbacks, task.expectedFallbacks, "fallback resources"]
    ];
    for (const [actual, expected, label] of checks) {
      if (!same(actual, expected)) {
        throw new Error(`${selection.id} v8 ${label} drifted: ${JSON.stringify(actual)}`);
      }
    }
    const expectedDRoute = [
      SEARCH_TOOL_NAME,
      ...(expectedFallbacks.length > 0 ? ["read_mcp_resources"] : []),
      "submit_result"
    ];
    if (!same(expectedDRoute, selection.expectedDRoute)) {
      throw new Error(`${selection.id} v8 D route drifted.`);
    }
    return Object.freeze({ ...task, dataset, expectedDRoute: selection.expectedDRoute });
  });
}

export async function loadRouteOracleV8() {
  const bytes = await readFile(routeOracleFileV8);
  const oracle = JSON.parse(bytes);
  if (
    oracle.schemaVersion !== 1 ||
    oracle.id !== "compact-authoring-paid-comparison-route-oracle-v8" ||
    oracle.sourceFinalCorpus !== "compact-authoring-final-v3" ||
    oracle.packetSchemaVersion !== 3 ||
    oracle.tasks.length !== 16 ||
    oracle.conditions.length !== 4 ||
    new Set(oracle.tasks.map(task => task.id)).size !== 16
  ) {
    throw new Error("Paid comparison v8 route oracle identity is invalid.");
  }
  const tasks = await sourceTasks(oracle);
  return Object.freeze({
    ...oracle,
    tasks: Object.freeze(tasks),
    oracleSha256: sha256(bytes)
  });
}

export function dualModelRunOrderV8(
  tasks,
  modelIds = ["gpt-5.6-terra", "gpt-5.6-luna"],
  conditionIds = ["A", "B", "C", "D"],
  repetitions = 2
) {
  if (
    modelIds.length !== 2 ||
    conditionIds.length !== 4 ||
    new Set(modelIds).size !== 2 ||
    new Set(conditionIds).size !== 4 ||
    !Number.isInteger(repetitions) ||
    repetitions < 1 ||
    !tasks.every(task => typeof task?.id === "string" && task.id.length > 0)
  ) {
    throw new Error("Paid comparison v8 requires two models, four conditions, tasks, and repetitions.");
  }
  const cells = modelIds.flatMap(model => conditionIds.map(condition => ({ model, condition })));
  const order = [];
  let blockIndex = 0;
  for (const task of tasks) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (let position = 0; position < cells.length; position += 1) {
        const cell = cells[(blockIndex + position) % cells.length];
        order.push(`${task.id}:r${repetition}:${cell.model}:${cell.condition}`);
      }
      blockIndex += 1;
    }
  }
  return order;
}

export function parseDualModelRunV8(run) {
  const match = /^(.+):r([1-9][0-9]*):(gpt-[^:]+):([A-D])$/u.exec(run);
  if (!match) throw new Error(`Invalid paid comparison v8 run: ${run}`);
  return {
    taskId: match[1],
    repetition: Number(match[2]),
    model: match[3],
    condition: match[4]
  };
}

export function modelCallEnvelopeV8(tasks, modelIds, conditionIds, repetitions, submissions) {
  let expectedPerModelRepetition = 0;
  let maximumPerModelRepetition = 0;
  for (const task of tasks) {
    for (const condition of conditionIds) {
      const route = paidSmokeRouteV6(condition, task);
      expectedPerModelRepetition += route.length;
      maximumPerModelRepetition += route.length - 1 + submissions;
    }
  }
  const multiplier = modelIds.length * repetitions;
  return {
    expected: expectedPerModelRepetition * multiplier,
    maximum: maximumPerModelRepetition * multiplier,
    expectedPerModelRepetition,
    maximumPerModelRepetition
  };
}
