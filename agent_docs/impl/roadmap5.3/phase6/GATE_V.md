# Gate R53-P6-V — Full 17-Task A/B/C/D Paired Evaluation

## Gate state

`approved`

사용자가 2026-08-08 별도 비용 승인을 했고 exact guarded evaluation을 실행했다. 실행은 136 / 136 runs를 안전하게
완료하고 `$3.5252135`를 사용했다. C와 D는 correctness guards를 통과했지만 efficiency threshold를 0 / 3 통과해 final
acceptance가 모두 실패했다. Raw identity, 분석과 non-integration decision은
[`PAIRED_FULL_EVALUATION_ANALYSIS.md`](./PAIRED_FULL_EVALUATION_ANALYSIS.md)에 고정한다. 이 승인으로 추가 유료 실행이나
PR/merge/publish/deploy를 허용하지 않는다.

## 한눈에 보는 제안

Gate U에서 마지막 pilot correctness failure가 A/B/C/D 모두 닫혔다. Gate V는 frozen generalization corpus 전체를 작업별
두 번씩 실행해 current docs(A), structured direct(B), local MCP(C), docs + MCP(D)를 비교하는 최종 paid evaluation이다.

- Scope: **17 tasks × 4 conditions × 2 repetitions = 136 runs**
- Expected spend: **$4.50**
- Hard spend cap: **$32.00 combined**
- Maximum external model calls: **816**
- Credential reads / external model calls / additional spend at proposal time: **0 / 0 / $0**

결과를 확인한 뒤 corpus, prompt, oracle, 조건, threshold 또는 성공한 pair의 분모를 바꾸지 않는다. Gate V가 통과해야만
Roadmap 5.3의 LLM-friendly benefit과 PR integration을 제안할 수 있다.

## 1. Immutable full-evaluation candidate

| 항목 | 고정 값 |
| --- | --- |
| Candidate commit | `13c40bd4` |
| Generalization corpus | 17 tasks |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation snapshot | 125 files / 1,392,320 bytes |
| Documentation SHA-256 | `f9f24236cafdcea990ae20a345e88d6df3adda11fe3e004f7f3735365e37b033` |
| Installed npm artifact | 417 entries / 530,492 packed bytes / 3,607,659 unpacked bytes |
| Installed package SHA-256 | `933302604d9b11aba8568f2d4cd0fb0425228863fde0a33874fc85c907e9e42d` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |

Approval artifact에는 candidate의 full SHA `13c40bd4722b8b9ab60abc6fc0e7dfdc7108d85f`를 사용한다. Paid runner는 candidate
이후 `GATE_V.md`, Phase 6 `GOAL.md`와 Roadmap Gate index만 달라질 수 있게 강제한다. Source MCP 실행은 금지하고 위
candidate에서 만든 exact installed package만 사용한다. Output은 비어 있는 새
`.artifacts/llm-eval/paired-pilot/` child에만 기록한다.

## 2. Complete unpaid evidence

| Commit | 확인 대상 |
| --- | --- |
| `90b4a815` | Bottom multi-legend correction, search routing, measured failure diagnostics와 Gate U guard |
| `fdbc4a0b` | Gate U 4 / 4 first-submission confirmation과 immutable result audit |
| `3a23a1b6` | 17 tasks × A/B/C/D × 2 repetitions, 136-run exact guard |
| `0ef6448d` | Phase 0 correctness rule와 task-level median token/call/time-to-valid 판정 |
| `13c40bd4` | 136 runs를 모두 마친 뒤에만 final `acceptance.json`을 쓰는 boundary |

무과금 evidence:

- `npm test`: **2,176 / 2,176 pass**
- Focused paired evaluator/summary/guard: **19 / 19 pass**
- Documentation suite: **45 / 45 pass**
- Frozen generalization corpus: **17 tasks**, exact SHA match
- `knowledge:check`, docs search drift check와 installed-package MCP check: pass
- Installed direct payload와 actual MCP protocol payload: byte equality pass
- Gate S/T/U raw artifacts와 result hashes: preserved
- Checked-in plan: `unpaid-validation-only`, credential/external call/spend `false / false / $0`

## 3. Exact model and pricing envelope

Gate S/T/U와 동일하게 exact `gpt-5.6-terra`, Responses API, reasoning `medium`, text verbosity `low`, service tier
`default`, store `false`를 사용한다. Standard short-context rate는 1M tokens당 uncached input `$2.00`, cached input
`$0.20`, cache write `$2.50`, output `$12.00`으로 고정한다. 실행 직전 official availability나 단가가 달라졌으면 승인된
evaluation을 시작하지 않고 새 비용 Gate를 만든다.

- Latest-model guide: <https://developers.openai.com/api/docs/guides/latest-model.md>
- API pricing: <https://developers.openai.com/api/docs/pricing>

## 4. Exact conditions

| Condition | Model-visible knowledge | 해석 |
| --- | --- | --- |
| A | Pinned public documentation only | Current-doc control |
| B | Structured knowledge through direct adapter | Structured content result |
| C | B와 byte-equivalent한 structured knowledge through local MCP | Transport-isolated primary candidate |
| D | Pinned docs + local MCP | Recommended product-path candidate |

B/C만 transport effect로 직접 비교한다. A/C는 original Roadmap acceptance의 primary comparison이고 A/D는 실제 권장
product path를 같은 기준으로 독립 판정한다. D를 B/C transport 결과에 섞지 않는다.

## 5. Exact frozen task set

1. `cars-weight-horsepower-sized-scatter`
2. `gapminder-population-life-log-scatter`
3. `imdb-rating-histogram-twelve-bins`
4. `jobs-sex-count-time-series`
5. `nightingale-cause-total-bars`
6. `cars-displacement-rug`
7. `gapminder-fertility-density-clusters`
8. `cars-cylinder-displacement-box-plots`
9. `imdb-rating-title-label-layout`
10. `gapminder-four-measure-parallel-coordinates`
11. `cars-bottom-color-opacity-legends`
12. `jobs-imdb-composed-summary`
13. `nightingale-renderer-parity-bars`
14. `gapminder-brazil-horizon`
15. `cars-high-horsepower-selection`
16. `jobs-year-job-heatmap`
17. `cars-acceleration-origin-violin`

Task prompts, dataset identities와 strict oracles는 corpus SHA가 소유하며 result를 본 뒤 수정하지 않는다.

## 6. Exact repetitions, order and limits

- Repetitions per task: `2`
- Maximum runs: `136`
- Order seed: `r53-p6-v-20260808`
- Maximum model calls per run: `6`
- Natural-call window before forced submission: `3`
- Maximum repair submissions per run: `2`
- Maximum knowledge-tool attempts per run: `3` executed; later attempts are rejected and counted separately
- Timeout per run: `180,000ms`
- Maximum cumulative input/output per run: `36,000 / 12,000 tokens`
- Maximum output per call: `5,000 tokens`

Run order는 각 `condition:taskId:repetition`을
`SHA-256("r53-p6-v-20260808:condition:taskId:repetition")`로 정렬한다. Exact 136-ID JSON array의 SHA-256은
`3db60c341a64ef24f18648859625766c4d5d9de74334591630bb384e5418e038`이다. 전체 ceiling은 model calls `816`,
knowledge attempts `408`, submissions `408`, input `4,896,000`, output `1,632,000` tokens다.

## 7. Expected cost, hard cap and stop rules

같은 model/settings의 Gate S/T/U 28 runs는 합계 약 `$0.8365`, run당 평균 약 `$0.0299`였다. 이를 136 runs로 확장한
약 `$4.06`에 여유를 둬 expected spend를 **$4.50**으로 제안한다. Absolute token ceiling은 다음과 같다.

```text
36,000 × $2.50 / 1M  +  12,000 × $12.00 / 1M  =  $0.234 per run
$0.234 × 136 = $31.824
```

반올림 여유를 포함한 hard cap은 **$32.00 combined**다. Credential read 전 candidate tree, approval, corpus, docs,
installed package, structured surface, direct/MCP byte equivalence와 fresh output root가 하나라도 다르면 비용 없이 중단한다.

External call 뒤 다음 중 하나가 발생하면 전체 evaluation을 즉시 중단하고 새 request를 시작하지 않는다.

1. Resolved model mismatch
2. 다음 request upper bound가 남은 hard cap을 초과
3. Timeout, provider error 또는 complete billable usage 누락
4. Actual cumulative spend가 cap에 도달

Task program이나 strict oracle failure는 그대로 기록하고 scheduled run은 계속하되 임의 retry나 prompt/task/oracle 수정은 하지
않는다. `acceptance.json`은 exact 136 runs를 모두 마친 경우에만 생성한다.

## 8. Predeclared acceptance

### Correctness guards for C

1. C final correctness는 A보다 **2 percentage points 초과 하락하지 않는다**.
2. A first-submission correctness가 90% 미만이면 C는 A보다 **최소 10 percentage points 개선**한다.
3. A first-submission correctness가 90% 이상이면 C는 A보다 **2 percentage points 초과 하락하지 않는다**.
4. C final correctness는 B보다 **2 percentage points 초과 하락하지 않는다**.

### Task-level paired efficiency for C

A와 C가 같은 task/repetition에서 둘 다 성공한 pair만 사용한다. Repetition별 reduction을 task 안에서 평균한 뒤 17개 task의
median을 계산한다. 다음 세 threshold 중 최소 두 개를 통과해야 한다.

- Total tokens: **20% 이상 감소**
- Model calls: **20% 이상 감소**
- Time-to-valid: **15% 이상 감소**

나머지 metric도 A보다 **5% 초과 악화되면 실패**다. Failed pair는 효율 분모에서 제외하지만 correctness denominator와
failure cost에는 그대로 남긴다. Task-level uncertainty, paired coverage와 제외된 failure 수도 함께 보고한다.

### D product-path decision

D는 A를 상대로 같은 final/first-submission correctness와 task-level efficiency rule을 독립 적용한다. C의 primary acceptance와
D의 product-path acceptance를 각각 기록한다. D가 실패하면 docs + MCP benefit을 주장하지 않는다.

### Integrity guards

- Exact **136 / 136** runs와 A/B/C/D 각 34 results
- Retrieval route/identity와 모든 submission source/SHA/validation/renderer artifact 보존
- `knowledgeToolCalls = executed + rejected`, executed ceiling 준수와 complete usage accounting
- B/C model-visible surface와 같은 input operation의 byte equality
- C/D installed-package MCP session과 actual protocol-operation accounting

## 9. Separate approval requested

승인 시 local approval artifact는 다음 exact 값을 가져야 한다. `gateRecordCommit`은 이 문서를 포함해 push된 exact Gate V
commit이다.

- Schema: `1`
- Gate/status: `R53-P6-V / approved`
- Candidate: `13c40bd4722b8b9ab60abc6fc0e7dfdc7108d85f`
- Corpus SHA-256: `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c`
- Conditions: exact `A, B, C, D`
- Task IDs: 위 17개 exact ordered IDs
- Repetitions / maximum runs: `2 / 136`
- Hard spend cap: **`$32.00 combined`**
- Credential reads allowed / external model calls allowed: explicit `true / true`
- Order seed: `r53-p6-v-20260808`

이 승인은 위 full paired evaluation만 허용한다. PR preparation, merge, package publish, docs deployment와 release는 포함하지
않는다.
