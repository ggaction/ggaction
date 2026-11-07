import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const files = ["column-codec", "numeric-columns", "numeric-geographic-transport", "legacy-geographic-transport", "resource-scope", "explicit-capacity", "envelope-codec"].map(name => `test/unit/animation/${name}.test.js`);
const coverage = process.argv.includes("--coverage") ? ["--experimental-test-coverage", "--test-coverage-include=src/animation/columnCodec.js", "--test-coverage-include=src/animation/numericColumns.js", "--test-coverage-lines=95", "--test-coverage-branches=90", "--test-coverage-functions=100"] : [];
const result = spawnSync(process.execPath, ["--test", ...coverage, ...files], {cwd:root, stdio:"inherit"});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
