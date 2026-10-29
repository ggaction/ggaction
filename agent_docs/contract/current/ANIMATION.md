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

현재 typed vertical은 resolved continuous Cartesian circle point다. 실제 semantic
값과 scale(domain/range/clamp/parameters)을 먼저 보간한 다음 forward mapping한다.
linear/time/log/pow/sqrt/symlog의 기존 버전 kernel을 사용하며 log pixel 역산으로 값을
추정하지 않는다. topology·appearance·coordinate·scale policy가 호환되지 않거나
현재 typed family가 없는 항목은 명시한 reason과 공통 weighted concrete crossfade다.
새 item은 enter, 사라진 item은 exit이며 role/childPath/typed key를 보존한다.
계획 준비의 누적work10,000,000과 양 endpoint 총node10,000 한도를 적용한다.

## 오프라인 저장·복원

`serializeAnimation(plan,playback?) → string`,
`deserializeAnimation(text) → frozen {plan,playback}`다.
playback은 rate1/repeat0/reducedMotionfalse가 기본이며 기존 player와 한 normalizer를
공유한다. rate는 finite(음수·0허용), repeat는0이상 정수 또는 Infinity다.
runtime Infinity는 저장에서만 문자열 `infinite`로 표현한다.

schema1 envelope는 `{kind:'animation',schemaVersion:1,packageVersion,payload,digest}`다.
payload의 plan은 planner 단일 export/restore owner가 검증하며 kernels manifest를 포함한다.
digest는 기존 tagged value의 canonical JSON SHA256이다. 실제 endpoint graphicSpec의
image/font base64 bytes와 semantic position 준비값을 보존한다. hash만 저장하지 않는다.
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
