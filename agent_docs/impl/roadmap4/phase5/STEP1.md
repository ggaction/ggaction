# Step 1 — Window와 2D bin contract/oracle

## 진행 상태

- [x] candidate API와 state owner 정의
- [x] Window stable order/tie/field dependency 규칙 정의
- [x] 2D bin eligibility/boundary/order/count 규칙 정의
- [x] source와 독립적인 Window oracle 구현
- [x] source와 독립적인 2D bin oracle 구현
- [x] literal vector와 Cars 고정 결과로 oracle 검증

## 검증 기준

- Window fixture는 partition, multi-field sort, stable tie, rank 차이, cumulative sum, lag/lead와 앞 operation
  output 참조를 한 번에 검증한다.
- 2D bin fixture는 min, interior boundary, final upper bound, invalid pair, empty cell과 member index를 검증한다.
- Cars fixed extent 결과는 eligible 398, 80 total cells, 38 occupied cells, max count 33, count sum 398이어야 한다.
- Oracle은 `src/`를 import하지 않는다. Production 구현이 oracle을 호출하는 것도 금지한다.

P5-A 승인 전에는 candidate action을 runtime prototype, declarations 또는 Current contract에 추가하지 않는다.
