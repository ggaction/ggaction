# STEP058 — Pointer capture와 gesture 상태 처리

## 진행 상태

- [x] 원 카드·interaction/core 계약·OR-24 확인과 AUTHORIZATION 재사용
- [x] private bounded priority/modifier arbitration과 armed/dragging/pinch reducer
- [x] 독립 literal threshold·100 move·cancel/late-up·own-data 검증
- [ ] 실제 DOM capture·Escape/blur/lostcapture 및 click adapter
- [ ] domain preview/RAF coalescing과 final-up 처리 연결
- [ ] 실제 mouse/touch/keyboard 및 installed public consumers
- [ ] 후행 brush/lasso/navigation 연결과 AT35/36 전체 종료

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
