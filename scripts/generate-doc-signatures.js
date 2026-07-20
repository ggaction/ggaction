import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const declarationFile = fileURLToPath(
  new URL("../types/program.d.ts", import.meta.url)
);
const referenceFile = fileURLToPath(
  new URL("../docs/reference/types.md", import.meta.url)
);
const begin = "<!-- BEGIN GENERATED TYPESCRIPT SIGNATURES -->";
const end = "<!-- END GENERATED TYPESCRIPT SIGNATURES -->";

export async function declaredActionSignatures() {
  const sourceText = await readFile(declarationFile, "utf8");
  const classStart = sourceText.indexOf("export class ChartProgram {");
  if (classStart === -1) throw new Error("ChartProgram declaration was not found.");
  const classBody = sourceText.slice(classStart);
  return [...classBody.matchAll(
    /^\s{2}([A-Za-z][A-Za-z0-9]*)\(([\s\S]*?)\): ChartProgram;$/gm
  )].map(match => match[0].trim().replace(/\s+/g, " "));
}

export async function buildSignatureSection() {
  const signatures = await declaredActionSignatures();
  return [
    begin,
    "## Exact TypeScript signatures",
    "",
    "This generated block is the exact callable contract from `types/program.d.ts`.",
    "The action entries below provide the readable form, behavior, defaults, and routes.",
    "",
    "```typescript",
    "interface ChartProgramActions {",
    ...signatures.map(signature => `  ${signature}`),
    "}",
    "```",
    end
  ].join("\n");
}

export async function updateSignatureSection({ check = false } = {}) {
  const reference = await readFile(referenceFile, "utf8");
  const start = reference.indexOf(begin);
  const finish = reference.indexOf(end);
  if (start === -1 || finish === -1 || finish < start) {
    throw new Error("Action reference signature markers are missing or invalid.");
  }
  const expected = await buildSignatureSection();
  const current = reference.slice(start, finish + end.length);
  if (check) {
    if (current !== expected) {
      throw new Error("Generated TypeScript signatures are stale. Run npm run docs:signatures.");
    }
    return;
  }
  const next = `${reference.slice(0, start)}${expected}${reference.slice(finish + end.length)}`;
  await writeFile(referenceFile, next);
  process.stdout.write("generated action reference TypeScript signatures\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await updateSignatureSection({ check: process.argv.includes("--check") });
}
