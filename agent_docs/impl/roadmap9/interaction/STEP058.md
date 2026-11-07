# STEP058 — Pointer capture와 gesture 상태 처리

## 진행 상태

- [x] 원 카드·interaction/core 계약·OR-24 확인과 AUTHORIZATION 재사용
- [x] private bounded priority/modifier arbitration과 armed/dragging/pinch reducer
- [x] 독립 literal threshold·100 move·cancel/late-up·own-data 검증
- [x] 실제 DOM capture·Escape/blur/lostcapture 및 click adapter
- [x] 기존 brush/lasso/node/annotation/navigation의 preview·RAF·final-up과 prepared assets 연결
- [x] click의 실제 mouse/touch/Escape 및 installed public consumers
- [x] 기존 annotation/region/node/navigation/click 후보의 공개 priority·modifiers와 단일 capture 연결
- [ ] 후행 keyboard focus/activation 및 domain gesture consumers
- [x] brush/lasso/navigation 공개 연결과 취소·history 소비자
- [ ] resize/reorder handle adapter 및 AT35/36 최종 통합 matrix

원 카드와 남은 요구를 보존하며 private 계산만으로 STEP058 또는077을 완료하지 않는다.
[전체 승인](../AUTHORIZATION.json)에 따라 같은 범위의 설계 승인을 다시 요청하지 않는다.

## Owner와 수치 계약

`src/interaction/gestures.js`는 DOM/ChartProgram 없이 bounded immutable state와 effects를
반환한다. Existing session은 baseline/transaction/event/FIFO를 계속 소유하며 새 generic callback이나
plugin을 공개하지 않는다. 실제 applicable owner/hit candidates는 domain adapter가 정한다.
그 후보 안에서 resize/reorder60 > annotation50 > brush/lasso40 > node drag30 > pan20 >
selection/inspect10의 기본 우선순위를 쓴다. 명시 우선순위는 ±1,000,000 정수다.
alt/ctrl/meta/shift의 명시 boolean conjunction을 비교하며 같은 priority에서 조건이 겹치면
임의 첫 후보 대신 오류다. 최대256 후보, ID1024 UTF-16 units, 정규화 시 유한 pair 비교다.

현재 private reducer는 3 CSS px Euclidean 이동 미만 armed, 이상 dragging이며 한 번 drag한 뒤
시작점으로 돌아와도 click이 되지 않는다. Up의 마지막 좌표는 move가 없어도 처리한다.
같은 explicit navigation binding이 pinch:true일 때만 두 번째 pointer를 받으며 세 번째는 무시한다.
Pinch에서 한 pointer가 끝나면 두 capture를 풀고 terminal commit 하나를 낸다. Zero span도
임의 scale을 추론하지 않고 exact points로 남긴다. Domain viewport 계산은 후행 owner의 책임이다.

Cancel/Escape/lostcapture/blur/updateProgram/unmount/destroy는 capture 해제와 cancel 한 번을
반환하며 late up은 inert다. Effects를 실행하기 전에 새 reducer state를 받아야 release가 발생시킨
lostcapture가 중복 terminal을 만들지 않는다. Destroy는 terminal disposed state다. Caller-owned
point/binding/event를 보존하지 않으며 finite displacement overflow는 state 교체 전에 거부한다.

## 공개 연결 계획과 미완료 경계

다음 host adapter는 기존 select binding의 pointerdown에서 transaction baseline과 capture를
정하고 armed up에서 기존 native command를 실행한다. 3px 이상 click은 선택 commit을 하지 않고
cancel한다. Browser synthetic click 중복과 remount 중 late event를 차단하고, 명시 keyboard click은
같은 native selection 경로를 쓴다. 프로그램 교체/외부 command/재mount가 active gesture를
취소하는 순서와 atomic failure를 검증한다. Browser-safe entry를 유지하고 Node/DOM 전역을
import 시 읽지 않는다.

Brush/lasso drag preview는 STEP059 domain adapter에서 같은 baseline으로 계산하며 RAF당 한 번,
up의 final point는 동기적으로 flush한다. 이번 pure 상태 계산의 preview effect 수를 실제 public
RAF coalescing 또는 DOM capture 성공으로 주장하지 않는다. 원 OR-24의 실제 browser 입력,
committed program/trace equality와 history delta는 public 연결 뒤 확인한다.

## Private 계산 검증 checkpoint

[Qualification](gesture-evidence/qualification.json)과 [literal expected/actual/diff](gesture-evidence/expected-actual-diff.json)를 보존했다.
10개 focused 회귀는 Node20/22/24에서 통과했고 owner coverage100/100/100이다.
Source boundary/discovery27과 package13을 확인했다. 최종 Node20 package는921entries,
packed1,329,320/unpacked6,080,779로 측정해 caps만921/1,330,000/6,081,000으로 조정했다.
Runtime entry에서 아직 import하지 않으므로 기존 public bundles/types/Current는 바뀌지 않는다.
이 기록은 actual DOM capture나 program/history OR24 인수 완료를 주장하지 않는다.

## Captured click 공개 연결

기존 select binding은 native Element의 pointer capture를 사용한다. 명시 custom event surface에
capture API가 둘 다 없으면 기존 click-only 동작을 보존하고, 하나만 있으면 초기화 오류다.
기존 immutable selection/native command 경로와 공개 cancel phase만 연결하며 새로운 public
binding 옵션이나 raw pointer dispatch를 노출하지 않는다. Private priority/modifier/pinch owner는
후행 domain adapter가 소비할 준비 상태이며 현재 public competing gesture 지원으로 주장하지 않는다.

Down은 program을 바꾸지 않는다. Armed up에서 current accepted frame의 target을 확인해
commit/settled를 한 번 보내고 뒤따르는 synthetic click을 막는다. 이는 SVG root가 commit
subscriber 안에서 교체된 경우에도 유지된다. 3 CSS px 이상 이동과 Escape/blur/cancel/lostcapture는
기존 program reference와 trace를 유지한 cancel 한 번이다. Final up만 움직여도 threshold를 검사한다.
직접 keyboard activation click(detail0)은 host가 보내는 경우 같은 native 경로로 처리하지만
Canvas/SVG에 Enter/Space 또는 focus를 자동 부여하지 않는다.

Source focused141(신규 capture14)와 새 owner100/96.81/100·session100/95.96/100,
경계/타입28, 실제5데이터×3recipe16, 실제 Canvas/SVG mouse·Escape·100move·touch10을 확인했다.
Capture acquisition 실패는 cleanup 뒤 error1을 내고 원본 프로그램을 보존하며 이 마지막 실패 경계는
집중 검사로 고정했다. Browser 정상/cancel 경로는 그 오류 전용 추가와 입력/동작이 같아 결과를 재사용한다.
후행 brush/lasso preview·RAF coalescing·history 인수는 여전히 열려 있다.

## Captured click qualification

공개 source `9e92ab01f`의 [qualification](pointer-capture-evidence/qualification.json)과
[literal expected/actual/diff](pointer-capture-evidence/expected-actual-diff.json)를 보존했다.
최종 focused141, 경계/타입28, package/문서 계약16, realistic16을 통과했다. 실제 browser10은
마지막 capture 획득 실패의 error event 추가 전 결과이며 정상/cancel 입력과 경로가 같아 재사용한다.
추가 오류 경계는 최종 focused 검사가 직접 검증한다.

동일 archive SHA256 `1445af0cd3ce634d5f4f8bc70dc12b777d0bf9e291259e1f3f8c68f485e0cf73`를
Node20/22/24에서 각각 source-free runtime3, strict declarations, browser entries4로 검증했다.
최대 interaction gzip100,541과 Node20 package922/1,331,459/6,089,158에 근거해
limits100,600 및922/1,332,000/6,090,000을 기록했다. 원본 실패와 수정 후 로그를 함께 보존한다.
Docs source185, 최종 provenance owning32, built164pages/1,411artifacts 및320/390/768/1440
폭의 overflow0/Axe0을 확인했다. 390px 실제 이미지를 검토했다. 전체 repository sweep 또는
전체 installed suite 통과로 확대하지 않는다. 후행 domain preview·RAF·keyboard·history 및077은 미완료다.

## 공개 편집 후보 arbitration 후속

전체 remainingApproval과 부모의 구체안 확인을 재사용한다. 기존 gestures owner의50/40/30/20/10
기본 rank와 bounded priority·boolean modifiers를 native binding에 연결한다. Domain normalization은
기존 소유자를 그대로 쓰고 wrapper만 공통 옵션을 분리한다. 같은 rank에서 조건이 겹치면 초기화
오류이며 배열 순서나 owner 이름으로 tie를 숨기지 않는다. Public exact 계약은 Current INTERACTION에 둔다.

새 pointerBindings owner는 읽기전용 candidate probe와 실제 begin을 분리하고 하나의 기존 capture
adapter로 winner만 실행한다. Hidden/removed annotation, node hit miss, 다른 child viewport는
낮은 rank로 넘어간다. Winner 이후 modifier 변경은 transaction을 바꾸지 않으며 navigation만 pinch다.
Source/update/frame/remount/dispose 및 transient asset 취소는 기존 session owner를 사용한다.

집중324검사와4owner coverage는 gestures100/100/100, pointerBindings100/100/100,
pointerCapture100/97.52/100, session100/95.49/100을 통과했다. 신규9개는 실제 hit·modifier·
단일 capture·nested viewport·hidden/removed·preview late asset·teardown을 포함한다. 실제 browser의
정확 공개문서 call chain으로 Canvas/SVG 각각 label drag·Shift brush·click·Escape를 확인했다.
초기 refactor의 scene 지역변수 누락과 click final-up cancel 분기 누락을 기존 회귀가 발견해 수리했고,
과거 단일 binding 오류 기대는 동일rank ambiguity 거부로 교체했다. 설치/문서 최종 qualification은
마감 중이며 이 기록은 STEP058/066/067/077 전체 완료를 뜻하지 않는다.

## 편집 arbitration qualification

Source `d74d66a6a`와 [qualification](arbitration-evidence/qualification.json)에 최종 검사를 고정한다.
집중324, 신규9, 실제5데이터×3recipe16, 실제Canvas/SVG3, 문서·경계55와 source-pin49를 통과했다.
동일 archive `1a470b78ee2fe50545634fd150beadacd0c4be142645b7eeaeb8bf070e89a4d5`의
21 interaction runtime·strict types·5 entry bundles를 Node20/22/24로 검증했다. Node20 최초
interaction120,959>120,000 실패와 이미 통과한runtime/types를 보존하고 cap121,000으로 동일
측정값만 재검증했다. Node22/24는 전체 집중 소비자를 독립 실행했다.

Built172pages/1,535LLM artifacts와320/390/768/1440폭의 overflow0/Axe0을 확인했다.
최종 문서의 우선순위 숫자 공백만 다듬은 뒤 owning49/build/4폭을 재검증했으며 source와 tar는
바뀌지 않았다. 320/1440 화면을 확인했다. 원본 refactor·package entry·stale provenance·search
실패도 보존한다. 전체repository sweep·전체installed suite 또는058/066/067/077 전체 완료는
주장하지 않는다. Animation, accessible focus, resize/reorder 및 후행 matrix 의무는 남아 있다.
