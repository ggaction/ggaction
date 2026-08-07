import { readFile } from "node:fs/promises";

import { loadGeneralizationCorpus, validateGeneralizationManifest } from "./paired-corpus.js";

const loaded = await loadGeneralizationCorpus();
const manifest = JSON.parse(await readFile(
  new URL("../../test/llm/generalization-corpus-manifest.json", import.meta.url),
  "utf8"
));
validateGeneralizationManifest(manifest, loaded);
console.log(JSON.stringify({
  valid: true,
  role: loaded.corpus.role,
  taskCount: loaded.corpus.tasks.length,
  corpusSha256: loaded.sha256
}, null, 2));
