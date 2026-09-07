# R21 — 중첩 band offset scale 집중 편집

원래 감사 번호: **21**. Primary owner: **Phase 5**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

그룹 막대의 간격과 subgroup 순서를 재인코딩 없이 수정한다. 이미 존재하는 offset 정책을 재사용하며 새로운 positioning engine을 만들지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/scales/channels.js`
- `src/actions/scales/edit.js`
- `src/actions/encodings/offset.js`
- `src/materialization/scales/policies/offset.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editXOffsetScale({target: string, ...OffsetScaleEditPatch})
editYOffsetScale({target: string, ...OffsetScaleEditPatch})
```

## 값·기본값·오류 계약

- target의 해당 offset scale이 반드시 있어야 한다. Cartesian positional scale이나 fixed pixel offset을 대신 고르지 않는다.
- domain/order/reverse/paddingInner/paddingOuter/align 등 현재 band offset scale이 제공하는 옵션만 노출. 지원하지 않는 property/type은 explicit error.
- offset range는 parent band의 계산된 bandwidth에서 유도한다. absolute range override는 금지하고 parent resize/edit 후 재계산한다.
- explicit domain은 포함하지 않은 범주가 실제 consumer에 있으면 기존 missing category 정책대로 오류; label display mapping으로 category identity를 바꾸지 않는다.
- sibling offset consumers/shared scale은 기존 editScale all-consumer validation에 포함.

## 저장 결과와 생명주기

xOffset/yOffset를 focused channel dispatch와 consumer enumeration에 연결한다. parent scale dependency와 offset requested padding/order가 분리되어 유지되어야 한다. 부모 domain/bandwidth 변경 때 override가 유실되면 실패다.

## 구현 순서와 action 계층

1. scale channels의 ordinary/scaled/offset 분류를 일관되게 확장하고 positional axis 생성에는 offset을 넣지 않는다.
2. target → offset scale ID → editScale adapter를 구현한다.
3. parent band → offset → mark → label 순 dependency를 검증한다.

## 독립 oracle와 인수 테스트

- grouped bar categories[A, B], subgroups[u, v], offset domain[v, u]로 교환: 큰 A/B 위치 유지, u/v만 교환.
- padding 0 → .2 후 폭/중심을 수식으로 검증. parent bandwidth 100 → 200에서 offset 길이도 비례.
- x/y orientation dual cases, shared offset, missing offset, forbidden range, unknown subgroup 오류.
- legend order는 offset order만 바꿨다고 color scale order까지 바꾸지 않는다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
