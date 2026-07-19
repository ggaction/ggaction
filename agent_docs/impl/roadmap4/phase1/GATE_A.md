# P1-A — B-002 Default Point Radius

## 진행 상태

- [x] 공개 문서의 shortest valid Cartesian point chain 재현
- [x] Polar 대응 체인 재현
- [x] Browser Canvas와 Node PNG 렌더링
- [x] explicit radius와 field-driven size override
- [x] Canvas rematerialization과 immutability
- [x] focused regression 통과
- [x] 전체 test suite 통과
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-19)

## 승인할 executable chain

```javascript
const program = chart()
  .createCanvas({ width: 240, height: 180, margin: 20 })
  .createData({ values: [
    { x: 1, y: 2, size: 1 },
    { x: 2, y: 4, size: 9 }
  ] })
  .createPointMark()
  .encodeX({ field: "x" })
  .encodeY({ field: "y" });
```

별도의 `encodeRadius` 호출 없이 두 concrete circle에 `radius: 3`이 저장된다. Polar
`encodeTheta().encodeR()`도 position radius와 glyph radius를 구분하며 같은 3px glyph 기본값을
materialize한다.

## 승인할 우선순위

```text
field-driven size
  > explicit encodeRadius / encodePointRadius
  > retained concrete size when safe
  > default glyph radius 3
```

기본값은 renderer fallback이 아니다. Point materializer가 backend-neutral `graphicSpec`을 완성하며
Browser Canvas와 Node PNG는 같은 값을 읽는다. 위치가 아직 불완전하면 기본 radius만 앞서
materialize하지 않는다.

## 검증 증거

- 회귀: `test/contracts/point-default-radius.test.js`
- Polar: `test/unit/actions/encodings/polar-position-encodings.test.js`
- focused tests: 29/29 통과
- cumulative suite: 1548/1548 통과
- Node PNG: 2x physical output `480 × 360`, PNG signature 검증
- Browser Canvas: mock Canvas arc radii `[3, 3]`

## 호환성과 문서 영향

- Public action signature와 TypeScript declaration 변경 없음
- `semanticSpec` 변경 없음
- Explicit radius와 size encoding은 기존대로 우선함
- Release Phase 15에서 Point mark의 3px graphical default를 public docs에 명시

## 승인 후

P1-B 범위인 layered datum rule inheritance provenance를 구현한다. P1-A 승인은 B-001의 구체적
cleanup 정책까지 승인하는 것이 아니다.
