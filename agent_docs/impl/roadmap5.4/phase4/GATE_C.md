# Gate R54-P4-C — Policy Acceptance and Exact Paid Smoke

## Gate state

`approved`

Verified Gate checkpoint: `caf066cc35e11e9e80377e0526b29c931dd66c58`.
Approved by the user on 2026-08-08.

## 승인 대상

이 Gate는 approved unsupported-output policy의 independent one-pass acceptance와 Phase 5에서 실행할 exact paid smoke만
승인 대상으로 삼는다. R54-P4-A와 R54-P4-B의 실패 결과는 수정하거나 성공으로 재분류하지 않는다.

승인하면 아래에 고정한 16개 Responses API task-run과 최대 `$3.00` spend만 실행할 수 있다. Full paid evaluation,
추가 task/repetition, model/settings 변경, PR, merge, publish, deploy와 release는 열리지 않는다.

## Approved policy

- Unsupported JPEG/JPG는 `unsupported.jpg`로 명시한다.
- 같은 request에 SVG, PNG, PDF 또는 Browser Canvas가 없으면 `renderer.format`도 unresolved로 반환한다.
- Docs fallback은 `unsupported-capabilities`, `choose-renderer` 순서다.
- 같은 request에 supported renderer가 하나라도 있으면 `renderer.format`과 `choose-renderer`를 추가하지 않는다.

## Frozen identity

| 항목 | 값 |
| --- | --- |
| Corpus | `compact-authoring-policy-v1` |
| Split | development 1 / validation 4 / held-out 4 |
| Stratum | simple 5 / complex 4 |
| Required constraints | 10 |
| Prior/query overlap | 0 |
| Frozen manifest SHA-256 | `00556c96310714a2aef605fb096be8322dc03845b7e8a3d64d28fbb72f7475e4` |
| Query set SHA-256 | `9fbd23a11c71a8dbb78333b828386b96622c24619c4a6c495e6966051094f2a0` |
| Candidate commit | `9206f0c3623c6f6676e70313811e7873ef97b405` |
| Candidate record SHA-256 | `234401b271b00827b236ea09686fc135d997e8f7f4fb8d3a93f94dd743bd100e` |
| Development result SHA-256 | `edf9bddeed1c246627d640c03158914543dbdce86f2e69178e82bfd1b90495f0` |
| Validation result SHA-256 | `d406adfdb5a2dbb688bf113fc48ea6ae0abf92aecd8816891924902ae8577f16` |
| Held-out result SHA-256 | `b7fab01c22cca2276af3667d244bf88e0f8304205d545a29bf53253f26b8093d` |

## One-pass unpaid result

| Split | Exact constraint | Exact plan | Exact unresolved | Exact fallback | 최대 / 중앙 packet bytes | 결과 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Development | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 | 397 / 397 | pass |
| Validation | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 855 / 811 | pass |
| Held-out | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 1,009 / 977 | pass |

모든 split에서 silent partial, resolved fallback, TypeScript error와 failure가 0이다. Candidate lock 뒤 validation과
held-out은 각각 정확히 한 번 실행했고 결과 확인 뒤 tuning 또는 rerun을 하지 않았다.

Original evaluation의 validation 14 / 15 failure와 repair held-out strict failure는 immutable evidence로 남는다. Repair
candidate는 validation과 held-out에서 exact action plan 15 / 15를 각각 통과했고, strict failure가 드러낸 JPEG 의미를
사용자가 policy A로 결정했다. 이 결정을 별도의 fresh 9-task corpus가 위와 같이 검증했으므로 실패 기록을 덮어쓰지 않고
replacement acceptance를 완성한다.

## Regression evidence

- `npm test`: 2,084 / 2,084 pass
- `npm run test:docs`: 45 / 45 pass
- Package: 419 entries / 421,556 packed / 2,161,648 unpacked bytes; ceilings 430 / 450,000 / 2,400,000 이내
- Installed package tarball SHA-256: `70d9e90924549e47201b984918e2c6789e9c75a5a1352b82daea535512fae2b4`
- Installed Node, TypeScript, Canvas, SVG, PNG, PDF, tutorial와 local MCP direct/MCP byte equality: pass
- Browser gzip root/basic/SVG: 222,930 / 112,984 / 5,760 bytes; ceilings 225,000 / 120,000 / 25,000 이내
- Installed MCP cold start: 615 ms

## Exact paid-smoke proposal

### Model and request settings

| 항목 | 고정값 |
| --- | --- |
| API | OpenAI Responses API |
| Model | `gpt-5.6-terra` |
| Mode | standard |
| Reasoning | `medium` |
| Text verbosity | `low` |
| Service tier | `default` |
| Store | `false` |
| Sampling | `temperature`, `top_p`, `seed` 모두 omit |
| Per-response maximum output | 4,000 tokens |
| Per-task cumulative envelope | input 24,000 / output 8,000 tokens |
| Per-task model calls | 최대 3 |
| Per-call timeout | 180 seconds |
| Repetitions | condition/task pair당 1회 |

`gpt-5.6-terra`는 현재 공식 문서가 intelligence/cost balance용으로 설명하는 모델이다. `medium`은 공식 migration
guide의 balanced starting point이며, Roadmap 5.3 baseline과 같은 model role/settings를 유지해 knowledge delivery
차이만 본다. Responses API request는 condition adapter를 제외하고 같은 system policy, task, dataset, evaluator, repair
feedback와 limits를 사용한다.

### Conditions

| Condition | Model에 제공하는 지식 경로 |
| --- | --- |
| A | Public docs search/read only |
| B | In-process compact direct task packet |
| C | B와 byte-equal한 local stdio MCP task packet |
| D | MCP-first; packet이 명시한 unresolved capability에만 public docs fallback |

### Tasks and run count

| Task | Stratum | 역할 |
| --- | --- | --- |
| `repair-val-histogram` | simple | Supported histogram + axes + SVG |
| `repair-hold-regression-layers` | complex | Supported regression + error band + axes |
| `policy-hold-pdf-and-jpg` | simple | Supported PDF와 unsupported JPG가 함께 있는 mixed output |
| `policy-val-3d-jpeg` | complex | Unsupported 3D + JPEG와 missing renderer dual signal |

4 tasks × 4 conditions × 1 repetition = **16 independent task-runs**이다. 이 smoke는 harness, routing, unsupported
handling과 cost accounting을 검증하는 용도이며 statistical superiority를 주장하지 않는다. Supported task는 generated
program의 strict oracle/compile/execute result로, unsupported requirement는 exact unresolved/fallback과 silent invention 0으로
correctness를 판정한다.

### Estimated cost and hard cap

2026-08-08 official Standard short-context price는 `gpt-5.6-terra` input `$2.00`, cached input `$0.20`, cache write
`$2.50`, output `$12.00` / 1M tokens이다.

| 범위 | Input | Output | 계산 |
| --- | ---: | ---: | ---: |
| Task-run당 conservative expected | 12,000 | 4,000 | `$0.024 + $0.048 = $0.072` |
| 16 task-runs expected | 192,000 | 64,000 | **`$1.152`** |
| Task-run당 maximum | 24,000 at cache-write rate | 8,000 | `$0.060 + $0.096 = $0.156` |
| 16 task-runs calculated maximum | 384,000 | 128,000 | **`$2.496`** |

Global hard cap은 **`$3.00`**이다. 계산상 maximum보다 약 20% 높은 값으로 regional uplift와 usage rounding 여유만
제공한다. Runner는 cumulative usage와 official rates로 비용을 기록하고, 다음 request의 남은 input/output envelope를
포함하면 `$3.00`를 넘을 수 있는 경우 그 request를 시작하지 않는다. Model/settings/task/hash mismatch, incomplete billing
usage, provider failure 또는 cap 도달 시 즉시 중단하며 자동 retry, task 대체와 추가 repetition을 금지한다.

공식 근거:

- <https://developers.openai.com/api/docs/guides/latest-model.md>
- <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- <https://developers.openai.com/api/docs/pricing>

## Approval effect

승인은 위 exact 16-run smoke, credential 1회 read와 최대 `$3.00` spend만 연다. 먼저 Phase 5 runner/plan을 무비용으로
고정하고 dry-run과 contract test를 통과시킨 뒤 같은 승인 범위 안에서 외부 호출을 실행한다. 다음 중 하나라도 바뀌면
호출 전에 다시 승인받는다.

- model, reasoning, service tier 또는 response limits
- task identity, condition, repetition 또는 retry policy
- 예상 비용 계산 또는 `$3.00` hard cap
- API credential 위치나 provider

## 승인 전 차단 범위

- Credential read / external model call / spend: `0 / 0 / $0`
- Phase 5 paid smoke result
- Full A/B/C/D evaluation와 추가 repetition
- PR Ready/merge, package publish, docs deployment와 release
