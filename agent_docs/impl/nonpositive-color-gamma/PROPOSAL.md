# 0과 음수 Cubehelix lightness gamma

## 진행 상태

- [x] 현재 API의 `gamma > 0` 제한과 실제 필요한 0/-0.1 입력 재현
- [x] 원본 RGB 입력을 사용한 독립 216개 색상 및 원본 784개 점 색상 검증
- [x] 구체적 공개 계약과 경계 수치 결정
- [x] 사용자의 진행 중 작업에 대한 명시적 사전 승인 재사용
- [x] primitive 시각 목표와 실제 공개 호출/픽셀 일치 검증
- [ ] 구현·Current·타입·문서·회귀 테스트 동기화
- [ ] 전체 현재 데이터셋 호환성·설치 패키지·로컬 후보 동기화

## 승인 근거

진행 중 번역/파이프라인/ggaction 작업에 대해 사용자가 직접
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고 지시했다.
그 명시적 범위 안의 다음 구체적 API/수치/시각 결정을 승인된 것으로 기록한다.
새 승인 질문을 반복하지 않는다. 사용자의 이미지 시각 검사 제외 지시에 따라
화면을 보았다고 주장하지 않고 수치·graphic/order·동일 실행 decoded-pixel 검증을 사용한다.
공개 배포는 1,413개 성공 원본 가족 시점이며 이 변경은 그 전에는 검증된 로컬 후보만 허용한다.

## 문제

기존 `gamma`는 양의 유한 수만 허용한다. 원본 두 입력은 각각 -0.1과 0을 명시한다.
기본값이나 다른 색상 척도로 바꾸면 실제 색상이 달라진다.
새 액션·옵션 없이 기존 Cubehelix 계열 `gamma`의 수치 범위만 확장한다.
미구현 상태에서는 Current에 새 동작을 기입하지 않는다.

## 결정된 공개 계약

1. `cubehelix`와 `cubehelix-long`의 `gamma`는 모든 유한 number를 받는다.
   NaN, 양/음 Infinity, 문자열은 계속 거부한다. 기본값 1과 편집의 `"auto"` reset은 유지한다.
   다른 보간 방식의 explicit gamma는 계속 거부한다.
2. Hue와 saturation은 기존 구간 위치 t를 사용하고 lightness만 `t ** gamma`를 사용한다.
   0은 `t ** 0 = 1`이며 `0 ** 0 = 1`도 포함한다. 따라서 lightness는 구간 오른쪽 끝 값이다.
   +0/-0은 같은 색상 결과를 갖는다.
3. 음수 gamma에서 t=0인 경우만 확장 실수 RGB 경계를 허용한다.
   lightness 끝값이 같으면 그 상수를 유지한다. saturation이 0이면 무채색으로 유지한다.
   남은 경계 RGB 채널을 기존 byte 범위로 제한하되 이 경계의 NaN 채널은 0,
   +Infinity는 255, -Infinity는 0으로 한정한다. 특정 팔레트나 원본 번호를 분기하지 않는다.
   예: yellow→red의 시작 색은 black, #75190b→#90f2a4의 시작 색은 cyan이다.
   black→white는 이 경계에서 white이며 동일한 색의 두 끝값은 그 색을 유지한다.
4. t≠0에서 발생하는 비실수·비유한 power 및 음수 gamma의 비유한 RGB 산술은 원자적 오류다.
   위 경계 규칙을 일반 NaN/입력 오류 fallback으로 확장하지 않는다.
5. Clamp는 gamma보다 먼저 적용한다. 여러 색상 stop에서는 각 구간의 지역 t에 같은 규칙을 적용한다.
   역방향 domain, 기존 midpoint/변환 척도, source revision, Canvas replay, facet,
   gradient/sample 범례와 field-driven stroke가 같은 기존 색상 mapper를 공유한다.
6. 기존 양수 gamma, 생략/1, RGB 정규화와 최종 8bit 반올림의 출력은 그대로 유지한다.
   semantic/persistence 필드와 ownership·렌더러·패키지 경계는 바꾸지 않는다.

## 수치 및 시각 목표

`NUMERIC_TARGETS.json`의 24개 벡터는 2개 hue 경로 × gamma 0/-0.1/1 × 4개 공개 RGB 범위,
각 9개 위치로 총 216개 literal RGB 값이다. 현재 입력 두 개의 392+392개 점 색상도 별도로 일치한다.
공개 RGB 입력을 다른 색 공간 값으로 바꿔 놓고 비교하지 않는다.

대표 시각 목표는 기존 `color-controls`의 middle row를 각각 gamma 0/-0.1로 편집한 두 변형이다.
나머지 gamma-one/signed-power 행과 480×270 크기·좌표·화면 순서는 유지한다.
primitive는 독립 literal 색상으로 만들고 공개 코드는 기존 도메인 호출 뒤 `editColorScale`로 표현한다.
범례/점/테두리는 별도 수치·생명주기 테스트로 검증한다.

초기 비공개 수치 초안은 무채색의 0×Infinity를 그대로 계산해 잘못 black을 만들었다.
공개 구현 전 수정된 v2는 saturation=0의 무채색 경계를 보존하며 216개/784개를 모두 통과했다.
실패 기록은 번역 작업공간에 보존한다. 비교 오차는 늘리지 않는다.

## 구현 및 검증 범위

- 공통 grammar validation/mix만 소유자로 유지하고 새 채널별 구현을 만들지 않는다.
- 생성·일반/전용 편집·재인코딩·reset·원자성·immutable input 및 이전 프로그램을 검증한다.
- Full/Basic, 점/테두리/gradient/sample, raw domain 유지, facet/revision/Canvas/persistence를 검증한다.
- 잘못된 숫자/호환되지 않는 모드/비유한 extrapolation, constant range, clamp/reverse/multiple stops를 검증한다.
- 대표 primitive/public의 graphic/order/trace 및 같은 실행 전체 decoded pixels를 정확히 비교한다.
- 정상·타입·설치 consumer·문서 생성/빌드/반응형과 현재 1,292가족/9,414프로그램 호환성을 검증한다.
- 새 버전 공개 배포는 정규 200가족 체크포인트까지 보류하고 issue도 그때까지 유지한다.
