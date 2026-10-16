# 제곱근 색상 구현 결과

## 진행 상태

- [x] 승인 Gate 33ea558e를 확인한 뒤 구현했다.
- [x] 공통 continuous-color vocabulary와 기존 부호 보존 transform mapper를 재사용했다.
- [x] 색상·선색·그라데이션·샘플 심볼과 Full/Basic 생성 경로를 연결했다.
- [x] 공개 타입·현재 계약·공개 문서·생성 참조를 동기화했다.
- [x] 집중 테스트와 단위/계약/문서 회귀를 검증했다.

## 구현

기존 sqrt position 계산을 색상 비율에도 사용한다. 새 액션이나 exponent 옵션을 만들지 않았다.
원본 값/domain을 저장하며 sqrt 고정 exponent는 semantic parameter로 추가하지 않는다.
양수·음수·0 통과·역방향 domain, clamp/reverse, 기존 모든 보간 모드와 palette를 재사용한다.
범례 눈금 위치와 샘플 색도 같은 척도를 사용하고 type edit는 기존 transaction으로 소비자를 갱신한다.
Lab/HCL whitepoint와 기존 sequential/log/symlog 수식은 변경하지 않았다.

## 검증

- `square-root-color.test.js`: 11개 통과. 수치 불변성, 모든 보간, gradient/symbol,
  text/rect/aggregate bar/stroke, type 전환, 잘못된 옵션의 원자성, Basic, facet/repeat, 저장·복원·범례 제거를 검사했다.
- 기존 transformed-color 7개와 공개 타입 테스트 1개를 함께 실행해 19개 통과.
- 전체 unit 2,954개 통과(동시에 준비 중인 독립 raw-row-key 테스트 8개 포함).
- 전체 contracts는 530개 통과 후 기존 닫힌 literal 개수 기대값 665를 신규 sqrt 도달 경로를 포함한 677로 갱신했다.
  변경한 nested role 계약 4개를 재실행해 모든 677개 실제 public-call witness를 통과했다.
- 전체 docs 120개 통과. 먼저 descriptor를 생성하고 마지막에 provenance/machine/LLM 산출물을 갱신했다.

## 통합 의무

stable 번역 runtime은 이 feature checkpoint로 자동 변경하지 않는다. 통합 담당자가 pin/docs를 함께
갱신한 뒤 영향받는 번역과 native-HCL source/hash 증명을 다시 렌더링·검증한다.
color mapper 파일 SHA가 바뀌므로 기존 HCL 승인 파일을 새 runtime에 그대로 재사용하지 않는다.
패키지·사이트 배포와 PR 생성은 이번 구현에 포함하지 않는다.
