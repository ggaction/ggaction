# 정확한 그래프 검색 가속

## 진행 상태

- [x] [전체 승인](../../AUTHORIZATION.json)을 재사용하여 private 검색 계약 기록
- [x] 기존 brute-force와 exact KD-tree·radius grid 100개 seeded fixture 비교
- [x] typed tie·radius equality·duplicate zero·source omission·empty·limits 검증
- [x] package·경계·coverage·Node20/22/24 evidence 고정 및 commit/push
- [ ] opt-in approximate와 public graph revision integration

기존 `inferGraphNeighbors`의 명시 `search:{mode:'exact',algorithm:'kd-tree'|'grid'|'brute-force'}`
옵션을 추가한다. 옵션 생략은 기존 brute-force를 그대로 사용한다. KD-tree는 Euclidean/Manhattan의
kNN/radius, 최대8차원이다. Grid는 같은 metric의 radius, 최대3차원이며 cell 폭은radius다.
Radius0은 동일 좌표 grouping이다. Grid의 cell index는 safe integer 범위(이웃 offset 여유 포함)를
요구하고 초과하면 오류다. 지원 범위 밖의 알고리즘을 조용히 선택하지 않는다.

KD-tree는 depth별 axis와 typed-key tie로 balanced tree를 만들고 bounding box lower bound가 현재
radius/kth distance보다 큰 경우만 prune한다. Conservative floating-point 여유로 경계 tie를 포함한다.
Grid는 부동소수점 division 경계를 위해 각 축 ±2 cell을 검사하고 기존 정확 metric으로 최종 판정한다.
Result의 `search`는 mode/algorithm/algorithmVersion/distanceEvaluations와 실제 작업량을 기록한다.
기존 pairCount는 가능한 unordered pair 수다. 같은 shared metric, symmetrization, opaque inferred
edge identity와 final ordering을 재사용한다.

Tree 구축 비용은 미리 예약하고 metric·query·insertion 비용을 실행 전에 누적 검사한다. Radius pair는
allocation 전에 generated-edge 한도를 검사한다. Caller input과 ChartProgram은 수정하지 않는다.
신규 public action·resource·renderer·types는 아직 연결하지 않았으며 STEP-032 전체 완료가 아니다.

검증은 graph87개, 신규 search coverage100/99.07/100, critical graph12개 floor, Node20/24각7개,
경계24개와 package7개가 통과했다. 100 fixture 각각 metric2종 × KD kNN/KD radius/grid radius를
비교했다. [원본 증거](search-evidence/manifest.json)에 최초 미구현 실패와 기존 package ceiling
실패도 보존한다. 실측758entries/5,188,050unpacked/Node20·24 최대1,126,325packed bytes에 맞춰
한도758/5,189,000/1,127,000을 적용했다. Private module이므로 공개 bundle import는 추가하지 않았다.
