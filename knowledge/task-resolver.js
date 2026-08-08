import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const cardsArtifact = JSON.parse(readFileSync(
  path.join(root, "knowledge/action-cards.json"),
  "utf8"
));
const taxonomy = JSON.parse(readFileSync(
  path.join(root, "knowledge/intent-taxonomy.json"),
  "utf8"
));

const cards = new Map(cardsArtifact.cards.map(card => [card.name, card]));
const constraints = new Map(taxonomy.constraints.map(constraint => [constraint.id, constraint]));

export class TaskPacketBudgetError extends Error {
  constructor(bytes) {
    super(`Compact task packet is ${bytes} bytes; the hard ceiling is 6144 bytes.`);
    this.name = "TaskPacketBudgetError";
    this.bytes = bytes;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function includesPhrase(query, phrase) {
  const normalizedPhrase = normalize(phrase);
  return ` ${query} `.includes(` ${normalizedPhrase} `);
}

function exactActionNames(query) {
  return cardsArtifact.cards
    .filter(card => new RegExp(
      `(?:^|[^A-Za-z0-9])${card.name}(?:$|[^A-Za-z0-9])`,
      "i"
    ).test(query))
    .map(card => card.name);
}

function semanticMatches(normalizedQuery) {
  return taxonomy.constraints.filter(constraint =>
    constraint.phrases.some(phrase => includesPhrase(normalizedQuery, phrase))
  );
}

function orderForCard(card) {
  if (card.name === "createCanvas") return 10;
  if (card.name === "createData") return 20;
  if (card.name.endsWith("Data")) return 30;
  if (card.domain === "charts" || (card.domain === "marks" && card.name.startsWith("create"))) return 40;
  if (card.domain === "encodings") {
    if (/^encode(X|Y|X2|Y2|XRange|YRange|Theta|R|Radius|ParallelCoordinates)/.test(card.name)) return 50;
    if (card.name === "encodeGroup" || card.name === "encodePathOrder") return 52;
    return 55;
  }
  if (card.domain === "statistics") return 60;
  if (["axes", "grid", "legend_and_title"].includes(card.domain)) return 70;
  if (card.domain === "mark-selection") return 75;
  if (card.domain === "composition" || /^(layout|jitter|order|replace)/.test(card.name)) return 80;
  return 65;
}

function exactProvider(name, matchedIds) {
  const card = cards.get(name);
  const related = taxonomy.providers
    .filter(provider => provider.kind === "action" && provider.name === name)
    .map(provider => ({
      provider,
      coverage: provider.covers.filter(constraint => matchedIds.has(constraint)).length
    }))
    .filter(entry => entry.coverage > 0)
    .sort((left, right) =>
      right.coverage - left.coverage ||
      left.provider.order - right.provider.order ||
      left.provider.id.localeCompare(right.provider.id)
    )[0]?.provider;

  if (!related) {
    return {
      id: `exact.${name}`,
      kind: "action",
      name,
      order: orderForCard(card),
      anchors: [`action.${name}`],
      covers: [`action.${name}`],
      exactCall: card.snippet,
      exactOptionNames: card.options
        .filter(option => new RegExp(`\\b${option.name}\\s*:`).test(card.snippet))
        .map(option => option.name)
    };
  }
  return {
    ...related,
    id: `exact.${name}`,
    anchors: [`action.${name}`],
    covers: unique([
      `action.${name}`,
      ...related.covers.filter(constraint => matchedIds.has(constraint))
    ])
  };
}

function conflictResult(matched) {
  const byGroup = new Map();
  for (const constraint of matched) {
    if (!constraint.exclusiveGroup) continue;
    const group = byGroup.get(constraint.exclusiveGroup) ?? [];
    group.push(constraint);
    byGroup.set(constraint.exclusiveGroup, group);
  }
  const blocked = new Set();
  const unresolved = [];
  for (const [group, entries] of byGroup) {
    if (entries.length < 2) continue;
    for (const entry of entries) blocked.add(entry.id);
    for (const entry of entries) {
      unresolved.push({
        constraint: entry.id,
        reason: `This conflicts within ${group}: ${entries.map(candidate => candidate.id).join(", ")}.`
      });
    }
  }
  return { blocked, unresolved };
}

function candidateProviders(supportedIds, exactNames) {
  const candidates = taxonomy.providers.filter(provider =>
    provider.anchors.some(anchor => supportedIds.has(anchor))
  );
  for (const name of exactNames) candidates.push(exactProvider(name, supportedIds));
  return candidates;
}

function selectProviders(supportedIds, providers) {
  const uncovered = new Set(supportedIds);
  const selected = [];
  while (uncovered.size > 0) {
    const ranked = providers
      .filter(provider => !selected.some(entry => entry.provider.id === provider.id))
      .map(provider => ({
        provider,
        coverage: provider.covers.filter(constraint => uncovered.has(constraint))
      }))
      .filter(entry => entry.coverage.length > 0)
      .sort((left, right) =>
        right.coverage.length - left.coverage.length ||
        left.provider.order - right.provider.order ||
        left.provider.id.localeCompare(right.provider.id)
      );
    if (ranked.length === 0) break;
    const winner = ranked[0];
    selected.push(winner);
    for (const constraint of winner.coverage) uncovered.delete(constraint);
  }
  return { selected, uncovered };
}

function adaptProviderDependencies(selected) {
  const hasStoredSelection = selected.some(entry => entry.provider.name === "selectMarks");
  if (!hasStoredSelection) return selected;
  return selected.map(entry => {
    if (entry.provider.name !== "highlightMarks") return entry;
    return {
      ...entry,
      provider: {
        ...entry.provider,
        baseOptions: {
          selection: "\"selection-1\"",
          color: "\"#f28e2b\""
        }
      }
    };
  });
}

function mergeOptionValues(provider, covered) {
  const options = new Map(Object.entries(provider.baseOptions ?? {}));
  for (const constraint of covered) {
    for (const [name, value] of Object.entries(
      provider.optionsByConstraint?.[constraint] ?? {}
    )) {
      const previous = options.get(name);
      if (previous !== undefined && previous !== value) {
        throw new Error(
          `${provider.id} assigns conflicting values to option ${name}.`
        );
      }
      options.set(name, value);
    }
  }
  return options;
}

function actionCall(provider, options) {
  if (provider.exactCall) return provider.exactCall;
  const card = cards.get(provider.name);
  if (card.options.length === 0) return `program.${provider.name}()`;
  const body = [...options]
    .map(([name, value]) => `${name}: ${value}`)
    .join(", ");
  return `program.${provider.name}(${body.length === 0 ? "{}" : `{ ${body} }`})`;
}

function planEntry(entry, step) {
  const { provider, coverage } = entry;
  const options = mergeOptionValues(provider, coverage);
  if (provider.kind === "runtime") {
    return {
      plan: {
        step,
        id: provider.id,
        kind: provider.kind,
        name: provider.name,
        constraints: coverage,
        requiredOptions: [],
        signature: provider.signature,
        route: provider.route
      },
      call: provider.call
    };
  }
  const card = cards.get(provider.name);
  return {
    plan: {
      step,
      id: provider.id,
      kind: provider.kind,
      name: provider.name,
      constraints: coverage,
      requiredOptions: provider.exactOptionNames ?? [...options.keys()],
      signature: card.signature,
      route: card.route
    },
    call: actionCall(provider, options)
  };
}

function genericUnresolved(normalizedQuery, matchedIds, exactNames) {
  const unresolved = [];
  const taskSpecificMatches = [...matchedIds].filter(id =>
    !id.startsWith("renderer.") && !id.startsWith("unsupported.")
  );
  if (
    /\b(chart|plot)\b/.test(normalizedQuery) &&
    taskSpecificMatches.length === 0 &&
    ![...matchedIds].some(id => id.startsWith("unsupported.")) &&
    exactNames.length === 0
  ) {
    unresolved.push({
      constraint: "chart.type",
      reason: "A chart or mark type is required; for example scatter plot, line chart, bar chart, or tick mark."
    });
  }
  if (
    /\b(render|export|output)\b/.test(normalizedQuery) &&
    ![...matchedIds].some(id => id.startsWith("renderer."))
  ) {
    unresolved.push({
      constraint: "renderer.format",
      reason: "A supported output format is required: Browser Canvas, SVG, PNG, or PDF."
    });
  }
  return unresolved;
}

export function validateResolverKnowledge() {
  if (cardsArtifact.schemaVersion !== 1 || taxonomy.schemaVersion !== 1) {
    throw new Error("Compact knowledge files must use schemaVersion 1.");
  }
  if (constraints.size !== taxonomy.constraints.length) {
    throw new Error("Intent constraint IDs must be unique.");
  }
  const providerIds = new Set(taxonomy.providers.map(provider => provider.id));
  if (providerIds.size !== taxonomy.providers.length) {
    throw new Error("Intent provider IDs must be unique.");
  }
  const anchored = new Set();
  for (const provider of taxonomy.providers) {
    for (const id of [...provider.anchors, ...provider.covers]) {
      if (!constraints.has(id)) throw new Error(`${provider.id} references unknown constraint ${id}.`);
    }
    if (provider.anchors.some(anchor => !provider.covers.includes(anchor))) {
      throw new Error(`${provider.id} does not cover every anchor.`);
    }
    for (const anchor of provider.anchors) anchored.add(anchor);
    if (provider.kind === "action") {
      const card = cards.get(provider.name);
      if (!card) throw new Error(`${provider.id} references unknown action ${provider.name}.`);
      const declaredOptions = new Set(card.options.map(option => option.name));
      const optionGroups = [
        provider.baseOptions ?? {},
        ...Object.values(provider.optionsByConstraint ?? {})
      ];
      for (const group of optionGroups) {
        for (const [name, value] of Object.entries(group)) {
          if (!declaredOptions.has(name)) {
            throw new Error(`${provider.id} references undeclared option ${name}.`);
          }
          if (typeof value !== "string" || value.length === 0) {
            throw new Error(`${provider.id}.${name} must be a JavaScript expression string.`);
          }
        }
      }
    } else if (
      provider.kind !== "runtime" ||
      typeof provider.signature !== "string" ||
      typeof provider.call !== "string" ||
      !provider.route.startsWith("/reference/")
    ) {
      throw new Error(`${provider.id} has an invalid runtime contract.`);
    }
  }
  const missing = taxonomy.constraints.filter(constraint =>
    constraint.unresolved === undefined && !anchored.has(constraint.id)
  );
  if (missing.length > 0) {
    throw new Error(`Supported constraints lack providers: ${missing.map(entry => entry.id).join(", ")}.`);
  }
  return {
    cards: cards.size,
    constraints: constraints.size,
    providers: taxonomy.providers.length,
    supported: taxonomy.constraints.filter(entry => entry.unresolved === undefined).length,
    unsupported: taxonomy.constraints.filter(entry => entry.unresolved !== undefined).length
  };
}

export function searchGgaction(query) {
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new TypeError("searchGgaction query must be a non-empty string.");
  }
  if (query.length > 500) {
    throw new RangeError("searchGgaction query must be at most 500 characters.");
  }
  validateResolverKnowledge();
  const normalizedQuery = normalize(query);
  const exactNames = exactActionNames(query);
  const matched = semanticMatches(normalizedQuery);
  const matchedIds = new Set([
    ...matched.map(constraint => constraint.id),
    ...exactNames.map(name => `action.${name}`)
  ]);
  const unresolved = matched
    .filter(constraint => constraint.unresolved !== undefined)
    .map(constraint => ({ constraint: constraint.id, reason: constraint.unresolved }));
  const { blocked, unresolved: conflicts } = conflictResult(matched);
  unresolved.push(...conflicts);

  const supportedIds = new Set([...matchedIds].filter(id => {
    const constraint = constraints.get(id);
    return !blocked.has(id) && (constraint === undefined || constraint.unresolved === undefined);
  }));
  const providers = candidateProviders(supportedIds, exactNames);
  const { selected, uncovered } = selectProviders(supportedIds, providers);
  for (const constraint of uncovered) {
    unresolved.push({
      constraint,
      reason: "No current action or runtime operation covers this recognized constraint."
    });
  }
  unresolved.push(...genericUnresolved(normalizedQuery, matchedIds, exactNames));
  if (matchedIds.size === 0 && unresolved.length === 0) {
    unresolved.push({
      constraint: "query.intent",
      reason: "No current ggaction constraint was recognized; use an exact action name or a supported chart task."
    });
  }

  const ordered = adaptProviderDependencies(selected).sort((left, right) =>
    left.provider.order - right.provider.order ||
    left.provider.id.localeCompare(right.provider.id)
  );
  const entries = ordered.map((entry, index) => planEntry(entry, index + 1));
  const packet = {
    schemaVersion: 1,
    query: query.trim(),
    matchedConstraints: [...matchedIds],
    actionPlan: entries.map(entry => entry.plan),
    exactCalls: entries.map(entry => entry.call),
    unresolved: unique(unresolved.map(entry => JSON.stringify(entry))).map(JSON.parse),
    candidates: entries.slice(0, 3).map(entry => ({
      id: entry.plan.id,
      kind: entry.plan.kind,
      name: entry.plan.name,
      route: entry.plan.route
    }))
  };
  const bytes = Buffer.byteLength(JSON.stringify(packet), "utf8");
  if (bytes > 6144) throw new TaskPacketBudgetError(bytes);
  return packet;
}

export function taskPacketBytes(packet) {
  return Buffer.byteLength(JSON.stringify(packet), "utf8");
}

validateResolverKnowledge();
