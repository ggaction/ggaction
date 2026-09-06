# Phase 6 W3 결과 — 공통 confidence interval method와 level

## 결과

- `src/grammar/statistics/confidenceInterval.js`를 CI method·level의 단일 계산·검증 owner로 추가했다.
  지원 method는 `normal`과 `student-t`이며 level은 열린 구간 `(0, 1)`의 유한수다.
- `ciLower`·`ciUpper`는 기존 문자열 호출을 normal 95%로 유지하면서
  `{ op, method, level }` 형태의 명시적 CI를 지원한다. 기존 95% normal 경로는 정확히 `1.96`을 사용해
  이전 결과와 title을 보존한다.
- Interval, ErrorBar, ErrorBand는 CI 기본값을 Student-t 95%로 명시해 transform provenance에 method와
  level을 함께 저장한다. `stderr`·`stdev`·`iqr`에는 두 옵션을 허용하지 않는다.
- Regression은 fit의 `method`와 충돌하지 않도록 CI에 `confidenceMethod`와 `level`을 사용한다.
  공개 호출의 `confidence`는 compatibility alias로 받되 새 provenance에는 중복 저장하지 않는다.
  과거 transform의 단일 `confidence` 필드는 읽을 수 있고, legacy와 canonical provenance를 섞은 transform은
  거부한다. LOESS의 기존 CI 비지원 계약도 유지한다.
- 공통 vocabulary와 canonical provenance를 strict declarations, Current contract, API 문서, action cards,
  generated reference/search/LLM artifacts와 installed-package consumer에 동기화했다.

## 수치와 경계 검증

- `[1, 2, 3]`의 upper CI는 기존 normal 95% 결과 `3.131606527611667`과 Student-t 95% 결과
  `4.484137711750334`를 각각 독립 oracle로 재현한다.
- 빈 입력은 undefined bounds, singleton과 constant group은 zero-width CI로 처리한다.
- Grouped interval에서 missing 값은 제외하고 constant·singleton·빈 group의 의미를 따로 검사했다.
- 잘못된 method, level, unknown option, non-CI method/level, canonical·legacy provenance 혼용은 이전
  program과 caller input을 바꾸기 전에 거부한다.
- Regression의 normal bound가 같은 입력의 Student-t bound보다 좁음을 검사하고 level/confidence alias의
  동일값 허용과 충돌 거부를 분리했다.

## 호환성과 시각 영향

- Scalar `ciLower`·`ciUpper`의 normal 95% 기본 수치와 Interval·Regression의 Student-t 95% 기본 수치를
  그대로 유지했다. 기존 차트의 geometry와 pixels는 바뀌지 않는다.
- 새 action이 작성한 interval/regression transform에는 method가 명시되므로 저장된 의미를 이름만으로
  추론할 필요가 없다. 과거 level-only interval과 confidence-only regression transform은 계속 읽힌다.
- Regression 공개 API에서는 `confidence`를 단계적으로 `level`로 옮길 수 있으며 같은 호출에 둘 다 쓰면
  값이 같을 때만 canonical provenance로 정규화한다.

## 검증

- Focused confidence·aggregate·interval·regression tests: pass.
- Unit suite: 2,169/2,169 pass.
- Contract suite: 310/310 pass.
- Documentation suite: 47/47 pass; 모든 generated check pass.
- Packed consumer: Node/renderers/MCP, runtime CI method 비교, strict positive/negative declarations와 minimal
  Vite bundle 측정 pass.
- Package artifact: 472 entries, 541,072 packed bytes, 2,581,298 unpacked bytes, SHA-256
  `47606f91606a5924ca05ebf286ebf37851e9a3afae24001fa72063aa83137838`.
- Browser gzip: Full 271,957 / Basic 149,570 / SVG 6,437 bytes. 공통 CI kernel이 Basic aggregate에도
  포함되는 실제 증가에 맞춰 ceiling을 Full 272,000, Basic 150,000으로 최소 조정했고 SVG 25,000은
  유지했다.

## 다음 작업

- W4는 filter의 기준 source와 active recipe를 저장하고 replace·compose·remove·empty 의미를 완성한다.
- W5는 Violin과 interval composite의 source·position·orientation 역할 편집을 한 owner identity 아래 둔다.
