# R25 — 미사용 dataset·scale·coordinate 안전 삭제

원래 감사 번호: **25**. Primary owner: **Phase 11**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

장시간 저작에서 남은 named resources를 안전하게 정리한다. 참조 시스템이 새 capability 전부를 알아야 하므로 마지막 기능 phase에 둔다. 기본 cascade는 절대 추가하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/remove.js`
- `src/actions/data/derived.js`
- `src/selectors/datasets.js`
- `src/materialization/guides/resources.js`
- `src/actions/scales/consumers/common.js`

관련 항목: R02, R19, R20, R21, R22, R27, R29, R31, R32, R36, R37, R38, R39, R43, R47, R49. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
removeData({id:string})
removeScale({id:string})
removeCoordinate({id:string})
// referenced resources는 기본/유일 정책 reject. cascade 없음.
```

## 값·기본값·오류 계약

- ID 필수, 정확한 resource kind로 조회. unknown ID는 오류. chart-owned internal resource는 unreferenced처럼 보여도 일반 remove 대상이 아니며 owner action을 요구한다. 독립 derived logical owner는 예외로, 외부 consumer가 없으면 owner.current 자기 참조를 제외하고 current dataset과 owner registry를 함께 삭제한다.
- 참조가 있으면 삭제하지 않고 referrer 종류/ID/path를 deterministic 순서로 오류에 포함. data: layer.data/derived.source/transform field-bound source/owner.current/retained facet·repeat source/stat reference. scale: all encoding channels+offset+parallel dimensions+guides/legend recipes/references. coordinate: layers/guide placement/annotations/source templates.
- context.currentData/currentScale/currentCoordinate는 hard semantic consumer가 아닌 selection pointer로 구분. 다른 live ref가 없고 pointer만 가리키면 삭제 가능하며 해당 pointer를 unset한다. 임의 다른 resource를 current로 선택하지 않는다.
- historical trace args/이전 program snapshot은 현재 참조가 아니다. 현재 config 안에 retained source/template로 저장된 snapshot은 replay용 live reference이므로 검사한다.
- named user data/scale/coordinate는 unused면 삭제 가능. 자동 garbage collector/전체 orphan purge/여러 ID batch cascade는 이번 범위 밖.
- 삭제 후 semantic/config/graphic resource 중 해당 owner에 속한 미사용 잔재를 정리하지만 다른 mark/domain/layout은 재추론하지 않는다. visible canvas가 달라지면 숨은 consumer를 놓친 것으로 간주한다.

## 저장 결과와 생명주기

읽기 전용 resource reference registry를 각 owner module의 collector로 구성한다. 문자열 전체 검색이나 semantic만 훑는 shortcut 금지. R02 revision release도 동일 collector로 실제 미참조 여부를 확인한다. reference edge 구조는 kind/id/path/owner/strength이고 정확한 shape는 common internal contract로 정한다.

## 구현 순서와 action 계층

1. 모든 live reference 경로를 inventory로 작성하고 each path의 fixture 확보.
2. pure collectResourceReferences + kind resolver를 구현; owner internal ID handling.
3. preflight → wrapped semantic/config removal → context cleanup. 실패 전에는 아무 mutation도 없음.
4. R02 release/mark removal와 helper를 공유하되 기존 owner closure 동작을 보존.
5. 각 새 feature의 refs가 omission 없이 등록됐는지 final integration audit.

## 독립 oracle와 인수 테스트

- unbound user dataset/unused named scale/empty coordinate 삭제 성공; rendered canvas 이전과 pixel identical.
- direct mark, child derived.source, parallel dimension, offset, legend samples, stat reference, retained facet source 각각 참조1개만 있는 resource 삭제 모두 거부.
- current pointer만 가리키는 unused data 삭제 후 unset; historical trace만 언급한 resource는 삭제 가능.
- source labels 제거 후 독립 resource 삭제 가능 여부 변화, theme/style token strings가 우연히 ID와 같아도 참조로 오인하지 않음.
- unknown ID/wrong kind/internal owner ID, error referrer deterministic order, old program 불변.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — live reference와 안전 삭제

### collector 반환 계약

~~~ts
type ResourceReference = {
  kind: "data" | "scale" | "coordinate" | "mark" | "selection";
  id: string;                    // 참조되는 실제 현재 resource
  ownerKind: string;
  ownerId: string;
  path: readonly (string | number)[];
  strength: "live" | "context";
};
collectResourceReferences(program, {kind,id}): readonly ResourceReference[];
~~~

collector는 known schema의 실제 ref만 순회하며 historical trace는 순회하지 않는다. retained source ChartProgram은 자신의 namespace 안에서 검사한다. 서로 다른 program의 같은 문자열 ID를 전역 참조로 취급하지 않는다. 바깥 data와 retained recipe의 연결은 명시 provenance edge로 판단한다.

### 허용/거부 및 순서

1. ID와 kind를 검증하고 resource/standalone owner를 resolve한다. 현재 source state의 소유권으로 internal 여부를 판단한다. 이름 prefix만으로 판단하지 않는다.
2. live edges를 수집, owner.current 자기 참조는 standalone owner의 removeData에서만 제외한다.
3. live edges가 하나라도 있으면 Error. 메시지에 action/resource kind/ID와 정렬된 referrer owner/path 목록을 포함한다. 정렬 키는 ownerKind,ownerId,path의 canonical 문자열이다.
4. live0이면 semantic resource, 그 리소스의 resolved cache/config와 자기-owned unused graphics만 지운다. independent style/token/resource의 같은 문자열 값은 건드리지 않는다.
5. context-only pointer는 unset. 다른 dataset/scale/coordinate로 대체 선택하지 않는다.
6. 성공 후 전체 visible graphic의 deep equality와 동일 backend decoded pixels를 확인한다. 데이터 삭제가 축 domain 재추론을 일으키면 hidden consumer 누락이다.

### reference fixture 필수 목록

data: direct layer.data, dataset.source, standalone current, chart-private data owner, retained facet source, retained repeat source, dynamic reference population.
scale: x/y/x2/y2/theta/radius/color/stroke/size/shape/opacity/strokeWidth/strokeDash/angle 중 실제 scaled channels, x/yOffset, parallel.dimensions[].scale, ordinary/polar/parallel axis, legend binding/recipe, dynamic reference binding.
coordinate: layer, annotation data space, guides placement, composition child/local recipe.
selection: highlight와 named label recipe. R25 public 함수에 removeSelection을 새로 추가하지 않고 기존 removeMarkSelection의 preflight가 collector를 사용한다.

각 path는 다른 live edge를 제거한 "참조1개만 남긴 fixture"를 만들어야 한다. 실제 저장되지 않는 resolved 숫자 또는 samples 배열을 fake scale ID ref로 만들지 않는다.

### 고정 인수 사례

- R25-N01: unused D,S,C 제거 → 해당 semantic entries0, 렌더 이전과 동일.
- R25-N02: context.currentData=D만 참조 → 삭제 후 currentData 없음.
- R25-N03: trace.args에만 D가 남음 → 삭제 성공.
- R25-E01: parallel dimension만 S 참조 → Error에 dimension path.
- R25-E02: live retained facet source만 D 참조 → Error; historical before program은 검사 대상 아님.
- R25-L01: standalone current를 참조하는 마지막 mark 삭제 후 removeData(logical ID) 성공, 원본 source는 남음.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
