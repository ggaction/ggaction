# Animation

공개 고급 작성 entry는 `ggaction/animation`이다. ChartProgram action을 추가하지 않으며
원 프로그램·trace를 변경하지 않는다. 계획/프레임은 불변값이고 재생기는 명시적인 host
clock·render callback을 가진 일시적 controller다.

## 계획과 sample

`planTransition({from,to,options:{durationMs,easing?}})`은 닫힌 Full/Basic 프로그램을
받아 authentic frozen plan을 반환한다. from/to는 authentic sampled frame도 허용한다.
durationMs는0이상 finite, easing은 `linear|cubic-in-out`이며 기본값은 cubic-in-out이다.
양 endpoint의 실제 materialized graphics와 typed identity·row grain을 사용한다.
행 인덱스·draw order·label을 item correspondence로 추정하지 않는다.

`sampleTransition(plan,timeMs)`는 `{graphicSpec,scene,progress,decisions}`를 반환한다.
이미 sampled frame을 endpoint로 재사용한 경우 그 endpoint에서는 원본 객체와 원래
progress/decisions를 그대로 돌려준다. `exportAnimationFrames`의 timeMs는 새 계획의
시간축이며 기존 endpoint의 원래 progress를 덮어쓰지 않는다.
finite time은 양 끝으로 clamp하며0duration의 time0은 target이다. exact endpoint는
원 graphicSpec/scene 참조를 보존한다. 중간 graphicSpec은 기존 scene concrete owner를
재사용하므로 네 공개 renderer에 frame 자체를 전달할 수 있다. frame clone은 authentic
계획 입력이 아니며 외부에서 재생결과처럼 꾸민 object를 허용하지 않는다.
호환되는 bounded geometry를 반복 중단해도 이전 계획의 재귀 깊이를 누적하지 않는다.
현재 sample의 identity·준비된 의미값만 유지하며 이전 playback controller를 보존하지 않는다.
Weighted crossfade의 실제 source/clip 수 제한은 그대로 적용한다.

Cartesian point typed vertical은 resolved continuous circle point다. 실제 semantic
값과 scale(domain/range/clamp/parameters)을 먼저 보간한 다음 forward mapping한다.
linear/time/log/pow/sqrt/symlog의 기존 버전 kernel을 사용하며 log pixel 역산으로 값을
추정하지 않는다. topology·지원되지 않는 style·coordinate·scale policy가 호환되지 않거나
현재 typed family가 없는 항목은 명시한 reason과 공통 weighted concrete crossfade다.
새 item은 enter, 사라진 item은 exit이며 role/childPath/typed key를 보존한다.
계획 준비의 누적work10,000,000과 양 endpoint 총node10,000 한도를 적용한다.

## 완료된 Graph 배치 전환

GraphPlot은 stable node/edge key와 실제 역할에 따라 완료된 layout의 좌표·반지름·origin·
label offset을 보간한다. Ordinary parallel/loop edge와 arrow는 현재 node anchor에서 기존
geometry 규칙으로 계산한다. Stored world/screen route는 공통 arc-length 기준으로 보간한
뒤 현재 anchor와 radius inset을 적용한다. 매 frame layout·inference·bundling을 다시 실행하지 않는다.
Node/edge reorder, enter/exit, composition namespace와 현재 frame 양방향 재기준을 보존한다.

동일 graph 의미와 concrete output은 exact이며, pixel만 같고 raw layout/origin이 다르면
의미 값을 계속 보간한다. 같은 centerline/anchor는 원 경로의 모서리를 유지한다. Endpoint
관계·parallel 순서·route kind/coordinate space·primitive/clip/appearance 불일치 및 경로
붕괴/stretch는 항목별 명시 사유 crossfade다. 호환 node는 해당 edge와 독립적으로 계속 움직인다.
현재 typed 계산의 decision kernel은 `completed-graph`다. Structured paint 전환 자체는
별도 typed paint 지원이 아니며 실제 공통 weighted concrete 경로를 사용한다.

Graph 준비값은 group당 한 번 보존하고 각 scene item은 key/kind/role로 참조한다. 같은
10M work 한도를 적용하며 복원은 exact refs·원 item identity·forward geometry·kernel version을
검증한다. 재기준 graph 의미는 flat private frame proof에 보존되어 이전 plan 연쇄를 만들지 않는다.
Native current-frame hit는 현재 node/edge 모양과 정확한 endpoint metadata를 사용한다.
Offline 복원 frame은 렌더링·재기준 가능하나 native 프로그램 metadata가 없어 session hit binding은
지원하지 않는다.

## Cartesian Rule·Rect·Bar·Line·Area 전환

동일 final item key/role과 실제 source row lineage를 가진 Cartesian rule, range/band rect,
aggregate/ranged/centered bar, histogram, ordered line 및 area는 `cartesian-geometry` kernel을
사용한다. 준비 시 기존 native owner에서 각 item의 값·resolved scale·구간 endpoint와
곡선/막대 폭/모서리 정책을 읽고 concrete endpoint로 forward 검산한다. 범위·stack·fill·center·
wiggle은 이때 완성한 endpoint 값을 보존하며 sampling 때 집계·binning·stack/layout을 다시 하지 않는다.

Continuous mapping은 point와 같은 linear/time/log/pow/sqrt/symlog owner를 사용한다.
동일 typed categorical domain/order/value와 padding policy의 ordinal/band/point는 range를
보간하고 기존 native band resolver를 사용한다. 선의 linear/step/step-before/step-after/basis/
cardinal/monotone/monotone-steffen/natural 및 area의 허용 curve는 기존 path 계산기를 재사용한다.
수평/수직 방향, 명시 pixel/band/calendar interval 폭과 native grouped offset placement를 보존한다.

곡선·layout·radius·폭 policy, ordered vertex row membership, categorical domain/order 또는
scale policy가 달라지면 명시 reason crossfade다. 위치 conditional, non-Cartesian, overlay/offset
rule, fixed-span/box-span/category-slot 특수 배치와 density-derived area는 이 typed kernel에
포함되지 않는다. Structured paint나 아래 solid 범위를 벗어나는 style 변경도 공통 concrete fallback이다.
성공한 sample은 현재 의미 vector만 flat proof에 보존하여 양방향 재기준과 offline 복원을 지원한다.
저장 payload는 endpoint별 optional Cartesian state와 `semantic-cartesian-geometry@1` version을
포함하며 unknown version·다른 row membership·forward geometry 오염을 원자적으로 거부한다.
기존 public 함수 signature와 scene schema는 바뀌지 않는다. 다른 typed family의 완료를 뜻하지 않는다.
## Partition의 native 일반 방향 전환

PartitionPlot은 저장된 hierarchy layout/view의 normalized cell interval과 정확한
node/parent identity에서 Icicle↔Sunburst 및 같은 좌표 계열의 전환을 준비한다.
호환되는 일반 방향은 기존 bend kernel로 frame origin/basis·치수·각도·hole·CSS gap을
보간한다. 원 구간을 먼저 휜 뒤 현재 CSS gap을 적용하며, body path와 label anchor는
같은 현재 cell을 사용한다. 매 frame hierarchy layout을 다시 계산하지 않는다.
Decision kernel은 `partition`이며 정확 endpoint는 원 native graphics를 보존한다.

현재 curved frame을 양방향 endpoint로 재사용해도 보간한 normalized interval/frame을
보존하고 pixel에서 의미값을 복원하지 않는다. Scene 순서의 body/label item refs와
namespace별 group은 flat provenance에 저장되며 앞선 계획을 붙잡지 않는다.
정확한 layout/hierarchy refs·node lineage·forward geometry·closed kernel version을
저장·복원 시 검증한다. Native cubic sector와 현재 tessellated cell은 각 owner의
동일 계산 결과와 일치해야 한다. 별도 공개 함수나 ChartProgram 저장 schema는 추가하지 않는다.

Hierarchy topology·보이는 item 집합·handedness·radial depth direction·radius policy·
clip·appearance 불일치, 명시 geometry 편집은 사유가 있는 concrete crossfade다.
현재 CSS gap이 cell을 소비하면 `partition-collapsed-cell` 사유로 body와 label이 함께
fallback한다. Structured paint를 의미별로 보간한다고 주장하지 않는다. Native 현재
path hit는 현재 shape와 정확한 native item metadata를 재사용한다. Offline animation
복원에는 editable native 프로그램 권한이 포함되지 않는다.

## Polar point·line·arc 전환

Native polar coordinate의 point(circle), ordered line, proportional/radial/measured arc는
`polar-geometry` kernel을 사용한다. Native mapping/sector owner에서 준비한 각도(degree),
반지름, frame, exact member-key grid를 보존하며 x/y 역산을 하지 않는다. 매 frame 기존
polar projection·line·annular-sector builder를 재사용한다. 각도는 shortest 방향을 따르고
180도 동률은 양의 방향이다. 현재 frame에는 unwrapped 각도를 보존한다. Arc의 signed sweep은
별도로 보간하여 full turn을 유지하며 반대 sweep 방향은 crossfade한다.

이 kernel은 resolved polar-coordinate 의미를 보간한다. Raw 값과 nonlinear scale 자체를
동시에 보간한다고 주장하지 않는다. 원 native mapping descriptor(domain, range, clamp 및
transform/padding policy)의 fingerprint가 다르면 `polar-mapping`이다. Radius range는 frame의
available radius에 대한 비율로 비교하여 같은 상대 범위의 Canvas resize를 지원한다. Proportional
arc는 실제 sector owner가 쓰는 theta range만 비교한다. Digest는 호환성 표식이고 실제 재생 값은
payload의 angle/radius/frame/grid다.

Line은 ordered member grid와 closed policy를 유지한다. 순서·누락·break·categorical domain 변경,
conditional position, 비원형 point, edited geometry, 지원되지 않는 style/structured paint 변경은 기존
명시 fallback이다. Arc pad policy 변경도 fallback이다. Polar Rule/Rect authoring은 native vocabulary에
없으며 새로 추가하지 않는다. Guide circle/rule의 typed 전환은 별도 범위다.

Optional endpoint `polars` vector와 `native-polar-coordinates@1` version을 저장한다. Strict restore는
closed shape, finite/ordered radius, node cardinality, exact lineage 및 native forward geometry를 검증한다.
현재 polar 의미는 flat provenance에 보존되어 이전 plan 없이 양방향 재기준과 offline 재생이 가능하다.
공개 6개 함수 원형과 concrete scene schema는 바뀌지 않는다.

## Solid 색·투명도·선 두께 전환

호환되는 point·Cartesian·polar·graph·partition geometry track과 native Geo feature는
같은 현재 geometry에 solid fill/stroke, opacity, 명시 strokeWidth를 함께 보간한다.
색은 기존 host-independent parser와 premultiplied linear-sRGB kernel을 사용한다.
예를 들어 black→white의 절반은 sRGB 약0.735357(8bit188)이며, none→red는 red chroma를
유지하면서 alpha만 증가한다. 별도 opacity는 linear이고 생략은 기존 기본1이다.
StrokeWidth는 양 endpoint에 명시된 finite non-negative 값일 때만 보간한다.
원 endpoint의 작성된 CSS 색 문자열과 graphicSpec은 정확히 보존한다.

Structured fill 변경·미해결 host color·다른 font/text/effect/static policy 변경은
appearance 사유 crossfade다. 동일 structured Geo style의 native part 재물질화는 기존대로
유지하며 structured paint 자체를 보간하지 않는다. 현재 solid 색/수치는 concrete properties에서
재기준하고 별도 semantic state나 이전 plan 연쇄를 보존하지 않는다. Decision kernel은 해당
geometry owner를 그대로 사용한다. Native hit/focus는 현재 paint·opacity·clip footprint를 읽는다.

Transition plan/kernel은 version2이며 required kernels.appearance는
`premultiplied-linear-srgb@1`이다. 미발행 개발 plan version1이나 빠진/unknown appearance kernel은
복원을 거부한다. Envelope schema1은 그대로이고 새 public function이나 ChartProgram 저장
resource는 추가하지 않는다.

## 오프라인 저장·복원

`serializeAnimation(plan,playback?) → string`,
`deserializeAnimation(text) → frozen {plan,playback}`다.
playback은 rate1/repeat0/reducedMotionfalse가 기본이며 기존 player와 한 normalizer를
공유한다. rate는 finite(음수·0허용), repeat는0이상 정수 또는 Infinity다.
runtime Infinity는 저장에서만 문자열 `infinite`로 표현한다.

schema1 envelope는 `{kind:'animation',schemaVersion:1,packageVersion,payload,digest}`다.
payload의 plan은 planner 단일 export/restore owner가 검증하며 kernels manifest를 포함한다.
digest는 기존 tagged value의 canonical JSON SHA256이다. 실제 endpoint graphicSpec의
image/font base64 bytes와 semantic position·Cartesian geometry·완료 graph layout/route·normalized partition 준비값을 보존한다. hash만 저장하지 않는다.
tracks·correspondence는 동일 version owner에서 재구성하며 중복 authority로 저장하지 않는다.
unknown schema/kernel, 잘못된 forward mapping/identity, 오염·빠진 asset bytes는 복원실패다.
복원에는 semantic dataset 조회·fetch·loader·clock·renderer 호출이 없다.

최대64MiB UTF8 JSON, decoded depth128, encoded/decoded 각각1,000,000값 발생 횟수를
먼저 검사한다. 공유객체도 occurrence마다 센다. callbacks·DOM·진행중 clock/time/status,
Promise·runtime handle은 저장하지 않는다. 실패는 authentic 계획을 반환하지 않으며
원래 프로그램과 앞선 계획은 그대로 유지한다.

## 프레임 내보내기

`exportAnimationFrames(plan,{timesMs}|{fps})`는 frozen frame 배열이며 각 원소에
`timeMs`를 추가한다. timesMs는 duration범위 내 비어있지 않은 엄격 오름차순 finite값이다.
fps는 양의finite, 시각은 `index/fps*1000`이며0부터 duration이하만 생성한다.
종료시각이 grid바깥이면 자동추가하지 않는다. 정확한 마지막 장면이 필요하면 timesMs에
duration을 직접 넣는다. duration0은[0]이다. frame10,000 및
frame수×max(1,양endpointnode수)10,000,000을 sampling전에검증한다.
시간목록은 caller입력을 변경하지 않으며 파일출력·새renderer·hiddenI/O를 만들지 않는다.

## 공개 player

`createAnimationPlayer({plan,clock,render,commit?,rate?,repeat?,reducedMotion?})`는 기존
controller를 재사용한다. clock은 명시적인 `now/requestFrame/cancelFrame`이며 단조롭고
finite인 milliseconds와 비동기 frame callback을 제공한다. render/commit은 동일한
renderer-ready frame을 받는다. 기본 browser clock이나 renderer를 암묵적으로 생성하지 않는다.

methods는 `play/pause/seek/reverse/setRate/setRepeat/cancel/dispose/getState/getFrame`,
`finished` Promise, `interrupt({to,options:{durationMs,easing?},rate?,repeat?,reducedMotion?})`다.
interrupt의 to는 프로그램 또는 authentic sampled frame이다. 양의 rate는 현재 frame을
from, 음의 rate는 현재 frame을 to에 놓고 반대 방향으로 진행한다. 거절된 target은
활성run과 pendingframe을 유지한다. commit은 완료시1회, dispose는 반복호출 안전하다.
reducedMotion은 진행방향 endpoint로 이동하되 같은 frame과 완료정책을 사용한다.
재진입 제어는 기존 FIFO256한도를 공유하며 끝난 run의 finished는
completed/cancelled/interrupted/disposed 이유와 timeMs/iteration으로 settle한다.

## 증거

`test/unit/animation/`의 pure/planner/restore/controller/offline 검사는 version·identity·
시간·failureatomicity를 소유한다. assets fresh-process 검사는 endpoint에 포함한 실제bytes만
읽고 network0에서 같은시각의scene/SVG/PNG/Canvas를 비교한다. renderer/browser와설치
검사는 동일 frame을공개renderer에직접전달하며 privatecompilerimport를 요구하지 않는다.
모든 typedfamily의 의미별보간이나 전체roadmap완료를 뜻하지 않는다.

## Geographic camera frames

동일 scoped Geo owner와 typed feature key의 shape/point/line/graticule은 `native-geo` camera
kernel을 사용한다. 원 geographic/planar geometry, polygon winding, mode, exact resource ref와
해결된 camera parameters를 한 번 준비한다. Quaternion 최단 회전, positive scale의 log 보간,
translation 및 CSS point radius를 기존 camera/value owner로 계산한 후 native projection stream을
다시 실행한다. Pixel 역산이나 endpoint path command의 단순 보간을 하지 않는다.

중간 clip/horizon/seam 때문에 endpoint에 없던 feature 또는 part가 나타날 수 있다. 이 경우
`{kind:'geographic',kernel:'native-geo',ownerKey,itemKey,role}` decision을 사용하며 가짜
`sourceIndex`/`targetIndex`를 만들지 않는다. 실제 현재 geometry와 native item identity를
같은 순서로 만들고 native scene key 규칙을 재사용한다. 정확 t0/t1은 원 scene/graphicSpec을
그대로 반환한다. Hidden source도 명시 collection slot에 보존하여 drawing order를 유지한다.

Projection type·static clip/parameter·binding·원 geometry/winding·source paint 정책이 다른
feature는 명시 reason의 concrete crossfade다. 같은 owner의 다른 호환 feature는 typed camera
경로를 유지한다. 변경되는 structured paint 보간은 지원하지 않지만 동일 paint의 현재 geometry
bounds는 기존 materializer로 계산한다. Primitive 직접 편집도 `edited-geo-graphics`로 구분한다.

현재 프레임은 실제 prepared geometry/camera/style와 target exact resource lineage를 flat private
proof에 유지한다. 양방향 rebase와 offline 저장은 같은 상태를 소비하며 이전 plan을 보유하지
않는다. Optional endpoint `geos`와 `native-geo-camera@1`을 저장하고 closed shape, feature/part,
forward geometry, order, work bounds 및 version을 재검증한다. Native hit는 실제 target program의
childPath/owner/source feature를 검증한다. Offline payload는 native program 권한을 만들지 않는다.
중간-only feature의 session click/keyboard activation은 실제 그려진 source key와 현재 native
source의 child scope/owner/resource kind+id/key 교집합을 사용한다. 각 source revision을 독립
검증하며 서로 같다고 가정하지 않는다. Target hit lineage는 유지하고 선택 intent가 현재 native
projection에서 숨겨지면 저장은 유지하되 visible highlight는 비어 있다.
Geo labels/annotation의 camera-aware typed 이동은 별도 통합 의무이며 이 Geo body 경로의
완료로 간주하지 않는다.
