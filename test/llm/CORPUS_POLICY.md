# LLM Evaluation Corpus Policy

`tasks.json` is historical tuning evidence. Its authoring and held-out tasks have been inspected repeatedly, so their results remain useful for regression diagnosis but cannot establish fresh generalization.

`generalization-tasks.json` is the frozen generalization corpus for the current candidate. After any result from this corpus is observed, do not change production knowledge, search aliases, recipes, evaluator prompts, or program oracles for that candidate. A failed candidate ends. A later candidate requires a newly frozen corpus before its outcomes are viewed.

Each task is the independent analysis unit. Repeated runs estimate within-task model variability; they do not create additional independent tasks. Efficiency comparisons use the same task and repetition only when both compared conditions produced a valid final chart. Accuracy, coverage, and failure cost include every run.

Dataset IDs, file hashes, task prompts, required actions, validations, renderers, and the corpus digest are checked mechanically before any paid run.
