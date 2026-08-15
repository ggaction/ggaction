import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  API,
  SignatureKind
} from "typescript/unstable/sync";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const defaultDeclarationFile = path.join(repositoryRoot, "types/program.d.ts");

export const TRACE_OPTION_EVIDENCE_ALIASES = Object.freeze({
  binBoundaries: "binBoundariesCount",
  dimensions: "dimensionsCount",
  domain: "domainCount",
  oneOf: "oneOfCount",
  operations: "operationsCount",
  program: "programType",
  range: "rangeCount",
  sortBy: "sortByCount",
  strokeDash: "strokeDashCount",
  transform: "transformCount",
  values: "valuesCount"
});

const MAX_OPTION_PATH_DEPTH = 6;
const SMALL_LITERAL_FAMILY_LIMIT = 8;

export const EXCLUDED_OPTION_PATH_SEGMENTS = Object.freeze({
  resolved: "Readonly derived-transform output; it is not accepted authoring input."
});

function publicCards(actionCards) {
  const cards = Array.isArray(actionCards) ? actionCards : actionCards?.cards;
  if (!Array.isArray(cards)) {
    throw new TypeError("Action cards must provide a cards array.");
  }
  const selected = cards.filter(card => card?.layer === "user-facing");
  const names = new Set();
  for (const card of selected) {
    if (typeof card.name !== "string" || !Array.isArray(card.options)) {
      throw new TypeError("Public action cards require a name and options.");
    }
    if (names.has(card.name)) throw new Error(`Public action card repeats ${card.name}.`);
    names.add(card.name);
    const optionNames = card.options.map(option => option?.name);
    if (
      optionNames.some(name => typeof name !== "string" || name.length === 0) ||
      new Set(optionNames).size !== optionNames.length
    ) {
      throw new Error(`Public action card ${card.name} has invalid option names.`);
    }
  }
  return selected;
}

function declarationPosition(source, name) {
  const classStart = source.indexOf("export class ChartProgram {");
  const position = source.indexOf(`  ${name}(`, classStart);
  if (classStart === -1 || position === -1) {
    throw new Error(`Declaration was not found for ${name}.`);
  }
  return position + 2;
}

function flattenedTypes(type) {
  const values = [];
  const visited = new Set();
  const visit = current => {
    if (visited.has(current.id)) return;
    visited.add(current.id);
    const children = current.getTypes?.() ?? [];
    if (children.length === 0) {
      values.push(current);
    } else {
      children.forEach(visit);
    }
  };
  visit(type);
  return values;
}

function categoricalLiterals(checker, type) {
  const values = new Map();
  const aliases = new Set();
  const visited = new Set();
  const visit = current => {
    if (visited.has(current.id)) return;
    visited.add(current.id);
    const alias = current.getAliasSymbol?.()?.name;
    if (typeof alias === "string") aliases.add(alias);
    if (current.isStringLiteralType?.()) {
      values.set(`string:${encodeURIComponent(current.value)}`, Object.freeze({
        type: "string",
        value: current.value,
        key: `string:${encodeURIComponent(current.value)}`
      }));
    } else if (current.isBooleanLiteralType?.()) {
      const printed = checker.typeToString(current);
      if (printed === "true" || printed === "false") {
        values.set(`boolean:${printed}`, Object.freeze({
          type: "boolean",
          value: printed === "true",
          key: `boolean:${printed}`
        }));
      }
    }
    for (const child of current.getTypes?.() ?? []) visit(child);
  };
  visit(type);
  return Object.freeze({
    aliases: Object.freeze([...aliases].sort()),
    values: Object.freeze([...values.values()].sort((left, right) =>
      left.key.localeCompare(right.key)
    ))
  });
}

function isPrimitiveType(checker, type) {
  if (
    type.isIntrinsicType?.() ||
    type.isLiteralType?.() ||
    type.isTemplateLiteralType?.() ||
    type.isStringMappingType?.()
  ) {
    return true;
  }
  return /^(?:any|bigint|boolean|never|null|number|string|symbol|undefined|unknown|void)$/u
    .test(checker.typeToString(type));
}

function arrayElementTypes(checker, type) {
  return flattenedTypes(type).flatMap(current =>
    checker.isArrayType(current) || checker.isTupleType(current)
      ? checker.getTypeArguments(current)
      : []
  );
}

function propertyDeclaration(property, project) {
  const reference = property.valueDeclaration ?? property.declarations?.[0];
  return reference?.resolve(project);
}

function declaredInFile(property, project, declarationFile) {
  const declaration = propertyDeclaration(property, project);
  const source = declaration?.getSourceFile();
  const fileName = source?.sourceFile?.fileName ?? source?.fileName;
  return typeof fileName === "string" &&
    path.resolve(fileName).toLowerCase() === path.resolve(declarationFile).toLowerCase();
}

function structuredProperties(checker, project, declarationFile, type) {
  const properties = [];
  const seen = new Set();
  const add = property => {
    if (!seen.has(property)) {
      seen.add(property);
      properties.push(property);
    }
  };
  const candidates = flattenedTypes(type).filter(current => {
    const printed = checker.typeToString(current);
    return !(
      isPrimitiveType(checker, current) ||
      checker.isArrayType(current) ||
      checker.isTupleType(current) ||
      checker.getSignaturesOfType(current, SignatureKind.Call).length > 0 ||
      /\bChartProgram\b/u.test(printed)
    );
  });
  if (candidates.length === 0) return [];
  for (const property of checker.getPropertiesOfType(type)) {
    if (declaredInFile(property, project, declarationFile)) {
      add(property);
    }
  }
  for (const current of candidates) {
    const aliasSymbol = current.getAliasSymbol?.();
    const mappedAlias = aliasSymbol?.name;
    const typeSymbol = aliasSymbol ?? current.getSymbol?.();
    const localMappedAlias = typeSymbol !== undefined &&
      declaredInFile(typeSymbol, project, declarationFile);
    for (const property of checker.getPropertiesOfType(current)) {
      if (
        (
          declaredInFile(property, project, declarationFile) ||
          (
            property.valueDeclaration === undefined &&
            (
              localMappedAlias ||
              ["Omit", "Partial", "Pick", "Readonly", "Record"].includes(mappedAlias)
            ) &&
            /^[A-Za-z][A-Za-z0-9]*$/u.test(property.name)
          )
        )
      ) {
        add(property);
      }
    }
  }
  return properties;
}

function optionPathId(action, optionPath) {
  return `option-path:${action}.${optionPath}`;
}

export function optionValueId(action, optionPath, valueKey) {
  return `option-value:${action}.${optionPath}=${valueKey}`;
}

function familyId(valueKey, aliases) {
  const digest = createHash("sha256").update(valueKey).digest("hex").slice(0, 12);
  const label = valueKey === "boolean:false|boolean:true"
    ? "boolean"
    : aliases[0]?.replace(/[^A-Za-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "literal";
  return `${label}-${digest}`;
}

function readPropertyType(checker, project, property, fallbackDeclaration) {
  const declaration = propertyDeclaration(property, project) ?? fallbackDeclaration;
  return Object.freeze({
    declaration,
    type: checker.getTypeOfSymbolAtLocation(property, declaration)
  });
}

function collectActionPaths({
  checker,
  project,
  declarationFile,
  action,
  parameterType,
  declaration
}) {
  const paths = new Map();
  const visit = (type, parentPath, depth, ancestry) => {
    if (depth >= MAX_OPTION_PATH_DEPTH) return;
    const currentIds = [type, ...(type.getTypes?.() ?? [])]
      .filter(value => !isPrimitiveType(checker, value))
      .map(value => value.id);
    if (currentIds.some(id => ancestry.has(id))) return;
    const nextAncestry = new Set([...ancestry, ...currentIds]);
    const elements = arrayElementTypes(checker, type);
    if (elements.length > 0) {
      const arrayPath = `${parentPath}[]`;
      if (!paths.has(arrayPath)) {
        paths.set(arrayPath, {
          action,
          path: arrayPath,
          depth,
          topLevel: false,
          literals: Object.freeze({ aliases: Object.freeze([]), values: Object.freeze([]) })
        });
      }
      for (const element of elements) {
        visit(element, arrayPath, depth + 1, nextAncestry);
      }
      return;
    }

    for (const property of structuredProperties(
      checker,
      project,
      declarationFile,
      type
    )) {
      if (Object.hasOwn(EXCLUDED_OPTION_PATH_SEGMENTS, property.name)) continue;
      const propertyValue = readPropertyType(checker, project, property, declaration);
      const propertyPath = parentPath.length === 0
        ? property.name
        : `${parentPath}.${property.name}`;
      const existing = paths.get(propertyPath);
      const literals = categoricalLiterals(checker, propertyValue.type);
      if (existing === undefined) {
        paths.set(propertyPath, {
          action,
          path: propertyPath,
          depth,
          topLevel: parentPath.length === 0,
          literals
        });
      } else {
        const mergedValues = new Map(
          [...existing.literals.values, ...literals.values].map(value => [value.key, value])
        );
        paths.set(propertyPath, {
          ...existing,
          literals: Object.freeze({
            aliases: Object.freeze([...new Set([
              ...existing.literals.aliases,
              ...literals.aliases
            ])].sort()),
            values: Object.freeze([...mergedValues.values()].sort((left, right) =>
              left.key.localeCompare(right.key)
            ))
          })
        });
      }

      visit(
        propertyValue.type,
        propertyPath,
        depth + 1,
        nextAncestry
      );
    }
  };
  visit(parameterType, "", 0, new Set());
  return [...paths.values()];
}

function finalizeInventory(cards, rawPaths) {
  const familyInputs = new Map();
  for (const pathValue of rawPaths) {
    if (pathValue.literals.values.length === 0) continue;
    const key = pathValue.literals.values.map(value => value.key).join("|");
    const current = familyInputs.get(key) ?? { aliases: new Set(), paths: [] };
    pathValue.literals.aliases.forEach(alias => current.aliases.add(alias));
    current.paths.push(pathValue);
    familyInputs.set(key, current);
  }

  const families = new Map([...familyInputs].map(([key, input]) => {
    const id = familyId(key, [...input.aliases].sort());
    const values = input.paths[0].literals.values;
    return [key, {
      id,
      aliases: Object.freeze([...input.aliases].sort()),
      values,
      size: values.length,
      policy: values.length <= SMALL_LITERAL_FAMILY_LIMIT ? "path-values" : "family-values",
      paths: Object.freeze(input.paths.map(pathValue =>
        optionPathId(pathValue.action, pathValue.path)
      ).sort())
    }];
  }));

  const optionPaths = rawPaths.map(pathValue => {
    const key = pathValue.literals.values.map(value => value.key).join("|");
    const family = families.get(key);
    const arrayIndex = pathValue.path.indexOf("[]");
    const arrayParent = arrayIndex === -1
      ? undefined
      : pathValue.path.slice(0, arrayIndex);
    const exclusion = arrayIndex !== -1
      ? Object.freeze({
        reason: "redacted-array",
        detail:
          "Action traces summarize arrays as counts; the observable parent option owns coverage.",
        replacement: optionPathId(pathValue.action, arrayParent)
      })
      : undefined;
    return Object.freeze({
      id: optionPathId(pathValue.action, pathValue.path),
      action: pathValue.action,
      path: pathValue.path,
      depth: pathValue.depth,
      topLevel: pathValue.topLevel,
      required: exclusion === undefined,
      evidence: exclusion === undefined ? "direct-trace" : "redacted-trace",
      traceAlias: pathValue.topLevel
        ? TRACE_OPTION_EVIDENCE_ALIASES[pathValue.path]
        : undefined,
      ...(exclusion === undefined ? {} : { exclusion }),
      literalFamily: family?.id,
      literalPolicy: family?.policy,
      values: family === undefined
        ? Object.freeze([])
        : Object.freeze(family.values.map(value => value.key))
    });
  }).sort((left, right) => left.id.localeCompare(right.id));
  const optionById = new Map(optionPaths.map(option => [option.id, option]));
  for (const option of optionPaths.filter(value => !value.required)) {
    const replacement = optionById.get(option.exclusion.replacement);
    if (replacement?.required !== true) {
      throw new Error(
        `Redacted option ${option.id} lacks an observable parent replacement.`
      );
    }
  }

  const familyList = [...families.values()].map(family => Object.freeze({
    ...family,
    requiredPaths: Object.freeze(family.paths.filter(id =>
      optionPaths.find(option => option.id === id)?.required === true
    ))
  })).sort((left, right) => left.id.localeCompare(right.id));
  const pathLiteralRequirements = optionPaths.flatMap(option => {
    if (!option.required || option.literalPolicy !== "path-values") return [];
    return option.values.map(valueKey => Object.freeze({
      id: optionValueId(option.action, option.path, valueKey),
      optionPath: option.id,
      family: option.literalFamily,
      valueKey
    }));
  });
  const familyLiteralRequirements = familyList.flatMap(family => {
    if (family.requiredPaths.length === 0 || family.policy !== "family-values") return [];
    return family.values.map(value => Object.freeze({
      id: `literal-value:${family.id}=${value.key}`,
      family: family.id,
      valueKey: value.key
    }));
  });
  const pathDiversityRequirements = optionPaths
    .filter(option => option.required && option.literalPolicy === "family-values")
    .map(option => Object.freeze({
      id: `literal-diversity:${option.action}.${option.path}`,
      optionPath: option.id,
      family: option.literalFamily,
      minimumDistinctValues: 2
    }));
  const topLevelLiteralValueCount = optionPaths
    .filter(option => option.topLevel)
    .reduce((sum, option) => sum + option.values.length, 0);

  return Object.freeze({
    schemaVersion: 1,
    publicActions: Object.freeze(cards.map(card => Object.freeze({
      name: card.name,
      lifecycle: card.lifecycle
    }))),
    optionPaths: Object.freeze(optionPaths),
    literalFamilies: Object.freeze(familyList),
    pathLiteralRequirements: Object.freeze(pathLiteralRequirements),
    familyLiteralRequirements: Object.freeze(familyLiteralRequirements),
    pathDiversityRequirements: Object.freeze(pathDiversityRequirements),
    counts: Object.freeze({
      publicActions: cards.length,
      topLevelOptionPaths: optionPaths.filter(option => option.topLevel).length,
      nestedOptionPaths: optionPaths.filter(option => !option.topLevel).length,
      optionPaths: optionPaths.length,
      requiredOptionPaths: optionPaths.filter(option => option.required).length,
      excludedOptionPaths: optionPaths.filter(option => !option.required).length,
      topLevelCategoricalPaths: optionPaths.filter(option =>
        option.topLevel && option.values.length > 0
      ).length,
      topLevelLiteralValues: topLevelLiteralValueCount,
      literalFamilies: familyList.length,
      pathLiteralRequirements: pathLiteralRequirements.length,
      familyLiteralRequirements: familyLiteralRequirements.length,
      pathDiversityRequirements: pathDiversityRequirements.length
    }),
    excludedOptionPaths: Object.freeze(optionPaths
      .filter(option => !option.required)
      .map(option => Object.freeze({
        id: option.id,
        ...option.exclusion
      })))
  });
}

export async function buildPublicOptionInventory(actionCards, {
  declarationFile = defaultDeclarationFile
} = {}) {
  const cards = publicCards(actionCards);
  const source = await readFile(declarationFile, "utf8");
  const api = new API({ cwd: repositoryRoot });
  try {
    const snapshot = api.updateSnapshot({ openFiles: [declarationFile] });
    const project = snapshot.getDefaultProjectForFile(declarationFile);
    if (!project) throw new Error("TypeScript could not open types/program.d.ts.");
    const checker = project.checker;
    const rawPaths = [];
    for (const card of cards) {
      const position = declarationPosition(source, card.name);
      const actionType = checker.getTypeAtPosition(declarationFile, position);
      const signature = actionType
        ? checker.getSignaturesOfType(actionType, SignatureKind.Call)[0]
        : undefined;
      if (!signature) throw new Error(`Callable signature was not resolved for ${card.name}.`);
      const parameters = signature.getParameters();
      if (parameters.length > 1) {
        throw new Error(`${card.name} has more than one public parameter.`);
      }
      if (parameters.length === 0) continue;
      const parameter = parameters[0];
      const declaration = parameter.valueDeclaration?.resolve(project);
      if (!declaration) {
        throw new Error(`Parameter declaration was not resolved for ${card.name}.`);
      }
      const parameterType = checker.getNonNullableType(
        checker.getTypeOfSymbolAtLocation(parameter, declaration)
      );
      const paths = collectActionPaths({
        checker,
        project,
        declarationFile,
        action: card.name,
        parameterType,
        declaration
      });
      const declaredTopLevel = new Set(paths
        .filter(option => option.topLevel)
        .map(option => option.path));
      const cardTopLevel = new Set(card.options.map(option => option.name));
      if (
        declaredTopLevel.size !== cardTopLevel.size ||
        [...declaredTopLevel].some(option => !cardTopLevel.has(option))
      ) {
        throw new Error(`Action-card option drift was found for ${card.name}.`);
      }
      rawPaths.push(...paths);
    }
    return finalizeInventory(cards, rawPaths);
  } finally {
    api.close();
  }
}
