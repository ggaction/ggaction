# 접근성 정적 소비자와 AT53 책임

## 진행 상태

- [x] semantic table/items 및 native hierarchy/graph 설명: A
- [x] exact accepted frame focus·복구·native activation: B
- [x] hover/focus/Escape tooltip·touch inspection: C1
- [x] 현재 native edit/history 명령13종의 keyboard/touch host 대안: C2
- [x] D 대표 공개 player/current-frame·reduced-motion·asset lifetime 결합: STEP070 D1
- [ ] 나머지 domain·route/LOD 결합 및 최종 AT53 matrix
- [ ] AT53 및 STEP074–077 최종 통합: root qualification owner

기존 [전체 승인](../AUTHORIZATION.json)의 remainingApproval을 재사용한다. 이 matrix는 구현
누락을 숨기지 않는 evidence 분담이며 새 public API/DOM widget/persisted state를 만들지 않는다.
정확한 현재 동작은 Current ACCESSIBILITY/INTERACTION이 소유한다. 원 카드 STEP068 및 AT53
전체는 아래 후행 셀이 닫힐 때까지 완료가 아니다.

## 정적 경로

| 대상 | 구현/검증 owner | 현재 증거와 한계 |
| --- | --- | --- |
| table·native fields·selectedBy | accessibility entry, `unit/accessibility/items.test.js` | aggregate·scope·hidden·typed identity·graph inferred origin/rule/metric/degree literal, A/C1 |
| hierarchy/graph logical 관계 | native item/navigation reader | A의 native hierarchy path와 graph endpoint literal; 외부 screenreader 수동 낭독 완료를 주장하지 않음 |
| item keyboard focus | `interaction/keyboardFocus.js`, keyboard browser | 정확 paint/clip/opacity와 native membership, nested scope·LOD 원 key·container fallback, B 및 Geo source D5 |
| item activation·brush/lasso 대안 | 같은 keyboard/selection command | native item을 직접 이동·toggle해 같은 논리 membership 편집. 키보드로 화면 polygon을 자동 생성한다고 주장하지 않음 |
| hover/focus tooltip·touch inspect | canonical tooltip example, `accessible-tooltip.browser.js` | hoverable/Escape·실제touch·HTML모양 안전텍스트·filter/remove fallback·해제, C1 |
| select/clearSelection | canonical native controls | A/B 각각 명시 category 선택과 membership만 clear; keyboard/touch와 native selectedBy, C2 |
| setVisibility/filter | canonical native controls | 두 category의 hide/show, 원 user filter와 공존, all-data/keep-hidden native 복구, C2 |
| reorder | canonical native controls | 원 category domain 순서변경/복구, keyboard/touch 및 native domain literal, C2 |
| undo/redo/reset | canonical native controls와 기존 history owner | 버튼상태·현재 DOM focus·정확 native snapshots 및 event순서, C2; preview/실패이력 규칙은 기존065 증거 |
| setParameter/context action | canonical parameter/context example | 실제range keyboard/touch, current-frame focus point→context request→같은native selection, hover/right-click 불필요, C2 |
| focusHierarchy | canonical partition host/buttons 및 keyboard item owner | 기존 Enter/Space와 새 실제touch의 focus/root·breadcrumb, C2 |
| setViewport | canonical camera host와 navigate binding | 기존 keyboard/pan/zoom/reset 및 새 touch buttons; native drag/pinch/globe cancel은 이전 camera 증거 |
| moveNode | canonical graph node controls | 두 node 모두 명시 button, keyboard/touch·native 위치 literal, 기존 drag/cancel/current hit 증거 |
| annotate | canonical annotation controls | Enter/Space/touch·data anchor·native Text geometry, 기존 source/feature/item/screen-anchor 증거 |
| namespace/repeat/child source | 기존 native owner 및 B | current program scoped item key/childPath 유지; C2가 새 namespace를 생성하지 않음 |
| async/assets/worker/dispose | session/preparation 및 `SESSION_LIFECYCLE_MATRIX.md` | 기존 lease/callback·100회 lifetime 증거 재사용; C2는 기존 command publication만 소비 |
| Browser Canvas/SVG | public render와 native snapshot | 새7browser+기존5browser에 함께 렌더; host value/event와 렌더 존재 확인. 새로운 전체pixel parity claim 아님 |
| PNG/PDF·codec | 기존 immutable graphics와 resource owner | C2 library/runtime/types 변경0, 기존B/native domain 검증 재사용. runtime/DOM/history를 저장하지 않음 |
| entry/packages | 기존 entry imports | 같은 B7cab artifact의 source-free Chromium 실제 문서3종, source/types fingerprint 동일; 새bundle/repack 없음 |

`test/support/accessible-control-cases.json`은 현재10 edit+3history 명령의 실행 witness 정본이다.
`test/contracts/accessible-controls.test.js`는 명령 누락·중복·없는 snippet/test를 거부한다.
이 inventory 검사는 실제 input 검증을 대신하지 않으며 browser 결과는 별도 qualification에 둔다.
Browser tests의 focus/Tab/ARIA/Axe는 자동화된 접근성 증거다. 특정 보조기술 사용자의 전체
실사용 경험이나 수동 screenreader 검토가 완료됐다고 주장하지 않는다.

## 남은 합산 책임

| 항목 | 담당 | 완료 조건 |
| --- | --- | --- |
| 공개 animation intermediate/current-frame hit | root planner/player + interaction owner | D1 대표 point/enter/exit/weighted/retention 완료; domain별 typed frame은 STEP070 후행 matrix |
| reduced-motion | root player + interaction owner | D1 Canvas/SVG×DPR1/2에서 실제 공개 player의 final focus/hit와 schedule0·render1 확인; 나머지 domain 조합은 후행 |
| interruption/preparation | 두 owner 공동 | D1의 source/update/gesture/cancel/destroy/reentry·100/1000 focus/lease와 같은 tar 검증 완료; route/LOD 전용 교차는 후행 |
| AT53 전체 | root integration | 위 D와 A/B/C 합산, renderer·offline restore·같은 package artifact에서 cross-feature 검증 |
| STEP074–077 | root qualification | 원 카드 전체 인수 행렬·독립검토·배포 별도권한 등 repository 완료 규칙 유지 |

C2는 private animation helper를 import하지 않는다. D1의 실제 공개 결합 증거는
[STEP070](STEP070.md)과 `session-frame-evidence/summary.json`에 있다. 같은 tar 설치 browser 및
후속 Geo D5의 재검증을 연결하되, 이 대표 셀로 전체 AT53/로드맵 완료를 선언하지 않는다.
