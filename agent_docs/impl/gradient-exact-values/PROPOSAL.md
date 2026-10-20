# 그라데이션 범례의 명시적 눈금 값

## 진행 상태

- [x] 현재 공개 API와 재현 검토
- [x] 구체적인 설계 및 수치 목표 기록
- [x] 기존 사용자 승인 재사용
- [ ] 구현·동기화·검증
- [ ] 현재 번역 전체 호환 검증 후 로컬 후보 활성화
- [ ] 200개 추가 완료 릴리즈에서 공개 검증

## 승인 근거

사용자의 직접 지시: “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”. 이전의 필요한 ggaction/파이프라인 수정 지시와 함께 이 구체적인 범례 개선에 적용한다. 승인 질문을 다시 하지 않는다. 실제 차트 이미지 검사 제외 지시를 지키며, 수치·SVG 구조·출력 등가성을 검증한다. 독립적인 공개 배포는 하지 않으며 다음 1,413개 완료 시점에 통합한다.

## 문제와 변경 범위

기존 `createLegend`/`editLegend`의 `values`는 명시적 표본을 받지만 그라데이션 범례에서는 거부된다. 실제 원본의 [35,85] 척도 위 [40,60,80] 눈금을 보존할 수 없다. 기존 색상과 stroke의 연속 그라데이션에 같은 옵션을 허용한다. 새 액션이나 렌더러 옵션은 추가하지 않는다. opacity 등 기존 표본 범례의 계약은 유지한다.

```js
program.createLegend({ values: [40, 60, 80] });
program.editLegend({ values: [40, 60, 80] });
program.editLegend({ values: 'auto', count: 5 });
```

## 정확한 계약

- 기존 공유 sampling 정책을 사용한다. 명시 값은 1~100개의 유한한 엄격 오름차순 고유 숫자이며 실제 척도 domain 안에 있어야 한다. log 척도에서는 양수여야 한다.
- 생성에서 `values` 생략 시 기존 자동 눈금·저장 구성·그래픽을 바이트 단위로 유지한다. 생성의 `values:'auto'`는 기존 표본 API처럼 거부한다.
- 명시 값과 `count` 동시 지정은 거부한다. 편집 생략은 기존 값을 유지한다. `values:'auto'`는 기억된 자동 count로 복원하며 같은 호출의 count를 허용한다. 명시 값이 활성화된 상태의 count만 변경은 거부한다.
- 명시 눈금은 실제 scale mapping으로 위치를 계산한다. 선형·역방향·log·pow·sqrt·symlog·midpoint를 포함한다. 명시 값에 midpoint나 domain 끝을 자동으로 삽입하지 않는다.
- 연속 색상↔원형 표본 표시 전환은 같은 명시 값을 유지한다. 척도 family 전환이 명시 값을 버려야 하면 먼저 reset/remove를 요구한다. 유효하지 않은 척도 domain 편집은 원본 객체와 trace를 변경하지 않고 거부한다.
- 단일 block의 `editLegendBlock`은 기존 gradient 제한을 유지한다. 눈금은 기존 `editLegend({channel:...})`로 선택해 편집한다. facet 공유 범례는 같은 의미의 sampling만 결합하고 서로 다르면 거부한다.
- 상태는 기존 guide config의 sampling 한 곳에 저장하고, renderer는 기존 concrete graphics만 읽는다. 새 persisted schema vocabulary는 없다.

## 수치 목표와 검사

[35,85]에서 [40,60,80]의 정규화 위치는 정확히 [0.1,0.5,0.9]다. 길이125인 세로 범례라면 위쪽 원점에 대한 y 위치는 [112.5,62.5,12.5]이며, 색상 띠·마크·domain은 변하지 않는다. 단일값·역방향·변환 척도도 독립 계산한다. caller 입력과 과거 program 불변성, 생성/편집/reset/재할당/serialization/rematerialization, Canvas/SVG/PNG/PDF를 검사한다. 원본0193은 School 요청 전 보류하며 수정된 불변 패키지 및 일치 문서로 다시 검증한다.

## 구현 체크포인트

공유 sampling·기존 gradient layout/action만 수정한다. 선언·현재 계약·사용자 문서·생성 catalog/LLM 문서를 함께 갱신한다. 기존 자동 출력의 전체 1,288 family/9,382 program 호환 검사를 통과해야 로컬 활성화한다. 호환 검사는 이전 번역의 의미 검사를 새로 완료했다는 주장이 아니다.
