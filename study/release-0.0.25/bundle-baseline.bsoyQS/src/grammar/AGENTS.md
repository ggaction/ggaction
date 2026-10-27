# Grammar Instructions

Apply these instructions to pure semantic, coordinate, scale, transform, and statistical computation.

- Grammar modules are pure: they accept explicit values and return deterministic values without mutating a `ChartProgram`, creating trace nodes, or issuing backend operations.
- Give every coordinate projection and scale mapping policy one owner. All marks and guides must reuse it for normalization, mapping, clamping, reversal, discretization, and fallback behavior.
- The action that introduces a semantic concept owns its inference, validation, and storage. Downstream grammar consumes the stored decision rather than repairing or re-inferring it.
- Treat user domains and ranges, fields, grouping, transforms, and statistical intent as semantic. Keep Canvas styling and concrete primitive coordinates out of grammar state.
- Compute domains and aggregates at the final visual grouping grain, not at an earlier grain that omits grouping, stacking, binning, or another supported semantic role.
- Resolve missing and invalid values once at the final semantic item grain. A fallback must be topology-safe for that grain; otherwise reject or omit the complete item consistently across consumers.
- Keep source datasets immutable. Filtering, aggregation, parameter edits, and other transformations create deterministic derived datasets or revisions and preserve reproducible provenance.
- Statistical provenance records source data, transform type, input and output fields, grouping, method, and every resolved parameter that affects results.
- Normalize one coupled statistical policy once and share the immutable result across all related outputs.
- Produce deterministic derived-data order. Unless a transform defines another order, preserve groups by first source appearance and use a stable explicit order within each group.
- Do not synthesize absent categorical combinations or zero-valued placeholders without an explicit semantic completion policy.
- Use one resolved ordinal domain and band geometry as the shared input for every positional consumer.
- Keep exact accepted values, transform behavior, scale precedence, and domain-specific statistical invariants in the owning current contract and executable grammar tests.
