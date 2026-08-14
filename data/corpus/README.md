# Dataset corpus

This directory owns metadata for the deterministic datasets used by ggaction's
combinatorial chart testing.

- `tidytuesday` entries point at immutable upstream blobs. The raw CSV files are
  downloaded only into `.artifacts/datasets/` and are never required by the
  normal offline test suite.
- `zoo` entries name compact deterministic generators in
  `test/support/datasets/zoo.js`. They isolate numerical, temporal, categorical,
  statistical, and layout edge cases.

Run `npm run datasets:sync` before the deep TidyTuesday fuzz suite. Every
download is checked against its byte length, row count, and SHA-256 digest.

TidyTuesday's repository is licensed CC0-1.0, but individual datasets retain
their upstream provenance and may carry additional rights. The cached raw files
are therefore test artifacts rather than redistributed package contents.
