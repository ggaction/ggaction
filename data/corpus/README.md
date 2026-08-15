# Dataset corpus

This directory owns the metadata for ggaction's deterministic real-data and
edge-case chart corpus. `manifest.json` is the canonical catalog.

## Real-data corpus

The real-data portion contains exactly 50 distinct CSV source tables from 50
different TidyTuesday weeks (2018 through 2024), all pinned to one immutable
upstream commit. Together the sources contain 466,483 rows, 52,694,271 bytes,
and a deliberately varied mix of temporal, categorical, multivariate,
geographic, missing, high-cardinality, Unicode, skewed, and extreme data.

Each entry records:

- the exact upstream blob URL, path, byte length, row count, and SHA-256 digest;
- an explicit schema for every source column, including measured missingness,
  cardinality, numeric range, label, description, and unit where meaningful;
- semantic field roles and an authentic primary chart mapping, so an identifier
  is never silently treated as a measure;
- the TidyTuesday week, immutable README, upstream source, and license status;
- either all source rows or a deterministic 1,024-row sample that retains raw
  row indexes, endpoints, numeric extrema, and low-cardinality group witnesses.

`sourceRowIndex` is zero-based over data records and excludes the CSV header.

No synthetic rows are added. Derived analytical views do not count as separate
datasets. Raw source files are downloaded only into
`.artifacts/datasets/tidytuesday/`, which is gitignored and excluded from the
npm package.

Run `npm run datasets:sync` to fetch and verify all 50 sources. Individual IDs
can be supplied to `scripts/sync-dataset-corpus.js` when only part of the corpus
is needed.

## Edge-case zoo

The `zoo` entries name compact deterministic generators in
`test/support/datasets/zoo.js`. They isolate numerical, temporal, categorical,
statistical, and layout edge cases. They remain separate from the 50-source
real-data quota.

## Rights

The TidyTuesday repository is CC0-1.0, but that repository aggregates data from
many upstream sources whose rights may differ. Only two selected weeks state a
specific source-data license in their pinned metadata; all other entries are
explicitly marked `not-stated`. See `THIRD_PARTY_NOTICES.md` before sharing raw
source files outside the local test cache.
