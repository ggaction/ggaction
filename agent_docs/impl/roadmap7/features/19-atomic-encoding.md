# R19 — 다중 채널의 원자적 재인코딩

원래 감사 번호: **19**. Primary owner: **Phase 5**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

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

개별 encode 실행을 바로 reduce하면 중간 materialization이 발생하므로 validate/plan/commit 내부를 공유하게 분리한다. 공개 encodeX 등은 기존 동작을 유지하고 batch owner가 final plan을 기존 primitive mutation+materializer로 적용한다. 모든 child trace는 public encodeChannels의 subtree이고 guide/label/highlight는 최종 상태만 관측한다.

## 구현 순서와 action 계층

1. 단일 encoding validators를 부작용 없는 normalize/plan으로 추출한다.
2. channels를 canonical map으로 바꾸고 final draft layer/scales를 만들며 exclusive/shared scale ownership을 검증한다.
3. final semantic patch를 wrapped 경로로 적용하고 affected scale/mark를 중복 없이 materialize한다.
4. existing guides의 semantic channel binding, owner labels, R36 references와 selection replay를 실행한다.
5. 단일 encode와 batch 1-channel equivalence 및 입력 키 순서 독립성 tests.

## 독립 oracle와 인수 테스트

- xy scatter의 x=a, y=b를 x=b, y=a로 한 호출 교환: 각 위치는 최종 scales로 계산되고 자동 transpose 효과는 추론하지 않는다.
- valid x + invalid color field: x도 바뀌지 않고 revision/trace 누출 없음.
- color+size를 함께 바꾸고 combined legend 1회 재생성; R38 block override가 channel에 유지.
- xOffset와 x band를 함께 수정하는 grouped bar, y/y2 interval, polar theta/r, line group/pathOrder 필수 사례.
- 단일 channel batch 결과가 기존 focused action과 semantic/graphic 동일하되 trace root만 다름. channels 객체 key permutation 결과 동일.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
