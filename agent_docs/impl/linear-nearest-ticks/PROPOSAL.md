# Linear Cartesian axis의 nearest-step 자동 눈금

공개 이슈: [#256](https://github.com/ggaction/ggaction/issues/256).

## 진행 상태

- [x] 기존 API·facet 소유권·공개 이슈 목록과 원본의 실제 SVG 눈금을 조사했다.
- [x] literal primitive와 기존 explicit-values control이 정확히 같은 graphicSpec인지 확인했다.
- [x] 같은 실행 SVG·PNG·decoded pixels 및 plot ink820pixels를 검증했다. `TARGET_EVIDENCE.json` 참조.
- [x] 아래 구체적 API·저장·시각 목표에 사용자의 직접 standing approval을 재사용한다.
- [ ] 검토 패키지를 commit/push한 뒤 구현한다.
- [ ] 기존 동작·선언·현재 계약·패키지·문서·예제·회귀를 함께 검증한다.

## 승인·배포 범위

사용자는 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고
직접 지시했다. 현재 번역/라이브러리/파이프라인 작업 범위에서 아래 공개 옵션, 저장 형식, concrete
시각 목표와 편집 동작에 관한 앞으로의 질문도 승인된 것이다. 구체적 설계와 검증은 유지하며
같은 승인을 다시 묻지 않는다. 이미지를 사용자가 직접 검토했다고 주장하지 않는다. 수동 이미지
검사 금지에 따라 숫자·SVG·graphicSpec·동일 실행 decoded pixels만 검증한다.

현재 완료 1,307개/9,534개 프로그램과 School 사용량은 이 준비로 증가하지 않는다.
공개 버전은 1,213개 기준선을 유지하며 다음 정규 배포는 완료 1,413개다. #255 개발 후보는
`b77d9a56`에서 검증·push되었으나 번역 환경에 미설치다. 이 기능까지 검증한 후보를 묶어
전체 1,307개 순차 native replay 후 한 번 설치한다. 공개 배포로 표현하지 않는다.

## 문제와 literal 목표

기존 domain `[0,140]`, `count:5`의 실제 눈금은 `0,30,60,90,120`이다.
nearest-step 밀도는 `0,20,40,60,80,100,120,140`을 필요로 한다. 독립 범위
`140,110,180,110,140,120`에는 각각 step `20,20,50,20,20,20`이 필요하다.
기존 count 1~10,000 중 전체 패널에 일괄 적용해 이 결과를 만드는 값은 없다.
명시적 values는 단일 unit에서 가능하지만 canonical source에서 파생되는 독립 facet의
자동 정책은 표현하지 못한다. facet child를 임의 교체하거나 데이터를 수동 분할하지 않는다.

## 공개 옵션과 기본값

```js
program.createYAxis({
  title: false,
  ticksAndLabels: { count: 5, rounding: "nearest" }
});
```

- Cartesian complete axis, tick/label group, focused tick/label create/edit에
  `rounding: "nearest" | "ceiling"`를 추가한다. facade의 nested axis도 같은 선언을 쓴다.
- 생략은 현행 동작·출력 bytes를 유지한다. `"ceiling"`은 기존 step 정책으로 복귀한다.
  `"nearest"`는 span/count에서 1·2·5·10 decade 중 기하 중점으로 step을 고른다.
  count는 정확한 눈금 수가 아닌 밀도이며 기존 양수 정수/10,000 한도를 유지한다.
- 두 명시 값 모두 **linear Cartesian count mode**에서만 유효하다. 같은 호출의 explicit
  values, temporal/transformed/discrete/Polar/Parallel에서는 조용히 무시하지 않고 거부한다.
- count-mode에서 rounding만 편집하면 현재 count를 유지한다. values-mode에서는 count도
  명시해야 count-mode로 바꿀 수 있다. explicit values로 바꾸면 이전 rounding은 제거한다.
- tick/label 생성 때 기존 tick owner가 있으면 생략한 선택 정책을 재사용한다. 명시적으로
  서로 다른 count/rounding/values를 요구하는 label 호출은 기존 충돌 원칙대로 거부한다.
- 새 rounding을 선택한 tick owner의 count/rounding/values를 편집하면 존재하는 labels와
  inferred grid를 순서 있는 기존 materialization plan으로 함께 갱신한다. 새 policy가 없는
  legacy 편집 흐름은 바꾸지 않는다. focused label은 기존 tick policy와 충돌하면 atomic 거부한다.
- inferred grid는 matching axis owner의 count+rounding을 재사용한다. 복수 owner의 선택 정책이
  다르면 기존 ambiguity 오류를 유지한다. explicit grid count/values는 독립된 기존 정책으로
  되돌리고 이전 inferred rounding을 제거한다. 새 public grid 옵션은 추가하지 않는다.

## 저장·계산·수치 경계

기존 axis tick/label guide config의 선택 정책에 명시 rounding을 저장한다. 별도 숨은 facet
override나 데이터 수정을 추가하지 않는다. 명시값은 enum 검증하고 caller/이전 program은
불변으로 유지한다. persisted replay, named axes, Canvas/data/scale 재계산과 독립 facet에서
동일한 실제 child domain을 사용한다. 지원하지 않는 scale로 바꿔 정책을 유지할 수 없으면
원래 program을 보존하고 거부한다.

#255의 nearest increment 계산은 기존 numeric grammar의 공유 helper로 옮겨 domain과 ticks의
단일 책임으로 재사용한다. legacy ceil path는 유지한다. 소수는 reciprocal increment로
정수 인덱스를 사용하며 유한 극값은 기존 정규화 책임을 재사용한다. ticks는 domain 안에서
유한·오름차순·중복 없음으로 제한하고 10,000 item 한도를 유지한다. constant domain은
한 값이다. 기존 오차 허용을 늘리거나 label만 바꾸지 않는다. renderer/상태 소유권의 거시
구조 변경은 없다.

## 시각 목표

[`target.mjs`](target.mjs)의 literal primitive와 기존 explicit-values control이 목표다.
Canvas260×170, plot200×120, margin left40/top20/right20/bottom30이다.
선은 `(40,140) → (240,26)`, Y axis는 x40/y140→20, ticks는 x34→40이다.
8개 y좌표는 `140 + value/140 * (20-140)`이고 label은 x28, right/middle,
sans-serif12/normal이다. 모든 위치/paint/순서를 literal로 고정한다.
새 public call은 control의 values만 `{count:5,rounding:"nearest"}`로 바꾸며
graphicSpec·renderer calls·SVG·동일 실행 decoded PNG가 정확히 일치해야 한다.

## 검증과 동기화

필수: literal/독립 수학 oracle, 양·음·역방향·상수·소수·극값·한도, 기존 기본값,
잘못된 enum/mode/type/count atomic성, named owner, Full/Basic, create/edit/reset,
label만 있는 axis, inferred/explicit grid 및 stale policy 제거, data/Canvas/scale,
독립 facet의 6개 실제 범위, 불변성과 persistence 검증.

현재 AXES 계약·선언과 exports·생성 cards/reference·사용자 문서·동일 canonical 예제·
primitive/public slice·실제 browser·SVG/PNG/PDF·packed consumer를 함께 갱신한다.
패키지와 bundle/search 증가분은 실제 측정한 경우 최소1000bytes 단위로만 반영한다.
과거 실패/재시도와 모든 actual School code/source/hash/사용량은 유지한다.
