# 평균의 재현 가능한 백분위 부트스트랩 구간

## 진행 상태

- [x] 공개 0.0.19에서 기능 거부와 프로그램 불변성 확인 — 이슈 #219
- [x] 아래 공개 계약·저장·난수·한도·호환성 제안
- [x] 독립 수치/기존 면적·선 primitive 목표의 실행 증거
- [x] Gate: approved — 앞서 요청한 계약·수치 목표와 해당 소스의 seed 1 기준 고정을 승인받음
- [ ] 승인 후 구현·회귀 검증·타입/계약/문서 동기화

이 문서는 **설계 제안**이다. 승인 근거는 [approval-evidence.json](approval-evidence.json)이며 기능을 구현하고 검증 중이다. 기준은 0.0.19 / f6b50bf55a9de1857f106c7aa519326ce7a86d76이다. [이슈 #219](https://github.com/ggaction/ggaction/issues/219).

## 문제

평균 신뢰구간의 normal/student-t 방식은 대칭이다. 비대칭 분포에서 복원 추출한 평균들의 백분위 구간을 대신하지 못한다. 원본 관측을 유지하고 native typed dataflow 안에서 계산해야 한다. 미리 계산한 경계 배열이나 하드코딩한 결과는 해결책이 아니다.

## 제안할 공개 흐름

새 액션 없이 기존 `createSummaryData`/`editSummaryData`, `createIntervalData`/`editIntervalData`의 **비가중 평균 CI에만** method 객체를 확장한다. 기존 문자열 `normal`/`student-t`, 기본값과 회귀 CI는 바꾸지 않는다.

```js
chart().createData({values}).createSummaryData({
  id:'intervals', groupBy:['x'], aggregates:[
    {field:'value', op:'mean', as:'mean'},
    {field:'value', op:{op:'ciLower', method:{type:'bootstrap', seed:1}, level:0.95}, as:'lower'},
    {field:'value', op:{op:'ciUpper', method:{type:'bootstrap', seed:1}, level:0.95}, as:'upper'}
  ]
});
```

`method: {type:'bootstrap', seed, samples?}`: seed는 **필수 정수 1..2147483646**, samples는 정수 1..10000, 생략 시 1000. level은 기존 CI의 열린 구간 0..1 및 기본값0.95를 그대로 쓴다. bootstrap 문자열, 임의 RNG 함수, 가중치와 bootstrap, regression bootstrap은 거부한다. method 객체에 알려지지 않은 키도 거부한다. action의 상위 옵션 수는 증가하지 않는다.

### 정확한 수학·재현성

- 각 그룹·필드의 기존 유효 숫자 관측 순서를 보존한다. 엄격한 숫자/결측 정책은 기존 summary/interval 계약을 따른다. 문자 숫자를 임의 변환하지 않는다. raw rows는 변경하지 않는다.
- n개 관측에서 n번 복원 추출하여 평균을 만들고 이를 samples번 반복한다. 순서대로 합산하며 결과 평균 samples개를 숫자 오름차순 정렬한다. 양 끝은 R7 선형 보간 분위수 `(1-level)/2`, `1-(1-level)/2`다. BCa, 정규 근사나 student-t가 아니다.
- 난수 state를 seed로 초기화한다. 각 draw는 JavaScript Number 연산으로 `state=(1103515245*state+12345)%2147483647`, `u=state/2147483647`, 선택 인덱스는 `floor(u*n)`이다. 이 정확한 Number 연산을 계약으로 고정한다. BigInt/다른 RNG로 교체하지 않는다.
- **하나의 action 평가 안에서 field/samples/seed가 같은 모든 bootstrap 출력은 하나의 독립 stream**을 공유한다. 그룹은 raw 입력에 처음 나타난 순서로 처리하고, 그룹 내부 행도 원본 순서를 쓴다. 필드/seed/samples가 다르면 별도 stream이다. 출력 목록의 lower/upper 순서나 추가 mean 출력이 난수 소모를 바꾸지 않는다. level이 다르더라도 동일한 표본 평균 배열을 재사용한다.
- lower/upper는 항상 동일한 추출 평균 배열을 사용한다. 하한만 요청해도 같은 표본을 생성한다. singleton도 samples개 draw를 실제 소모하고 양끝은 그 값이다. 관측0개인 그룹은 기존 empty/missing 결과를 따르며 RNG를 소모하지 않는다. 없는 그룹을 새로 생성하지 않는다.
- 같은 raw 순서/옵션/runtime이면 모든 렌더 및 재물질화에서 동일해야 한다. 그룹 추가/행 순서 변경이 이후 stream에 영향을 줄 수 있다는 점을 문서화한다.

### 자원·불변성과 저장

한 action에서 고유 field/samples/seed별 `samples * 유효 관측 수`를 합한 draw 수가 **50,000,000**을 넘으면 계산 전에 원자적으로 거부한다. CI lower/upper/복수 level 재사용은 한 번만 센다. samples별 평균 배열만 저장하므로 수만 개의 복원 행을 영구 dataset으로 만들지 않는다. 기존 30,000 summary output group/64 aggregate output 등의 한도는 유지한다. 그룹화/산술·결측 오류도 이전 ChartProgram/caller 입력을 변경하지 않는다.

새 method 객체는 기존 summary/interval transform의 method 자리에 정상화하여 저장한다. 재생·serialize/deserialize·edit/materialize·Basic/full 진입점 모두 같은 객체와 수학을 사용한다. 기존 persisted normal/student-t 문서는 바이트 호환 의미를 유지한다. 내부 계산 캐시는 영구 semanticSpec에 넣지 않는다. 렌더러는 이미 물질화된 graphicSpec만 읽는다. 새 통계 알고리즘 외 macro architecture 변화는 없다.

## 그래픽·독립 목표

기존 Area의 lower/upper와 Line의 mean 소비자를 재사용한다. 새 graphical primitive나 척도를 만들지 않는다. synthetic fixture5그룹×5개 비대칭 관측, 95%/1000회/seed1의 정확한 경계로 파란 면적 opacity0.3과 평균선을 그린다. `target.svg`와 수치 증거는 제안 통계의 **독립 기준**이며 아직 지원하지 않는 공개 action의 성공 출력으로 부르지 않는다. 구현 뒤 동일 raw 데이터의 공개 data action→기존 mark 소비자 출력과 비교한다. PNG 생성/DOM 검사는 수행하되 차트 픽셀/VLM 관찰은 하지 않는다.

## 번역 참조 난수 정책 — 별도 함께 승인받을 선택

기존 무시드 부트스트랩 참조는 실행마다 경계가 달라진다. 관련 소스만 **독립된 참조 렌더 프로세스에서 RNG seed1을 설정**하고 원본 명세/데이터를 그대로 실행하여 동결한다. 원본 CI estimator·1000회·95%는 그대로다. 이전 무시드 SVG/compiled/initial-state는 hash와 함께 보관하며 소급 덮어쓰기하지 않는다. 실제 source evaluator의 group/row traversal과 제안 native traversal이 같음을 각 소스에서 증명한다. 다르면 임의 허용오차나 경계 상수로 통과시키지 않고 해당 소스를 보류한다. 다른 기존 완료 차트의 reference/RNG는 바꾸지 않는다. seed는 원본 authored property라고 주장하지 않고 재현 환경 설정으로 기록한다.

## 구현 후 필수 검증과 동기화

비대칭 합성/단일/빈/다중 그룹, 행·그룹 순서, lower/upper 출력 순서, 같은/다른 level·seed·sample, 실제 lower-only, 1/10000 sample 경계, 50,000,000 draw 한계, invalid seed/unknown keys/weighted/regression 거부, 이전 프로그램/caller 불변성, edit/replay/persistence, 정상/t CI 회귀를 검증한다. 독립 숫자 기준과 공개 출력의 정확한 동등성을 요구한다. 기존 면적/선/SVG/Canvas/PDF 소비자에서 재계산 없는 경계·불투명도·plot 배치를 검증한다. source/types/current contract/knowledge-generated references/public docs를 한 기능 checkpoint에서 동기화한다. 승인 전 이 구현만 보류하고 독립 번역은 계속한다.

## 검토 재현

`node agent_docs/impl/bootstrap-mean-ci/review-evidence.mjs`는 현재 공개 API 거부/이전 상태 불변성, fixture 반복 실행의 정확한 수치 동일성, 모든 구간이 평균을 포함하며 비대칭임, 두 primitive의 양수 ink/path와 PNG 생성을 검증한다. 결과는 [target-evidence.json](target-evidence.json), 그림은 [target.svg](target.svg), 실제 제안 호출은 [fixture.mjs](fixture.mjs)다. 승인 후 public 데이터 계산과 기존 Area/Line 소비자를 구현했으며 독립 primitive 및 승인 목표의 RGBA가 정확히 일치했다. [추가 비교 증거](approved-target-comparison.json)를 참고한다. 이미지 픽셀은 검사하지 않았다. 수치 목표는 5그룹 순서대로 mean/low/high = 6.6/0.4/18.4, 8.6/1.6/22, 10/1.2/25.2, 12.6/3.2/29.2, 13.8/2.2/31.6이다.

승인 근거: [approval-evidence.json](approval-evidence.json). 앞서 실제로 요청한 계약·그림과 해당 소스의 seed 1 기준 고정을 승인받았다. 구현 후 통합 검증을 진행하고 있다.
