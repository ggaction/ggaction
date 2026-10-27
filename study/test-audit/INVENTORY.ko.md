# ggaction 테스트 구조와 파일 인벤토리

기준 commit: `31ce29f31e5ae87c57759a5b3e002db1f29a4808`. 파일 목록은 `test/` 전체를 열거했고, 실행 대상은 실제 `collectTestFiles` 결과를 사용했다. lexical test/assertion 수는 코드 문자열 검색 통계이며 runtime case 수가 아니다.

## 물리적 디렉터리 구조

| 영역 | 전체 파일 | JS 파일 | JS 줄 수 | 역할 |
|---|---:|---:|---:|---|
| unit | 549 | 549 | 86,912 | actions·grammar·layout·state·renderer·helper의 focused 계약 |
| contracts | 206 | 205 | 38,587 | public API/types·architecture·package·generated/realistic 통합 |
| charts | 587 | 581 | 52,851 | 공개 프로그램·primitive·manifest·semantic/graphic/pixel 비교 |
| browser | 31 | 30 | 2,677 | 실제 browser 예제·package·backend compatibility |
| docs | 14 | 14 | 2,702 | 문서 동기화·exact code·검색/내비게이션·README |
| support | 61 | 61 | 32,046 | shared harness·data·scenario engine·artifacts |
| oracles | 37 | 37 | 3,550 | 독립 기대값과 무결성 검사 |
| fixtures | 3 | 1 | 723 | 공통 fixture |

나머지 4개는 test 루트의 AGENTS.md, README.md, capabilities.json, realistic-timings.json이다. 전체 1,492개 중 JS는 1,478개이며 총 220,048줄이다.

## 실행 집합

| selector | 진입 파일 | 비고 |
|---|---:|---|
| all | 957 | unit+contracts+charts+gates+docs; 다른 세 집합 제외 |
| unit | 548 | 공유 helper 테스트 일부는 Chromium 필요 |
| contracts | 179 | realistic으로 분류된 26개 제외 |
| charts | 216 | normal .test.js |
| gates | 0 | 현재 활성 gate 없음 |
| docs | 14 | 검색 등 실제 Chromium 케이스도 포함 |
| realistic | 26 | 명시적 capability + heap512MB/concurrency2 |
| render | 104 | expensive .render.js; 별도 runner/gallery |
| browser | 30 | browser .browser.js; 동적 case 포함 |

이 네 실행 집합 all/realistic/render/browser의 합은 1,117개 진입 JS 파일이다. 나머지 361개 JS는 helper·fixture·manifest·primitive 등이며 reachability 검사가 별도로 존재한다. 물리 디렉터리 통계와 실행 suite 분류는 같지 않다.

## 크게 성장한 모듈

| 파일 | 줄 수 | 검토 포인트 |
|---|---:|---|
| [test/support/scenarios/realistic-direct-lifecycle-coverage-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-direct-lifecycle-coverage-recipes.js) | 3,161 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-guide-scale-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-guide-scale-recipes.js) | 3,026 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/engine.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/engine.js) | 2,838 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/lifecycle-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/lifecycle-recipes.js) | 2,404 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/contracts/realistic-direct-lifecycle-coverage-recipes.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/realistic-direct-lifecycle-coverage-recipes.test.js) | 2,307 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-statistical-facade-coverage-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-statistical-facade-coverage-recipes.js) | 2,034 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-hierarchical-facade-matrix.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-hierarchical-facade-matrix.js) | 2,012 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/contracts/realistic-scenario-runner.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/realistic-scenario-runner.test.js) | 1,961 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-data-mark-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-data-mark-recipes.js) | 1,959 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-data.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-data.js) | 1,624 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-recipes.js) | 1,533 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-cartesian-facade-coverage-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-cartesian-facade-coverage-recipes.js) | 1,496 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/coverage-ledger.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/coverage-ledger.js) | 1,284 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/support/scenarios/realistic-encoding-coverage-recipes.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-encoding-coverage-recipes.js) | 1,271 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |
| [test/contracts/realistic-guide-scale-recipes.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/realistic-guide-scale-recipes.test.js) | 1,205 | capability/실행 수명주기 경계로 검토. 줄 수만으로 분리하지 않음 |

추가로 test 밖의 [scripts/package-consumer.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js)는 5,834줄이며 실제 package 검증을 수행한다. test 디렉터리의 크기만으로 테스트 유지보수 비용을 평가하면 이 비용이 빠진다.

## 전체 파일 자료

- [파일별 TSV](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/file-inventory.tsv): 파일 경로·bytes·줄 수·lexical test/assertion 호출 수.
- [전체 inventory JSON](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/inventory.json): 디렉터리 집계·largest modules·파일별 세부 통계.
- [실행 환경과 suite 수](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/environment.json): Node·platform·실제 설치 dependency 버전.
- [문서 snippet 분포](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-coverage-summary.json): 파일별 실행 등록/생성/예외 수.
- [source floor 범위](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-source-policy.json): source 595개와 floor 137개의 정책 범위.
- [realistic shard 계획](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-sharding.json): 현재 weight에 따른 배치. 새 wall time 측정이 아님.

## 검토 깊이와 남은 확인

전체 목록·실행 분류·대형 파일·공통 패턴을 정적으로 조사하고, shared harness와 고위험 수치/geometry/package/CI 경계를 상세히 검토했다. 모든 파일의 모든 assertion을 각각 변이 검사한 것은 아니다. raw corpus 전체 재실행·모든 engine/platform 실행·원격 branch protection은 이번 감사의 새 실행 증거에 포함하지 않는다. 상세 항목은 이를 구분해 기술한다.
