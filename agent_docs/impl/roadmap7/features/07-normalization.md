# R07 — 그룹 정규화·기준값 비교

원래 감사 번호: **7**. Primary owner: **Phase 1**. 상태: **Implemented-primary** (`b891d1d5`).
Grouped normalization, statistical facet replay, 공개 create API·타입·Current 계약·설치 패키지를 구현했다. R02의 `editNormalizedData`와 Phase 12의 downstream revision은 `d29287c9`, `8c4b56ad`에서 닫혔다.

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
- share=x/sum(group), 음수 입력은 항상 거부하며 허용 옵션을 추가하지 않는다. minmax=(x-min)/(max-min). zscore=(x-mean)/sigma, variance 기본 population; sample은 n-1 denominator이고 n<2 오류.
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

## 구현 고정 명세 — 정규화 함수와 union

새 export NormalizedDataOptions/DatasetNormalizedTransform을 정의하고 method를 discriminant로 삼는다. 공통 keys는 id,source,field,as,groupBy,method다.

| method | 허용 전용 옵션 | 정규 기본값 | 계산 |
| --- | --- | --- | --- |
| share | zeroDenominator | error | x / sum(x) |
| minmax | zeroDenominator | error | (x-min)/(max-min) |
| zscore | variance,zeroDenominator | population,error | (x-mean)/stdev |
| index | baseline,sortBy,zeroDenominator | first,error | 100*x/b |
| change | baseline,sortBy | first | x-b |
| percentChange | baseline,sortBy,zeroDenominator | first,error | (x-b)/b |

baseline은 {position:"first"|"last"} 또는 {value:finite number} 정확히 하나다. position이면 sortBy가 nonempty여야 하므로 최소 index 호출에도 sortBy를 넣어야 한다. sample n<2는 zeroDenominator:"null"/"zero"여도 오류다. 분모가 실제로 0인 경우만 대체 정책을 적용한다.

share의 음수는 항상 RangeError다. 초안의 "기본 음수 거부"가 음수 허용 옵션이 있다는 뜻은 아니다. 나머지 method는 finite negative values를 허용한다. [-10,-15] baseline first의 percentChange는 [0,.5]이며 denominator를 abs(b)로 바꾸지 않는다.

### 알고리즘

1. validate/normalize 단계에서 method 전용 key와 output collision을 확인한다. groupBy 기본 [] 저장, 다른 method의 기본값을 불필요하게 저장하지 않는다.
2. source rows를 {row,index}로 그룹화한다. 각 row의 field는 finite number 필수. source가 비면 schema/option 검증 후 []를 반환한다.
3. share/minmax/zscore는 그룹당 요약값을 한 번 계산한다. zscore는 numeric.js의 안정적인 mean/deviation 경로를 재사용한다.
4. 기준형 method는 stable sort한 그룹의 first/last 또는 명시 value를 사용한다. first/last는 정렬 방향을 반영한 위치다. 값을 작은 순으로 다시 정렬하지 않는다.
5. 원래 index에 output을 쓴다. output이 finite가 아닌 경우 대체 정책으로 숨기지 말고 RangeError.
6. normalize는 row 수를 보존하지만 facetTopology:"statistical"이다. derived create/materialize와 R02 edit에서 같은 함수를 사용한다.

### 고정 인수 사례

- R07-N01: [2,4], share → [1/3,2/3], minmax → [0,1], population zscore → [-1,1].
- R07-N02: [2,4], sample zscore → [-0.7071067811865475,0.7071067811865475].
- R07-N03: rows [{t:2,x:15},{t:1,x:10}], ascending first → index [150,100], change [5,0], percentChange [.5,0].
- R07-N04: zscore [3,3], zero policy → [0,0]; null policy → [null,null]. share [3,3]는 [.5,.5]로 정상이다.
- R07-E01: share [-1,2], sample zscore [1], baseline position without sortBy, change+zeroDenominator → 오류.
- R07-L01: A[1,3], B[2,2]의 facet-local share → [.25,.75] / [.5,.5], 전체 sum8 기준을 재사용하지 않는다.

## 완료 조건

- [x] create API의 최단 호출과 explicit source, method별 옵션, 누락/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 `test/unit/actions/data/normalized-data.test.js`에 독립 기대값으로 구현했다.
- [x] group/facet-local replay, quantitative consumer와 Canvas materialization을 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] `editNormalizedData`와 source revision replay는 R02/Phase 4에서 같은 materializer로 검증한다.
- [x] Phase 1 승인과 `b891d1d5` 검증 근거를 `phase1/STEP1.md`에 기록했다. appearance 전용 Gate V는 data-only라 새 시각 목표가 없다.
