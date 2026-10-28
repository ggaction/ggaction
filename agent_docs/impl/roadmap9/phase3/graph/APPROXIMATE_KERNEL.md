# 명시 근사 그래프 검색

## 진행 상태

- [x] [남은 전체 승인](../../AUTHORIZATION.json)을 적용하고 exact 기본값 보존
- [x] seeded projection forest 후보, exact rerank, 부족 후보 정책 구현
- [x] 독립 exhaustive oracle와 measured recall, 높은 minRecall의 오류 검증
- [x] coverage·패키지·Node20/22/24와 source checkpoint 고정
- [ ] GraphResource·NodeLayout·data/k/layout invalidation 공개 통합 및 STEP-032 종료

Private `inferGraphNeighbors`에 명시 `search:{mode:'approximate',seed,...}`가 있어야 이 경로를 사용한다.
알고리즘은 `projection-forest@1`, preset은 trees8/projections1/leafSize32/searchLeaves16이다.
trees1–64, leafSize/searchLeaves1–1024를 받으며 projections는 현재1만 지원한다. Seed는 필수 uint32다.
Candidate 부족은 기본 `fallback:'error'`, 명시 `'exact'`일 때 해당 query의 전체 후보로 확장한다.
두 경우의 선택을 provenance에 보존하며 낮은 recall을 exact라고 보고하지 않는다.

각 tree는 seeded 단일 random projection을 정렬해 leafSize 단위 leaf를 만든다. Query의 leaf부터
projection 구간 거리가 가까운 인접 leaf를 searchLeaves개 방문하고 여러 tree의 후보를 합친다.
Euclidean/Manhattan은 공통 magnitude scale, cosine은 unit vector, great-circle은 unit sphere 좌표를
후보 projection에만 사용한다. Jaccard는 typed encoded token의 seeded hash weight projection이다.
최종 거리·typed-key tie·k·symmetrization·opaque edge key는 기존 정확 owner가 결정한다.

Recall은 typed key 순서의 min(n,1000)개 query를 같은 호출에서 전수 검사하여 계산한다.
기본 minRecall0.95, 명시값은0.95–1이며 미달 시 `GGACTION_GRAPH_RECALL`과 measuredRecall/seed/
holdoutCount를 포함한 오류다. 기본값을 포함한 모든 resolved option, candidateCount(합계), query별
candidateCounts, fallbackQueries(원본 source index), holdoutSourceIndices와 실제 평가량을 저장한다.
검증 비용도 기존10,000,000 work limit에 포함하므로 큰 입력은 index 생성 전에 오류가 날 수 있다.
검증 query를 줄이거나 recall을 추정값으로 대체하지 않는다.

128-node grid fixture는 독립 수치 oracle로 exact KD 결과를 비교한다. 제한 forest(trees8/leafSize8/
searchLeaves1/seed42)는5,416개 후보, recall0.984375를 기록한다. 같은 입력의 minRecall1은 오류이며
입력 순서를 뒤집어도 살아 있는 edge identity/weight는 같다. 기본 preset, 다섯 metric, typed tie,
zero·empty·single·missing·preprocessing·huge finite·candidate fallback·budget도 검사한다.
재현 명령은 `node scripts/check-graph-search-fixtures.js`이며 expected/actual/diff를 남긴다.

[고정 증거](approximate-evidence/manifest.json): graph96개, 신규 approximate coverage100/97.25/100,
graph14개 critical floor, Node20/24각17개와 독립 oracle, source/package/navigation25개가 통과했다.
760entries/5,197,374unpacked/Node20·24 최대1,129,661packed bytes를 실측해 최소 한도
760/5,198,000/1,130,000을 적용했다. Force의 seed 계산은 같은 생성기로 이동했으며 고정 좌표 oracle와
기존 force 시험이 그대로 통과했다. 공개 bundle import graph는 바뀌지 않는다.
