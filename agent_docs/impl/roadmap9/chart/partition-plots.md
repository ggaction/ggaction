# Partition plot 공개 연결

## 진행 상태

- [x] STEP025–028 원안, 기존 hierarchy checkpoint와 14 variant 대조
- [x] 승인 재사용 및 공개/stored 계약 구체화
- [x] Icicle/Sunburst·focus·revision·selection·codec 소비자 연결
- [x] 타입·Current·공개 문서·action inventory 동기화
- [ ] 공개/primitive·4 renderer·설치 consumer 검증 및 checkpoint
- [x] 순수 screen bend adapter/sampler와 후행 AT65 연결 근거

## 승인과 근거

[A copy of the complete user authorization](../AUTHORIZATION.json)의 remainingApproval을 재사용한다.
사용자 문장 “야 남은거 다 승인할테니까 질문 하지 말고 끝까지 밀어”는 STEP077 내 남은
공개 API/저장 구조/시각 결정을 구현자가 구체화하고 검증하도록 승인한다.
14개 primitive는 0343a07877c2db37d94de92883d5cdabcec4d7b7,
private view/mapping/bend는 3408a2b2d9ce0802a05439a364ace2a2ba090c44,
공개 hierarchy 기반은 dcb52897f3ee56b79b54b1fad5d8008503139465다.
승인은 시험 통과나 최종 AT65 완료를 뜻하지 않는다.

## 사용자 API

`createPartitionPlot({id?,layout?,coordinate?,focus?,rootVisible?,prunedSelection?,orientation?,reverseU?,reverseV?,padding?,innerRadius?,outerRadius?,startAngle?,sweep?,direction?,radiusPolicy?,clip?,cells?,labels?})`와
같은 옵션의 `editPartitionPlot({target?,...})`를 Full에 제공한다. 기본 ID는 `partitionPlot`.
기존 실제 coordinate가 유일하거나 current context로 결정되면 재사용하고 없으면 기본 Cartesian을
명시 child action으로 생성한다. Parallel 및 모호한 coordinate는 거부한다. Layout은 method partition만 허용한다.

focus는 `null`(root) 또는 기존 hierarchy target `{key}`/`{path}`이며 생략 시 create=root, edit=보존이다.
rootVisible=true, prunedSelection=keep-hidden이 기본이다. 선택의 논리 identity와 표시 여부를 분리하며
`drop`만 숨은 selection member를 명시적으로 제거한다. 사라진 focus는 이전 ancestor chain의 가장
가까운 생존 노드, 그다음 새 root로 복구하고 복구 이유를 읽기 전용 metadata에 둔다.

Cartesian은 orientation=horizontal, reverseU/V=false다. Polar는 기존 coordinate의 polarFrame을
소비한다. innerRadius=0, outerRadius=auto, startAngle=0도(12시), sweep=360도,
direction=clockwise, radiusPolicy=equal-depth가 기본이다. equal-depth-area는 깊이 band의 면적 계수만
맞춘다. 다른 깊이 노드 면적의 전역 비교를 주장하지 않는다. Pixel padding은 nonnegative number 또는
`[siblingGap,depthGap]`로 받으며 orientation에 따라 x/y, polar에서는 angular/radial gap으로 적용한다.
간격은 normalized interval을 바꾸지 않는다. Tiny/zero geometry는 metadata를 보존하고 ink/hit에서 제외한다.

Cells와 labels의 paint/typed override 계약은 hierarchy plot owner를 그대로 재사용한다.
Labels에 minWidth/minArcLength를 추가하고 생략된 label도 accessible node description을 보존한다.
별도 focus/keyboard/animation facade를 만들지 않는다. Host는 inspect의 navigation key를 기존 typed
node target으로 변환하여 editPartitionPlot을 호출한다. Controller의 transaction 연결은 후행 단계다.

## 상태와 action 계층

- semantic layer: mark.type=partition, hierarchyBinding.layout exact ref, coordinate ID,
  hierarchyLabels 의미, partitionView={focusKey,rootVisible,prunedSelection,recovery}.
- materializationConfigs.marks[id].hierarchyPlot: 기존 cells/labels paint, clip 및 partition mapping intent.
- layout.result: 하나의 canonical hierarchy value/order/normalized interval; view는 저장 결과를 투영한다.
- create/edit → editSemantic(children) → materializePartitionPlot → createGraphics/editGraphics.
- Source revision → hierarchy → layout → focus recovery → plot/labels/selection closure를 preflight한다.
- Restore는 stored shape/exact refs/result consistency만 검증하며 layout 알고리즘은 실행하지 않는다.
- Renderer는 기존 rect/path/text concrete 값만 읽는다.

## 소비자 및 후행 의무

Coordinate/Canvas edits, removeMark/removeResource, immutable failure, nested/facet namespace,
scene/codec/inspection, item selection/highlight, Full/Basic, declarations 및 installed artifact를 검증한다.
일반 positional/field encoding은 layout-owned node grain과 충돌하므로 tree/treemap과 동일하게 적용되지 않는다.
원본 data membership은 hierarchy lineage owner를 유지하고 synthetic root에는 visible item을 만들지 않는다.

Bend adapter/sampler는 정규화 cell에서 current frame geometry와 hit를 함께 만든다.
정확한 b0/b1는 각 정적 materializer 결과를 재사용하고 reduced-motion은 final을 반환한다.
Topology/radial policy 변화는 reason이 있는 crossfade 계획을 만든다. Arbitrary start/direction의
handedness와 screen rotation은 별도 독립 literal로 검증한다. **AT65의 최종 public animation planner,
controller keyboard transaction, player/current-frame hit 통합은 후행 animation 단계의 미완료 의무**다.
이 checkpoint가 그 최종 연결 완료를 주장하지 않는다.


## 구현 및 검증 경계

공개 정적 11종은 `examples/partition-layouts/program.js` 한 chain을 tutorial/browser/PNG에서 공유한다.
승인된 14종의 정적 geometry는 유지하며 title/note만 일반 `createTitle` 제목·부제 슬롯으로 옮겼다.
Bend 3종은 `test/charts/partition-layouts/frames.render.js`의 private frame 검증으로 졸업했다.
실행 Gate 디렉터리는 제거했고 원본 hashes는 역사적 승인 기록에만 남긴다.

`createPartitionFramePlan`은 exact receiver 두 개의 **실제 graphic items와 clip**을 endpoint로 보존한다.
Highlight 색·전경 순서도 포함하며 동일 key+role에 대한 geometry를 semantic preview와 대조한다.
직접 primitive geometry edit는 `graphic-edit`, 반사 방향은 `handedness`, 같은 coordinate family는
`coordinate-family`, 다른 topology/clip/radius-policy/paint는 각각 명시 reason이 있는 crossfade다.
Structured paint는 object/plot origin을 보존하는 native 두 group으로 전환한다. Private plan은 WeakMap으로
소유하고 caller가 만든 token은 거부한다. 중간 frame은 0.2px curvature chord bound와 공통 path/work
한도를 지키며 hit는 그 frame의 concrete path fill/stroke와 clip/opacity를 그대로 검사한다.
방향 64조합 중 32개 회전 가능한 쌍은 exact endpoint, 나머지 32개는 reflection crossfade로 검증했다.
Renderer용 bend fixture는 Cartesian origin(240,180)에서 polar center(240,230)으로 이동하여 screen translation도 검증한다.

H/Partition의 body/labels/typed override는 P1 `FillPaint` validator와 materializer를 그대로 사용한다.
P2의 outline/blend/shadow facade는 아직 이 branch에 없으므로 해당 통합 후 H/Partition의 같은 소비자 연결과
회귀가 남는다. 기존 string-only 제한을 현재 계약으로 남기지 않고 FillPaint까지 구현한 상태와 구분한다.

집중 source 검사는 기존 hierarchy family 하한 95/90/100을 그대로 적용했다. 새 adapter 100/100/100,
frame sampler 100/96.18/100이며 floor를 낮추거나 예외를 추가하지 않았다.
공개/primitive static 11종 exact properties/order/PNG, static 11종+private frame3종의 Canvas/SVG/PNG/PDF,
실제 dataset5개×recipe3개의 생성/편집과 inventory/lifecycle를 합친 canonical realistic26개가 통과했다.
준비된 source→computed→parameter→hierarchy→layout→focused plot/label/selection 및 invalid-input 원자 실패도 검증했다.

새 package owner 9개로 entries는801이다. Node24 pack 1,190,327/5,462,716bytes, 같은 minified browser
입력의 Node20/24 gzip Full586,157·Basic348,186·SVG18,070bytes를 측정했다. 기존 한도 통과를 주장하지
않으며 entries801/packed1,191,000/unpacked5,463,000, Full587,000/Basic349,000/SVG25,000으로 최소 단위를 적용한다.
Search901,428bytes는902,000으로 조정한다. 최종 README/metadata 동기화 후 canonical pack을 다시 검증한다.

Canonical 전체 coverage·render/browser·문서·설치 consumer의 마지막 결과와 source hash는 별도
`partition-checkpoint.json`에 기록하며, 그 검증 완료 전 전체 checkpoint 완료로 세지 않는다.
