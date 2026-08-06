import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const actionIndexFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const metadataFile = path.join(root, "docs/_data/action_metadata.json");
const referenceLinksFile = path.join(root, "docs/_data/action_reference_links.json");
const typesFile = path.join(root, "docs/reference/types.md");

const structuredFields = Object.freeze([
  "summary",
  "useWhen",
  "avoidWhen",
  "signature",
  "requires",
  "parameters",
  "effects",
  "errors",
  "example",
  "relatedActions",
  "relatedDocs",
  "recipeClassification"
]);

async function filesBelow(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(file, predicate));
    if (entry.isFile() && predicate(file)) files.push(file);
  }
  return files.sort();
}

async function sources(files) {
  return Promise.all(files.map(async file => ({
    file: path.relative(root, file).replaceAll("\\", "/"),
    source: await readFile(file, "utf8")
  })));
}

function actionCallPattern(name) {
  return new RegExp(`(?:\\.|\\b)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`, "g");
}

function matchingFiles(items, name) {
  const pattern = actionCallPattern(name);
  return items
    .filter(item => {
      pattern.lastIndex = 0;
      return pattern.test(item.source);
    })
    .map(item => item.file);
}

function hasStructuredValue(metadata, field) {
  const value = metadata?.[field];
  if (Array.isArray(value)) return value.length > 0;
  if (value !== null && typeof value === "object") return Object.keys(value).length > 0;
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined;
}

function exactTypeSignature(types, name) {
  return new RegExp(`\\b${name}\\((?:\\)|options\\??:)`).test(types);
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function structuredCounts(actions) {
  return Object.fromEntries(structuredFields.map(field => [field, {
    present: actions.filter(action => action.structured[field] === "present").length,
    missing: actions.filter(action => action.structured[field] === "missing").length
  }]));
}

export async function buildCurrentKnowledgeInventory() {
  const [index, metadata, referenceLinks, types, exampleSources, recipeSources, documentationSources] = await Promise.all([
    readFile(actionIndexFile, "utf8").then(JSON.parse),
    readFile(metadataFile, "utf8").then(JSON.parse),
    readFile(referenceLinksFile, "utf8").then(JSON.parse),
    readFile(typesFile, "utf8"),
    filesBelow(path.join(root, "examples"), file => file.endsWith("/program.js")).then(sources),
    filesBelow(path.join(root, "docs/recipes"), file => file.endsWith(".md") && !file.endsWith("/index.md")).then(sources),
    filesBelow(path.join(root, "docs"), file => file.endsWith(".md")).then(sources)
  ]);

  const actions = index.actions
    .map(action => {
      const actionMetadata = metadata[action.name] ?? {};
      const exampleFiles = matchingFiles(exampleSources, action.name);
      const recipeFiles = matchingFiles(recipeSources, action.name);
      const documentationFiles = matchingFiles(documentationSources, action.name);
      return {
        name: action.name,
        layer: action.layer,
        domain: action.domain,
        lifecycle: action.lifecycle,
        currentMetadataFields: Object.keys(actionMetadata).sort(),
        structured: Object.fromEntries(structuredFields.map(field => [
          field,
          hasStructuredValue(actionMetadata, field) ? "present" : "missing"
        ])),
        routes: {
          currentContract: action.contract,
          publicReference: referenceLinks[action.name] ?? null,
          exactTypeSignature: exactTypeSignature(types, action.name)
        },
        examples: {
          executablePrograms: exampleFiles,
          recipePages: recipeFiles,
          documentationPages: documentationFiles
        },
        coverage: {
          executableProgram: exampleFiles.length > 0 ? "present" : "missing",
          taskRecipe: recipeFiles.length > 0 ? "present" : "missing",
          documentationMention: documentationFiles.length > 0 ? "present" : "missing"
        }
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    schemaVersion: 1,
    baseline: {
      commit: "9414d07179c9e7c6bbfdf00b762fc35de0ff25ec",
      packageVersion: "0.0.8",
      actionCount: actions.length
    },
    sources: {
      actionIndex: "agent_docs/contract/ACTION_INDEX.json",
      structuredMetadata: "docs/_data/action_metadata.json",
      publicReferenceLinks: "docs/_data/action_reference_links.json",
      exactTypes: "docs/reference/types.md",
      recipes: "docs/recipes/*.md",
      executablePrograms: "examples/*/program.js"
    },
    summary: {
      layers: countBy(actions, "layer"),
      domains: countBy(actions, "domain"),
      routes: {
        currentContract: actions.filter(action => action.routes.currentContract !== null).length,
        publicReference: actions.filter(action => action.routes.publicReference !== null).length,
        exactTypeSignature: actions.filter(action => action.routes.exactTypeSignature).length
      },
      structuredFields: structuredCounts(actions),
      executableProgramCoverage: {
        present: actions.filter(action => action.coverage.executableProgram === "present").length,
        missing: actions.filter(action => action.coverage.executableProgram === "missing").length
      },
      taskRecipeCoverage: {
        present: actions.filter(action => action.coverage.taskRecipe === "present").length,
        missing: actions.filter(action => action.coverage.taskRecipe === "missing").length
      },
      documentationMentionCoverage: {
        present: actions.filter(action => action.coverage.documentationMention === "present").length,
        missing: actions.filter(action => action.coverage.documentationMention === "missing").length
      }
    },
    actions
  };
}

export async function writeCurrentKnowledgeInventory(output) {
  const inventory = await buildCurrentKnowledgeInventory();
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`);
  return inventory;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const outputFlag = process.argv.indexOf("--output");
  const output = outputFlag === -1 ? null : process.argv[outputFlag + 1];
  if (output === null || output === undefined) {
    process.stdout.write(`${JSON.stringify(await buildCurrentKnowledgeInventory(), null, 2)}\n`);
  } else {
    const inventory = await writeCurrentKnowledgeInventory(path.resolve(output));
    process.stdout.write(`wrote ${output} for ${inventory.actions.length} actions\n`);
  }
}
