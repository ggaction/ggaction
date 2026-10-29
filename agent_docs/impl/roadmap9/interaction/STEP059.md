# STEP059 — Brush, lasso, angular selection

## 진행 상태

- [x] 원 카드와 interaction/core/qualification 계약 확인
- [x] 전체 승인 AUTHORIZATION 재사용
- [x] 첫 linear/log/time/category bounded inverse와 독립 수치 검증
- [ ] x/y/xy typed domain·category native selection 연결
- [ ] angular seam union과 screen lasso metadata·keys 연결
- [ ] 실제 capture/RAF preview/final-up/cancel lifecycle 연결
- [ ] types/Current/docs/codec/installed/browser 소비자 검증
- [ ] AT36 closure와 후행 history/077 종료

[전체 승인](../AUTHORIZATION.json)을 재사용한다. 원 카드의 요구를 삭제하거나 private 계산을
public 지원 또는 STEP059 완료로 표시하지 않는다.

## 계산 소유자와 첫 checkpoint

`grammar/scales/inversion.js`의 private `invertPositionInterval(resolvedScale, [start,end])`는
기존 forward owner의 numeric interpolation/log parameter/domain 검증과 ordinal band geometry를
재사용한다. Range는 reverse/coordinate가 이미 반영된 값이므로 다시 뒤집지 않는다. Brush는
유한 range와 교집합을 사용하며 밖으로 extrapolate하지 않는다. 0폭 또는 범위 밖은 빈 결과다.
Linear/time/log는 `{kind:"range",bounds:[min,max]|null}`, ordinal/band/point는
`{kind:"categories",values:[typed category...]}`를 반환한다. Time은 epoch milliseconds,
범주형은 closed screen interval에 닿는 실제 band(또는 point center)를 domain 순서로 반환한다.
Padding gap을 임의 최근접 범주로 바꾸지 않는다. 범주 수10,000과 누적 문자열/항목 work10,000,000을
계산 전에 제한한다. Input은 own-data이고 immutable이며 0 range는 역변환 불가 오류다.
Constant linear/time domain은 forward midpoint가 brush에 포함될 때만 같은 constant를 반환한다.

첫 private 범위는 카드가 지정한 linear/log/time 및 categorical이고, pow/sqrt/symlog·measured
radial inverse는 아직 지원으로 주장하지 않는다. 후행 public binding이 읽을 stored scales/owner는
현재 session/Full selection registration을 재사용한다. 새 그래픽 또는 public export는 이 계산에 없다.

## 공개 연결 의무

x/y의 typed domain range와 xy의 교집합, angular의 `[a,2π) ∪ [0,b]`는 의미가 유지되는 selection
selector로 저장한다. Lasso는 screen polygon과 selected logical keys를 저장하며 domain polygon으로
변환하지 않는다. Resize 뒤 의미는 keys로 유지하고 overlay만 새 geometry에서 재계산할 수 있다.
정확 저장 shape와 native action 확장은 existing persistent-selection/selector owner를 읽고 같은
record에서 먼저 고정한다. 아직 이 paragraph를 구현된 Current 계약으로 사용하지 않는다.

Session은 down baseline/transaction/FIFO를 계속 소유한다. Domain preview는 매번 같은 baseline으로
계산하고 RAF당 최대 한 번 발행한다. Up은 final point를 동기 flush하여 commit 하나, cancel은
baseline/trace/reference 유지와 capture 해제·cancel 하나다. Browser artifact/installed/codec와
범위·grouping·composition·linked selection consumer matrix는 public 연결 checkpoint에서 검증한다.

## 첫 inverse qualification

[Qualification](inversion-evidence/qualification.json)과 [literal expected/actual/diff](inversion-evidence/expected-actual-diff.json)를 보존했다.
11개 focused 회귀는 Node20/22/24에서 통과했고 새 owner coverage100/98.75/100,
critical95/90/100을 유지한다. Source/discovery/package40도 통과했다. Private 모듈이 아직
public entry에서 import되지 않아 public bundle graph·Current·타입·renderer는 바뀌지 않는다.
Node20 package923/1,332,897/6,094,813에 근거한 caps923/1,333,000/6,095,000이며,
초기 실패와 최종 통과를 구분해 보존한다. 다른 연속 타입 및 public gesture 인수는 위 미완료 목록에 남긴다.
