# R07 — 그룹 정규화·기준값 비교

원래 감사 번호: **7**. Primary owner: **Phase 1**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

현재 fill/share/window/computed를 조합해야 하는 정규화 작업을 독립 의미 연산으로 제공한다. R03 Join은 선택 범위 밖이므로 이 기능의 전제 조건으로 끌어오지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/summary.js`
- `src/grammar/window.js`
- `src/actions/data/computed.js`
- `src/grammar/transformTopology.js`

관련 항목: R06. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
createNormalizedData({id, source?, field, as, groupBy?,
  method: "share" | "zscore" | "minmax" | "index" | "change" | "percentChange",
  sortBy?, baseline?: {value:number} | {position:"first"|"last"},
  variance?: "population"|"sample", zeroDenominator?: "error"|"null"|"zero"})
editNormalizedData({target, ...partialDefinition}) // R02에서 구현
```

## 값·기본값·오류 계약

- id/field/as 필수, as는 기존 cell과 충돌 금지. groupBy 기본 []; group keys는 기존 scalar identity. 기존 finite quantitative field만 허용, missing은 오류이며 R05로 먼저 처리한다.
- share=x/sum(group), 기본 음수 입력 거부. minmax=(x-min)/(max-min). zscore=(x-mean)/sigma, variance 기본 population; sample은 n-1 denominator이고 n<2 오류.
- index=100*x/b, change=x-b, percentChange=(x-b)/b. percentChange는 fraction이며 100을 곱하지 않는다. change는 b=0 가능.
- 기준형 method의 baseline 기본 {position:"first"}; position이면 nonempty sortBy 필수. sort tie는 원본 순서. baseline:value면 sortBy 선택. 그룹별 기준이 독립적이다.
- zeroDenominator 기본 error, 명시적 null/zero만 대체. zscore constant group도 이 정책 적용. method별 적용 불가능한 variance/baseline/sortBy는 오류.
- 출력은 원본 row 순서. generic join/lookup이나 원본 replacement API를 이 작업에 추가하지 않는다.

## 저장 결과와 생명주기

새 `normalize` transform에 requested roles/policy를 저장한다. 출력은 source row grain이며 그룹 통계 계산 때문에 facet topology는 statistical로 분류한다. facet에서 분할 후 normalization을 재실행한다. group aggregates cache는 provenance가 아니며 필요한 최종 값만 derived values로 저장한다.

## 구현 순서와 action 계층

1. shared grouping/order/compensated summary 계산을 재사용해 pure normalization 함수를 만든다.
2. 그룹별 denominator/baseline을 계산하고 output row를 source index에 매핑한다.
3. createNormalizedData → createDerivedData(normalize) → materializeNormalizedData를 wrapped flow로 등록한다.
4. transform validation/replay/consumer registry에 추가하고 zscore 등 계산을 chart facade 내부에 복제하지 않는다.

## 독립 oracle와 인수 테스트

- x=[2,4] share=[1/3,2/3], zscore population=[-1,1], minmax=[0,1].
- sorted x=[10,15] index=[100,150], change=[0,5], percentChange=[0,.5]. original rows가 반대 순서여도 output row order는 그대로다.
- 두 그룹의 기준값/분모가 섞이지 않는다. constant [3,3]은 default error, zero policy [0,0], null policy [null, null].
- sum=0, near-overflow, negative share, sample n=1, missing role와 field collision을 검증한다.
- 같은 normalization을 full data와 facet-local data에서 계산한 수치 차이가 의도대로 나타난다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
