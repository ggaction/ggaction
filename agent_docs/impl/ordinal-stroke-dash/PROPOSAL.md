# 순서형 범주 StrokeDash 필드

## 진행 상태

- [x] 기존 공개 API 실패 재현과 가까운 categorical color/stroke 정책 확인
- [x] 구체 설계 확정 및 사용자 standing approval 재사용
- [x] 구현·단위·타입·불변성·선택·범례·재물질화 검증
- [x] 현재 계약·공개 문서·생성 산출물 동기화
- [ ] 전체 검증 후 현재 후보 브랜치 commit/push
- [ ] 200개 완료 차트 단위 정기 릴리즈에서 배포 및 이슈 종료

## 승인 근거

사용자는 이 진행 중인 차트 번역·파이프라인·ggaction 개선 작업에 대해
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고 명시했다.
이 설계는 그 범위 안의 구체 공개 API 결정이며 추가 질문을 하지 않는다.
현재 공개 런타임과 이전 차트 기록은 유지하고 검증된 변경만 후보 브랜치에 모은다.
이 변경은 새 도형이나 새 시각 목표를 추가하지 않는다. 같은 명시적 domain/range를 쓰는 기존
nominal 대시 출력과 ordinal 대시 출력이 픽셀 단위로 같아야 한다.

## 공개 계약

기존 `encodeStrokeDash({ field, target?, fieldType?, scale? })`의 `fieldType`에 `"ordinal"`을 허용한다.
생략 기본값은 기존 `"nominal"`이다. Categorical color/stroke와 같은 기존 validator를 재사용한다.
Constant 모드의 허용 값·배타성·타입/scale 거부 정책은 유지한다. 새 action이나 option key는 없다.
Line/rule과 이를 조합하는 기존 `createLinePlot`, `encodeChannels` 경로가 같은 결정을 사용한다.

`fieldType`은 semantic encoding에 그대로 저장한다. 범주 값과 raw 데이터 타입은 변환하지 않는다.
Ordinal lookup scale은 기존 first-appearance 자동 domain과 명시적 ordered domain을 그대로 사용한다.
Ordinal이라는 이유로 raw rows, path group, vertex order 또는 범주 domain을 자동 정렬하지 않는다.
저장 스키마의 새 key/형태를 추가하지 않고 이미 존재하는 `fieldType`의 허용 값을 확장한다.

기존 explicit/implicit series identity, series 안의 한 raw appearance 값 제약, target 모호성,
scale 재할당·편집, constant 전환, 범례와 선택/강조, 불완전 position의 지연 materialization,
원자적 실패 및 immutable 이전 프로그램을 유지한다. Quantitative/temporal dash 필드는 계속 거부한다.
기존 even-length non-negative dash validation과 `[1,0]` 같은 유효한 zero-gap 패턴을 유지한다.

## 검증 목표

- 생략/명시 nominal의 semantic·graphic·SVG 결과는 기존과 동일하다.
- Ordinal 필드의 의미는 보존되고 명시 domain/range 순서와 zero-gap 패턴을 정확히 따른다.
- 같은 explicit domain/range인 nominal/ordinal의 현재 동일 renderer SVG와 decoded PNG는 같다.
- Line/rule, facade/group, bulk encoding, scale edit, constant/field 재할당, selection,
  persisted program 복원 및 SVG/PNG/PDF 내보내기에서 결정이 보존된다.
- 잘못된 타입, 범주 값, series 안의 conflicting raw 값과 잘못된 범위는 이전 상태/trace를 바꾸지 않는다.
- 공개 타입의 positive/negative consumer와 동기화된 계약·action cards·문서 생성 검사를 통과한다.

## 배포

일반 배포는 누적 1,413개 성공 차트 checkpoint에서 다른 검증된 후보 수정과 함께 진행한다.
이 제안 또는 후보 commit은 공개 배포를 의미하지 않는다. 영향을 받는 미번역 차트는 공개 런타임의
지원 여부를 정직하게 기록하며 배포 전 조용히 후보 런타임으로 전환하지 않는다.

## 검증 완료

전체 4,777개와 단위/타입 16개, 문서/브라우저/packed consumer가 통과했다.
[RESULTS.md](RESULTS.md)와 hash-bound [RESULTS.json](RESULTS.json)에 기록했다.
원격 checkpoint 영수증은 번역 파이프라인의 issue233 후보 checkpoint에서 추적한다.
