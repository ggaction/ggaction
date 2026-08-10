import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const summary = JSON.parse(read("benchmarks/llm-authoring-v1/summary.json"));

function sum(records, property) {
  return records.reduce((total, record) => total + record[property], 0);
}

test("keeps published MCP benchmark aggregates internally consistent", () => {
  const cells = Object.values(summary.cells);
  assert.equal(summary.status, "complete");
  assert.equal(cells.length, 12);
  assert.equal(cells.every(cell => cell.taskRuns === 48), true);
  assert.equal(sum(cells, "taskRuns"), summary.totals.taskRuns);
  assert.equal(sum(cells, "passed"), summary.totals.passed);
  assert.equal(sum(cells, "modelCalls"), summary.totals.modelCalls);
  assert.equal(sum(cells, "totalTokens"), summary.totals.usage.totalTokens);

  const conditions = Object.values(summary.byCondition);
  assert.equal(sum(conditions, "taskRuns"), summary.totals.taskRuns);
  assert.equal(sum(conditions, "passed"), summary.totals.passed);
  assert.equal(sum(conditions, "modelCalls"), summary.totals.modelCalls);
  assert.equal(sum(conditions, "totalTokens"), summary.totals.usage.totalTokens);

  const models = Object.values(summary.byModel);
  assert.equal(sum(models, "taskRuns"), summary.totals.taskRuns);
  assert.equal(sum(models, "passed"), summary.totals.passed);
  assert.equal(sum(models, "modelCalls"), summary.totals.modelCalls);
  assert.equal(sum(models, "totalTokens"), summary.totals.usage.totalTokens);
});

test("keeps the public MCP claims anchored to the benchmark record", () => {
  const docsOnly = summary.byCondition.A;
  const fallback = summary.byCondition.D;
  assert.equal(docsOnly.passed / docsOnly.taskRuns, docsOnly.passRate);
  assert.equal(fallback.passed / fallback.taskRuns, fallback.passRate);
  assert.equal(Math.round(docsOnly.passRate * 1000) / 10, 19.4);
  assert.equal(Math.round(fallback.passRate * 1000) / 10, 85.4);
  assert.equal(Math.round(docsOnly.totalTokens / docsOnly.taskRuns), 13200);
  assert.equal(Math.round(fallback.totalTokens / fallback.taskRuns), 6052);
  assert.equal(Math.round((docsOnly.modelCalls / docsOnly.taskRuns) * 100) / 100, 4.49);
  assert.equal(Math.round((fallback.modelCalls / fallback.taskRuns) * 100) / 100, 2.63);

  const readme = read("README.md");
  const docs = read("docs/mcp.md");
  const chart = read("docs/assets/images/readme-mcp-benefits.svg");
  assert.match(readme, /fixed 576-run evaluation/);
  assert.match(docs, /from 19\.4% to 85\.4%/);
  assert.match(docs, /from 13,200 to 6,052/);
  assert.match(docs, /from 4\.49 to 2\.63/);
  assert.match(chart, /576 task runs/);
});

test("keeps the raw benchmark identifiable without shipping execution traces", () => {
  assert.match(summary.provenance.rawResultSha256, /^[a-f0-9]{64}$/);
  assert.match(summary.provenance.rawCheckpointSha256, /^[a-f0-9]{64}$/);
  assert.match(summary.provenance.rawRecordCommit, /^[a-f0-9]{40}$/);
  assert.equal(JSON.stringify(summary).includes('"trace"'), false);
  assert.equal(JSON.stringify(summary).includes("IN_PROGRESS.json"), false);
});
