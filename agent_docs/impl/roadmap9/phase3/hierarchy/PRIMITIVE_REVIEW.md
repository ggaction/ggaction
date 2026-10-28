# Tree / treemap rendered primitive 검토

## 진행 상태

- [x] Tree 수직·수평·방사형 3종의 명시 primitive chain과 독립 좌표
- [x] Treemap slice-dice·squarify 2종의 명시 primitive chain과 독립 사각형
- [x] Normal 7·render 5·discovery/source/package boundary 31 검증
- [x] 5개 PNG 시각 검사와 실행 소스·trace·graphicSpec·PNG hash 영수증
- [x] 명시 rendered primitive 승인 (`approved`, tree3+treemap2)
- [ ] Public resource/action lifecycle·primitive/public 동등성·전체 consumer
- [ ] STEP-020·AT-22·STEP-077 전체 완료

계산 기준은 `06070369753ccc5a4b8f26ccfc69055e0128f6d1`이다.
검토 소스·테스트 revision은 `ec0484613ff1c91e243a9097ff42c4a5cd72138f`이며 원격 `codex/roadmap9-hierarchy`에 push했다.
이후 기록만 고정하는 metadata commit은 실행 소스와 PNG를 바꾸지 않는다.
승인된 전체 계획과 parent의 위임에 따라 private 계산과 이 검토 자료를 준비했다.
Gate 상태는 **approved**다. 사용자 답변 “5개 대상 모두 승인”이 parent `/root`를 통해 전달되었다.
승인 대상은 아래 source revision의 tree3+treemap2이며 public action의 구현 완료를 뜻하지 않는다.
Partition mapping/bend와 그 primitive 검토는 별도 담당자가 진행한다.

[승인 규칙](../../../AGENTS.md)의 직접 적용 범위는 다음 문장이다.

> A new visual target requires explicit confirmation of its rendered graphical primitive before its public action flow is implemented.

이전 전체 구현 승인과 별도로 정확한 렌더링에 대한 위 답변을 승인 근거로 기록했다.
승인 source revision은 `ec048461`(아래 영수증의 전체 `testedHead`)이며
[승인 기록](primitive-approval.json)이 5개 variant와 정확한 revision을 고정한다.
이 기록을 먼저 commit/push한 뒤 새 public hierarchy flow를 시작한다. 기존 `primitive-evidence.json`의
`ready-for-review` 상태는 승인 직전 증거 캡처 시점의 역사적 상태로 보존한다.

## 검토할 의미와 실행 소스

두 slice 모두 `Root(10) → A(6), B(4)`와 `A → A1(2), A2(4)`의 같은 5개 노드다.
Leaf-sum model에서 원 key·부모 관계·source row는 보존한다. 상위 노드 값은 자식 합이다.

| Target | 렌더링 의미 | 독립 기준 |
| --- | --- | --- |
| Tree vertical | 깊이가 아래로 증가하고 부모는 첫/끝 자식 사이에 위치 | 5개 literal `(x,y)`와 4개 parent link |
| Tree horizontal | 같은 tree의 깊이가 오른쪽으로 증가 | 수직 계산의 정확한 축 교환+명시 translation |
| Tree radial | root 중심, 깊이별 반지름, 시계 방향 각도 | 반지름180, sweep360°의 5개 literal 좌표 |
| Treemap slice-dice | 계층 깊이마다 절단 축 교대 | size544×320, padding16의 5개 literal rect |
| Treemap squarify | 큰 weight 우선으로 비율을 개선하는 stable tile 순서 | 같은 size/padding, 독립 rect·A1:A2 면적1:2 |

Treemap의 padding은 각 부모에 따로 적용된다. 따라서 값4인 A2와 B의 최종 화면 면적이 같다는
뜻이 아니다. 같은 부모 아래 자식의 가용 면적 비율을 비교한다. Root/A의 작은 상단 label은
부모 영역, A1/A2/B의 가운데 label은 leaf 영역을 나타낸다.

정확한 실행 소스는
[tree primitive](../../../../../test/gates/tree-layouts/primitive.program.js)와
[treemap primitive](../../../../../test/gates/treemap-layouts/primitive.program.js)다.
두 프로그램은 실제 `chart().createCanvas().createData().createGraphics().editGraphics()` 명시 체인이다.
미구현 public API 이름이나 가상의 호출은 포함하지 않는다. 다음은 repo root에서 실행 가능한 호출이다.

```js
import { createTreePrimitive } from "./test/gates/tree-layouts/primitive.program.js";
createTreePrimitive("vertical"); // "horizontal", "radial"
```

```js
import { createTreemapPrimitive } from "./test/gates/treemap-layouts/primitive.program.js";
createTreemapPrimitive("slice-dice"); // "squarify"
```

각 manifest는 정확한 단일 variant 호출, dimensions, colors, plot-region ink 기준을 소유한다.
`reference-values.js`는 production layout을 호출하지 않으며 normal tests가 private layout 결과와
독립 literal을 비교한다. Primitive 자체도 literal 좌표를 소비한다.

## 이미지와 검사

PNG는 canvas640×500을 pixelRatio2로 렌더링한1280×1000 이미지다.
Gitignored artifact를 재현하는 실행 소스·manifest·reference·검사기는 모두 tracked다.

| Variant | 재현 artifact |
| --- | --- |
| Vertical | `.artifacts/test/png/review/tree-layouts/vertical/primitive.png` |
| Horizontal | `.artifacts/test/png/review/tree-layouts/horizontal/primitive.png` |
| Radial | `.artifacts/test/png/review/tree-layouts/radial/primitive.png` |
| Slice-dice | `.artifacts/test/png/review/treemap-layouts/slice-dice/primitive.png` |
| Squarify | `.artifacts/test/png/review/treemap-layouts/squarify/primitive.png` |

각 폴더의 `variant.json`은 같은 manifest에서 생성한다. 5개 이미지를 직접 검사했으며 clipping이나
누락된 노드/링크/label은 없었다. Tree의 선이 노드 뒤에 놓이며 treemap은 부모→자식 사각형과
label 순서가 명시적이다. 이 검사는 사용자 visual 승인이나 모든 renderer consumer 검증을 대신하지 않는다.

## 재현과 증거

```sh
node scripts/run-tests.js gates
node scripts/run-tests.js render gates/tree-layouts/png.render.js gates/treemap-layouts/png.render.js
node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js
node scripts/check-hierarchy-primitives.js
```

결과는 순서대로7 passed,5 passed,31 passed,5개 source/graphics/trace/PNG 검증이다.
`.artifacts/validation/hierarchy-primitives/`가 로그와 전체 `review-evidence.json`을 보존한다.
이 디렉터리의 tracked `primitive-evidence.json`은 검토 입력·이미지 hash의 compact snapshot이며,
새 checkout에서는 PNG 생성 후 검사기로 전체 영수증을 재현할 수 있다.

이번 변경은 runtime·types·packed input을 바꾸지 않는다. 따라서
[ordering checkpoint](ORDER_KERNEL.md)의 관련 입력이 그대로인 hierarchy62 tests,
critical95/90/100,690-entry package 검사, Full/Basic installed bundle510,644/287,809gzip bytes를
재사용한다. 새 공개 API/문서/생성물 지원을 주장하지 않고 public docs를 수정하지 않는다.
Main 누적 branch 검증은 parent가 별도로 수행한다.

## 승인 이후 남은 의무

Public hierarchy/layout resource create/edit/revise/remove와 실제 data ref/lineage 연결, persistence,
inspection/scene, selection/hit/accessibility/composition, SVG/Canvas/PNG/PDF와 declarations/current
contract/docs/package consumer를 구현해야 한다. 그때 primitive/public 구조·속성·trace와 같은 실행의
정확한 decoded pixel equality를 검증하고 active Gate slice를 안정된 capability owner로 옮긴다.
현재는 public counterpart가 없으므로 이를 통과했다고 기록하지 않는다.
