# Gate R53-P6-U — Bottom Multi-Legend A/B/C/D Confirmation

## Gate state

`approved`

사용자가 2026-08-08 별도 비용 승인을 했다. Gate T approval을 재사용하지 않고 이 Gate의 exact local approval
artifact만으로 credential read와 OpenAI Responses API 호출을 허용한다. 승인 기록을 원격 checkpoint로 고정하고 모든
무과금 preflight를 통과하기 전까지 credential을 읽지 않는다.

## 한눈에 보는 제안

Gate T는 scatter와 composition을 A/B/C/D 모두 통과했지만 bottom multi-legend는 4 / 4 실패했다. 원인은 첫
`createLegend`가 이미 plot과 겹쳐 실패한 뒤 나중 `editLegendLayout`으로 복구하려 한 호출 순서와, 다섯 opacity sample이
두 줄로 감겨 블록 높이가 달라진 geometry였다. 이 결과를 소급 변경하지 않고 immediate action execution을 반영한 knowledge,
retrieval과 failure diagnostics를 무과금으로 수정했다. Gate U는 해당 한 작업만 같은 네 조건에서 다시 확인한다.

- Scope: **1 task × 4 conditions × 1 repetition = 4 runs**
- Expected spend: **$0.15**
- Hard spend cap: **$1.00 combined**
- Maximum external model calls: **24**
- Credential reads / external model calls / additional spend at proposal time: **0 / 0 / $0**

이 confirmation은 full 17-task benchmark나 LLM-friendly benefit claim이 아니다. Exact 4 / 4 correctness와 corrected
measurement integrity를 확인하기 위한 좁은 재현 실험이다.

## 1. Immutable corrected candidate

| 항목 | 고정 값 |
| --- | --- |
| Candidate commit | `90b4a815850922fa904d7c8c7ac5b91576e7bec1` |
| Generalization corpus | 17 tasks |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation snapshot | 125 files / 1,392,320 bytes |
| Documentation SHA-256 | `f9f24236cafdcea990ae20a345e88d6df3adda11fe3e004f7f3735365e37b033` |
| Installed npm artifact | 417 entries / 530,492 packed bytes / 3,607,659 unpacked bytes |
| Installed package SHA-256 | `933302604d9b11aba8568f2d4cd0fb0425228863fde0a33874fc85c907e9e42d` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |

Paid runner는 candidate 이후 `GATE_U.md`, Phase 6 `GOAL.md`와 Roadmap Gate index만 달라질 수 있게 강제한다. Source
MCP 실행은 금지하고 위 candidate에서 만든 exact installed package만 사용한다. Output은 비어 있는 새
`.artifacts/llm-eval/paired-pilot/` child에만 기록한다.

## 2. Correction package and unpaid evidence

| Commit | 확인 대상 |
| --- | --- |
| `32eee952` | 640×400 canvas, bottom margin 120, create-time offset 69와 3-column color/3-sample opacity legend guidance |
| `96740b3e` | Failed legend validation의 measured bounds/gaps를 다음 repair call과 immutable artifacts에 전달 |
| `8e07c254` | Compound color+opacity legend intent를 structured direct/MCP search 1위 recipe로 routing |
| `5be79c12` | Top/bottom multi-legend intent를 pinned docs의 exact section으로 routing |
| `90b4a815` | Gate U-only task/condition/order/cost guard와 exact execution candidate |

무과금 evidence:

- `npm test`: **2,174 / 2,174 pass**
- Documentation suite: **45 / 45 pass**
- Focused Gate guard/evaluator tests: **13 / 13 pass**
- Frozen generalization corpus: **17 tasks**, exact SHA match
- `knowledge:check`, docs search drift check와 installed-package MCP check: pass
- Direct payload와 actual MCP protocol payload: byte equality pass
- Gate T raw results와 immutable failure analysis: preserved

## 3. Exact model and pricing envelope

Gate T와 동일하게 exact `gpt-5.6-terra`, Responses API, reasoning `medium`, text verbosity `low`, service tier
`default`, store `false`를 사용한다. Standard short-context rate는 1M tokens당 uncached input `$2.00`, cached input
`$0.20`, cache write `$2.50`, output `$12.00`으로 고정한다. 실행 직전 official availability나 단가가 달라졌으면 승인된
confirmation을 시작하지 않고 새 비용 Gate를 만든다.

- Latest-model guide: <https://developers.openai.com/api/docs/guides/latest-model.md>
- API pricing: <https://developers.openai.com/api/docs/pricing>

## 4. Exact conditions and task

| Condition | Model-visible knowledge |
| --- | --- |
| A | Pinned public documentation only |
| B | Structured knowledge through direct adapter |
| C | B와 byte-equivalent한 structured knowledge through local MCP |
| D | Pinned docs + local MCP |

Exact task는 `cars-bottom-color-opacity-legends` 하나다. B/C만 transport isolation으로 직접 비교하고 A/C와 A/D는
product-path diagnostic으로 분리한다.

## 5. Exact order and limits

- Repetitions per task: `1`
- Maximum runs: `4`
- Order seed: `r53-p6-u-20260808`
- Maximum model calls per run: `6`
- Natural-call window before forced submission: `3`
- Maximum repair submissions per run: `2`
- Maximum knowledge-tool attempts per run: `3` executed; later attempts are rejected and counted separately
- Timeout per run: `180,000ms`
- Maximum cumulative input/output per run: `36,000 / 12,000 tokens`
- Maximum output per call: `5,000 tokens`

Deterministic order:

1. `C:cars-bottom-color-opacity-legends:r1`
2. `D:cars-bottom-color-opacity-legends:r1`
3. `B:cars-bottom-color-opacity-legends:r1`
4. `A:cars-bottom-color-opacity-legends:r1`

## 6. Cost and stop rules

Gate T의 네 legend runs actual spend는 약 `$0.1486529`였다. 이를 근거로 expected spend를 **$0.15**로 두되,
correction의 효과를 비용 감소로 미리 가정하지 않는다. Absolute token ceiling은 이전 confirmation과 같다.

```text
36,000 × $2.50 / 1M  +  12,000 × $12.00 / 1M  =  $0.234 per run
$0.234 × 4 = $0.936
```

반올림 여유를 포함한 hard cap은 **$1.00 combined**다. Credential read 전 candidate tree, approval, corpus, docs,
installed package, structured surface, direct/MCP byte equivalence와 fresh output root가 하나라도 다르면 비용 없이 중단한다.

External call 뒤 다음 중 하나가 발생하면 전체 confirmation을 즉시 중단하고 새 request를 시작하지 않는다.

1. Resolved model mismatch
2. 다음 request upper bound가 남은 hard cap을 초과
3. Timeout, provider error 또는 complete billable usage 누락
4. Actual cumulative spend가 cap에 도달

Strict oracle failure는 그대로 기록하고 scheduled run은 계속하되 임의 retry나 prompt/task/oracle 수정은 하지 않는다.

## 7. Confirmation acceptance

Gate U 통과 조건은 모두 충족해야 한다.

1. Safety stop 없이 exact **4 / 4 runs** 완료
2. Exact **4 / 4 finalValid**와 strict legend validations 모두 통과: count, position, order, title, symbol,
   label gap, inter-block gap과 plot offset
3. A/B/C/D retrieval이 모두 성공으로 집계되고 올바른 docs route 또는 structured identity가 trace에 남음
4. `knowledgeToolCalls = executed + rejected`, executed는 run당 3 이하이며 모든 usage accounting이 완전함
5. 모든 submission source/SHA, bounded failure diagnostics, validation과 renderer artifact가 덮어쓰기 없이 보존
6. B/C model-visible payload byte equality와 actual MCP protocol-operation accounting 유지

First-submission correctness도 별도로 보고하지만 repair를 포함한 final 4 / 4가 acceptance 기준이다. 하나라도 실패하면 full
benchmark나 benefit claim으로 넘어가지 않고 raw failure를 분석한다. 통과해도 1 repetition만으로 효율 향상을 주장하지 않는다.

## 8. Separate approval requested

승인 시 local approval artifact는 다음 exact 값을 가져야 한다. `gateRecordCommit`은 이 문서를 포함해 push된 exact Gate U
commit이다.

- Schema: `1`
- Gate/status: `R53-P6-U / approved`
- Candidate: `90b4a815850922fa904d7c8c7ac5b91576e7bec1`
- Corpus SHA-256: `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c`
- Conditions: exact `A, B, C, D`
- Task IDs: exact `cars-bottom-color-opacity-legends`
- Repetitions / maximum runs: `1 / 4`
- Hard spend cap: **`$1.00 combined`**
- Credential reads allowed / external model calls allowed: explicit `true / true`
- Order seed: `r53-p6-u-20260808`

이 승인은 위 네-run confirmation만 허용한다. PR preparation, merge, full paid benchmark, package publish, docs deployment와
release는 포함하지 않는다.
