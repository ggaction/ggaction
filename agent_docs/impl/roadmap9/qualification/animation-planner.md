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
현재 sample 재기준은 아래 private 경계로 구현했다. 현재 계산한 의미값/scale을 authentic frame의
private provenance에 보존하여 같은 planner가 consume하며 pixel 역산이나 원 endpoint로의 되돌림을 금지한다.
Offline 담당은 exportTransitionPlan/restoreTransitionPlan의 단일 owner 검증을 공유한다.
플레이어 wrapper는 root 소유이며 plan의 duration/easing과 별도로 playback 설정을 한 번 보관한다.

## Private plan 복원 경계

같은 remainingApproval 안에서 exportTransitionPlan/restoreTransitionPlan을 추가한다.
Payload는 kind/version, kernels={transition:1,position:기존 positions version}, duration/easing,
from/to 각각의 실제 graphicSpec과 node별 positions만 가진다. transition version은 timing,
easing, matching, weighted crossfade 정책을 함께 고정한다. scene/track/index/enter/exit는
저장하지 않고 기존 endpoint projection과 planner가 다시 생성한다. 같은 결정을 두 번 저장하지 않는다.
positions는 닫힌 x/y 의미값과 resolved scale 또는 현재 adapter의 명시 unsupported reason이다.
복원은 descriptor-safe 순회·depth128·기존 work 한도 뒤 기존 graphic validator 및 position
owner를 호출한다. 모든 node의 자료를 검증하고 x/y forward mapping과 concrete endpoint의
정합성을 확인한다. getter·추가 field·undefined·unknown version/kernel·cycle·잘못된 reason은
거부하며 native action, source resolver, layout solver를 실행하지 않는다.
이것은 저장된 준비값의 내부 정합성 증명이며 임의로 재서명한 파일의 역사적 출처 인증은 아니다.
원 bytes 변조 감지는 별도 envelope의 canonical payload digest가 소유한다.

현재 frame provenance는 root의 lightweight WeakMap owner가 단독 소유한다.
native plan receiver와 sample의 현재 의미값/scale을 private 등록하며 offline hit의 childPath
복원은 아직 후속 의무다. 이 checkpoint는 공개 API·완전한 interrupt/player 완료를 주장하지 않는다.

## 현재 프레임 재기준

Root의 frameProvenance owner를 그대로 재사용한다. planTransition의 from/to 양쪽은 native
program 또는 authentic sample이며, 후자는 현재 x/y 의미값과 scale을 positions kernel에
그대로 제공한다. 역방향 재생도 target program→captured frame 순서로 준비할 수 있다.
requireTransitionEndpoint는 player가 queue 변경 전에 동일 입구 검증을 재사용하는 private helper다.
중간 frame의 identity/background는 이전 계획의 명시 source/target index에서만 가져오며
namespace나 scene hash를 분해하여 의미를 추정하지 않는다. rebase endpoint 자체는
scene·identity·positions로 평탄화한다. Weighted source는 기존 bounded flattening을 사용한다.

Exact runtime endpoint는 capturedFrame 객체 자체를 반환한다. 따라서 기존 progress/decisions는
그 frame의 원 timeline 값이며 소비자는 private proof의 plan/timeMs로 해석한다.
Sampled endpoint를 저장할 때 scene+identities+backgrounds+positions와 bounded view 진단만
저장하고 graphicSpec은 공통 scene compiler로 재생한다. Native boundary는 원 graphicSpec을
그대로 보존한다. 복원 후 시작/중간/끝의 전체 frame deep equality를 검사한다.
withSampleTime(frame,timeMs,plan)은 offline frame 목록에 time label을 추가하면서 exact endpoint
소속을 검증하고 authentic provenance를 유지한다.

이전 sample의 runtime 정확한 객체와 provenance가 과거 plan을 참조하는 수명 문제는 남아 있다.
또한 offline session hit의 실제 childPath, player controller와의 통합, compatible family 확장,
전체 renderer·설치 qualification은 각각 후속 소유자가 닫아야 한다. 여기서 완료로 표기하지 않는다.
