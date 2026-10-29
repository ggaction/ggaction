# Streamgraph 기준선 확장

## 진행 상태

- [x] 기존 Area/layoutSeries 책임과 STEP054 원계약 확인
- [x] 공개·저장·수학·시각 결정 기록과 기존 승인 재사용
- [x] 순수 wiggle kernel: literal/최소화/보존/극단값/예산 검증
- [x] 공개 Area·density·scale·source revision 연결 및 consumer 검증
- [ ] 문서·설치·렌더러·실제 데이터 증거와 checkpoint

## 승인과 책임

[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`이 STEP077까지 새 공개 API·저장·시각 결정의 구체화와 구현을 승인했다. 상태는 approved이며 새 질문을 하지 않는다. 검증 완료와 승인은 구분한다. 기존 `layoutSeries`, `createAreaPlot`, categorical `encodeColor`의 mode에 `wiggle`만 추가한다. 신규 façade나 renderer API는 만들지 않는다. 원 STEP054의 zero/center/wiggle 요구 중 zero는 기존 stack, center는 기존 center가 소유한다.

의미는 기존 `layer.layout.mode = "wiggle"` 한 곳에 저장한다. `streamBaseline.js`가 정렬된 비음수 값 행렬의 기준선만 계산하고, 기존 areaSeries가 source grain·missing·Path topology를, scale consumer가 같은 최종 경계를, Area materializer가 concrete Path를 소유한다. 렌더러는 기존 Path만 읽는다.

## 수치 계약

증가하는 정량/시간 independent 위치 j에서 입력 순서의 series i를 보존한다. Δv_i = v_i,j − v_i,j−1, c_i = Σ(k<i)Δv_k + Δv_i/2. 이전 기준선에 Δb = −Σ_i(v_i,j c_i)/Σ_i(v_i,j)를 더한다. 이는 층 중심의 변화량 제곱을 현재 두께로 가중한 합 Σ_i v_i,j(Δb+c_i)^2의 최소값이다. 위치 간격은 모든 층에 공통이므로 동일 최소화에서 소거된다. 각 연결 구간의 첫 기준선은 0이다. 전체 0 열은 이전 기준선을 유지하며 explicit missing gap은 연결 구간을 끊고 다음 시작을 0으로 재설정한다. 값 두께와 공유 경계를 보존한다.

허용: 정량/시간 x + 비음수 정량 y, 정렬된 모든 group/position의 명시 row, vertical raw Area 또는 정렬된 vertical density Area. 금지: horizontal/categorical-independent/custom pathOrder, 음수·누락 row·중복 group/position. 명시 `missing:"break"` null 값은 모든 층을 같이 끊는다. Bar/Basic와 ranged nonzero endpoints에는 적용하지 않는다. 전체 셀/샘플은 각각 기존 generated-item 한도 10,000 이내다. 정규화된 보상 합을 사용하고 유한 경계 또는 양수 두께를 표현할 수 없으면 오류다.

## 시각 결정

초기 명시 primitive source `.artifacts/streamgraph-preview.mjs`를 실행해 380×280 Canvas의 두 Path를 PNG/SVG로 렌더하고 확인했다. 열 [[1,3],[2,2],[1,1],[4,0]], x=[40,140,240,340], y=200−40v. 첫 층 하한 [0,−.5,.5,−1], 상한 [1,1.5,1.5,3]; 둘째 상한 [4,3.5,2.5,3]. 색은 #2563eb/#0d9488, 선 없음. target.png/SVG는 `.artifacts/streamgraph-primitive/`에 있다. 공개 연결 후 실행 가능한 stable primitive/public pair와 manifest로 옮겨 같은 픽셀을 검사한다. 기하학·값·group 순서는 렌더러별로 재계산하지 않는다.

## 남은 의무

공개 action 첫 child 이전의 완전 사전검증은 기존 owner를 유지한다. 부모의 STEP050 exact façade/frame preflight와 합산 검증은 후행 통합이며 이 slice만으로 STEP050 또는 전체 STEP054 완료를 선언하지 않는다. 기존 rose/radialBar/radar/violin variant의 독립 수학·consumer 증거 감사, Table과 recipe 후속은 별도 checkpoint다.

## 공개 연결 증거

Stable primitive/public pair는 `test/charts/streamgraph/`와 `examples/streamgraph/program.js`가 소유한다. 공유 Area 회귀 162건, 새 kernel 100/100/100 및 기존 critical floor, 실제 5개 source table의 stack/center/wiggle 15건, Canvas/SVG/PNG/PDF 독립 primitive 일치와 Chromium DPR1/2를 확인했다. 동일 tar의 Node20/22/24에서 source-free lifecycle/scene/offline/fresh process 3건, strict types, optional peers, 5 bundle 측정을 통과했다. 마지막 source-link pin과 option inventory 검증은 증거 checkpoint에 기록한다.
