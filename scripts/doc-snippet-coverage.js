import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentationCodeBlocks, documentationPrograms } from "./doc-snippets.js";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function publicSnippetCoverage() {
  async function visit(directory) {
    return (await Promise.all((await readdir(path.join(root, directory), { withFileTypes: true })).filter(entry => !entry.name.startsWith("_") && !["AGENTS.md", "README.md", "llm"].includes(entry.name)).map(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? visit(file) : entry.name.endsWith(".md") ? [file] : [];
    }))).flat();
  }
  const programs = await documentationPrograms();
  const records = [];
  for (const file of ["README.md", ...await visit("docs")]) {
    const source = await readFile(path.join(root, file), "utf8");
    const seen = new Map();
    for (const block of documentationCodeBlocks(source).filter(block => ["js", "javascript"].includes(block.language))) {
      const heading = block.heading.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const ordinal = (seen.get(heading) ?? 0) + 1; seen.set(heading, ordinal);
      const id = `${file}#${heading}:${ordinal}`;
      const program = programs.find(program => path.posix.normalize(`docs/${program.file}`) === file && program.code === block.code);
      const generated = file.startsWith("docs/reference/actions/");
      records.push({ id, file, heading: block.heading, executable: Boolean(program), generated,
        ...(program?.htmlSha256 ? { htmlSha256: program.htmlSha256 } : {}),
        sha256: createHash("sha256").update(block.code).digest("hex") });
    }
  }
  return records;
}

/** Registration and observed execution are deliberately separate counts. */
export function snippetExecutionSummary(records, receipts) {
  const byIdentity = new Map(receipts.map(receipt => [`${path.posix.normalize(`docs/${receipt.file}`)}\0${receipt.sha256}`, receipt]));
  const executed = records.filter(record => {
    const receipt = byIdentity.get(`${record.file}\0${record.sha256}`);
    return record.executable && receipt?.status === "passed" && receipt.htmlSha256 === record.htmlSha256;
  });
  return {
    blocks: records.length,
    registered: records.filter(record => record.executable).length,
    observedPassing: executed.length,
    generatedOnly: records.filter(record => record.generated && !record.executable).length,
    contextual: records.filter(record => !record.generated && !record.executable).length,
    executionRatio: records.length ? executed.length / records.length : 0,
    witnesses: executed.map(record => ({ id: record.id, sha256: record.sha256,
      caseId: byIdentity.get(`${record.file}\0${record.sha256}`).id }))
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.join(root, ".artifacts/test/docs/programs");
  const receipts = await Promise.all((await readdir(directory)).filter(file => file.endsWith(".json")).map(async file => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
  const report = snippetExecutionSummary(await publicSnippetCoverage(), receipts);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}
