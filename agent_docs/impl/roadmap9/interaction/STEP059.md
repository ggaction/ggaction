# STEP059 — Brush, lasso, angular selection

## 진행 상태

- [x] 원 카드와 interaction/core/qualification 계약 확인
- [x] 전체 승인 AUTHORIZATION 재사용
- [x] 첫 linear/log/time/category bounded inverse와 독립 수치 검증
- [x] x/y/xy typed domain·category native selection 연결
- [x] screen lasso metadata·keys 연결
- [x] angular seam union 공개 pointer adapter 연결
- [x] 실제 capture/RAF preview/final-up/cancel lifecycle 연결
- [x] Cartesian/lasso types/Current/docs/codec/installed/browser 소비자 검증
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


## Cartesian/lasso qualification

[Qualification](region-gesture-evidence/qualification.json), [독립 literal expected/actual/diff](region-gesture-evidence/expected-actual-diff.json),
[실제 preview](region-gesture-evidence/public.png)를 보존한다. Source는 `787adcfaf`이고 최종 동일 archive는
`c9fc5dc92ce69d0f16e912e9ded08dded621e2574ced41d093ba061d453a4cbb`이다. Node20/22/24에서
각3개 기존 interaction consumer(brush/lasso 확장 포함), strict TypeScript,4개 browser bundle을 통과했다.
초기 `c6f51d32…` archive는 맞닿은 inclusive 구간 수리 전 결과로 분리 보존하고 최종 결과로 사용하지 않는다.
실제 세부 테스트 개수와 변경 owner coverage는 JSON과 로그가 소유한다.
Root 최신 main `11e617145`의 Calendar+057/058 통합은 별도 checkpoint이며 다음 병합에서 소비자 교차를 검증한다.
이 기록은 angular pointer·history·STEP059/077 전체 완료가 아니다.

## Calendar·최신 selection lifecycle 통합

`11e617145`(Calendar+057/058)를 병합했다. Runtime source 충돌은 없고 양쪽 canonical API/critical family를
모두 유지한 뒤 생성 metadata를 재생성했다. Calendar lasso는 기존 day item의2개 원행과 집계값7을 유지하고,
theme/decorations·codec·resize·source revision 값9·drop 및 scoped concat sibling identity를 검증한다.
Calendar에 존재하지 않는 position scale을 추정해 brush하지 않고 명시 거부한다. Native resource union이
최종 targets를 검사하므로 기존 unconsumed AST/region hook을 edit.js에 중복 설치하지 않았다.

교차46/46, 타입경계40/40, 실제5×3recipes16/16, browser4/renderer1이 통과했다. 같은 합산 archive
`2de2d6918fb0a2d3644f2019b23a479b1fe909888762c25dbd23966384130efa`로 Node20/22/24 각각
3interaction cases(Calendar lasso 추가 포함)+strict TS+4browser bundles를 통과했다. Node20 최대 측정은
944entries/packed1,360,688/unpacked6,224,525, Full664,335/Basic372,044/interaction106,140gzip이다.
상한은944/1,361,000/6,225,000 및664,400/372,100/106,200으로 최소 올림하고 search970,454는971,000을 쓴다.
SVG 상한25,000은 유지한다. 이전 각 branch cap 통과를 합산 cap 통과로 대체하지 않았다.

전체 문서187 중186개는 merge 전 통과했고 유일 실패는 아직 commit하지 않은 Calendar 예제의 Git 링크였다.
소스 merge `a8681980a` 뒤 provenance를 고정했고 소유 문서20/20와 build를 통과했다.
[통합 qualification](region-integration-evidence/qualification.json)에 최초 실패와 최종 증거를 함께 보존한다.
Built166pages/1431LLM와 변경3페이지의
320/390/768/1440 responsive+Axe(12cells)는 통과했다. Runtime 및 내용이 같은 upstream 전체 화면과
059 전체 화면 증거를 보존하며 이번 integration의 전역 coverage 또는077 전체 완료를 주장하지 않는다.


## Angular 공개 adapter 구현 중

전체 승인 AUTHORIZATION을 재사용한다. `brush`의 `axis:"theta"`(channels는theta만)를 기존 Polar
coordinate·theta binding에 연결하며 새 command/export는 없다. 화면 각도는 위쪽0, 시계방향 양수이고
원래 theta scale은 degrees이므로 한 번만 단위를 변환해 inverse한다. Shift/reverse/partial 범위와
카테고리 band는 같은 scale 소유자를 쓴다. Weighted/proportional Arc는 위치 역함수가 없으므로 거부하고
radial/equal-band Arc만 기존theta 의미를 사용한다. Theta의 기존 공개 scale type 정책을 확장하지 않는다.

Native `region.theta`는 기존 데이터 단위를 저장한다. Optional `screenAngles:[start,end]`는 [0,2π)의
정규화 radians metadata이며 기존items selector에도 붙일 수 있다. 화면 seam은 `[start,2π)∪[0,end]`이나
scale domain의 두끝이 같은화면0에 겹치면 양쪽 데이터값을 선택한다(0/360과 같은 경우). Metadata는
membership을 재평가하지 않으며 resize/revision은 저장domain 또는keys가 소유한다. Set update는
incoming metadata만 보존하고 보통 edit은 제거한다. Cartesian region과 섞거나 polygon과 동시에 쓰면거부한다.

기존 polar frame이 원의 중심·반경을 소유한다. Center/outside-disc down은 비적용, center endpoint는
원자오류와capture정리, 같은각도는empty다. Sector preview는 기존 polar Bézier path 소유자와 wrapped
preview action을 사용하고 root/child placement 및 plotclip을 적용한다. 새renderer명령이나font준비는없다.
공개binding·typed저장·codec·conditional·child·실제pointer6개 검증을 진행했으며 최종qualification전이므로
STEP059/AT36/077 전체완료로 표시하지 않는다.


Angular source 검증은 focused45, native/계약156, 기존Polar/타입/경계69, 실제5datasets×3grain16,
BrowserCanvas/SVG×DPR1/2 6, 네backend+codec primitive pair2, vertical/baseline4가 통과했다.
새 inverse/metadata/preview는100/100/100, regionadapter100/94.83/100이다. Nested frame getter5회
실행의 실제결함을 own-data 사전검사로 고쳐0회 회귀를 포함했고 2π 직전 반올림이360이 되지 않도록했다.
동일 archive634cd1db…(945/1,363,336/6,234,504)로 Node20/22/24 각각3 runtime+TS+4bundle 검사를
통과했다. 문서 전체187중186은 통과했고 새예제함수의미커밋 source link1건은 sourcecommit뒤pin하여
소유검사로닫는다. 이 단계는 source candidate이며 최종 AT36 증거·현재 main 통합·074/077 완료는 아니다.
