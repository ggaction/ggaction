# STEP-064 오프라인 저장과 프레임 출력

## 진행 상태

- [x] 원안 animation 계약·STEP064 및 기존 codec/scene/controller 소유자 확인
- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval) 재사용
- [x] planner와 envelope 사이의 단일 검증 책임 합의
- [x] 독립 시각 목록·한도·오염 실패 검증
- [x] 실제 endpoint·이미지·폰트 바이트를 담은 저장·복원
- [x] 새 프로세스의 network 0 및 같은 시각의 canonical scene 일치
- [x] SVG/Canvas/PNG/PDF·공개 타입·문서·설치 소비자

승인은 구현 완료를 뜻하지 않는다. 이 기록은 이미 승인된 원안의 구체화이며,
아직 지원하지 않는 typed kernel이나 STEP077 전체 완료를 선언하지 않는다.

## 소유자와 API 결정

계획 생성기는 `exportTransitionPlan(plan)`과 `restoreTransitionPlan(payload)`에서
계획 version·endpoint·track·kernel manifest를 검증한다. Envelope가 계획의 필드와
호환성 규칙을 복제하지 않는다. 기존 `persistence/codec.js`의 tagged value와
`core/contentDigest.js`를 재사용하며 renderer·clock·host callback을 저장하지 않는다.
실제 graphic endpoint에는 image/font content bytes를 유지한다. 의미 좌표를 계산하는
준비값은 계획 소유자가 함께 보존하므로 복원 중 데이터 조회·추론·fetch가 없다.

`serializeAnimation`/`deserializeAnimation`의 공개 연결은 planner의 안정화와 함께
한 `ggaction/animation` entry에서 수행한다. 상세 envelope version, 누적 byte/value/depth
한도와 재생 설정은 아래의 단일 경계에서 정한다.
hash는 오염 검출이며 실제 payload를 대신하지 않는다.

공개 연결안은 `serializeAnimation(plan, playbackOptions?)`와
`deserializeAnimation(text) → {plan, playback}`다. `playback`은 기존 controller의
`rate:1`, `repeat:0`, `reducedMotion:false` 기본값을 공유한다. runtime Infinity 반복은
저장에서만 `'infinite'`로 표현하고 복원 시 다시 Infinity가 된다. 이 기본값과 검증은
`grammar/animation/playbackOptions.js`가 소유하며 controller의 초기화가 재사용한다.
clock/render callback과 진행 중 time/status/Promise는 저장하지 않는다.

현재 내부 envelope codec은 닫힌 `{kind:'animation',schemaVersion:1,packageVersion,
payload,digest}` 형식을 검증한다. payload는 기존 tagged codec, digest는 그 canonical
표현의 SHA-256이다. 64MiB UTF-8 JSON, decoded 중첩 깊이128, encoded/decoded 각각
1,000,000 값 발생 횟수를 상한으로 둔다. 공유 객체도 발생 횟수마다 세므로 작은 DAG의
지수적 확장을 허용하지 않는다. encoded 구조의 추가 깊이는 검산만 허용하고 복원된
의미 값에는 동일128을 적용한다. 이 codec만으로 payload의 계획 의미를 승인하지 않으며
`restoreTransitionPlan`의 kernel/endpoint/track 검증 이후에만 공개 계획을 반환한다.

`exportAnimationFrames(plan, {timesMs})` 또는 `{fps}`는 순수 sampling 결과를 반환한다.
호스트가 기존 renderer를 골라 출력하므로 파일 I/O·새 player·renderer를 만들지 않는다.
sample owner는 `{graphicSpec,scene,progress,decisions}`를 제공하고 frame export는
`timeMs`만 추가한다. 이에 따라 같은 frame을 Canvas의 `render`와 SVG/PNG/PDF 공개
함수에 직접 전달할 수 있다. 중간 scene의 concrete compiler는 기존 내부 owner를
재사용하며 사용자에게 private import를 요구하지 않는다.
명시 시각은 duration 범위 안의 비어 있지 않은 오름차순·중복 없는 milliseconds다.
fps는 양의 finite 값이며 `frameIndex / fps * 1000`으로 각 시각을 독립 계산한다.
종료시각이 그 격자 위에 없으면 임의의 마지막 frame을 추가하지 않는다. 정확한 종료
장면도 필요한 호출자는 `timesMs`에 duration을 명시한다. duration 0은 `[0]`이다.
frame 수는 기존 generated-item 상한 10,000을 재사용하며 요청 전체를 sampling 전에
검증한다. 실제 frame 누적 작업량은 frame수×max(1,양endpointnode수)로 기존10M 상한을 적용한다.

## 검증 경계

알 수 없는 schema/kernel, 빠진 실제 asset bytes, 변조된 hash/track/index, accessor,
빈 목록·중복 시각·범위 초과와 oversize는 반환 또는 host 작업 전에 실패해야 한다.
원 program/trace 및 이전 계획을 변경하지 않는다. 동일한 time과 고정된 algorithm
version의 canonical scene을 비교하며, OS별 글꼴 raster pixels의 bitwise 동등성을
주장하지 않는다. Typed planner의 미지원 family는 명시한 crossfade reason을 보존한다.

## 독립 내부 체크포인트

새 frameTimes/envelopeCodec/playbackOptions와 기존 controller의 초기 옵션 공유까지
검증했다. animation unit66개 및 변경4source 집중28개가 통과했고 coverage는
100% lines /98.23% branches /100% functions다. 새 helper의 line/function은 모두100%다.
외부 public entry·type·새 ChartProgram 상태는 아직 없다. 원본 실패와 정확 명령·소스
hash는 [independent evidence](offline-independent-evidence/qualification.json)에 보존한다.

기존 전역 discovery의 realistic58/54·composition recipe capability 누락은 root 합산
729a에서 이미 수리했으므로 여기서 중복 수정하지 않았다. 이 체크포인트의 새 테스트는
기존 animation prefix로 모두 도달한다. 현 branch의 원 package cap1065 대비1109entry
실패를 보존했고, Node20/22/24 canonical staging 실제 최대1,580,251 packed /
7,183,760 unpacked에 따른 최소한도1109/1,581,000/7,184,000만 적용한다.
실제 transition offline/fresh-process/4formats 및 공개 package 자격은 다음 결합 의무다.

## 공개 연결 검증

`ggaction/animation`의 여섯 함수는 단일 entry/선언으로 연결했다. planner/rebase는
69cb70d0c, 공개 player는 d86e49cd3의 지정 source/test delta를 보존한다.
현재 typed 지원은 Cartesian circle point이며 다른 family는 명시한 fallback이다.
집중143개, 새프로세스 actual image/font bytes replay, browser DPR1/2, 세시각의
PNG/PDF interior oracle은 통과했다. 동일 tar의3Node 공개5cases/strict타입/실행문서/새browserentry가 통과했다.
source4d7664861 기준 built186페이지/LLM1598자료, desktop search 및 모든페이지의
320/390/768px 검증이 완료됐다. [원실패·보강·최종영수증](offline-public-evidence/README.md)을
함께 보존한다. 특히 network guard를 module import보다 먼저 설치한 fresh-process2case를
같은 tar의3Node에 보충했다. 전체release/다른typedfamily완료로 집계하지 않는다.
