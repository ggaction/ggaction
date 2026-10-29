import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Copy only authored examples; resolve every library dependency through its public package entry.
export async function copyCompositionRecipeExamples(directory) {
  const files = { marginal: ["program.js", "fixture.js", "selection.js"], bullet: ["program.js", "fixture.js"], "linked-overlay": ["program.js"] };
  for (const [name, names] of Object.entries(files)) {
    const target = path.join(directory, "composition-recipes", name);
    await mkdir(target, { recursive: true });
    for (const file of names) {
      const source = (await readFile(new URL(`../../examples/${name}/${file}`, import.meta.url), "utf8"))
        .replace('"../../src/index.js"', '"ggaction"')
        .replace('"../../src/inspection.js"', '"ggaction/inspection"');
      if (/from\s+["'][^"']*\bsrc\//.test(source)) throw new Error("Recipe examples must use installed public entries.");
      await writeFile(path.join(target, file), source);
    }
  }
}
