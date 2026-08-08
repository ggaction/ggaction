import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateSplit,
  corpusConfig,
  SPLITS,
  writeEvaluationResult
} from "./compact-evaluation.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const split = argument("--split");
const corpus = argument("--corpus") ?? "original";
const evaluationRoot = corpusConfig(corpus).directory;
if (!SPLITS.includes(split)) {
  throw new Error(`Use --split with one of: ${SPLITS.join(", ")}.`);
}

let candidateCommit;
if (split !== "development") {
  const lock = JSON.parse(await readFile(path.join(evaluationRoot, "CANDIDATE.json"), "utf8"));
  candidateCommit = lock.candidateCommit;
  const current = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: path.dirname(evaluationRoot),
    encoding: "utf8"
  }).trim();
  if (current !== candidateCommit) {
    throw new Error(`Candidate lock is ${candidateCommit}, but current HEAD is ${current}.`);
  }
  if (split === "held-out") {
    const validation = JSON.parse(await readFile(
      path.join(evaluationRoot, "results", "validation.json"),
      "utf8"
    ));
    if (!validation.passed || validation.candidateCommit !== candidateCommit) {
      throw new Error("Held-out evaluation requires a passing validation result for the locked candidate.");
    }
  }
}

const result = await evaluateSplit(split, { candidateCommit, corpus });
if (process.argv.includes("--record")) await writeEvaluationResult(result);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exitCode = 1;
