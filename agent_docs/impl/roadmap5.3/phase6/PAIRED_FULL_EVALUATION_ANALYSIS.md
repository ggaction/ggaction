# Roadmap 5.3 Phase 6 — Gate V Full Paired Evaluation Analysis

## 결론

Gate V는 exact **136 / 136 runs**를 안전하게 완료했고 structured knowledge B/C와 docs + MCP D가 docs-only A보다 final
correctness를 20.6 percentage points 높였다. 그러나 사전에 고정한 efficiency acceptance는 C와 D 모두 실패했다.

- C: task-level median total tokens **89.5% 증가**, model calls **12.5% 감소**, time-to-valid **10.9% 감소**
- D: task-level median total tokens **44.0% 증가**, model calls **12.5% 감소**, time-to-valid **5.2% 증가**

세 efficiency threshold 중 C와 D 모두 통과한 항목이 0개이고 token regression은 허용한 5%를 크게 넘었다. 따라서
Roadmap 5.3의 predeclared acceptance는 **실패**다. 이 candidate로 LLM-friendly efficiency benefit을 주장하거나 PR/merge를
제안하지 않는다.

## Immutable execution identity

| 항목 | 값 |
| --- | --- |
| Candidate | `13c40bd4722b8b9ab60abc6fc0e7dfdc7108d85f` |
| Gate record | `959ad1f82cb5fa438543ff468ef1101ed86488d4` |
| Approval SHA-256 | `6fb4d72127f90c17d5c338c5919bfcfa9c20119950ad3da27f03ddf4dbc706fb` |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation SHA-256 | `f9f24236cafdcea990ae20a345e88d6df3adda11fe3e004f7f3735365e37b033` |
| Installed package SHA-256 | `933302604d9b11aba8568f2d4cd0fb0425228863fde0a33874fc85c907e9e42d` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |
| Manifest SHA-256 | `bd885ccf37de35099401bea6a994b29bada37d55427f88e0aa9e234e1cf5f084` |
| Results SHA-256 | `ac58076c8b85508cbbc60fe1d65a0d5f17b3a19db1530ab28e309fddcfc62849` |
| Summary SHA-256 | `2ffd98c6ad039ffca94e4524c72f4c8b92bd029a1a66badb115e90bd36bfef7f` |
| Acceptance SHA-256 | `11c59ace1e2076cbb1d1d022ee7aac8acf23849dbc1134f22486c018617073f0` |
| Complete 761-file artifact-set SHA-256 | `73bb24fbe4db2a56ca784b5a148bacc026c7ea3d659d77f950bf03de675f8a0d` |

Raw artifacts는 `.artifacts/llm-eval/paired-pilot/r53-p6-v-20260808/`에 보존한다. 이 문서는 raw result, summary나
mechanical acceptance를 다시 계산해 결과를 바꾸지 않는다.

## Complete result

| Condition | Final valid | First valid | Model calls | Tokens | Cost | MCP ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A — pinned docs | 25 / 34 (73.5%) | 19 / 34 (55.9%) | 156 | 389,610 | `$0.8314339` | 0 |
| B — structured direct | 32 / 34 (94.1%) | 25 / 34 (73.5%) | 134 | 509,736 | `$0.9456032` | 0 |
| C — local MCP | 32 / 34 (94.1%) | 26 / 34 (76.5%) | 127 | 471,402 | `$0.9151006` | 89 |
| D — docs + local MCP | 32 / 34 (94.1%) | 23 / 34 (67.6%) | 136 | 534,961 | `$0.8330758` | 90 |

전체 실행:

- Completed / final valid / first valid: **136 / 121 / 93**
- Retrieval success: **136 / 136**
- Model calls / submissions / repairs: **553 / 202 / 66**
- Total tokens: **1,905,709**
- Knowledge calls: **359 attempted = 359 executed + 0 rejected**
- Actual MCP operations: **179**
- Spend: **$3.5252135 / $32.00** hard cap
- Provider, timeout, model mismatch, usage와 cap failure: **0**
- Unreported cost upper bound: **$0**

## Mechanical acceptance

### C — primary structured MCP candidate

Correctness guards는 모두 통과했다.

- Final correctness delta versus A: **+20.6pp**
- First-submission correctness delta versus A: **+20.6pp**; required improvement는 +10pp
- Final correctness delta versus B: **0pp**

성공한 A/C pair를 repetition 안에서 task-level로 묶은 median efficiency는 모두 threshold를 놓쳤다.

| Metric | Actual reduction | Required | Result |
| --- | ---: | ---: | --- |
| Total tokens | **-89.5%** | ≥ 20% | fail; 89.5% 증가 |
| Model calls | **12.5%** | ≥ 20% | fail |
| Time-to-valid | **10.9%** | ≥ 15% | fail |

Efficiency threshold pass는 **0 / 3**이고 token은 maximum allowed regression 5%도 통과하지 못했다. Final
`primaryStructuredMcp.accepted`는 `false`다.

### D — recommended docs + MCP path

D도 final correctness +20.6pp와 first-submission required improvement를 통과했다. 그러나 total tokens는 44.0% 늘었고
time-to-valid도 5.2% 늘어 allowed regression 5%를 넘었다. Efficiency threshold pass는 **0 / 3**이고 final
`recommendedDocsPlusMcp.accepted`는 `false`다.

## What improved

A에서 간헐적 또는 반복 실패한 다음 여섯 task family는 B/C/D에서 모두 통과했다.

- Rug distribution
- High-value selection
- Grouped density clusters
- Label layout
- Multi-chart composition
- Heatmap

Bottom multi-legend를 포함한 나머지 corrected pilot surface도 모든 condition과 두 repetition에서 통과했다. Structured knowledge가
복잡한 task의 final correctness를 실제로 높인 것은 분명하다. 다만 correctness 상승만으로 token/call/time 목표를 대체하지
않는다는 사전 규칙을 유지한다.

## Why efficiency failed

### 1. Structured payload가 docs보다 두 배 이상 컸다

Trace에 실제로 반환된 knowledge bytes는 다음과 같다.

| Condition | Mean bytes/run | Median bytes/run | Total bytes |
| --- | ---: | ---: | ---: |
| A | 8,838 | 8,740 | 300,508 |
| B | 19,858 | 18,591 | 675,175 |
| C | 18,847 | 17,793 | 640,781 |
| D | 17,319 | 16,096 | 588,858 |

Structured search는 complete primary resource와 여러 ranked identity를 한 응답에 제공한다. 이것이 retrieval 실패를 줄이고
correctness를 높였지만, 성공한 A/C pair에서도 model input을 크게 늘려 89.5% median token regression을 만들었다. D는 docs와
structured payload를 함께 소비해 중복 context 비용을 피하지 못했다.

### 2. 줄어든 호출 수가 threshold에 못 미쳤다

C는 A보다 평균적으로 적은 model/knowledge call로 더 많은 task를 완료했지만 성공 pair의 task-level median model-call 감소는
12.5%였다. Required 20%를 넘지 못했다. Time-to-valid도 10.9% 감소해 required 15%에 미치지 못했다.

### 3. MCP transport는 원인이 아니다

B와 C는 final correctness가 같은 32 / 34였고 같은 두 log-scale runs만 실패했다. Successful B/C pairs의 task-level median은
tokens **0.07% 감소**, model calls **0%**, time-to-valid **7.0% 감소**였다. Direct/MCP surface와 same-operation payload
byte equality도 유지됐다. 따라서 큰 token regression은 MCP protocol overhead가 아니라 공통 structured content의 크기와
retrieval strategy에서 발생했다.

## Shared log-scale failure

`gapminder-population-life-log-scatter`는 A/B/C/D의 두 repetitions, **8 / 8 모두 실패**했다.

- A docs route는 scatter authoring을 설명했지만 exact `editScale` call을 전달하지 못했다.
- B/C/D search는 legend/scatter recipe를 우선하고 scale-edit action을 primary resource로 찾지 못했다.
- Model은 `transformScale`, `updateScale`, `editXScale`, `setXScale` 같은 없는 method나 `xScale`, `scales`, `channel`,
  `target`, `scale` 같은 잘못된 option을 반복했다.
- D 한 run은 build됐지만 required `createScatterPlot`, `editScale`과 color legend를 잃었다.

이는 transport failure가 아니라 docs와 structured retrieval 모두의 task closure gap이다. 그러나 frozen corpus policy는 이 결과를
본 뒤 production knowledge, search aliases, recipe, prompt나 oracle을 이 candidate에 맞춰 수정하는 것을 금지한다. 따라서
Gate V 결과를 보존하고 현재 Roadmap에서 이 task를 튜닝하지 않는다.

## Decision boundary

Gate V raw result와 predeclared acceptance를 그대로 수용한다.

1. Candidate는 correctness를 높였지만 합의한 efficiency 목표를 충족하지 못했다.
2. Roadmap 5.3 branch를 PR/merge candidate로 제안하지 않고 LLM-friendly benefit을 주장하지 않는다.
3. Frozen corpus 결과를 사용한 추가 knowledge/search tuning이나 같은 corpus paid rerun을 하지 않는다.
4. 향후 재설계가 필요하면 compact result contract, exact action-intent routing과 context deduplication을 새 Roadmap과 새
   generalization corpus에서 다룬다.
5. PR, merge, publish, deploy와 release는 승인되지 않았으며 현재 branch에 남는다.
