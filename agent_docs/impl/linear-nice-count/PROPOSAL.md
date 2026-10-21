# Linear scale의 count 기반 자동 범위 확장

관련 공개 이슈: [#255](https://github.com/ggaction/ggaction/issues/255).

## 진행 상태

- [x] 기존 공개 API의 독립 패널 자동 범위 차이를 재현했다.
- [x] 새 공개 옵션 없이 explicit domain과 concrete path로 목표를 만들었다.
- [x] 목표 primitive/explicit control의 SVG·PNG와 숫자 근거를 검증했다.
- [x] API·저장 schema·시각 목표 Gate에 기존의 직접 사용자 승인을 재사용한다.
- [x] 검증된 이 검토 패키지를 commit/push했다 (`9b5a0fb1`).
- [x] 구현, 현재 계약, 선언, 문서, 생성물, 예제와 회귀를 함께 검증했다. `EVIDENCE.json` 참조.
- [x] 공개 배포 없이 구현 checkpoint `9df5a5cd`를 commit/push했다. 최종 검증 metadata를 함께 보존한다.

## 승인 근거와 범위

사용자는 이 번역·파이프라인·라이브러리 수정 작업에 대해 직접
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고
지시했다. 이 결정에는 아래에서 구체화한 공개 옵션·저장 schema와 concrete 시각 목표에 대한
앞으로의 질문도 포함한다. 매 설계마다 같은 승인을 다시 묻지 않는다. 사용자가 이미지를 직접
검토했다고 기록하지 않으며, 현재 작업의 이미지 수동 검사 금지에 따라 숫자/graphic/동일 실행의
decoded pixel 검증만 한다. 기존 boolean 동작·기본값·정밀도·원본 데이터 보존은 유지한다.
다음 정규 공개 배포는 마지막 공개 1,213개에서 200개가 추가된 1,413개 완료 시점이다.

## 문제와 목표

독립 Y scale을 쓰는 패널에서 기존 `nice:true`의 올림 규칙은 의도된 기존 동작이다.
그러나 tick 밀도 기준으로 자동 범위를 정하려는 설계는 같은 규칙으로 표현할 수 없다.
예를 들어 원본 관측 범위 `[0,108]`을 `[0,110]`으로 확장하려 해도 현재는 `[0,120]`이 된다.
전체 chart에서 하나의 explicit domain을 쓰면 독립 패널이라는 의미가 사라진다.

대표 숫자 목표는 입력 상한 `133,108,171,107,139,116`에 대해 각각
`140,110,180,110,140,120`이다. 모든 하한은 0이다. 기존 boolean 결과
`150,120,200,120,150,120`은 그대로 유지한다. 눈금 레이블만 바꾸지 않고 실제 scale domain과
모든 마크/가이드 위치를 함께 계산해야 한다.

## 선택한 공개 계약

기존 `nice`를 확장한다. 새 액션이나 수동 패널 도메인 표는 추가하지 않는다.

```js
chart()
  .createData({ values })
  .createLinePlot({
    x: "x",
    y: { field: "y", scale: { zero: true, nice: { count: 10 } } },
    guides: false
  })
  .facet({ field: "group", scales: { y: "independent" } });
```

- 생략/`false`/`true`는 현행 동작과 출력 bytes를 유지한다.
- 새 object는 정확히 `{count}` 한 key만 받는다. `count`는 양수 safe integer다.
  이 수는 domain 확장의 밀도이며 실제 guide tick 개수를 고정하지 않는다.
- object는 **linear position scale**에만 허용한다. time, transformed, discrete, color, size 및
  별도로 nice를 금지하는 measured radius 등에는 기존 역할 검증과 함께 명시적으로 거부한다.
- 자동 domain에만 적용한다. `zero` 포함 뒤 계산하며 explicit domain과, zero 적용 뒤에도 같은
  값으로 남은 constant domain은 유지한다.
- span/count의 decade를 기준으로 1·2·5·10 중 기하 중점(sqrt2, sqrt10, sqrt50)으로 step을 고른다.
  경계를 바깥쪽으로 정렬하고 step이 안정될 때까지 유한한 횟수로 다시 계산한다.
- subnormal/큰 유한 수는 기존 numeric 정규화 책임 안에서 처리한다. 결과는 유한하고 입력 관측값을
  포함하며, 표현 불가능한 더 미세한 확장을 만들지 않는다. 숫자 오차 허용을 넓히지 않는다.
- generic/focused scale editor, 기존 position encoding과 facade creation이 같은 정규화/계산을 쓴다.
- bin을 사용하는 linear position도 같은 최종 domain 정책을 쓴다. 새 count object에서는 기존
  `nice:true`의 bin 경계와 소속을 먼저 유지하고, 그 최종 경계 범위에 count 올림을 적용한다.
  예를 들어 명시적 bin 경계 `[0,54,108]`은 그대로 두고 자동 domain만 `[0,110]`으로 확장한다.
  명시적 scale domain이 우선하며 기존 bin/domain 정합 검사는 유지한다. 데이터 변환
  `createBinData.nice`는 기존 boolean 전용이다.
  이 보완은 최종 시각 grouping에서 domain을 계산한다는 기존 범위에 포함하며 위 승인을 재사용한다.
- caller object를 복사해 불변 semantic scale의 `nice:{count}`에 한 번 저장한다. 복제, 데이터 수정,
  filter, shared/independent facet, 직렬화/역직렬화에서도 같은 공개 의미를 유지한다.
- 명시적 잘못된 옵션은 atomic하게 거부한다. scale type 변경 시 기존 boolean 호환 정책은 유지하며,
  새 type과 호환되지 않는 이전 count object는 기존 type-change reset 경계를 따라 제거한다.

## 시각 목표

[`target.mjs`](target.mjs)의 명시적 path와 기존 explicit-domain control이 목표다.
Canvas는 260×170, plot은 200×120, margin은 left40/top20/right20/bottom30이다.
Y `[0,110]`에서 `[0,54,108]`은 각각 `140`, `81.0909090909091`, `22.181818181818187`에
그려진다. X `[0,0.5,1]`은 `40,140,240`이다. 선은 기존 blue/2px, dash 없음이다.
새 public flow가 이 primitive/control과 정확한 graphicSpec·동일 실행의 decoded PNG를 만들도록 한다.
검증은 `node agent_docs/impl/linear-nice-count/reproduce-target.mjs`로 재현한다.
공개 옵션 구현 전의 근거는 [`TARGET_EVIDENCE.json`](TARGET_EVIDENCE.json)에 보존한다.

## 소유권·검증·호환

기존 pure continuous-domain 계산과 scale-definition 정규화가 각각 계산/입력 소유권을 유지한다.
materializer/renderer로 분기 규칙을 옮기지 않고 기존 wrapped rematerialization을 사용한다.
새 module 경계나 별도의 persisted 상태 소유자는 필요하지 않다.

필수 검증은 literal/독립 수학 oracle, 모든 기존 boolean 동작, 잘못된 shape/type/count의 atomic성,
explicit/constant domain, 음수/역방향 range/zero, 유한 극값과 subnormal, generic/focused edits,
shared consumer, raw data 보존, revision/filter, facet 독립 범위, persistence, Full/Basic/packed
consumer/types, primitive/public SVG·PNG·PDF, 문서/카드/생성물과 새 예제다.
현재 완료된 1,307개/9,534개 프로그램 전체는 설치 후보 적용 전에 순차 native replay로 다시 비교한다.
실제 측정된 파일/byte 증가가 있을 때만 기존 package/bundle 예산의 최소 증가를 기록한다.
현재 공개 패키지와 viewer는 배포 시점까지 유지하며 새 라이브러리 기능을 외부에 배포했다고 하지 않는다.
