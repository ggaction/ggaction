# STEP-070 현재 프레임과 세션 통합

## 진행 상태

- [x] 기존 사용자 전체 승인과 remainingApproval 재사용, 원 카드의 후행 의무 유지
- [x] 공개 animation source4d7664861 + 최종 caf731f73 및 private hit13be5912f 병합
- [x] 작은 geometry의 반복 중단에서 이전 계획 연쇄가 256단계를 넘는 실제 실패 재현
- [x] Sample 의미·native 출처 평탄화와 100/1000회 public interruption/hit 검증
- [x] 세션 authentic frame command, atomic hit/keyboard/current-frame publication
- [x] current native final-item 교집합 activation과 frame transient asset lease
- [x] source/update/gesture/cancel/destroy/reentry 및 100/1000회 focus/lease 검증
- [x] 실제 Canvas/SVG 현재 프레임, reduced motion, source-free 설치 교차
- [ ] 원 카드 AT34/65/80/81/82의 나머지 partition/routes/Geo/LOD/worker 통합

원본은 [STEP-070 카드](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-070-cross-feature-integration.ko.md)다.
계산 checkpoint나 통과한 일부 사례를 카드·전체077 완료로 표시하지 않는다.

## D0 — 반복 중단의 유한 출처

Root의 명시 지시와 기존 포괄 승인을 재사용한다. 공개 옵션·frame 모양·저장 schema는
바꾸지 않는다. 정확한 현재 동작은 Current ANIMATION이 소유한다.

초기 재현은 keyed continuous point 한 개를 1000회 중단한다. 실제 geometry는 Canvas와
circle 두 node이고 모든 값이 finite지만 기존 hit는 과거 sample→plan 연쇄를 따라가다
256 ancestry 제한에 실패했다. 처음 unkeyed fixture는 실제 weighted clip 제한에 먼저
걸렸으므로 그 로그도 분리 보존한다. 서로 다른 원인이다.

`frameProvenance`는 이전 plan 대신 작은 plan identity token을 보존한다. `frameEndpoint`가
sample 시점에 확정한 identity/background/semantic value와 node별 exact native program/index,
weighted source별 metric 출처를 저장한다. `exactFrames`가 현재 시작 frame을 보존해도 그 frame은
이전 plan을 가리키지 않는다. Native hit는 평탄한 source를 소비하며 누적 preparation work를
한 budget으로 검사한다. 서로 같은 값의 다른 program은 원 program의 권한을 얻지 않는다.

Root와 확인한 권한 범위는 현재 표시 출처 및 직접 native from/to다. 이전의 모든 조상 program을
끝없이 저장하지 않는다. 실제 weighted source가 남는 경우 그 source의 원 native metric은 유지한다.
Offline 복원에는 native program 권한이 없으므로 현재 이 경로의 hit는 명시 거부한다.
별도 resolver나 값/ID 추정으로 권한을 만들어내지 않는다.

100/1000회 공개 player 중단은 매번 시작 객체 동일성, 실제 위치의 독립 재귀 expected,
finite geometry, 단일 scoped hit와 row resource 출처를 검사한다. 이전 program 권한 제거,
가짜 frame/동일값 다른 program/오프라인 frame 거부, 반복 이후 export/restore, dispose 이후
callback0도 포함한다. 당시 후속이었던 실제 session focus/asset lease 검증은 아래 D1에서 닫았다.

현재 증거는 `frame-retention-evidence/`에 고정한다. 새 테스트는 runtime에 roadmap을 import하지
않으며 `test/unit/animation/retention.test.js`와 source-free consumer가 durable owner다.

## D1 — 실제 세션 프레임과 transient 준비

기존 remainingApproval과 parent의 구체적 구현 지시를 재사용한다. `TransitionFrame`의 exact
native 출처에 현재 program이 포함되는 경우만 frame command가 받아들이며, plain scene와
배타적으로 유지한다. Native program/history는 바꾸지 않고 현재 표시 index·focus·frameAssets를
같이 게시한다. 준비 중 이전 표시를 유지하고 source/native edit, supersession, destroy에서
기존 preparation owner의 abort·stale·dispose 수명을 재사용한다. 정확 계약은 Current INTERACTION이다.

새 public session 회귀가 weighted shape의 keyboard anchor에서 `state.fill is not iterable` 결함을
발견했다. 기존 hit grammar의 flat union을 재사용해 각 조각의 실제 opacity/clip을 검사하고 첫
admitted source만 사용한다. Lasso의 실제 표시 metadata도 committed base와 분리해 기존 owner에
전달한다. Brush의 scale inverse와 node/annotation 이동이 committed geometry를 요구하는 기존
제약은 유지하며, 이를 모든 typed animation drag가 완성됐다는 뜻으로 확대하지 않는다.

집중 검증은 exact identity·nested namespace·enter/exit native item 교집합·invalid/stale payload
접근0·pending/failed/superseded asset·reentrant callback·throwing disposer·lasso cancel/commit,
100/1000회 공개 player interruption과 실제 renderer handle의 생성/해제를 포함한다.
브라우저 Canvas/SVG × DPR1/2에서 actual pixels·keyboard focus·native activation·reduced motion을
검사한다. Source-free 패키지의 같은 세 사례는 four format 출력과 import 전 네트워크 차단을
포함한다. PNG는 actual pixel, PDF는 유효 header를 확인하며 PDF pixel equality라고 과장하지 않는다.

Source `8cd965393e05f10e13931675fd87a12fa2f66e1f`와 동일 archive
`ae486a9124187717bb8a3c95e54b14c636e6c924e8c0795288e60f9ab721275f`를 고정했다.
관련359개 테스트, 변경3owner lines/functions100%·branches94.22/95.04/95.39%, 계약43개가
통과했다. 이후 Basic 명시 사례만 추가한 owning14개도 통과했으며 두 수치는 중복이 있어 합산하지 않는다.
전체 repository suite를 다시 실행했다고 주장하지 않는다.

같은 tar Node20/22/24에서 각각 새 runtime3개·strict types·6entry bundle을 확인했다.
Node20은 runtime/types 성공 뒤 기존 Full gzip cap에 실패했으므로 원본을 보존하고 같은 tar의
bundle-only 보충으로 닫았다. 실측 최대 Full773950/Basic422008/interaction129659를
774000/422100/129700으로 최소 올림했다. 패키지는1132entries/1611830packed/7322421unpacked이며
caps1132/1612000/7323000이다. Node22에서는 설치본을 읽는 동일 browser4개도 통과했다.

소스 고정 문서58개, Jekyll186pages/1598LLM 링크·해시, 변경 페이지320/390/768/1280폭의
overflow0·Axe0·browser errors0를 확인했다. 첫 잘못된 HTML 경로 실패도 최종 pretty permalink
성공과 함께 보존했다. `session-frame-evidence/summary.json`과 압축 로그가 전체 근거다.
후속 metadata commit은 소스·타입·archive를 바꾸지 않는다. D1만 qualified이며 상단 원 카드와
offline native authority 복원, typed 움직임·domain 통합은 계속 미완료다.
