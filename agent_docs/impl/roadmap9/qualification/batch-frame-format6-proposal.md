# Format6 저장·공통 primitive·공개 타입 구체안

상태: ready-for-review, 제품 미채택. 이전 [표현 검토](batch-frame-review.md)를 아래 선택으로
완결한다. Source는 `aa18606de9146c8cf508cf789948125011ea6ab0`; runtime/types/test/scripts
변경0이다. Root의 remainingApproval 방향 선택은 기록하되 최종 제품 채택 기록을 대신하지 않는다.

## 호출·frame·호환 선택

- 기존 v3/v4/v5의 호출, frame scene2/decisions, 저장 bytes를 유지한다. `formatVersion:6`만
  scene3와 circle-batch 반환을 선택한다. 생략·5→6 자동 승격0이다.
- 새 format6도 capacity 생략 시 기존10k 기본값이다. 원100k는 기존과 같은 명시
  `maxEndpointNodes:200002,maxOutputNodes:100001`과 native point의 maxItems100000을 요구한다.
- Frame 반환 시 graphicSpec·scene3·concrete appearance/placement·point meaning·현재 native
  identity가 전부 완결된다. 이 작업과 current row/geometry/identity 검산을 sample timer 밖으로
  미루지 않는다. Renderer가 의미를 계산하거나 legacy adapter로 graphicSpec을 완성하지 않는다.
- Scene3의 `entries`는 single 또는 circle-run이며 decision은 exact endpoint에서null,
  interior에서 single record/run table이다. Private positions는 entries와 길이가 같은 배열이고,
  single은 `{kind:'single',value:<기존 position 또는 unavailable reason>}`, circle-run은
  `{kind:'point-run',x:{values,scale},y:{values,scale}}`다. Scale이 다른 row는 run을 끊는다.
  Shared scales는 exact owned snapshots이고 values는 모든 row를 계산한 frozen plain arrays다.
- Row 식별은 `(graphic object ID,row index)`. Scene key/decision itemKey/identity/origin은 이 pair와
  정확히 대응한다. Native proof의 original program/index/metrics는 private로만 보관한다.
  Offline과 caller-authored 유사 batch에 native 권한0이다.
- 서로 다른 placement, clip, owner, kind/role/kernel, appearance 또는 scale인 row를 한 run으로
  합치지 않는다. 연속성·그리기 순서를 유지하며 run을 최대10000row씩 나눈다. 단일row run도 허용한다.
- 일반 단일 도형 fallback은 모든 기존 family·복잡한 paint를 계속 지원한다. Fallback 비율을 낮춘
  별도 fixture로 원성능 의무를 대체하지 않는다. 최종 전체 SLO와100cycle 검증은 남는다.

`serializeAnimation`은 현재 plan의 version을 그대로 내보낸다. 새 downgrade option과 eager
adapter API는 추가하지 않는다. Legacy frame이 필요한 caller는 원 endpoints로 legacy mode를
선택한다. Batch frame을 legacy plan의 endpoint로 넣는 암묵 변환은 TypeError이며 format6 rebase는
허용한다. Player는 생성시 정한 legacy/batch representation을 interrupt에서도 유지한다. 다른
representation 요청은 기존 player를 바꾸기 전에 원자적으로 거부한다. 이는 render callback의
정확한 frame 타입을 유지하기 위한 계약이다.

## 공통 circle-batch schema와 authoring

`GraphicType`에 `circle-batch`를 추가하고 공통 graphic/concrete validator가 소유한다.
그 properties의 정확한 필드는 `x,y,radius,appearance`다. 세 dense own-data numeric arrays의
길이는 같고1..10000이다. 각 x/y는 finite, radius는 기존 circle과 같은 유효값이어야 한다.
`appearance`는 기존 concrete circle properties 중 x/y/radius를 제외한 값만 허용한다. Unknown
field/getter/hole/비유한 값/부적합 paint는 기존 owner의 검산으로 거부한다. `items`·children은 이
primitive에 허용하지 않고 외부 placement/clip은 기존 graphic tree의 공통 구조를 따른다.

Shared validator는 createGraphics/editGraphics와 모든 renderer, graphic-only 및 editable restore에
동일하게 적용한다. 별도 circle-batch domain action은 추가하지 않는다. Caller가 primitive extension
경로로 만든 batch도 concrete4renderer 재생이 가능하나 native semantic identity는 얻지 못한다.

Graphic envelope schema1과 editable envelope schema4의 기존 container/codec를 유지한다.
새 primitive 허용은 값 vocabulary의 additive 변경이다. 새 reader는 기존1..4 editable 및
schema1 graphic을 동일하게 읽고, 구 reader는 모르는 type을 기존 strict validator에서 거부한다.
구 reader가 성공하거나 자동으로 circles로 변환된다고 약속하지 않는다. 일반 snapshot의 숫자는
기존 tagged value/shared-value codec으로 -0를 보존한다. Format6의 전용 numeric wire projection을
일반 snapshot에 암묵 적용하지 않는다. 기존 정상 v4 editable/schema1 graphic bytes 불변 oracle를
제품 통합의 필수 비교 대상으로 유지한다.

## 저장 envelope와 정확한 wire 필드

Animation outer envelope는 기존 schemaVersion1을 유지한다. 정확한 필드는 기존과 같은
`kind,schemaVersion,packageVersion,payload,digest`이며 kind는animation이다. Payload는 정확히
`{plan,playback}`; playback의 rate/repeat/reducedMotion 및 infinite tag는 기존 owner를 따른다.
Digest는 **numeric projection과 모든 descriptor/limit/kernel/timeline을 포함한 전체 tagged payload**의
canonical JSON을 덮는다. 저장 문자열과 복원 후 재직렬화는 canonical bytes까지 같아야 한다.

Format6 plan wire의 정확한 필드는 아래와 같다. `timeline`은 기존처럼 있을 때만 저장한다.

```ts
{
  kind: 'transition-plan', version: 6,
  limits: {maxEndpointNodes, maxOutputNodes},
  kernels: {
    transition: 6,
    position: 'semantic-continuous-position@1',
    appearance: 'premultiplied-linear-srgb@1',
    columns: 'animation-columns@2', batchFrame: 1,
    // 존재하는 기존 timeline/geo/guide/geoText/graph/route/partition/cartesian/polar만 같은 버전 규칙
  },
  durationMs, easing,
  from: ColumnDescriptor, to: ColumnDescriptor,
  vectors: ExistingColumnVector[],
  timeline?: ColumnDescriptor
}
```

기존 columns@2 descriptor 문법과 numeric `float64-le` encoding은 바꾸지 않는다.
Native program endpoint는 기존 graphicSpec/positions 및 해당 family state 구조를 사용한다.
Sampled format6 endpoint는 `{scene,identities,backgrounds,positions,view,...기존 존재 family state}`다.
Scene은3, positions는 위 entry 기준 표현, view는 `{progress,timeMs?}`다. Decision은 scene entry가
소유하므로 view에 중복 저장하지 않는다. Identities/backgrounds 및 다른 family state의 item index는
**논리 row**를 가리킨다. Endpoint 개수·generated guide/Geo 삽입·timeline은 이 기준을 공유한다.
Native format6 plan의 endpoints가 legacy concrete primitive여도 sampled 반환은scene3다.

Columns@2는 직접 numeric array를 항상 numeric pool로 옮기지는 않는다. 따라서 format6는
아래 schema 위치만 먼저 기존 `packAnimationNumericVector`로 바꾸고 그 전체를 columns@2로
lower한다. 위치를 모르는 arbitrary object를 numeric tag로 해석하지 않는다.

| 정확한 projection 위치 | 저장 전 값 | Wire 값 |
|---|---|---|
| scene3 circle-run.properties.x/y/radius | dense finite number[] | `{kind:'float64-le',length,base64}` |
| circle-run.decisions.sourceIndices/targetIndices | dense safe integer[] | 같은 float64-le; 복원 후 기존 integer/range 검산 |
| point-run.x/y.values | dense finite number[] | 같은 float64-le |
| graphicSpec.objects 중 circle-batch.properties.x/y/radius | dense finite number[] | 같은 float64-le |
| single node·legacy geometry·scale·identity·family state | 기존 값 | 기존 strict tagged codec와 columns@2 그대로 |

위치 목록은 recursive child endpoint/graphic tree에서도 동일하며 timeline이나 legacy 단일 path에
숨어 있는 닮은 `{kind:'float64-le'}` 값을 임의로 복호화하지 않는다. Schema별 owner가 해석한다.

## Restore 순서·권한·resource 계산

1. 기존 byte/depth/value 제한, outer closed fields, digest, tagged value decoding을 먼저 검사한다.
2. Plan version6·closed fields·kernels·timeline manifest·limits를 검산하고 offline scope를 발급한다.
   Scope는 quota만 허용하며 native=false다. 잘못된 version과 unknown fields를 downgrade하지 않는다.
3. 기존 columns@2가 모든 pool entry(미사용·중복 포함)의 길이, descriptor/reference, finite bit,
   storage/logical/cell work를 검사한 후 endpoint descriptor를 복원한다. Batch numeric packet은
   아직 expanded numeric array가 아니다.
4. 모든 batch의 perbatch10000/논리 endpoint sum/output/owner count, declared vector length,
   canonical base64/padding/finite bit 및 모든 numeric cell 합계를 검사한다. Scope의 기존 expanded
   12M/descriptors16M/cells16M/traversal140M와 envelope64MiB/depth128/value1M를 유지한다.
5. 원래 row 표현에 대한 **논리 expanded work**를 먼저 계산한다. 기존 budget 규칙인
   `1/value + string.length + property/index key.length`를 동일하게 적용하며, 각 circle의 shared
   appearance/placement/scale이 논리적으로 다시 발생하는 비용도 row수만큼 센다. 물리 byte와
   descriptor 처리 비용은 별도로 검사하여 논리 work와 둘 다 상한을 지킨다. Product는 이 계산에
   legacy row 객체/배열을 만들지 않고 길이·shared subtotal·각 row의 exact key/value로 계산한다.
6. 위 preflight가 모두 성공한 뒤만 새로운 numeric arrays를 할당한다. 같은 길이, radius·paint,
   identity/decision, 의미좌표와 실제 geometry, sampled view 및 각 family의 기존 strict owner
   검산을 완료한 뒤 동결한다. `-0`와 finite 극값의 bit를 보존한다.
7. 기존 offline plan 등록을 사용하며 native origin/owner/metrics를 payload에서 복원하지 않는다.
   Deserialize한 frame의 hit/native permission은 기존 offline 거부 규칙을 유지한다.

Native sampling에서도 이 비용과 current exact row/identity/geometry 검산을 timer 안에서 마친다.
`batch.length===10`을 `row count===10`처럼 계산하는 경로는 허용하지 않는다.100k는 언제나100k다.

| 공통 consumer/owner | 세어야 하는 양·그대로 유지할 경계 |
|---|---|
| create/edit/common concrete validator | batch별1..10000, x/y/radius 모두 전수 finite/radius; appearance의 circle 계약, caller copying |
| editable/graphic persistence | 논리 row와 각 numeric scalar·paint/clip의 실제 tagged traversal, 기존 envelope·state 검산; 물리 wrapper 수로 할인0 |
| animation admission/restore/export | endpoint논리합≤200002/output논리수≤100001 및 owner point maxItems; 50frame export work guard 그대로 |
| concrete bounds/clipping | 매 row의 transformed circle bounds와 동일 clip 순서; batch 전체 큰rect 하나로 hit/paint 대체0 |
| Canvas/PNG/PDF | 모든 row의 native magnitude·pixelRatio·bounds 검사; each-circle alpha draw; 기존 pixel/shadow/blend/work 규칙 |
| SVG | 매 row circle emit·clip·gradient/pattern bounds; patternWork는 각 row의 실제 workItems 합계 |
| paint/shadow/font preparation | 원 circle에서 발생하는 각 row의 pattern·shadow·outline·blend 작업을 합산; 단일 circle에 없는 font work는0이며 legacy text fallback의 font/clip work는 그대로 |
| hit/native/interaction | 논리 row geometry/index/bounds와 topmost 순서; row pair→exact original source; forged/offline 권한0 |
| timeline/rebase/selection | 각 logical identity가 현재 appearance/geometry와 일치; selected/highlighted row를 조용히 sharedstyle로 뭉개지 않음 |

복잡한 paint를 첫 빠른 run 경로에서 다루기 어려우면 기존 single 경로로 명시 fallback한다. 공유paint라는
이유로 색칠을 한 path로 합치지 않는다. 그래도 caller-authored shared batch의 해당 paint는 공통renderer
의미에 따라 직접 per-row 실행하거나 공통 preflight에서 기존 circle과 같은 유효성 오류를 내야 한다.
같은 유효 circle paint를 새 batch에서 임의로 unsupported로 만드는 축소는 허용하지 않는다.

## Public types와 소비자 변경

현재 `TransitionOptions.formatVersion`은5만 허용한다. 이를5|6으로 확장하고, 정적6 호출은
`BatchedTransitionPlan`, 기존 정적3/4/5 호출은 기존 TransitionPlan의 version literal을 반환한다.
동적5|6 옵션·deserialize는 `AnyTransitionPlan`을 반환한다. Sample/export/player도 plan에 따라
정확한 legacy/batch frame을 반환하며 dynamic union에는 AnyTransitionFrame을 반환한다.

**deserializeAnimation의 plan 반환 union은 TypeScript 소스 호환 변경이다.** 기존 legacy라고
단정한 consumer fixture/docs는 version branch를 추가한다. Runtime legacy의 모양이 같다는 이유로
정적 타입을 기존 TransitionPlan으로 거짓 선언하지 않는다. 새 helper API 없이 직접 좁힌다.

```ts
const restored = deserializeAnimation(text);
if (restored.plan.version === 6) {
  const frame = sampleTransition(restored.plan, 50); // BatchedTransitionFrame, scene.version === 3
  renderToSVG(frame); // 완성된 공통 graphicSpec 직접 사용
} else {
  const frame = sampleTransition(restored.plan, 50); // 기존 TransitionFrame, scene.version === 2
  console.log(frame.decisions);
}
```

정확한 overload 후보와 reject example는 evidence의 public-candidate.d.ts/public-consumer.ts가
소유한다. Product에서는 Scene3 entries를 이전 검토의 정확한 SampleEntry union으로 공개하고,
공통 GraphicType/GraphicSpec에 batch를 포함한다.4renderer의 Pick<ChartProgram,'graphicSpec'>
시그니처는 공통 schema 확장으로 둘 다 받는다. renderTransitionScene은 scene2/3 overload를 갖는다.
Interaction의 frame-bearing input/state/preview와 hit source는 AnyTransitionFrame을 받고 실제
native provenance를 검산한다. Marker/getFrame/render/commit callback은 player plan의 frame 타입을
따른다. Unknown format options를 받는 player의 callback은 AnyTransitionFrame을 처리해야 한다.

## 작은 검토 증거와 제품 의무

기존62frame/62110nodes representation oracle에 더해 실제1k point의 interior sampled endpoint와
exact endpoint를 위 numeric projection→columns@2→envelope1로 왕복했다. 원 scene/decisions/point
meaning과 exact equality, reserialization bytes, 동결된 numeric arrays, offline native=false를
확인했다. Batch열과 nested legacy single의 -0를 전체 wire로 왕복하고 finite 극값은 numeric codec에서
별도로 확인했다. Negative oracle는 malformed hash/version/fields/length/base64/finite bits/identity/
geometry/limits/getter와 work ceiling을 다룬다. 할당 전 거부 대상은 numeric array allocation0을 검산한다.

검토 helper는 공통 numeric/column/envelope/point validator를 실제 호출하지만 production prepared-plan,
all-family restore, batch renderer/hit 또는 long-lived cache의 구현을 대신하지 않는다. 기존 정상editable4/
graphic1 bytes는 baseline 왕복 oracle로 고정했으며 제품 통합 시 동일 fixture를 비교해야 한다.
첫 fixture의80px 기본margin 오류와 첫 TS fixture basename self-import 오류도 원문을 보존했다.
이후 source 변경·제품 채택은 root의 이 구체안 채택 기록 다음에 진행한다. 원100k 실행은 이번에0회다.

[검토 qualification](batch-frame-format6-evidence/qualification.json)은35개 reject, source hash,
엄격한 TS positive/negative fixture와 기존snapshot/candidate wire 원문을 보존한다. 실행기는 같은
evidence의 `.gz` 파일을 `.artifacts/batch-review-draft/`에 풀어 재현한다.
