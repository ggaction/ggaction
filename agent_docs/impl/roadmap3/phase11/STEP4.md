# STEP 4 — F-015 Scale Palette and F-014 TypeScript Extension

## 진행 상태

- [ ] F-015 exact runtime/type controls 실행
- [ ] Sequential `palette.count` public 정책 확정
- [ ] Scale runtime, declaration, 일반/LLM 문서와 회귀 동기화
- [ ] F-014 strict NodeNext reproduction 실행
- [ ] Subclass-preserving official TypeScript authoring pattern 구현
- [ ] Fresh installed-package compile/runtime 검증

F-015는 top-level palette와 `range.palette`가 같은 family policy를 사용하게 한다. F-014는 cast나 private
knowledge 없이 strict TypeScript extension을 작성하고 custom action 뒤에도 subclass method를 체인할 수 있는
공식 패턴을 제공한다.
