# STEP 3 — Temporal `encodeX`

## 목표

Line mark의 raw x encoding과 time scale block을 `encodeX` Chart API로 교체한다.

```javascript
.encodeX({
  field: "Year",
  fieldType: "temporal",
  scale: { nice: true }
})
```

## 진행 상태

- [x] Point/line mark 공용 position target 해석
- [x] Temporal field 검증과 timestamp 정규화
- [x] `temporal → time`, `quantitative → linear` scale 추론
- [x] `nice`/`zero` option validation과 time-domain resolution
- [x] Cartesian coordinate와 resolved x scale 저장
- [x] Incomplete line path의 graphical materialization 유예
- [x] 별도 actions program의 raw x block 교체
- [x] Unit, acceptance, PNG regression
- [x] 영어 Encoding/scale/action/LLM 문서 갱신

## Action 구조

```text
encodeX(...)
├─ createCoordinate(main, cartesian)
├─ editSemantic(layer[trends].encoding.x.field = Year)
├─ editSemantic(layer[trends].encoding.x.fieldType = temporal)
├─ editSemantic(layer[trends].encoding.x.scale = x)
├─ createScale(x, time, auto, auto, nice = true)
└─ rematerializeScale(x)
   ├─ temporal values 정규화
   ├─ automatic domain 추론과 nice 적용
   ├─ graphical range 추론
   └─ resolved scale 저장
```

## Scale 규칙

- `temporal` position encoding의 기본 scale type은 `time`이다.
- `quantitative` position encoding의 기본 scale type은 `linear`다.
- Field type과 scale type이 일치하지 않으면 오류다.
- `linear`는 `nice`와 `zero`를 지원하고 `time`은 `nice`만 지원한다.
- `ordinal`은 두 option을 모두 지원하지 않는다.
- Explicit domain이 있으면 `nice`와 `zero`는 resolved domain을 수정하지 않는다.
- Automatic domain에서는 `zero`를 먼저 적용하고 `nice`를 적용한다.
- Explicit range는 domain resolution에 영향을 주지 않는다.
- 같은 ID를 공유하는 scale definition이 충돌하면 오류다.

## Line graphic 처리

x encoding만으로는 series grouping과 y position을 결정할 수 없다. 따라서
`rematerializeScale`은 resolved time scale을 저장하되 incomplete line path를
수정하지 않는다. STEP3 actions program은 helper가 계산한 concrete path를 이후
primitive call로 계속 적용한다.

```text
x만 있음             -> resolved x scale, empty path
x + y + grouping 있음 -> 이후 action에서 path materialization
```

STEP1 primitive program과 test는 변경하지 않는다.

## 구현 순서

1. Temporal value, time scale, calendar nice domain validation을 구현한다.
2. `createScale`과 `rematerializeScale`을 time/nice 정책으로 확장한다.
3. `encodeX`가 line temporal target을 해석하도록 일반화한다.
4. Incomplete line consumer는 resolved scale만 저장하도록 한다.
5. Unit test로 semantic, resolved scale, trace, validation, immutability를 검증한다.
6. Actions program의 raw x encoding/scale block만 `encodeX`로 교체한다.
7. Acceptance와 PNG regression으로 기존 결과 보존을 검증한다.
8. 영어 public/LLM 문서를 현재 API와 맞춘다.

## 제외 범위

- Mean aggregation과 aggregate-aware `encodeY`
- Series grouping과 sorting
- Line path points 자동 materialization
- Color와 strokeDash encoding
- Time axis domain action

## 검증 결과

- Unit/acceptance test 163개 통과
- PNG render regression 5개 통과
- STEP1 primitive line program과 test 변경 없음
- 기존 quantitative point x/y encoding 결과 유지
- Actions program의 최종 semantic/graphic chart contract 유지
- Temporal x scale은 UTC timestamp domain과 Canvas x range로 resolve
- `createLineMark().encodeX()` 직후 path collection은 빈 상태 유지

## 완료 조건

- Actions program에서 x 관련 raw `editSemantic` 호출이 사라진다.
- Semantic spec에 temporal x encoding과 time scale policy가 남는다.
- Resolved x scale에 concrete timestamp domain과 graphical range가 남는다.
- `createLineMark().encodeX()`는 path를 임의로 생성하지 않는다.
- 기존 point encoding, primitive line chart, scatterplot 결과가 유지된다.
- 관련 test와 문서가 통과하고 변경이 commit/push된다.
