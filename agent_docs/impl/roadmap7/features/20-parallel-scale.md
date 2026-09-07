# R20 — Parallel 차원별 scale 집중 편집

원래 감사 번호: **20**. Primary owner: **Phase 5**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

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

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
