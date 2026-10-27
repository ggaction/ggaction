# Transition planner sampler player 계약

## 모듈 경계

ggaction/animation의 제안 API는 planTransition({from,to,options}), sampleTransition(plan,timeMs), createAnimationPlayer({plan,clock,render}), serializeAnimation/deserializeAnimation다. plan/sample은 DOM 없이 순수하고 immutable 결과를 반환한다. player만 RAF/clock을 가진다. scene는 기존 ggaction/scene의 typed format을 확장하되 SVG/Canvas scene를 무타입 object로 섞지 않는다.

Plan은 schemaVersion, from/to editable or scene refs, durationMs, easing, matches, enter/update/exit, topology decisions, kernels/version, assets/fonts, options hash를 가진다. endpoint program을 저장하지 않고 hash만 저장하면 offline replay할 수 없으므로 bundle에 실제 endpoint payload 또는 content-addressed bytes를 포함한다.

## Matching과 enter update exit

match는 core의 stable item key와 primitive role로 수행한다. 동일 key라도 primitive kind/topology/coordinate family가 다르면 typed kernel 지원 여부를 확인한다. match 결과 reason은 exact/semantic-kernel/crossfade/enter/exit다. arbitrary path command count를 맞추기 위해 zero commands를 삽입하지 않는다.

enter는 opacity0→target, exit는 source→opacity0, update는 속성을 보간한다. 위치 origin은 explicit enterFrom/exitTo가 없으면 endpoint 위치 고정이다. bar는 baseline kernel이 있으면 extent0에서 성장하도록 explicit 선택할 수 있다. enter/exit가 overlap하면 semantic item key로 hit/event를 deduplicate한다. opacity0에는 hit가 없다. t=0/1은 원 endpoint scene를 그대로 반환한다.

## 수치 interpolation

u=clamp(timeMs/durationMs,0,1), eased=e(u). duration0은 time<0이면 from, time≥0이면 to. default ease cubic-in-out: u<.5이면4u³, 아니면1−(−2u+2)³/2. linear 옵션은 expected 수치 oracle에 사용한다. translate/size/opacity는 linear, scale transform은 positive 값에서 log-space, rotation은 shortest arc이며 exactπ tie는 positive 방향이다.

linear numeric x0=10,x1=30,duration1000이면 t0/250/500/750/1000 결과10/15/20/25/30. log-domain scale endpoints1→100의 중간은10이다. color는 기존 color interpolation contract를 우선 적용하고 새 alpha는 premultiplied linear-light RGBA 정책을 version으로 명시한다. transparent black과 red 중간의 색을 잘못 어둡게 하지 않는다. text 문자열 자체는 numeric lerp하지 않고 crossfade 또는 explicit number formatter track으로 처리한다.

## Typed kernel 표

| 종류 | 보간 공간 | 금지 및 fallback |
|---|---|---|
| Cartesian point/rule/rect | semantic endpoints→interpolated coordinate/scale | x/y pixel만 보간해 log 의미 손실 금지 |
| line/area | 같은 ordered member key와 topology의 sample grid | missing break/series merge는 crossfade |
| arc/polar | unwrapped angle+radius, seam-shortest policy | start/end 문자열 lerp 금지 |
| partition | normalized u/depth와 hierarchy bend | hierarchy topology 변경은 semantic crossfade |
| graph nodes | stable node key positions, fixed endpoints | inference를 매 frame 실행 금지 |
| bundled edge | stable edge와 resampled route, endpoint correction | 다른 edge로 morph 금지 |
| geo | camera quaternion/log-scale/translation, projection clip | incompatible projection은 crossfade |
| guides | semantic tick values와 coordinate mapping | tick array index로 label rename 금지 |

bundle route update는 normalized arc-length parameter sample grid를 공통으로 만든 뒤 interpolation한다. 매 frame의 first/last point를 현재 node anchor에 정확히 붙인다. geometric stretch/clip을 검사하고 collapse되면 safe fade를 사용하며 reason을 남긴다. current scene geometry를 hit engine에 넘긴다. select action이 endpoint source graph와 current drawn route를 혼동하지 않게 한다.

## Timeline과 player

timeline track은 target item/property/kernel과 keyframes[{timeMs,value,easingToNext}]다. time nondecreasing, 같은 target/property의 겹치는 track은 default error, explicit priority composite만 허용한다. marker/event는 forward crossing에서 once-per-iteration, seek 기본 emit:false다. keyframe value는 함수가 아니라 serializable data다.

player 상태 idle/playing/paused/finished/cancelled/disposed. clock은 now()와 requestFrame/cancelFrame interface이고 테스트는 virtual clock으로 주입한다. play는 anchorClock/anchorTime을 저장, frame time=anchorTime+(now−anchorClock)×rate. pause/seek/reverse/rate 변경 전 current time을 먼저 sample한다. seek는 clamp, rate0은 pause semantics, reverse는 부호 반전이다. repeat count는 음이 아닌 정수 또는 explicit Infinity runtime-only 옵션; serialized plan은 finite count 또는 string 'infinite'로 저장한다.

interrupt default replace는 현재 sampled scene를 새 from으로 capture하여 새 목표까지 진행한다. 옛 from 또는 to로 튀지 않는다. finished Promise는 각 run마다 새로 만들고 completed/cancelled/interrupted/disposed reason으로 정확히 한 번 settle한다. dispose 뒤 RAF/render callback0. reduced motion은 final scene로 이동하고 commit/finished를 각각 한 번 유지한다.

## Frame export

export time list는 explicit milliseconds, sorted unique. 영상 frame list는 frameIndex/fps×1000로 계산하고 wall clock을 사용하지 않는다. SVG/Canvas/PNG/PDF는 같은 sampled scene를 소비한다. PDF가 vector 지원 못 하는 node가 있으면 documented lowering이 있어야 하며 전체 chart screenshot fallback은 금지다. offline envelope는 resource/font/kernel versions를 검증하고 unknown kernel은 명시 오류다.

## 시험 순서

1. pure interpolation 숫자와 t0/t1 equality.
2. stable identity update/insert/delete/reorder와 topology decisions.
3. virtual clock pause/seek/reverse/rate/repeat/interrupt/zero duration.
4. partition/geo/bundle typed kernel endpoint와 intermediate invariants.
5. 실제 browser에서 animation 중 hit/selection/cancel/resize.
6. fresh process offline load→같은 time scene hash→네 export 경로.

same-time scene은 같은 runtime/algorithm version에서 byte-equivalent canonical numeric scene로 검증한다. 다른 OS 폰트 raster pixels까지 bitwise 동일하다고 주장하지 않는다. 폰트 hash와 metric profile을 고정한 뒤 geometry/색과 제한된 pixel tolerance를 각각 평가한다.
