# Gate R54-P5-G — Full Evaluation Precheck and Repair Decision

## Gate state

`approved`

Canonical evidence: [`FULL_PRECHECK.md`](./FULL_PRECHECK.md).

## 현재 결론

초기 strict executable precheck의 `19 / 38` 실패를 근거로 사용자가 Option A 수리를 승인했다. Runtime closure와 evaluator를
일반 규칙으로 수리하고 실패한 final v1/v2를 불변 증거로 보존한 뒤, 독립 intent oracle을 가진 fresh final v3가
`38 / 38`을 통과했다.

Option A의 무비용 수리·검증 범위는 완료됐다. 현재까지 이 Gate 준비에서 credential reads / external calls / spend는
`0 / 0 / $0`다. 다음 단계는 새 후보를 대상으로 한 replacement paid smoke의 정확한 범위·호출 수·비용 상한을 별도 승인받는
것이며, 이 Gate의 기존 승인은 그 실행을 열지 않는다.

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
2. `final2-12-rule-canvas`: 심층 재현 결과 `createGrid`는 x/y 뒤에 있었다. 실제 원인은 rule이 x와 y primary만 갖고
   x2/y2가 없어 line graphics와 resolved scales를 만들 수 없었던 것이다. Resolver가 이 불완전 endpoint 조합을
   supported로 잘못 분류했고, 같은 문장의 `encode stroke width`와 subtitle intent까지 누락했다.
3. `final2-18-raw-bars-canvas`: raw bar의 y aggregate를 x category보다 먼저 적용해, bar position policy가 아직 category
   grain을 결정할 수 없었다. Bar는 요청 문장 순서와 무관하게 category position이 aggregate position보다 먼저 와야 한다.

Final v2의 네 파일도 이후 수정하지 않는다. 세 결함을 일반 dependency 규칙과 회귀 테스트로 수리한 뒤, 수정 후보는 다시 새로운
query/dataset의 final v3에서만 검증한다.

## Final v2 이후 수리 기준

- Independent color scale은 bar facade의 실제 color encoding에 연결되어 legend가 고아 scale을 설명하지 않는다.
- Raw bar는 문장 순서와 무관하게 categorical primary position을 quantitative measure보다 먼저 작성한다.
- x+y primary만 있는 rule은 억지 endpoint를 만들지 않고 `encoding.rule.endpoint` open decision으로 반환한다.
- `encode stroke width`, subtitle와 Canvas output 문구를 별도 intent로 보존한다.
- Violin facade가 이미 소유하는 density derivation과 color encoding은 중복 standalone action을 만들지 않는다.
- 연결되지 않은 scale과 소비되지 않은 derived dataset은 strict evaluator 실패로 처리한다.
- Final v3부터 corpus가 expected constraints, ordered plan IDs, unsupported IDs와 unresolved IDs를 독립적으로 소유한다.
  Resolver가 만든 oracle을 resolver 자신에게 다시 정답으로 주는 self-oracle만으로는 final corpus를 동결할 수 없다.

기존 development set의 현재 의미 분류는 supported `19`, terminal unsupported `12`, needs-input `7`로 교정됐다. 과거
`21 / 12 / 5` snapshot은 당시 후보의 증거로 보존하되, 두 task를 실행 가능한 것으로 과장하지 않는다. 교정된 38개 closure와
152개 route는 모두 무비용으로 통과한다.

## Fresh final v3 실행 결과

- Frozen corpus checkpoint: `d33b2ee9`
- Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`
- Tasks / routes / evaluator checks: `38 / 38`, `152 / 152`, `38 / 38`
- Roles: supported `26`, terminal unsupported `6`, needs-input `6`
- Prior overlap: normalized query `0`, dataset contents `0`
- Independent intent oracle: constraints, ordered plan IDs, unsupported IDs와 unresolved IDs `38 / 38`
- Oracle SHA-256: `38662943c5d4e1cda1783ab84df724416a5760d9dc95f90cbe3054eee0a66688`
- Result SHA-256: `001a1f134eb3ebfce3bf044fc20d1392f1c325e94b29b2400164f6ad73fac7e9`
- Result: `38 / 38` closed, final verdict `passed`
- Credential reads / external calls / spend: `0 / 0 / $0`

Final v3도 제품을 바꾸지 않은 동결 체크포인트에서 정확히 한 번 실행했다. `corpus.json`, `datasets.json`,
`ROUTE_ORACLE.json`, `RESULT.json`의 바이트 해시와 후보 커밋은 회귀 테스트로 잠겼으며 이후 수정하지 않는다. 이 성공은
runtime authoring closure와 evaluator가 fresh corpus에서 일치한다는 무비용 근거다. 외부 LLM 품질과 route별 효율 개선은 아직
입증하지 않으므로 replacement paid smoke와 full paid evaluation을 대신하지 않는다.

## 다음 승인 경계

다음 Gate는 product candidate `4e211ba4`에만 적용되는 representative paid smoke의 task 표본, A/B/C/D route, 반복 수,
expected/max cost와 hard cap을 먼저 동결해야 한다. Credential read, external model call, spend, v4 재사용, full paid evaluation,
PR, merge, publish, deploy와 release는 새 승인 전까지 계속 차단한다.
