# STEP 3 — Gate K-A Primitive Layered Chart

## 진행 상태

- [x] Low-level semantic and graphic primitive chain
- [x] Shared x/y axis와 horizontal grid
- [x] Bar center와 line vertex alignment assertions
- [x] Gate manifest와 exact target call chain
- [x] Browser-independent high-DPI PNG render entry

Primitive는 `createBarMark`, `createLineMark`, `encodeX`, `encodeY`를 호출하지 않는다. Cars rows와 reference
oracle에서 계산한 final rect/path/axis/text geometry를 explicit `editSemantic`, `createGraphics`,
`editGraphics` chain으로 author한다. Gate 승인 뒤 같은 결과를 public action chain으로 구현한다.
