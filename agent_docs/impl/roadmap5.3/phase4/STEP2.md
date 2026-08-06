# STEP 2 — Unify the Local Evaluation Harness

## 진행 상태

- [x] Extract one condition-neutral model/tool/evaluation loop without changing Condition A semantics
- [x] Keep current-doc A and structured-knowledge B behind explicit adapters
- [x] Enforce identical task/model/token/call/time/evaluator/oracle settings across conditions
- [x] Add B search/read tool contracts and bounded call accounting
- [x] Run 24-task synthetic dry runs and representative mocked A/B repair flows
- [x] Verify result schema, deterministic order, no credential output and zero paid calls
- [x] R53-P4-A Gate package commit/push

## 실행 순서

1. Existing Condition A runner에서 provider call, submit/evaluate/repair와 result assembly를 공통 runner로 추출한다.
2. A adapter는 `search_docs`/`read_doc`, B adapter는 `search_ggaction`/`read_ggaction`만 노출한다.
3. Adapter는 knowledge text와 calls만 바꾸고 program instruction, dataset, evaluator, oracle, budgets를 바꾸지 못하게 한다.
4. Mocked Responses output으로 검색→읽기→program 제출→실패 feedback→수정 성공 흐름을 A/B에서 실행한다.
5. 24 tasks × supported local conditions의 synthetic results가 같은 seeded order와 schema/aggregate를 유지하는지 확인한다.
6. 실제 API runner는 explicit token과 별도 spend authorization 없이는 요청을 시작하지 않는 기존 경계를 유지한다.

## 완료 기준

- Condition A baseline route/commit/mode와 기존 tests가 유지된다.
- Condition B는 generated structured knowledge 밖의 arbitrary file을 읽을 수 없다.
- A/B가 task prompt, datasets, model settings, evaluator와 oracle을 공유한다는 contract가 기계적으로 검증된다.
- Mock/dry run만으로 model tool loop, repair, result validation과 summary가 재현된다.
- MCP implementation과 paid B/C run 없이 R53-P4-A package가 검토 가능하다.

Exact shared-runner 결과와 isolation evidence는 [`HARNESS_REPORT.md`](./HARNESS_REPORT.md)가 소유한다.
