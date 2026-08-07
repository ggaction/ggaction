# Gate R53-P6-H — Complete Corrective B/C Evaluation

## Gate state

`approved`

Approved by the user on 2026-08-07.

Failed evaluation evidence and the non-integration decision were approved by the user on 2026-08-07.

Candidate behavior checkpoint: `e88fbea9761ddc46268c400be1af280e838b71a2`

Gate G approval checkpoint: `839aea46`

Proposal checkpoint: `7cd462dd`

Full-evaluation guard checkpoint: `ca680ab6`

Result evidence checkpoint: `6b506463`

Gate H closeout checkpoint: `d88e2b5d`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

Gate G에서 첫 제출 실행 가능성을 확인한 동일 candidate를 frozen 24-task corpus 전체에서 두 번씩 평가한다.
Condition B 48회를 먼저 끝내고 infrastructure evidence를 확인한 뒤 Condition C 48회를 실행한다.

```text
24 tasks × 2 repetitions
  → Condition B: 48 runs
  → infrastructure checkpoint
  → Condition C: 48 runs
  → frozen A/B/C acceptance report
  → stop and review
```

Gate G의 smoke 두 건은 전체 평가에 재사용하지 않는다. 동일한 deterministic order와 완전한 48-run denominator를
보존하기 위해 `cars-scatter-origin-r1`도 새 isolated root에서 다시 실행한다.

## Exact scope

| 항목 | 고정값 |
| --- | --- |
| Corpus | frozen 24 tasks: authoring 12, held-out 12 |
| Repetitions | task당 2회 |
| Conditions | B 48회, 그 뒤 C 48회 |
| Maximum paid runs | 96 |
| Order seed | `roadmap5.3-eval-v1` |
| Candidate metadata | `e88fbea9761ddc46268c400be1af280e838b71a2` |
| New isolated output root | `.artifacts/llm-eval/executable-recipe-full-e88fbea9/` |
| Historical A | Phase 0의 frozen 48-run current-doc baseline |

Frozen input digests:

- Evaluation plan: `c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671`
- Corpus: `1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1`
- Generated knowledge: `eba175e202473c54202e0f5be6f988064efd2ba0790c46b8218119e758a254bf`
- Knowledge search index: `58fdde3a8069cb207cdef655b0dbe0a08a1adc055ab314c6646451caaa54ca52`
- Public recipe document: `f94e5b3197c1ade2b1da4b2aca8a59820e5384a5202ad252a77e0ceba722fe92`

기존 실패 결과와 `LLM_COMPARISON.*`는 수정하거나 덮어쓰지 않는다. 새 raw result와 corrected comparison report는
별도 경로와 파일에서 생성한다.

## Model과 평가 설정

- Responses API, exact model `gpt-5.6-terra`
- Reasoning effort `medium`, standard reasoning mode
- Text verbosity `low`, service tier `default`, `store: false`
- Task당 model call 최대 3회
- C task당 실제 MCP knowledge call 최대 8회
- Task당 timeout 180초
- Call당 output 최대 5,000 tokens
- Task당 cumulative input/output ceiling 24,000 / 8,000 tokens
- Built-in paid tools, Fast mode와 Regional processing 사용 금지
- Task, dataset, oracle, prompt, score와 acceptance threshold 변경 금지

Official model page는 `gpt-5.6-terra`가 Responses API와 function calling을 지원한다고 명시한다. 현재 Standard
short-context 가격은 1M tokens당 input $2.00, cached input $0.20, cache write $2.50, output $12.00이다.

## 비용 제안

| 근거 | B | C | 합계 |
| --- | ---: | ---: | ---: |
| Gate G 1-run actual | $0.0134217 | $0.0113674 | $0.0247891 |
| Gate G actual × 48 | $0.6442416 | $0.5456352 | $1.1898768 |
| 이전 48-run actual | $0.7954062 | $0.7293418 | $1.5247480 |
| Conservative planning estimate: $0.025/run | **$1.20** | **$1.20** | **$2.40** |
| Proposed hard cap | **$3.00** | **$3.00** | **$6.00** |

과거 96회와 Gate G 모두 run당 $0.025보다 낮았다. 가장 높았던 과거 개별 run도 $0.0207272였으므로 planning
estimate는 그보다 약 20.6% 높은 단가를 모든 run에 적용한다. Frozen token ceiling을 최고 단가로 모두 사용하는
계산상 maximum은 run당 $0.156, condition당 $7.488, 합계 $14.976이지만 그 금액을 승인받지 않는다. 실제 비용이
관측 범위를 크게 벗어나면 $3/$6 hard cap에서 멈추고 원인을 검토한다.

Gate G 속도를 단순 환산한 model 실행 시간은 약 14분이다. 파일 검증과 renderer overhead를 포함한 운영 예상은
약 15~30분이며, 개별 task의 180초 timeout은 유지한다.

## 승인 뒤 먼저 추가할 무과금 guard

1. Candidate, 96-run scope, order, frozen hashes, 새 output root와 $3/$6 cap을 별도 exact plan으로 고정한다.
2. 최초 실행에서는 output root가 이미 존재하면 credential을 읽기 전에 거부한다. 이후 중단 복구는 승인된 runner가
   생성한 부분 결과만 exact run ID와 hash를 검증한 뒤 resume할 수 있다.
3. B와 C 모든 result를 append-only로 보존하고 매 run 뒤 비용·model identity·call count를 확인한다.
4. Hash/model mismatch, budget exhaustion 또는 잘못된 output state는 즉시 중단한다.
5. Provider error나 timeout이 3회 연속 발생하면 중단한다. 일반적인 invalid program은 benchmark 결과이므로 숨기거나
   조기 제외하지 않고 계속 기록한다.
6. B 48회 완료 뒤 run count, unique ID, model, hashes, spend와 sanitized evidence를 확인한다. Infrastructure fault가
   있을 때는 C를 시작하지 않는다. Correctness가 낮다는 이유만으로 frozen comparison을 조기 중단하지 않는다.
7. Mocked cap/stop/resume/B→C sequence, credential-before-guard rejection과 candidate-aware summary를 테스트한다.
8. Focused/full tests와 generated/package checks가 통과한 guard checkpoint를 commit·push한 뒤에만 API를 실행한다.

## 최종 판정

Phase 0의 acceptance contract를 그대로 적용한다.

- Primary decision은 held-out A 대비 C correctness다.
- C final correctness는 A보다 2 percentage points 넘게 낮아지면 안 된다.
- A first-pass correctness가 90% 미만이므로 C는 최소 10 percentage points 개선해야 한다.
- C final correctness는 B보다 2 percentage points 넘게 낮아지면 안 된다.
- 성공 chart median 기준 total tokens 20%, model calls 20%, time-to-valid 15% 감소 중 최소 두 개를 통과한다.
- 통과하지 못한 나머지 efficiency metric도 A보다 5% 넘게 나빠지면 안 된다.
- Authoring, held-out와 overall 결과, failure distribution, token/call/time/cost를 모두 함께 공개한다.

현재 search → read → submit 경로는 A와 같이 3 model calls를 사용하므로 model-call 20% 감소는 기대하기 어렵다.
따라서 practical pass를 위해서는 성공 chart의 token 20% 감소와 time-to-valid 15% 감소를 모두 달성해야 한다.

Threshold를 통과해야만 branch를 integration candidate로 제안하고 LLM-friendly benefit을 주장할 수 있다. 실패하면
결과를 그대로 봉인하고 non-integration 또는 다음 교정을 제안한다.

## 승인 효과

명시적으로 승인하면 위 full-evaluation guard의 무과금 구현·검증과, guard checkpoint push 뒤 B 48회와 C 48회의
Responses API 실행을 합계 **$6 hard cap** 안에서 허용한다.

승인은 corrected comparison 결과 자체의 승인이나 PR/merge를 뜻하지 않는다. 실행 뒤 이 Gate를
`ready-for-review`로 다시 제출하고 멈춘다.

사용자는 위 범위와 합계 $6 hard cap을 승인했다. Full-evaluation guard checkpoint가 push되기 전에는 API를
실행하지 않는다.

## 실행 전 guard 증거

- Exact full-plan SHA-256: `4ff7726b0e0019b6dd0e87864c42dcad2b8792af4b8dc2dab3f200db67230a3c`
- Focused full-evaluation guard: **6 / 6 passed**
- `npm test`: **2,115 / 2,115 passed**
- `knowledge:check`, `docs:metadata:check`, `docs:search:check`: passed
- `package:check`: passed
- Output root absent before checkpoint: confirmed
- External model calls and additional spend during guard implementation: **0**

## 계속 차단되는 범위

- Corrected A/B/C result에 근거한 benefit claim
- PR preparation/Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 실행 결과 — 2026-08-07

Guard checkpoint `ca680ab6`과 evidence checkpoint `f72a7c5e`를 push한 뒤 B 48회와 C 48회를 exact deterministic
order로 실행했다. 두 condition 모두 완료됐고 model/provider/budget infrastructure failure는 없었다.

| 항목 | Condition B | Condition C |
| --- | ---: | ---: |
| Runs | 48 | 48 |
| First-pass / final valid | 2 / 2 | 2 / 2 |
| Final correctness | 4.17% | 4.17% |
| Held-out final correctness | 0% | 0% |
| Failure categories | 19 invalid, 27 runtime | 46 runtime |
| Model calls | 144 | 144 |
| MCP calls | 0 | 144 |
| Total tokens | 362,050 | 306,752 |
| Actual cost | $0.7649018 | $0.8986558 |

- Actual combined spend: **$1.6635576** / approved $6
- Successful task: B/C 모두 `cars-scatter-origin`의 `r1`, `r2`만 통과
- Resolved model: 모든 run이 정확히 `gpt-5.6-terra`
- Provider, timeout, budget failures: **0**
- Successful Canvas evidence: 4개, 모두 1280 × 800 non-empty PNG
- Final frozen acceptance: **FAILED**

Primary held-out final correctness는 A 20.83%에서 C 0%로 20.83 percentage points 낮아져 최대 2pp regression guard를
통과하지 못했다. Overall final correctness도 A 35.42%에서 C 4.17%로 낮아졌다. 성공한 두 scatterplot의 token
56.87%와 time-to-valid 35.71% 감소는 efficiency threshold를 통과했지만 correctness failure를 상쇄하지 않는다.

## 실패 원인

92개 실패 중 73개가 제출 뒤 runtime error였고, 그중 66개가 존재하지 않는 `renderCanvas`, `renderToCanvas` 또는
`renderPDF` import였다. Generated 33개 recipe 중 정확한 `chart, render` import와 Canvas invocation을 모두 제공하는
recipe는 Gate F에서 교정한 `scatterplot` 하나뿐이며, 이것이 유일한 성공 task와 일치한다.

B는 19회에서 세 번째 model call을 추가 탐색에 사용해 제출하지 못했다. C는 48회 모두 MCP resource read 뒤
제출했으므로 local MCP route는 submission 전환을 개선했지만, incomplete recipe의 runtime API 추측을 해결하지는
못했다.

상세 분석은 [`CORRECTED_FAILURE_ANALYSIS.md`](./CORRECTED_FAILURE_ANALYSIS.md), aggregate와 sanitized task evidence는
[`LLM_CORRECTED_COMPARISON.md`](./LLM_CORRECTED_COMPARISON.md)와
[`LLM_CORRECTED_COMPARISON.json`](./LLM_CORRECTED_COMPARISON.json)이 소유한다.

## 봉인된 증거

- Output root: `.artifacts/llm-eval/executable-recipe-full-e88fbea9/`
- Evidence files: 276
- Evidence-tree digest: `5dd3f5ce698c8af0e3b6c45a887b898ef5f6c69d7e95bd949baf93a64b2e7a36`
- Manifest: `642ff704e0c2c73722b74c3a6b6fae17137ca55e056bb7dce2b8378765da2781`
- B raw result: `091c139bdc2c0ed31d5c8b1e1848fb3895adac9a0c724dc6b72a4a7fbd151ffd`
- C raw result: `97e35c048a177d7124311e8ec88afe64880d034dae89092012e4ce8841be52a8`
- Corrected comparison JSON: `27a6bdd559d1c7cc3c8b2af47de666b9c78a6c6140b73be32ac8977ab391eb81`
- Corrected comparison Markdown: `989c9253d9b5a6087b9de2d0af242288a6c0abb36dc9cf813b2e8b9f9cd42e09`
- Sanitized trace/result/validation credential and raw-response scan: passed

## Review decision

Candidate는 acceptance threshold를 통과하지 못했다. 사용자는 failed evidence와 non-integration 판정을 승인했으며,
Gate H는 실패 결과를 숨기거나 기준을 바꾸지 않은 채 `approved`로 닫혔다. 이 승인은 candidate의 integration, PR,
merge 또는 benefit claim을 허용하지 않는다. 추가 correction은 별도 계획과 승인 없이는 시작하지 않는다.

## 공식 근거

- Model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Pricing: <https://developers.openai.com/api/docs/pricing>
