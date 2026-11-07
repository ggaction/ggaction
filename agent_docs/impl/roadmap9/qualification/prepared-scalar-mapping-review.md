# Prepared position scalar mapping: 읽기 전용 제안

상태: `planned`, 제품/수식/API 변경0. `425d76230`의 실제 owner를 읽고 소형 counter만
loader로 관측했다. Root의 별도 읽기 지시이며 제품 채택은 아직 없다.
[Node local-freeze 검토](frame-node-local-freeze-review.md)와 하나의 구현으로 묶지 않는다.

## 실제 중복 경로

`samplePositionInterpolation`은 매 coordinate에서 `mapContinuousScaleValues([value], scale)[0]`를
부른다. Scale는 b′의 exact owned 공유 scale라도 mapping dispatch→linear/transformed vector
owner가 다시 두 pair를 검산한다. Linear는 `.every` 후 `.map`한 local 결과 배열을 core clone해
owned 배열로 반환한다. 따라서1k x/y는 입력 singleton2,000·mapped singleton2,000·core cloned
singleton2,000을 만든다(첫 둘은 source 구조의 산출, 마지막은 실제 counter). Map 출력만으로
core ownership2,000과 clone ancestor2,000의 WeakSet.add4,000도 남는다.

[실제 counter](frame-node-review-evidence/mapping-counts.json)는1k native points를 warm sample
뒤 같은 progress에서 검사했다. X만 각 type으로 바꾸고 Y는 linear다. 매 type에서1000개가
semantic-point다. Linear/time은 mapping2,000회/linear2,000회/pair4,000회/pair값8,000회 검산이다.
Log/pow/sqrt/symlog는 mapping2,000회/linear1,000회/pair4,000회/pair값8,000회에 더해 transform
parameters2,000회와 transformedDomain1,000회가 나온다. 이는 함수 방문 수이며 canonical
planner work 단위로 바꿔 세지 않는다. GC/시간 효과는 측정하지 않았다.

## 가장 작은 공유 owner 방향

현재 수식을 animation으로 복사하지 않는다. `grammar/scales/continuous.js`의 기존 `.map`
callback 연산과 `transformed.js`의 기존 `.map` callback 연산을 각 owner 안의 작은 private
single-value helper로 추출하고, 기존 vector API와 좁은 prepared scalar 경로가 같은 helper를
호출하도록 검토한다. Public vector의 validation 순서·missing/unknown/array 오류·출력
ownership은 유지한다. Time은 기존 linear dispatch를 그대로 쓴다. Radial/ordinal/quantile과
다른 일반 scale는 이 position 전용 prepared 경로에 넣지 않는다. 새 공개 entry/API는 없다.

Prepared scalar는 같은 owner의 기존 full domain/range/clamp/type/parameter 검산을 끝낸
**exact closed scale**에서만 만든 opaque token이다. 단순 core-owned/frozen/copy/hash로
검증 proof를 얻지 못한다. Constructor는 existing validators를 재사용하고 caller array에 stamp를
찍지 않는다. Position endpoint normalize 및 native/offline forward mapping 검증은 유지한다.

수명은 현재 b′ from/to exact scale pair의 progress1slot 안에서 scale와 함께 mapper를 보관하는
방향이 가장 좁다. Value는 primitive parameters/owned pair만 보관하고 program/plan/frame/
endpoint를 참조하지 않는다. 기존 pair의 WeakMap ephemeron 수명과 progress 교체1slot을
유지하고 string-key/무한 Map/history cache를 만들지 않는다. First mapping 성공+finite 검사
이후에만 scale+mapper slot을 publish한다. Collapsed/실패 mapping의 partial cache는 없다.
Preparation context max4·exact token 권한과 양 endpoint full normalize도 그대로다.

중간 domain/range가 생성될 때 기존 validator가 계산한 domainStart/domainEnd/rangeStart/
rangeEnd/span/transform parameters를 보관해 pair 검산을 반복하지 않을 수 있다. 단, value의
finite/log sign 및 mapped finite 검사와 각 row interpolation은 매번 필요하다. Owner helper의
연산 순서와 fallback을 그대로 써야 하며 새 수식이나 모호한 fast path로 대체하지 않는다.

## 반드시 보존할 수학/오류/과금

Linear는 endpoint equality→direct proportion→clamp→finite span/direct output→inverseLerp/
interpolateNumber fallback의 순서를 유지한다. ±0는 Object.is로 비교해야 하고 degenerate
range/overflow/underflow/descending range까지 기존 scalar callback과 같아야 한다.
Transformed는 기존 signed/log/power/sqrt/symlog 안정화 helper와 last endpoint tolerance/
interpolate fallback을 공유한다. Parameters 기본값/own presence와 finite/positive 조건,
log sign/zero 오류, transformed domain collapse, clamp 정책을 바꾸지 않는다.

Closed position은 unknown/radialMapping을 저장하지 않는다. 일반 vector caller의 missing/
unknown/unsupported descriptor/getter는 기존 경로에 남긴다. Prepared token은 copied/frozen/
caller-owned 입력에 권한을 주지 않고 forged token을 거부한다. Native와 restore는 같은
검증 출처를 재사용하되 native 권한을 offline에 발급하지 않는다.

원 planner/native/offline/rebase work와 batch/sample10M를 변경하거나 재정의하지 않는다.
Row/frame/input/ID/scale 수를 줄이지 않는다. v3와 native-v4 wire, raw 의미·새 frame의 모든
수치·기존 reader와 restored replay bytes도 보존해야 한다. 준비 검증/finite 실패 순서는
prototype으로 먼저 비교하고, 달라지면 구체 departure로 보고해야 한다.

채택 전에 독립 literal/vector oracle로 six types·±0·finite extremos·reversed domain/range·
clamp/missing/unknown·invalid descriptor/getter·clone/frozen/token forgery·overflow와 mapping
failure를 비교해야 한다. 이어1k native/offline/rebase/timeline fullframe와 work/wire, actual
allocation counts를 검산하고 source-free/critical/원100k는 제품 checkpoint에서 수행한다.
현재 counter만으로 이 proposal의 성능 또는 지원 완료를 주장하지 않는다.

구체 seam 제안은 internal `mapping.js`의 `prepareContinuousScaleScalar(scale)`와
`mapPreparedContinuousScaleValue(token, value)` 두 함수다(공개 package export0). 첫 함수는
위 full validator 순서로 type/두 pair/옵션을 검산한 뒤 frozen empty opaque token을 만들고
private WeakMap에 pure scalar closure를 연결한다. 두 번째는 exact token만 찾아 기존 owner
callback helper를 실행한다. Closure는 숫자/불변 pair/정규 transform parameters만 갖는다.
이름과 구현은 미채택이며 authority를 일반 scale 객체에 암묵 부여하는 대신 exact opaque
발급 경계를 리뷰하기 위한 구체안이다. 기존 raw vector API는 그대로 각자 validation한 뒤
같은 callback helper를 호출한다. 변경된 callback을 animation에서 재작성하지 않는다.

Position의 기존 `rememberedScale` slot을 `{progress, scale, mapper}`로 함께 교체하는 방향이며,
첫 실제 value mapping 성공/finite 뒤에만 그 slot을 공개한다. 준비된 중간 scale당 constructor는
한 번이고 row value는 매번 검사·계산한다. Scalar closure가 plan/position record를 capture하지
않도록 constructor에서 primitive/pair만 바인딩한다. 이 추가 proof의 정확한 수명·실패 순서·
오프라인 출처 경계가 prototype에서 입증되기 전에는 제품 fast path를 연결하지 않는다.
