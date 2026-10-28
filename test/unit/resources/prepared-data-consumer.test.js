import test from "node:test";
import { cases } from "../../../scripts/consumers/fixtures/node/prepared-data.mjs";

// Exercise the installed-consumer contract against public source exports during
// iteration; release qualification runs the same cases from the packed package.
for (const entry of cases) test(entry.id, entry.run);
