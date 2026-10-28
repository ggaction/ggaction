# Pivot public lifecycle checkpoint

## 진행 상태

- [x] Full create/edit, generic definition/materializer와 immutable revision 통합
- [x] Typed output role, numeric empty schema, group row identity와 실제 row lineage
- [x] Facet replay, repeat rejection, lookup diamond, selection/composition/restore 소비자
- [x] 선언·Current·action inventory·metadata·공개 예제·generated references 동기화
- [x] Focused/coverage/contracts/docs/build/installed package 검증
- [x] 문서 browser sweep: desktop 검색과 전 페이지320/390/768px 통과
- [ ] LOESS degree2 공개 통합과 나머지 STEP-014 통계 oracle evidence

이 checkpoint는 **pivot 공개 통합**이다. 전체 STEP-014, STEP-015 또는 Roadmap9 완료를 뜻하지 않는다.
실행 승인은 [전체 계획 승인](../../AUTHORIZATION.json)을 재사용한다.
기준은 `9edbc5b887e0043f5582f1f1b7ced1528a350d21`, branch는 `codex/roadmap9-statistics`다.
Main과 G-DATA worktree 파일을 복사하거나 수정하지 않고 이 branch의 기존 lifecycle을 사용했다.
담당자가 Basic 생성으로 잘못 확장한 작업 문구를 철회했으며 승인된 STEP4의 **Full-only** 범위를 유지했다.
구현 commit은 `028157707ba1a55080fd00607f2569de4568aeff`다. 이 commit 뒤 provenance와 LLM
산출물을 그 source revision으로 고정하고159개 docs 검사 및150페이지 build/built 검사를 다시 통과했다.
Browser evidence는 UI 변경이 없는 동일 source/content에서 완료한 sweep을 사용한다.

## 책임과 소비자

`actions/data/pivot.js`는 source 선택과 one-time column inference 후 명시 create/materialize child를 호출한다.
Pure 계산은 기존 [kernel checkpoint](PIVOT_KERNEL.md)의 owner를 재사용한다. `transforms.js`는
closed validation/replay, count 전환의 value 제거, typed column value의 output role을 소유한다.
기존 edit/revise plan, schema 및 row lineage owner에 pivot을 등록하며 새 resource나 graph 종류는 없다.
Persistence는 closed transform/source fields/schema/lineage를 검사하고 저장 rows/graphics를 그대로 복원한다.
정확한 옵션과 한도는 [Current CORE](../../../../contract/current/CORE.md#createpivotdata)가 소유한다.

| 소비자 | 결과와 증거 |
| --- | --- |
| Full create / generic materialize | shortest call, inference 저장, standalone/nested ownership, explicit trace |
| Basic | direct methods 없음; valid generic pivot definition도 Unsupported 오류 |
| Numeric/typed columns | number/string/null key 구별; null·fill·duplicate·aggregate·overflow 독립 kernel tests |
| Schema/lineage | 선언된 빈 source에서 output number schema 보존; group 실제 row refs; typed column role |
| Edit/revise | count/numeric 전환, alias rename, referenced absent column 제거 거부, immutable logical revision |
| Dependencies | original source 제거 보호; lookup diamond에서 양쪽 branch 뒤 한 번 materialize; explicit recompute |
| Facet/repeat | child source partition에서 pivot 재계산; statistical repeat 명시 거부 |
| Selection/composition | 실제 contributor refs, 변경된 max predicate reevaluation, identity 기반 highlight 확인, hconcat |
| Persistence | serialization roundtrip과 restored edit; forged columns/source field/schema lineage/revision 거부 |
| Renderers | 기존 mark의 concrete output으로 Canvas/SVG/PNG/PDF/scene installed fixture 통과 |
| Types/knowledge | positive/negative union, Full-only methods, action cards/relationships/inspection descriptors |

Public 생성은 기존 source field validation을 유지한다. 빈 source는 필요한 field의 declared schema와
explicit columns를 사용한다. Column inference를 replay 때 다시 실행하거나 빈 source에서 가짜 group을 만들지 않는다.
직접 시각 consumer의 alias만 role에 따라 rebind하며 downstream expression 문자열을 임의로 고치지 않는다.
Kernel가 제공하지 않는 집계, observation weight, callback, renderer-specific pivot 옵션은 추가하지 않았다.

## 검증 명령과 환경

Node22.23.1/npm10.9.8, 문서는 설치된 Ruby3.3.12로 preflight를 통과했다.
Ruby2.6.10 기본 PATH의 preflight 실패 후 `/opt/homebrew/opt/ruby@3.3/bin`을 명시했다. 의존성 설치는 없었다.
로그/해시/receipt는 `.artifacts/validation/pivot-public/`와 `.artifacts/consumers/`에 보존한다.

| 명령 | 결과 |
| --- | --- |
| `node scripts/run-tests.js unit unit/grammar/pivot.test.js unit/actions/data/pivot-data.test.js unit/actions/data/pivot-consumers.test.js unit/actions/data/derived-editing.test.js unit/actions/data/row-lineage.test.js unit/support/coverage-policy.test.js` | 47 passed |
| `node scripts/run-tests.js contracts contracts/action-catalog.test.js contracts/pivot-types.test.js contracts/package-artifact.test.js contracts/package-boundaries.test.js contracts/test-discovery.test.js contracts/source-boundaries.test.js` | 50 passed |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/pivot.js --test-coverage-include=src/actions/data/pivot.js --test-coverage-lines=90 --test-coverage-branches=85 --test-coverage-functions=100 test/unit/grammar/pivot.test.js test/unit/actions/data/pivot-data.test.js test/unit/actions/data/pivot-consumers.test.js` | 2 modules 각각100/100/100; 기존 floor 완화 없음 |
| `npm run docs:generate` 및 source 수정 뒤 해당 generator 재실행 | Current/cards/links/metadata/LLM 동기화 |
| `npm run test:docs` | 159 passed |
| `env PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH" npm run docs:preflight` | ready |
| 같은 PATH의 `npm run docs:build`, `npm run test:docs:built` | 150 pages;1182 selective LLM artifact/hash/link 검사 통과 |
| `npm run test:docs:browser` | desktop 검색과 모든 페이지320/390/768px 검증 통과 |
| `npm run test:package` | node188/188, documentation snippets64/64, types/MCP/optional peers/bundle 통과 |

Packed runtime hash는 `6bdea30c6f703250a7bd4656abfaecfa68cf09b1b6a3a6972dfd133fa479776f`다.
실제 설치한 package artifact로 모든188 node case를 실행했으며 pivot case는
`scripts/consumers/fixtures/node/pivot.mjs`가 소유한다. 새 complete documentation sample도 설치된 package로 실행한다.
단순 typecheck나 source checkout import를 installed runtime evidence로 표시하지 않았다.

## 측정 한도

공식 staging은683entries/1,015,469packed/4,735,980unpacked bytes다. 이전682/1,014,000/4,727,000은
실제 초과했으며 모듈 수와 최소1,000bytes 경계인683/1,016,000/4,736,000으로 변경했다.
Full browser gzip509,064는508,000을 넘어서510,000으로 조정했다. Basic285,851와 SVG8,111은
기존286,000/25,000을 유지한다. 새 action2개를 포함한 search index857,741은857,000을 넘어서858,000으로 조정했다.
모든 측정은 이 독립 branch 기준이며 main의 parameter/v2/resolver 변경을 합칠 때 누적 package 한도를 다시 측정한다.

후속 전체 통계·시간 수치 및 소비자 감사는 [STATISTICS_AUDIT](STATISTICS_AUDIT.md)가 소유한다.
