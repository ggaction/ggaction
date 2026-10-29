# Typed point transition planner와 sampler

## 진행 상태

- [x] 원안 animation/STEP061–062와 기존 owner를 대조했다.
- [x] remainingApproval를 재사용하고 첫 실행 범위를 기록했다.
- [x] 실제 semantic point 준비와 concrete sample을 구현·검증했다.
- [x] 지원 Node·owner coverage·경계·패키지와 증거를 고정했다.
- [x] source bd296d031를 push했다. 다음 public·typed family 연결은 진행 중이다.

첫 private point checkpoint의 정확한 범위와 원 실패·회복 구분은
[qualification.json](animation-planner-evidence/qualification.json)에 보존한다.
canonical owning 118, 경계 40, 새 owner coverage 100/95.24/100,
weighted 네 backend/browser 13, semantic point 네 backend/browser 2가 통과했다.
Node20/24의 각87은 소스 실행이며 설치 패키지 검증으로 주장하지 않는다.

## 승인과 경계

[전체 잔여 승인](../AUTHORIZATION.json)의 remainingApproval를 재사용한다.
[animation 원안](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의
stable key/role 대응, 의미값→scale→위치, enter/exit, exact endpoint를 실제 native 경로에 연결한다.
이번 첫 checkpoint의 함수는 내부 `animation/planner.js`의 planTransition과
`animation/sample.js`의 sampleTransition이다. public export, scene version, semantic
상태, renderer interpolation은 추가하지 않는다. public entry·offline envelope는 후속
vertical 계약으로 이어가며 전체061/062/AT42/44 완료로 표기하지 않는다.

## 준비와 값 계약

planTransition({from,to,options:{durationMs,easing?}})는 두 native program을 받는다.
durationMs는 명시 finite nonnegative이고 easing은 기존 linear/cubic-in-out(default)다.
기존 endpoints owner가 실제 graphic payload·scene·namespace·key/role을 보존한다.
새 plan은 kind/version, duration/easing, 두 endpoint payload와 update/enter/exit 목록을
frozen data로 가진다. private authentic plan만 sample하며 shallow freeze·structured clone·
unknown version을 offline 복원으로 인정하지 않는다. 함수·clock·DOM·program receiver는
plan에 보관하지 않는다.

Point 의미 projection은 `materialization/animation/point.js`에 둔다. scope는 기존
selectors/resources의 exact namespace 탐색을 공유하고, final eligible row/identity는
selection·itemMissing owner, 선택된 의미값과 scale은 rowEncoding의 mapped:false 및
includeScale을 재사용한다. scale에는 positions가 소비하는 닫힌 resolved 수치만 투영한다.
최종 native circle x/y와 forward mapping을 비교하여 primitive edit·offset·jitter·packing을
의미값으로 위장하지 않는다. conditional 위치는 rowEncoding이 확정한 선택 branch를 따른다.

첫 semantic kernel은 Cartesian circle point의 continuous x/y다. categorical/offset,
packing/jitter, geometry family·topology·primitive 종류 변경, primitive-only input은 명시
crossfade reason을 가진다. 의미값·scale과 native payload가 모두 같은 지원 point만 exact track이다.
같은 pixel은 의미값 동등성의 근거가 아니다.
색·크기·opacity는 지원되는 기존 값 owner를 사용하거나 appearance crossfade로 남기며
arbitrary path/문자열을 강제 morph하지 않는다. 별도 world/pixel inverse는 없다.

## Sample과 concrete 소비자

sampleTransition(plan,timeMs)는 기존 progress/easing을 사용하여
{graphicSpec,scene,progress,decisions}를 반환한다. 네 공개 renderer가 반환값을 직접 받으며
private compiler import가 필요 없다. t0/t1과 duration0은 원 native graphicSpec과 scene을 동일 참조로 반환한다.
중간 scene은 기존 version2 concrete Canvas scene이며 source/target primitive의 clip·offset과
retained image/font bytes를 보존한다. matched incompatible item은 weighted-blend primitive로
낮추고 두 primitive를 source-over로 겹쳐 alpha를 잘못 계산하지 않는다. 서로 다른 backdrop
blend mode는 안전하게 표현할 수 없으므로 구체 오류로 거부한다.

Target update/enter 순서를 유지하고 exit는 source 순서로 뒤에 둔다. anonymous fallback
scene key는 대응 근거가 아니므로 기존 matching대로 enter/exit다. 다만 기존 endpoint.canvases와
sources가 증명하는 같은 named Canvas의 background 역할은 별도 frameTracks로 exact/weighted
대응하여 배경 알파와 앞뒤 순서를 보존한다. Exit scene key는 명시
전환 namespace로 구분한다. enter/exit 위치는 endpoint 고정, opacity만 변화하며 opacity0은
hit가 없다. sample decisions는 exact/semantic-kernel/crossfade/enter/exit 및 명시 이유를 보존한다.

## 한도와 후속 책임

기존 generated/work 한도로 준비 node/track 및 문자열·primitive work를 제한하고 weighted
source2..64/clip/pixel budget을 기존 concrete owner로 검증한다. endpoint 실패나 sample 오류는
이전 program·trace·prepared plan을 변경하지 않는다. unknown native scope/참조는 첫 후보로
추론하지 않고 shared selector가 거부한다.

이후 public entry/type/Current/docs/installed consumer, exact source/scale resource refs와 offline
restore, player/interrupt/history/session frame reconciliation, same-family partition·camera·route
adapter, rule/rect/line/area/polar/graph/guide kernels, 네 renderer export를 연결해야 한다.
기존 순수 camera/partition/routes owner는 이번 point slice에서 다시 구현하지 않는다.
현재 sample 재기준은 아직 미구현이다. 후속에는 현재 계산한 의미값/scale을 authentic frame의
private provenance에 보존하여 같은 planner가 consume하며 pixel 역산이나 원 endpoint로의 되돌림을 금지한다.
Offline 담당은 exportTransitionPlan/restoreTransitionPlan의 단일 owner 검증을 공유한다.
플레이어 wrapper는 root 소유이며 plan의 duration/easing과 별도로 playback 설정을 한 번 보관한다.
