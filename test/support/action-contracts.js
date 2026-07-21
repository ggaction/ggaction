import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const ACTION_CONTRACT_ROOT = path.join(
  REPOSITORY_ROOT,
  "agent_docs/contract"
);

export const ACTION_INDEX = Object.freeze(JSON.parse(readFileSync(
  path.join(ACTION_CONTRACT_ROOT, "ACTION_INDEX.json"),
  "utf8"
)));

export function contractMarkdownFiles(status) {
  if (!["current", "planned"].includes(status)) {
    throw new TypeError('Contract status must be "current" or "planned".');
  }
  return Object.freeze(readdirSync(path.join(ACTION_CONTRACT_ROOT, status))
    .filter(file => file.endsWith(".md"))
    .sort()
    .map(file => path.join(ACTION_CONTRACT_ROOT, status, file)));
}

export const CURRENT_CONTRACT_FILES = contractMarkdownFiles("current");
export const PLANNED_CONTRACT_FILES = contractMarkdownFiles("planned");

export function contractCorpus(status) {
  return contractMarkdownFiles(status)
    .map(file => readFileSync(file, "utf8"))
    .join("\n");
}

export function actionSections(source) {
  const headings = [...source.matchAll(/^## \`([A-Za-z][A-Za-z0-9]*)\`$/gm)];
  return headings.map(heading => {
    const rest = source.slice(heading.index + heading[0].length);
    const next = rest.search(/^## /m);
    return Object.freeze({
      action: heading[1],
      source: source.slice(
        heading.index,
        next < 0
          ? source.length
          : heading.index + heading[0].length + next
      )
    });
  });
}

export function owningActionSection(action) {
  const matches = CURRENT_CONTRACT_FILES.flatMap(file =>
    actionSections(readFileSync(file, "utf8"))
      .filter(section => section.action === action)
      .map(section => ({ ...section, file }))
  );
  assert.equal(matches.length, 1, `${action} must have one owning contract`);
  return Object.freeze(matches[0]);
}

export function readContractTarget(contract) {
  assert.ok(contract);
  const file = path.join(REPOSITORY_ROOT, contract.file);
  return Object.freeze({
    file,
    source: readFileSync(file, "utf8")
  });
}

export function markdownAnchors(source) {
  return Object.freeze([...source.matchAll(/^## (.+)$/gm)]
    .map(match => match[1].toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")));
}
