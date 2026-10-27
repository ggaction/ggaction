# 테스트 감사 개선 결과

기준 감사: `31ce29f3`. 최종 코드: `7fab0f1b7271fc5bf5bdab9e60870e4a16e0386e`. 브랜치: `fix/documentation-and-rose-demo`.

감사 항목 T01–T32에 대응하는 테스트·runner·CI·문서 변경을 반영했다. production `src/`와 공개 API는 변경하지 않았다. 문제를 숨기는 assertion 완화 대신, 감사에서 통과했던 잘못된 출력이 이제 실패하는지 확인했다. 이 문서는 코드 반영, 로컬 실행, 앞으로 CI에서 쌓아야 할 증거를 구분한다.

## 주요 결과

- 마지막 전체 source coverage 실행: **5,559 passed, 0 failed, 0 skipped**. Lines **95.64%**, branches **93.17%**, functions **98.74%**. 중요 모듈 기준 **171개** 통과.
- 마지막 단독 전체 render 실행: **261 passed**. **205개 variant**의 gallery 생성·검증 통과. 앞선 병행 실행의 산출물 개수 대신 이 단독 실행 결과를 최종 기준으로 사용한다.
- 전체 browser 실행 **163 passed**. 이후 packed browser를 결과별 subtest로 분리한 집중 실행 **120 passed**. Firefox와 WebKit은 각각 **9 passed**. 이 수치들은 겹치므로 합산하지 않는다.
- 설치된 package: Node 계약 **177개**, qualification phase **7개**, 문서 browser 소비자 **57개** 모두 통과. Node·MCP·types·tutorial·bundle 증거를 분리해 보존한다.
- 문서 관련 집중 실행 **80 passed**. 최종 JavaScript block **680개** 중 해시가 일치하는 실행 증거 **57개**, 생성된 reference block **220개**, contextual fragment **403개**.
- realistic 집중 실행: pinned dataset fixture **15 passed**, offline scenario 파일 **4 passed**. 그 안에서 **55개 recipe 각각**의 실제 analytic pixel 기여를 확인했다. 실제 corpus 전체 26개 파일 sweep을 이번 마지막 검증으로 주장하지 않는다.
- 추가 검증: corpus relation/profile 및 baseline 검사 **15 passed**, portable compiler/runner/workflow 검사 **33 passed**, 마지막 cancellation/render-runner 검사 **13 passed**.

마지막 두 cancellation 검사는 전체 coverage 뒤에 추가되어 집중 검증했다. 전체 coverage의 정확한 입력 상태는 `coverage-receipt.json`의 commit·dirty diff digest·untracked file hash와 파일 목록에 남아 있다. 모든 위 수치를 하나의 최신 HEAD 전체 CI 실행으로 표현하지 않는다.

## 원래 반례를 다시 실행한 결과

| 음성 대조군 | 변경 전 감사 | 변경 후 |
|---|---|---|
| continuous-area-color의 완전 투명 PNG | 공유 검사를 통과 | blank assertion에서 실패 |
| bootstrap-mean-ci의 완전 투명 PNG | 공유 검사를 통과 | blank assertion에서 실패 |
| 미소 회귀 slope를 0으로 변경 | 전용 12개 검사 모두 통과 | 계수 assertion에서 정확히 1개 실패, 다른 11개 통과 |
| 잘못된 CSS 색 | 검은색으로 조용히 처리 | 명시적 TypeError |
| timeout을 무시하는 child/descendant | 종료 경계 부족 | timeout 124, tree 정리 및 receipt |
| SIGINT / SIGTERM | 제어 증거 부족 | 130 / 143 및 실제 child 정리 확인 |
| 잘못된 snippet URL/selector 또는 render 누락 | mock/자동 render가 가릴 수 있음 | 전용 음성 대조군 실패 |
| mark만 완전히 투명하거나 화면 밖 | guides가 보이는 smoke를 통과할 수 있음 | mark 제거 전후 pixel 차이 없음으로 실패 |

음성 대조군 로그의 실패는 의도한 결함 검출이다. production 파일을 수정하지 않고 loader 또는 격리 fixture로 주입했다.

## 항목별 반영

| 항목 | 상태 | 변경 및 검증 | 주 소유 파일 |
|---|---|---|---|
| T01 | 수정·음성 대조군 확인 | alpha=0을 foreground로 세지 않도록 공유 PNG 판정을 수정. continuous-area-color·bootstrap-mean-ci에 투명 renderer를 재주입해 두 검사 모두 실패하는 것을 확인. | [png.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/png.js) |
| T02 | 수정·검증 | 문서 파일과 snippet ID로 고유 build input 생성. 등록·준비·Node 실행·packed browser 실행의 ID와 코드 해시를 연결. 현재 57개가 서로 다른 입력으로 실행됨. | [tutorial-consumer.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/tutorial-consumer.js) |
| T03 | 수정·검증 | tick 반복의 상한과 진행 조건을 추가하고 표현 불가능한 정밀도를 명시적으로 거부. 반대 부호의 극단값 interpolation·quantile 계산을 안전하게 수정. | [numeric.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/numeric.js) |
| T04 | 수정·변이 검출 | 극소 회귀 계수를 1e-300으로 정규화해 검사. 기존 slope-zero loader는 이제 해당 assertion에서 실패하고 나머지 11개는 통과. | [regression-statistics.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/actions/data/regression-statistics.test.js) |
| T05 | 수정·검증 | 필수 geometry와 optional numeric style의 타입까지 검사. null/string/boolean/array/object와 잘못된 children/items를 거부. | [graphic-integrity.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/graphic-integrity.js) |
| T06 | 수정·검증 | 실제 XML 파싱, scalar 수치, path command, transform, viewBox, points, dash 문법 및 resource 참조 검사. 공개 차트 SVG 전체에도 적용. | [svg-integrity.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/svg-integrity.js) |
| T07 | 수정·검증 범위 명시 | 공개 browser Canvas의 실제 픽셀 검사. offline recipe 55개 각각에 mark 제거 전후의 differential raster 검사 추가. 투명·화면 밖 mark는 축이 보여도 실패. 모든 realistic 조합을 raster화했다는 주장은 하지 않음. | [analytic-pixels.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/analytic-pixels.js) |
| T08 | 수정·검증 | page/context/browser teardown 전에 원래 오류와 screenshot을 저장. 중복 캡처를 억제하고 packed browser subtest의 assertion도 보존. 실제 실패→context.close 순서로 확인. | [browser.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/browser.js) |
| T09 | 수정·검증 | compat 명령에 facet-content-headers를 포함. Firefox·WebKit에서 DPR 1·2 검사 포함 각 9개 통과. | [package.json](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/package.json) |
| T10 | 수정·검증 | coverage 표와 source 파일 목록을 대조해 로드되지 않은 파일의 누락도 실패 처리. MCP CLI는 설치된 stdio consumer가 소유한다는 이유와 함께 명시적 예외. | [coverage-policy.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js) |
| T11 | 수정·검증 | core, selectors, 전체 renderer, MCP, inspection, scene의 자동 floor를 확대. 최종 171개 floor 통과. 기존보다 강한 파일별 기준은 유지. | [coverage-policy.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js) |
| T12 | 수정·검증 | YAML 구조에서 주요 qualification job과 실제 run 명령을 검사. source/coverage/package/docs/realistic/platform/browser 명령별 echo·if:false·continue-on-error 변이를 거부. | [release-workflow.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/release-workflow.test.js) |
| T13 | 수정 | 기본 suite의 npm ci와 Chromium 설치 전제를 명시. realistic corpus 사전 다운로드와 실행 자원 조건도 분리해 안내. | [README.md](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/README.md) |
| T14 | 수정·원격 환경 검증 대기 | 경로 비교를 slash 정규화하고 compiler를 Node로 실행. macOS/Windows CI에 compiler·sharding 집중 검사 추가. 실제 Windows 실행 결과는 이번 로컬 증거에 포함하지 않음. | [typescript.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/typescript.js) |
| T15 | 수정·기준 실행 확인 | qualification peer를 lockfile의 정확한 버전으로 고정하고 실제 해결 버전을 기록. latest 호환 peer 검증을 별도 CI job으로 추가. 로컬 locked native 및 packed consumer 통과. | [optional-peers.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/consumers/optional-peers.js) |
| T16 | 수정·검증 | 원본 coverage, 파일별 metrics JSON, commit/dirty diff/untracked hash 영수증 보존. 성공·실패 모두 CI artifact 업로드. | [run-tests.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js) |
| T17 | 수정·종료 제어 확인 | canonical suite와 render/gallery 단계에 deadline 적용. Unix process group/Windows taskkill tree 종료, SIGINT·SIGTERM 전달, timeout 영수증 추가. 로컬 timeout·손자 프로세스·두 취소 신호 검증. | [run-check.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-check.js) |
| T18 | 수정·실패 주입 확인 | consumer 준비 도중 실패해도 임시 디렉터리 제거. 존재하지 않는 로컬 tarball 설치 실패를 주입해 임시 root가 빈 상태로 회수됨을 확인. | [package-consumer.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js) |
| T19 | 수정·실행 범위 수치화 | 등록과 실제 실행을 분리하고 최신 코드 해시가 일치하는 passing receipt만 실행 증거로 인정. README 2개 예외를 실제 실행으로 승격. 403개 contextual fragment를 실행했다고 계산하지 않음. | [doc-snippet-coverage.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippet-coverage.js) |
| T20 | 수정·검증 | 긴 fence, 최대 3칸 indentation, info-string 속성, tilde 및 closing 길이를 처리. 공개 JS fenced block과 선언 파일 typecheck의 범위를 구분. | [doc-snippets.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippets.js) |
| T21 | 수정·검증 | environment/mode/rendering/result 바인딩 계약을 검증. 잘못된 selector·URL·render 누락 거부. renders-canvas에서는 harness가 대신 그리지 않으며 README에는 3개 mark 기대값도 추가. | [docs-runtime.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/docs-runtime.js) |
| T22 | 수정·검증 | 정확한 한국어·과거 계획 문구에 대한 assertion 제거. current action 상태와 실제 runtime 메서드, current literal vocabulary와 배포 선언을 비교. anchor/navigation 검사 유지. | [action-value-vocabulary.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/action-value-vocabulary.test.js) |
| T23 | 수정·검사 범위 명시 | Acorn AST로 직접 semantic lookup과 clone 호출 검사. 주석·문자열은 무시하고 optional chaining·bracket property를 인식. 동적 별칭을 추적하는 범용 정적 분석기로 확대하지 않음. | [source-boundaries.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/source-boundaries.test.js) |
| T24 | 수정·독립 실패 확인 | packed Node 코드를 8개 계약 모듈·177개 case로 분리하고 MCP/types/optional peers를 별도 runner로 이동. 7개 qualification phase가 독립 결과를 보존. browser HTML와 literal 기대값 분리, 결과별 subtest 120개 통과. | [manifest.json](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/consumers/fixtures/node/manifest.json) |
| T25 | 수정·검증 | 62개 타입 compiler 호출을 공통 실행기로 이관. 기존 positive/negative fixture와 flags 유지, timeout·version·diagnostics 기록. phase2/phase5 파일을 data-completion/focused-scale-editor로 개명하고 참조 갱신. | [typescript.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/typescript.js) |
| T26 | 수정·음성 대조군 확인 | 서로 다른 두 fillStyle sentinel로 invalid CSS가 무시되는 경우를 검출. 검은색·투명색 등 정상 색은 허용. not-a-css-color를 다시 주입해 거부 확인. | [png.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/png.js) |
| T27 | 수정·검증 | 고정 seed 자동차 데이터에서 rename/scale/missing 관계와 입력 불변성 검사. rename collision·overflow를 명시적으로 거부. seed와 원본·변이 입력을 artifact에 보존. | [corpus-mutation-relations.test.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/corpus-mutation-relations.test.js) |
| T28 | 수정·검증 | 실제 sample과 synthetic overlay를 구분. 32/512/4096행, 4/32/256 category의 point consumer와 missing/duplicate/signed-zero/constant/large-magnitude aggregate postcondition 기록. | [profile.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/datasets/profile.js) |
| T29 | 수정·검증 | 87개 primitive baseline의 transitive production import와 독립 oracle import를 생성·검증. API 동등성 및 같은 실행의 pixels를 독립적인 기하 정답으로 과장하지 않도록 설명. | [baseline-evidence.json](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/charts/baseline-evidence.json) |
| T30 | 수정·검증 | 비어 있거나 NaN/범위 밖인 coverage metric, 중복 파일 row를 거부. malformed 표가 threshold를 통과하지 못함. | [coverage-policy.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js) |
| T31 | 수정·검증 | selector 단락 평가 전에 모든 capability 이름을 검증. 앞선 selector가 전 파일에 일치해도 뒤의 잘못된 이름을 거부. | [run-tests.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js) |
| T32 | 수정·CI 표본 축적 대기 | 파일별 elapsed time/max RSS/status/environment를 수집하고 환경별 median/p95/failure rate 계산. 과거 round-robin 우월성 대신 완전 분할·결정성·부하 상한을 검사. 기존 Ubuntu weight를 로컬 측정으로 덮어쓰지 않음. | [test-file-metrics.js](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-file-metrics.js) |

## 실행과 유지보수

- 기존 실행 명령을 유지한다: `npm test`, `npm run test:coverage`, `npm run test:browser`, `npm run test:render`, `npm run test:package`.
- 기본 개발 준비: `npm ci`와 `npx playwright install chromium`. realistic 검사에는 `npm run datasets:sync`가 필요하다. focused realistic도 `node scripts/run-tests.js realistic ...`로 실행한다.
- `GGACTION_CHECK_TIMEOUT_MS`로 로컬 deadline을 지정할 수 있다. CI job의 추가 상한은 120분이다. signal·timeout·startup 오류와 제한된 log를 `.artifacts/checks/`에 보존한다.
- `node scripts/doc-snippet-coverage.js`는 현재 코드 해시와 통과 영수증을 비교한다. 예외의 해시 고정과 실제 실행을 같은 지표로 합치지 않는다.
- `node scripts/baseline-evidence.js`로 baseline dependency 목록을 재생성한다. normal contract suite가 freshness를 확인한다.
- `node scripts/summarize-test-timings.js <directory> ...`로 다운로드한 timing 기록을 환경별로 집계한다. 실패한 표본은 실패율에 포함하고 성공 시간의 median/p95에서는 제외한다.
- parser 도구는 dev dependency로 lockfile에 고정했다: XML parser, Acorn, YAML. 이 메타데이터가 package.json에 포함되므로 package unpacked-size 상한을 4,255,000에서 4,256,000 bytes로 1 KB 조정했다. source coverage 기준은 낮추지 않았다.

## 증거 범위와 남은 환경 확인

1. **실제 Windows 실행과 새 CI matrix 결과는 로컬에서 확인하지 않았다.** Windows의 compiler/path 계약을 CI에 추가했고 로컬 macOS에서 동일 명령을 통과했다. native Canvas 고정 버전 소비자도 macOS에서 확인했다.
2. **새 Ubuntu timing baseline은 아직 만들지 않았다.** 수집·업로드·집계 기능은 구현하고 로컬에서 검증했다. 같은 CI 환경의 반복 표본이 쌓이면 scheduling weight를 갱신할 수 있다. 로컬 시간과 기존 Ubuntu 시간을 섞지 않는다.
3. **403개 contextual fragment는 독립 실행 예제가 아니다.** 준비 상태가 필요한 fragment와 생성된 참고 block을 계속 구별한다. 이들을 실행 커버리지로 보고하지 않는다. 브라우저 동작과 선언 파일 typecheck도 별도 증거다.
4. **raster 검사는 대표성에 맞춰 제한한다.** 55개 offline recipe와 공개 browser 예제, chart render suite를 검사했지만 모든 realistic 조합을 렌더링하거나 모든 입력 크기의 성능을 보장하지 않는다.
5. 구조 검사는 직접 구문·정적 import를 대상으로 한다. 동적 alias나 reflection을 완전히 추적하는 분석기로 설명하지 않는다. baseline의 공유 생산 코드 의존성도 공개한다.

## 보존한 자료

- [기계 판독 가능한 항목·증거 해시](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/implementation-results.json)
- [최종 coverage 요약](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/coverage.log), [전체 표](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/coverage-full.log), [파일별 수치](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/coverage-metrics.json), [입력 상태](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/coverage-receipt.json)
- [최종 render 결과](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/render.log), [browser 결과](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/browser-full.log), [분리한 packed browser](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/browser-consumer.log)
- [설치된 Node case 177개](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/node-consumers.json), [qualification phase](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/package-qualification.json), [문서 browser 57개](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/browser-snippets.json)
- [문서 실행 coverage](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/snippet-coverage.json), [원본·변이 데이터](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/corpus-mutations.json), [크기·병리 사례](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/corpus-size-pathologies.json)
- [투명 PNG 변이 재검증](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/blank-negative-control.log), [tiny slope 변이 재검증](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/implementation/tiny-slope-negative-control.log)

각 로그는 해당 실행 당시의 증거이며 수치는 서로 중첩된다. 이 기록은 배포·패키지 발행 결과를 의미하지 않는다.
