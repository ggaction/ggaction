# Continuous palette declaration parity

## 진행 상태

- [x] 기존 runtime과 선언의 불일치 확인 (#224).
- [x] 구체 설계 기록 및 현재 작업 범위의 사용자 포괄 승인 재사용.
- [x] 선언, 문서, 계약, 설치된 패키지 consumer 검증 동기화. [RESULTS.json](./RESULTS.json).
- [ ] 검증된 checkpoint commit/push. 정기 배포는 다음 200-family checkpoint에 통합.

## 승인과 배포 범위

사용자는 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고 명시했다. 이 설계는 진행 중인 번역에서 확인한 공개 선언 오류의 수정이며 이 승인 범위 안이다. 별도 승인 질문을 만들지 않는다. 현재 공개 기준은 1,213개이므로 다음 정기 배포는 1,413개 완료 시점이다. 이 checkpoint에서는 npm publish, tag, 문서 배포, 번역 runtime 교체를 하지 않는다.

## 구체 설계

`NonPointContinuousColorScaleOptions.palette`가 기존 공유 `Palette`를 사용하게 한다. 기존 `range`의 `"auto"` 및 최소 두 색의 readonly tuple은 유지하고, runtime이 이미 허용하는 `{ readonly palette: Palette }`만 추가한다. 이렇게 하면 Point/Rect/aggregate Bar의 연속 color, 독립 stroke, `encodeChannels`와 해당 facade가 같은 descriptor를 받는다. Basic에 없는 액션을 새로 노출하지 않는다.

공유 descriptor는 이름, 선택적 숫자 `count`, 두 숫자 `extent`만 갖는다. 잘못된 이름, 문자열 count, 잘못된 extent 길이, 임의 키, 잘못된 range wrapper 및 한 색 array는 계속 TypeScript 오류다. 정수/범위/서로 다른 extent 등의 수치 제약과 range/palette 충돌 검증은 기존 runtime 책임이다. Quantize/quantile/threshold 선언은 이번 범위에 포함하지 않는다.

실행 코드, 통계, 데이터, palette sampling, 기본값, 그래픽 및 저장 schema는 바꾸지 않는다. 따라서 새 시각 목표나 primitive가 필요한 변경이 아니다.

## 검증 계획

1. 수정 전 focused TypeScript consumer가 실제 count/range descriptor 오류로 실패하는 기록을 보존한다.
2. Full/Basic의 기존 color 경로 및 Full stroke/encodeChannels/facade에 대해 positive/negative 선언 검사를 실행한다.
3. 실제 공개 액션에서 top-level palette와 range.palette의 semantic/resolved/concrete 결과가 정확히 같고, count 변경이 gradient stops에 영향을 주며 이전 program과 frozen input이 보존되는지 확인한다.
4. packed package의 실제 `ggaction` import에서도 동일 positive/negative 선언과 JavaScript 결과를 확인한다.
5. unit/contracts/docs 및 선언에 의존하는 생성물을 확인한다. release-only 검사와 실제 registry publication은 200-family 배포 시 별도로 수행한다.

관련 이슈: https://github.com/ggaction/ggaction/issues/224
