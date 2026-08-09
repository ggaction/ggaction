# Paid Smoke Attempt 5 — Aborted v5 Result

## Immutable identity

| Item | Value |
| --- | --- |
| Authorization | R54-P5-H Option A |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `57d9bb5f2c4973a21f53908b66f87a0da024c916` |
| Plan | `evaluation/compact-authoring-paid-smoke-v5/PLAN.json` |
| Plan SHA-256 | `490612751a1348fdfa9aa08a39a3915f086e96d48d20c8585ef6c3ccf061c90e` |
| Route oracle SHA-256 | `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4` |
| Final progress | `evaluation/compact-authoring-paid-smoke-v5/results/IN_PROGRESS.json` |
| Final progress SHA-256 | `594ff3718551001aa3b4bad2c8b4ffe4e699e2911bc8247c7659383d3f5e943a` |
| Final result | 없음 — stop rule로 중단 |
| Credential reads | 1 |
| Automatic retries | 0 |

## Exact outcome

`final3-03-bars-png:A`를 완료한 뒤 `final3-03-bars-png:B`의 세 번째 model response에서 function call이 0개여서
`provider-failure: expected one function call, received 0` stop rule이 발동했다. 추가 task, retry 또는 plan 수정 없이 즉시
중단했다.

| Metric | Result |
| --- | ---: |
| Completed task-runs | 1 / 32 |
| Passed task-runs | 0 / 1 |
| Aborted run | `final3-03-bars-png:B` |
| Billed model calls | 6 |
| Input tokens | 9,186 |
| Cached input tokens | 4,315 |
| Cache-write tokens | 3,846 |
| Output tokens | 2,525 |
| Reasoning tokens | 1,825 |
| Total tokens | 11,711 |
| Spend | `$0.0428280` |

이 attempt는 A/B/C/D comparison이 아니다. 첫 task의 A 실패와 B 미완료만 관찰했으므로 route superiority, success rate 또는
효율 개선을 계산하지 않는다.

## Observed failures

### A — Public docs baseline

모델은 public docs에서 `/reference/actions/charts-data/#createbarplot` 한 section을 읽고 namespace-style API를 발명했다.
제출 source는 `new ggaction.Canvas(...)`, `ggaction.createBarPlot(...)`, `ggaction.renderPNG(...)`를 사용했고
`TypeError: ggaction.Canvas is not a constructor`로 실패했다.

이 실패는 current public-doc one-read route가 chart action section 하나만으로 complete bootstrap과 renderer contract를 닫지
못한다는 유효한 baseline evidence다. 결과 확인 뒤 search rank, docs 또는 task를 바꾸지 않는다.

### B — Compact direct route

첫 model call은 exact task로 `search_ggaction`을 1회 호출했고, 두 번째 call은 packet의 `chart()`, `createCanvas`, `createData`,
`createScale`, `createBarPlot`과 PNG import를 사용한 program을 제출했다. 그러나 `renderChart(program)` 안에서 packet 예시의
`output: "chart.png"`를 그대로 고정했다. Isolated evaluator는 승인된 artifact output path에만 쓰기를 허용하므로
`Error: Access to this API has been restricted`로 거부했다.

이는 제품의 chart authoring failure로 확정할 수 없다. Packet의 일반 사용자 예시는 고정 output 경로를 제공하지만 paid prompt는
evaluator가 주입하는 output 인자를 명확히 요구하지 않았고, final v3 canonical source는 evaluator 전용 wrapper를 별도로
합성했다. 따라서 compact product contract와 benchmark renderer-wrapper contract 사이의 불일치다.

Evaluator feedback 뒤 세 번째 response는 643 output tokens 중 637 reasoning tokens를 사용했지만 function call을 반환하지 않았다.
Runner는 모든 turn에 `tool_choice: "auto"`를 사용하면서 function call 1개를 강제 기대했으므로 stop rule이 발동했다. 이는 API
transport 오류가 아니라 runner protocol과 허용된 model response shape의 불일치다.

## Causal conclusion

두 독립 문제가 겹쳤다.

1. Paid prompt는 PNG/PDF의 `renderChart(program, output)` signature를 exact하게 제공해야 하고 evaluator는 그 계약만 검증해야
   한다. Product packet의 ordinary `"chart.png"` 예시는 그대로 유지할 수 있다.
2. Knowledge search 뒤 제출 단계와 evaluator feedback 뒤 교정 단계는 `submit_result`를 강제하거나, function call 없는 valid
   response를 명시적으로 처리해야 한다. `tool_choice: "auto"`와 exactly-one-call invariant를 동시에 둘 수 없다.

이 원인 분석은 Attempt 5를 성공으로 재분류하지 않는다. `IN_PROGRESS.json`은 byte-for-byte 보존한다. 새 paid call은 runner/prompt
repair, fresh plan/oracle hash와 별도 replacement approval 없이는 실행하지 않는다.
