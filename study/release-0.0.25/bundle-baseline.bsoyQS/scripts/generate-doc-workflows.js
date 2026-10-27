import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicExamples } from "../examples/registry.js";

const root = fileURLToPath(new URL("../", import.meta.url));
export async function generateDocWorkflows({ check = false } = {}) {
  for (const definition of publicExamples().filter(chart => chart.workflow)) {
    const relative = definition.id === "hierarchical-authoring"
      ? "docs/tutorials/hierarchical-authoring.md"
      : `docs/recipes/${definition.id}.md`;
    const file = path.join(root, relative);
    const source = await readFile(file, "utf8");
    const code = (await readFile(definition.programFile, "utf8")).replace('from "../../src/index.js"', 'from "ggaction"');
    const displayed = `${code.trim()}\n\nconst program = ${definition.createProgram.name}();\nrender(program, document.querySelector("#chart").getContext("2d"));`;
    const body = displayed.replace('from "ggaction";', 'from "ggaction";\nimport { render } from "ggaction";');
    const expected = source.replace(/<!-- workflow-program:start -->[\s\S]*?<!-- workflow-program:end -->/,
      `<!-- workflow-program:start -->\n\n\`\`\`javascript\n${body}\n\`\`\`\n\n<!-- workflow-program:end -->`);
    if (!source.includes("<!-- workflow-program:start -->")) throw new Error(`${relative} needs its canonical program marker.`);
    if (check && expected !== source) throw new Error(`${relative} has a stale canonical program.`);
    if (!check) await writeFile(file, expected);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocWorkflows({ check: process.argv.includes("--check") });
}
