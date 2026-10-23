# 기존 formatter와 선언·문서의 일치

관련 이슈: https://github.com/ggaction/ggaction/issues/237

## 진행 상태

- [x] 현재 runtime의 grouped number/UTC weekday 구현과 기존 단위 검사를 확인했다.
- [x] 공개 선언이 해당 이미 지원된 literal을 빠뜨린 원인을 확인했다.
- [x] 사용자의 기존 범위 내 미래 질문 승인과200-family 공개 배포 정책을 재사용한다.
- [x] 선언·Current·공개 문서·생성물과 TypeScript consumer 검사를 맞춘다.
- [x] normal·실제 installed package를 검증하고 checkpoint를 저장한다.
- [x] executable package byte identity로 기존 cohort 증명의 재사용 여부를 검증한다.

사용자는 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는200개 단위로 하자”라고
명시했다. 이 보완은 이미 존재하는 public runtime 형식에 선언을 맞추는 같은 작업 범위이며 다시 묻지 않는다.
새 runtime option·동작·기본값·저장 필드·renderer·시각 목표는 추가하지 않는다.

## 확정 범위

`NumericFormatString`에 기존 runtime의 `","`와 `,.<precision>f`를 추가한다. Precision은 기존
ValueFormatPrecision의0~12와 허용된 leading-zero 표기만 사용한다. Grouped percent/scientific은 계속
거부한다. 기존 TimeAxisDirective에는 runtime에 이미 있는 `a`를 추가한다. Bare `%a`와
`%a %d`를 TypeScript 소비자가 사용할 수 있어야 한다.

실행 동작은 기존 `src/grammar/valueFormat.js`와 그 normal unit test가 소유한다. 그 구현은 바꾸지 않는다.
선언·Current AXES/ENCODINGS·공개 축 문서·생성 reference를 동기화하고 Full/Basic positive와 invalid
literal negative 검사를 추가한다. Node package consumer에도 기존 실제 grouped 출력과 맞는 typing을
포함한다. 최초 발견한 source0702는 데이터나 label map을 합성하지 않고 기존 `format: ","`로
숫자26개를 원본처럼 표시할 수 있다.

## 호환성·활성화 조건

현재1ec40344epoch의 실제1275families/9278programs exact native replay는 보존한다. 새 package의
모든 executable source와 runtime 입력이 기존과 byte-identical임을 증명할 때만 그 실행 증거를 재사용한다.
차이가 있으면 해당 증명을 무효로 하고 새 실제 cohort replay를 수행한다. 선언·문서 차이는 정확히
열거하고 실제 installed TypeScript 및 public runtime 소비자를 검사한다. 새 docs는 새 commit에 묶어
별도 snapshot을 만들며 source/School code와 이전 contract/proof는 수정하지 않는다. 공개 배포와 이슈
정리는 기존1413checkpoint까지 보류한다.
