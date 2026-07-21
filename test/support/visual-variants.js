import assert from "node:assert/strict";
import test from "node:test";

import { summarizeArgs } from "../../src/core/action.js";
import { artifactScopeConfig } from "./artifact-schema.js";
import { assertRenderedPNG } from "./png.js";

const UNRESOLVED = Symbol("unresolved displayed value");

function normalizeArtifactScope(artifact, label) {
  if (artifact === false) return false;
  if (artifact === true) {
    return Object.freeze({ scope: "charts", capability: "chart-variants" });
  }
  if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new TypeError(`${label} artifact must be a boolean or object.`);
  }
  const scope = artifact.scope ?? "charts";
  const config = artifactScopeConfig(scope);
  const allowed = new Set(["scope", ...config.scopeKeys]);
  for (const key of Object.keys(artifact)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} has unknown artifact option "${key}".`);
    }
  }
  for (const key of config.scopeKeys) {
    if (typeof artifact[key] !== "string" || artifact[key].length === 0) {
      throw new TypeError(
        `${label} ${config.label} artifact requires ${config.scopeKeys.join(", ")}.`
      );
    }
  }
  return Object.freeze({
    scope,
    ...Object.fromEntries(config.scopeKeys.map(key => [key, artifact[key]]))
  });
}

export function defineVisualVariant({
  chart,
  variant,
  title,
  callChain,
  primitive,
  userFacing,
  width,
  height,
  colors,
  regions,
  visualSignature,
  programEquivalence = "state",
  compareSemanticSpec = true,
  artifact = true
}) {
  if (typeof chart !== "string" || chart.length === 0) {
    throw new TypeError("Visual variant chart must be a non-empty string.");
  }
  if (typeof variant !== "string" || variant.length === 0) {
    throw new TypeError("Visual variant id must be a non-empty string.");
  }
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError(`${chart}/${variant} requires positive dimensions.`);
  }
  if (!Array.isArray(regions) || regions.length === 0) {
    throw new TypeError(`${chart}/${variant} requires visual regions.`);
  }
  for (const region of regions) {
    if (
      region === null ||
      typeof region !== "object" ||
      typeof region.name !== "string" ||
      ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
      region.x < 0 ||
      region.y < 0 ||
      region.width <= 0 ||
      region.height <= 0 ||
      region.x + region.width > width ||
      region.y + region.height > height
    ) {
      throw new RangeError(`${chart}/${variant} has an invalid visual region.`);
    }
  }
  if (typeof primitive !== "function") {
    throw new TypeError(`${chart}/${variant} primitive must be a program factory.`);
  }
  if (userFacing !== undefined && typeof userFacing !== "function") {
    throw new TypeError(`${chart}/${variant} userFacing must be a program factory.`);
  }
  if (!["state", "render"].includes(programEquivalence)) {
    throw new TypeError(`${chart}/${variant} has an invalid program equivalence mode.`);
  }
  if (typeof compareSemanticSpec !== "boolean") {
    throw new TypeError(`${chart}/${variant} compareSemanticSpec must be boolean.`);
  }
  const boundsTolerance = visualSignature?.inkBounds?.tolerance;
  const hasValidBoundsTolerance =
    boundsTolerance === undefined ||
    (Number.isFinite(boundsTolerance) && boundsTolerance >= 0) ||
    (
      boundsTolerance !== null &&
      typeof boundsTolerance === "object" &&
      !Array.isArray(boundsTolerance) &&
      Object.keys(boundsTolerance).every(key =>
        ["x", "y", "width", "height"].includes(key)
      ) &&
      ["x", "y", "width", "height"].every(key =>
        Number.isFinite(boundsTolerance[key]) && boundsTolerance[key] >= 0
      )
    );
  if (visualSignature !== undefined && (
    visualSignature === null ||
    typeof visualSignature !== "object" ||
    !Number.isFinite(visualSignature.inkRatio?.min) ||
    !Number.isFinite(visualSignature.inkRatio?.max) ||
    visualSignature.inkRatio.min < 0 ||
    visualSignature.inkRatio.max < visualSignature.inkRatio.min ||
    !["x", "y", "width", "height"].every(key =>
      Number.isFinite(visualSignature.inkBounds?.[key])
    ) ||
    !hasValidBoundsTolerance
  )) {
    throw new TypeError(`${chart}/${variant} has an invalid visual signature.`);
  }
  const artifactScope = normalizeArtifactScope(artifact, `${chart}/${variant}`);
  return Object.freeze({
    chart,
    variant,
    title,
    callChain,
    primitive,
    userFacing,
    width,
    height,
    colors,
    regions,
    visualSignature,
    programEquivalence,
    compareSemanticSpec,
    artifact: artifactScope
  });
}

function skipQuoted(source, start) {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === quote) return index + 1;
    index += 1;
  }
  throw new TypeError("Visual call chain has an unterminated string.");
}

function closingParenthesis(source, open) {
  let depth = 1;
  for (let index = open + 1; index < source.length; index += 1) {
    if (["\"", "'", "`"].includes(source[index])) {
      index = skipQuoted(source, index) - 1;
    } else if (source[index] === "(") {
      depth += 1;
    } else if (source[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new TypeError("Visual call chain has an unclosed action call.");
}

class DisplayedLiteralParser {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  skipSpace() {
    while (/\s/.test(this.source[this.index] ?? "")) this.index += 1;
  }

  string() {
    const quote = this.source[this.index];
    let value = "";
    this.index += 1;
    while (this.index < this.source.length) {
      const character = this.source[this.index];
      if (character === quote) {
        this.index += 1;
        return value;
      }
      if (character === "\\") {
        this.index += 1;
        const escaped = this.source[this.index];
        value += ({ n: "\n", r: "\r", t: "\t" })[escaped] ?? escaped;
      } else {
        value += character;
      }
      this.index += 1;
    }
    return UNRESOLVED;
  }

  identifier() {
    const match = this.source.slice(this.index).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
    if (!match) return undefined;
    this.index += match[0].length;
    return match[0];
  }

  skipUnknown() {
    let braces = 0;
    let brackets = 0;
    let parentheses = 0;
    while (this.index < this.source.length) {
      const character = this.source[this.index];
      if (["\"", "'", "`"].includes(character)) {
        this.index = skipQuoted(this.source, this.index);
        continue;
      }
      if (character === "{") braces += 1;
      if (character === "}") {
        if (braces === 0 && brackets === 0 && parentheses === 0) return;
        braces -= 1;
      }
      if (character === "[") brackets += 1;
      if (character === "]") {
        if (braces === 0 && brackets === 0 && parentheses === 0) return;
        brackets -= 1;
      }
      if (character === "(") parentheses += 1;
      if (character === ")") parentheses -= 1;
      if (character === "," && braces === 0 && brackets === 0 && parentheses === 0) {
        return;
      }
      this.index += 1;
    }
  }

  array() {
    const values = [];
    this.index += 1;
    while (this.index < this.source.length) {
      this.skipSpace();
      if (this.source[this.index] === "]") {
        this.index += 1;
        return values;
      }
      const value = this.value();
      values.push(value === UNRESOLVED ? null : value);
      this.skipSpace();
      if (this.source[this.index] === ",") this.index += 1;
    }
    return UNRESOLVED;
  }

  object() {
    const value = {};
    this.index += 1;
    while (this.index < this.source.length) {
      this.skipSpace();
      if (this.source[this.index] === "}") {
        this.index += 1;
        return value;
      }
      const key = ["\"", "'"].includes(this.source[this.index])
        ? this.string()
        : this.identifier();
      this.skipSpace();
      if (key === undefined || key === UNRESOLVED || this.source[this.index] !== ":") {
        this.skipUnknown();
      } else {
        this.index += 1;
        const item = this.value();
        if (item !== UNRESOLVED) value[key] = item;
      }
      this.skipSpace();
      if (this.source[this.index] === ",") this.index += 1;
    }
    return UNRESOLVED;
  }

  value() {
    this.skipSpace();
    const character = this.source[this.index];
    if (["\"", "'"].includes(character)) return this.string();
    if (character === "{") return this.object();
    if (character === "[") return this.array();
    const number = this.source.slice(this.index).match(/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      this.index += number[0].length;
      return Number(number[0]);
    }
    const identifier = this.identifier();
    if (identifier === "true") return true;
    if (identifier === "false") return false;
    if (identifier === "null") return null;
    this.skipUnknown();
    return UNRESOLVED;
  }
}

function displayedArguments(source) {
  const parser = new DisplayedLiteralParser(source);
  const value = parser.value();
  return value === UNRESOLVED || value === null || Array.isArray(value) ? {} : value;
}

export function displayedActionCalls(source) {
  if (typeof source !== "string") {
    throw new TypeError("Visual call chain must be a string.");
  }
  const trimmed = source.trim();
  if (!trimmed.endsWith(";")) {
    throw new TypeError("Visual call chain must end with a semicolon.");
  }
  let hasEarlierStatementEnd = false;
  for (let index = 0; index < trimmed.length - 1; index += 1) {
    if (["\"", "'", "`"].includes(trimmed[index])) {
      index = skipQuoted(trimmed, index) - 1;
    } else if (trimmed[index] === ";") {
      hasEarlierStatementEnd = true;
      break;
    }
  }
  if (hasEarlierStatementEnd) {
    throw new TypeError("Visual call chain must contain one expression statement.");
  }
  const calls = [];
  for (let index = 0; index < trimmed.length;) {
    if (["\"", "'", "`"].includes(trimmed[index])) {
      index = skipQuoted(trimmed, index);
      continue;
    }
    const dotted = trimmed[index] === ".";
    const start = dotted ? index + 1 : index;
    const match = trimmed.slice(start).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
    if (!match) {
      index += 1;
      continue;
    }
    let open = start + match[0].length;
    while (/\s/.test(trimmed[open] ?? "")) open += 1;
    if (trimmed[open] !== "(") {
      index = open;
      continue;
    }
    const close = closingParenthesis(trimmed, open);
    const operation = match[0];
    if (dotted || ["hconcat", "vconcat"].includes(operation)) {
      calls.push({
        op: operation,
        args: displayedArguments(trimmed.slice(open + 1, close))
      });
    }
    index = close + 1;
  }
  if (calls.length === 0) {
    throw new TypeError(
      "Visual call chain must start with chart(), hconcat(), vconcat(), or a program variable."
    );
  }
  return calls;
}

export function displayedActionOperations(source) {
  return displayedActionCalls(source).map(call => call.op);
}

function assertSummarySubset(displayed, traced, path) {
  for (const [key, value] of Object.entries(displayed)) {
    assert.equal(Object.hasOwn(traced, key), true, `${path}.${key} is missing from trace args`);
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      assertSummarySubset(value, traced[key], `${path}.${key}`);
    } else {
      assert.deepEqual(traced[key], value, `${path}.${key}`);
    }
  }
}

export function assertDisplayedProgram(variant, program) {
  const displayed = displayedActionCalls(variant.callChain);
  const traced = program.trace.children;
  const startsFromExistingProgram = /^[A-Za-z][A-Za-z0-9]*\s*\./.test(
    variant.callChain.trim()
  );
  const relevantTrace = startsFromExistingProgram
    ? traced.slice(-displayed.length)
    : traced;
  assert.deepEqual(
    displayed.map(call => call.op),
    relevantTrace.map(node => node.op),
    `${variant.chart}/${variant.variant} displayed action flow`
  );
  for (const [index, call] of displayed.entries()) {
    assertSummarySubset(
      summarizeArgs(call.args),
      relevantTrace[index].args ?? {},
      `${variant.chart}/${variant.variant}/${call.op}`
    );
  }
}

function renderOptions(variant, kind) {
  const shared = {
    width: variant.width,
    height: variant.height,
    colors: variant.colors,
    regions: variant.regions,
    visualSignature: variant.visualSignature
  };
  if (variant.artifact) {
    return {
      ...shared,
      artifact: {
        ...variant.artifact,
        chart: variant.chart,
        variant: variant.variant,
        kind,
        title: variant.title,
        userFacingCallChain: variant.callChain
      }
    };
  }
  return {
    ...shared,
    name: kind === "primitive"
      ? `${variant.chart}-primitives`
      : variant.chart
  };
}

export function registerVisualVariantTests(variants) {
  for (const variant of variants) {
    test(`renders ${variant.chart}/${variant.variant}`, async () => {
      const primitive = variant.primitive();
      if (variant.userFacing !== undefined) {
        const userFacing = variant.userFacing();
        if (variant.artifact) assertDisplayedProgram(variant, userFacing);
        const [primitiveResult, userFacingResult] = await Promise.all([
          assertRenderedPNG(
            primitive,
            renderOptions(variant, "primitive")
          ),
          assertRenderedPNG(
            userFacing,
            renderOptions(variant, "user-facing")
          )
        ]);
        assert.equal(userFacingResult.pixelHash, primitiveResult.pixelHash);
      } else {
        await assertRenderedPNG(
          primitive,
          renderOptions(variant, "primitive")
        );
      }
    });
  }
}
