# B native update의 실제 연결 순서와 동기 invocation 경계

## 상태와 승인 근거

기준 source는 `3427ae56f`이다. [B 표면 선택](route-native-update-boundary.md)과
[v2 채택](route-v2-adoption.md)은 유지한다. Root가 기존 remainingApproval 안에서
요청한 **최소 core-private 패치의 검토안**이며 제품 core/API를 변경하지 않았다.
원본 action source를 임시 overlay에 복사해 실험했다. 새 public registry, async action,
범용 replay, 실제 route completion 권한을 이 실험으로 구현했다고 주장하지 않는다.

현재 create/edit route의 v2는 제품으로 연결됐고, source DAG·Canvas·guide·responsive·
graph/hierarchy revision의 private continuation도 있다. 그러나 이 iterator 수가 공개 B
진척률은 아니다. `prepareGraphEdgeRoutes({kind:"update",edit:{action,args}})`와
`applyGraphEdgeRoutesUpdate({prepared,requestToken})`는 아직 실행 가능한 제품 경로가 아니다.
이 문서 다음 구현은 아래 첫 실행 경로를 닫는 데 필요한 변경으로 한정한다.

## 첫 공개 실행까지 필요한 최소 묶음

| 순서 | 실제 owner와 필요한 변경 | 완료 증거 |
|---|---|---|
| 1 | `resources/graphRoutes.js`의 원 prepared WeakMap에 update 요청·exact native function/args·constructor/base/refs·native plan·aggregate accounting을 보관한다. 기존 Full exact-constructor binding만 확장한다. | 외부 clone/다른 base/token/constructor/function override/취소를 거부하고 성공한 full plan만 handle로 반환한다. |
| 2 | 첫 end-to-end 입력은 graph `editLayout({target,node})`다. `actions/layouts/index.js`의 현재 validator와 `graphs/layouts.js`의 계산 plan 및 적용 owner를 공유한다. route뿐 아니라 실제 GraphPlot/GeoLine materialization, responsive/guide와 완료 theme가 요구하는 추가 viewport 결과까지 준비한다. | 원 v1의 geometry/consumer refs/trace children/theme·inspect 의미와 동등하다. 고정 viewport만 통과해 전체 editLayout을 완료 처리하지 않는다. |
| 3 | 아래 동기 scope를 **새 B apply action 하나에만** definition 시 연결한다. 원 wrapper는 final native action을 한 번 부르고 원 primitive/materializer를 실행한다. scope는 theme·result validator·exit까지 유지되고 finally 닫힌다. | 준비의 await에는 scope 0; 원 action/child/hook 호출 횟수 유지; 최종 실제 비용 누적; 실패 후 scope/receiver/trace/selection 변화 0. |
| 4 | Theme owner에서 B의 한 native child만 명시 해석한다. `collectThemeAuthoredSources`의 clear/reset/authored provenance와 completion metadata를 함께 검산한다. 임의 action children 전체를 flatten하지 않는다. | direct native와 B의 explicit override 출처·remove/reset/recreate·removeTheme 잔여 상태·후속 theme 변경·저장/복원 의미를 비교한다. |
| 5 | 위 경로의 source/types/current contract/action inventory/docs와 원 package qualification을 함께 닫는다. | Node20/22/24 exact 결과·errors/guards/취소, 한 source-free archive/type/bundle/browser/critical source pin. |

**첫 실행 가능한 공개 B 시점은 이 1–5가 함께 통과한 때**다. scope 실험이나 editLayout
계산 단계 분리만으로 public stub를 내보내지 않는다. 이후 native union의 다른 operation이
미완료라면 해당 체크포인트와 전체 B 완료를 구분한다. 직접14개와 derived alias, 간접
guide/encoding/mark/theme/composition/facet union 전체 의무는 줄이지 않는다.

현재 private `editGraphLayoutStages` 마지막 `materializeLayouts`도 동기 wrapped consumer를
호출한다. 따라서 generator를 한 번 drain하면 위2가 자동 완료되는 것이 아니다. 준비 owner는
계산과 실제 native 적용 계획을 소유한 locals로 이어야 하며, theme/viewport 계산을 준비하는
단계와 final sync scope를 혼동하면 안 된다. final apply에서 알려지지 않은 route 계산이
나오면 동기 v2 fallback이나 action retry로 메우지 않고 연결 누락을 실패로 드러낸다.

## 최소 core-private 패치

`core/action.js`의 기존 wrapped function identity, metadata, implementation WeakMap은
그대로 둔다. private `bindActionInvocationScope(wrapped, enter)`는 이미 생성된 wrapped
action에 단 한 번 연결하고 동일 function을 반환한다. public `action()` 인자/metadata와
`ggaction/extension` export에 추가하지 않는다. 적용 대상은 새 B apply action 하나뿐이다.

1. 기존 plain-own arguments, target dispatch, unit/composition 및 summary 처리를 먼저 한다.
2. 현재 `_enterAction → implementation/dispatch → completion hook → result validator →
   _exitAction` 본문을 closure `invoke`로 묶는다. 계산 순서와 반환 경로를 바꾸지 않는다.
3. scope가 없는 기존 모든 action은 `invoke()`를 그대로 한 번 호출한다.
4. B action에만 `enter(receiver,args)`가 동기 `close` 함수를 반환한다. 원 route preparation
   owner는 여기서 original prepared WeakMap·exact receiver/class/token·native function·
   original signal을 검산하고 준비 누적 비용의 ledger fork를 연다.
5. core가 `invoke()`를 정확히 한 번 실행한다. scope callback에는 result 대체 권한이 없다.
   `finally`의 `close(outcome)`는 성공일 때만 소비 수·잔여 plan·ledger를 검산하고 항상 이전
   중첩 scope를 복원한다. native/theme/validator/exit 오류를 다른 일반 fit 실패로 바꾸지 않는다.

Core는 route plan이나 handle을 읽지 않는다. 이 private binding은 생명주기 wiring이며
권한 발급점이 아니다. 단순 current scope 존재로 결과를 허용하면 안 된다. 매 소비는 원
prepared record와 exact native operation/args/입력 refs/viewport/예정 순서에 결박하고,
semantic write는 여전히 원 `preparedResourceContext`의 exact primitive binding을 거친다.
새 facade WeakMap proof나 fake `actionSource`/`actionStack`을 만들지 않는다.

scope를 facade implementation 안에서만 열면 completion hook 전에 닫힌다. 반대로 theme를
facade 안에서 미리 호출하면 기존 wrapper도 다시 호출한다. 이 두 방법은 사용하지 않는다.
scope는 **준비 동안 열지 않으며** 동기 final invocation 중에만 존재한다. 중첩 invocation은
서로 다른 record/cursor를 쓰고 안쪽 finally가 바깥 context를 복원한다. final hook가 끝나도
ledger 검산이 실패하면 결과를 반환하지 않으며 이전 immutable receiver는 그대로다.

## Data와 fit의 다음 최소 의존 단계

| 경계 | 재사용할 원 owner | 준비/최종 적용에 보관할 것과 금지할 shortcut |
|---|---|---|
| reviseData / derived / parameter | `data/revise.js`, `data/edit.js`의 revision plan·speculative/actual 순서 | source/derived ID와 row namespace를 한 번 확정. 최종 호출에서 UUID/ID를 새로 만들거나 whole action을 반복 실행하지 않는다. 기존 두 native branch는 각각의 원 목적/검산을 유지하며 동일 확정 identity를 쓴다. |
| source handle | `data/sourceContext.js`와 기존 authentic `applyDataUpdate` reader | 원 source handle base/token/signal 및 원 identity를 검산. raw revise를 가짜 sourceUpdate payload로 위장하지 않는다. Route worker에는 fetch/resolver를 추가하지 않는다. |
| logical identity | `materialization/revisionIdentity.js` | 기존 process-global replacement context를 await 중 유지하지 않는다. generator를 사용한다면 각 `.next/.throw/.return`의 동기 실행 동안만 기존 owner로 바인딩·finally 복원한다. |
| data route DAG | `data/resourcePlan.js`, exact-class `data/resourceRevision.js` | 이미 있는 source-resource stages를 실제 data native plan/apply에 연결하고 원 data-rooted primitive 권한에 route ledger를 전달한다. Basic/미등록 class에는 fallback authority를 주지 않는다. |
| fitCanvas | `canvas/fitting.js`의 probe/minimizeSide/fitMargins/fitExactPlot | 각 실제 probe의 margin/viewport/결과와 최종 margin·iterations·issues·signature를 원 owner locals에 보관. 성공뿐 아니라 실패 probe의 실제 work도 합산한다. 최종 trace에는 기존처럼 최종 editCanvas만 남고 probe trace는 남지 않는다. |
| fit terminal errors | `probe`의 현재 catch 경계 | 일반 geometry 불능은 기존 `{ok:false,message}`로 유지하되 v2 abort/deadline/quota는 terminal로 전파한다. abort를 fitting 실패로 삼아 다음 probe를 실행하지 않는다. |
| indirect union | guide/encoding/theme/composition/facet의 실제 native owner | 기존332개 후보 감사표를 positive call chain과 대조. wildcard dispatch·일반 replay·private helper 개수로 지원을 대체하지 않는다. |

Data와 fit의 우선순위는 위 공개 연결이 사용하는 native plan 소비 방식과 동일한 owner로
통합하는 것이다. 별도 private extraction 체크포인트를 추가하는 것 자체를 다음 목표로 삼지 않는다.

## 재현 증거와 한계

`route-b-scope-evidence/prototype.mjs`는 실제 `core/action.js`를 `.artifacts` overlay에
복사해 위 최소 패치만 적용한다. 제품 source를 쓰지 않으며 overlay를 finally 삭제한다.
Node20.20.2/22.23.1/24.22.1에서 각각12개 확인이 통과했다. exact trace와 원 v1 own-argument
오류 동등성, enter/native/theme/validator/exit 예외, close 횟수, nested restore, prepare await의
scope 부재, once-only wiring을 포함한다. fixture registry는 **가짜 테스트 registry**이므로
실제 route proof·Full B·request ledger가 통과했다는 증거가 아니다.

`theme-counterexample.mjs`는 현재 제품의 public extension wrapper로 실제 native editCanvas를
중첩한다. direct 경로의 `g:canvas.background → explicit/editCanvas` 출처가 wrapper 경로에서는
없어지는 것을 확인했다. 이 작은 fixture는 즉시 및 후속 light theme 뒤에도 red를 유지한다.
따라서 관측한 반례는 authored-source 검사 의미이며 시각적 색상 오류를 관측했다고 쓰지 않는다.
별도 removeTheme 반례는 direct 경로에서 `materializationConfigs.theme`가 제거되지만 같은
중첩 경로에서는 빈 theme state가 남는다. 기존 completion metadata의 `op === "removeTheme"`
검사가 B wrapper 이름을 보기 때문이다. 이는 실제 저장 대상 상태 차이이며 함께 해결해야 한다.

초기 실험에서 trace stack 항목에 op가 있다고 가정한 exit 관측이 실패했다. 실제 stack의
id/path와 trace node를 사용하도록 실험을 고쳤다. 두 theme 색상 차이 가정도 실제로 재현되지
않아 제거하고 실제 authored-source 차이만 기록했다. Guard·제품 동작은 변경하지 않았다.

이번 documentation-truth 실행은 README뿐 아니라 architecture의 canonical bundle 표도
오래된 수치임을 발견했다. 둘을 현재 branch cap Full793300/Basic426400/graph74500에 맞춘다.
Root composite는 별도 실제 측정값을 소유한다. 이전 `3427ae56f` archive에는 이번 README
수정이 없으므로 그 archive를 이번 문서 상태의 source-free 결과로 재사용한다고 주장하지 않는다.
제품 core 구현을 채택한 후 새 archive로 다시 검증한다.

원100ms는 초기 snapshot/wide keys/BigInt/clone/postMessage/geometry/materialization 등
잔여 동기 구간을 포함해 여전히 미검증이다. 1k/10k 원 density·P95·100cycle도 완료되지 않았다.
