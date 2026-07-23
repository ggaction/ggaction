# Roadmap 4.2 — SVG and PDF Vector Renderers

> **문서 상태 — 완료된 실행 기록.** 2026-07-23 R42-Exit 승인을 받아 Phase 0~4와 Roadmap 4.2를
> 완료했다. 현재 observable behavior는 [`ACTION_INDEX.json`](../../contract/ACTION_INDEX.json)이 소유하며,
> roadmap 상태와 nullable active pointer는 [`../ROADMAP_INDEX.json`](../ROADMAP_INDEX.json)이 소유한다.

## 목표

동일한 fully materialized `graphicSpec`을 Browser Canvas, Node PNG, SVG, PDF에서 일관되게 출력한다.
SVG와 PDF renderer는 semantic state를 읽거나 누락된 graphical 결정을 추론하지 않으며, backend object를
program에 저장하지 않는다.

사용자가 승인한 기본 방향은 다음과 같다.

1. `ggaction/svg`는 DOM과 filesystem에 의존하지 않는 browser-safe entry다.
2. `renderToSVG(program, options?)`는 SVG document string을 반환한다.
3. `ggaction/pdf`는 Node-only entry이며 true vector PDF file을 쓴다.
4. `renderToPDF(program, { output, metadata? })`는 한 chart를 한 page에 기록한다.
5. Text는 selectable/searchable text로 유지하고 text-to-path와 custom font embedding은 범위 밖이다.
6. 현재 Canvas가 지원하는 concrete `graphicSpec` 전체를 첫 릴리스부터 지원한다.
7. PDF byte equality 대신 structural assertion, text extraction과 Poppler-rendered visual evidence를 사용한다.

## 범위 원장

| ID | 범위 | 제품 결과 | Phase |
| --- | --- | --- | ---: |
| VR-01 | Public output contracts | `ggaction/svg`, `ggaction/pdf` entry와 반환 계약 | 0 |
| VR-02 | Drawing boundary | Canvas/PDF가 공유할 backend-neutral traversal과 target lifecycle | 1 |
| VR-03 | SVG serialization | browser-safe deterministic SVG document string | 2 |
| VR-04 | SVG accessibility | optional `<title>`과 `<desc>` | 2 |
| VR-05 | PDF output | Node-only single-page vector PDF file | 3 |
| VR-06 | PDF metadata | optional title, author, subject, keywords | 3 |
| VR-07 | Renderer parity | current concrete schema, order, clipping, paint와 text parity | 4 |
| VR-08 | Distribution surface | exports, declarations, docs와 installed-consumer evidence | 4 |

## 최상위 원칙

- Renderer는 `program.graphicSpec`만 읽는다.
- `graphicSpec`은 backend-neutral concrete output이며 SVG/PDF 전용 state를 추가하지 않는다.
- Logical width/height는 backend 사이에서 동일하다. SVG는 같은 user-space 값을 사용하고 PDF는 숫자상 같은
  point 크기를 사용한다.
- Density는 raster concern이다. SVG/PDF public API에 `pixelRatio`를 추가하지 않는다.
- Graphic tree와 item 순서, nested canvas clipping, opacity, dash와 paint는 authored order 그대로 출력한다.
- Text content와 이미 materialized된 position/style을 사용하며 renderer가 wrapping이나 layout을 다시 계산하지
  않는다.
- SVG는 browser-safe dependency graph를 유지한다. PDF와 filesystem/native dependency는 Node-only entry 뒤에
  둔다.
- 기존 `render`와 `renderToPNG`의 observable behavior를 바꾸지 않는다.
- 각 conceptual change는 focused/cumulative verification 뒤 commit하고 current branch에 push한다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | Exact public API, compatibility와 evidence contract; R42-P0-A approved |
| 1 | completed | Shared traversal/drawing target boundary와 Canvas/PNG regression; R42-P1-A approved |
| 2 | completed | Browser-safe SVG renderer, deterministic output와 visual review; R42-P2-A approved |
| 3 | completed | Node vector PDF renderer, metadata와 Poppler visual review; R42-P3-A approved |
| 4 | completed | Full parity matrix, docs/types/package closeout; R42-Exit approved |

## Approval Gates

모든 Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. Gate 승인은 사용자의
명시적 응답 없이 기록하지 않는다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R42-P0-A | 0 | SVG/PDF entry, options, result, environment와 non-goal | 모든 runtime 구현 |
| R42-P1-A | 1 | Shared traversal/target lifecycle과 unchanged Canvas/PNG behavior | SVG 구현 |
| R42-P2-A | 2 | SVG structure, text, clipping, gradient와 rendered appearance | PDF 구현 |
| R42-P3-A | 3 | PDF vector/text/metadata/file contract와 Poppler appearance | Closeout |
| R42-Exit | 4 | Full parity, package consumer, docs/types/tests와 architecture closeout | 완료 선언 |

Visual Gate는 exact executable source, generated artifact, structural evidence와 rendered PNG를 함께 제시한다.
SVG는 browser screenshot으로, PDF는 `pdftoppm`으로 최신 output을 rasterize한 뒤 육안 검사한다.

## 의존 관계

```text
Phase 0 public contract approval
  └─ Phase 1 renderer target boundary
       └─ Phase 2 browser-safe SVG
            └─ Phase 3 Node vector PDF
                 └─ Phase 4 parity and distribution closeout
```

Phase 1은 Canvas의 concrete traversal과 backend target lifecycle을 분리하되 generic renderer framework를 만들지
않는다. SVG는 native Node backend에 의존하지 않아야 하므로 serialization을 독립적으로 구현한다. PDF는
Canvas-compatible native drawing context를 재사용하되 Node-only lifecycle을 adapter가 소유한다.

## 모든 구현 Phase의 공통 완료 조건

1. Renderer는 `graphicSpec` 외 program state를 읽지 않는다.
2. Unsupported/malformed concrete property는 draw 전에 deterministic error를 낸다.
3. Graphic order, collection item order와 nested clip stack을 보존한다.
4. Earlier program과 caller-owned options를 mutate하지 않는다.
5. Logical dimensions와 coordinates가 Canvas, SVG, PDF 사이에서 일치한다.
6. Canvas와 PNG의 existing focused/cumulative tests가 계속 통과한다.
7. SVG output은 deterministic structural tests와 real-browser rendered evidence를 가진다.
8. PDF output은 structural/text checks와 Poppler-rendered evidence를 가진다.
9. Runtime entry, strict declaration, package export, public docs와 installed consumer가 일치한다.
10. Phase Gate package를 commit/push한 뒤에만 다음 Phase 승인을 요청한다.

## Explicit non-goals

- Tagged PDF/UA, interactive PDF, forms, annotations 또는 multi-page composition
- Paper presets, margins, pagination, fit-to-page 또는 print layout engine
- Raster image를 PDF page에 삽입하는 fallback
- SVG DOM mounting helper, filesystem writer 또는 SVGZ
- Custom font registration/embedding API와 text-to-path
- Renderer-side text wrapping, measurement, scale inference 또는 semantic compilation
- Animation, interaction, HTML/foreignObject와 arbitrary SVG injection
- 새 graphical primitive, action, trace node 또는 persisted schema
- Package publish, documentation deployment 또는 release

## Phase 0 — Public output contract

Exact entry/options/result/error/environment contract와 parity/non-goal을 승인한다. Proposal은
[`PROPOSALS.json`](./PROPOSALS.json), evidence와 결정 근거는 [`phase0/`](./phase0/)가 소유한다.

## Phase 1 — Renderer target boundary

현재 Canvas renderer의 graphic tree traversal과 concrete property validation을 보존하면서 root target
dimension/context lifecycle을 분리한다. Browser Canvas와 Node PNG는 public signature와 output behavior를
그대로 유지하며, PDF가 같은 concrete drawing implementation을 사용할 수 있는 최소 내부 seam만 만든다.

## Phase 2 — Browser-safe SVG

SVG namespace, root dimensions/viewBox, stable number/style serialization, authored order, nested clip paths,
solid/linear-gradient paint, dash/opacity, text와 command path를 pure JavaScript string으로 생성한다. Optional
accessible name/description을 document children으로 출력하고 browser-safe package boundary를 검증한다.

## Phase 3 — Node vector PDF

Node-only adapter가 output directory와 PDF document/page lifecycle을 소유한다. 한 chart를 logical dimension과
같은 point 크기의 한 page에 vector로 그리고 atomic validation 뒤 file을 쓴다. Metadata를 전달하고 selectable
text와 vector path를 structural/text extraction 및 Poppler rendering으로 확인한다.

## Phase 4 — Parity and distribution closeout

Concrete schema consumer matrix와 representative chart matrix를 Canvas/PNG/SVG/PDF에 걸쳐 닫는다. Package
exports, declarations, public rendering docs, runtime reference, architecture renderer/package boundary와 installed
consumer를 동기화하고 Roadmap을 완료 상태로 전환한다.
