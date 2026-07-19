# STEP 4 — F-015 Scale Palette and F-014 TypeScript Extension

## 진행 상태

- [x] F-015 exact runtime/type controls 실행
- [x] Sequential `palette.count` public 정책 확정
- [x] Scale runtime, declaration, 일반/LLM 문서와 회귀 동기화
- [x] F-014 strict NodeNext reproduction 실행
- [x] Subclass-preserving official TypeScript authoring pattern 구현
- [x] Fresh installed-package compile/runtime 검증

F-015는 top-level palette와 `range.palette`가 같은 family policy를 사용하게 한다. F-014는 cast나 private
knowledge 없이 strict TypeScript extension을 작성하고 custom action 뒤에도 subclass method를 체인할 수 있는
공식 패턴을 제공한다.

## F-015 결과

- Exact `0.0.3`은 strict TypeScript에서는 호출을 허용하면서 runtime에서
  `Continuous palette does not accept count.`로 거부했다.
- 타입과 focused 문서는 모두 non-categorical palette sampling을 공개하고 있었고, 내부 palette resolver도
  이미 지정된 수의 color sampling을 지원했다. 따라서 sequential 지원이 기존 의도라고 확정했다.
- Sequential `count`는 2 이상의 concrete gradient-stop count다. Top-level `palette`,
  `range.palette`, `encodeColor`, direct `createScale`과 `editScale`이 같은 descriptor를 사용한다.
- 기존 ordinal count 계약은 유지하며, `count: 1`은 semantic state를 만들기 전에 명확히 거부한다.
- Grammar, action, docs와 installed-package 회귀가 top-level/nested 동등성, 연결된 mark/legend
  rematerialization, ordinal control과 caller/prior immutability를 검증한다.

## F-014 결과

- Exact `0.0.3` 문서의 prototype assignment를 strict NodeNext로 옮기면 method assignment와 호출에서
  `TS2339`가 발생하는 것을 확인했다. JavaScript runtime과 interface-merging control은 정상이다.
- `action()` declaration은 wrapped action이 호출된 concrete `ChartProgram` subclass를 반환하도록 generic
  `this`를 보존한다. 이는 runtime의 same-constructor 검사를 타입에 반영한 비파괴적 개선이다.
- 공식 TypeScript 패턴은 wrapped action의 `typeof`를 subclass interface에 병합한 뒤 prototype에
  할당한다. Cast나 옵션/반환 signature 중복 없이 두 custom action을 연속 체인한다.
- 문서의 exact TypeScript module을 fresh tarball 소비자 project로 복사해 `strict: true`, NodeNext,
  `skipLibCheck: false`에서 compile한다. 대응 JavaScript runtime 검사는 subclass instance, 두 root trace와
  빈 action stack을 확인한다.
