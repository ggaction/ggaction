# LLM authoring benchmark v1

This directory contains the compact, reviewable record behind ggaction's
published MCP authoring comparison. It is evidence for one fixed experiment,
not a performance guarantee.

## Design

- 24 fixed chart-authoring tasks
- 2 repetitions
- 3 models: Terra, Luna, and Nano
- 4 knowledge conditions
- 576 total task runs and 48 observations in every model-condition cell
- strict executable-output evaluation; provider failures remain failures

The conditions were:

- `A` — public documentation browsing
- `B` — direct compact task packet
- `C` — local MCP
- `D` — local MCP with bounded documentation fallback

[`summary.json`](./summary.json) records the exact aggregate counts, usage,
cost, latency, model-condition cells, provenance hashes, and limitations used by
the README and documentation. All additive fields can be checked directly from
the 12 balanced cells.

## Raw evidence policy

Per-request provider payloads, generated source, traces, intermediate
checkpoints, and aborted experimental generations are intentionally excluded
from the default branch. They are large execution artifacts rather than product
source.

The raw final result is identified in `summary.json` by its SHA-256 and the
original PR checkpoint commit. This keeps the published claims auditable while
avoiding more than 22 MB of intermediate and duplicated JSON in every clone.
No credentials or secrets are part of either record.

## Interpretation

The strongest supported conclusion is that compact knowledge substantially
improved success and reduced calls and tokens relative to public-documentation
browsing on this task set. The experiment does not establish universal model
rankings or exact transport parity between direct packets and MCP. Provider
conditions, a fixed task set, and two repetitions limit generalization.
