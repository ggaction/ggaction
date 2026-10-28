# Private pivot kernel checkpoint

## 진행 상태

- [x] STEP-014 설계의 pure pivot normalization·계산 준비
- [x] 독립 literal, typed grouping, null/duplicate/overflow/work/immutability 시험
- [x] focused·critical coverage·discovery/source boundary 검사
- [x] 공식 staged package 및 Full/Basic bundle 실측과 최소 한도 조정
- [ ] 공개 action·타입·current contract·revision/lineage/codec 연결
- [ ] STEP-014 전체 integration evidence와 종료

이 checkpoint는 공개 기능 구현 완료가 아니다. 원본 STEP-014의 공개 통합은 선행 STEP-013 이후에
계속한다. 현재 main의 검증을 유지하면서 독립 worktree에서 pure kernel만 준비했다.
실행 승인은 [전체 계획 승인](../../AUTHORIZATION.json)을 재사용한다.

기준 commit은 `8685719f`이며 branch는 `codex/roadmap9-statistics`다. main은 수정하지 않았다.
설계는 main의 `phase3/STEP4.md`를 읽었으며 snapshot을 작업 로그 옆에 보존했다.
기존 수치 defaults와 public exports는 바꾸지 않았다. Stable product tests는 roadmap 파일을 import하지 않는다.

## 내부 경계

`normalizePivotTransform(options, rows?)`는 닫힌 옵션과 명시/추론 columns를 clone/freeze한다.
`validatePivotTransform(transform)`은 resolved `type/field/groupBy/columns/op/fill/value` 정규형을 검증한다.
`derivePivotRows(rows, transform)`은 immutable wide rows를 반환한다. Public action, resource lookup,
trace 또는 graphic generation은 하지 않는다.

Columns는 1..64개며 output rows는 최대10,000개다. Input validation·grouping·aggregate scans는
`rows * (groupBy.length + 5)`, output work는 `groups * (groupBy.length + columns.length)`로
보수적으로 제한한다. 두 작업의 합이10,000,000을 넘기기 전에 새 group을 거부한다.
대형/sparse input array는 descriptor table 생성 전에 length work preflight를 거친다.
입력5,025,000work만으로는 허용되지만 group output 누적으로10M을 넘는 실제 wide fixture도 검증했다.

Plain own-data 경계를 통과한 scalar만 읽으며 getter를 실행하지 않는다. Typed keys, source-order groups,
안전한 `__proto__` output, all-null과 absent cell 구별, aggregation 없는 duplicate 거부,
stable finite sum/mean과 overflow 거부를 독립 literal로 확인한다. Proxy trap sandbox는 제공하지 않는다.
Group keys와 columns는 JSON-safe typed identity이며 문자열로 자동 변환하지 않는다.

## 실행 증거

환경은 Node22.23.1/npm10.9.8이다. `.artifacts/validation/pivot-kernel/`에 raw log와 input hash manifest를 보존한다.

| 명령 | 결과 |
| --- | --- |
| `node scripts/run-tests.js unit unit/grammar/pivot.test.js unit/support/coverage-policy.test.js` | 18 passed: pivot11 + coverage-policy7 |
| `node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js` | 25 passed |
| `node scripts/run-tests.js contracts contracts/package-artifact.test.js contracts/package-boundaries.test.js` | 13 passed |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/pivot.js --test-coverage-lines=90 --test-coverage-branches=85 --test-coverage-functions=100 test/unit/grammar/pivot.test.js` | 11 passed; module lines100%, branches100%, functions100% |
| `npm run package:check` | 679entries, packed1,011,694, unpacked4,719,770bytes |
| `npm run package:bundle` | Full507,597 / Basic285,702 gzip bytes; 기존 한도 통과 |

`pivot-grammar` family의 critical floor는90/85/100이며 기존 어떤 floor도 낮추지 않았다.
패키지의 이전 cap 실패와 변경값은 architecture record에 보존했다. 이 private checkpoint는 전체 repository
coverage·realistic corpus·렌더러·공개 API integration의 통과 증거로 사용하지 않는다.
