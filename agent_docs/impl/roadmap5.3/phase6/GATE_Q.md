# Gate R53-P6-Q — Submit-Ready and Layout-Safe Paid Retry

## Gate state

`ready-for-review`

Proposal checkpoint: pending

Candidate behavior checkpoint: `5606b1d509192006799042a43f76928b03062dc1`

Gate P evidence approval checkpoint: `fb2b511c`

Gate P approval link checkpoint: `137088be`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

Gate N에서 사용한 같은 세 frozen task를 submit-ready/layout-safe recipe candidate로 한 번씩만 재시도한다. Condition B
세 건이 모두 first-pass와 final valid인 경우에만 Condition C 세 건을 실행한다.

```text
B: box plot → composition → renderer parity
  → all three first-pass and final valid?
      no  → stop, seal evidence, C 0 runs
      yes → C: same tasks, same order
              → seal evidence and stop for review
```

이 Gate는 최대 6개 paid smoke run만 제안한다. Frozen 24-task full rerun, benefit claim, PR, merge, publish와 release는
포함하지 않는다.

## 왜 같은 세 task인가

| Task | Gate N 결과 | 이번 candidate에서 확인할 correction |
| --- | --- | --- |
| `cars-box-plot` | 마지막 call이 추가 docs search, no submission | explicit 640×400 Canvas와 margin을 읽고 추가 검색 없이 제출 |
| `composed-dashboard` | replacement bar legend right-margin error | meaningful-legend margin 또는 explicit disabled-legend policy로 child materialization 통과 |
| `renderer-parity` | first-pass/final valid | knowledge correction 뒤에도 Canvas/SVG/PNG/PDF 성공 유지 |

Task, dataset, prompt, oracle와 renderer requirement를 Gate N과 동일하게 유지하므로 correction 전후를 직접 비교할 수 있다.

## Exact scope

| 항목 | 고정값 |
| --- | --- |
| Tasks | `cars-box-plot`, `composed-dashboard`, `renderer-parity` |
| Repetition | 각 task `r1` only |
| Conditions | B 3건, 세 건 모두 통과한 경우에만 C 3건 |
| Deterministic order | 위 task 순서, B 전체 뒤 C 전체 |
| Maximum evaluation runs | 6 |
| Maximum model calls | 18, run당 최대 3 |
| Candidate metadata | `5606b1d509192006799042a43f76928b03062dc1` |
| New isolated output root | `.artifacts/llm-eval/layout-safe-smoke-5606b1d5/` |

Frozen input digests:

- Evaluation plan: `c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671`
- Corpus: `1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1`
- Generated knowledge: `e29dd05976d7eb685184fb391de29ac297a2cb49ea09425a52a28229a073d612`
- Knowledge search index: `215e2cd640c644f929767a8301cb9e859341f617b1f6cb93d3be89211f8a61b7`
- Public recipe document: `ed29100aa47fa25625ae05fc808ef1bc921ad70f55673af355ec789ea1fd1e67`
- Delivered closure manifest: `08f786b7237deef3af583975f425d35e4964353a026aafdaf021a21fe8598d5f`

Historical Gate G/H/K/N plan, hash와 evidence root는 수정하거나 재사용하지 않는다. Gate Q가 승인되면 별도 immutable plan,
runner guard와 새 output root를 만든다.

## Model과 평가 설정

Phase 0과 Gate N의 비교 조건을 그대로 유지한다.

- Responses API, exact model `gpt-5.6-terra`
- Reasoning effort `medium`, standard reasoning mode
- Text verbosity `low`, service tier `default`, `store: false`, `tool_choice: "auto"`
- Fast mode, Regional processing과 built-in paid tools 사용 금지
- Run당 model call 최대 3회, C run당 MCP knowledge call 최대 8회
- Run당 timeout 180초
- Call당 output 최대 5,000 tokens
- Run당 cumulative input/output ceiling 24,000 / 8,000 tokens
- Frozen task, dataset, oracle, prompt, score와 validation threshold 변경 금지

Standard short-context 가격은 1M tokens당 input $2.00, cached input $0.20, cache write $2.50, output $12.00을 사용한다.

## 비용 승인 요청

이전 동일 3-task B 실행 비용은 Gate K `$0.0534576`, Gate N `$0.0516704`였다. 최근 관측값은 B 세 건 합계 약
`$0.052`이며, B/C 여섯 건을 모두 실행하면 단순 환산 약 `$0.104`다. 변동을 포함해 run당 `$0.025`, 최대 6회
`$0.15`를 expected cost로 둔다.

| 범위 | Expected | Hard cap |
| --- | ---: | ---: |
| Condition B, 최대 3 runs | $0.075 | $0.30 |
| Condition C, 최대 3 runs | $0.075 | $0.30 |
| Combined | **$0.15** | **$0.60** |

승인 요청은 combined **$0.60 hard cap**이다. Runner는 다음 request의 보수적 maximum이 condition 또는 combined 잔액을
넘으면 새 request를 시작하지 않고 중단한다.

## 승인 뒤 먼저 만들 무과금 guard

1. Candidate, task order, B→C 조건, frozen hashes, 새 output root와 cap을 별도 plan으로 고정한다.
2. Plan이 approved가 아니면 credential read 전에 거부한다.
3. Output root가 이미 존재하거나 비어 있지 않으면 credential read 전에 거부한다.
4. Historical Gate G/H/K/N paid plan digests가 변경되지 않았음을 고정한다.
5. Candidate knowledge/search/public recipe/closure hash가 바뀌면 credential read 전에 거부한다.
6. B 세 건은 deterministic order로 실행하고 provider/model/hash/cap/timeout 오류에서는 즉시 전체를 중단한다.
7. B 하나라도 first-pass 또는 final invalid이면 B evidence만 봉인하고 C를 실행하지 않는다.
8. B 세 건이 모두 통과할 때만 C 세 건을 같은 순서로 실행하며 C invalid result에서도 남은 요청을 시작하지 않는다.
9. Mocked stop/budget/sequence guard, focused/full/package/MCP checks와 remote checkpoint를 확인한 뒤에만 API를 실행한다.

Guard 구현 중 candidate behavior나 generated knowledge가 바뀌면 이 proposal의 hash가 무효가 되므로 paid execution을 멈추고
다시 제안한다.

## Smoke 통과 조건

1. B/C 최대 6개 result의 resolved model이 정확히 `gpt-5.6-terra`다.
2. 모든 task가 expected primary recipe를 top 1에서 검색한다.
3. Box는 `box-plot` recipe 하나를 읽고 추가 current-doc search 없이 3 calls 안에 제출한다.
4. Box program은 explicit Canvas, Tukey/outlier/color/legend contract와 non-empty Canvas를 모두 통과한다.
5. Composition은 한 search 뒤 `composition`과 `rose-chart`를 같은 response에서 읽고 3 calls 안에 제출한다.
6. Composition program은 모든 child를 materialize하고, 24px gap, primitive rose construction, slot-preserving replacement와
   multi-panel Canvas를 통과한다.
7. Renderer parity는 동일 immutable program의 Canvas/SVG/PNG 2x/one-page vector PDF와 logical dimensions를 통과한다.
8. 모든 실행이 first submission과 final result valid이며 repair round는 0이다.
9. B structured payload와 C installed local MCP payload가 exact candidate source에서 일치한다.
10. Model-call, MCP-call, token, timeout과 spend cap을 모두 지킨다.

하나라도 실패하면 evidence를 그대로 봉인하고 full rerun이나 benefit claim을 제안하지 않는다. 모두 성공해도 세 task 단일
반복은 전체 correctness 또는 efficiency benefit을 일반화하는 근거가 아니다.

## 명시적으로 필요한 승인

Gate Q를 승인하면 다음만 허용된다.

1. Gate Q 전용 무과금 guard 구현·검증과 remote checkpoint
2. Checkpoint 뒤 Condition B 최대 3 paid runs
3. B 세 건이 모두 통과한 경우에만 Condition C 최대 3 paid runs
4. Combined **$0.60 hard cap** 안의 Responses API 호출
5. Sanitized result/evidence 기록과 별도 review 요청

현재는 proposal만 작성했다. Credential read, external model call과 추가 비용은 **0 / 0 / $0**이다.

## 계속 차단되는 범위

- Gate Q 명시적 승인 전 credential read와 paid call
- Frozen 24-task full B/C rerun
- Correctness/efficiency benefit claim
- Historical paid-plan hash 변경
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Approved unpaid evidence: [`GATE_P.md`](./GATE_P.md)
- Previous paid retry and actual cost: [`GATE_N.md`](./GATE_N.md)
- Approved correction contract: [`GATE_O.md`](./GATE_O.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Pricing: <https://developers.openai.com/api/docs/pricing>
