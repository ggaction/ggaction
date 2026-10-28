# Hierarchy 입력 adapter private checkpoint

## 진행 상태

- [x] Flat field·nested children·typed group-path 입력을 공통 normalizer로 연결
- [x] 실제 원본 행 참조, leaf aggregate, null category 및 source immutability 검증
- [x] Adapter와 normalizer 누적 work, descriptor 검사 전 node budget, nested depth10,000 검증
- [x] 독립 literal6개와 두 owner critical95/90/100 기준 통과
- [ ] 명시 sibling order와 tidy tree/radial·slice-dice/squarify 계산
- [ ] Partition 공유 및 hierarchy/layout resource lifecycle
- [ ] Public/visual/consumer/types/docs 통합과 AT-22·STEP-077 완료

기준은 private normalizer `058cf739592cdd959ab67cacc088dc4c74140314`다.
승인은 [AUTHORIZATION](../../AUTHORIZATION.json)과 parent의 STEP-020 private 계산 위임을 재사용한다.
작업 위치는 같은 `roadmap9-hierarchy` worktree와 `codex/roadmap9-hierarchy` branch다.
현재 추가한 함수는 package public export 또는 ChartProgram action이 아니다.

## 소유자와 입력

`src/grammar/hierarchy/input.js`의 `normalizeHierarchyInput(input, options)`가 형식만 낮춘다.
`format`은 flat/nested/groups 중 명시 값이고 field 이름도 명시한다. 공개 action의 생략 추론을 결정하지 않는다.

| 형식 | Private 입력 역할과 의미 |
| --- | --- |
| flat | key/parent/value field를 읽는다. Own key·parent가 필수이며 internal missing value는 공통 valueMode 규칙을 따른다. 유효한 타입이라면 같은 입력 field를 key/value로 지정할 수 있다. |
| nested | key/children/value field를 읽고 반복 stack으로 순회한다. 생략한 children은 leaf, 명시 children은 own dense array다. 같은 object를 여러 부모가 공유하거나 순환하면 즉시 거부한다. |
| groups | groupFields의 typed prefix마다 node를 만들고 중복 leaf 관측값을 sum한다. Raw observation 입력의 집계 의미는 leaf-sum이며 다른 valueMode를 조용히 변환하지 않고 거부한다. |

Flat/nested는 leaf-sum/inclusive/own-plus-children을 기존 normalizer에 전달한다.
Groups의 모든 prefix key는 구조화된 typed component encoding에서 만들며 delimiter join을 쓰지 않는다.
Number1/string1/bigint1/boolean/Date/null category가 서로 충돌하지 않는다.
Null category는 missingCategory:error가 기본이며 include를 명시했을 때만 별도 typed-null component다.
Undefined·object·array·nonfinite category를 null로 대신하지 않는다. 그룹 이름은 first-seen 순서다.
Group-path root는 공통 forest synthetic namespace를 재사용하며 실제 입력 category로 노출하지 않는다.

Topology/key/weight 검증·total/residual 계산·immutable 결과는 `normalizeHierarchyNodes` 하나가 계속 소유한다.
Adapter는 원 입력을 수정하거나 외부 cache·program·trace를 만들지 않는다. Nested Date key는 canonical token으로
바뀌고 원 Date를 결과에 보존하지 않는다. Unknown option·getter·sparse array는 own-data boundary에서 실패한다.

## Source 행 의미와 한도

Flat node는 자신의 원본 행 인덱스를 가진다. Nested child는 해당 object를 포함한 **최상위 입력 행**을 가리킨다.
임의 flattened index를 실제 source row처럼 만들지 않는다. Group prefix의 sourceRows는 그 prefix를 도입한 모든
실제 raw row 인덱스다. Reorder 후 node key 집합과 total은 그대로이고 참조 인덱스·first-seen sibling 순서만 바뀐다.
후속 public resource는 이 인덱스를 실제 dataset row identity로 바꿔 저장해야 한다.

Flat/nested의 확인 가능한 최소 node 수와 nested children 길이는 descriptor table 생성 전에 maxNodes로 검사한다.
Group input은 여러 관측을 적은 leaf로 집계하므로 입력 행 수를 출력 node 한도로 잘못 제한하지 않는다.
Array/record 읽기, group prefix와 token 길이, node 생성 비용을 adapter가 누적한다.
Normalizer는 private priorWork 인수로 이 사용량을 받아 자신의 비용과 합쳐 공통10M 한도를 검사한다.
단계마다 한도를 새로 시작해 합계가 늘어나는 우회는 허용하지 않는다.

## 독립 검증과 재현

`test/oracles/hierarchy.js`의 flat/nested/groups literal은 production import가 없으며
`scripts/check-hierarchy-fixtures.js`가 앞선 세 value mode와 함께6개 expected/actual/diff와 input/source/oracle SHA256을 저장한다.
Tests는 roadmap 계획을 import하지 않는다.

| 명령 | 결과 |
| --- | --- |
| `node --test --experimental-test-coverage --test-coverage-include='src/grammar/hierarchy/*.js' test/unit/grammar/hierarchy-normalize.test.js test/unit/grammar/hierarchy-input.test.js` | 23 passed, exit0; 두 owner100/100/100 |
| Canonical critical floor95/90/100 검사 | 두 owner passed, 기준 완화 없음 |
| `node scripts/check-hierarchy-fixtures.js` | 6개 독립 fixture 통과, exit0 |
| `node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js` | 38 passed, exit0 |
| `npm run package:check` | final staging685entries/1,020,905packed/4,754,763unpacked, exit0 |
| `npm run package:bundle` | 설치 artifact Full/Basic browser build, exit0; gzip510,544/287,705bytes 유지 |

증거는 `.artifacts/validation/hierarchy-input/`에 보존한다. 추가 consumer/package 검사는 같은 경로의
`contracts.log`, `package-check.log`, `bundle.log`, `summary.json`이 소유한다.
Deep nested10,000, shared/cyclic object, invalid fields/categories/value modes, empty/zero/overflow,
ambiguous delimiter, source immutability, node/work capacity를 별도 검사한다.

공식 staging 실측은685entries/1,020,905packed/4,754,763unpacked bytes다. 이전684-entry 한도 실패를 보존하고
모듈1개와 최소1,000byte 경계만 반영하여 cap685/1,021,000/4,755,000으로 조정했다.
Public entry에 private module을 import하지 않으므로 기존 Full/Basic bundle 경계는 유지한다.
Main 누적 통합 때 parent가 combined 한도를 다시 측정한다.

## 남은 의무

후속 private tree 계산과 model 검증은 [TREE_KERNEL](TREE_KERNEL.md)에 기록한다. 아래 항목은 이 checkpoint 시점의 상태다.

명시 sibling order와 tree/treemap 계산은 아직 구현되지 않았다. 공통 hierarchy의 세 입력 형식이
private 수치 경계에 연결되었다는 것과 public API/저장 schema/visual 지원은 구분한다.
Public create/edit/revise/remove, exact resource refs·dataset row lineage, partition 소비, codec/inspection,
selection/hit/scene/accessibility, composition, SVG/Canvas/PNG/PDF 및 types/docs/package 소비자 연결이 남는다.
새 tree/treemap public flow는 별도 rendered primitive 검토 뒤 진행한다.
