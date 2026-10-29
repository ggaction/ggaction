# STEP059 — Brush, lasso, angular selection

## 진행 상태

- [x] 원 카드와 interaction/core/qualification 계약 확인
- [x] 전체 승인 AUTHORIZATION 재사용
- [x] 첫 linear/log/time/category bounded inverse와 독립 수치 검증
- [x] x/y/xy typed domain·category native selection 연결
- [x] screen lasso metadata·keys 연결
- [ ] angular seam union 공개 pointer adapter 연결
- [x] 실제 capture/RAF preview/final-up/cancel lifecycle 연결
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
record에서 먼저 고정한다. 이번 Cartesian/lasso checkpoint의 정확 계약은 Current INTERACTION/MARK_SELECTION에 반영했다. Angular pointer 연결은 아직 후행이다.

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

## 공개 연결을 위한 정확 저장/preview 안

Named selector 전용 `region`은 x/y 또는 theta 채널마다 `{ranges:[{min,max,minInclusive,maxInclusive}]}`
또는 `{values:[typed categories]}`를 보존한다. 채널 사이에는 교집합, 같은 채널의 최대2개 범위에는
합집합을 적용한다. 기존 AST raw field로 aggregate 채널을 대신하지 않는다. 빈 range/category 배열은
빈 선택이다. Inactive/empty 입력도 모든 shape/유한 값/own-data 검증을 통과해야 한다.
Lasso의 기존 items selector에는 CSS-local `screenPolygon` points를 metadata로 보존하고,
선택 의미와 resize/data revision은 logical keys에만 따른다. Native predicate/resource owner가
codec/revision/conditional/highlight/labels를 계속 관리한다. 이 shape는 이번 Cartesian/lasso 공개 연결에서 구현했으며 theta pointer 입력은 후행으로 유지한다.

Angular는 explicit radians [0,2π) 입력을 받고 clockwise start→end의 seam을 순서 있는 두 범위로
만든다. 시작=끝은 empty이며 full turn을 추론하지 않는다. 기존 theta geometry/scale이 degrees인
경계에서는 명시 단위 변환과 theta-domain inverse를 저장 adapter가 수행한다. Normalized radians
metadata와 domain bounds의 관계는 공개 adapter 검증에서 고정한다. 다른 방향/전체회전은 미구현으로
숨기지 않고 후행 gesture 요구와 함께 확인한다.

미리보기는 session의 committed program과 별도로 같은 down baseline에서 만든 previewProgram이다.
RAF당 한 번, up final point는 동기 flush하고 native commit 한 번만 수락한다. Overlay는 Full selection
family 내부 wrapped materializer가 기존 concrete primitives를 만들어 같은 previewProgram의
SVG/Canvas/PNG/PDF 경계로 보낸다. Session의 직접 graphicSpec 수정이나 Canvas-only overlay는 없다.
Cancel은 preview를 버리고 baseline/trace/reference를 보존한다. 외부 program 교체·remount·dispose는
capture와 pending RAF를 해제하고 late callbacks가 프로그램이나 DOM에 접근하지 못하게 한다.


## Cartesian/lasso 공개 source checkpoint

2026-10-29에 공개 `brush`(x/y/xy, 명시 x2/y2 포함)와 `lasso`를 기존 session binding에 연결했다.
Full의 authored named selection이 필요하며 Basic은 명시 실패한다. 동일 ID를 link target과 gesture가
동시에 쓰거나 click/brush/lasso 편집 binding을 둘 이상 지정하면 거부한다. 기존 inspect/link는 함께 쓴다.
Named region은 final-item 채널의 범위/범주 교집합을 저장하고 raw source row를 임의로 고르지 않는다.
두 범위의 겹친 내부와 양쪽 모두 포함하는 같은 경계점을 거부하며, 한쪽만 포함하는 맞닿은 구간은 유효하다.
Lasso는 현재 concrete item의 painted/clip 유효 bounds 중심을 CSS polygon과 비교하고 item keys+polygon을
저장한다. 같은 item의 body/label은 하나로 합친다. 단일 M만 있는 선은 그려진 선분이 없어 제외된다.

RAF preview는 같은 down baseline과 linked closure를 재계산하며 `state.previewProgram`만 제공한다.
Up의 마지막 sample을 동기 flush하고 native edit 한 번으로 commit/settled를 발행한다. Cancel·lost capture·
blur·Escape·unmount·destroy·외부 program/frame 교체는 baseline 참조와 trace를 보존하며 capture/RAF를 해제한다.
Preview overlay는 기존 concrete path이고 SVG/Canvas/PNG/PDF 모두 같은 내용을 렌더링한다.
수정된 arbitrary animation frame에서 stored scale을 추정해 brush하지 않으며 명시 실패한다. Lasso는 현재 frame을 쓴다.

Source 검증은 gesture117/117, final-item selection owner242/242, native resource/selector136/136,
실제5datasets×3recipes16/16, 타입/경계40/40, discovery+vertical17/17, package26/26이다.
네 render primitive/public exact pair1/1, Chromium Canvas/SVG×brush/lasso×DPR1/2 4/4,
문서186/186 및 built164pages/1413LLM와 전체320/390/768 화면·접근성 검사가 통과했다.
새 selection/preview owner와 session/capture의 line/functions는100%이며 branch 최저93.68%다.
각도 seam 순수 계산은 존재하지만 angular pointer, history, 나머지 AT36 및 STEP077은 완료가 아니다.

최종 source를 고정한 뒤 provenance의 sourceCommit을 갱신하고 같은 tar3Node 증거를 qualification에 묶는다.
이 branch는 root의 최신 main487b9a434(Calendar+AST+D1/C)을 아직 병합하지 않았다. D2/D3/D4/058 및
현재059의 main 통합 검증은 root가 별도 수행하며 해당 통합을 이 기록에서 통과로 주장하지 않는다.
기존 text-shadow manifest linkage 수리는 c96637495의2파일 delta만 적용했으며 runtime 변경이 없다.
