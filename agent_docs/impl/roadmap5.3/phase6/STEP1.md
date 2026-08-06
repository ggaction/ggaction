# STEP 1 — Freeze the Final Paid Evaluation Proposal

## 진행 상태

- [x] Compare the current recommended model with the frozen A baseline
- [x] Preserve the exact A model and request settings
- [x] Recalculate expected and hard-cap cost from current official pricing
- [x] Define cap exhaustion and resolved-model mismatch behavior
- [x] Prepare R53-P6-A without making external model calls
- [x] Record R53-P6-A explicit approval

## 결정 근거

현재 general recommendation은 `gpt-5.6-sol`이지만 A 기준선은 `gpt-5.6-terra`로 이미 고정되어 있다. B/C만 Sol로
바꾸면 knowledge 개선과 model 개선을 분리할 수 없다. A까지 Sol로 다시 실행하면 비교는 가능하지만 144 paid run이
필요하고 이미 승인한 기준선을 폐기하게 된다. 따라서 이번 Roadmap의 causal comparison은 Terra를 그대로 유지한다.

가격은 2026-08-06 공식 Standard pricing의 short-context Terra 요율인 1M token당 uncached input $2.00, cached input
$0.20, cache write $2.50, output $12.00을 사용한다. 요청의 service tier는 A와 같은 `default`다.

## 승인 제안

| 항목 | Condition B | Condition C | 합계 |
| --- | ---: | ---: | ---: |
| Tasks × repetitions | 24 × 2 | 24 × 2 | 96 runs |
| Maximum model calls | 144 | 144 | 288 |
| Maximum MCP calls | 0 | 384 | 384 |
| Conservative expected cost | $3.456 | $3.456 | $6.912 |
| Runner hard spend cap | $5.00 | $5.00 | $10.00 |

계산상 task token ceiling을 모든 run이 전부 사용하면 condition당 $7.488이지만, A의 실제 사용량을 현재 요율로
재계산하면 $1.354499였다. $5 cap은 condition별 보수적 예상 $3.456보다 높고 A 재계산액의 약 3.7배다. 그래도 cap을
먼저 소진하면 해당 condition을 즉시 중단하고 추가 비용 승인을 받는다.

## 승인 뒤 실행 순서

1. Machine-readable evaluation plan의 가격과 B/C cap만 승인값으로 동기화한다.
2. B 48회를 실행하고 model identity, token/call/time와 correctness artifact를 보존한다.
3. B가 complete하고 cap 안에 있을 때 C 48회를 실행한다.
4. A/B/C aggregate와 task-level failure를 생성하고 frozen threshold로 판정한다.

실제 유료 호출은 [`GATE_A.md`](./GATE_A.md)의 명시적 승인 뒤에만 시작한다.
