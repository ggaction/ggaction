import { IMPUTE_REQUIRED_OPTIONS } from "../src/core/optionRequirements.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  API,
  SignatureKind,
  SymbolFlags
} from "typescript/unstable/sync";
import {
  authoringRoles,
  completionRequirements,
  editableVia,
  optionInference,
  optionUnits,
  supportedEntryPoints
} from "./action-card-metadata.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const declarationFile = path.join(root, "types/program.d.ts");
const intentFile = path.join(root, "knowledge/action-intents.json");
const referenceSourceFile = path.join(root, "docs/_sources/action-reference.md");
const routeFile = path.join(root, "docs/_data/action_reference_links.json");
const packageFile = path.join(root, "package.json");
const basicDeclarationFile = path.join(root, "types/basic.d.ts");
const relationshipFile = path.join(root, "knowledge/action-relationships.json");

const operationPrefixes = Object.freeze([
  "create",
  "revise",
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
  if (name === "setMarkVisibility") return { operation: "edit", subject: "MarkVisibility" };
  if (name === "bundleGraphEdges") return { operation: "layout", subject: "GraphEdges" };
  if (name === "facet") return { operation: "compose", subject: "facet" };
  if (name === "facetGrid") return { operation: "compose", subject: "FacetGrid" };
  if (name === "repeatCharts") return { operation: "compose", subject: "RepeatedCharts" };
  if (name === "insertCompositionChild") {
    return { operation: "edit", subject: "CompositionChild" };
  }
  if (name === "reorderCompositionChildren") {
    return { operation: "edit", subject: "CompositionChildren" };
  }
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
  if (["createGeoAnnotation", "editGeoAnnotation"].includes(action.name)) return {
    prerequisites: ["Canvas", "Geo coordinate", "explicit position or keyed geographic feature"], owns: ["geographic annotation"],
    idOptions: [action.name.startsWith("create") ? "id" : "target", "coordinate"]
  };
  if (["createGeoLODData", "editGeoLODData"].includes(action.name)) return {
    prerequisites: ["explicit keyed geometry levels and parent mappings"], owns: ["geographic detail resource"],
    idOptions: [action.name.startsWith("create") ? "id" : "target"]
  };
  if (["createGeoJoinData", "editGeoJoinData"].includes(action.name)) return {
    prerequisites: ["geographic geometry resource", "materialized table"], owns: ["joined geometry resource"],
    idOptions: [action.name.startsWith("create") ? "id" : "target", "geometry", "data"]
  };
  if (/^(create|edit)(GeoShapeMark|GeoPointMark|GeoLineMark|Graticule)$/.test(action.name)) return {
    prerequisites: ["Canvas", "Geo coordinate", ...(action.name.endsWith("Graticule") ? [] : ["compatible geometry source"])], owns: ["geographic mark"],
    idOptions: [action.name.startsWith("create") ? "id" : "target", "coordinate", ...(action.name.endsWith("Graticule") ? [] : ["geometry"])]
  };
  if (["createProjection", "editProjection"].includes(action.name)) return {
    prerequisites: action.name === "editProjection" ? ["existing named projection"] : ["explicit native projection type"],
    owns: ["projection resource"], idOptions: [action.name === "createProjection" ? "id" : "target"]
  };
  if (["bundleGraphEdges", "editEdgeRoute"].includes(action.name)) return {
    prerequisites: ["existing graph and compatible node layout"], owns: ["edge-route resource"],
    idOptions: [action.name === "bundleGraphEdges" ? "id" : "target", "graph", "layout"]
  };
  if (action.name === "createCalendarLayout") return { prerequisites: ["materialized civil-day observations"], owns: ["calendar layout resource"], idOptions: ["id", "data"] };
  if (["createCalendarPlot", "editCalendarPlot"].includes(action.name)) return {
    prerequisites: ["stored calendar layout", "Canvas"], owns: ["calendar mark"], idOptions: [action.name.startsWith("create") ? "id" : "target", "layout", "coordinate"]
  };
  if (["createContourData", "createDensityContourData", "editContourData"].includes(action.name)) return {
    prerequisites: action.name === "createDensityContourData" ? ["materialized point dataset"] : action.name === "editContourData" ? ["stored contour geometry"] : ["explicit scalar grid"],
    owns: ["geometry resource"], idOptions: (action.name.startsWith("create") ? ["id", "data"] : ["target", "data"]).filter(name => optionNames.includes(name))
  };
  if (["createContourMark", "editContourMark"].includes(action.name)) return {
    prerequisites: ["stored contour geometry", "Canvas"], owns: ["contour mark"], idOptions: [action.name.startsWith("create") ? "id" : "target", "geometry", "coordinate"]
  };
  if (action.name === "createInferredGraphData" || action.name === "editInferredGraphData") return {
    prerequisites: action.name === "createInferredGraphData" ? ["materialized source dataset"] : ["existing inferred graph"],
    owns: action.name === "createInferredGraphData" ? ["graph resource"] : [],
    idOptions: action.name === "createInferredGraphData" ? ["id", "data", "candidateGraph"] : ["target", "data", "candidateGraph"]
  };
  if (["layoutGraph", "layoutFlow"].includes(action.name)) return { prerequisites: ["existing graph resource"], owns: ["layout resource"], idOptions: ["id", "graph"] };
  if (["createFlowNodes", "editFlowNodes", "createFlowLinks", "editFlowLinks"].includes(action.name)) return {
    prerequisites: ["stored DAG or cyclic flow layout"], owns: ["flow mark"], idOptions: [action.name.startsWith("create") ? "id" : "target", "layout", "coordinate"]
  };
  if (["createGraphData", "editGraphData", "createFlowData", "editFlowData"].includes(action.name)) return {
    prerequisites: action.name.startsWith("create") ? ["explicit materialized node and edge datasets"] : ["existing observed graph"],
    owns: action.name.startsWith("create") ? ["graph resource"] : [],
    idOptions: action.name.startsWith("create") ? ["id", "nodes", "edges"] : ["target", "nodes", "edges"]
  };
  const { operation, subject } = operationAndSubject(action.name);
  const aliases = aliasesForSubject(intentSource, subject);
  const resource = aliases[0];
  const hierarchyPlot = /^(?:create|edit)(?:Tree|Treemap|Partition)Plot$/.test(action.name);
  const prerequisites = [];
  if (action.name === "createRegressionStatisticsData" || action.name === "editRegressionStatisticsData") {
    prerequisites.push("materialized linear regression dataset");
  }

  if (action.name === "layoutHierarchy") {
    prerequisites.push("existing hierarchy resource");
  } else if (action.name === "createMarkLabels") {
    prerequisites.push("existing eligible source mark");
  } else if (action.name === "editMarkLabelSelection") {
    prerequisites.push("attached label");
  } else if (action.name === "editMarkLabelPlacement") {
    prerequisites.push("attached label with a supported source geometry");
  } else if (action.name === "removeMarkLabels") {
    prerequisites.push("existing source mark or attached label");
  } else if (["edit", "remove", "layout", "jitter", "pack", "order", "replace"].includes(operation)) {
    prerequisites.push(`existing ${resource}`);
  }
  if (operation === "encode") {
    prerequisites.push("target mark");
    if (optionNames.includes("field")) prerequisites.push("field mode: dataset field");
  }
  if (action.domain === "charts") prerequisites.push(hierarchyPlot
    ? `canvas and ${action.name.includes("Partition") ? "partition" : action.name.includes("Treemap") ? "treemap" : "tree"} layout resource`
    : "canvas and dataset context");
  if (action.domain === "marks" && operation === "create" && action.name !== "createMarkLabels") {
    prerequisites.push("dataset and coordinate context");
  }
  if (["axes", "grid", "legend_and_title"].includes(action.domain) && !["createTitle", "editTitle", "removeTitle"].includes(action.name)) {
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
  if (["create", "revise", "apply", "encode", "filter", "select", "highlight", "layout", "jitter", "pack", "order", "compose"].includes(operation)) {
    owns.push(operation === "encode" ? `${resource} assignment` : resource);
  }

  return {
    prerequisites: unique(prerequisites).slice(0, 4),
    owns: unique(owns).slice(0, 3),
    idOptions: optionNames.filter(name => idOptionNames.has(name) ||
      (name === "hierarchy" && action.name === "layoutHierarchy") ||
      (name === "layout" && hierarchyPlot))
  };
}

function declarationPosition(source, name) {
  const classStart = source.indexOf("export class ChartProgram {");
  if (classStart === -1) throw new Error("ChartProgram declaration was not found.");
  const match = new RegExp(`^  ${name}(?:<[^\\n]+>)?\\(`, "m").exec(source.slice(classStart));
  if (match === null) throw new Error(`Declaration was not found for ${name}.`);
  return classStart + match.index + 2;
}

function exactSignatureFromSource(source, name) {
  const start = declarationPosition(source, name);
  const finish = source.indexOf("): ChartProgram;", start);
  if (finish === -1) throw new Error(`Declaration end was not found for ${name}.`);
  return source.slice(start, finish + "): ChartProgram;".length)
    .trim()
    .replace(/\s+/g, " ");
}

function topLevelPropertySymbols(checker, type, project, declaration) {
  const properties = new Map();
  const prohibited = property => checker.typeToString(checker.getNonNullableType(
    checker.getTypeOfSymbolAtLocation(property, property.valueDeclaration?.resolve(project) ?? declaration)
  )) === "never";
  const visit = current => {
    for (const property of checker.getPropertiesOfType(current)) {
      const previous = properties.get(property.name);
      if (!previous || prohibited(previous) && !prohibited(property)) properties.set(property.name, property);
    }
    for (const constituent of current.getTypes?.() ?? []) visit(constituent);
  };
  visit(type);
  return [...properties.values()].filter(property => !prohibited(property));
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
      const exactSignature = exactSignatureFromSource(source, action.name);
      const conditional = exactSignature.match(/ConditionalEncodingOptions<([^>]+)>/u)?.[0];
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
        // Preserve native parameter order when the Full-only target wrapper adds
        // a union branch. Inspect the full property type so selector support is not lost.
        const wrappedType = checker.typeToString(parameterType).startsWith("TargetedOptions<")
          ? parameterType.getAliasTypeArguments()[0] : undefined;
        const order = wrappedType ? topLevelPropertySymbols(checker, wrappedType, project, declaration).map(property => property.name) : [];
        const properties = topLevelPropertySymbols(checker, parameterType, project, declaration);
        if (wrappedType) properties.sort((a, b) =>
          (order.includes(a.name) ? order.indexOf(a.name) : order.length) - (order.includes(b.name) ? order.indexOf(b.name) : order.length));
        for (const property of properties) {
          const propertyDeclaration = property.valueDeclaration?.resolve(project) ?? declaration;
          const commonProperty = commonProperties.get(property.name);
          options.push({
            name: property.name,
            required: commonProperty !== undefined &&
              (commonProperty.flags & SymbolFlags.Optional) === 0,
            // Keep the exact named public payload instead of an expanded,
            // truncated Omit union for conditional branches.
            type: conditional && ["conditions", "otherwise"].includes(property.name)
              ? `${conditional}["${property.name}"]` : ["createProjection", "editProjection"].includes(action.name) && property.name === "type"
              ? "ProjectionType" : checker.typeToString(
              checker.getTypeOfSymbolAtLocation(commonProperty ?? property, propertyDeclaration)
            )
          });
        }
      }
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
  if (option.name === "channel" && !option.type.includes('"x"')) {
    const literal = firstQuotedLiteral(option.type);
    if (literal !== undefined) return literal;
  }
  if (option.name === "align" && !option.type.includes('"start"')) {
    const literal = firstQuotedLiteral(option.type);
    if (literal !== undefined) return literal;
  }
  if (option.type.includes("RotationInput")) return { value: 45, unit: "degrees" };
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

// Call patterns use documentation shorthand, so inspect only top-level option
// names. Nested objects and literal values belong to the option's own contract.
export function validateCallPatternOptions(pattern, options) {
  const body = pattern.match(/\(\{([\s\S]*)\}\)$/u)?.[1];
  if (body === undefined) return;
  const allowed = new Set(options.map(option => option.name));
  let depth = 0, quote, segment = "";
  const segments = [];
  for (const character of body) {
    if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") quote = character;
    else if ("{[(".includes(character)) depth += 1;
    else if ("}])".includes(character)) depth -= 1;
    if (character === "," && depth === 0 && !quote) {
      segments.push(segment); segment = "";
    } else segment += character;
  }
  segments.push(segment);
  for (const segment of segments) {
    for (const candidate of segment.split(":", 1)[0].split("|")) {
      const key = candidate.trim().replace(/\?$/u, "");
      if (key.startsWith("...")) continue;
      if (/^[A-Za-z][A-Za-z0-9]*$/u.test(key) && !allowed.has(key)) {
        throw new Error(`Call pattern advertises undeclared option "${key}": ${pattern}`);
      }
    }
  }
}

function callPatterns(action, options, intentSource) {
  if (action.name === "createImputedData") {
    const branches = new Map();
    for (const [method, required] of Object.entries(IMPUTE_REQUIRED_OPTIONS)) {
      if (method === "mean") continue;
      const key = required.join(", ");
      branches.set(key, [...(branches.get(key) ?? []), JSON.stringify(method)]);
    }
    return [`${action.name}({ id, fields, source?, groupBy?, method?: "mean" })`, ...[...branches].map(([required, methods]) =>
      `${action.name}({ id, fields, method: ${methods.join(" | ")}, ${required}, source?, groupBy? })`)];
  }
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
    if (typeof card.route !== "string" || !card.route.startsWith("/reference/") ||
      card.route !== routes[card.name]) throw new Error(`Route drift in compact card ${card.name}.`);
    if (card.errors.length > 2) throw new Error(`${card.name} has more than two errors.`);
    if (card.summary.length < 20 || card.summary.length > 420) {
      throw new Error(`${card.name} summary is outside the compact schema bounds.`);
    }
    if (card.intents.length < 3 || card.intents.length > 7 || new Set(card.intents).size !== card.intents.length) {
      throw new Error(`${card.name} intents are outside the compact schema bounds.`);
    }
    if (
      card.callPatterns.length < 1 ||
      card.callPatterns.length > 3 ||
      new Set(card.callPatterns).size !== card.callPatterns.length ||
      card.callPatterns.some(pattern => !pattern.startsWith(`${card.name}(`))
    ) {
      throw new Error(`${card.name} call patterns are invalid.`);
    }
    for (const pattern of card.callPatterns) validateCallPatternOptions(pattern, declaration.options);
    if (new Set(card.options.map(option => option.name)).size !== card.options.length) {
      throw new Error(`${card.name} repeats an option key.`);
    }
    if (card.resources.idOptions.some(name => !card.options.some(option => option.name === name))) {
      throw new Error(`${card.name} includes an undeclared resource ID option.`);
    }
    if (card.authoringRoles.length < 1 || new Set(card.authoringRoles).size !== card.authoringRoles.length) {
      throw new Error(`${card.name} has invalid authoring roles.`);
    }
    if (card.wraps.some(name => !actionByName.has(name)) || card.editableVia.some(name => !actionByName.has(name))) {
      throw new Error(`${card.name} has an unknown action relationship.`);
    }
    if (new Set(card.wraps).size !== card.wraps.length || new Set(card.editableVia).size !== card.editableVia.length) {
      throw new Error(`${card.name} repeats an action relationship.`);
    }
    if (card.summary.includes("](") || card.summary.includes("`")) {
      throw new Error(`${card.name} summary contains documentation markup.`);
    }
    assertSnippet(action, declaration, card.snippet);
    const bytes = Buffer.byteLength(JSON.stringify(card), "utf8");
    // Keep every public selector literal in the complete editLegend option inventory.
    const byteLimit = compactActionCardByteLimit(card.name);
    if (bytes > byteLimit) throw new Error(`${card.name} compact card is ${bytes} bytes (limit ${byteLimit}).`);
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

export function compactActionCardByteLimit(name) {
  // Full action cards now include the common explicit-target selector and typed wrapper.
  // Shadow inheritance measures ReferenceBand 3807, MarkLabels 4063,
  // Annotation 4057 bytes; ceilings round up by at most 7.
  // Legend cards also retain the closed overflow summary-symbol policy and three-channel combination literal.
  // Angular pointer metadata measures editMarkSelection at 3606 bytes.
  // Screen anchor and membership unions measure createAnnotation4265/editAnnotation3772 bytes.
  return 180 + ({editMarkSelection: 3430, editLegend: 4505, createLegend: 3873, createMarkLabels: 3890,
    createAnnotation: 4090, editAnnotation: 3600, createRegressionPlot: 3460, createReferenceBand: 3630}[name] ?? 3360);
}

export async function buildActionCards() {
  const [catalogSource, intentSourceText, referenceSource, routeSource, packageSource, basicSource, relationshipSource] = await Promise.all([
    readFile(catalogFile, "utf8"),
    readFile(intentFile, "utf8"),
    readFile(referenceSourceFile, "utf8"),
    readFile(routeFile, "utf8"),
    readFile(packageFile, "utf8"),
    readFile(basicDeclarationFile, "utf8"),
    readFile(relationshipFile, "utf8")
  ]);
  const catalog = JSON.parse(catalogSource);
  const intentSource = JSON.parse(intentSourceText);
  const routes = JSON.parse(routeSource);
  const packageVersion = JSON.parse(packageSource).version;
  const relationships = JSON.parse(relationshipSource);
  if (intentSource.schemaVersion !== 1) {
    throw new Error("knowledge/action-intents.json must use schemaVersion 1.");
  }
  const actionNames = new Set(catalog.actions.map(action => action.name));
  const basicActionNames = new Set([
    ...basicSource.matchAll(/^\s*\|\s*"([A-Za-z][A-Za-z0-9]*)"/gm)
  ].map(match => match[1]));
  basicActionNames.add("layoutSeries");
  if (relationships.actionCount !== catalog.actions.length) {
    throw new Error("Action relationship count does not match the current catalog.");
  }
  const wrapsByName = new Map(relationships.relationships.map(entry => [entry.name, entry.wraps]));
  const missingRelationships = catalog.actions.filter(action => !wrapsByName.has(action.name));
  if (missingRelationships.length > 0 || wrapsByName.size !== catalog.actions.length) {
    throw new Error(`Action relationships do not exactly cover the catalog: ${missingRelationships.map(action => action.name).join(", ")}.`);
  }
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
    const resources = actionResources(action, optionNames, intentSource);
    return {
      schemaVersion: 3,
      name: action.name,
      layer: action.layer,
      domain: action.domain,
      summary,
      signature: declaration.signature,
      intents: buildIntents(action, intentSource),
      lifecycle: action.lifecycle,
      resources,
      authoringRoles: authoringRoles(action),
      wraps: wrapsByName.get(action.name),
      editableVia: editableVia(action, actionNames),
      supports: { entryPoints: supportedEntryPoints(action, basicActionNames) },
      units: optionUnits(action, declaration.options),
      inference: optionInference(action, declaration.options),
      completionRequirements: completionRequirements(action, resources.prerequisites),
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
      schemaVersion: 3,
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
