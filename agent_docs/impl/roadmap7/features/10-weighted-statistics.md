# R10 — 가중 통계·histogram·KDE

원래 감사 번호: **10**. Primary owner: **Phase 3**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

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

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
