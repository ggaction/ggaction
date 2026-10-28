# Hierarchy 공통 정규화 private checkpoint

## 진행 상태

- [x] STEP-020 원 카드·hierarchy/core/structure 계약과 실제 owner 차이 확인
- [x] 명시 node 입력의 typed identity·topology·value mode 공통 정규화
- [x] 독립 literal·depth10,000·empty/zero/forest·cycle/orphan·overflow·work·immutable 검증
- [x] Critical family95/90/100 추가, source/package/discovery 경계와 실측 bundle 검사
- [ ] Flat-field/nested/groupFields adapters와 명시 sibling order
- [ ] Tidy tree contour 및 radial adapter, slice-dice/squarify 독립 수치 검증
- [ ] Partition 공통 소비와 hierarchy/layout resource create/edit/revise/remove/codec/inspection
- [ ] Tree·treemap rendered primitive 검토 및 public/visual/consumer/types/docs 통합
- [ ] AT-22 및 전체 STEP-077 완료

전체 계획 승인은 [AUTHORIZATION](../../AUTHORIZATION.json)을 재사용한다. Parent가 통계 branch를
통합하는 동안 별도 managed worktree `roadmap9-hierarchy`, branch `codex/roadmap9-hierarchy`를
통계 감사 `61d921d3117e8de51073f64e2b401e229e0f1d6c`에서 만들었다. Main 및 다른 agent worktree는 수정하지 않는다.

## 승인 범위와 기존 owner inventory

[STEP-020](../../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-020-hierarchy-layouts.ko.md)와
[hierarchy 계약](../../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/hierarchy-partition.ko.md)의
method union은 partition/tree/treemap이다. Hierarchy circle packing은 해당 카드의 추가 요구가 아니다.
기존 `packPoints`는 point collision 배치이므로 tree/treemap parser나 layout owner로 재사용하지 않는다.
현재 동등한 hierarchy parser·topology normalizer·layout owner가 없음을 source/current inventory에서 확인했다.

기존 `core/itemIdentity.js`의 typed scalar encoding, `core/ownData.js`의 getter 없는 own-data 검사,
`grammar/numeric.js`의 finite sums, `core/validation.js`의 generated/work 한도를 재사용한다.
`src/layout/`은 Canvas/guide/composition 배치이고 이 데이터 계층 topology의 소유자가 아니다.
공통 pure 계산은 `src/grammar/hierarchy/normalize.js`에 둔다. Tree와 partition이 다른 parser를 만들지 않는다.

## 이번 private 입력과 결과

`normalizeHierarchyNodes(nodes, {valueMode?, forest?, maxNodes?})`는 이미 역할을 지정한
`{key,parentKey,value?,sourceRows?}` 배열만 받는다. Field/nested/group path adapter 및 공개 action 옵션을
아직 만들지 않았다. Private maxNodes 기본10,000을 넘는 명시 예산도 work 한도 내에서 검사하며,
depth10,000 시험은10,001 nodes를 명시한다. 이 수치는 public default 또는 persisted schema 승인이 아니다.

Key는 기존 row identity owner의 typed scalar token으로 정규화한다. Number/string/bigint/boolean/Date는
서로 다른 identity이고 -0/0은 같다. Null·undefined·tuple·object·invalid Date는 node key가 아니다.
Parent null만 root를 뜻하며 orphan을 root로 바꾸지 않는다. Duplicate/self-parent/cycle/orphan은 실패한다.
Input siblings 순서를 보존한 preorder가 결과 순서다. Iterative traversal이 depth를 계산하고 역순으로 totals를 계산한다.

`leaf-sum`은 leaf만 합산하고 authored internal 값은 ignored metadata로 남긴다. `inclusive`는
모든 node의 명시 total을 요구하고 계산한 children total이 parent total을 초과하면 거부한다.
차액은 ownValue/residual이며 가짜 child를 생성하지 않는다. `own-plus-children`은 internal missing ownValue만0이고
leaf missing은 실패다. 세 mode 모두 negative/nonfinite 및 aggregate overflow를 거부한다.

Forest는 명시true일 때만 synthetic root를 사용한다. Key token은 일반 user typed scalar token과 충돌할 수 없는
별도 내부 namespace다. Synthetic node는 sourceRows가 비어 있고 synthetic metadata를 갖는다.
Empty input은 nodes[]/rootKey null, total0은 emptyValue 진단과 기존 zero nodes를 보존한다.
이 private metadata는 공개 selection/export를 아직 지원한다는 뜻이 아니다.

sourceRows는 **해당 node를 도입한 입력 행**의 명시 인덱스이며 생략하면 현재 입력 인덱스다.
각 ancestor에 descendant 행을 반복 복제하지 않는다. 집계 의존성은 parent/children 관계에 남고,
후속 resource lineage·selection은 이 관계와 실제 dataset row identity를 결합해야 한다.
Input/output는 평평한 node table이며 caller arrays/Date를 보존하고 결과는 deep immutable이다.

Node count는 descriptor table 생성 전에 검사한다. Work는 node당48 structural units,
key 문자열 및 encoded token 길이, source-row 참조당3 units를 누적하여 공통10M 한도를 적용한다.
Sparse giant array, oversized key, source-row membership 폭도 bounded error다.

## 검증 증거

`test/oracles/hierarchy.js`는 production import 없는 literal fixture다. Root10/A6(A1=2,A2=4)/B4의
depth·순서·own/total·source rows를 세 mode에서 독립 비교한다. 별도 invariant는 parent 연결,
key uniqueness, residual4, node 보존, source immutability와 work bounds다.

| 명령 | 결과 |
| --- | --- |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/hierarchy/normalize.js test/unit/grammar/hierarchy-normalize.test.js` | 11 passed, exit0; lines/branches/functions100/100/100 |
| Canonical `assertCriticalCoverage`의 해당 owner floor95/90/100 | passed; 기존 floor 완화 없음 |
| `node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js` | 38 passed, exit0 |
| `node scripts/check-hierarchy-fixtures.js` | 세 literal mode expected/actual/diff 및 input/source/oracle SHA256 |
| `npm run package:check` | final staged manifest684entries/1,018,879packed/4,747,892unpacked, exit0 |
| `npm run package:bundle` | staged package 설치와 Full/Basic browser entry build 통과 |

`.artifacts/validation/hierarchy-normalize/`에 coverage/contracts/bundle logs, critical-floor와
numeric-evidence를 보존한다. Tests는 roadmap를 expectation으로 import하지 않는다.
공개 호출·graphic target이 없으므로 renderer pixel/async cleanup은 이 private checkpoint에 적용되지 않는다.
Public integration 때 해당 consumer matrix를 별도로 실행해야 한다.

## 실측 package 경계

새 private source1개 때문에 이전683 entries 한도는 실제 실패했다. 실패 로그를 보존하고 official
staging 최종 실측684entries/1,018,879packed/4,747,892unpacked bytes에 맞춰 cap을
684/1,019,000/4,748,000으로 최소 조정했다. Full510,544·Basic287,705gzip bytes는 기준과 같아
bundle cap은 바꾸지 않았다. Private module은 공개 entry import graph에 연결하지 않았다.
Root의 최신 main 통합 시 이 isolated cap을 그대로 가져가지 않고 combined 결과를 다시 측정한다.

## 후속 공개 통합 의무

이번 결과는 새 action/resource/renderer 지원이 아니다. 다음 private adapter/layout checkpoint 뒤에도
hierarchy/layout resource lifecycle, partition 공유, exact refs/row lineage, edit/source revision,
ref collector/removal, inspection/scene/codec, selection/highlight/hit, nested composition,
SVG/Canvas/PNG/PDF, declarations/package/docs/accessibility 및 primitive review가 남는다.
현재 STEP-020/AT-22 또는 전체 로드맵 완료로 표시하지 않는다.
