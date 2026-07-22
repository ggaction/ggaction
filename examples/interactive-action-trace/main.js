import { render } from "../../src/index.js";

import { createInteractiveActionTrace } from "./program.js";

const stages = createInteractiveActionTrace();
const canvas = document.querySelector("#chart");
const context = canvas.getContext("2d");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
let index = 0;

function traceLines(node, prefix = "") {
  return node.children.flatMap((child, childIndex) => {
    const final = childIndex === node.children.length - 1;
    const line = `${prefix}${final ? "└─" : "├─"} ${child.op}`;
    const nested = traceLines(child, `${prefix}${final ? "   " : "│  "}`);
    return [line, ...nested];
  });
}

function resourceCount(program, key) {
  return program.semanticSpec[key]?.length ?? 0;
}

function publishState(stage, program) {
  window.__ggactionInteractiveTrace = Object.freeze({
    step: index,
    stepId: stage.id,
    steps: stages.length,
    datasets: resourceCount(program, "datasets"),
    layers: resourceCount(program, "layers"),
    graphics: Object.keys(program.graphicSpec.objects).length
  });
}

function update() {
  const stage = stages[index];
  const { program } = stage;
  render(program, context);
  document.querySelector("#step-label").textContent = stage.label;
  document.querySelector("#step-count").textContent = `${index + 1} / ${stages.length}`;
  document.querySelector("#datasets").textContent = resourceCount(program, "datasets");
  document.querySelector("#layers").textContent = resourceCount(program, "layers");
  document.querySelector("#graphics").textContent =
    Object.keys(program.graphicSpec.objects).length;
  document.querySelector("#trace").textContent =
    ["program", ...traceLines(program.trace)].join("\n");
  document.querySelector("#action-code").textContent = stage.code;
  previousButton.disabled = index === 0;
  nextButton.disabled = index === stages.length - 1;
  nextButton.textContent = index === stages.length - 1 ? "Complete" : "Next action";
  document.querySelector("#status").textContent = `Ready: ${stage.label}`;
  publishState(stage, program);
}

function move(offset) {
  const nextIndex = Math.max(0, Math.min(stages.length - 1, index + offset));
  if (nextIndex === index) return;
  index = nextIndex;
  update();
}

previousButton.addEventListener("click", () => move(-1));
nextButton.addEventListener("click", () => move(1));
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
});

update();
