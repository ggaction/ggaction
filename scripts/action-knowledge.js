import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { declaredActionSignatures } from "./generate-doc-signatures.js";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const actionSourceRoot = path.join(root, "knowledge/actions");
export const actionIndexFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
export const referenceLinksFile = path.join(root, "docs/_data/action_reference_links.json");
const actionKeys = [
  "name", "summary", "useWhen", "avoidWhen", "requiredState", "parameterNotes", "effects", "composition",
  "commonErrors", "example", "relatedActions", "recipeIds", "docs"
];

let focusedExamplesPromise;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sameKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function headingIds(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => {
    const explicit = match[1].match(/\{#([A-Za-z][A-Za-z0-9_-]*)\}\s*$/)?.[1];
    if (explicit !== undefined) return explicit;
    return match[1].replace(/`/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  }));
}

async function declarationSources() {
  const directory = path.join(root, "types");
  const files = (await readdir(directory, { recursive: true }))
    .filter(file => file.endsWith(".d.ts"))
    .sort();
  return Promise.all(files.map(async file => ({ file, source: await readFile(path.join(directory, file), "utf8") })));
}

function balancedBody(source, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return undefined;
}

function topLevelProperties(body) {
  const properties = [];
  let start = 0;
  let braces = 0;
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === "{") braces += 1;
    else if (character === "}") braces -= 1;
    else if (character === "(") parentheses += 1;
    else if (character === ")") parentheses -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (character === ";" && braces === 0 && parentheses === 0 && brackets === 0) {
      const member = body.slice(start, index).trim();
      const name = member.match(/^(?:readonly\s+)?([A-Za-z][A-Za-z0-9]*)\??\s*:/)?.[1];
      if (name) properties.push(name);
      start = index + 1;
    }
  }
  return properties;
}

function typeDefinition(sources, name) {
  for (const { source } of sources) {
    const declaration = new RegExp(`(?:export\\s+)?(?:interface|type)\\s+${name}\\b`).exec(source);
    if (!declaration) continue;
    const open = source.indexOf("{", declaration.index);
    if (open === -1) continue;
    const body = balancedBody(source, open);
    if (body !== undefined) return body;
  }
  return undefined;
}

export async function actionSignaturesAndOptions() {
  const [signatures, sources] = await Promise.all([declaredActionSignatures(), declarationSources()]);
  const result = new Map();
  for (const signature of signatures) {
    const name = signature.match(/^([A-Za-z][A-Za-z0-9]*)\(/)?.[1];
    const parameter = signature.slice(signature.indexOf("(") + 1, signature.lastIndexOf("): ChartProgram;"));
    const inlineBodies = [];
    for (let index = 0; index < parameter.length; index += 1) {
      if (parameter[index] !== "{") continue;
      const body = balancedBody(parameter, index);
      if (body !== undefined) inlineBodies.push(body);
    }
    const names = new Set(inlineBodies.flatMap(topLevelProperties));
    for (const typeName of parameter.match(/\b[A-Z][A-Za-z0-9]*(?:Options|Config)\b/g) ?? []) {
      const body = typeDefinition(sources, typeName);
      if (body) topLevelProperties(body).forEach(property => names.add(property));
    }
    result.set(name, { signature, optionPaths: [...names] });
  }
  return result;
}

async function actionSources() {
  const files = (await readdir(actionSourceRoot)).filter(file => file.endsWith(".json")).sort();
  return Promise.all(files.map(async file => ({
    file,
    source: await readFile(path.join(actionSourceRoot, file), "utf8")
  })));
}

function informativeSummary(action) {
  const words = action.summary.replace(/`[^`]+`/g, " ").match(/[A-Za-z][A-Za-z-]*/g) ?? [];
  assert(words.length >= 7, `${action.name}: summary must contain at least seven words`);
  assert(!new RegExp(`^${action.name}\\b`, "i").test(action.summary), `${action.name}: summary only restates its name`);
}

function normalizedProse(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function validateSentenceList(action, field, values, { required = false } = {}) {
  assert(Array.isArray(values), `${action.name}: ${field} must be an array`);
  if (required) assert(values.length > 0, `${action.name}: ${field} must not be empty`);
  assert(new Set(values).size === values.length, `${action.name}: ${field} entries must be unique`);
  for (const value of values) {
    assert(typeof value === "string" && value.length >= 20, `${action.name}: ${field} entries must be informative sentences`);
  }
}

function validateNarrative(action) {
  validateSentenceList(action, "useWhen", action.useWhen, { required: true });
  validateSentenceList(action, "avoidWhen", action.avoidWhen, { required: true });
  validateSentenceList(action, "requiredState", action.requiredState);
  validateSentenceList(action, "effects.semantic", action.effects.semantic);
  validateSentenceList(action, "effects.graphic", action.effects.graphic);
  validateSentenceList(action, "composition.notes", action.composition.notes);
  const summary = normalizedProse(action.summary);
  for (const field of ["useWhen", "avoidWhen"]) {
    const guidance = normalizedProse(action[field].join(" "));
    assert(!guidance.includes(summary), `${action.name}: ${field} must add decision guidance beyond the summary`);
  }
  assert(action.commonErrors.length > 0, `${action.name}: commonErrors must not be empty`);
  for (const entry of action.commonErrors) {
    assert(entry.problem.length >= 20 && entry.fix.length >= 20, `${action.name}: commonErrors must explain both problem and fix`);
  }
}

async function validateDocs(action) {
  for (const entry of action.docs) {
    const file = path.join(root, entry.path);
    await access(file);
    if (entry.anchor) {
      assert(headingIds(await readFile(file, "utf8")).has(entry.anchor), `${action.name}: missing docs anchor ${entry.path}#${entry.anchor}`);
    }
  }
}

async function validateExample(action) {
  if (action.example.kind === "not-applicable") {
    assert(action.example.reason.length >= 20, `${action.name}: example exception needs a concrete reason`);
    return "not-applicable";
  }
  const file = path.join(root, action.example.path);
  await access(file);
  const source = await readFile(file, "utf8");
  const exports = new Set([
    ...[...source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)].map(match => match[1]),
    ...[...source.matchAll(/export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)].map(match => match[1])
  ]);
  assert(exports.has(action.example.export), `${action.name}: missing export ${action.example.export} in ${action.example.path}`);
  if (action.example.export === "actionExamples") {
    focusedExamplesPromise ??= import(pathToFileURL(file).href).then(module => module.actionExamples);
    const examples = await focusedExamplesPromise;
    assert(typeof examples?.[action.name] === "function", `${action.name}: focused example builder is missing`);
    const program = examples[action.name]();
    assert(program?.semanticSpec && program?.graphicSpec && program?.trace, `${action.name}: focused example must return a ChartProgram`);
    const includesAction = node => node?.op === action.name ||
      (node?.children ?? []).some(includesAction);
    assert(includesAction(program.trace), `${action.name}: focused example trace does not include the action`);
  } else {
    assert(source.includes(`.${action.name}(`), `${action.name}: canonical example does not call the action`);
  }
  return action.example.path.startsWith("examples/") ? "canonical" : "focused";
}

export async function buildActionKnowledge() {
  const [indexSource, referenceSource, sources, signatureMap] = await Promise.all([
    readFile(actionIndexFile, "utf8"),
    readFile(referenceLinksFile, "utf8"),
    actionSources(),
    actionSignaturesAndOptions()
  ]);
  const index = JSON.parse(indexSource);
  const references = JSON.parse(referenceSource);
  const exact = new Map(index.actions.map(action => [action.name, action]));
  const records = [];
  const names = new Set();
  const summaries = new Set();
  const exampleCoverage = { canonical: 0, focused: 0, "not-applicable": 0 };

  for (const { file, source } of sources) {
    const document = JSON.parse(source);
    assert(document.schemaVersion === 1, `${file}: schemaVersion must be 1`);
    assert(document.domain === file.replace(/\.json$/, ""), `${file}: domain must match its filename`);
    assert(Array.isArray(document.actions) && document.actions.length > 0, `${file}: actions must not be empty`);
    for (const action of document.actions) {
      assert(sameKeys(action, actionKeys), `${action.name}: action source fields do not match schema`);
      assert(!names.has(action.name), `${action.name}: duplicate action source`);
      names.add(action.name);
      const contract = exact.get(action.name);
      assert(contract, `${action.name}: not present in ACTION_INDEX`);
      assert(contract.domain === document.domain, `${action.name}: source domain does not match ACTION_INDEX`);
      informativeSummary(action);
      validateNarrative(action);
      const normalizedSummary = action.summary.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      assert(!summaries.has(normalizedSummary), `${action.name}: duplicate summary`);
      summaries.add(normalizedSummary);
      const signature = signatureMap.get(action.name);
      assert(signature, `${action.name}: missing exact public signature`);
      for (const note of action.parameterNotes) {
        assert(signature.optionPaths.includes(note.path), `${action.name}: stale parameter note path ${note.path}`);
      }
      for (const related of [
        ...action.relatedActions,
        ...action.composition.before,
        ...action.composition.after
      ]) {
        assert(exact.has(related), `${action.name}: unknown related action ${related}`);
        assert(related !== action.name, `${action.name}: cannot relate to itself`);
      }
      assert(Array.isArray(action.recipeIds), `${action.name}: recipeIds must be an array`);
      assert(new Set(action.recipeIds).size === action.recipeIds.length, `${action.name}: recipeIds must be unique`);
      for (const recipeId of action.recipeIds) {
        assert(/^[a-z][a-z0-9-]*$/.test(recipeId), `${action.name}: invalid recipe ID ${recipeId}`);
      }
      await validateDocs(action);
      exampleCoverage[await validateExample(action)] += 1;
      records.push({
        name: action.name,
        layer: contract.layer,
        domain: contract.domain,
        lifecycle: contract.lifecycle,
        signature: signature.signature,
        contract: contract.contract,
        publicReference: references[action.name],
        summary: action.summary,
        useWhen: action.useWhen,
        avoidWhen: action.avoidWhen,
        requiredState: action.requiredState,
        parameterNotes: action.parameterNotes,
        effects: action.effects,
        composition: action.composition,
        commonErrors: action.commonErrors,
        example: action.example,
        relatedActions: action.relatedActions,
        recipeIds: action.recipeIds,
        docs: action.docs
      });
    }
  }
  const expectedNames = [...exact.keys()].sort();
  assert(JSON.stringify([...names].sort()) === JSON.stringify(expectedNames), "Action knowledge must cover every ACTION_INDEX action exactly once");
  const focusedNames = records
    .filter(record => record.example.export === "actionExamples")
    .map(record => record.name)
    .sort();
  if (focusedNames.length > 0) {
    const examples = await focusedExamplesPromise;
    assert(
      JSON.stringify(Object.keys(examples).sort()) === JSON.stringify(focusedNames),
      "Focused action example registry must match focused metadata exactly"
    );
  }
  records.sort((left, right) => left.name.localeCompare(right.name));
  const sourceHash = sha256(sources.map(entry => entry.source).join("\n"));
  return {
    document: {
      schemaVersion: 1,
      generated: {
        actionCount: records.length,
        actionIndexSha256: sha256(indexSource),
        actionSourceSha256: sourceHash,
        signatureSha256: sha256(records.map(record => record.signature).join("\n"))
      },
      actions: records,
      recipes: []
    },
    report: {
      actions: records.length,
      domains: sources.length,
      parameterNotes: records.reduce((sum, record) => sum + record.parameterNotes.length, 0),
      exampleCoverage
    }
  };
}
