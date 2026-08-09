import path from "node:path";

import {
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../src/mcp/adapter.js";
import { evaluateFullSubmissionV2 } from "./compact-full-evaluator-v2.js";
import {
  assertSupportedStrictToolSchema
} from "./compact-paid-smoke.js";
import {
  createKnowledgeAdapterV4,
  root
} from "./compact-paid-smoke-v4.js";
import {
  loadRouteOracleV5,
  submitResultToolV5
} from "./compact-paid-smoke-v5.js";
import { runBoundedToolStateMachineV1 } from "./compact-paid-state-machine-v1.js";
import { canonicalRuntimeClosureSource } from "./compact-runtime-closure-v2.js";

export { root };

export function paidSmokeRouteV6(condition, task) {
  if (condition === "A") return Object.freeze(["search_docs", "read_doc", "submit_result"]);
  if (condition === "B" || condition === "C") {
    return Object.freeze([SEARCH_TOOL_NAME, "submit_result"]);
  }
  if (condition === "D") {
    return Object.freeze([
      SEARCH_TOOL_NAME,
      ...(task.expectedFallbacks.length > 0 ? ["read_mcp_resources"] : []),
      "submit_result"
    ]);
  }
  throw new Error(`Unknown paid smoke condition: ${condition}`);
}

function rendererWrapperInstruction(renderer) {
  if (renderer === "canvas") {
    return [
      'Evaluator wrapper contract: use import { render } from "ggaction".',
      "Use exactly export function renderChart(program, context) { render(program, context); } with the supplied context."
    ].join(" ");
  }
  if (renderer === "svg") {
    return [
      'Evaluator wrapper contract: use import { renderToSVG } from "ggaction/svg".',
      "Use exactly export function renderChart(program) { return renderToSVG(program); }."
    ].join(" ");
  }
  if (renderer === "png") {
    return [
      'Evaluator wrapper contract: use import { renderToPNG } from "ggaction/png".',
      "Use exactly export async function renderChart(program, output) { return renderToPNG(program, { output }); }.",
      "The evaluator supplies output; never use a literal or hard-coded output path."
    ].join(" ");
  }
  if (renderer === "pdf") {
    return [
      'Evaluator wrapper contract: use import { renderToPDF } from "ggaction/pdf".',
      "Use exactly export async function renderChart(program, output) { return renderToPDF(program, { output }); }.",
      "The evaluator supplies output; never use a literal or hard-coded output path."
    ].join(" ");
  }
  return "Do not invent a renderer wrapper for a non-program result.";
}

export function taskPromptV6(task, adapter) {
  return [
    "Create the requested ggaction result using only public APIs.",
    adapter.instruction,
    "For a supported chart, submit status=program, the required renderer, empty unsupported and unresolved arrays, and a complete ESM module.",
    "The module must import ggaction, export function buildChart(rows), create a 640x400 Canvas with margin 50, store rows as the source dataset, and return the final ChartProgram.",
    rendererWrapperInstruction(task.expectedRenderer),
    "The renderer wrapper above is an evaluator adapter contract; ordinary product examples may choose their own output path.",
    "For a terminal limitation, submit status=unsupported, source=null, every exact unsupported ID, and every still-open unresolved ID in packet order.",
    "When no terminal limitation exists but a decision remains open, submit status=needs-input, source=null, and every exact unresolved ID in packet order.",
    "Preserve the renderer named by the task even when the result needs input.",
    `Required evaluation renderer: ${task.expectedRenderer ?? "none (submit null)"}.`,
    "Never invent support, use extension primitives, access files or network, or include markdown fences.",
    `Task: ${task.query}`,
    `Dataset (${task.dataset.id}): ${JSON.stringify(task.dataset.values)}`
  ].join("\n");
}

function routeFailuresV6(condition, task, snapshot) {
  const failures = [];
  if (snapshot.searches !== 1) failures.push(`knowledge-search-count:${snapshot.searches}`);
  if (condition === "A") {
    if (snapshot.docsReads !== 1) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if (snapshot.toolCalls !== 2) failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
  } else if (condition === "B" || condition === "C") {
    if (snapshot.docsReads !== 0) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if (snapshot.toolCalls !== 1) failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
  } else {
    const expectedReads = task.expectedFallbacks.length;
    const expectedReadCalls = expectedReads > 0 ? 1 : 0;
    if (snapshot.docsReads !== expectedReads) {
      failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    }
    if ((snapshot.docsReadCalls ?? 0) !== expectedReadCalls) {
      failures.push(`knowledge-docs-call-count:${snapshot.docsReadCalls ?? 0}`);
    }
    if (snapshot.toolCalls !== 1 + expectedReadCalls) {
      failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
    }
  }
  return failures;
}

export async function evaluateSubmissionV6({ submission, task, artifactRoot }) {
  return evaluateFullSubmissionV2({ submission, task, artifactRoot });
}

export async function preflightPaidSmokeToolsV6() {
  for (const condition of ["A", "B", "C", "D"]) {
    const adapter = await createKnowledgeAdapterV4(condition);
    try {
      for (const tool of [...adapter.tools, submitResultToolV5]) {
        assertSupportedStrictToolSchema(tool);
      }
    } finally {
      await adapter.close();
    }
  }
}

export async function runPaidSmokeTaskV6(options) {
  return runBoundedToolStateMachineV1({
    ...options,
    route: paidSmokeRouteV6(options.condition, options.task),
    createAdapter: createKnowledgeAdapterV4,
    submitTool: submitResultToolV5,
    evaluateSubmission: evaluateSubmissionV6,
    promptBuilder: taskPromptV6,
    validateRoute: routeFailuresV6
  });
}

function canonicalSubmission(task) {
  if (task.role === "supported") {
    return {
      status: "program",
      source: canonicalRuntimeClosureSource(task),
      renderer: task.expectedRenderer,
      unsupported: [],
      unresolved: []
    };
  }
  return {
    status: task.role,
    source: null,
    renderer: task.expectedRenderer,
    unsupported: task.expectedUnsupported,
    unresolved: task.expectedUnresolved
  };
}

export async function runPaidSmokeDryRunV6({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v6-dry")
} = {}) {
  const oracle = await loadRouteOracleV5();
  await preflightPaidSmokeToolsV6();
  const checks = [];
  for (const task of oracle.tasks) {
    for (const condition of oracle.conditions.map(entry => entry.id)) {
      const adapter = await createKnowledgeAdapterV4(condition);
      try {
        const route = paidSmokeRouteV6(condition, task);
        if (condition === "A") {
          const search = JSON.parse(await adapter.handle({
            name: "search_docs",
            arguments: JSON.stringify({ query: task.query })
          }));
          if (search.length === 0) throw new Error(`${task.id}: public docs search returned no route`);
          await adapter.handle({
            name: "read_doc",
            arguments: JSON.stringify({ url: search[0].url })
          });
        } else {
          const text = await adapter.handle({
            name: SEARCH_TOOL_NAME,
            arguments: JSON.stringify({ query: task.query })
          });
          if (text !== searchGgactionText(task.query)) {
            throw new Error(`${task.id}:${condition} packet drifted`);
          }
          if (condition === "D" && task.expectedFallbacks.length > 0) {
            await adapter.handle({
              name: "read_mcp_resources",
              arguments: JSON.stringify({ uris: task.expectedFallbacks })
            });
          }
        }
        const failures = routeFailuresV6(condition, task, adapter.snapshot());
        if (failures.length > 0) throw new Error(failures.join(","));
        checks.push({
          task: task.id,
          condition,
          route,
          knowledge: adapter.snapshot()
        });
      } finally {
        await adapter.close();
      }
    }
  }
  const evaluatorChecks = [];
  for (const task of oracle.tasks) {
    const result = await evaluateSubmissionV6({
      task,
      artifactRoot: path.join(artifactRoot, task.id),
      submission: canonicalSubmission(task)
    });
    if (!result.passed) throw new Error(`${task.id}: ${result.failures.join(",")}`);
    evaluatorChecks.push({ task: task.id, passed: true });
  }
  return {
    checks: checks.length,
    evaluatorChecks: evaluatorChecks.length,
    passed: true,
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0,
    details: checks
  };
}
