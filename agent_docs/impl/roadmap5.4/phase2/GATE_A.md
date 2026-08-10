# Gate R54-P2-A — Constraint Resolver and One-Call Task Closure

## Gate state

`approved`

이 Gate는 compact cards를 query에 맞는 ordered task packet으로 조합하는 resolver를 승인받는다. 승인 전에는 MCP,
package/dependency, public docs fallback와 evaluation corpus를 구현하지 않는다.

## 쉽게 보는 결과

Resolver는 query 전체를 하나의 action과 비교하지 않는다. 예를 들어 다음 요청을

> scatter plot with a color legend at bottom as svg

다섯 constraint로 분해한다.

```text
chart.scatter + encoding.color + guide.legend + layout.legend.bottom + renderer.svg
```

`createScatterPlot` 하나가 scatter, color와 legend를 함께 덮으므로 `encodeColor`와 `createLegend`를 중복 호출하지
않는다. 그 뒤 legend layout과 SVG renderer만 남겨 다음 세 단계로 닫는다.

```javascript
program.createScatterPlot({ x: "x", y: "y", color: "category", guides: {} })
program.editLegendLayout({ position: "bottom" })
renderToSVG(program)
```

이 packet은 1,689 bytes다. 같은 방식으로 30개 multi-intent design fixture 중 지원 가능한 28개는 unresolved 없이
닫고, geo와 generic chart처럼 현재 계약만으로 닫을 수 없는 2개는 이유를 명시했다.

## 승인 대상

1. 79 constraints: supported 74, explicit unsupported 5
2. Provider anchor와 multi-constraint coverage를 분리한 set-cover 구조
3. Data/mark/encoding/guide/layout/renderer deterministic order
4. Exact current signature, required option key, typed call과 canonical route를 가진 task packet
5. Recognized constraint가 plan coverage 또는 explicit unresolved 중 정확히 하나를 갖는 policy
6. 6,144-byte maximum, 4,096-byte validation median과 no-truncation failure
7. Phase 3 direct adapter와 MCP가 이 동일 packet serialization을 공유하는 방향

## Coverage and payload evidence

| Metric | Result | Gate requirement |
| --- | ---: | ---: |
| Exact action lookup | 173 / 173 | 173 / 173 |
| Supported semantic constraints | 74 / 74 | 100% |
| Explicit unsupported constraints | 5 / 5 | 100% |
| Providers | 74 | informational |
| Design fixtures | 30 | informational |
| Fully closed design fixtures | 28 / 28 | 100% |
| Expected unresolved fixtures | 2 / 2 | explicit |
| Silent partial constraints | 0 | 0 |
| Type-checked unique calls | 213 | errors 0 |
| Maximum task packet | 1,980 bytes | ≤ 6,144 bytes |
| Median task packet | 1,109 bytes | ≤ 4,096 bytes |
| Candidate identities | ≤ 3 | ≤ 3 |

## Verification

- `node scripts/run-tests.js contracts test/contracts/compact-task-resolver.test.js` — 5 / 5 pass
- `node scripts/run-tests.js contracts` — 175 / 175 pass
- Existing runtime/source/declaration/renderer behavior changes — 0
- Dependency, package export/files surface, public/generated docs changes — 0
- Credential reads, external model calls, spend — 0 / 0 / $0

## Scientific isolation

`knowledge/task-closure-cases.json`은 resolver branch와 packet contract를 검증하기 위해 implementation과 함께 공개된
design fixture다. Roadmap 5.3의 frozen 17 tasks를 읽거나 재사용하지 않았고, Phase 4의 development/validation/held-out
corpus에도 포함하지 않는다. 따라서 이 30개 결과를 final quality 또는 efficiency acceptance 통계로 사용하지 않는다.

## Approval effect

승인은 Phase 3 local stdio MCP, byte-equal direct/MCP adapter, conditional same-package budget, installed read-only boundary와
unresolved-only docs fallback 구현만 연다. Fresh evaluation corpus, credential read, external call, PR/merge/publish/deploy와
release는 승인하지 않는다.

## 승인 전 차단 범위

- MCP executable와 SDK/runtime dependency
- Package `files`, `bin`, exports와 installed artifact 변경
- Public/generated docs와 docs fallback route
- Phase 4 evaluation corpus
- Credential read, external model call와 비용 지출

## Evidence identity

- Implementation review target: `9a7d35c9dec63c5f45a7d86ea4474f1747c8654b`
- Remote branch: `codex/roadmap5-4-compact-knowledge`

## Approval record

- 2026-08-08: 사용자가 implementation review target을 승인하고 Phase 3 구현 진행을 지시했다.
- 이 승인은 Phase 3 범위만 연다. Phase 4 corpus, credential read, external model call과 비용 지출은 계속 차단한다.
