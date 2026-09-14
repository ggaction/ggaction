# Authoring requirement evaluation

Run `npm run benchmark:authoring` from the repository root. The report is written
to `.artifacts/benchmarks/authoring-requirements.json`.

This deterministic resolver evaluation executes proposed public call chains on
fixed positive data and independently checks resulting mark fills, axis text
angles, semantic scale types, facet views, theme/local-style precedence, and
computed data revisions. It records the package version, runtime contract ID,
and SHA-256 hashes of the resolver, taxonomy, cards, and evaluation cases. It reports execution success, requirement
fulfillment, unresolved requests, and false completion separately. An executable
chart with the wrong color is a failure. Unknown or contradictory requirements
must remain explicitly unresolved, even when the partial chart executes.

These fifteen regression cases are not a language-model benchmark, a hidden test
set, or an estimate of performance on arbitrary natural language. No model API
or paid service is called. The historical `llm-authoring-v1` dataset and results
remain unchanged; new model comparisons should use a fresh held-out corpus.
