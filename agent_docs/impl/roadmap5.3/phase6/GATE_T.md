# Gate R53-P6-T — Corrected A/B/C/D Confirmation Pilot

## Gate state

`ready-for-review`

이 문서는 새 비용 승인 제안이다. Gate S approval은 재사용하지 않는다. 사용자가 이 Gate를 별도로 승인해야만 exact local
approval artifact를 만들고 credential을 읽으며 OpenAI Responses API를 호출할 수 있다. Checked-in plan은 계속
`unpaid-validation-only`, credential/external call/spend는 `false / false / $0`이다.

## 한눈에 보는 제안

Gate S의 12 runs는 안전하게 완료됐지만 legend 네 조건과 composition 세 조건이 실패했고 harness accounting 결함도
발견됐다. 그 결과를 소급 변경하지 않고 harness, retrieval, error repair와 delivered knowledge를 무과금으로 수정했다.
Gate T는 같은 세 task와 A/B/C/D를 한 번씩 실행해 correction이 실제 provider 환경에서 닫혔는지만 확인한다.

- Scope: **3 tasks × 4 conditions × 1 repetition = 12 runs**
- Expected spend: **$0.45**
- Hard spend cap: **$3.00 combined**
- Maximum external model calls: **72**
- Credential reads / external model calls / additional spend at proposal time: **0 / 0 / $0**

이 confirmation은 full 17-task benchmark나 LLM-friendly benefit claim이 아니다. Exact 12/12 correctness와 corrected
measurement integrity가 확인된 뒤에만 full-evaluation scope를 별도 Gate로 제안할 수 있다.

## 1. Immutable corrected candidate

| 항목 | 고정 값 |
| --- | --- |
| Candidate commit | `ce24e1b9da7c8603f7d0da9cf390b8adb914a406` |
| Generalization corpus | 17 tasks |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation snapshot | 125 files / 1,390,821 bytes |
| Documentation SHA-256 | `6a0b2c6994df000486a94da588f43a9cd7c2666ea64999717252df6eb8f8cd4e` |
| Installed npm artifact | 417 entries / 529,925 packed bytes / 3,605,397 unpacked bytes |
| Installed package SHA-256 | `fcbf44166872bfcef99d8dcb317f6fe4c726a88354c2019ac6f22c46346855f3` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |

Paid runner는 candidate 이후 `GATE_T.md`, Phase 6 `GOAL.md`와 Roadmap Gate index만 달라질 수 있게 강제한다. Source
MCP 실행은 금지하고 위 candidate에서 만든 exact installed package만 사용한다. Output은 비어 있는 새
`.artifacts/llm-eval/paired-pilot/` child에만 기록한다.

## 2. Correction package

| Commit | 확인 대상 |
| --- | --- |
| `d1dc9d64` | Docs retrieval success, attempted/executed/rejected call accounting, visible 3-call limit, per-submission source와 runtime error |
| `19446ef3` | Compound composition-layout intent를 structured/docs search 1위로 routing하고 facet을 제외 |
| `02d437cc` | Executable bottom two-legend row, offset-aware error, `hconcat/vconcat` package-function guidance |
| `ce24e1b9` | Immutable Gate S analysis, 0-spend checked-in plan과 Gate T-only execution guard |

무과금 evidence:

- `npm test`: **2,170 / 2,170 pass**
- Focused paired evaluator/summary/guard: **16 / 16 pass**
- Recipe and legend focused tests: **21 / 21 pass**
- Documentation suite: **45 / 45 pass**
- Frozen generalization corpus: **17 tasks**, exact SHA match
- `knowledge:check`, docs search drift check와 installed-package MCP check: pass
- Gate S raw manifest/results/summary는 원래 SHA로 보존

## 3. Exact model and pricing envelope

Gate S와 동일하게 exact `gpt-5.6-terra`, Responses API, reasoning `medium`, text verbosity `low`, service tier
`default`, store `false`를 사용한다. Standard short-context rate는 1M tokens당 uncached input `$2.00`, cached input
`$0.20`, cache write `$2.50`, output `$12.00`으로 고정한다. 실행 직전 official availability나 단가가 달라졌으면 승인된
pilot을 시작하지 않고 새 비용 Gate를 만든다.

- Latest-model guide: <https://developers.openai.com/api/docs/guides/latest-model.md>
- API pricing: <https://developers.openai.com/api/docs/pricing>

## 4. Exact conditions and tasks

| Condition | Model-visible knowledge |
| --- | --- |
| A | Pinned public documentation only |
| B | Structured knowledge through direct adapter |
| C | B와 byte-equivalent한 structured knowledge through local MCP |
| D | Pinned docs + local MCP |

Exact tasks:

1. `cars-weight-horsepower-sized-scatter`
2. `cars-bottom-color-opacity-legends`
3. `jobs-imdb-composed-summary`

Scatter는 basic control, bottom legends와 composition은 corrected failure surfaces다. B/C만 transport isolation으로 직접
비교하고 A/C와 A/D는 product-path diagnostic으로 분리한다.

## 5. Exact order and limits

- Repetitions per task: `1`
- Maximum runs: `12`
- Order seed: `r53-p6-t-20260808`
- Maximum model calls per run: `6`
- Natural-call window before forced submission: `3`
- Maximum repair submissions per run: `2`
- Maximum knowledge-tool attempts per run: `3` executed; later attempts are rejected and counted separately
- Timeout per run: `180,000ms`
- Maximum cumulative input/output per run: `36,000 / 12,000 tokens`
- Maximum output per call: `5,000 tokens`

Deterministic order:

1. `B:cars-bottom-color-opacity-legends:r1`
2. `C:jobs-imdb-composed-summary:r1`
3. `D:cars-bottom-color-opacity-legends:r1`
4. `B:jobs-imdb-composed-summary:r1`
5. `B:cars-weight-horsepower-sized-scatter:r1`
6. `A:jobs-imdb-composed-summary:r1`
7. `C:cars-weight-horsepower-sized-scatter:r1`
8. `C:cars-bottom-color-opacity-legends:r1`
9. `A:cars-weight-horsepower-sized-scatter:r1`
10. `D:jobs-imdb-composed-summary:r1`
11. `A:cars-bottom-color-opacity-legends:r1`
12. `D:cars-weight-horsepower-sized-scatter:r1`

## 6. Cost and stop rules

Gate S actual spend는 `$0.3886566`이었다. Corrected routing은 wasted read와 repair를 줄이는 방향이지만 이를 미리 benefit으로
가정하지 않고 expected spend를 **$0.45**로 둔다. Absolute token ceiling은 Gate S와 동일하다.

```text
36,000 × $2.50 / 1M  +  12,000 × $12.00 / 1M  =  $0.234 per run
$0.234 × 12 = $2.808
```

반올림 여유를 포함한 hard cap은 **$3.00 combined**다. Credential read 전 candidate tree, approval, corpus, docs,
installed package, structured surface, direct/MCP byte equivalence와 fresh output root가 하나라도 다르면 비용 없이 중단한다.

External call 뒤 다음 중 하나가 발생하면 전체 pilot을 즉시 중단하고 새 request를 시작하지 않는다.

1. Resolved model mismatch
2. 다음 request upper bound가 남은 hard cap을 초과
3. Timeout, provider error 또는 complete billable usage 누락
4. Actual cumulative spend가 cap에 도달

Task program이나 strict oracle failure는 그대로 기록하고 scheduled run은 계속하되 임의 retry나 prompt/task/oracle 수정은 하지
않는다.

## 7. Confirmation acceptance

Gate T confirmation 통과 조건은 모두 충족해야 한다.

1. Safety stop 없이 exact **12 / 12 runs** 완료
2. Exact **12 / 12 finalValid**, legend **4 / 4**, composition **4 / 4**, scatter **4 / 4**
3. A/B/C/D retrieval이 모두 성공으로 집계되고 docs route와 structured identity가 trace에 남음
4. `knowledgeToolCalls = executed + rejected`, executed는 run당 3 이하
5. 모든 submission source/SHA, bounded runtime error, validation과 renderer artifact가 덮어쓰기 없이 보존
6. B/C model-visible payload byte equality와 actual MCP protocol-operation accounting 유지

하나라도 실패하면 full benchmark나 benefit claim으로 넘어가지 않고 raw failure를 분석한다. 통과해도 이 1-repetition pilot만으로
효율 향상을 주장하지 않으며 full 17-task repetitions와 비용을 별도 승인받는다.

## 8. Separate approval requested

승인 시 local approval artifact는 다음 exact 값을 가져야 한다. `gateRecordCommit`은 이 문서를 포함해 push된 exact Gate T
commit이다.

- Gate/status: `R53-P6-T / approved`
- Candidate: `ce24e1b9da7c8603f7d0da9cf390b8adb914a406`
- Corpus SHA-256: `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c`
- Conditions: exact `A, B, C, D`
- Tasks: 위 3 exact IDs
- Repetitions / maximum runs: `1 / 12`
- Hard spend cap: **`$3.00 combined`**
- Credential read / external model calls: explicit `true / true`
- Order seed: `r53-p6-t-20260808`

이 승인은 confirmation pilot만 허용한다. PR preparation, merge, full paid evaluation, package publish, docs deployment와
release는 포함하지 않는다.
