# R20 — Parallel 차원별 scale 집중 편집

원래 감사 번호: **20**. Primary owner: **Phase 5**. 상태: **Implemented-primary** (`eaea2b8b`).
공개 API, 필드 기반 resolver, 공유 consumer 갱신, 타입·Current 계약·설치 패키지 검증까지 구현됐다.

## 목적과 현재 연결점

차원마다 실제 scale이 있지만 사용자는 내부 scale ID를 몰라도 특정 변수의 범위를 고칠 수 있어야 한다. 필드 identity로 차원을 지정하는 focused adapter를 추가한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/scales/edit.js`
- `src/actions/scales/consumers/common.js`
- `src/actions/coordinates/parallel.js`
- `src/actions/guides/axes/parallel.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editParallelScale({target: string, dimension: string,
  ...ScaleEditPatch}) // dimension은 index/표시명이 아니라 field identity
```

## 값·기본값·오류 계약

- target은 Parallel layer, dimension은 현재 dimensions의 정확한 field. 누락·중복 field ambiguity·존재하지 않는 dimension은 오류다.
- 새 독립 scale 계산기를 만들지 않고 실제 dimension.scale을 찾아 editScale 계약을 사용한다. domain/range/reverse/type/nice 등 허용 patch는 현재 parallel dimension scale compatibility를 그대로 따른다.
- 다른 dimension과 scale을 공유했다면 기존 generic editScale의 all-consumer 검증/전파를 유지한다. 오직 해당 field만 바뀌는 것처럼 문서화하지 않는다. scale 분리 기능 #24는 추가하지 않는다.
- consumer.role=parallelDimension인 y 연결은 Cartesian y로 추론하지 않는다. dimension 축 tick/label/title/grid는 field 기반 binding을 유지한다.

## 저장 결과와 생명주기

scale ID와 consumer registry가 canonical owner다. focused action은 target+dimension을 ID로 resolve하고 wrapped editScale을 호출한다. requested patch는 scale에, axis appearance overrides는 기존 parallel guide owner에 남는다. dimension reorder 뒤 field selector는 같은 차원을 가리킨다.

## 구현 순서와 action 계층

1. role+target+field resolver를 추가한다. generic findScaleConsumers의 parallel role을 감사한다.
2. 기존 editScale를 호출하고 모든 공유 consumer, parallel axes와 labels를 재실행한다.
3. Full methods/types/contracts/card를 추가하고 editYScale로 임의 forwarding하지 않는다.

## 독립 oracle와 인수 테스트

- dimensions[a, b], a domain[0,10] → [0,20]: a의 x상 위치는 그대로, y normalization이 절반; b domain은 유지.
- reorder[b, a] 뒤 dimension:a 동일 대상. b와 scale shared면 두 축 모두 바뀜.
- unknown dimension, non-Parallel target, incompatible domain, ordinal → log invalid edit는 원본 불변.
- axes override, source label, theme, Canvas resize, R43 facet/repeat 뒤 일관성을 검증.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — Parallel dimension resolver

새 export EditParallelScaleOptions={target:string,dimension:string}&WithoutId<QuantitativePositionScaleOptions|CategoricalPositionScaleOptions>로 제안한다. union의 분산 Omit으로 각 branch를 보존한다. 새 API는 id/target 추론을 제공하지 않는다. 적어도 하나의 scale patch가 필수다.

### 정확한 resolution 절차

1. requireLayer(target), layer의 coordinate family=parallel, encoding.parallel.dimensions 존재 확인.
2. dimensions.filter(d=>d.field===dimension)의 개수가 정확히1이어야 한다. label/title/index로 찾지 않는다.
3. dimension.scale ID를 requireSemanticScale로 확인한다. findScaleConsumers의 role=parallelDimension과 field도 함께 전달한다.
4. quantitative는 현재 Parallel이 지원하는 continuous type/domain/range/nice/zero/clamp/reverse/base/exponent/constant만, ordinal은 현재 지원 categorical type/domain/range/reverse/padding/align/unknown patch만 허용한다. 현재 Parallel fieldType은 quantitative/ordinal뿐이며 nominal/time 지원을 새로 추가하지 않는다. current compatibility policy에 없는 옵션은 generic EditScaleOptions에 있다는 이유로 허용하지 않는다.
5. generic editScale({id,...patch})를 wrapped child로 호출한다. 공유된 모든 dimension과 외부 consumer의 validation을 보존한다.

현재 channels.js의 validateScaleChannel은 한 channel에 exclusive하게 bound된 scale만 허용한다. 이 함수를 그대로 editYScale에 우회 연결하면 Parallel role을 잃으므로 role-aware resolver를 별도로 공유한다.

### update closure

수정된 scale → dimension의 normalized position → 해당 series path → dimension line/ticks/labels/title/grid → attached series endpoint labels → highlights. 차원 reorder는 위치 index만 바꾸며 field와 guide ownership은 유지한다. Canvas 변경은 explicit range와 auto range의 기존 의미를 보존한다.

### 고정 인수 사례

- R20-N01: a의 domain[0,10],value5,local y-range[100,0] → y50. domain[0,20] 후 y75. b와 a의 x 위치는 동일.
- R20-N02: dimensions [a,b]→[b,a] 뒤 dimension:a로 edit → a의 scale만 resolve.
- R20-L01: 두 dimensions가 동일 scale이면 두 경로/가이드가 함께 바뀐다.
- R20-E01: dimension:"A 표시명",dimension:"0",Cartesian target,empty patch → Error.
- R20-E02: categorical dimension에 log domain 제안 → 호환 오류, 원본 axes/paths 유지.

## 완료 조건

- [x] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 `test/unit/actions/scales/parallel-scale.test.js`에 독립 기대값으로 구현했다.
- [x] reorder, shared scale, guides, Canvas replay, 잘못된 target/dimension/type과 오류 원자성을 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [x] Basic 미노출과 현재 Parallel quantitative/ordinal 경계를 유지했다.
- [x] Phase 승인과 `eaea2b8b` 구현·검증 근거를 기록했다.
