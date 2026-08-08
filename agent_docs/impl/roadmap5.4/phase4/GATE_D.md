# Gate R54-P4-D — Runtime Closure and Paid-Smoke Runner Lock

## Gate state

`approved`

Verified runner checkpoint: `9a51829857fb3682e9084a30809962c5f35fbbd2`.

## 왜 교체 승인이 필요한가

R54-P4-C 승인 뒤, 비용을 쓰기 전에 complex regression task packet을 실제 데이터와 Canvas에서 실행했다. 기존 packet은
`createRegressionData` 뒤의 line mark를 regression facade의 source mark처럼 사용해
`Regression graphic placement requires one source mark layer.`로 실패했다. 호출은 시작하지 않았고 credential도 읽지 않았다.

Resolver는 이제 regression facade가 regression data, line과 confidence band를 함께 소유한다는 hierarchy를 반영한다.
따라서 해당 task는 다음 실행 가능한 plan으로 바뀌었다.

1. `createPointMark`
2. `encodeX`
3. `encodeY`
4. `createRegression`
5. `createAxes`

실제 4-row program에서 point, regression line, confidence band와 Canvas render를 검증했다. 이 수정으로 product candidate
hash가 R54-P4-C와 달라졌으므로, 이전 승인을 새 candidate에 자동 적용하지 않고 이 Gate에서 다시 확인한다.

## Frozen identity

| 항목 | 고정값 |
| --- | --- |
| Product candidate | `b1bb16c600ef0eea80729570b12b96652060644f` |
| Runner checkpoint | `9a51829857fb3682e9084a30809962c5f35fbbd2` |
| Plan | `evaluation/compact-authoring-paid-smoke/PLAN.json` |
| Plan SHA-256 | `95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54` |
| Conditions | A public docs / B compact direct / C local stdio MCP / D MCP-first docs fallback |
| Tasks | 4 |
| Repetitions | condition/task pair당 1 |
| Total task-runs | 16 |
| Maximum Responses API requests | 48; task-run당 최대 3 |

## Exact task matrix

| Task | Stratum | Required renderer | Strict result |
| --- | --- | --- | --- |
| `repair-val-histogram` | simple | SVG | executable histogram program |
| `repair-hold-regression-layers` | complex | Browser Canvas | executable point + regression + band program |
| `policy-hold-pdf-and-jpg` | simple | PDF | `unsupported.jpg`를 숨기지 않는 mixed-output decision |
| `policy-val-3d-jpeg` | complex | none | `unsupported.3d`, `unsupported.jpg`, `renderer.format` exact decision |

Task query가 renderer를 하나로 정하지 않는 regression case에는 모든 condition에 동일하게 Browser Canvas evaluation target을
명시한다. Dataset, system policy, evaluator, limits와 target renderer는 condition 사이에서 바뀌지 않는다.

## Model, limits and spend

| 항목 | 고정값 |
| --- | --- |
| API | OpenAI Responses API |
| Model | `gpt-5.6-terra` |
| Reasoning | `medium` |
| Text verbosity | `low` |
| Service tier | `default` |
| Store | `false` |
| Parallel tool calls | `false` |
| Reasoning replay | `reasoning.encrypted_content` |
| Per-response maximum output | 4,000 tokens |
| Per-task cumulative input/output | 24,000 / 8,000 tokens |
| Per-call timeout | 180 seconds |
| Automatic retry | 없음 |
| Expected total cost | `$1.152` |
| Calculated maximum | `$2.496` |
| Global hard cap | `$3.00` |

Pricing은 R54-P4-C와 동일하게 input `$2.00`, cached input `$0.20`, cache write `$2.50`, output `$12.00` / 1M tokens을
사용한다. Runner는 request JSON의 UTF-8 byte 하나를 token 하나로 보는 보수적 preflight와 provider가 반환한 complete
billing usage를 모두 검사한다. 다음 request가 task envelope 또는 global cap을 넘을 수 있으면 호출 전에 중단한다.

## Runner safety and validity

- Gate state, candidate와 plan hash를 credential read 전에 검사한다.
- Paid entry는 explicit `--api-key-file`만 허용한다. 승인 뒤 사용자가 지정한
  `/Users/hj/Desktop/visualization-autocomplete` 아래의 단일 `TOKEN.txt`를 찾고 한 번만 읽는다. 여러 개면 중단한다.
- Existing `IN_PROGRESS.json` 또는 `RESULT.json`을 덮어쓰지 않는다.
- Condition별 required knowledge route를 실제 사용하지 않으면 정답 source라도 실패시킨다.
- D는 최대 두 fallback resource를 한 model-visible call로 묶되, 각 resource는 실제 local stdio MCP에서 읽는다.
- C의 MCP packet은 direct packet과 byte-equal해야 한다.
- Generated ESM은 allowlisted ggaction import만 허용한다. 별도 Node permission process에서 빈 environment, 10초 execution
  timeout, 128MB heap, no network/child process와 bounded filesystem access로 실행한다.
- Supported result는 exact action trace, caller dataset ownership, concrete ink, renderer output와 renderer immutability를
  검사한다. Unsupported result는 exact renderer/unresolved IDs와 source invention 0을 검사한다.
- Model/service mismatch, incomplete billing fields, provider failure, token envelope 또는 cost cap 위반은 즉시 전체 실행을
  중단한다.

## Unpaid verification

| 검증 | 결과 |
| --- | --- |
| Paid runner focused contracts | 6 / 6 pass |
| A/B/C/D route dry-run | 16 / 16 pass |
| Dry-run credential / external calls / spend | `0 / 0 / $0` |
| Full test suite | 2,091 / 2,091 pass |
| Documentation tests | 45 / 45 pass |
| Package artifact | 419 entries / 421,750 packed / 2,162,487 unpacked bytes; all ceilings pass |
| Installed tarball SHA-256 | `dbe8b0732032abb154cd9bb79f2b60bf3466fb30813b470252622bc55994118a` |
| Installed Node/types/renderers/tutorial/local MCP | pass |
| Browser gzip full/basic/SVG | 222,930 / 112,984 / 5,760 bytes; all ceilings pass |
| Installed MCP cold start | 525 ms; informational |

## Approval effect

승인하면 위 frozen candidate와 plan으로 **16 task-runs, 최대 48 Responses API requests, 최대 `$3.00`**인 paid smoke만
실행할 수 있다. 실행 결과를 본 뒤 full paid evaluation 범위·비용은 별도 Gate에서 제안한다.

승인은 추가 task/repetition, model/settings 변경, automatic retry, full evaluation, PR Ready/merge, package publish,
documentation deployment 또는 release를 열지 않는다.

## 승인 전 차단 범위

- Credential read / external model call / spend: `0 / 0 / $0`
- Phase 5 paid-smoke result
- Full A/B/C/D evaluation와 추가 repetition
- PR Ready/merge, package publish, docs deployment와 release

## Approval record

- 2026-08-08: 사용자가 frozen candidate `b1bb16c6`, plan SHA-256 `95010b28…`, 16 task-runs,
  최대 48 Responses API requests와 `$3.00` hard cap을 명시적으로 승인했다.
- 이 승인은 paid smoke만 열며 full evaluation과 integration/release 범위는 열지 않는다.
