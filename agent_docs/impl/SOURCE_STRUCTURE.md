# Source Structure Refactor

## 목표

기존 동작, public API, semantic/graphic schema를 변경하지 않고 `src/`의 파일
책임과 module boundary를 명확하게 정리한다.

## 진행 상태

- [x] Action category directory와 명명 규칙 통일
- [x] 중앙 `registerActions` 경계 추가
- [x] Encoding action 책임별 분리
- [x] Primitive action 세 연산 분리
- [x] Categorical legend option/recipe/resolve/layout/materialization 분리
- [x] Program core와 Grammar-of-Graphics 계산 분리
- [x] Canvas renderer primitive별 분리
- [x] 전체 unit/acceptance와 PNG regression
- [x] 브라우저 example 최종 검증

## 현재 경계

```text
src/
├─ actions/       domain action과 registrar
├─ core/          ChartProgram, action wrapper, immutability, base specs
├─ grammar/       scale, coordinate, histogram, line, tick, schema 계산
├─ layout/        Canvas와 plot bounds 계산
└─ renderers/     Canvas primitive dispatch와 Node PNG adapter
```

`ChartProgram`은 `actions/index.js` 하나만 통해 action을 등록한다. Encoding,
primitive, categorical legend, Canvas renderer는 각 책임별 module을 가지며 해당
directory의 `index.js`가 조립 경계다.

## 유지한 계약

- Public package exports와 user-facing action chain
- Immutable `ChartProgram`
- Semantic/graphic state와 action trace
- Renderer의 `graphicSpec`-only 동작
- Browser Canvas와 Node PNG 출력

## 검증 결과

- 전체 unit/acceptance test 266개 통과
- PNG render test 9개 통과
- Histogram browser example `432×460`, `406 cars binned` 확인
- Browser console/page error 없음
