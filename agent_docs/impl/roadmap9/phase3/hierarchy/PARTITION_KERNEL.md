# Hierarchy partition private checkpoint

## 진행 상태

- [x] 공통 model에서 normalized partition과 reserved residual tail 계산
- [x] 기존 numeric owner의 명시 compensated sum/prefix를 hierarchy 전체에 적용
- [x] Literal·독립 정수 가중치 oracle·conservation·zero·깊이10,000 검증
- [x] 기존 통계343개, critical/source/package 경계 통과
- [ ] 명시 sibling sort와 treemap slice/dice/squarify 계산
- [ ] Hierarchy/layout resource lifecycle 및 public/visual/consumer 통합
- [ ] AT-22·STEP-020·STEP-077 전체 완료

기준은 tree `4aa6f31449f4c648e21695570ea009ddbec21e30`이며, 기존
[AUTHORIZATION](../../AUTHORIZATION.json)과 parent의 STEP-020 private 계산 위임을 재사용한다.
현재 kernel은 공개 action/export와 연결하지 않는다.

## 계산과 수치 소유권

`layoutHierarchyPartition(model,options)`는 공통 `indexHierarchyModel`을 통과한 nodes만 소비한다.
입력 child 순서를 보존하고 root total이 양수이면 [0,1], 전체 total0이면 모든 node의 폭을0으로 둔다.
부모 구간에 child total의 보정 prefix/parent total을 매핑한다. Residual0인 마지막 child의 end는
부모 end를 그대로 재사용하여 닫힘 오차를 없앤다. Prefix가 역전되거나 부모를 벗어나면 오류이며 clamp로 감추지 않는다.

Node는 기존 key,parentKey,childrenKeys,depth,value,sourceRows와 u0/u1/residualStart를 갖는다.
`[residualStart,u1]`은 부모 자신의 몫이다. 가짜 child 또는 임의 source row를 만들지 않는다.
값0 leaf, empty hierarchy, synthetic forest도 metadata를 보존하고 입력/결과를 분리한다.
Padding·orientation·viewport·radius는 이 normalized 결과의 입력이 아니다. Public graphic adapter는 이후 별도로 구현한다.
Model 검증과 node 계산 비용을 같은10M work에 합산하고 maxNodes 경계를 재사용한다.

기존 `numeric.js`의 `stableFiniteSum`과 `stableFinitePrefixSums`에 private 명시 옵션
`{compensated:true}`를 추가했다. 기존2-인수 호출의 유한 합산 결과와 scaled overflow 동작은 그대로다.
명시 정책은 직접 보정 합산을 우선하고 중간 overflow 때 기존 normalized scale 계산을 재사용한다.
항상 scale로 나누는 방식이 작은 정수 합에도 반올림을 만들 수 있으므로 이를 기본 경로로 쓰지 않는다.
Hierarchy normalize/input/model/partition은 같은 명시 정책으로 합계와 prefix를 일치시킨다.
대표 literal `[1e16,1,1]`의 total은10000000000000002이며 기존 기본 호출의 total1e16은 유지한다.
부동소수점 구간에서 구별할 수 없는 작은 leaf의 폭이0이어도 원래 value와 identity는 사라지지 않는다.

## 독립 검증과 재현

`test/oracles/hierarchy-partition.js`는 production import 없이 모든 own weight를 BigInt 정수 좌표에
차례로 배치한 후 root weight로 한 번 나눈다. Production의 매 depth 구간 보간과 구조가 다르다.
Literal root10/A6/A1=2/A2=4/B4를 anchor하고40개 seeded tree에서 interval·residual tail을 비교한다.
Tolerance는 normalized 값의 absolute2e-15이며 receipt는 실제 부동소수점 차이를 숨기지 않고 저장한다.
모든 parent에서 children+residual 폭 보존, containment, 무중첩, 마지막 edge 일치도 별도 확인한다.

| 명령 | 결과 |
| --- | --- |
| Hierarchy5개 test 파일+numeric-sums의 Node coverage | 47 passed; 기존 네 owner100/100/100, partition100/93.75/100 |
| Canonical critical95/90/100 | 다섯 hierarchy owner 통과, 기준 유지 |
| `node scripts/run-tests.js unit capability:statistical-fixtures unit/grammar/numeric-sums.test.js` | 343 passed |
| `node scripts/check-hierarchy-fixtures.js` | 12개 독립 fixture의 call/input/expected/actual/diff SHA 저장 |
| Discovery/source/package boundary 및 artifact contracts | 38 passed |
| `npm run package:check` | 688entries/1,025,059packed/4,769,405unpacked bytes |
| `npm run package:bundle` | Full/Basic installed browser build 통과; gzip510,644/287,809bytes |

증거는 `.artifacts/validation/hierarchy-partition/`에 있다. Entry cap은 새 module1개에 맞춰688,
size cap은 실측 최소1,000byte 경계인1,026,000/4,770,000으로 조정했다. 이전687 cap 실패도 보존한다.
Numeric owner 변경에 따른 bundle 증가 Full100/Basic104bytes는 기존511,000/288,000 한도 안이며 cap을 올리지 않았다.
Main 누적 통합에서는 parent가 combined package/bundle 크기를 재측정한다.

## 남은 의무

후속 treemap 계산은 [TREEMAP_KERNEL](TREEMAP_KERNEL.md)에 기록한다. 아래 항목은 이 checkpoint 시점의 상태다.

Sibling sort와 treemap 계산을 이어 구현한다. Hierarchy/layout resource 생성·수정·revision·삭제,
실제 dataset row identity/ref 연결, persistence/inspection/scene/selection/hit/accessibility,
composition·renderers·types/docs/package-consumer는 아직 public 통합 전이다.
새 tree/treemap/partition 그래픽 flow는 rendered primitive 검토가 필요하다.
이 계산 checkpoint를 STEP-020 또는77개 카드 전체의 완료로 기록하지 않는다.
