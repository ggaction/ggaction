# Gate R53-P6-H — Complete Corrective B/C Evaluation

## Gate state

`approved`

Approved by the user on 2026-08-07.

Candidate behavior checkpoint: `e88fbea9761ddc46268c400be1af280e838b71a2`

Gate G approval checkpoint: `839aea46`

Proposal checkpoint: `7cd462dd`

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

## 계속 차단되는 범위

- Corrected A/B/C result와 benefit claim의 사전 승인
- PR preparation/Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 공식 근거

- Model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Pricing: <https://developers.openai.com/api/docs/pricing>
