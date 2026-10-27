# ggaction 테스트 상세 감사

기준 commit은 `31ce29f31e5ae87c57759a5b3e002db1f29a4808`이다. P1/P2/P3는 **테스트 신뢰성 개선 우선순위**이며 production 결함의 심각도가 아니다. 재현된 검사 결함, 정적 원인이 확인된 문제, 추가 개선 제안을 구분했다. 변형 실험은 저장소 밖의 fixture·loader·복사본에서 실행했다.

| ID | 우선순위 | 증거 수준 | 항목 |
|---|---|---|---|
| [T01](#t01) | P1 | 재현 | 투명한 빈 PNG가 공유 렌더 검사를 통과한다 |
| [T02](#t02) | P1 | 재현 | 등록된 문서 예제 55개 중 5개가 브라우저 준비 과정에서 덮어써진다 |
| [T03](#t03) | P2 | 재현 | 독립 numeric oracle이 유효한 유한 입력에서 멈추거나 오답을 낸다 |
| [T04](#t04) | P2 | 재현 | 미소 회귀 기울기를 0으로 바꿔도 전용 테스트가 통과한다 |
| [T05](#t05) | P2 | 재현 | graphic integrity가 잘못된 좌표 타입을 허용한다 |
| [T06](#t06) | P2 | 재현 | SVG integrity가 잘못된 XML과 수치 문자열을 허용한다 |
| [T07](#t07) | P2 | 재현 및 개선 | 공개 브라우저 smoke와 corpus geometry만으로 실제 가시성을 보장하지 못한다 |
| [T08](#t08) | P2 | 재현 | 실패 직후 page를 먼저 닫아 screenshot과 원래 오류가 유실된다 |
| [T09](#t09) | P2 | 정적 확인 | 작성된 engine-aware facet 회귀 테스트가 Firefox/WebKit 목록에서 빠진다 |
| [T10](#t10) | P2 | 재현된 방어 공백 | coverage 분모가 로드되지 않은 source 파일을 자동 포함하지 않는다 |
| [T11](#t11) | P2 | 정적 확인 | critical floor의 자동 적용 범위가 고위험 경계 전체를 덮지 않는다 |
| [T12](#t12) | P2 | 재현된 방어 공백 | release 필수 테스트 step을 꺼도 workflow 계약 테스트가 통과한다 |
| [T13](#t13) | P2 | 재현 | 기본/unit suite의 Chromium 전제가 실행 안내와 어긋난다 |
| [T14](#t14) | P2 | 정적 확인 및 경로 재현 | Windows의 기본 test-side 경로와 compiler 호출이 일관되지 않다 |
| [T15](#t15) | P2 | 정적 확인 | 패키지 qualification의 native dependency 기준이 실행마다 변할 수 있다 |
| [T16](#t16) | P2 | 실행 관찰 및 정적 확인 | coverage 성공과 critical-only 실패에서 상세 결과가 보존되지 않는다 |
| [T17](#t17) | P2 | 개선 제안 | 일반 runner의 timeout과 취소·하위 프로세스 정리 경계가 없다 |
| [T18](#t18) | P2 | 정적 확인 | package consumer 준비 실패가 임시 디렉터리를 회수하지 못한다 |
| [T19](#t19) | P2 | 정적 확인 | 문서 snippet의 등록·해시와 실행 증거 연결은 서로 다른 수준이다 |
| [T20](#t20) | P2 | 재현된 방어 공백 | 문서 코드 블록 parser가 fence 형태에 따라 검사를 빠뜨린다 |
| [T21](#t21) | P2 | 정적 확인 | 문서 실행 계약이 환경과 의도한 결과를 충분히 구분하지 않는다 |
| [T22](#t22) | P2 | 정적 확인 | 현재 계약 검사가 문구와 과거 계획 텍스트에 묶여 있다 |
| [T23](#t23) | P2 | 재현된 방어 공백 | architecture regex는 동등한 구문을 놓치고 주석을 위반으로 본다 |
| [T24](#t24) | P2 | 정적 확인 | packed consumer가 큰 생성 문자열과 단일 결과에 묶여 있다 |
| [T25](#t25) | P3 | 개선 제안 | 타입 검사의 반복 harness와 역사적 파일명이 유지보수 비용을 높인다 |
| [T26](#t26) | P3 | 재현 | 기대 CSS 색상의 오타가 검은색으로 바뀐다 |
| [T27](#t27) | P3 | 개선 제안 | 기존 corpus 변이 helper를 의미 관계 검증에 더 활용할 수 있다 |
| [T28](#t28) | P3 | 개선 제안 | 현실 데이터·까다로운 입력·크기 스트레스를 별도 지표로 관리해야 한다 |
| [T29](#t29) | P3 | 개선 제안 | primitive baseline이 무엇을 독립적으로 증명하는지 표시할 필요가 있다 |
| [T30](#t30) | P3 | 재현된 방어 공백 | coverage parser가 비어 있는 metric을 NaN으로 통과시킨다 |
| [T31](#t31) | P3 | 재현 | 잘못된 capability selector가 앞선 selector에 가려진다 |
| [T32](#t32) | P3 | 개선 제안 | shard 계획을 과거 혼합 측정과 파일 단위가 제한한다 |

<a id="t01"></a>
## T01 투명한 빈 PNG가 공유 렌더 검사를 통과한다

**P1 · 재현**

흰 배경과 RGBA가 다르기만 하면 ink로 세므로 완전히 투명한 PNG가 화면 전체의 ink로 집계된다. 실제 continuous-area-color와 bootstrap-mean-ci variant에 투명 renderer를 주입했더니 공유 크기·ink·영역·primitive/public hash 검사가 모두 통과했다. 640×440 이미지의 inkPixels가 281,600으로 보고됐다. exponential regression의 RGB-only smoke도 빈 투명 Canvas에 통과한다.

근거: [test/support/png.js:62](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/png.js:62), [test/support/png.js:120](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/png.js:120), [test/support/visual-variants.js:437](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/visual-variants.js:437), [test/unit/actions/data/exponential-regression.test.js:86](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/actions/data/exponential-regression.test.js:86).

**해석 범위.** 전체 suite가 이 renderer 변이를 통과했다는 뜻은 아니다. 색상 조건, 별도 renderer 단위 검사, 같은 파일의 정밀 픽셀 비교가 보완한다. 문제는 해당 검사의 음성 대조군을 거부하지 못한다는 점이다.

**개선.** 배경 존재, alpha를 고려한 foreground, 영역별 콘텐츠를 분리한다. 공유 predicate를 검증하고 개별 RGB-only 구현을 없앤다.

**완료 기준.** 투명한 빈 출력·배경만 있는 출력은 위 두 실제 variant에서 실패한다. 의도한 투명 배경의 정상 차트는 통과한다.

실험 기록: [browser-png-blank-results.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-png-blank-results.json), [browser-png-blank-probe.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-png-blank-probe.mjs), [semantics-oracle-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-oracle-probes.json).

<a id="t02"></a>
## T02 등록된 문서 예제 55개 중 5개가 브라우저 준비 과정에서 덮어써진다

**P1 · 재현**

브라우저 소비자 경로가 snippet ID 없이 문서 파일명으로 만들어진다. line-chart의 2개, line-area의 5개 코드 블록이 각각 한 main.js에 덮어써진다. 실제 준비 결과는 소비자 방문 55회, 고유 build input 50개이며 앞선 5개 코드는 사라진다.

근거: [scripts/tutorial-consumer.js:37](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/tutorial-consumer.js:37), [scripts/tutorial-consumer.js:48](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/tutorial-consumer.js:48), [test/docs/executable-programs.test.js:28](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/executable-programs.test.js:28).

**해석 범위.** Node exact-code runner는 ID를 파일명에 포함해 55개를 실행한다. 누락은 packed browser 소비자 증거에 한정된다. 직전 문서 개선에서 추가한 케이스도 같은 기준으로 감사했다.

**개선.** registry·출력 경로·테스트 이름·실행 영수증이 동일한 안정적 snippet ID를 사용하게 한다. 준비 파일과 실행 케이스의 일대일 대응을 검사한다.

**완료 기준.** 55개 고유 코드가 55개 고유 입력과 결과로 남는다. 같은 문서에 두 예제가 있는 회귀 fixture에서 어느 한쪽 오류도 검출한다.

실험 기록: [docs-consumer-collision-result.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-consumer-collision-result.json), [docs-consumer-collision-probe.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-consumer-collision-probe.mjs).

<a id="t03"></a>
## T03 독립 numeric oracle이 유효한 유한 입력에서 멈추거나 오답을 낸다

**P2 · 재현**

numericTicks([1e16,1e16+4],5)는 덧셈이 진행하지 않아 루프를 끝내지 못했다. 1초 timeout의 격리 child로 종료했다. mapLinear(0,[-MAX,MAX],[0,100])는 50 대신 0, quantile([-MAX,MAX],0.5)는 0 대신 Infinity를 반환한다.

근거: [test/oracles/numeric.js:33](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/numeric.js:33), [test/unit/oracles/numeric.test.js:12](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/oracles/numeric.test.js:12).

**해석 범위.** production 수치 구현의 결함이라는 주장이 아니다. 기존 대표 fixture는 보통 범위이며 production에는 별도의 극한값 검사도 있다. 문제는 앞으로 경계 테스트의 기대값으로 사용할 oracle 자체다.

**개선.** oracle의 지원 입력 범위·진행 조건·최대 반복을 명시하고 overflow에 안전한 독립 계산과 literal 극한값을 추가한다.

**완료 기준.** 세 반례가 올바른 유한 결과 또는 명시적 지원 범위 오류로 종료한다. 인접 부동소수점 값·상수·역방향 domain도 무한 할당을 일으키지 않는다.

실험 기록: [semantics-numeric-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-numeric-probes.json), [semantics-numeric-probes.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-numeric-probes.mjs).

<a id="t04"></a>
## T04 미소 회귀 기울기를 0으로 바꿔도 전용 테스트가 통과한다

**P2 · 재현**

극소 범위 fixture는 계수의 유한성·R²·기존 prediction 보존을 검사하지만 계수 자체의 정답을 검사하지 않는다. 외부 loader로 1e-300 규모 slope만 0으로 바꾼 결과 전용 모듈 12개 테스트가 모두 통과했다. 일반 close helper의 절대 허용오차도 이 차이를 구분하지 못한다.

근거: [test/unit/actions/data/regression-statistics.test.js:154](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/actions/data/regression-statistics.test.js:154), [test/unit/actions/data/regression-statistics.test.js:19](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/actions/data/regression-statistics.test.js:19).

**해석 범위.** 이 변이를 전체 suite에 실행한 결과나 production에서 실제 0을 반환한다는 주장은 아니다. 정상 slope는 약 1.0000000000000002e-300이었다.

**개선.** 규모로 나눈 계수·부호·필수 nonzero 조건을 확인하고, 절대/상대/ULP 오차를 계약별로 선택한다. 작은 선별 mutation 집합을 운영한다.

**완료 기준.** 같은 slope-zero 변이를 정확한 계수 assertion이 검출한다. 실제 zero-slope·상수 반응·큰 범위 fixture는 계속 통과한다.

실험 기록: [semantics-tiny-slope-baseline.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-tiny-slope-baseline.json), [semantics-tiny-slope-mutant.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-tiny-slope-mutant.json), [semantics-tiny-slope-mutant.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-tiny-slope-mutant.log), [semantics-tiny-slope-loader.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-tiny-slope-loader.mjs).

<a id="t05"></a>
## T05 graphic integrity가 잘못된 좌표 타입을 허용한다

**P2 · 재현**

필수 좌표는 undefined만 확인하고, 수치 검사는 이미 number인 값에만 적용한다. circle의 x를 null, 문자열, false, 객체, 배열로 각각 바꿔도 issues가 빈 배열이었다.

근거: [test/oracles/graphic-integrity.js:24](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/graphic-integrity.js:24), [test/oracles/graphic-integrity.js:77](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/graphic-integrity.js:77), [test/support/scenarios/engine.js:2759](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/engine.js:2759).

**해석 범위.** analytic-layer 검사가 일부 item을 추가 검증하지만 모든 guide와 graphic 속성을 대체하지 않는다. 현재 production이 이런 값을 생성한다는 증거는 아니다.

**개선.** primitive별 필수 geometry·optional numeric style·container shape를 명시하고 Number.isFinite 등으로 타입까지 검사한다.

**완료 기준.** 각 primitive의 잘못된 타입 행렬을 정확한 property path와 함께 거부한다. 정상 text/metadata에는 수치 조건을 강요하지 않는다.

실험 기록: [semantics-oracle-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-oracle-probes.json), [semantics-oracle-probes.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-oracle-probes.mjs).

<a id="t06"></a>
## T06 SVG integrity가 잘못된 XML과 수치 문자열을 허용한다

**P2 · 재현**

검사기는 root token과 일부 double-quoted 속성의 금지 문자열을 검색한다. 닫힘이 어긋난 `<svg><g></svg>`, cx="broken", cx="null", single-quoted NaN이 모두 통과했다.

근거: [test/oracles/svg-integrity.js:10](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/svg-integrity.js:10), [test/support/scenarios/engine.js:2772](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/engine.js:2772).

**해석 범위.** 현재 출력 전부가 잘못됐다는 뜻은 아니다. 기존 NaN·dangling ID·root closure 검사는 유지할 가치가 있다.

**개선.** XML 파싱 후 numeric/path/transform 속성의 문법을 검사한다. text content의 NaN 같은 합법적 문자열과 geometry를 구분한다.

**완료 기준.** 잘못된 XML과 수치 반례는 실패하고, single/double quotes는 동일하게 처리한다. 정상 단위·escaped text·transform은 통과한다.

실험 기록: [semantics-oracle-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-oracle-probes.json).

<a id="t07"></a>
## T07 공개 브라우저 smoke와 corpus geometry만으로 실제 가시성을 보장하지 못한다

**P2 · 재현 및 개선**

실제 Chromium에서 paint 메서드만 no-op으로 만들었더니 cars-scatterplot·legend-layout·cars-binned-heatmap이 기존 status/크기/이름/오류/상태 검사를 통과했다. 실제 Canvas의 nontransparentPixels는 모두 0이었다. corpus의 비퇴화 geometry 검사 역시 opacity 0·off-canvas·no paint를 구분하지 않는다.

근거: [test/browser/public-examples.browser.js:34](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/public-examples.browser.js:34), [test/browser/public-examples.browser.js:72](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/public-examples.browser.js:72), [test/oracles/analytic-layer-integrity.js:47](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/analytic-layer-integrity.js:47).

**해석 범위.** 투명/off-canvas graphic 자체는 합법적일 수 있다. corpus 검사의 본래 nonzero geometry 계약 위반으로 단정하지 않는다. 보여야 하는 예제·layer에 별도 가시성 기대가 필요하다.

**개선.** 사용자가 보는 Canvas에서 기대 배경과 대표 mark 영역의 작은 paint witness를 검사한다. recipe별 visible contributor 기대를 명시하고 semantic identity 검사와 함께 둔다.

**완료 기준.** 공개 예제의 no-paint·background-only 변이가 실패한다. 의도적으로 숨긴 reference layer와 명시적 빈 facet은 허용한다.

실험 기록: [browser-empty-canvas-results.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-empty-canvas-results.json), [browser-empty-canvas-probe.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-empty-canvas-probe.mjs), [semantics-oracle-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/semantics-oracle-probes.json).

<a id="t08"></a>
## T08 실패 직후 page를 먼저 닫아 screenshot과 원래 오류가 유실된다

**P2 · 재현**

공유 evidence helper는 실패한 page가 열려 있다고 가정하지만 여러 caller의 finally가 먼저 page/context를 닫는다. 의도적 assertion 실패를 같은 흐름으로 재현했을 때 capture 직전 remainingPages=0, 새 failure directory=0이었다. 원래 error를 helper에 넘기지 않는 경로도 있다.

근거: [test/support/browser.js:35](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/browser.js:35), [test/browser/named-shapes.browser.js:38](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/named-shapes.browser.js:38), [test/browser/backend-compatibility.browser.js:117](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/backend-compatibility.browser.js:117).

**해석 범위.** backend compatibility 일부 케이스는 catch/save가 있어 이미 보완되어 있다. 모든 실패 아티팩트가 사라진다는 뜻은 아니다.

**개선.** 공유 lifecycle이 실패를 catch해 error·test ID·URL·console/page errors·screenshot을 먼저 저장하고 finally에서 자원을 닫도록 한다.

**완료 기준.** 준비 실패와 assertion 실패 모두 원래 stack과 필요한 화면 증거를 남기고 context/browser를 정리한다.

실험 기록: [browser-failure-capture-results.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-failure-capture-results.json), [browser-failure-capture-probe.mjs](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-failure-capture-probe.mjs).

<a id="t09"></a>
## T09 작성된 engine-aware facet 회귀 테스트가 Firefox/WebKit 목록에서 빠진다

**P2 · 정적 확인**

facet-content-headers는 GGACTION_BROWSER와 DPR 1/2를 지원하지만 test:browser:compat는 backend-compatibility 한 파일만 선택한다. CI/release Firefox·WebKit job은 이 alias만 실행한다.

근거: [test/browser/facet-content-headers.browser.js:10](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/facet-content-headers.browser.js:10), [package.json:158](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/package.json:158), [.github/workflows/ci.yml:223](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/.github/workflows/ci.yml:223).

**해석 범위.** Firefox/WebKit matrix 자체는 존재하며 backend-compatibility가 인접 기능도 검사한다. 이 특정 content-header/persistence case의 선택 누락이다. 이번에 두 engine을 새 실행하지 않았다.

**개선.** engine-aware 파일을 명시적 compatibility registry로 모으고 matrix×case×DPR 실행 영수증과 discovery 검사를 연결한다.

**완료 기준.** 해당 전용 케이스가 세 engine에서 선택되고, registry에 추가한 engine-aware 파일이 CI 목록에서 누락되면 실패한다.

<a id="t10"></a>
## T10 coverage 분모가 로드되지 않은 source 파일을 자동 포함하지 않는다

**P2 · 재현된 방어 공백**

src include filter만으로 미로드 파일은 0%로 포함되지 않는다. 독립 fixture의 import되지 않은 throwing module이 report에 없는 상태에서 coverage 100%가 통과했다. source inventory 전체와 report file set의 비교는 없다.

근거: [scripts/run-tests.js:157](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:157), [scripts/coverage-policy.js:284](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:284).

**해석 범위.** src 595개 중 critical floor 137개 밖의 458개가 미검증이라는 뜻은 아니다. 현재 normal graph는 거의 모든 source에 도달하고 CLI는 subprocess 검사가 있다. 미래 파일 추가·분리와 child coverage 병합의 방어 공백이다.

**개선.** 전체 source 목록과 raw coverage를 대조하고 누락을 0% 또는 명시적 예외로 처리한다. child/CLI coverage 병합 범위도 확인한다.

**완료 기준.** 새 미로드 source를 넣은 fixture가 실패한다. 모든 파일이 report 또는 근거가 있는 exclusion에 존재한다.

실험 기록: [infra-unimported-coverage.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-unimported-coverage.log), [infra-source-policy.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-source-policy.json), [infra-source-static-reachability.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-source-static-reachability.json).

<a id="t11"></a>
## T11 critical floor의 자동 적용 범위가 고위험 경계 전체를 덮지 않는다

**P2 · 정적 확인**

자동 renderer family는 canvas 하위이며 SVG/PDF/transitionScene/MCP 및 다수 core 상태 파일은 family나 개별 floor가 없다. README의 새 policy/renderer 보호 설명은 실제 범위보다 넓다.

근거: [scripts/coverage-policy.js:7](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:7), [test/README.md:104](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/README.md:104).

**해석 범위.** floor 부재는 테스트 부재가 아니다. 기존 global coverage와 renderer/state 단위 검사는 존재한다.

**개선.** 상태·selector·모든 backend·inspection/scene/MCP 경계의 위험 정책을 정하고 현재 측정값에 맞는 family floor를 적용한다.

**완료 기준.** 각 경계에 새 파일을 추가하는 policy fixture가 자동 floor를 받는다. 문서 설명과 실제 family 범위가 일치한다.

실험 기록: [infra-source-policy.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-source-policy.json).

<a id="t12"></a>
## T12 release 필수 테스트 step을 꺼도 workflow 계약 테스트가 통과한다

**P2 · 재현된 방어 공백**

workflow 문자열의 command 존재·순서 검사에 기대므로 필수 source-test step에 if:false를 넣거나 실행 명령을 echo로 바꾼 독립 복사본에서도 9/9 테스트가 통과했다.

근거: [test/contracts/release-workflow.test.js:44](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/release-workflow.test.js:44), [test/contracts/release-workflow.test.js:89](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/release-workflow.test.js:89).

**해석 범위.** 현재 release가 필수 검사를 생략한다는 발견은 아니다. 현재 workflow에는 검증·candidate·aggregate gate가 있다. 그것의 회귀 방지 테스트가 실행 여부를 증명하지 못한다.

**개선.** YAML 구조의 job/step identity·needs·조건·matrix·실제 실행 명령 속성을 검사한다. 소수의 disable/delete/echo/continue-on-error 변이 fixture를 둔다.

**완료 기준.** 필수 step을 무력화하는 변이는 모두 실패하고, 의미가 같은 정상 formatting 변경은 통과한다.

실험 기록: [infra-release-skip-mutant.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-release-skip-mutant.log), [infra-release-command-mutant.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-release-command-mutant.log).

<a id="t13"></a>
## T13 기본/unit suite의 Chromium 전제가 실행 안내와 어긋난다

**P2 · 재현**

npm test와 unit 안에서도 Chromium을 직접 launch한다. 빈 PLAYWRIGHT_BROWSERS_PATH를 사용한 단위 테스트는 실행파일 없음으로 실패했다. CI는 미리 browser를 설치하므로 정상 CI만으로 이 로컬 전제를 확인할 수 없다.

근거: [test/README.md:3](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/README.md:3), [test/README.md:41](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/README.md:41), [test/unit/support/failure-artifacts.test.js:104](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/failure-artifacts.test.js:104), [test/docs/interaction-regressions.test.js:8](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/interaction-regressions.test.js:8).

**해석 범위.** 브라우저 테스트가 실패하는 것이 자체로 잘못은 아니다. 안내·suite 이름·resource prerequisite의 불일치다. 기존 설치물을 제거하지 않고 경로를 격리해 재현했다.

**개선.** browser-dependent 케이스를 자원 capability로 분리하거나 default의 prerequisite와 preflight를 명확하게 문서화한다.

**완료 기준.** 깨끗한 npm ci 이후 안내된 명령이 동작하거나 정확한 설치 명령을 즉시 안내한다. 자원 없음으로 조용히 skip하여 합격시키지 않는다.

실험 기록: [infra-clean-browser.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-clean-browser.log).

<a id="t14"></a>
## T14 Windows의 기본 test-side 경로와 compiler 호출이 일관되지 않다

**P2 · 정적 확인 및 경로 재현**

sharding test는 slash timing key를 native path.relative로 비교·조회해 Windows의 backslash 경로에서 실패한다. path.win32 재현에서도 lookup은 undefined다. production sharder는 이미 정규화한다. 별도로 62개 test 파일이 .bin/tsc를 직접 spawn한다.

근거: [test/unit/support/test-sharding.test.js:11](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/test-sharding.test.js:11), [scripts/test-sharding.js:15](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-sharding.js:15), [test/contracts/distribution-color-facade-types.test.js:31](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/distribution-color-facade-types.test.js:31), [.github/workflows/ci.yml:189](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/.github/workflows/ci.yml:189).

**해석 범위.** 이번에 native Windows full suite를 실행하지 않았다. 경로 문제는 정적 원인이 확정되고, .bin/tsc 호출은 별도 플랫폼 실행 확인이 필요한 위험이다. Windows CI는 package smoke를 실행하므로 normal suite 문제를 놓칠 수 있다.

**개선.** test-side key를 같은 canonical 경로로 만들고 compiler는 process.execPath+compiler JS entry의 공유 helper로 실행한다.

**완료 기준.** Windows에서 discovery/sharding/type harness의 focused contracts가 통과한다. 지원하는 suite 범위를 안내한다.

실험 기록: [infra-windows-path.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-windows-path.log).

<a id="t15"></a>
## T15 패키지 qualification의 native dependency 기준이 실행마다 변할 수 있다

**P2 · 정적 확인**

platform consumer는 bare @napi-rs/canvas를 새 임시 consumer에 설치하고 다른 consumer도 lock 없이 peer range를 새로 resolve한다. 결과 영수증에는 resolved native backend 정보가 충분히 남지 않는다.

근거: [scripts/test-platform-package.js:10](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-platform-package.js:10), [scripts/package-consumer.js:5710](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js:5710), [scripts/test-platform-package.js:61](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-platform-package.js:61).

**해석 범위.** 현재 dependency 비호환을 재현한 것은 아니다. 최신 compatible dependency 검사 자체는 유익하지만 고정 baseline과 다른 목적이다.

**개선.** 고정 또는 최소 지원 baseline fixture와 최신 호환성 matrix를 분리하고 resolved version·OS/arch·browser/native identity를 기록한다.

**완료 기준.** 같은 baseline은 같은 dependency set으로 재실행된다. latest 호환성 실패는 baseline 회귀와 구분된다.

<a id="t16"></a>
## T16 coverage 성공과 critical-only 실패에서 상세 결과가 보존되지 않는다

**P2 · 실행 관찰 및 정적 확인**

runner가 전체 stdout을 모은 뒤 성공 시 한 줄 summary만 출력한다. 이번 새 coverage 로그도 비율과 floor 수만 남아 per-file 미커버 구간·test count·duration을 다시 볼 수 없다. global 통과 후 critical floor가 throw하는 경로도 원본 stdout을 보존하지 않는다.

근거: [scripts/run-tests.js:190](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:190), [.github/workflows/ci.yml:280](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/.github/workflows/ci.yml:280).

**해석 범위.** 테스트 실패를 숨긴다는 뜻은 아니다. 진단과 review에 필요한 상세 영수증을 잃고 재실행 비용을 높인다.

**개선.** structured coverage와 full report를 먼저 아티팩트로 쓰고 콘솔은 요약으로 유지한다. commit/runtime identity와 report 경로를 남긴다.

**완료 기준.** 성공·global 실패·critical-only 실패·buffer overflow 모두 구별되고 원본 및 구조화 결과를 회수할 수 있다.

실험 기록: [infra-coverage.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-coverage.log).

<a id="t17"></a>
## T17 일반 runner의 timeout과 취소·하위 프로세스 정리 경계가 없다

**P2 · 개선 제안**

일반 spawnSync/testRunnerArguments에 suite deadline이 없고 run-check는 child close를 기다리며 명시적인 timeout/종료 escalation 계약이 없다. workflow에도 명시적인 job timeout-minutes가 없다.

근거: [scripts/run-tests.js:190](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:190), [scripts/run-check.js:18](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-check.js:18).

**해석 범위.** 이번 정상 실행에서 hang을 관찰하지 않았다. realistic의 일부 격리 테스트에는 timeout/kill 검증이 이미 있다. 이를 일반 실행 경계와 구분한다.

**개선.** suite별 현실적인 deadline, SIGTERM 뒤 bounded SIGKILL, descendant cleanup과 timeout receipt를 정의한다.

**완료 기준.** 의도적으로 멈춘 child fixture가 제한 시간 안에 실패하며 원래 오류·진단·정리 완료가 남는다. corpus에 과도하게 짧은 공통 제한을 두지 않는다.

<a id="t18"></a>
## T18 package consumer 준비 실패가 임시 디렉터리를 회수하지 못한다

**P2 · 정적 확인**

mkdtemp 이후 pack/install/manifest read가 실패하면 cleanup 객체를 반환하기 전에 throw한다. caller는 아직 consumer를 할당받지 못해 내부 npm cache와 임시 디렉터리의 정리를 호출할 수 없다.

근거: [scripts/package-consumer.js:39](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js:39), [scripts/package-consumer.js:5718](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js:5718), [test/browser/package-consumer.browser.js:19](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/package-consumer.browser.js:19).

**해석 범위.** 이번에 실제 npm 설치 실패와 누적 용량을 측정하지 않았다. 성공 전에 자원 소유권을 넘기지 못하는 코드 경로를 확인한 것이다.

**개선.** 준비 함수가 성공 전 자원을 소유하고 실패 때 필요한 작은 로그만 보존한 뒤 정리한다.

**완료 기준.** invalid package spec·install failure·manifest failure 주입 시 임시 디렉터리와 하위 프로세스가 남지 않는다.

<a id="t19"></a>
## T19 문서 snippet의 등록·해시와 실행 증거 연결은 서로 다른 수준이다

**P2 · 정적 확인**

인식된 JS 블록 680개는 실행 등록 55개, 생성 블록 220개, contextual exception 405개다. 74개 문서는 이 registry에서 exception만 가진다. 예외는 해시·owner·reason 길이를 검사하지만 구체적인 setup이나 expected rejection과 연결되지 않는다.

근거: [test/docs/documentation-coverage.test.js:199](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/documentation-coverage.test.js:199), [scripts/doc-snippet-coverage.js:23](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippet-coverage.js:23), [docs/_data/snippet_exceptions.json:2](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/_data/snippet_exceptions.json:2).

**해석 범위.** 405개가 모두 잘못되었거나 다른 테스트가 없다는 뜻은 아니다. README/API에는 별도 검사가 있다. intentionally-invalid troubleshooting 예제를 성공 코드처럼 실행해서도 안 된다.

**개선.** complete·continuation·intentional failure·generated typecheck·prose-only를 분리하고 code hash와 실제 test witness를 연결한다. 자주 쓰는 README/복구/extension/guide 예제부터 옮긴다.

**완료 기준.** 실행 비율과 예외 비율을 따로 공개하고 예외 증가를 설명한다. 오류 예제는 문서화한 이유로 실패하며 continuation은 명시된 상태에서 실행된다.

실험 기록: [docs-coverage-summary.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-coverage-summary.json), [docs-snippet-collisions.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-snippet-collisions.json).

<a id="t20"></a>
## T20 문서 코드 블록 parser가 fence 형태에 따라 검사를 빠뜨린다

**P2 · 재현된 방어 공백**

4개 backtick과 2칸 들여쓴 JS fence는 블록 0개로 인식된다. info-string 속성은 unclosed fence 오류를 만들고 TS는 parser 이후 coverage 집계에서 제외된다.

근거: [scripts/doc-snippets.js:21](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippets.js:21), [scripts/doc-snippet-coverage.js:19](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippet-coverage.js:19).

**해석 범위.** 기존 공개 문서의 특정 블록이 현재 이 방식으로 누락됐다는 발견은 아니다. 새 예제를 추가할 때 검증에서 조용히 빠질 수 있는 parser 경계 문제다.

**개선.** 사이트 Markdown 문법과 맞추거나 지원하지 않는 형태를 명시적으로 거부한다. 중첩 list·긴 fence·indent·attribute·JS/TS 정책 fixture를 둔다.

**완료 기준.** 실행 가능한 코드 블록이 지원되지 않는 문법 때문에 조용히 집계에서 사라지지 않는다.

실험 기록: [docs-parser-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-parser-probes.json).

<a id="t21"></a>
## T21 문서 실행 계약이 환경과 의도한 결과를 충분히 구분하지 않는다

**P2 · 정적 확인**

environment는 truthy만 검사한다. Node runner는 모든 경우에 selector를 무시하는 fake document와 URL을 무시하는 fetch fixture를 공급한다. 55개 중 canonical graphicSpec 비교는 13개이며 나머지 42개는 program/canvas/nonempty-object 중심이다. browser consumer는 항상 render를 뒤에 붙인다.

근거: [scripts/doc-snippets.js:58](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippets.js:58), [test/docs/executable-programs.test.js:19](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/executable-programs.test.js:19), [scripts/tutorial-consumer.js:40](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/tutorial-consumer.js:40).

**해석 범위.** packed browser tests가 URL/DOM/실제 rendering을 보완한다. 모든 browser 예제가 mock에서만 실행된다는 뜻은 아니다. 추가 render는 authoring-only snippet에는 타당하지만 render-owning 예제의 호출 누락은 감출 수 있다.

**개선.** registry schema와 environment vocabulary, authoring-only/render-owning 계약, expected resource/mark/value를 명시한다. case 이름에 ID를 포함한다.

**완료 기준.** 잘못된 selector/URL, 필수 render 누락, 문서화한 encoding 오류가 해당 증거 계층에서 검출된다.

실험 기록: [docs-coverage-summary.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/docs-coverage-summary.json).

<a id="t22"></a>
## T22 현재 계약 검사가 문구와 과거 계획 텍스트에 묶여 있다

**P2 · 정적 확인**

일부 tests가 planned corpus의 호출 문자열·한국어 문장·역사적 상태와 현재 runtime vocabulary를 섞어 검사한다. 다른 docs 검사도 특정 설명 문구를 고정한다. 동등한 문장 수정에 실패하고 문장/regex를 함께 고치면 실제 동작의 독립 검증은 늘지 않는다.

근거: [test/contracts/action-value-vocabulary.test.js:46](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/action-value-vocabulary.test.js:46), [test/contracts/documentation-truth.test.js:47](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/documentation-truth.test.js:47), [test/docs/getting-started.test.js:47](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/getting-started.test.js:47).

**해석 범위.** 공개 anchor·package entry 목록·link integrity·현행 contract 연결은 유효한 검사다. 모든 문서 문자열 assertion을 제거하자는 뜻이 아니다.

**개선.** runtime vocabulary/status는 structured current catalog/types/runtime에 연결하고, navigation/anchor 검사는 문서 계층에 남긴다. 역사 계획은 별도 탐색 검증으로 한정한다.

**완료 기준.** 의미가 같은 편집은 통과하고, 공개 token·canonical link·지원 상태의 실제 불일치는 실패한다.

<a id="t23"></a>
## T23 architecture regex는 동등한 구문을 놓치고 주석을 위반으로 본다

**P2 · 재현된 방어 공백**

literal semanticSpec.layers.find는 잡지만 optional chaining·bracket notation·alias는 통과한다. 같은 코드를 주석에 넣으면 거부한다. _clone 문자열 검사도 spelling에 의존한다.

근거: [test/contracts/source-boundaries.test.js:141](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/source-boundaries.test.js:141), [test/contracts/source-boundaries.test.js:152](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/source-boundaries.test.js:152).

**해석 범위.** 현재 source가 architecture를 위반한다는 발견은 아니다. import graph는 이미 es-module-lexer를 쓰므로 그대로 유지한다. AST만으로 임의 alias/dataflow가 전부 해결되지는 않는다.

**개선.** 필요한 직접 접근 구문을 AST 규칙으로 좁혀 검사하고 alias/dataflow 한계를 명시한다. 중요한 ownership은 상태·호출 흐름 검증과 결합한다.

**완료 기준.** 주석/문자열은 통과하고 금지한 동등 직접 구문은 실패한다. allowlist와 추적 한계가 명확하다.

실험 기록: [architecture-regex-probes.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/architecture-regex-probes.json).

<a id="t24"></a>
## T24 packed consumer가 큰 생성 문자열과 단일 결과에 묶여 있다

**P2 · 정적 확인**

package consumer script는 5,834줄이고 Node consumer 하나가 3,000줄 이상이다. browser consumer도 큰 HTML/module 문자열과 단일 test다. 앞 단계 실패가 뒤 독립 시나리오를 미실행으로 만들며 generated temp file stack이나 readiness timeout으로 진단이 약해진다.

근거: [scripts/package-consumer.js:76](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js:76), [scripts/package-consumer.js:5718](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js:5718), [test/browser/package-consumer.browser.js:19](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/package-consumer.browser.js:19), [test/browser/package-consumer.browser.js:725](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/browser/package-consumer.browser.js:725).

**해석 범위.** 실제 설치 package·MCP·types·renderer·persistence를 폭넓게 검사하는 강점은 보존해야 한다. 임의 줄 수 기준의 분할이나 무조건 병렬화는 해법이 아니다.

**개선.** 설치는 fixture scope에서 공유하고 entry/renderer/persistence/extension/MCP/types 계약별 실제 module과 독립 case ID·duration·receipt를 둔다.

**완료 기준.** 한 케이스가 실패해도 독립 케이스의 결과와 소유자가 기록된다. package import 경계와 모든 기존 scenario의 도달성이 유지된다.

<a id="t25"></a>
## T25 타입 검사의 반복 harness와 역사적 파일명이 유지보수 비용을 높인다

**P3 · 개선 제안**

60개 *-types.test.js와 65개 spawnSync+skipLibCheck 포함 모듈에서 임시 .mts·flags·진단·정리를 반복한다. 테스트 소스 전체에 @ts-expect-error가 558곳 있다. phase2/phase5/composition-phase10 이름과 한 줄로 압축된 fixture도 남아 있다.

근거: [test/contracts/legend-spacing-types.test.js:1](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/legend-spacing-types.test.js:1), [test/contracts/phase2-data-types.test.js:12](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/phase2-data-types.test.js:12), [test/docs/documentation-coverage.test.js:230](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/documentation-coverage.test.js:230).

**해석 범위.** skipLibCheck 때문에 모든 declaration 오류를 놓친다는 주장은 아니다. docs isolation은 이를 끄고 package consumer도 존재한다. positive/negative type fixture를 보존해야 한다.

**개선.** 작은 공유 compiler harness와 일반 fixture 파일·통일된 flags/diagnostics/timeouts를 사용한다. capability 이름으로 정리하고 compile batching은 실측 후 결정한다.

**완료 기준.** 기존 positive/negative 반례가 유지되고 compiler version·fixture별 결과가 남는다. normal discovery가 모든 fixture를 연결한다.

<a id="t26"></a>
## T26 기대 CSS 색상의 오타가 검은색으로 바뀐다

**P3 · 재현**

Canvas는 invalid fillStyle 설정을 무시한다. normalizeExpectedColor("not-a-css-color")가 오류 없이 [0,0,0,255]를 반환해 검은 축/텍스트가 오타 난 기대값을 충족할 수 있다.

근거: [test/support/png.js:15](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/png.js:15), [test/unit/support/png.test.js:29](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/png.test.js:29).

**해석 범위.** 현재 manifest에 같은 오타가 있다는 발견은 아니다. 기대값 입력 자체의 검증이 느슨하다.

**개선.** expected color의 문법을 엄격하게 검사하고 none 같은 의미 토큰은 CSS color와 분리한다.

**완료 기준.** invalid syntax는 renderer 실행 전에 실패하고 black/transparent/rgba/named color는 정확히 유지된다.

실험 기록: [browser-png-blank-results.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/browser-png-blank-results.json).

<a id="t27"></a>
## T27 기존 corpus 변이 helper를 의미 관계 검증에 더 활용할 수 있다

**P3 · 개선 제안**

injectMissing·scaleNumericFields·renameFields는 helper 자체 검사에서 사용되고 scenario mutation dispatcher는 shuffle/duplicate에 집중한다. 현재 개별 테스트에 missing/rename/scaling 및 LOESS 불변성 검사가 이미 있다.

근거: [test/support/datasets/mutations.js:1](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/datasets/mutations.js:1), [test/contracts/dataset-fixtures.test.js:414](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/dataset-fixtures.test.js:414), [test/support/scenarios/recipes.js:75](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/recipes.js:75).

**해석 범위.** 이 동작들이 전혀 미검증이라는 뜻은 아니다. 실제 corpus와 transform/revision 상호작용을 적은 케이스로 넓힐 여지다.

**개선.** 고정 seed의 작은 corpus 표본에 rename/scale/missing 등의 변이를 가하고 계약별 expected relation, 거부 조건과 불변성을 검사한다.

**완료 기준.** 관계마다 잘못된 구현을 잡는 witness와 재현 seed·원본/변이 입력이 남는다. rename collision과 overflow 조건을 먼저 정의한다.

<a id="t28"></a>
## T28 현실 데이터·까다로운 입력·크기 스트레스를 별도 지표로 관리해야 한다

**P3 · 개선 제안**

많은 record view가 160행/8그룹 등으로 제한되고 nonfinite measure나 missing category를 걸러낸다. 일부 recipe는 80/96/120행을 사용한다. 대표 차트에는 적절하지만 rare category·긴 label·결측·극단값·대규모 부하를 의미하지는 않는다.

근거: [test/support/scenarios/realistic-data.js:10](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-data.js:10), [test/support/scenarios/realistic-data.js:550](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-data.js:550), [test/support/scenarios/realistic-data.js:573](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/scenarios/realistic-data.js:573).

**해석 범위.** full-source 집계·provenance·별도 large facet/path 검사가 존재한다. 모든 corpus가 160행이라는 주장이나 표본화 자체가 문제라는 주장은 아니다.

**개선.** 기존 제한된 corpus를 유지하면서 pathology overlay와 size tier를 별도로 기록한다. dataset/chart 수 외에 실제 행수·category 수·pathology class 분포를 집계한다.

**완료 기준.** 선언한 각 병리/크기 class에 consumer와 semantic postcondition이 있고 sampled/full-source 증거를 구분할 수 있다.

<a id="t29"></a>
## T29 primitive baseline이 무엇을 독립적으로 증명하는지 표시할 필요가 있다

**P3 · 개선 제안**

일부 primitive baseline은 production point geometry·공개 mark/encoding·composition resolver를 공유한다. 이는 selection overlay나 wrapper 비교에는 유효하지만 공유 수학 구현의 독립 정확성 증거는 아니다.

근거: [test/charts/mark-selection-points/primitive.program.js:1](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/charts/mark-selection-points/primitive.program.js:1), [test/charts/program-composition/variants/layouts/reference-values.js:1](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/charts/program-composition/variants/layouts/reference-values.js:1).

**해석 범위.** 별도 literal/layout/oracle tests가 보완하므로 전체 suite가 자기 자신만 비교한다는 평가는 틀리다.

**개선.** 각 baseline이 검증하는 독립 concern과 공유 prerequisite를 짧게 기록하고, 높은 위험의 공통 계산은 literal/독립 oracle anchor에 연결한다.

**완료 기준.** reviewer가 API 동등성·독립 geometry·backend parity·같은 실행의 determinism을 구분할 수 있다. production 전체를 복제하지 않는다.

<a id="t30"></a>
## T30 coverage parser가 비어 있는 metric을 NaN으로 통과시킨다

**P3 · 재현된 방어 공백**

line=100이고 branch/functions가 빈 행을 주면 NaN이 되고 NaN<floor가 false여서 세 기준 100을 통과한다.

근거: [scripts/coverage-policy.js:263](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:263), [scripts/coverage-policy.js:296](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:296).

**해석 범위.** 정상 Node coverage 출력에서 이런 행이 발생한 것을 관찰한 것은 아니다. 출력 형식 변경이나 손상에 대한 fail-open 문제다.

**개선.** 모든 metric이 finite이고 0..100인지 검사하고 missing/duplicate row와 잘못된 floor config를 거부한다.

**완료 기준.** malformed fixture는 실패하고 지원하는 실제 Node report 형식 fixture는 정확히 파싱된다.

실험 기록: [infra-coverage-parser.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-coverage-parser.log).

<a id="t31"></a>
## T31 잘못된 capability selector가 앞선 selector에 가려진다

**P3 · 재현**

selector 검증이 selectors.some 안에서 수행된다. 앞 selector들이 모든 파일에 match하면 뒤 capability:does-not-exist는 평가되지 않고 957개 파일을 반환한다. unknown 하나만 넣으면 정상적으로 거부한다.

근거: [scripts/run-tests.js:94](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:94), [scripts/run-tests.js:117](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:117).

**해석 범위.** 일반적인 단일 unknown selector는 이미 보호된다. 여러 selector를 조합하는 자동화/agent 호출에서 오타가 묻힌다.

**개선.** 파일 filtering 전에 모든 selector를 parse/validate한다. valid+invalid 순서 조합과 CLI 결과를 검사한다.

**완료 기준.** 선행 selector의 match 여부와 무관하게 unknown capability를 거부한다. 무효한 path/chart selector 정책도 명시한다.

실험 기록: [infra-selector.log](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-selector.log).

<a id="t32"></a>
## T32 shard 계획을 과거 혼합 측정과 파일 단위가 제한한다

**P3 · 개선 제안**

timing baseline에는 과거 Ubuntu 합산 duration과 후속 macOS 값이 섞여 있다. 파일 단위 배치라 가장 큰 기록값 945,678ms 파일은 분할할 수 없다. shard 내부 concurrency 2인 실제 wall time과 weight 합도 다르다.

근거: [test/realistic-timings.json:3](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/realistic-timings.json:3), [scripts/test-sharding.js:15](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-sharding.js:15), [test/unit/support/test-sharding.test.js:18](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/test-sharding.test.js:18).

**해석 범위.** 이 숫자는 이번 실행 시간이나 현재 CI의 느려짐을 측정한 값이 아니다. exhaustive/disjoint/deterministic sharding은 이미 검증된다.

**개선.** 동일 CI 환경의 file wall time·memory·failure rate를 수집하고 median/p95로 갱신한다. 큰 모듈은 capability/isolation 계약 단위로 나눈다.

**완료 기준.** 같은 입력과 weight에서 결정적 배치를 유지하고 과거 round-robin 승패 대신 균형·capacity·완전 분할 기준을 검증한다.

실험 기록: [infra-sharding.json](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-sharding.json).
