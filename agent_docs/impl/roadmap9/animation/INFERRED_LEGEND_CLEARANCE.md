# 실제 axis ink를 따르는 inferred legend clearance

## 진행 상태

- [x] Native 네 방향 clearance를 read-only owner로 추출했다.
- [x] Full/Basic 네 edge의 기존 작성·편집 및 Full 삭제 20개 의미/trace가 동일하다.
- [x] 독립 literal·native56검사·새 owner coverage100/100/100, source boundaries13을 확인했다.
- [x] Canonical current fixed axis line/tick/label/title meaning의 complete dependency proof.
- [ ] R의 dynamic label group/current bounds와 종속 제목을 참조하는 typed lane 연결.
- [x] 고정 축 범위의 strict rebase/offline/네renderer/실제data/동일 archive 3Node qualification.
- [ ] 합산된 R dynamic emission 의존성의 추가 qualification.

[AUTHORIZATION.json](../AUTHORIZATION.json)의 remainingApproval과 기존 inferred lane 승인을
재사용한다. 처음의 순수 owner 추출과 후속 Guide12 공개 고정 축 확대를 아래에서 구분한다.
기존 lane10 source는 dc704e9f6, pin은5c054738f다.

## Native 식과 경계

`materialization/guides/axisClearance.js.resolveAxisLaneClearance(position,plot,blocks)`는
같은 edge의 실제 occupied blocks에 대해 bottom−plot.bottom, plot.top−top,
plot.left−left, right−plot.right 중 해당 방향의 최댓값과0을 반환한다. Native
`resources.resolveLegendAxisOffset`의 inferred/edge/legacy short-circuit은 그대로이며
original config.offset에 이 값만 더한다. Source/semantic/graphic/trace mutation은 없다.
Explicit offset, in-plot, legacy는 axis 조회 자체를 하지 않는다.

## 후속 typed 설계

Endpoint의 계산된 offset이나 pixel bounds를 보간하지 않는다. Current typed axis line,
tick, fixed label/title 및 R의 dynamic label group이 실제 native 계산으로 내는 nonempty
labelBounds/requiredBounds를 사용한다. Dynamic raw values/layout은 R groups 단일 owner가
저장하므로 lane은 scope/axis owner의 exact reference로 이를 가리키며 layout을 복제하지
않는다. 어떤 current sibling이 unsupported 또는 오염된 경우 전체 종속 lane을 명시
fallback한다. Exact metrics/font binding, label ink, stroke와 원4방향 식을 유지한다.

Timeline3에서는 축과 범례의 native-progress가 서로 다를 수 있으므로 dependency를
범례 progress로 재생하면 안 된다. 각 dependency의 실제 owner progress 및 최종
strokeWidth/paint patch를 같은 read-only sample context에서 적용해 native occupied
bounds를 얻는다. 단순 opacity/fill도 native bounds owner가 결정하는 의미를 유지한다.
현재 child namespace frame 변환도 해당 owner progress에 맞춰 검증한다.

Dynamic label emission과 current dependency samples를 받는 최소 sample context는 root/R와
함수 경계로 합친다. Shared4는 이번 foundation에서 변경하지 않는다. Guide manifest10 및
현재 public signatures도 그대로다. 실제 typed 확대 이후 manifest version을 함께 정합한다.

## 검증

[qualification.json](axis-clearance-foundation-evidence/qualification.json)에 정확 baseline
5c054738f의 resources 모듈을 Node load hook으로만 대체한 before/after20개 비교, 최초
package entry 실패 및 각 Node 실측을 보존한다. 프로브 첫 초안의 Basic removeAxis 호출은
공개 Basic에 없는 메서드여서 Full만 삭제를 검사하도록 정정했다. 또한 최초 operations
필드는 실제 trace가 아니므로 의미 비교만 가능했으며, 최종 프로브는 canonical trace 전체를
포함해 양쪽을 다시 실행했다. 실행 소스의 reset/임시 교체는 하지 않았다.


## Guide12 공개 고정 축 의존 확대

기존 remainingApproval을 재사용하여 `legend-axis-lane`의 닫힌 상태는 기존 lane layout,
정렬된 exact `axes` guide key 배열, native `{kind,owner}` offset 상속만 저장한다. 축의
scale/layout/metric은 각 axis state가 소유하며 lane에 복사하지 않는다. Guide manifest12는
이 새 meaning을 식별하며 이전10 payload는 조용히 다른 결과로 재생하지 않고 거부한다.
Transition3/Cartesian2/GeoText2와 공개 signatures는 보존한다. R dynamic11의 합산은 후속이다.

`guideTracks`는 준비 시 동일 scope/edge와 전체 sibling/axis refs를 검산하고 private WeakMap에
정확한 axis kernel만 둔다. 샘플은 승인된 `sampleGuideInterpolation(plan,progress,timeline)`
한 호출로 각 axis owner의 실제 progress 및 actual targetIndex의 `timeline.node`를 읽는다.
현재 strokeWidth, child offset, rectangular/path clip은 기존 `graphicBounds`의 occupied 수식으로
계산한다. 축 전체가 clip 밖이면 ink가0인 것이며, fallback weighted geometry를 native
경계로 추정하지 않는다. Node key나 endpoint offset은 의미값 보간에 사용하지 않는다.

명시 숫자 title offset도 inferred lane이 요구할 때 exact font metric을 가진 고정 title-layout으로
준비한다. 문구·font·lines가 실제 native text와 다르면 forward proof가 거부한다. 기존 inferred/
label-relative title owner는 그대로 재사용한다. 축과 범례를 서로 다른 속도로 재생해 transient
lane fit이 불가능하면 native `canvas-overflow` 진단을 전체 lane `guide-layout` fade로 보존한다.
이 오류는 최초 installed 사례에서 발견되었으며 단순 샘플 오류나 합격으로 덮지 않았다.

실제 static size placement의 inherited offset은 `effectiveLegendOffsetConfig`가 정본이다.
Categorical explicit offset을 size가 상속하는 경우 size 저장 flag만 보고 축 의존으로 분류하던
불필요한 fallback을 같은 owner 호출로 교정했다. 해당 원 실패와 explicit/inferred 혼합 회귀를
보존한다. 저장 gap을 늘리거나 원 데이터를 바꾸는 수리는 하지 않았다.

Dynamic label group의 최종 emitted bounds lookup, 빈 raw tick 소유자와 inferred title의 동적
의존성은 R11과 후속 union에서 완료할 항목이다. 현재 pending은 전체 STEP077 또는 원 reflow
요구 완료로 집계하지 않는다. 새 renderer/schema/API 또는 자동 compiler는 추가하지 않았다.

## Dynamic dependency union 준비 — 아직 미구현

고정 축 source98d5e6021/pin0b862fcd5 뒤 R의 안정 dynamic emission source를 병합하여
별도 coherent checkpoint로 진행한다. 동일 remainingApproval을 재사용하며 현재 scope를
완료로 바꾸지 않는다. Lane은 exact axis-label ownerKey를 참조하고 title도 전체 label
layout을 복제하지 않는 같은 참조 경계를 사용한다. 숨긴 tick 또는 0줄 collection도 owner
참조를 유지하므로 두 endpoint에 보이지 않는 중간 label을 놓치지 않는다.
이 새 저장 의미는 예약된 guide13으로 구분한다. 기존11/12를 새 의미로 조용히 해석하지 않고
closed-version rejection을 유지한다. 공개 API/transition3/Cartesian2/GeoText2는 그대로다.

R의 read-only `timeline.axisLabelGroup(ownerKey)`는 그 프레임에 실제로 적용한 line style의
`graphics`, native `labelBounds/requiredBounds`, exact `metrics`를 공급한다. Group의 저장
slot/insertion은 이 lookup에 포함하지 않는다. 그 정본은 R collector의 finalization이다.
범례는 실제 patched graphics의 stroke/offset/clip을 공통 primitive occupied bounds로
측정하며, inferred/label-relative title은 원 native label bounds와 title 배치식을 재사용한다.
범례 progress로 축 layout을 다시 계산하지 않고 실제 axis owner progress를 한 번 소비한다.
동일 raw value의 line별 paint가 달라 typed group proof를 잃으면 현재 그림은 보존하면서
종속 lane/title의 typed 의미를 fallback으로 구분해야 한다. R collector는 그 경우 lookup을
undefined로 반환하여 실제 drawing과 typed dependency admission을 명확히 구분한다.

승인된 shared 변경은 planner의 세 read-only context 전달이다. Native guide projection,
guide-track preparation, strict guide restore에 이미 한 번 준비/검증한 `axislabels`를 넘긴다.
별도 projection/cache나 renderer 의미 조회는 추가하지 않는다. 실제 sampler는 R의 current
lookup을 재사용하고 fixed guide12/기존 timeline3/다른 family proof를 보존한다.

필수 후속 검증은 네 방향 native midpoint, 독립 axis/lane retime, 줄 수 변화·전체 숨김·
중간-only raw tick, current stroke/clip/중첩 offset, 정확 schema2 측정 closure, source/target-only
그룹, manual edit 및 불완전 dependency, whole frame rebase/offline/order, work budget이다.
Label-relative title에 현재 label이 없으면 원 native 배치가 성립하지 않으므로 명시 fallback이며,
inferred title은 원 preferred/clamp 정책을 따른다. 새 일반 pixel animation으로 대체하지 않는다.


## Guide13 동적 의존 공개 연결

R source0811878a9500f2637e1ea60a1e4d40eb352f8370를 병합하고 위 준비안을 구현했다.
[remainingApproval](../AUTHORIZATION.json)의 공개 저장·시각·architecture 승인을 그대로 재사용한다.
새 public API 없이 guide13으로 exact dynamic refs의 저장 의미를 구분하고 guide11/12는 거부한다.
Transition3/Cartesian2/GeoText2는 유지한다. Title `labels:{group}`와 lane `labelGroups`는
canonical ownerKey만 저장한다. Empty/raw owner도 보존하고 그룹의 layout/metrics/slot을 복사하지 않는다.

Current lookup은 이미 한 번 적용된 line style의 graphics와 exact metrics만 소비한다. Title도
원 action이 실제 label occupied ink를 읽는 정책에 맞춰 동일 clip/offset owner를 사용한다.
초기 clip 회귀에서는 unclipped `labelBounds`를 그대로 사용해 title이 guide-edited가 된 것을
보존했고, 실제 current graphics에서 같은 native ink를 계산하여 whole-frame equality를 복구했다.
Font/line-style conflict는 drawing을 보존하면서 typed dependency 전체만 fallback한다.

승인된 shared delta는 planner의 이미 준비된 axislabels context 세 전달, sample finish의
`retainSampledGuideMeaning(guides,axisState)`, 기존 account callback을 timeline에 전달하는
한 줄뿐이다. R의 emission/slot/actual-work/다른 family를 유지한다. 새 projection이나 과거 plan
cache는 없다. Lane 계산 cache는 같은 immutable 현재 dependencies/labelGroups/layout에만
결박하며 cache hit는 다시 과금하지 않는다. Budget callback의 RangeError를 native 배치 fade로
삼키지 않는다. Text 줄·글자·font 목록과 path/clip command 방문량을 공통 occupied helper에서
과금하고 정확10M/1초과·부분 batch 없음 회귀를 검증한다.

정확 글꼴 fixture의 native midpoint를 Canvas/PNG/SVG/vector PDF와 Browser DPR1/2에서
대조한다. 최초 DPR2 probe는620×600 Canvas의 weighted background가 기존 raster 한도를
초과했다. 허용한도를 올리지 않고 fixture의 불필요한 빈 높이를400으로 줄여 기존 한도 안에서
동일 label 줄 전환·title/legend geometry를 검증하며 원 실패를 증거에 보존한다.

최종 source/동일 tar/문서 검증 영수증은 후속 qualification 기록이 소유한다. 이 checkpoint는
non-Cartesian inferred clearance, 변경된 정책 또는 STEP077 전체 완료를 주장하지 않는다.


### Guide13 최종 qualification

공개 소스 `68ff7c62f`는 R의 동적 label source `0811878a9`를 병합한다.
[재현 기록](dynamic-dependency-evidence/qualification.json)에 전체 animation 696,
14개 신규 owning을 포함한 보충45, 타입·경계26 및 최종 package/cap11, 문서238, 실제5개 source,
실제 font의 네 renderer와 Chromium Canvas/SVG DPR1/2 결과를 보존했다.
정확 archive `46f17f22714c9aa9ccb04a14d9c29a98aa19d7086816c999cb37b56ef190acf3`의
1,239개 canonical 입력 차이는 0이며 Node20/22/24 각각11 runtime·strict 타입·실행 문서·optional peers·
6개 bundle이 통과했다. 최초 fixture/limit/cap 실패는 별도 로그로 남겼다.
소스 pin 후29개 검사, Jekyll186 pages/1,603 LLM artifacts 및 변경 페이지4폭의 overflow/Axe/console0,
desktop search가 통과했다. 이 결과를 다른 transition family 또는 전체 STEP077 완료로 집계하지 않는다.
