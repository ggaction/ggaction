# STEP 7 — Renderer and Source Package Boundary

## 진행 상태

- [x] Canvas context/root/nested lifecycle owner 검토
- [x] Primitive drawer dispatch와 concrete schema boundary 검토
- [x] Assembled/core ChartProgram naming과 registration boundary 정리
- [x] Browser/extension/PNG dependency isolation 재검증
- [x] 불필요한 renderer rewrite를 하지 않았는지 review

현재 renderer가 이미 작고 명확하면 no-op 결론도 올바른 완료 결과다.

## 결과

- Canvas renderer는 context validation, root/nested Canvas scope, tree traversal과 primitive drawer가 이미 명확히 분리되어 있다.
- Drawer는 concrete `graphicSpec`만 읽고 shared graphic-tree/schema validation과 충돌하는 semantic inference를 하지 않는다.
- `src/ChartProgram.js`는 registered assembled subclass, `core/ChartProgram.js`는 immutable state class로 이름과 책임이 구분된다.
- Default와 extension entry에는 Node dependency가 없고 PNG entry만 Canvas adapter와 `node:fs`/`node:path`를 소유한다.
- Renderer rewrite는 실질적인 단순화 없이 위험만 늘리므로 수행하지 않았다. Renderer/package/source-boundary tests 44개와 import cycle 0을 확인했다.
