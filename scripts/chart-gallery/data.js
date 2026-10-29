import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tidyTuesdaySourceRows } from "../../test/support/datasets/tidytuesday.js";
const root = new URL("../../", import.meta.url);
const corpus = JSON.parse(readFileSync(new URL("data/corpus/manifest.json", root)));
export const palette = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#e11d48", "#0891b2", "#ca8a04", "#64748b", "#db2777", "#84cc16", "#7c3aed"];

export function source(id, name, origin) {
  const definition = corpus.datasets.find(item => item.id === id);
  if (!definition) throw new Error(`Unknown gallery dataset: ${id}`);
  return { rows: tidyTuesdaySourceRows(id), provenance: {
    name, origin, url: definition.blobUrl, sha256: definition.sha256,
    sourceRows: definition.rows, snapshot: corpus.tidyTuesday.commit
  } };
}

export function localSource(filename, name) {
  const bytes = readFileSync(new URL(`data/${filename}`, root));
  const rows = JSON.parse(bytes);
  return { rows, provenance: { name, sourceRows: rows.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    repositoryPath: `data/${filename}` } };
}

export const repositoryRoot = fileURLToPath(root);

export function snapshotSource(filename) {
  const manifest = JSON.parse(readFileSync(new URL("./data/manifest.json", import.meta.url)));
  const provenance = manifest[filename];
  if (!provenance) throw new Error(`Unknown gallery snapshot: ${filename}`);
  const bytes = readFileSync(new URL(`./data/${filename}`, import.meta.url));
  if (createHash("sha256").update(bytes).digest("hex") !== provenance.sha256) throw new Error(`Gallery snapshot hash mismatch: ${filename}`);
  return {value: JSON.parse(bytes), provenance};
}
