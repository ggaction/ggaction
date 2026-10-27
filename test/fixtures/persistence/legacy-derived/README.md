# Historical derived snapshots

These inputs were captured with the schema-3 writer at commit
`129a506dfd2fc2455b7de949d73fdd6cf34e27a5` (package version `0.0.26`).
The assertions in `test/unit/persistence/legacy-derived.test.js` are independent
of this producer and check concrete preservation and exact contributors.

To reproduce into a temporary directory from the repository root:

```sh
mkdir -p /tmp/ggaction-legacy-producer /tmp/ggaction-legacy-output
git archive 129a506dfd2fc2455b7de949d73fdd6cf34e27a5 src package.json | tar -x -C /tmp/ggaction-legacy-producer
node test/fixtures/persistence/legacy-derived/generate.mjs /tmp/ggaction-legacy-producer /tmp/ggaction-legacy-output
```

Compare the resulting manifest hashes before replacing any committed input.
The producer must use the archived source, since the current writer emits schema 4.
