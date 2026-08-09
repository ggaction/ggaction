import { evaluateFullSubmissionV1 } from "./compact-full-evaluator-v1.js";

const rendererContracts = Object.freeze({
  canvas: Object.freeze({
    module: "ggaction",
    renderer: "render",
    parameters: 2,
    sample: "export function renderChart(program, context) { render(program, context); }"
  }),
  svg: Object.freeze({
    module: "ggaction/svg",
    renderer: "renderToSVG",
    parameters: 1,
    sample: "export function renderChart(program) { return renderToSVG(program); }"
  }),
  png: Object.freeze({
    module: "ggaction/png",
    renderer: "renderToPNG",
    parameters: 2,
    sample: "export async function renderChart(program, output) { return renderToPNG(program, { output }); }"
  }),
  pdf: Object.freeze({
    module: "ggaction/pdf",
    renderer: "renderToPDF",
    parameters: 2,
    sample: "export async function renderChart(program, output) { return renderToPDF(program, { output }); }"
  })
});

function contractFailure(renderer, detail) {
  return `renderer-wrapper-contract:${renderer}:${detail}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function executableMask(source) {
  let output = "";
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        output += "\n";
      } else output += " ";
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        output += "  ";
        blockComment = false;
        index += 1;
      } else output += character === "\n" ? "\n" : " ";
      continue;
    }
    if (quote !== null) {
      output += character === "\n" ? "\n" : " ";
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      output += "  ";
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      output += "  ";
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      output += " ";
      continue;
    }
    output += character;
  }
  return output;
}

function functionBoundary(source) {
  const match = /\bexport\s+(?:async\s+)?function\s+renderChart\s*\(\s*([A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*)\s*)?\)\s*\{/gu.exec(executableMask(source));
  if (!match) return null;
  const open = match.index + match[0].lastIndexOf("{");
  let depth = 1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) {
      return {
        parameters: [match[1], ...(match[2] ? [match[2]] : [])],
        body: source.slice(open + 1, index)
      };
    }
  }
  return null;
}

function rendererCallees(source, contract) {
  const module = escapeRegExp(contract.module);
  const renderer = escapeRegExp(contract.renderer);
  const callees = [];
  const namedPattern = new RegExp(
    `\\bimport\\s*\\{([^}]*)\\}\\s*from\\s*["']${module}["']`,
    "gu"
  );
  for (const match of source.matchAll(namedPattern)) {
    for (const entry of match[1].split(",")) {
      const binding = entry.trim().match(new RegExp(`^${renderer}(?:\\s+as\\s+([A-Za-z_$][\\w$]*))?$`, "u"));
      if (binding) callees.push(binding[1] ?? contract.renderer);
    }
  }
  const namespacePattern = new RegExp(
    `\\bimport\\s+\\*\\s+as\\s+([A-Za-z_$][\\w$]*)\\s+from\\s*["']${module}["']`,
    "gu"
  );
  for (const match of source.matchAll(namespacePattern)) {
    callees.push(`${match[1]}.${contract.renderer}`);
  }
  return callees;
}

function dynamicOutputProperty(options, outputParameter) {
  const output = escapeRegExp(outputParameter);
  if (outputParameter === "output" && /(?:^|,)\s*output\s*(?:,|$)/u.test(options)) return true;
  return new RegExp(
    `(?:^|,)\\s*(?:output|["']output["'])\\s*:\\s*${output}\\s*(?:,|$)`,
    "u"
  ).test(options);
}

function validRendererCall(boundary, renderer, callee) {
  const body = executableMask(boundary.body);
  const program = escapeRegExp(boundary.parameters[0]);
  const target = escapeRegExp(callee);
  if (renderer === "canvas") {
    const context = escapeRegExp(boundary.parameters[1]);
    return new RegExp(`\\b${target}\\s*\\(\\s*${program}\\s*,\\s*${context}\\s*\\)`, "u")
      .test(body);
  }
  if (renderer === "svg") {
    return new RegExp(
      `\\breturn\\s+(?:await\\s+)?${target}\\s*\\(\\s*${program}\\s*\\)`,
      "u"
    ).test(body);
  }
  const output = boundary.parameters[1];
  const call = new RegExp(
    `\\breturn\\s+(?:await\\s+)?${target}\\s*\\(\\s*${program}\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)`,
    "u"
  ).exec(body);
  return call !== null && dynamicOutputProperty(call[1], output);
}

export function rendererWrapperFailuresV2(source, renderer) {
  const contract = rendererContracts[renderer];
  if (!contract) {
    return [contractFailure(String(renderer), "unsupported evaluator renderer")];
  }
  if (typeof source !== "string" || source.trim().length === 0) {
    return [contractFailure(renderer, "program source is required")];
  }
  const boundary = functionBoundary(source);
  if (!boundary) {
    return [contractFailure(renderer, "exported renderChart function is required")];
  }
  if (boundary.parameters.length !== contract.parameters) {
    return [contractFailure(
      renderer,
      `renderChart must accept ${contract.parameters} parameters; expected ${contract.sample}`
    )];
  }
  const callees = rendererCallees(source, contract);
  if (callees.length === 0) {
    return [contractFailure(
      renderer,
      `import ${contract.renderer} from ${contract.module}; expected ${contract.sample}`
    )];
  }
  if (!callees.some(callee => validRendererCall(boundary, renderer, callee))) {
    const detail = renderer === "png" || renderer === "pdf"
      ? "the evaluator-supplied output parameter must be passed as { output }; literal paths are forbidden"
      : `renderChart must invoke the required renderer shape; expected ${contract.sample}`;
    return [contractFailure(renderer, detail)];
  }
  return [];
}

export async function evaluateFullSubmissionV2({ submission, task, artifactRoot }) {
  if (task.role === "supported" && submission.status === "program") {
    const failures = rendererWrapperFailuresV2(submission.source, task.expectedRenderer);
    if (failures.length > 0) return { passed: false, failures };
  }
  return evaluateFullSubmissionV1({ submission, task, artifactRoot });
}
