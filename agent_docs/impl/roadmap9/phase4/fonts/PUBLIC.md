# Font resource와 실제 측정의 공개 연결

## 진행 상태

- [x] STEP-019, geometry-design, core, AT-04/AT-15 및 기존 schema 1 owner 확인
- [x] 사용자 전면 승인 `b758b912`의 범위에서 아래 구체 경계 선택
- [x] 기존 bytes·MIME·font descriptor 정책을 공유하는 private payload owner 작성
- [x] font resource / exact profile / bounded host preparation 구현
- [x] text·guide·composition·hit·scene·codec의 dependency closure
- [x] 실제 bundled font의 Canvas/SVG/PNG/PDF와 glyph mask 준비
- [x] 독립 수치·fallback/지연/한글/emoji/긴 label·설치·문서 검증
- [x] source checkpoint `ad538d08d` commit/push 및 최종 증거 동기화

이 문서는 검증된 공개 연결의 구현 기록이다. 정확한 지원 목록은 Current 계약과 선언이 소유한다. 승인 정본은
[PUBLIC_APPROVALS_20261028.json](../../PUBLIC_APPROVALS_20261028.json) 및 `b758b912`다.
기존 [PRIVATE.md](PRIVATE.md), [GRAPHEME.md](GRAPHEME.md)의 준비·Unicode owner를 재사용한다.
이미지의 공개 I1–I4 checkpoint는 `f33ffb684`다. Renderer는 실제 측정이나 줄바꿈을 하지 않는다.

## 공개 호출과 상태

Full에 `prepareFontResource(program, request, host)`와 동기 `createFontResource({prepared,requestToken})`,
`replaceFontResource({prepared,requestToken})`를 둔다. 요청은 image의 create/id 또는 replace/target
닫힌 union과 같고, font source는 기존 URI/hash/MIME/byte budget/license/attribution에
family/style/weight/metricsProviderVersion을 명시한다. 기본 16MiB 제한과 4종 font MIME은 private owner를 따른다.
Handle은 enumerable `{kind:"font-resource",request:{kind,id|target}}`만 보이며 bytes/callback/token은 private다.
정확한 receiver, 현재 token, AbortSignal 및 revision을 동기 적용 전에 검증한다. No-op URI 재사용으로
이미 준비한 다른 receiver의 결과를 채택하지 않는다. Basic은 이 authoring family를 등록하지 않는다.

Stored resource는 기존 authored envelope를 사용한다. `options`가 정규화 source와 font descriptor,
`result`가 `{byteLength,payload:{encoding:"base64",data}}`를 소유한다. Resource 교체는 revision을 올리고,
기존 exact profile이 해당 font를 사용한다면 새 bytes로 측정 closure까지 준비해야 적용할 수 있다.
공통 kind/ref/removal registry와 공통 prepared-resource authority를 확장하며 별도 registry를 만들지 않는다.

기존 `applyTextMetrics({profile})`의 schema 1은 그대로 둔다. Missing width는 기존 deterministic estimate다.
새 `prepareTextMetrics(program,{id,fonts},host)`는 명시한 font resource ID 목록을 사용해 opaque handle을 만든다.
기존 action의 닫힌 overload `applyTextMetrics({prepared,requestToken})`가 이를 동기 적용한다.
`profile`과 `prepared/requestToken`의 혼합은 오류다. Prepared overload는 composition의 scoped target도
거부한다. Child는 그 exact receiver에서 적용한 뒤 `replaceCompositionChild`로 명시 교체한다. 기존
schema 1 profile의 scoped target 지원은 유지한다. 새 authoring helper가 없던 것으로 조사됐으므로
`prepareTextMetrics`를 기존 export라고 잘못 기록하지 않는다.

새 stored profile은 다음과 같다. 이것은 사용자가 임의로 구성하는 authoring 입력이 아니며, host 준비와
read-only persistence validator가 각각 생성·검증한다.

```js
{
  schemaVersion: 2,
  id,
  fonts: [{
    resource: {kind: "font", id: fontId, revision},
    identity: {contentHash, family, style, weight, metricsProviderVersion}
  }],
  measurements: [{text, fontFamily, fontSize, fontWeight, fontStyle, width}]
}
```

Identity는 byte source의 복제 정본이 아니라 측정값의 입력 증명이다. 복원 시 현재 resource와 모든 필드를
대조한다. 같은 family/style/weight에 서로 다른 resource가 있으면 fonts를 명시했어도 ambiguous로 거부한다.
첫 resource나 system fallback을 고르지 않는다. 기존 schema 1을 저장하거나 적용하는 경로는 계속 유효하다.

## Missing query와 준비 closure

Schema 2의 모든 측정은 실제 font identity와 일치해야 한다. 누락된 query 또는 바인딩되지 않은 font tuple은
추정값으로 통과시키지 않는다. `measureTextWidth`가 전용 준비 오류를 반환하며 기존 layout/trace는 불변이다.
준비 단계는 기존 `rematerializeTypography`를 private 후보에서 반복 실행하고 실제 필요한 query를 측정한다.
128 UTF-16 units 이하의 누락 query는 grapheme prefix도 batch로 준비해 단어/character wrapping을 재실행한다.
긴 query는 원문과 빈 문자열만 먼저 준비해 불필요한 이차 크기의 prefix 집합을 만들지 않는다.
어떤 임시 estimate도 완료 profile에 섞이지 않으며, 후보 프로그램이나 그 trace는 외부로 반환하지 않는다.

한 준비의 고정 상한은 64 font bindings/unique 64MiB, 10,000 unique queries, 합계 1,048,576 UTF-16 units,
최대 256 재실행이다. 각 상한은 host callback 또는 다음 재실행 전에 검사한다. Host 응답은 동일
contentHash/provider 및 query별 finite nonnegative width를 가져야 한다. 빈 문자열의 width 0은 유효하다.
Abort 시 늦은 결과를 버리고 listener를 정리한다. 원래 receiver와 token이 바뀐 완료 결과는 stale이다.

기존 profile이 이미 가진 query로 가능한 label/Canvas 편집은 기존 동기 action을 쓴다. 새로운 query가
필요한 편집은 원자적으로 실패한다. 사용자는 명시 `removeTextMetrics()`로 provisional estimated state를
만들고 label을 편집한 뒤 그 정확한 receiver에서 다시 준비·적용한다. Font load 이전 fallback 상태와
완료 후 실제 측정 상태가 명시적으로 구분된다. 임의 action callback/patch transaction이나 hidden async
rematerialization을 추가하지 않는다. Font 교체 준비 역시 최종 profile과 resource를 한 번에 적용한다.

## Concrete font와 renderer 준비

Concrete text는 기존 text/lines/origin/bounds를 유지하고, font-bound materializer가 선택한
`properties.font`에 `{contentHash,mimeType,byteLength,family,style,weight,metricsProviderVersion,payload}`를
저장한다. URI·resource lookup·host 객체는 renderer 입력이 아니다. 모든 text 소유자가 하나의
materialization helper로 같은 binding을 적용하며 primitive core에 semantic compiler를 넣지 않는다.

Full/Basic의 `prepareFontRendering(programOrCanvasScene,host)`는 concrete font bytes를 등록한 opaque
render handle을 반환한다. Canvas `render(...,{fonts})`가 정확한 graphic identity 및 등록 identity를
resize/clear 전에 확인한다. 등록에는 content-addressed family alias를 사용해 system family나 다른
동시 font session과 섞이지 않게 한다. Handle의 명시 disposal은 다시 렌더할 수 없도록 먼저 무효화하고
host 등록을 정리한다. 성공·실패·abort에서 이미 완료된 등록은 모두 정리할 수 있어야 한다.

SVG는 embedded `@font-face` bytes와 같은 alias를 사용한다. PNG/PDF는 native registration을 출력
전 preflight하고 finally에서 해제한다. 실제 engine이 decode하지 못하는 font를 system fallback으로
대체하지 않는다. Scene과 graphic-only codec도 같은 self-contained font를 보존하고 검증한다.

P2 Text shadow의 입력은 exact concrete text/lines/origins/rotation/style와 이 prepared font identity,
bounded local raster rectangle이다. 실제 host glyph alpha와 origin을 준비하는 최소 경계를 사용한다.
Bounds rectangle을 글리프로 대체하거나 별도 font parser를 추가하지 않는다. 출력 mask와 image payload는
기존 deterministic shadow kernel 및 ConcreteImage owner에 연결한다. Private helper는
`prepareTextGlyphMask(program, exactConcreteText, {left,top,width,height,pixelRatio?}, {fonts,createCanvas})`다.
결과는 `{width,height,pixelRatio,origin:{x,y},alpha:Uint8Array,rgba:Uint8ClampedArray}`이며 local frame은 ancestor transform 이전의
text 좌표다. Source opacity는 1로 그리며 mark opacity는 paints owner가 최종 합성 때 한 번 적용한다.
각 차원 32,767, 최대 16,777,216 pixels(RGBA 64MiB), text 1,048,576 units를 allocation 전에 검증한다.
RGBA는 provider readback에서 복사하며 alpha는 같은 복사본에서 계산한다. 반환 buffer 합계는 최대
80MiB이며 provider readback까지 동시에 존재하는 준비 buffer 상한은 144MiB다. Native surface의
메모리는 호스트 구현이 소유한다. P2는 동일 RGBA로 source glyph와 shadow의 공통 PNG를 만든다.
준비된 graphic identity/내용을 factory 호출 전후 및 pixel read 후에 확인한다. Font 없는 system text는
이 exact helper의 입력이 아니며 silent fallback mask를 만들지 않는다. P2의 blur/color/offset/clip 연결은
paints owner가 맡고 그 완료 전까지 Text shadow 자체를 완료로 세지 않는다.

## 소비자와 검증 책임

Font/profile 변경은 text mark, axis/title/legend/parallel labels, facet header/shared lane, composition ancestor,
hit/occupied bounds, scene endpoint까지 기존 explicit materialization 순서로 연결한다. 동일 dependent step을
중복 실행하지 않는다. Resource remove는 live profile을 restrict하며 명시 cascade의 profile 해제는 먼저
fallback layout을 온전히 재생성한 뒤 resource를 지운다. 공유된 다른 authored font를 암묵 삭제하지 않는다.

Fixture TTF의 literal A=600/B=800/space=250/combining=0 advances와 native metrics는 독립 기대값이다.
실제 renderer에서는 해당 bytes의 identity와 family alias를 비교하고 Unicode cluster/line origin을 검사한다.
작은 geometric fixture가 한글/emoji glyph의 실제 품질을 검증했다고 주장하지 않는다. AT-15에는 별도 고정
font coverage, long label, delayed load, old receiver/ABA/abort, label edit failure, composition closure가 필요하다.
Source/Current/types/docs/설치 및 네 backend evidence까지 동기화한 뒤 이 checkpoint를 완료한다.

## Native 등록 수명과 실제 Unicode 증거

Native adapter의 등록은 alias와 contentHash를 함께 관리한다. 같은 bytes를 engine이 여러 alias에 걸쳐
하나의 physical face로 공유할 수 있으므로 마지막 library drawing lease가 끝나기 전에는 해당 bytes의
어떤 alias도 제거하지 않는다. 같은 adapter를 쓰는 public handle 먼저 → PNG/PDF 나중 및 PNG/PDF 준비
먼저 → public handle 나중의 양방향 순서, 동시 PNG/PDF, dispose/error 경로를 실제 fixture의 내부 픽셀로
검증한다. 외부 provider가 GlobalFonts에 직접 등록·삭제하는 별도 소유권까지 추측하지 않는다. Host는
자신이 반환한 등록의 수명과 dispose 책임을 지며 다른 global mutation과 섞을 때 안전한 소유권을 제공한다.

`examples/font-assets/fonts/manifest.json`은 고정 upstream commit에서 만든 이름 변경 OFL subset의
hash/byte count/advance를 기록한다. `subset.py`는 고정 원본 hash를 확인하고 fixture를 재생성한다.
Korean OTF 15,144 bytes와 monochrome emoji TTF 4,876 bytes로 한글, combining `é`, ZWJ `👩‍🔬`,
`🙂`, flag `🇩🇰`를 실제 측정·렌더한다. 일반 한글/emoji 전체 coverage나 모든 fallback font를 지원한다는
뜻은 아니다. 공개 예제와 literal primitive는 같은 bytes를 사용하며 세 줄 title origins와 emoji subtitle,
Korean 920/1000em 및 emoji 2600/2048em advances를 독립 값과 대조한다. Canvas/PNG/PDF/SVG에서
각 줄의 실제 ink를 확인하고, 별도 SVG 문서의 embedded face 2개가 로드됐음을 확인했다. Backend 간
antialiasing 동일성 대신 같은 backend의 public/primitive 전체 픽셀 또는 SVG 문자열 일치를 검증한다.

공개 font checkpoint의 검증과 실패 보완 내역은 [PUBLIC_EVIDENCE.md](PUBLIC_EVIDENCE.md) 및
[기계 판독 증거](public-evidence/summary.json)에 보존한다. Font source는 `ad538d08d` 이후 변경되지 않았다.
STEP-019의 이 branch 구현은 완료했으며 main 통합과 다른 branch의 P2 Text shadow 연결은 별도 책임으로 남긴다.
