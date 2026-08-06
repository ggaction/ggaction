# Gate R53-P6-G — Executable Recipe B/C Paid Smoke

## Gate state

`approved`

Approved by the user on 2026-08-07.

Candidate behavior checkpoint: `e88fbea9761ddc46268c400be1af280e838b71a2`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

Gate F에서 self-contained하게 교정한 `scatterplot` recipe를 같은 frozen task에서 Condition B와 C 각각 정확히 한 번
검증한다. B가 valid하지 않으면 C를 시작하지 않는다.

```text
cars-scatter-origin
  → B one run
  → only if B finalValid: C one run
  → stop and review
```

이번 smoke는 search/MCP transport가 아니라 새 recipe payload가 실제 model의 첫 제출을 executable program으로 바꾸는지
확인한다. Full rerun, PR, merge, publish와 release는 포함하지 않는다.

## Exact scope

| 항목 | 고정값 |
| --- | --- |
| Task | `cars-scatter-origin` |
| Dataset | `cars-v1` |
| Repetition | `r1` only |
| Conditions | B once, then C once only after valid B |
| Maximum runs | 2 |
| Candidate metadata | `e88fbea9761ddc46268c400be1af280e838b71a2` |
| New isolated output root | `.artifacts/llm-eval/executable-recipe-smoke-e88fbea9/` |

Frozen input digests:

- Evaluation plan: `c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671`
- Corpus: `1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1`
- Generated knowledge: `eba175e202473c54202e0f5be6f988064efd2ba0790c46b8218119e758a254bf`
- Knowledge search index: `58fdde3a8069cb207cdef655b0dbe0a08a1adc055ab314c6646451caaa54ca52`
- Public recipe document: `f94e5b3197c1ade2b1da4b2aca8a59820e5384a5202ad252a77e0ceba722fe92`

## Model과 평가 설정

- Responses API
- `gpt-5.6-terra`
- Reasoning effort `medium`, standard reasoning mode
- Text verbosity `low`
- Service tier `default`; Fast, Regional과 built-in paid tools 사용 금지
- `store: false`, `tool_choice: "auto"`
- Run당 model call 최대 3회, C의 MCP knowledge call 최대 8회
- Run당 timeout 180초
- Call당 output 최대 5,000 tokens
- Run당 cumulative input/output ceiling 24,000 / 8,000 tokens
- Task, dataset, oracle, prompt, score와 validation threshold 변경 금지

Official model page는 `gpt-5.6-terra`가 Responses API와 function calling을 지원한다고 명시한다. Official Standard
short-context 가격은 1M tokens당 input $2.00, cached input $0.20, cache write $2.50, output $12.00이다.

## 비용 제안

직전 B/C 실제 실행은 같은 task와 설정에서 합계 $0.0374793이었다. 새 payload 크기 증가를 포함해 run당 $0.025,
합계 **$0.05**를 보수적 expected cost로 둔다.

| 범위 | 비용 |
| --- | ---: |
| B expected | $0.025 |
| C expected | $0.025 |
| Combined expected | **$0.05** |
| B hard cap | $0.10 |
| C hard cap | $0.10 |
| Combined hard cap | **$0.20** |

Frozen token ceiling을 모두 cache-write/output 최고 단가로 계산한 이론상 maximum은 run당 $0.156, 합계 $0.312다.
이번 승인 상한은 그보다 낮다. Runner는 다음 요청의 보수적 최대 비용이 남은 condition/combined cap을 넘으면 해당 요청을
시작하지 않고 `budget-exceeded`로 중단한다.

## 승인 뒤 먼저 추가할 무과금 guard

1. 기존 두 smoke plan과 evidence root는 수정하거나 재사용하지 않는다.
2. Candidate, task, repetition, B→C order, frozen hashes, 새 output root와 $0.10/$0.20 cap을 exact contract로 고정한다.
3. Output root가 비어 있지 않으면 credential을 읽기 전에 거부한다.
4. B의 provider/model/hash/cap/timeout 오류뿐 아니라 `finalValid: false`에서도 C를 시작하지 않는다.
5. Mocked B failure stop과 B-success→C sequence, credential-before-guard rejection을 테스트한다.
6. Focused와 full tests, generated checks가 통과한 guard checkpoint를 commit·push한 뒤에만 API를 실행한다.

## Smoke 통과 조건

1. B와 C 모두 resolved model이 정확히 `gpt-5.6-terra`다.
2. 각 trace가 `search_ggaction → exact scatterplot recipe read → submit_program`을 3회 안에 보인다.
3. B/C 모두 first submission과 final result가 valid하다.
4. Required actions, runtime functions, 7 frozen validations와 non-empty Canvas evidence가 모두 존재한다.
5. B structured read와 C MCP read가 동일 candidate recipe를 사용한다.
6. Condition/combined spend cap과 token/call/time limits를 모두 지킨다.
7. Sanitized trace에 credential, provider raw response, reasoning, complete submitted source나 전체 knowledge source가 없다.

하나라도 실패하면 즉시 결과를 봉인하고 full rerun을 제안하지 않는다. 성공해도 두 run은 전체 48-run correctness 또는
efficiency gain을 입증하지 않으므로 benefit claim은 계속 금지한다.

## 승인 효과

명시적으로 승인하면 위 smoke-only guard의 무과금 구현·검증과, guard checkpoint push 뒤 최대 B/C 각 한 번의 API
실행을 합계 $0.20 hard cap 안에서 허용한다.

이 Gate는 승인되었으며 위 범위만 해제되었다.

## 계속 차단되는 범위

- 48-run B/C full rerun
- Correctness/efficiency benefit claim
- PR preparation/Ready 전환과 merge
- Package publish, docs deployment와 release

## 공식 근거

- Model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Pricing: <https://developers.openai.com/api/docs/pricing>
