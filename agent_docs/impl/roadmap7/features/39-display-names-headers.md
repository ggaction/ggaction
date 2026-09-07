# R39 — 범주 표시명과 facet header 배치

원래 감사 번호: **39**. Primary owner: **Phase 8**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

데이터 코드와 독자에게 보여 줄 이름을 분리한다. 표시명 때문에 dataset을 편집하거나 축의 정렬이 바뀌지 않도록 한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/guides/axes/labels.js`
- `src/actions/facets/guides.js`
- `src/actions/guides/legends/edit.js`
- `types/program.d.ts`

관련 항목: R38. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// 기존 axis/legend label/content 집중 편집 옵션에 labelMap 추가
labelMap?: readonly {value: Scalar,label:string}[] | "auto"
editFacetHeaders({...ExistingStyle,
  role?:"all"|"row"|"column",
  labelMap?:readonly {value:Scalar,label:string}[]|"auto",
  side?:"top"|"bottom"|"left"|"right",
  align?:"start"|"center"|"end"})
```

## 값·기본값·오류 계약

- map은 typed value identity. number1과 string"1"은 다름. 중복 value 오류, label은 empty string 허용. 매핑 없는 범주는 기존 formatter fallback. unknown future category entries는 보존해도 현재 phantom category 생성하지 않는다.
- labelMap:auto는 mapping override 제거. map 배열은 전체 교체하고 부분 deep merge하지 않는다. 원본 row/scale domain/order/facet key를 바꾸지 않는다.
- Cartesian categorical axes, categorical legend blocks(color/stroke/shape/dash 및 merged nominal block), facet row/column headers에 지원. continuous sample의 숫자 formatting이나 general label template(#34)는 제외.
- facet role 기본all은 기존 typography/offset과 labelMap 공통 적용. side는 row일 때 left/right, column일 때 top/bottom만. role:all+side는 ambiguity로 오류. one-field facet의 header는 column role이며 row 선택은 오류.
- align은 header가 할당된 cell/strip 내 alignment. text measured width/height와 offset을 layout이 reserve한다. 마지막 translate만 바꾸고 panel overlaps를 방치하면 실패.
- grid row와column이 같은 raw 값을 가져도 role별 mapping은 독립. facet values/order 편집(#40) 없이 display만 바꾼다.

## 저장 결과와 생명주기

guide/header appearance recipe가 labelMap/side/align을 소유. facet partition identity는 raw typed keys로 유지. 각 header role의 override precedence는 root common → role-specific이며 source edit/child rebuild 후 유지. theme는 mapping과 layout options를 덮어쓰지 않는다.

## 구현 순서와 action 계층

1. typed-key map validator/lookup helper를 scalar identity owner 근처에 추가.
2. categorical axis/legend text generator가 format 전에 mapping 여부를 확인.
3. facet header role resolver와 per-role recipe를 확장.
4. occupied bounds/plot allocation 재계산과 R43 polar/parallel panels 연결.

## 독립 oracle와 인수 테스트

- raw[1,"1","KR","XX"] map1 → "하나", KR → "한국": "1"과XX는 fallback, domain/row값 동일.
- row map A → "실험군", column map A → "조건 A": 두 역할 분리.
- 긴 header를 right/bottom 배치해 panel/legend와 overlap 없이 allocation 반영.
- empty label 숨김, map:auto 복구, duplicate key/bad side/continuous axis mapping 오류.
- facet source edit/Canvas/theme 후 raw panel identity와 mapping 보존.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
