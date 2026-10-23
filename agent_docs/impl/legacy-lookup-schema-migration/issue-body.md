## Reproduction

An editable schema-version-1 snapshot may omit dataset schemas. The documented reader infers/derives missing schemas before final schema validation. A lookup snapshot with two valid raw tables and exact derived rows currently fails with `Lookup dataset "reference" requires schema.` before migration can run.

The cause is the initial `restoreState` validation calling lookup schema derivation unconditionally. Its schema context requires the reference schema that migration is about to infer. Full critical coverage also exposes the unreachable lookup-input schema resolver in `migrateStateSchemas`.

## Fix contract

Keep the existing two-pass import boundary. During the version-1 prepass only, defer lookup schema equality when one of its required schemas is absent. Continue to validate envelope/trace/stack/IDs/references/cycles, raw lookup key uniqueness, typed matching and exact derived row values. Then infer/derive schemas through both input datasets and perform the complete unchanged strict validation. Present malformed or incompatible schemas must remain rejected. Modern editable formats and normal serialization stay strict.

No new public API, persisted format, source-data changes or rendering changes are required. Regressions cover mixed string/number keys, leading-zero copied strings, missing matches, raw row order, both input schemas, editable roundtrip, and tampered values/unknown or cyclic references/duplicate keys/wrong schemas. Keep the 100% critical function-coverage floor.

This is a development-candidate fix; public release remains at the next coordinated 200-family checkpoint.
