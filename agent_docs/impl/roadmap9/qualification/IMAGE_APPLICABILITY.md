# 이미지 자체 binding의 적용 여부 정합

## 진행 상태

- [x] 기존 승인, Current, runtime validator와 실제 시험을 독립 대조했다.
- [x] 85 owner checkpoint `6627fb246`를 commit/push한 뒤 별도 변경으로 분리했다.
- [x] 이미지 자체 encodings/scales/guides 3셀만 canonical N/A로 분류했다.
- [x] 구조·음성 회귀와 정확 delta 증거를 고정했다.

2026-11-01 부모의 독립 감사 및 후속 정합 지시에 따른 변경이다. 새 기능 제외나 미구현을
감추는 면제가 아니다. 승인 정본 [I1–I4](../PUBLIC_APPROVALS_20261028.json)의
revision `990315b7`와 [I2 공개 설계](../phase4/images/PUBLIC_DESIGN.md),
[공개 구현 기록](../phase4/images/PUBLIC_IMPLEMENTATION.md)은 단일 image resource mark가
dataset/field/scale을 만들지 않고 자체 field encoding 및 scale/axis/legend binding을
갖지 않는다고 명시한다. 부모는 이 근거와 아래 반례 보존을 확인하고 세 셀만 정합 수정하도록
결정했다. 기존 전체 승인 [remainingApproval](../AUTHORIZATION.json)도 유지하며 재질문하지 않는다.

## 현재 동작과 좁은 적용 범위

정확한 현재 계약은 [MARKS의 createImageMark](../../../contract/current/MARKS.md#createimagemark)다.
기존 dataset/field/scale/coordinate 없음과 data encoding 거부 문장에 이미지 자체
axis/legend binding도 비적용이라는 한 문장을 보완했다. 공개 API, 타입, 저장 schema,
runtime, generated catalog 입력은 바꾸지 않았다.

- `src/materialization/imageState.js`의 `validateImageBinding`은 image layer의 data,
  coordinate, encoding, conditionals binding을 거부한다.
- `src/actions/marks/image/index.js`는 image/alt 및 placement config의 닫힌 옵션을 사용한다.
  `src/grammar/imageMark.js`의 geometry는 현재 plot/명시 viewport로 배치하고 scale을 생성하지 않는다.
- `test/unit/resources/image-resource-lifecycle.test.js`는 dataset/scale/coordinate가 모두
  0인 단일 image, field encoding 거부, opacity highlight 복원, clipped hit/접근성/codec,
  concat과 facet/repeat의 decorative image를 실제로 검산한다.

반례도 그대로 required다. 이미지와 함께 있는 native plot의 axes/legends는 유효하며,
guide reflow가 plot을 움직이면 auto image viewport가 이를 따른다. Facet/repeat decoration,
명시 concat, 이미지 opacity/highlight, selection/hit/접근성 및 네 renderer를 이 세 N/A로
제외하지 않는다. 따라서 사유는 반드시 **image-owned** field/scale/axis·legend binding으로
한정하고 각각 Current의 정확한 발췌에 결박한다.

## 집계와 실패 시험

`test/native-capabilities.json`의 30요구/79 AT group/30행×19열+interaction7 = 577대상은
그대로다. required만 574이며 canonical N/A는 image/encodings, image/scales, image/guides
세 개다. 나머지 29행과 image의 다른 16셀, interaction7축은 모두 required를 유지한다.
기존 owner 배정과 pending, 85셀·Geo8셀 감사 증거를 변경하지 않는다.

`native-capability-completion.test.js`는 이 세 예외의 정확한 reason/Current/excerpt만 허용한다.
다른 모든 required 셀의 임의 N/A, 행·열·interaction 분모 축소, 예외 문구/경로 변조를 거부한다.
기존 actual receipt의 source/hash/contract 변조·잘못된 N/A·N/A를 passed로 세는 음성 시험도
유지한다. Canonical N/A만으로 candidate 또는 실제 결과를 만들 수 없음을 세 셀 각각 검사한다.

새 candidate 결과는 작성하지 않는다. 현재 결과는 79 group 및 577 consumer 모두 pending,
passed 0, 실제 notApplicable 결과 0이다. N/A의 실제 결과 처리는 향후 exact candidate의
manifest와 Current hash를 검증한 정식 qualification이 소유한다.

## 검증 범위

이 변경은 승인된 기존 동작의 applicability 정합이다. canonical 구조/음성 시험과 이미지의
기존 lifecycle owning 시험을 수행하고, Current 보완에 따른 문서/분류 검사만 실행한다.
runtime·renderer·설치본 전체 재검증이나 최종 AT-60/STEP-077을 대신하지 않는다.

최종 집중 결과는 native-completion 18/18(5.488초), 이미지 lifecycle 15/15(0.673초),
action-catalog/documentation-truth 14/14(1.928초), 모두 exit 0이다.
[정확한 입력과 압축 로그](image-applicability-evidence/structure.json)에 보존했다.
별도 delta 검사는 이미지의 이전 requiredConsumers/notApplicable만 복원하면 manifest
전체가 `6627fb246`과 완전히 같음을 확인했다. 소스·타입·공개 API·생성물에는 변화가 없다.
