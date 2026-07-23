import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const declarationFile = fileURLToPath(
  new URL("../types/program.d.ts", import.meta.url)
);
const referenceFile = fileURLToPath(
  new URL("../docs/reference/types.md", import.meta.url)
);
const runtimeReferenceFile = fileURLToPath(
  new URL("../docs/reference/runtime.md", import.meta.url)
);
const begin = "<!-- BEGIN GENERATED TYPESCRIPT SIGNATURES -->";
const end = "<!-- END GENERATED TYPESCRIPT SIGNATURES -->";
const runtimeBegin = "<!-- BEGIN GENERATED RUNTIME SIGNATURES -->";
const runtimeEnd = "<!-- END GENERATED RUNTIME SIGNATURES -->";

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

async function declaration(relative) {
  return readFile(fileURLToPath(new URL(`../types/${relative}`, import.meta.url)), "utf8");
}

function functionsFrom(source, first) {
  const start = source.indexOf(first);
  if (start === -1) throw new Error(`Declaration block was not found: ${first}`);
  return source.slice(start).trim();
}

function exportedDeclarations(source) {
  return source
    .replace(/^import type .+\n\n/, "")
    .trim();
}

export async function buildRuntimeSignatureSection() {
  const [main, basic, svg, png, pdf] = await Promise.all([
    declaration("index.d.ts"),
    declaration("basic.d.ts"),
    declaration("svg.d.ts"),
    declaration("png.d.ts"),
    declaration("pdf.d.ts")
  ]);
  const entries = [
    ["ggaction", functionsFrom(main, "export function chart()")],
    ["ggaction/basic", functionsFrom(basic, "export function chart()")],
    ["ggaction/svg", exportedDeclarations(svg)],
    ["ggaction/png", exportedDeclarations(png)],
    ["ggaction/pdf", exportedDeclarations(pdf)]
  ];
  return [
    runtimeBegin,
    "### Exact TypeScript signatures",
    "",
    "These blocks are generated from the declaration file owned by each package entry.",
    "",
    ...entries.flatMap(([name, source]) => [
      `#### \`${name}\``,
      "",
      "```typescript",
      source,
      "```",
      ""
    ]),
    runtimeEnd
  ].join("\n");
}

function replaceGeneratedSection(reference, expected, startMarker, endMarker, label) {
  const start = reference.indexOf(startMarker);
  const finish = reference.indexOf(endMarker);
  if (start === -1 || finish === -1 || finish < start) {
    throw new Error(`${label} signature markers are missing or invalid.`);
  }
  return {
    current: reference.slice(start, finish + endMarker.length),
    next: `${reference.slice(0, start)}${expected}${reference.slice(finish + endMarker.length)}`
  };
}

export async function updateSignatureSection({ check = false } = {}) {
  const [reference, runtimeReference, expected, expectedRuntime] = await Promise.all([
    readFile(referenceFile, "utf8"),
    readFile(runtimeReferenceFile, "utf8"),
    buildSignatureSection(),
    buildRuntimeSignatureSection()
  ]);
  const actionSection = replaceGeneratedSection(
    reference,
    expected,
    begin,
    end,
    "Action reference"
  );
  const runtimeSection = replaceGeneratedSection(
    runtimeReference,
    expectedRuntime,
    runtimeBegin,
    runtimeEnd,
    "Runtime reference"
  );
  if (check) {
    if (actionSection.current !== expected || runtimeSection.current !== expectedRuntime) {
      throw new Error("Generated TypeScript signatures are stale. Run npm run docs:signatures.");
    }
    return;
  }
  await Promise.all([
    writeFile(referenceFile, actionSection.next),
    writeFile(runtimeReferenceFile, runtimeSection.next)
  ]);
  process.stdout.write("generated action and runtime reference TypeScript signatures\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await updateSignatureSection({ check: process.argv.includes("--check") });
}
