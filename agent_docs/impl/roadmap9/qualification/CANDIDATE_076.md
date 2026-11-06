# STEP-076 후보 검증 — 2026-11-06

## 진행 상태

- [x] 후보 commit 고정: `a8af4e5665c17c6769af6118e48a30cd0efc13d3`(docs provenance를 runtime source commit에 고정한 뒤, realistic option inventory 고정값만 고친 시험 commit).
- [x] 깨끗한 별도 checkout에서 9개 canonical 검사를 `scripts/run-check.js` receipt로 실행. 모두 exit 0, 각 검사 전후 working tree 깨끗함.
- [x] 같은 candidate tarball 하나(sha256 `4580ea19…`, `package:check`가 만든 `.artifacts/release/ggaction-0.0.26.tgz`)를 증거에 묶음.
- [x] Native capability 증거와 결과 판정(`scripts/native-capability-completion.js`).
- [ ] 판정 완료(`--require-complete`): 성능 2개 group 실패, 2개 group 대기로 미완료.
- [ ] 버전·CHANGELOG·annotated tag·`release-candidate.js --verify`: G-RELEASE 경계라 별도 승인 전에는 하지 않는다.

## 9개 검사 (후보 `a8af4e566`, 깨끗한 checkout)

| 검사 | 명령 | 결과 |
| --- | --- | --- |
| normal | `npm test` | exit 0 |
| realistic | `npm run test:realistic` | exit 0 (816/816) |
| coverage | `npm run test:coverage` | exit 0 |
| browser | `npm run test:browser` | exit 0 |
| render | `npm run test:render` | exit 0 |
| package | `npm run test:package` | exit 0 (Node22 설치본) |
| platform | `npm run test:platform` | exit 0 |
| package-artifact | `npm run package:check` | exit 0 |
| documentation | `npm run docs:verify` | exit 0 |

Receipt와 log: [checks/](native-076-evidence/checks/). 실행 script: [run-candidate.sh](native-076-evidence/run-candidate.sh). Realistic 데이터는 기존 TidyTuesday 캐시를 `GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT`로 연결했다.

후보를 고정하며 찾아 고친 것:

1. **Docs provenance 고정점.** 생성 문서는 깨끗한 tree에서 "마지막으로 `src`/`types`를 바꾼 commit"을 기록한다. 코드 commit 위에서 문서를 다시 생성해 docs 전용 commit을 만들었다(`0f86f9094`). 그 뒤로는 다시 생성해도 바뀌지 않는다.
2. **Realistic 고정값.** 첫 후보 실행에서 realistic 1건이 실패했다. 공개 option inventory 고정값이 graph plot `maxItems`(`c13d92000`)와 route update handle의 action family(`ccfac9c8f`) 반영 전 값이었다. 이전 verify 묶음에 realistic이 없어 늦게 발견했다. 고정값을 실측으로 고치고(`a8af4e566`) 9개 검사를 처음부터 다시 실행했다.

## Native capability 판정

[결과](native-076-evidence/candidate-results.json), [요약](native-076-evidence/summary.json), [증거 생성 script](native-076-evidence/build-native-evidence.mjs).

| 대상 | 전체 | 통과 | 실패 | 대기 | 해당 없음 |
| --- | --- | --- | --- | --- | --- |
| Acceptance group | 79 | 75 | 2 | 2 | 0 |
| Consumer 칸 | 577 | 553 | 0 | 0 | 24 |
| 9개 검사 qualification | — | 통과 | | | |

- 실패: **AT-56**(data 100k 최장 slice, Geo 100k camera preview), **AT-82**(density 전 크기·force-directed 10k bundling 시간, density 100·force-directed 1k DPR2·10k 취소 100ms). 근거: [DATA_SLICED_PROPOSAL](DATA_SLICED_PROPOSAL.md), [GEO_100K_PROPOSAL](GEO_100K_PROPOSAL.md), [ROUTE_PREPARE_BLOCKING](ROUTE_PREPARE_BLOCKING.md).
- 대기: **AT-60**(독립 검토는 [INDEPENDENT_REVIEW_075](INDEPENDENT_REVIEW_075.md)에 기록했지만 지속 owner 시험·계약이 배정되지 않음), **AT-61**(같은 candidate의 공개 배포 대조는 STEP-077 승인 뒤).
- `--require-complete`: "Native qualification incomplete: 2 pending targets, 2 failed targets; full qualification passed." ([출력](native-076-evidence/require-complete.txt))

### 증거가 주장하는 것

각 proof는 같은 receipt 묶음을 쓰는 대상들을 함께 담는다(9개). Proof마다 다음을 hash로 결박한다.

- input: 대상별 owner 시험·계약 목록, 후보 commit 기준 hash.
- call: 그 시험을 discovery한 suite receipt(label, exit, receipt hash).
- expected / actual: 각 owner 시험이 "exit 0인 suite에서 discovery됨"이라는 선언 조건과 receipt에서 읽은 실제 값. 같을 때만 diff가 passed다.

즉 "선언된 owner 시험이 후보 commit에서 실제로 실행되어 통과했고 선언된 계약이 그 commit의 내용"이라는 것까지만 주장한다. 각 시험의 기대값이 독립 oracle인지는 STEP-075 표본 검토의 몫이다.
