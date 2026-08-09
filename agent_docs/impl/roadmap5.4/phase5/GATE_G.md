# Gate R54-P5-G — Full Evaluation Precheck Failure Decision

## Gate state

`approved`

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
- 기존 supported 후보 26 / 26 runtime closure: executable 21 / 21, terminal unsupported 1 / 1, open decision 4 / 4
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

## Approval record

- 사용자가 2026-08-09에 Option A runtime-closure repair와 fresh final corpus 준비를 명시적으로 승인했다.
- 이 승인은 product packet composition, strict full evaluator, fresh corpus와 무비용 검증만 연다.
- Credential read, external model call, additional spend, replacement smoke, full evaluation, PR, merge, publish, deploy와
  release는 계속 차단한다.

## Option A 수리 체크포인트

- Product candidate: `5f6a6faaaf98687f10daa5b1b98ed730232cdf10`
- Current 38-task development closure: `38 / 38`
- Knowledge routes: `152 / 152`
- Current roles: executable supported `21`, terminal unsupported `12`, `needs-input` `5`
- Strict outputs: Canvas PNG backing output, SVG, PNG와 PDF의 실제 파일 signature 검증
- Renderer immutability와 top-level public action name 기준 trace 검증 통과
- Route oracle SHA-256: `129164b77872057694a6cd5d12cea7c12cc510880f3a4cc53e27ab3821a3c20a`
- Credential reads / external calls / spend: `0 / 0 / $0`

기존 26개 supported 후보 중 5개를 억지로 실행하지 않았다. Area field dash는 현재 mark contract에서 지원하지 않아 terminal
limitation으로, chart owner가 없는 selection/facet, child program이 없는 composition, 위치가 없는 collision-aware text와 visual
channel이 없는 legend는 open decision으로 분류했다. 따라서 개발 closure는 supported 프로그램 수를 유지하는 것이 아니라
`21 / 21` 실제 실행과 `5 / 5` 정확한 비실행 결정을 합쳐 `26 / 26`을 닫는다.

이 체크포인트는 development set 수리만 완료한다. Fresh final corpus, query/dataset/program overlap 검사와 새 candidate의
replacement paid-smoke approval checkpoint는 아직 남아 있다.

## Fresh final v1 실행 결과

- Frozen corpus checkpoint: `61e99c06`
- Product candidate: `ccc8997717a554ee49c45baf089211922609ef0b`
- Tasks / routes: `38 / 38`, `152 / 152`
- Roles: supported `26`, terminal unsupported `6`, needs-input `6`
- Prior overlap: normalized query `0`, dataset contents `0`
- Oracle SHA-256: `fcddf6ff7b0ac885f65cd68d62827695df27435b2a955b52781e138543671835`
- Result: `36 / 38` closed, final verdict `failed`
- Credential reads / external calls / spend: `0 / 0 / $0`

실패 두 건은 동결 코퍼스에서 제품을 바꾸지 않고 그대로 보존한다.

1. `final-22-composition-svg`: canonical evaluator source가 `hconcat` runtime build step을 누락해 실제로는
   scatter program만 render했다. Product composition 결함이 아니라 evaluator source-composition 결함이다.
2. `final-23-labels-png`: resolver가 point/text mark를 모두 position encoding보다 먼저 배치해 position이 없는 point를
   남겼다. Overlay authoring은 `point → x/y → text → text/layout` 의 dependency order가 필요한 제품 결함이다.

Final v1 `corpus.json`, `datasets.json`, `ROUTE_ORACLE.json`, `RESULT.json`은 이후 수정하지 않는다. 두 원인을
일반 규칙으로 수리한 뒤 query/dataset이 다시 새로운 final v2를 별도 동결해야 한다.

## Fresh final v2 실행 결과

- Frozen corpus checkpoint: `90bd585d`
- Product candidate: `04d5c8efd6b350e3ff5ddb82ef1c5494568e4270`
- Tasks / routes: `38 / 38`, `152 / 152`
- Roles: supported `26`, terminal unsupported `6`, needs-input `6`
- Prior overlap: normalized query `0`, dataset contents `0`
- Oracle SHA-256: `12e570b3988815d03dac521f8be5572da34f66e8c5000132de268a119b63fc27`
- Result: `35 / 38` closed, final verdict `failed`
- Credential reads / external calls / spend: `0 / 0 / $0`

두 번째 동결 코퍼스도 제품을 바꾸지 않고 정확히 한 번 실행했으며 실패 세 건을 그대로 보존한다.

1. `final2-03-bars-png`: 독립 color scale 뒤 bar facade가 만든 categorical color owner를 찾을 때 resolver가 legend
   target을 명시하지 않아, 일반 `createLegend`가 여러 categorical mark 후보를 모호하다고 거부했다.
2. `final2-12-rule-canvas`: `createGrid`가 x/y encoding으로 생성되는 scale보다 먼저 배치되어 horizontal grid가 아직 없는
   y scale을 요구했다. 요청 순서가 아니라 scale dependency를 따라야 하는 resolver ordering 결함이다.
3. `final2-18-raw-bars-canvas`: raw bar의 y aggregate를 x category보다 먼저 적용해, bar position policy가 아직 category
   grain을 결정할 수 없었다. Bar는 요청 문장 순서와 무관하게 category position이 aggregate position보다 먼저 와야 한다.

Final v2의 네 파일도 이후 수정하지 않는다. 세 결함을 일반 dependency 규칙과 회귀 테스트로 수리한 뒤, 수정 후보는 다시 새로운
query/dataset의 final v3에서만 검증한다.
