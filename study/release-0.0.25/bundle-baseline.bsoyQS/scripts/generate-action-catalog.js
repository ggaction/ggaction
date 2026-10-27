import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const outputPath = path.join(root, "agent_docs/contract/ACTION_CATALOG.md");

const coverageIcons = {
  complete: "✅",
  partial: "⚠️",
  missing: "❌",
  "not-applicable": "—"
};

function contractLink(contract, label) {
  if (!contract) return label;
  const relative = path
    .relative(path.dirname(outputPath), path.join(root, contract.file))
    .split(path.sep)
    .join("/");
  return `[${label}](${relative}#${contract.anchor})`;
}

export function renderActionCatalog(index) {
  const lines = [
    "# Action Contract and Coverage Catalog",
    "",
    "This compact index is generated from `ACTION_INDEX.json`. Edit the manifest and linked domain contract together, then run `npm run contracts:catalog`.",
    "",
    "Contract conventions live in [`README.md`](README.md); shared formal notation lives in [`FORMAL_TYPES.md`](FORMAL_TYPES.md).",
    "",
    "## Current direct actions",
    "",
    "| Layer | Action | Domain | Lifecycle | Audit | Coverage (contract/effects/tests) |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const action of index.actions) {
    const coverage = ["contract", "effects", "tests"]
      .map(key => coverageIcons[action.coverage[key]])
      .join(" / ");
    const label = "`" + action.name + "`";
    lines.push(
      `| ${action.layer} | ${contractLink(action.contract, label)} | ${action.domain} | ${action.lifecycle} | ${action.audit} | ${coverage} |`
    );
  }

  lines.push(
    "",
    "## Planned direct actions",
    "",
    "| Action | Readiness | Contract |",
    "| --- | --- | --- |"
  );
  for (const action of index.plannedActions) {
    const label = "`" + action.name + "`";
    lines.push(
      `| ${label} | ${action.readiness} | ${contractLink(action.contract, action.contract ? "Open" : "Pending")} |`
    );
  }

  lines.push(
    "",
    "## Planned capabilities",
    "",
    "| Kind | Capability | Readiness | Contract |",
    "| --- | --- | --- | --- |"
  );
  for (const capability of index.plannedCapabilities) {
    lines.push(
      `| ${capability.kind} | ${capability.name} | ${capability.readiness} | ${contractLink(capability.contract, "Open")} |`
    );
  }

  lines.push(
    "",
    "## Internal inventories",
    "",
    "- [Materialization and guide-component wrapped actions](internal/ACTIONS.md)",
    "",
    "Internal wrapped actions are trace-visible implementation details and are not direct public actions or primitives.",
    ""
  );
  return lines.join("\n");
}

function main() {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const output = renderActionCatalog(index);
  if (process.argv.includes("--check")) {
    const current = readFileSync(outputPath, "utf8");
    if (current !== output) {
      throw new Error("ACTION_CATALOG.md is stale. Run npm run contracts:catalog.");
    }
    return;
  }
  writeFileSync(outputPath, output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
