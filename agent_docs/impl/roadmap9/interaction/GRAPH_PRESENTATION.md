# 그래프의 현재 프레임·일시 경로·드래그 연결

## 진행 상태

- [x] STEP041 AT80/81 원문과 기존 native moveNode 차이 확인
- [x] 현재 공개 scene bridge를 통한 두 overlap 후보와 selected-only 임시 geometry 실험
- [x] 기존 native edge geometry와 공통 route sample owner를 재사용한 독립 pure 계산
- [x] authentic graph 의미벡터를 사용하는 실제 session 연결
- [ ] overlap keyboard 후보 순환·일시 unbundle·tooltip 통합
- [x] animated fixed/force drag, 한 native commit, cancel/undo/redo, 준비 lease 연결
- [x] 그래프 드래그의 실제 공개 4 renderer·browser·동일 archive 소비자

이 기록은 STEP041/070 전체 완료가 아니다. 과거 [edge-bundling 공개 기록](../chart/edge-bundling-public.md)의
미완료 current-frame 의무를 이어받는다. 공통 승인 원문은 [AUTHORIZATION](../AUTHORIZATION.json)의
remainingApproval이며, 부모 작업자의 2026-10-30 후속 지시는 현재 그래프 의미값과 기존 geometry를
사용한 점프 없는 preview, native 한 transaction, cancel/undo/redo까지 포함한다. 재승인을 요청하지 않는다.

## 원문과 현재 차이

[STEP041](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-041-bundling-consumers.ko.md)의
AT80은 원 edge 후보 보존, 선택 edge만 임시 unbundle, tooltip·keyboard 순환을 요구한다.
[원 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/edge-bundling.ko.md)은
unbundle을 presentation overlay로 제한하고 graph 및 saved canonical route 변경을 금지한다.
AT81은 drag 후 route 끝점이 현재 node frame anchor에 붙고 interruption이 current route에서
이어져야 한다. Force release 전후 모든 노드의 pixel equality는 별도 명시 요구가 아니다.

현재 hit는 두 겹친 edge 원 key를 유지하며 기존 focus/activate는 exact scoped key를 받는다.
그러나 native movement는 committed frame 일치만 허용한다. 현재 좌표를 읽지 않고 stored
layout만 편집하면 중간 animation에서 나머지 노드와 경로가 이전 baseline으로 점프한다.

## 구체 구현 경계

`materialization/graph/presentation.js`는 검증된 현재 graph group을 받는다. 선택 edge의
body/arrow만 기존 `graphEdgeGeometry`로 구한다. Parallel/loop 순서는 전체 원 graph order를
그대로 적용하며 나머지 edge graphics는 바꾸지 않는다. 새 node/junction/route resource는 없다.

같은 owner의 node 이동은 현재 semantic x/y에서 시작한다. 연결 route의 이미 존재하는
sample마다 endpoint 이동량을 원 arc-length 비율로 분산한다. 공통
`grammar/graph/routes/polyline.js`의 `reanchorRoute`가 길이/point admission을 재사용하며,
재샘플·새 solver·pixel 역추론 없이 모든 sample 개수와 순서를 보존한다. 길이0은 sample 순서
비율로 명시 처리한다. 모든 input은 불변이며 nonfinite/누적 work 초과는 전체 계산 실패다.

후속 session은 authentic graph group을 기존 weak prepared-frame association으로 소비한다.
Plain external scene에는 native semantic 좌표 권한이 없으므로 좌표를 pixel에서 복원하지 않는다.
Exact current program/scope/owner와 실제 typed node key를 각각 검증하고 현재 표시 frame에서
그 node를 맞혔을 때만 capture한다. Preview는 현재 의미와 현재 route에서 이어져야 한다.

Fixed commit은 표시된 node 좌표를 기존 native layout candidate에 전달한다. Force commit은
표시된 좌표를 initialPositions로 공급하고 기존 pins 및 이동 node pin을 보존한 기존 solver
결과를 한 transaction으로 반영한다. 다른 node를 임의로 영구 pin하지 않는다. 최종 force
결과로의 시각 전환은 host가 마지막 preview와 native result 사이에서 기존 공개 animation을
명시 호출하는 경계로 둔다. Preview 연속성, native 결과, endpoint attachment와 한 history
entry를 각각 검증한다. Cancel은 이전 accepted frame·program·asset lease를 복구하고
undo/redo는 기존 native snapshot history를 재사용한다.

## 현재 증거와 한계

독립 literal 검사에는 source/target 이동, 자기 loop, parallel order, selected-only native arrow,
repeated/collapsed samples, zero displacement exact equality, 불변성, getter0, overflow 및 누적
work bound가 있다. 아직 private 계산이므로 public session, installed consumer 또는 AT80/81
완료를 주장하지 않는다. 공개 타입/Current는 실제 session 연결 checkpoint에서 갱신한다.

[보존 증거](graph-presentation-evidence/summary.json): 관련 26개를 Node20/22/24에서 각각 통과,
변경 두 owner의 lines/branches/functions 100%, source/discovery/architecture 37개 및 package
7개 통과. 최초 capability 등록 누락과 이전 package cap 실패를 보존했다. 동일 staging 입력은
1135 entries, unpacked 7,336,876 bytes, packed 최대1,619,293 bytes여서 cap은
1135/1,620,000/7,337,000으로 최소 조정했다. Node22 실제 installed Full/Basic bundle은
772,483/421,199 gzip bytes로 이전 source와 동일하다. 다른 entry와 public session의 설치
검증을 이 private checkpoint에서 재실행했다고 주장하지 않는다.

## 현재 의미에서 시작하는 드래그 공개 연결

기존 `remainingApproval`과 사용자의 잔여 전체 승인 아래 다음 구체 선택을 적용한다.
- `previewFrame: TransitionFrame|null`은 현재 native 의미에서 forward materialize한 일시 표시다.
  원래 `animationFrame`/`frameAssets`는 취소 기준으로 유지하고, `previewAssets`는 새 표시와 함께 게시한다.
- exact native graph/layout ID, scoped owner, 전체 node/edge membership 및 각 실제 role의 native geometry를
  검사한다. 다른 source, 임의 scene clone, fallback geometry를 새 권한으로 승격하지 않는다.
- current 의미 좌표에서 시작해 CSS delta만 역변환한다. Native layout editor는 preview에서 호출하지
  않고 release에서 한 번 호출한다. Force는 현재 positions를 initialPositions로 주고 기존 pin과 drag pin만
  유지한다. 원 카드 AT80/81은 current route endpoint 연속성을 요구하므로 preview에서 보장하며, native solver의
  다른 노드까지 release pixel 동일성을 새 요구로 추가하지 않는다. Host는 마지막 preview→native result 전환을
  기존 planTransition으로 명시 연결할 수 있다.
- Native 배열 교체가 기존 dormant typed key와 두 좌표를 그대로 운반할 때만 보존한다. 새 dormant,
  좌표 변경, 다른 typed key는 거부한다. 이는 current-view 전체 좌표의 한 native commit에 필요한 최소 경계다.
- frameProvenance는 이전 frame을 보유하지 않고 기존 flat native authority와 각 family 의미를 재사용한다.
  graph geometry의 공통 계산을 `materialization/graph/frameGeometry`로 추출해 animation projector와
  interaction presentation이 동일 결과를 소비한다. Interaction은 Full/native assembly를 import하지 않는다.

통과한 소스 증거: fixed/force 및 routed drag, nested negative CSS, cancel/reverse/source/teardown, exact handle
준비·stale 결과·재진입, native 한 revision/history/undo/redo, Canvas/SVG DPR1·2 및 public 설치 소비자.
이 절은 소스 진행 기록이며 최종 qualification 수치·archive·실패 로그는 별도 evidence에 고정한다.
AT80의 공개 temporary edge 표시/후보 keyboard cycle 및 전체077 완료는 아직 주장하지 않는다.


## 드래그 공개 체크포인트 증거

Source `4e26d4cb41c6b634e4351a6538b4814f22bbb40b`를 고정했다.
[증거](graph-drag-evidence/summary.json)는 실제 공개5사례·strict 타입·6entry bundle을
동일 d1073ea8… archive로 Node20/22/24에서 각각 통과한 결과를 담는다. Canvas/PNG pixel exact,
SVG 좌표, PDF vector stream을 독립 native layout과 비교했고 설치 Chromium의 Canvas/SVG×DPR1/2
실제 pointer4사례도 통과했다. Native layout coverage129개는100/100/100이며 나머지 변경9owner는
기존 critical floor를 유지한다. 실제 고정5datasets×fixed/fixed-routed/force는32행 witness로16/16,
원본 hash 검증·canonical runner와 timing ledger를 포함한다.

원본 broad owning635/634의 단일 실패는 appearance 확장으로 바뀐 weighted fixture였고, root598의
정확 수정 및 실제 weighted-blend 존재 검사를 owning으로 통과했다. 마지막 source owning55/54의
단일 실패는 새 corpus 목록61이었다. 이를 새파일 등록·root598의 Geo/polar timing·현재 canonical
timing과 함께 고친 discovery/sharding20/20을 별도 기록한다. 전체635를 모두 녹색이라고 소급하지 않는다.
문서 원본231/230의 단일 실패는 변경 asset fragment의 이전 해시였으며, exact fragment browser2/2와
owning18/18로 닫았다. 빌드186페이지/1598LLM 링크, 전체320/390/768 containment·search·Axe·keyboard
검사를 통과했다. 마지막 Node22 canonical 재pack은 설치 tar와 byte-identical임을 확인했다.

이 checkpoint는 AT80의 공개 임시 간선 펼침·겹친 후보 keyboard 순환·tooltip과 전체077 완료를
포함하지 않는다. 이어지는 Geo Text current-source 교집합과 간선 presentation은 별도 개념으로 진행한다.
