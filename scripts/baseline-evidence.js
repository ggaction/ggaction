import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleSpecifiers, resolveLocalModule } from "../test/support/module-imports.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const target = path.join(root, "test/charts/baseline-evidence.json");
const relative = file => path.relative(root, file).split(path.sep).join("/");
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
export function baselineEvidence() {
  return walk(path.join(root, "test/charts")).filter(file => file.endsWith("primitive.program.js")).sort().map(file => {
    const queue = [file], visited = new Set(), source = new Set(), oracles = new Set();
    while (queue.length) {
      const current = queue.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      if (relative(current).startsWith("src/")) { source.add(relative(current)); continue; }
      if (relative(current).startsWith("test/oracles/")) oracles.add(relative(current));
      if (!current.endsWith(".js")) continue;
      for (const { specifier } of moduleSpecifiers(readFileSync(current, "utf8"))) {
        if (specifier?.startsWith(".")) queue.push(resolveLocalModule(current, specifier));
      }
    }
    return {
      file: relative(file),
      proof: "primitive-public equivalence; exact same-run graphics and renderer output where asserted by the owning slice",
      independentGeometry: "not inferred from equivalence; consult literal assertions and independent oracle anchors",
      sharedProductionImports: [...source].sort(),
      independentOracleImports: [...oracles].sort()
    };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const content = JSON.stringify(baselineEvidence(), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== content) throw new Error("Refresh baseline evidence with node scripts/baseline-evidence.js");
  } else writeFileSync(target, content);
}
