# Image 공개 연결 검토안

상태: **ready-for-review**. 아래 I1–I4는 아직 공개 API·Current·저장 validator에 넣지 않은 구체안이다.
시각6종은 [REVIEW](REVIEW.md)의 `3853bdb1`로 승인되었다. 전체 이미지 resolver/fit/offline 요구와
명시 resource lifecycle은 원안 및 [전체 실행 승인](../../AUTHORIZATION.json)에 포함되어 있다.
이번 확인은 원안에서 이름·연결 방식이 미정이었던 부분에 한정한다.

## I1: 비동기 준비와 동기 resource action

기존 prepared data의 exact receiver/request token/opaque handle 패턴을 재사용한다.
Full entry의 `prepareImageResource(program, request, host)`를 비동기 함수로 제공한다.

- Create request: `{kind:"create", id, uri, expectedHash, mimeType, maxBytes?, license?, attribution?}`.
- Replace request: `{kind:"replace", target, uri, expectedHash, mimeType, maxBytes?, license?, attribution?}`.
- Host: `{requestToken, load, decode, signal?}`. `load`는 bytes와 MIME, `decode`는 원본 width/height와
  `originClean:true`를 반환한다. 현재 private image 준비의 MIME/hash/16MiB/64MiPixels 제한을 유지한다.
- 반환값은 복제·위조·직렬화해서 적용할 수 없는 handle이다. Payload·callback·signal은 private다.
- `.createImageResource({prepared, requestToken})`와 `.replaceImageResource({prepared, requestToken})`
  는 prepare했던 정확한 program과 token만 받는 wrapped 동기 action이다. 다른 program에서 stale 오류다.
  이미 abort한 signal은 적용 시에도 거부한다. 이전 immutable program에 의도적으로 적용하는 branch는 가능하다.
- Resource 제거는 공통 `.removeResource({kind:"image", id, cascade?})`에 연결한다. 기본 restrict이며
  명시 cascade는 소유 mark만 제거한다. 공유 사용자 resource를 암묵 삭제하지 않는다.
- 새로운 무거운 image authoring family를 Basic에 자동 등록하지 않는 원 core 규칙을 따른다.
  Basic의 기존 동작과 generic graphic rendering은 유지한다.

Resource는 기존 semanticSpec.resources envelope의 kind=image, algorithmVersion="1"을 사용한다.
options는 URI/MIME/hash/budget/license/attribution, result는 검증된 원본 dimensions/byteLength와
base64 payload를 소유한다. 준비 source revision vector/inputHash는 적용 증거이며 live resource에
host object를 저장하지 않는다. Replace는 revision을 올리고 모든 live exact refs와 image consumer를
한 번씩 명시 rematerialize한다. Decode/hash/CORS/abort/stale 오류는 구분한다.

## I2: 단일 이미지 domain mark

- `.createImageMark({id?, image?, viewport?, fit?, align?, opacity?, alt?, clip?})`.
- `.editImageMark({target?, image?, viewport?, fit?, align?, opacity?, alt?, clip?})`.
- 기존 `.removeMark({target})`로 제거한다.
- id 생략 시 단일 기본 role `image`; 이미 그 role이 있으면 explicit ID를 요구한다. image 생략은
  stored image resource가 유일할 때만 추론한다. edit target도 유일한 image mark일 때만 추론한다.
- viewport 생략/`"auto"`는 현재 plot 전체, 명시값은 plot-local `{x,y,width,height}`다. width/height>0.
  resize는 auto viewport만 다시 맞추며 explicit 크기는 유지한다. plot frame 이동은 모든 경우 적용한다.
- fit 기본contain, align 기본[.5,.5], opacity 기본1, alt 기본빈문자열. 명시 null은 reset이 아니다.
  edit 생략은 보존, `viewport:"auto"`는 plot 전체로 복귀한다. fit/align 범위는 승인된 primitive와 같다.
- viewport clipping은 항상 적용한다. 추가 clip은 기존 mark clip의 명시 geometry/false 정책을 재사용한다.
- 의미는 named image resource의 정확 revision을 참조하는 단일 image item이다. dataset/field/scale을
  임의 생성하지 않는다. 기본 item key는 mark identity와 역할에 묶이고 image replacement로 바뀌지 않는다.
- fit/align/viewport/opacity는 materialization config, image ref/alt는 semantic layer,
  계산된 destination rectangle과 clip은 graphics가 소유한다. Renderer는 fit을 계산하지 않는다.

Selection/hit/accessibility/scene/inspection/composition의 단일 item adapter를 등록한다. Hit는 clip된
사각형이며 pixel-alpha hit로 바꾸지 않는다. 데이터 field encoding은 이 resource mark에 적용되지 않으므로
모호하게 무시하지 않고 오류로 진단한다. 앞선 모습6종의 public/primitive 같은 실행 pixel equality를 검증한다.

## I3: 하나의 self-contained concrete image 값

기존 graphic type에 `image`를 추가한다. properties는 아래 모양을 사용한다.

```js
{
  image: {
    contentHash, mimeType, byteLength, width, height,
    payload: { encoding: "base64", data }
  },
  x, y, width, height, opacity
}
```

내부 image.width/height는 원본 pixel dimensions이고 바깥 width/height는 resolved destination size다.
URI·semantic resource ID·fit·host object는 concrete image 값에 없다. Node의 기존 clip을 재사용한다.
이 payload 형태는 image mark뿐 아니라 승인된 paint의 도형 단위 PNG lowering에도 공통으로 사용한다.
별도 paint 전용 image 저장 형식이나 추가 graphicSpec 최상위 자원 표를 만들지 않는다.

SHA256이 content identity이며 editable/graphic-only snapshot 모두 actual bytes를 포함하여 offline 복원한다.
한 snapshot 안의 여러 concrete 참조가 같은 값 일부를 공유하거나 중복하더라도 의미의 정본은 semantic resource다.
미래 export bundle의 content-addressed payload 표는 이 hash로 deduplicate할 수 있다. 이 단계에서 별도
bundle API를 이미 구현한 것으로 표기하지 않는다. Restore는 bytes/hash/static SVG를 검증하며 fetch/decode/AST를
실행하지 않는다. 실제 native/browser decode 실패는 export preflight에서 오류이며 placeholder를 만들지 않는다.

## I4: Canvas 준비와 네 renderer

Browser-safe `prepareImageRendering(program, {decode, signal?})`는 오직 graphicSpec의 embedded image bytes를
명시 host decoder에 전달하고 ephemeral backend image를 보유한 opaque handle을 반환한다.
`decode({bytes,mimeType,contentHash,width,height,signal?})`는 `{image, width, height, originClean:true}`를 반환한다.
Program을 바꾸거나 shape가 같아도 별개의 graphicSpec에 handle을 재사용하면 stale 오류다.
같은 hash의 payload는 한 준비에서 한 번만 decode하며 abort 뒤 결과를 설치하지 않는다.

기존 `render(program, context, {pixelRatio?, images?})`에 이 handle을 전달한다. Image가 있는데 준비가 없거나
decode 결과/크기/CORS가 잘못되면 context를 지우거나 resize하기 전에 preflight에서 실패한다.
SVG는 검증한 embedded payload를 data URI로 쓰며 host 준비가 필요 없다. 기존 async PNG/PDF는 native byte
decoder로 같은 preflight를 내부 수행한다. 어느 renderer도 URL fetch를 하지 않는다. 다른 도형은 vector다.

## 검증 계획과 남은 범위

I1/I3의 새 저장·공개 계약은 승인 후 구현한다. 그 전에는 private resolver/placement/primitive proof만 Current다.
Required checks는 독립 literal fit/hash/budget/abort, forged/stale handle, immutable failure, resource replace/remove
closure, graphic-only/offline codec, four renderer preflight, public/primitive pixel equality, package/types/current/docs다.
임의 RGBA를 image bytes로 오해하지 않으며, asset payload 및 decode budget은 resource별 기존 한도를 우선 적용하고
합계 materialization work를 공통 budget에 누적한다. Font resource/최종 export bundle은 별도 STEP의 남은 범위다.
