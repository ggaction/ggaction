import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  API,
  SignatureKind,
  SymbolFlags
} from "typescript/unstable/sync";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const declarationFile = path.join(root, "types/program.d.ts");
const intentFile = path.join(root, "knowledge/action-intents.json");
const referenceSourceFile = path.join(root, "docs/_sources/action-reference.md");
const routeFile = path.join(root, "docs/_data/action_reference_links.json");
const packageFile = path.join(root, "package.json");

const operationPrefixes = Object.freeze([
  "create",
  "bind",
  "apply",
  "edit",
  "encode",
  "remove",
  "filter",
  "select",
  "highlight",
  "layout",
  "jitter",
  "pack",
  "order",
  "replace"
]);

const idOptionNames = new Set([
  "id",
  "target",
  "data",
  "source",
  "coordinate",
  "scale",
  "xScale",
  "yScale",
  "selection",
  "parent",
  "before",
  "after"
]);

const selectorOnlyOptions = new Set([
  "id",
  "target",
  "data",
  "source",
  "coordinate",
  "scale",
  "xScale",
  "yScale",
  "selection",
  "parent",
  "before",
  "after"
]);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function operationAndSubject(name) {
  if (name === "facet") return { operation: "compose", subject: "facet" };
  if (name === "fitCanvas") return { operation: "layout", subject: "Canvas" };
  const operation = operationPrefixes.find(prefix => name.startsWith(prefix));
  if (!operation) throw new Error(`Compact card operation is missing for ${name}.`);
  return { operation, subject: name.slice(operation.length) };
}

function humanize(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/\bX2\b/g, "x2")
    .replace(/\bY2\b/g, "y2")
    .replace(/\bX\b/g, "x")
    .replace(/\bY\b/g, "y")
    .replace(/\bR\b/g, "radial")
    .toLowerCase();
}

function aliasesForSubject(intentSource, subject) {
  const aliases = intentSource.termAliases[subject];
  if (!aliases) throw new Error(`Human-owned intent term is missing for ${subject}.`);
  return aliases;
}

function cleanMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(value) {
  const cleaned = cleanMarkdown(value);
  const sentence = cleaned.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence ?? cleaned;
}

function summariesFromReference(source, actionNames) {
  const starts = [...source.matchAll(/^###\s+(.+)$/gm)];
  const summaries = new Map();
  for (let index = 0; index < starts.length; index += 1) {
    const heading = starts[index][1];
    const block = source.slice(starts[index].index, starts[index + 1]?.index ?? source.length);
    const code = block.match(/```(?:javascript|typescript)\n[\s\S]*?```/);
    if (!code) continue;
    const names = [...block.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*\(/g)]
      .map(match => match[1])
      .filter(name => actionNames.has(name));
    const prose = block.slice((code.index ?? 0) + code[0].length).trim();
    const paragraph = prose.split(/\n\s*\n/)[0] ?? "";
    for (const name of names) {
      if (heading.includes(name) && paragraph.length > 0) {
        summaries.set(name, firstSentence(paragraph));
      }
    }
  }
  return summaries;
}

function generatedSummary(action, intentSource) {
  const { operation, subject } = operationAndSubject(action.name);
  const aliases = aliasesForSubject(intentSource, subject);
  const resource = aliases[0];
  const purpose = aliases[1] ?? intentSource.domainIntents[action.domain][0];
  switch (operation) {
    case "create": return `Creates ${resource} for ${purpose}.`;
    case "bind": return `Binds ${resource} and rematerializes every compatible consumer.`;
    case "apply": return `Applies ${resource} defaults to existing and later chart resources.`;
    case "edit": return `Edits ${resource}, including settings for ${purpose}.`;
    case "encode": return `Maps data or a constant to ${resource} for ${purpose}.`;
    case "remove": return `Removes ${resource} while preserving unrelated chart resources.`;
    case "filter": return `Retains matching ${resource} using an explicit selector or filter condition.`;
    case "select": return `Stores a reusable selection of ${resource} without changing graphics.`;
    case "highlight": return `Emphasizes selected ${resource} and can dim the remaining items.`;
    case "layout": return `Lays out ${resource} for ${purpose}.`;
    case "jitter": return `Offsets ${resource} to reduce overplotting while preserving data values.`;
    case "pack": return `Packs ${resource} deterministically to avoid glyph overlap while preserving data values.`;
    case "order": return `Sets a deterministic order for ${resource}.`;
    case "replace": return `Replaces ${resource} while preserving its composition slot and order.`;
    case "compose": return `Repeats a complete chart by a field to create ${purpose}.`;
    default: throw new Error(`Unsupported compact card operation ${operation}.`);
  }
}

function buildIntents(action, intentSource) {
  const { operation, subject } = operationAndSubject(action.name);
  const exactIntent = humanize(action.name);
  return unique([
    exactIntent,
    ...intentSource.operationIntents[operation],
    ...intentSource.domainIntents[action.domain],
    ...aliasesForSubject(intentSource, subject)
  ]).slice(0, 7);
}

function actionResources(action, optionNames, intentSource) {
  const { operation, subject } = operationAndSubject(action.name);
  const aliases = aliasesForSubject(intentSource, subject);
  const resource = aliases[0];
  const prerequisites = [];

  if (["edit", "remove", "layout", "jitter", "pack", "order", "replace"].includes(operation)) {
    prerequisites.push(`existing ${resource}`);
  }
  if (operation === "encode") {
    prerequisites.push("target mark");
    if (optionNames.includes("field")) prerequisites.push("field in the target dataset");
  }
  if (action.domain === "charts") prerequisites.push("canvas and dataset context");
  if (action.domain === "marks" && operation === "create") {
    prerequisites.push("dataset and coordinate context");
  }
  if (["axes", "grid", "legend_and_title"].includes(action.domain) && action.name !== "createTitle") {
    prerequisites.push("compatible scale or encoding context");
  }
  if (
    action.name.endsWith("Data") &&
    action.name !== "createData" &&
    action.name !== "editBin2DData"
  ) {
    prerequisites.push("source dataset");
  }
  const deferredChart = ["createBoxPlot", "createGradientPlot"].includes(action.name);
  if (deferredChart) {
    prerequisites.push("canvas and source dataset", "compatible x/y roles before materialization");
  } else if (action.domain === "statistics" && !action.name.endsWith("Data")) {
    prerequisites.push("statistical source and coordinate context");
  }
  if (action.domain === "composition") prerequisites.push("complete child chart program");
  if (action.domain === "mark-selection") prerequisites.push("target mark and selector operands");
  if (action.domain === "primitives") prerequisites.push("extension action context");

  const owns = [];
  if (["create", "apply", "encode", "filter", "select", "highlight", "layout", "jitter", "pack", "order", "compose"].includes(operation)) {
    owns.push(operation === "encode" ? `${resource} assignment` : resource);
  }

  return {
    prerequisites: unique(prerequisites).slice(0, 4),
    owns: unique(owns).slice(0, 3),
    idOptions: optionNames.filter(name => idOptionNames.has(name))
  };
}

function declarationPosition(source, name) {
  const classStart = source.indexOf("export class ChartProgram {");
  if (classStart === -1) throw new Error("ChartProgram declaration was not found.");
  const position = source.indexOf(`  ${name}(`, classStart);
  if (position === -1) throw new Error(`Declaration was not found for ${name}.`);
  return position + 2;
}

function exactSignatureFromSource(source, name) {
  const start = declarationPosition(source, name);
  const finish = source.indexOf("): ChartProgram;", start);
  if (finish === -1) throw new Error(`Declaration end was not found for ${name}.`);
  return source.slice(start, finish + "): ChartProgram;".length)
    .trim()
    .replace(/\s+/g, " ");
}

function topLevelPropertySymbols(checker, type) {
  const properties = new Map();
  const visit = current => {
    for (const property of checker.getPropertiesOfType(current)) {
      if (!properties.has(property.name)) properties.set(property.name, property);
    }
    for (const constituent of current.getTypes?.() ?? []) visit(constituent);
  };
  visit(type);
  return [...properties.values()];
}

export async function declaredActionMetadata(actions) {
  const source = await readFile(declarationFile, "utf8");
  const api = new API({ cwd: root });
  try {
    const snapshot = api.updateSnapshot({ openFiles: [declarationFile] });
    const project = snapshot.getDefaultProjectForFile(declarationFile);
    if (!project) throw new Error("TypeScript could not open types/program.d.ts.");
    const checker = project.checker;
    return actions.map(action => {
      const position = declarationPosition(source, action.name);
      const actionType = checker.getTypeAtPosition(declarationFile, position);
      const signature = actionType
        ? checker.getSignaturesOfType(actionType, SignatureKind.Call)[0]
        : undefined;
      if (!signature) throw new Error(`Callable signature was not resolved for ${action.name}.`);
      const parameters = signature.getParameters();
      if (parameters.length > 1) {
        throw new Error(`${action.name} has more than one public parameter.`);
      }
      const options = [];
      if (parameters.length === 1) {
        const parameter = parameters[0];
        const declaration = parameter.valueDeclaration?.resolve(project);
        if (!declaration) throw new Error(`Parameter declaration was not resolved for ${action.name}.`);
        const parameterType = checker.getNonNullableType(
          checker.getTypeOfSymbolAtLocation(parameter, declaration)
        );
        const commonProperties = new Map(
          checker.getPropertiesOfType(parameterType).map(property => [property.name, property])
        );
        for (const property of topLevelPropertySymbols(checker, parameterType)) {
          const propertyDeclaration = property.valueDeclaration?.resolve(project) ?? declaration;
          const commonProperty = commonProperties.get(property.name);
          options.push({
            name: property.name,
            required: commonProperty !== undefined &&
              (commonProperty.flags & SymbolFlags.Optional) === 0,
            type: checker.typeToString(
              checker.getTypeOfSymbolAtLocation(property, propertyDeclaration)
            )
          });
        }
      }
      const exactSignature = exactSignatureFromSource(source, action.name);
      return { name: action.name, signature: exactSignature, options };
    });
  } finally {
    api.close();
  }
}

function firstQuotedLiteral(type) {
  return type.match(/"([^"]+)"/)?.[1];
}

function representativeValue(action, option) {
  const named = {
    id: `${humanize(operationAndSubject(action.name).subject).replace(/\s+/g, "-")}-1`,
    target: "mark-1",
    data: "data-1",
    source: "data-1",
    coordinate: "coordinate-1",
    scale: "scale-1",
    xScale: "x-scale",
    yScale: "y-scale",
    selection: "selection-1",
    field: "value",
    x: "x",
    y: "y",
    x2: "x2",
    y2: "y2",
    lower: "lower",
    upper: "upper",
    as: "derived",
    channel: "x",
    unit: "month",
    type: "collection",
    property: "opacity",
    value: 1,
    values: [{ category: "A", value: 1 }],
    dimensions: ["a", "b"],
    operations: [{ op: "rowNumber", as: "rowNumber" }],
    maxOffset: { pixels: 4 },
    transform: [{ type: "filter", field: "value", oneOf: [1] }],
    program: { $code: "chart().createCanvas({}).createData({ values: [] })" },
    border: true,
    text: "Chart title",
    color: "#f28e2b",
    fill: "#f28e2b",
    stroke: "#222222",
    shape: "circle",
    opacity: 0.8,
    width: 640,
    height: 400,
    strokeWidth: 2,
    lineWidth: 1,
    count: 5,
    columns: 2,
    angle: 45,
    radius: 4,
    direction: "horizontal",
    align: "start",
    theme: "dark"
  };
  if (option.name === "value") {
    const literal = firstQuotedLiteral(option.type);
    if (literal !== undefined) return literal;
    if (/\bstring\b/.test(option.type) && !/\bnumber\b/.test(option.type)) return "value";
    return 1;
  }
  if (Object.hasOwn(named, option.name)) return named[option.name];
  const literal = firstQuotedLiteral(option.type);
  if (literal !== undefined) return literal;
  if (/\bboolean\b/.test(option.type)) return true;
  if (/\bnumber\b/.test(option.type)) return 1;
  if (/\bstring\b/.test(option.type)) return option.name;
  if (/readonly .*\[\]|\bArray</.test(option.type)) return [];
  return {};
}

function codeValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1 && "$code" in value) {
    return value.$code;
  }
  if (Array.isArray(value)) return `[${value.map(codeValue).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return `{ ${entries.map(([key, entry]) => `${key}: ${codeValue(entry)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

function snippetFor(action, declaration, intentSource) {
  if (declaration.options.length === 0) return `program.${action.name}()`;
  const byName = new Map(declaration.options.map(option => [option.name, option]));
  const values = new Map();
  const override = intentSource.sampleOverrides[action.name] ?? {};
  for (const [name, value] of Object.entries(override)) {
    if (!byName.has(name)) {
      throw new Error(`Sample override ${action.name}.${name} is not a declared option.`);
    }
    values.set(name, value);
  }
  for (const option of declaration.options.filter(option => option.required)) {
    if (!values.has(option.name)) values.set(option.name, representativeValue(action, option));
  }
  const { operation } = operationAndSubject(action.name);
  if (values.size === 0 && ["edit", "encode", "layout", "highlight"].includes(operation)) {
    const change = declaration.options.find(option => !selectorOnlyOptions.has(option.name));
    if (change) values.set(change.name, representativeValue(action, change));
  }
  const entries = [...values].map(([name, value]) => `${name}: ${codeValue(value)}`);
  const object = entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`;
  return `program.${action.name}(${object})`;
}

function callPattern(action, options) {
  if (options.length === 0) return `${action.name}()`;
  const priority = [
    ...options.filter(option => option.required),
    ...options.filter(option => !option.required && idOptionNames.has(option.name)),
    ...options.filter(option => !option.required && !idOptionNames.has(option.name))
  ];
  const selected = unique(priority.map(option => option.name)).slice(0, 8);
  const required = new Set(options.filter(option => option.required).map(option => option.name));
  return `${action.name}({ ${selected.map(name => `${name}${required.has(name) ? "" : "?"}`).join(", ")} })`;
}

function callPatterns(action, options, intentSource) {
  return intentSource.callPatternOverrides[action.name] ?? [callPattern(action, options)];
}

function assertSnippet(action, declaration, snippet) {
  const expectedPrefix = `program.${action.name}(`;
  if (!snippet.startsWith(expectedPrefix)) {
    throw new Error(`${action.name} snippet does not call its exact action.`);
  }
  new Function("program", "chart", `return (${snippet});`);
  const object = snippet.match(/\(\{([\s\S]*)\}\)$/)?.[1] ?? "";
  for (const option of declaration.options.filter(option => option.required)) {
    if (!new RegExp(`(?:^|[, {])${option.name}:`).test(object)) {
      throw new Error(`${action.name} snippet omits required option ${option.name}.`);
    }
  }
}

export function validateActionCards({ cards, actions, declarations, routes }) {
  if (cards.length !== actions.length) {
    throw new Error(`Compact card coverage is ${cards.length}/${actions.length}.`);
  }
  const actionByName = new Map(actions.map(action => [action.name, action]));
  const declarationByName = new Map(declarations.map(entry => [entry.name, entry]));
  const names = new Set();
  let maxBytes = 0;
  let totalBytes = 0;
  for (const card of cards) {
    if (names.has(card.name)) throw new Error(`Duplicate compact card ${card.name}.`);
    names.add(card.name);
    const action = actionByName.get(card.name);
    const declaration = declarationByName.get(card.name);
    if (!action || !declaration) throw new Error(`Unknown compact card ${card.name}.`);
    if (card.signature !== declaration.signature) {
      throw new Error(`Signature drift in compact card ${card.name}.`);
    }
    const expectedOptions = declaration.options.map(({ name, required, type }) => ({
      name,
      required,
      type
    }));
    if (JSON.stringify(card.options) !== JSON.stringify(expectedOptions)) {
      throw new Error(`Option drift in compact card ${card.name}.`);
    }
    if (card.route !== routes[card.name]) throw new Error(`Route drift in compact card ${card.name}.`);
    if (card.errors.length > 2) throw new Error(`${card.name} has more than two errors.`);
    if (card.summary.length < 20 || card.summary.length > 420) {
      throw new Error(`${card.name} summary is outside the compact schema bounds.`);
    }
    if (card.intents.length < 3 || card.intents.length > 7 || new Set(card.intents).size !== card.intents.length) {
      throw new Error(`${card.name} intents are outside the compact schema bounds.`);
    }
    if (
      card.callPatterns.length < 1 ||
      card.callPatterns.length > 2 ||
      new Set(card.callPatterns).size !== card.callPatterns.length ||
      card.callPatterns.some(pattern => !pattern.startsWith(`${card.name}(`))
    ) {
      throw new Error(`${card.name} call patterns are invalid.`);
    }
    if (new Set(card.options.map(option => option.name)).size !== card.options.length) {
      throw new Error(`${card.name} repeats an option key.`);
    }
    if (card.resources.idOptions.some(name => !card.options.some(option => option.name === name))) {
      throw new Error(`${card.name} includes an undeclared resource ID option.`);
    }
    if (card.summary.includes("](") || card.summary.includes("`")) {
      throw new Error(`${card.name} summary contains documentation markup.`);
    }
    assertSnippet(action, declaration, card.snippet);
    const bytes = Buffer.byteLength(JSON.stringify(card), "utf8");
    if (bytes > 3072) throw new Error(`${card.name} compact card is ${bytes} bytes.`);
    maxBytes = Math.max(maxBytes, bytes);
    totalBytes += bytes;
  }
  const missing = actions.filter(action => !names.has(action.name));
  if (missing.length > 0) {
    throw new Error(`Compact cards are missing: ${missing.map(action => action.name).join(", ")}`);
  }
  return {
    count: cards.length,
    maxBytes,
    medianBytes: cards
      .map(card => Buffer.byteLength(JSON.stringify(card), "utf8"))
      .sort((left, right) => left - right)[Math.floor(cards.length / 2)],
    totalBytes
  };
}

export async function buildActionCards() {
  const [catalogSource, intentSourceText, referenceSource, routeSource, packageSource] = await Promise.all([
    readFile(catalogFile, "utf8"),
    readFile(intentFile, "utf8"),
    readFile(referenceSourceFile, "utf8"),
    readFile(routeFile, "utf8"),
    readFile(packageFile, "utf8")
  ]);
  const catalog = JSON.parse(catalogSource);
  const intentSource = JSON.parse(intentSourceText);
  const routes = JSON.parse(routeSource);
  const packageVersion = JSON.parse(packageSource).version;
  if (intentSource.schemaVersion !== 1) {
    throw new Error("knowledge/action-intents.json must use schemaVersion 1.");
  }
  const actionNames = new Set(catalog.actions.map(action => action.name));
  for (const section of [
    "summaryOverrides",
    "sampleOverrides",
    "callPatternOverrides",
    "errorOverrides"
  ]) {
    const unknown = Object.keys(intentSource[section]).filter(name => !actionNames.has(name));
    if (unknown.length > 0) {
      throw new Error(`${section} contains unknown actions: ${unknown.join(", ")}.`);
    }
  }
  const declarations = await declaredActionMetadata(catalog.actions);
  const summaryByName = summariesFromReference(
    referenceSource,
    actionNames
  );
  const cards = catalog.actions.map(action => {
    const declaration = declarations.find(entry => entry.name === action.name);
    const optionNames = declaration.options.map(option => option.name);
    const snippet = snippetFor(action, declaration, intentSource);
    const summary = intentSource.summaryOverrides[action.name]
      ?? summaryByName.get(action.name)
      ?? generatedSummary(action, intentSource);
    return {
      schemaVersion: 2,
      name: action.name,
      layer: action.layer,
      domain: action.domain,
      summary,
      signature: declaration.signature,
      intents: buildIntents(action, intentSource),
      lifecycle: action.lifecycle,
      resources: actionResources(action, optionNames, intentSource),
      options: declaration.options.map(({ name, required, type }) => ({
        name,
        required,
        type
      })),
      callPatterns: callPatterns(action, declaration.options, intentSource),
      snippet,
      errors: intentSource.errorOverrides[action.name] ?? [],
      route: routes[action.name]
    };
  });
  const stats = validateActionCards({ cards, actions: catalog.actions, declarations, routes });
  return {
    artifact: {
      schemaVersion: 2,
      packageVersion,
      typeSource: "types/program.d.ts",
      errorPolicy: "An empty errors array means the compact card has no curated error override; consult the canonical route for validation, inference, and recovery behavior.",
      count: cards.length,
      cards
    },
    context: { actions: catalog.actions, declarations, intentSource, routes },
    stats
  };
}
