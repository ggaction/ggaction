# Group / sequence 그래프 연결

## 진행 상태

- [x] STEP-031과 공통 graph identity·missing·budget 계약 대조
- [x] 독립 literal과 구현 전 실패 재현
- [x] Group clique/star, sequence lag/tie/maxGap 순수 계산
- [x] Typed identity·omission·불변 입력·원자 실패·수치 검증
- [x] Package/source 경계 검증; 이 문서를 포함한 구현 commit으로 고정
- [ ] Public graph source/revision/codec/selection 통합 및 STEP-031 종료

[남은 전체 계획 승인](../../AUTHORIZATION.json)을 적용한다. Public GraphResource action으로
연결하기 전의 순수 계산 checkpoint이며, MST는 기존 [spanning](SPANNING_KERNEL.md)을 재사용한다.

## 구체 계약

`inferGraphGroups(keys, tuples, options)`는 node key와 추출된 group tuple을 명시적으로 받는다.
`ruleId` 필수, mode 기본 clique, missing 기본 error다. Clique는 같은 typed tuple의 모든 무방향
pair를 한 번씩 만든다. Star는 explicit hub만 사용한다. 단일 group은 `hubKey`, 여러 group은
`hubs:[{group:[...],key:...}]`로 각 non-singleton group의 hub를 지정한다. 두 표현은 배타적이다.
Hub가 group 밖에 있거나 없거나 중복이면 오류이며 임의 첫 node를 택하지 않는다.
Empty/singleton은 edge가 없으므로 hub를 요구하지 않는다.

Group null/undefined는 기본 오류다. `missing:"include"`면 둘을 별도 typed group으로 유지하고,
`"omit-node"`면 source index와 사유를 남긴다. Group identity는 기존 groupingIdentity owner,
node/edge typed identity는 기존 itemIdentity/edgeIdentity owner를 재사용한다.
Group tuple은 0–64개 scalar이며 모든 node의 tuple 길이는 동일하다.

`inferGraphSequence(keys, tuples, orderValues, options)`는 같은 grouping에 ascending order를
적용하고 동률은 typed node key 순서로 정한다. 기존 sort와 temporal-unit owner를 재사용한다.
Lag 기본1이며 positive safe integer다. `maxGap`은 finite≥0, inclusive이고 numeric 또는 명시
`temporalUnit:"year"|"timestamp"` 순서에서만 쓴다. Timestamp는 기존 계약대로 finite epoch이며
문자열을 임의 timestamp로 바꾸지 않는다. MaxGap이 없으면 기존 sort가 허용하는 ordinal 순서도
지원한다. Missing은 error 또는 omit-node이며 모든 omission을 원본 index 순서로 기록한다.

두 rule은 metric을 받지 않고 weight1을 저장한다. Group은 무방향, sequence는 순서 방향을 유지한다.
Source/target index, stable inferred key, typed endpoints, options와 omission만 반환하고 graph
nodes/adjacency/source provenance를 중복 저장하지 않는다. Public adapter가 공통 graph model을 만든다.
Key/string/tuple·edge 수와 key 확장·sort 비용을 결과 allocation 전에 제한한다. Descriptor-safe
배열/record만 읽고 caller 입력과 이전 결과는 불변이다.

## 증거와 인계

[고정 manifest](structural-evidence/manifest.json)에 원본 실패와 최종 실행을 보존한다.
`node scripts/check-graph-structural-fixtures.js`는 clique/star/sequence/lag/zero-gap의5개 독립
literal expected/actual과 diff[], 입력 및 source SHA를 기록한다. Native source 소비자 연결이나
STEP-031/AT-72 전체 완료는 후속 public graph 통합의 의무다.

Graph80개·boundary33개·package7개가 통과했고 graph11개 owner의 critical floor를 충족했다.
Structural coverage는100/99.39/100이며 Node20·24의 focused11개씩도 통과했다.
Package740entries, unpacked5,075,040bytes, Node20/24 최대 packed1,103,541bytes를 확인하여
한도를740/5,076,000/1,104,000으로 최소 갱신했다. 최초 entry739 실패를 보존했다.
