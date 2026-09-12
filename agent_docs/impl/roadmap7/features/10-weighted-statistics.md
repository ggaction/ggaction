# R10 — 가중 통계·histogram·KDE

원래 감사 번호: **10**. Primary owner: **Phase 3**. 상태: **Proposed / 구현 전**.
아래 세부 API·수치 정책의 Gate는 승인됐다. 상태의 `Proposed`는 제품 구현·검증이 아직 완료되지 않았다는 뜻이다.

## 목적과 현재 연결점

조사 가중치와 빈도표를 정확히 표현한다. frequency와 reliability를 같은 분산 공식으로 처리하면 잘못된 추론이 되므로 별도 계약을 둔다. 위 bandwidth 수식과 quantile 차이를 Phase 3 A Gate 검토 대상으로 제시한다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/summary.js`
- `src/grammar/bin.js`
- `src/grammar/density.js`
- `src/actions/data/summary.js`
- `src/actions/data/density.js`
- `types/program.d.ts`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// summary/bin/density와 이를 소유하는 histogram/density/violin facade로 전달
weight?: {field:string; kind:"frequency"|"reliability"}
// 기존 ECDF/Pie의 weight 호출은 호환 유지; 같은 이름이라며 강제 교체하지 않는다.
// Summary: count,sum,mean,variance,varianceP,stdev,stdevP,stderr,median,quantile,q1,q3 지원
```

## 값·기본값·오류 계약

- weight 생략은 이전 결과와 동일. frequency는 nonnegative safe integer이고 그룹 W도 safe integer 범위여야 한다. reliability는 nonnegative finite. 모든 row의 값과 weight field를 사전 검증, 0 weight는 통계에서 제외하되 source provenance는 보존. 음수/NaN/Infinity·그룹 total weight0은 오류.
- W=sum(w), W2=sum(w²), mean=sum(w*x)/W. weighted count=W, sum=sum(w*x), population variance=sum(w*(x-mean)²)/W.
- Sample variance denominator: frequency W-1, reliability W-W2/W. 분모<=0이면 오류. stdev는 각 variance의 sqrt. stderr는 sample stdev/sqrt(nEff); frequency nEff=W, reliability nEff=W²/W2.
- Frequency quantile은 가상 반복 sample에 현재 unweighted quantile 규칙을 적용하되 실제 행 복제 금지. Reliability quantile은 정렬·동일값 weight 결합 후 cumulativeWeight/W>=p인 최초 x(inverse CDF), p0/1은 min/max. 두 정의를 문서에서 구별한다.
- bin count는 weighted mass. density unit는 sum(w*K((x-xi)/h))/(W*h), count는 sum(w*K(...))/h. bin/domain extent는 positive-weight rows 기준. bandwidth:auto는 h=1.06*s*nEff^(-1/5). s=min(weighted sample stdev, IQR/1.34) 단 IQR=0이면 sample stdev. IQR은 위 weight kind의 quantile 규칙. nEff<=1, s<=0, nonfinite h는 오류이며 explicit h>0이면 해당 auto 추정 조건을 요구하지 않는다.
- Weighted CI, regression, arbitrary aggregate, negative weights는 이번 필수 범위 밖이며 입력 조합을 거부한다. 요청된 summary/bin/KDE와 histogram/violin/density facade 전달은 필수다.

## 저장 결과와 생명주기

각 transform에 weight definition을 저장한다. Raw row source는 보존하며 aggregate final-item members는 positive-weight row membership으로 정의한다. 0-weight row를 selection에서 통계 기여자로 세지 않는다. Facet마다 W/nEff와 bandwidth:auto를 재계산한다. existing ECDF/Pie semantics는 별도 contract로 보존한다.

## 구현 순서와 action 계층

1. shared weighted accumulator/quantile helper를 pure statistics owner로 만든다. compensated/rescaled arithmetic으로 overflow를 검사한다.
2. summary/bin/KDE validators/materializers를 순서대로 확장한다. frequency histogram을 실제 row replication으로 구현하지 않는다.
3. encodeHistogram/encodeDensity와 complete facades의 weight pass-through를 추가한다.
4. optional weighted branches가 활성화되지 않으면 기존 trace/data/schema를 바꾸지 않는다.

## 독립 oracle와 인수 테스트

- x=[1,3], frequency w=[1,3]: W4, mean2.5, varianceP .75, sample variance1, stderr .5. unit KDE의 numerical integral≈1, count≈4.
- reliability w=[1,3]: nEff1.6, sample variance2, stderr sqrt(1.25).
- frequency quantile는 작은 데이터의 실제 반복 oracle와 동일; 큰 frequency는 row 수 증가 없이 수행.
- zero-weight extreme x가 auto domain을 늘리지 않음. all-zero, fractional frequency, negative/overflow weight 오류.
- unweighted 0.0.13 results 동일, grouped histogram/violin, facet-local bandwidth, installed browser/Node를 검증한다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — 가중치 전파와 계산

### 입력 타입과 연산 whitelist

새 export StatisticalWeight={field:string,kind:"frequency"|"reliability"}를 SummaryDataOptions/BinDataOptions/DensityDataOptions 및 대응 semantic transform과 histogram/density/violin authoring 옵션에 추가한다. existing ECDF weight:string은 변경하지 않는다. grouped/split violin에서도 group마다 적용한다.

summary의 quantile은 기존 문법을 보존한다.

~~~ts
{ op: { op:"quantile", probability:0.25 }, field:"x", as:"q25" }
~~~

새 p 필드를 SummaryAggregateOptions root에 추가하지 않는다. R36의 Statistic.p는 자체 reference API에서만 사용하고 내부 aggregate로 바꿀 때 probability로 변환한다.

weight branch의 whitelist는 count,sum,mean,variance,varianceP,stdev,stdevP,stderr,median,q1,q3 및 parameterized quantile이다. min/max/distinct/valid/missing/first/last/CI는 이 weighted branch에서 명시 거부한다. 필요한 extent min/max는 private 계산이며 public weighted aggregate를 자동 추가하지 않는다. count는 value field가 없어도 가능하고 weight만 검증한다. 그 외 연산은 field 필수다.

### 계층별 정확한 weight 위치와 해제

| API | 위치 | 생략 / 해제 |
| --- | --- | --- |
| createSummaryData/createBinData/createDensityData | root weight | 생략=unweighted |
| encodeHistogram/encodeDensity | root weight | 새 encoding 요청에서 생략=unweighted |
| createHistogram/createDensityPlot | root weight | 하위 encoder root로 그대로 전달 |
| createViolinPlot | density.weight | 하위 density transform weight로 전달 |
| editSummaryData/editBinData/editDensityData/editDensity | root weight | 생략=유지,false=제거 |
| editViolinPlot | density.weight | 생략=유지,false=제거 |
| editDerivedData | complete definition.weight | definition에서 생략하면 제거 |

weight:false는 edit 전용 patch sentinel이고 canonical transform에는 저장하지 않는다. create/encode에서 false는 오류다. ViolinPlotDensityOptions의 기존 parent GradientPlotDensityOptions를 통째로 확장해 미선택 Gradient API까지 weight가 새지 않도록 violin-own 옵션에서만 추가한다. 이 해제 규칙도 Proposed이며 Phase3/4의 타입·runtime에 함께 반영한다.

### 계산 알고리즘

1. 모든 요청 value fields와 weight를 먼저 검증한다. 0 weight row의 invalid numeric도 오류다. group은 원본 first appearance로 유지한다.
2. positive weights만 통계 membership에 넣는다. all-zero group은 오류다. frequency의 각 w와 W는 safe integer, virtual rows를 할당하지 않는다.
3. 안정적 계산은 w/max(w)로 scaling 가능하다. mean과 reliability variance/SE는 scaling에 불변, weighted sum/count/count-density는 원래 weight 크기를 반영해 마지막 finite 검증한다. 중간 W2 overflow 때문에 정상 reliability mean을 실패시키지 않는다.
4. Q=sum(w*(x-mean)^2), varianceP=Q/W. frequency sample=Q/(W-1), reliability sample=Q/(W-W2/W). 분모<=0은 요청한 sample statistic 또는 auto bandwidth에서만 오류다. population만 요청한 한 positive observation은0.
5. frequency quantile은 sorted 값과 cumulative integer weights에서 rank floor((W-1)*p),ceil((W-1)*p)의 값을 binary search하고 기존 linear interpolation. reliability는 동일 x의 weights를 합치고 최소 cumulative/W>=p인 x. p0은 min, p1은 max.
6. bins는 positive-weight extent, 각 bin mass=sum(weights). includeEmpty가 켜진 빈 bin mass0은 허용하며 group total0과 구별한다. last upper endpoint 기존 포함 규칙 유지.
7. Gaussian KDE unit=sum(w*exp(-.5*((x-xi)/h)^2))/(W*h*sqrt(2*pi)); count는 W배. bandwidth:auto는 feature 수식을 사용한다. explicit positive h는 effective sample size1에도 허용한다.
8. 현재 density grid/extent/kernel/output-order/work-budget는 유지한다. finite grid의 적분을 무조건1로 다시 정규화하지 않는다.

Weighted `bandwidth:"auto"`는 `groupBy`와 split의 각 실제 profile에서 별도로 계산한다. Profile이 하나면 기존처럼 `resolved.bandwidth:number`를 저장한다. 둘 이상이면 하나의 전역 숫자를 실제 계산값인 것처럼 저장하지 않고 `resolved.bandwidths`를 first-appearance profile 순서의 `{group?,split?,bandwidth}` 배열로 저장한다. `resolved.bandwidth`와 `resolved.bandwidths`는 배타다. Explicit bandwidth와 unweighted legacy path는 기존 단일 `resolved.bandwidth` shape를 유지한다. Facet replay는 resolved 값을 제거한 requested transform에서 다시 materialize하므로 각 child source에서 같은 규칙을 다시 실행한다.

### 계층별 완료 의무

data creators → statistical encoders → complete facades → edit/replay 모두 weight를 보존한다. histogram bin count를 다시 단순 row count로 덮지 않는다. violin은 먼저 weighted profile을 계산한 뒤 기존 unit/count/width 정규화를 적용하며 반쪽/그룹 profile끼리 weights를 섞지 않는다. 새 facade의 옵션만 받고 하위 requested transform에 weight가 없는 구현은 실패다.

### 고정 인수 사례

- R10-N01: x=[1,3],w=[1,3],frequency → count4,sum10,mean2.5,varP.75,var1,stderr.5.
- R10-N02: 같은 reliability → nEff1.6,var2,stderr1.118033988749895.
- R10-N03: frequency q25=2.5,median3; reliability q25=1,median3. 작은 expanded sample [1,3,3,3]을 독립 oracle로 사용한다.
- R10-N04: h1,xEval1,unit density=(1+3*exp(-2))/(4*sqrt(2*pi)); count=4배.
- R10-N05: x=[1,3,1000],w=[1,3,0]의 auto domain은1..3, members는[0,1].
- R10-E01: all-zero group / frequency.5 / sum weights>MAX_SAFE_INTEGER / weighted CI → 오류.
- R10-L01: 모든 reliability weights를10배로 바꾸면 mean/variance/SE/unit-density 동일, count/sum/count-density는10배.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
