# Gate R52-P4-A — Supported CI, Compatible Dependencies, and Browser Bundle Budgets

## Gate state

`planned`

## Review target

1. Release workflow의 first-party actions가 supported Node 24 revisions를 사용한다.
2. Exact annotated tag, single reviewed artifact, protected publish와 Pages dependency chain이 유지된다.
3. Compatible direct/transitive dependencies가 갱신되고 production/full audit가 0이다.
4. Vite와 `es-module-lexer` major update는 근거와 함께 명시적으로 연기된다.
5. Installed `ggaction/basic` minimal Vite consumer가 120,000-byte gzip ceiling 이하이다.
6. Full/basic/SVG ceiling은 225,000/120,000/25,000으로 executable source와 docs가 일치한다.
7. Existing public API, program state, action trace, package entries와 renderer pixels는 바뀌지 않는다.

## Required evidence

- Official action release/runtime evidence and focused release-workflow contract
- Exact direct/transitive dependency diff and npm production/full audits
- Focused native, browser, package and TypeScript compatibility results
- Installed full/basic/SVG minified/gzip measurements
- Basic public capability/export parity and existing semantic/trace evidence
- Cumulative normal, coverage, documentation, package and renderer suites
- Verified remote checkpoint on `origin/codex/roadmap5-2-hardening`

## Approval effect

Approval freezes the supported workflow, dependency set and browser bundle ceilings and opens Phase 5 integration and
closeout. It does not authorize PR creation, merge, publish, documentation deployment or release.

## Work blocked before approval

- Phase 5 integration/closeout and R52-Exit
- PR creation, merge, package publish, documentation deployment and release

## Remote checkpoint

- Pending verified implementation commit and push.
