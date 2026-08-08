# Complete Paid Evaluation — Failed Unpaid Precheck

## Frozen diagnostic identity

| Item | Value |
| --- | --- |
| Product candidate | `4eb8ce78b705c160394e0a0e0bafc557f54008c0` |
| Proposed source tasks | Repair validation/held-out 30 + policy validation/held-out 8 |
| Route oracle | `evaluation/compact-authoring-full-v1/ROUTE_ORACLE.json` |
| Route oracle SHA-256 | `5bd5372d5cb02559240558e9650d417f221451328253373f2ddb53778ba71bcf` |
| Conditions | A public docs / B compact direct / C local MCP / D explicit fallback |
| Proposed repetitions | 2 |
| Proposed task-runs | 38 × 4 × 2 = 304 |
| Credential reads / external calls / spend | 0 / 0 / `$0` |

## 왜 paid plan을 동결하지 않았는가

R54-P5-G 준비 중 public task packet을 실제 데이터로 조립하고 Canvas/SVG/PNG/PDF까지 실행하는 precheck를 새로 추가했다.
기존 Phase 4 acceptance는 exact constraint/action/option-key, TypeScript call과 packet budget을 검증했지만 complete program의
state-dependent runtime composition과 concrete renderer output은 검증하지 않았다.

새 precheck는 38개 task의 A/B/C/D knowledge route 152개를 모두 비용 없이 통과했다. 그러나 task별 canonical submission을
실행한 38개 evaluator checks 중 19개가 실패했다.

| Role | Tasks | Executable pass | Failure |
| --- | ---: | ---: | ---: |
| Supported program | 26 | 7 | 19 |
| Terminal unsupported | 11 | 11 | 0 |
| Open-only `needs-input` | 1 | 1 | 0 |
| Total | 38 | 19 | 19 |

지원 프로그램에서 통과한 task는 histogram, heatmap, parallel coordinates, point order, tick angle, regression layers와
appearance order 7개다. 실패는 simple 8개, complex 11개에 걸쳐 있어 한 family의 국소 문제가 아니다.

## Exact failure evidence

| Task | First deterministic failure |
| --- | --- |
| `repair-val-base-scatter` | Facade guide 뒤 `createGuides`가 축을 중복 생성 |
| `repair-val-line-style` | 후속 opacity call이 eligible line target을 닫지 못함 |
| `repair-val-ordered-bars` | Bare field call이 nominal bar x type을 닫지 못함 |
| `repair-val-box-interval` | Derived interval과 error-bar target/resource handoff 누락 |
| `repair-val-violin-density` | Density derivation에서 category grouping handoff 누락 |
| `repair-val-gradient-log` | Named scale과 gradient x encoding/axis handoff 누락 |
| `repair-val-density-time` | Density encoding 전 eligible mark/resource 누락 |
| `repair-val-text-layout` | Label layout 전 eligible text layer/target 누락 |
| `repair-val-composition` | Child composition이 drawable child program을 만들지 않음 |
| `repair-val-selection-facet` | Selection/facet target이 eligible mark를 닫지 못함 |
| `repair-hold-area-order` | Bare area position call에 필요한 field semantics 누락 |
| `repair-hold-rule-guides` | Rule position의 required field type 누락 |
| `repair-hold-arc-polar` | Arc theta field semantics가 current contract와 불일치 |
| `repair-hold-rect-bins` | Derived bin resource와 downstream scale/mark handoff 누락 |
| `repair-hold-bar-mark` | Bare bar position의 nominal/aggregate semantics 누락 |
| `repair-hold-transform-line` | Public action ID와 actual trace op alias를 evaluator가 정규화하지 않음 |
| `repair-hold-jitter-legend` | Full renderer fixture의 legend margin envelope 부족 |
| `repair-hold-guide-order` | Ambiguous legend target 누락 |
| `repair-hold-render-order` | Bare bar position의 nominal/aggregate semantics 누락 |

## Root cause

단일 버그가 아니라 세 경계의 합성 문제다.

1. **Corpus boundary:** 기존 fresh corpus는 intent/action/option-key retrieval을 평가하도록 설계됐고, exact concrete field types,
   target IDs, derived-resource handoff와 runnable renderer wrapper를 소유하지 않는다. 이를 그대로 code-authoring final corpus로
   사용하는 것은 oracle이 불완전하다.
2. **Product packet boundary:** Individual card snippets는 type-check하지만 여러 action을 순서대로 합친 `authoring.steps`가
   state-dependent prerequisites, facade ownership, target ambiguity와 derived data provenance를 항상 닫지는 않는다.
3. **Evaluator boundary:** 이전 evaluator는 Canvas/SVG 중심이었고 PNG/PDF wrapper를 실제 출력 magic까지 검증하지 않았다.
   Public action alias와 internal trace op의 차이도 정규화하지 않았다. 새 precheck는 네 renderer를 격리 실행하고 open-only
   decision을 `needs-input`으로 분리하면서 이 누락을 드러냈다.

따라서 현재 38-task oracle로 paid run을 시작하면 product knowledge, incomplete code oracle과 evaluator weakness를 한 결과에
섞게 된다. 304-run plan과 비용 승인을 준비하지 않고 precheck failure에서 중단했다.

## Scientific boundary

- 38개 query와 실패는 이제 runtime-closure development evidence다. 이를 보고 product를 수정한 뒤 같은 task를 final paid
  acceptance로 사용하지 않는다.
- v4 smoke 13 / 16과 그 source/result hashes는 수정하거나 새 candidate에 소급 적용하지 않는다.
- Failed canonical source를 실제 모델 결과로 취급하거나 A/B/C/D correctness에 합산하지 않는다.
- Credential을 다시 읽거나 external model을 호출하지 않았다.

다음 선택은 [`GATE_G.md`](./GATE_G.md)가 소유한다.
