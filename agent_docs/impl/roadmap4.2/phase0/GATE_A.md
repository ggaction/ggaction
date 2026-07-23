# Gate R42-P0-A — SVG and PDF Public Contract Proposal

## Gate state

`ready-for-review`

Complete review package는 remote checkpoint `bcfe14b0`에 있다. 사용자의 명시적 승인 전에는 runtime 구현을
시작하지 않는다.

## Review target

### `ggaction/svg`

```javascript
renderToSVG(
  program,
  { title?: string, description?: string } = {}
): string
```

- Browser와 Node에서 사용 가능한 pure JavaScript entry
- Complete SVG document string 반환
- Logical width/height와 같은 `viewBox`
- Optional escaped `<title>`/`<desc>`
- DOM, filesystem, Node builtin과 native module dependency 없음

### `ggaction/pdf`

```javascript
await renderToPDF(program, {
  output: string,
  metadata?: {
    title?: string,
    author?: string,
    subject?: string,
    keywords?: readonly string[]
  }
});
```

Result:

```javascript
{
  output: absolutePath,
  width: logicalWidth,
  height: logicalHeight,
  pages: 1,
  bytes: byteLength
}
```

- Node-only true vector PDF
- One chart = one page
- Logical Canvas dimension과 숫자상 같은 PDF point dimension
- Missing directory 생성
- `pixelRatio` 없음

## Recommended decisions

1. SVG는 native SVG canvas adapter가 아니라 browser-safe deterministic serializer로 만든다.
2. PDF는 existing native dependency와 shared concrete drawing operations를 사용하고 새 dependency를 추가하지
   않는다.
3. Text는 selectable/searchable text를 유지한다. Text-to-path와 custom font embedding은 연기한다.
4. 현재 Canvas가 지원하는 concrete node/path/paint/clip/order 전체를 첫 release scope로 삼는다.
5. SVG accessible name은 `<title>/<desc>`, PDF는 metadata를 제공한다.
6. Tagged PDF/PDF-UA는 backend와 scope를 크게 바꾸므로 이번 Roadmap의 명시적 non-goal이다.
7. SVG는 deterministic structure를, PDF는 page/vector/text/metadata와 Poppler visual output을 검증한다.

## Compatibility and architecture impact

- Additive package entries이며 existing valid Canvas/PNG call과 output contract를 유지한다.
- Renderer는 계속 fully materialized `graphicSpec`만 읽는다.
- Semantic/materialization/persisted schema와 action trace는 바뀌지 않는다.
- Internal change는 Canvas/PDF concrete drawing reuse를 위한 target lifecycle seam과 SVG serialization owner다.
- Browser-safe default/basic/svg과 Node-only png/pdf dependency boundary를 package tests로 고정한다.

## Evidence

- Current source/API findings: [`STEP1.md`](./STEP1.md)
- Scope/dependencies/completion criteria: [`../ROADMAP.md`](../ROADMAP.md)
- Machine-readable proposal: [`../PROPOSALS.json`](../PROPOSALS.json)
- `npm run test:contracts` — 156/156 pass
- `npm run test:unit` — 1300/1300 pass
- `npm run test:package` — pass, packed `ggaction@0.0.6` consumer verified
- Remote checkpoint: `bcfe14b0` on `origin/codex/roadmap4-2-vector-renderers`

## Approval effect

Approval은 위 public contract와 Phase 순서의 구현을 허용한다. Package publish, documentation deployment, release와
PR creation 권한은 포함하지 않는다. 승인 뒤 Gate state와 exact approved checkpoint를 기록하고 Phase 1을
시작한다.

## Work blocked before approval

- Renderer runtime/internal boundary changes
- Public declarations and package exports
- Current public rendering documentation
- Phase 1 implementation and later Gates
