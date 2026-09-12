# R19 — 다중 채널의 원자적 재인코딩

원래 감사 번호: **19**. Primary owner: **Phase 5**. 상태: **Proposed / 구현 전**.
아래 세부 API·수치 정책의 Gate는 승인됐다. 상태의 `Proposed`는 제품 구현·검증이 아직 완료되지 않았다는 뜻이다.

## 목적과 현재 연결점

여러 encode를 순차 실행할 때 일시적으로 깨지는 중간 상태를 제거한다. 사용자 연산 단위는 한 mark의 여러 역할 변경이다. arbitrary transaction이나 여러 chart 동시 mutation API로 확대하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/encodings/index.js`
- `src/actions/scales/edit.js`
- `src/actions/encodings/parallel.js`
- `src/materialization/planner.js`

관련 항목: R20, R21, R22, R23. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
encodeChannels({target: string, channels: {
  x?: XOptionsWithoutTarget; y?: YOptionsWithoutTarget;
  x2?: SecondaryOptionsWithoutTarget; y2?: SecondaryOptionsWithoutTarget;
  theta?: ThetaOptionsWithoutTarget; r?: ROptionsWithoutTarget;
  color?: ColorOptionsWithoutTarget; stroke?: StrokeOptionsWithoutTarget;
  size?: SizeOptionsWithoutTarget; shape?: ShapeOptionsWithoutTarget;
  opacity?: OpacityOptionsWithoutTarget; strokeWidth?: StrokeWidthOptionsWithoutTarget;
  strokeDash?: StrokeDashOptionsWithoutTarget; angle?: AngleOptionsWithoutTarget;
  xOffset?: OffsetOptionsWithoutTarget; yOffset?: OffsetOptionsWithoutTarget;
  group?: GroupOptionsWithoutTarget; pathOrder?: PathOrderOptionsWithoutTarget;
  text?: TextOptionsWithoutTarget;
}})
```

## 값·기본값·오류 계약

- 최소 한 channel, target 필수; omitted channel 유지. channels:null/empty/unknown key, 내부 target/id/coordinate 주입은 오류. 각 값은 기존 단일 encode의 payload를 재사용한다.
- 같은 mark의 final encoding을 먼저 검증한다. 중간 x와 아직 이전 y가 함께 있을 때 발생하는 일시적인 scale 충돌로 실패하면 안 된다. 기존 shared scale의 외부 consumer와 final state가 충돌하면 거부한다.
- 관련된 x/x2, y/y2, positional/group/order, offset의 final data roles를 한 번에 검증한다. 같은 semantic role을 중복 표현하는 y와 yRange 동시 제공 같은 alias를 아예 이 API에 포함하지 않는다.
- channels 값 null은 remove/unencode 뜻이 아니다. coordinate type 전환, mark family 변환, 일반 transpose, 병렬 차원 리스트 전환은 제외. Parallel은 color/stroke/size 등 해당 family가 지원하는 appearance만 가능; dimension 구조 편집은 기존 encodeParallelCoordinates owner다.
- 입력 property 열거 순서에 관계없이 canonical channel 순서로 trace와 state를 만든다. 최종 scale shared/new ID resolve는 한 번만 실행한다.

## 저장 결과와 생명주기

개별 public encode wrapper를 바로 reduce하면 중간 materialization과 가짜 direct-action child가 생기므로
wrapper와 기존 implementation body의 경계를 분리한다. 공개 encodeX 등은 기존 동작을 유지하고 batch owner는
동일 implementation body를 private immutable planning program에서 실행해 final frozen state plan을 만든 뒤
기존 primitive mutation trace와 materializer를 적용한다. 모든 child trace는 public encodeChannels의 subtree이고
guide/label/highlight는 최종 상태만 관측한다.

## 구현 순서와 action 계층

1. Core action wrapper가 소유한 implementation body를 package-private invoker로 공유하고 단일 encoding validator와
   inference를 그대로 재사용한다. Invoker 자체는 package extension API로 export하지 않는다.
2. channels를 canonical map으로 바꾸고 final draft layer/scales를 만들며 exclusive/shared scale ownership을 검증한다.
   Bar category/measure x/y 역할을 뒤집을 때는 primitive boundary의 trace-free
   `withoutPreviewLayerEncodings`가 planning clone에서 이전 두 역할만 분리한다. Encoding action이
   semantic state를 직접 `_clone`하면 source-boundary 위반이다.
3. final semantic patch를 wrapped 경로로 적용하고 affected scale/mark를 중복 없이 materialize한다.
4. existing guides의 semantic channel binding, owner labels, R36 references와 selection replay를 실행한다.
   Cartesian axis가 categorical↔continuous scale family를 바꾸면 기존 tick/label style은 보존하되,
   둘이 같은 recipe를 공유하던 경우 final scale에 맞춰 categorical은 final domain `values`, continuous는
   default `count:5`로 정규화한다. 명시적 values가 새 domain과 맞지 않거나 grid가 새 scale family를
   지원하지 않으면 조용히 삭제하지 말고 전체 batch를 atomic error로 거부한다.
5. 단일 encode와 batch 1-channel equivalence 및 입력 키 순서 독립성 tests.

## 독립 oracle와 인수 테스트

- xy scatter의 x=a, y=b를 x=b, y=a로 한 호출 교환: 각 위치는 최종 scales로 계산되고 자동 transpose 효과는 추론하지 않는다.
- valid x + invalid color field: x도 바뀌지 않고 revision/trace 누출 없음.
- color+size를 함께 바꾸고 combined legend 1회 재생성; R38 block override가 channel에 유지.
- xOffset와 x band를 함께 수정하는 grouped bar, y/y2 interval, polar theta/r, line group/pathOrder 필수 사례.
- 단일 channel batch 결과가 기존 focused action과 semantic/graphic 동일하되 trace root만 다름. channels 객체 key permutation 결과 동일.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — final-state encoding transaction

### payload와 순서

새 export EncodeChannelsOptions의 target은 필수다. channels 값은 대응 단일 encoding의 payload에서 target/coordinate를 제거한 타입을 사용한다. channel 객체의 id는 금지하지만 nested scale.id는 기존 explicit named scale 사용을 위해 허용한다. r만 public spelling이고 radius/yRange 같은 alias는 금지한다.

canonical 순서는 x,y,x2,y2,theta,r,xOffset,yOffset,group,pathOrder,color,stroke,size,shape,opacity,strokeWidth,strokeDash,angle,text다. 이 순서는 요청 정규화·trace를 위한 순서이며 materialization dependency 순서와 다르다.

### 3단계 private 계약

~~~ts
normalizeEncodeChannelsArgs(args)
// → { target, requestsInCanonicalOrder }; caller write 없음
planEncodingAssignments(program, target, requests)
// → { target, originalLayer, finalLayer, state, scaleIds }
applyEncodingAssignments(program, plan)
// → 원래 runtime class로 state commit; 이후 deduplicated materialization plan
~~~

plan의 final layer/state는 모든 새 channel을 반영한 완전한 draft다. validation은 이 state와 final scales를 사용한다.
plan 생성 중 encodeX/encodeY 같은 public wrapper를 호출하지 않는다. 기존 단일 encode와 batch가 같은 wrapped action
implementation body를 소비하되 focused action이 encodeChannels를 역호출하지 않는다.

1. target family/coordinate를 확정하고 지원 channel whitelist 검사.
2. 각 request shape/fieldType/mode 정규화. 기존 style constant와 field channel 전환의 cleanup도 계획한다.
3. 동일 scale ID에 여러 request가 닿으면 canonical requested scale definition이 호환되는지 비교한다. 서로 다른 domain/range/type 요청은 마지막 key 우선이 아니라 Error.
4. target의 최종 bindings와 외부 consumer 전체로 domains/roles/series/group/offset/secondary pair를 검증한다.
5. private immutable draft에 모든 semantic bindings를 기록한다. chart-owned derived data가 필요한 경우 기존 owner executor로 한 번 계산한다.
6. scales→marks→dependent labels/references→guides→layout→highlights를 deduplicate해 실행한다. 중간 상태의 legend 또는 source label을 생성하지 않는다.
   Position guide rebind는 original/final scale ID를 모두 사용한다. Axis의 이전 ticks/labels가 같은
   mode와 values/count를 공유했다면 한 쌍으로 취급하고, final scale이 band/point/ordinal이면 둘 다
   `{mode:"values", values:finalDomain, inferredValues:true}`, linear/time/transformed이면 둘 다
   `{mode:"count", count:5, inferredValues:true}`로 바꾼다. 색상·길이·폰트·회전·위치·제목은 보존한다.
7. detached scale은 기존 owner 규칙에 따라 unreferenced인 것만 정리한다. shared scale은 남긴다.

### 실패와 trace

payload key 순열에 따라 state와 sibling trace 순서가 달라지면 실패다. one-channel batch는 대응 단일 encode와 semanticSpec/graphicSpec/설정의 결과가 같아야 한다. trace root만 encodeChannels이며 의미 있는 child semantic/materialize action은 유지한다. 가짜 encodeX trace를 수동 합성하지 않는다.

### 고정 인수 사례

- R19-N01: fixed domains0..10/ranges0..100, point a2,b8 → x20,y80에서 x=b,y=a → x80,y20.
- R19-N02: 한 final draft에서 primary/secondary의 서로 연결된 field 변경, group/pathOrder 동시 변경, parent band/offset 동시 변경 각각 성공.
- R19-N02의 Bar transpose fixture에는 `createAxes()`를 포함한다. x축은 final quantitative scale과 count
  recipe, y축은 final categorical scale과 정확한 domain values를 가져야 하고 양쪽 tick/label graphics가
  성공적으로 다시 만들어져야 한다.
- R19-E01: valid x + unknown stroke field → 원본 전체 유지.
- R19-E02: 두 channels가 같은 scale.id에 서로 다른 explicit domain 요청 → Error.
- 기존 continuous grid를 categorical position으로 옮기는 batch처럼 final guide가 지원되지 않으면 Error이며,
  original semantic/graphic/config/resolved scale/trace는 그대로다.
- R19-L01: requests key 순열 전부 같은 normalized result. actual scale/mark refresh count는 owner별1회이며 기존 layout의 명시된 제한 재배치는 별도 기록한다.
- R19-L02: field-stroke→constant-stroke와 source reencoding 후 R38 override/R32 membership/R36 reference가 최종 상태를 본다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
