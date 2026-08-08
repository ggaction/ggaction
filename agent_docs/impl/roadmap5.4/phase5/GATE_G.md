# Gate R54-P5-G — Full Evaluation Precheck Failure Decision

## Gate state

`changes-requested`

Canonical evidence: [`FULL_PRECHECK.md`](./FULL_PRECHECK.md).

## 현재 결론

사용자가 권장한 38 tasks × A/B/C/D × 2 repetitions 범위를 구현하기 전에 strict executable precheck를 추가했다. Knowledge
route 152 / 152는 통과했지만 complete evaluator는 19 / 38만 통과했다. Supported program은 7 / 26만 실행됐으므로 exact
paid plan을 동결하거나 약 `$21.888` expected spend를 요청할 수 없다.

현재까지 이 Gate 준비에서 credential reads / external calls / spend는 0 / 0 / `$0`다.

## Options

### A — Runtime closure를 제품과 평가 양쪽에서 수리하고 fresh final corpus를 만든다 (recommended)

1. 현재 38개 task는 runtime-closure development set으로만 사용한다.
2. Resolver가 facade ownership, field semantics, target ID와 derived-resource handoff를 반영해 26 / 26 supported task의 complete
   program을 실행하도록 authoring composition을 고친다.
3. Full evaluator는 public action/trace alias를 명시적으로 정규화하고 Canvas/SVG/PNG/PDF output을 실제로 검증한다.
4. Current 38-task development precheck를 38 / 38로 만든 뒤 새로운 query/dataset/program oracle을 가진 fresh final corpus를
   별도로 동결한다. Current failures를 본 뒤 만든 final task와 문구가 겹치지 않는지 검사한다.
5. 새 candidate는 unpaid validation을 통과한 뒤 representative paid smoke부터 다시 실행한다. v4 smoke 승인을 새 candidate에
   재사용하지 않는다.
6. 새 smoke가 유효하면 그때 exact full run count, expected/max cost와 hard cap을 별도 approval checkpoint로 준비한다.

장점은 실제 LLM authoring utility와 네 renderer를 올바르게 검증한다는 점이다. 단점은 product candidate와 final corpus가 바뀌므로
Roadmap 5.4가 한 repair cycle 더 필요하고, paid smoke 승인도 다시 받아야 한다.

### B — Current 38 tasks를 그대로 negative paid evaluation한다

현재 incomplete packet/oracle을 유지하고 304 runs를 실행한다. 실패 원인이 product와 evaluator에 섞여 결과를 해석할 수 없으므로
권장하지 않는다.

### C — 현재 실행되는 7개 supported task만 평가한다

비용은 줄지만 결과를 본 뒤 통과 task만 선택하는 selection bias가 생기고 action-family coverage를 잃는다. 권장하지 않는다.

### D — Roadmap 5.4를 non-integration으로 종료한다

v4 smoke의 compact 12 / 12 positive signal과 full precheck failure를 함께 최종 evidence로 보존하고 product를 main에 통합하지
않는다. 추가 비용은 없다.

## Recommended Option A acceptance

- Current v1 precheck oracle/hash와 19 failures immutable
- Existing v4 plan/progress/result immutable
- Current 38-task runtime development closure 38 / 38
- Supported 26 / 26 executable complete programs; unsupported/open 12 / 12 exact decisions
- Canvas/SVG/PNG/PDF concrete output validation과 renderer immutability
- Direct/local-MCP byte equality와 explicit-fallback route 유지
- Fresh final authoring corpus에 current/prior paid query overlap 0
- Full contract/package/browser/docs regression gates 유지
- Repair 동안 credential reads / external calls / spend 0 / 0 / `$0`
- New candidate, representative smoke scope/cost와 별도 approval checkpoint

## Approval effect

Option A 승인은 runtime-closure product repair, strict full evaluator, fresh final corpus와 무비용 검증만 연다. Credential read,
external model call, additional spend, v4 retry, replacement paid smoke, full paid evaluation, PR, merge, publish, deploy와 release는
열지 않는다.

## 승인 전 차단 범위

- Product packet runtime-composition repair
- Fresh final code-authoring corpus
- Credential read, external call과 spend
- Replacement smoke와 full evaluation
- PR, merge, publish, deploy와 release
