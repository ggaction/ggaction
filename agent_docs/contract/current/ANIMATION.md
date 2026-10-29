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

Cartesian typed vertical은 resolved continuous circle point다. 실제 semantic
값과 scale(domain/range/clamp/parameters)을 먼저 보간한 다음 forward mapping한다.
linear/time/log/pow/sqrt/symlog의 기존 버전 kernel을 사용하며 log pixel 역산으로 값을
추정하지 않는다. topology·appearance·coordinate·scale policy가 호환되지 않거나
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

## 오프라인 저장·복원

`serializeAnimation(plan,playback?) → string`,
`deserializeAnimation(text) → frozen {plan,playback}`다.
playback은 rate1/repeat0/reducedMotionfalse가 기본이며 기존 player와 한 normalizer를
공유한다. rate는 finite(음수·0허용), repeat는0이상 정수 또는 Infinity다.
runtime Infinity는 저장에서만 문자열 `infinite`로 표현한다.

schema1 envelope는 `{kind:'animation',schemaVersion:1,packageVersion,payload,digest}`다.
payload의 plan은 planner 단일 export/restore owner가 검증하며 kernels manifest를 포함한다.
digest는 기존 tagged value의 canonical JSON SHA256이다. 실제 endpoint graphicSpec의
image/font base64 bytes와 semantic position·완료 graph layout/route·normalized partition 준비값을 보존한다. hash만 저장하지 않는다.
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
