import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

export function assertArchivedEvaluationExecution(candidateCommit, { cwd = root } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(candidateCommit)) throw new TypeError("Archived evaluation candidate must be an exact Git SHA.");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
  if (head !== candidateCommit) {
    throw new Error(
      `Archived paid evaluation ${candidateCommit.slice(0, 8)} cannot run at current HEAD. Use the current paired pilot gate.`
    );
  }
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd, encoding: "utf8" }).trim();
  if (status !== "") throw new Error("Archived paid evaluation requires a clean candidate checkout.");
  return true;
}
