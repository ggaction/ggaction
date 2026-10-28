# 이미지 자원 준비와 배치 kernel

## 진행 상태

- [x] STEP-018과 geometry-design의 원본 요구 및 전체 실행 승인 확인
- [x] 명시 host load/decode, SHA256·MIME·byte/pixel budget·CORS·abort 경계
- [x] immutable base64 payload와 license/attribution 보존
- [x] contain/cover/fill과 align·viewport clip의 독립 수치 검사
- [x] source/package/discovery 경계, 기존 데이터 digest 회귀와 공개 번들 검사
- [x] SVG allowlist와 unsafe external resource 거부
- [ ] 공개 resource CRUD·codec·scene·export preflight와 네 renderer 연결
- [x] [rendered primitive 검토 package](REVIEW.md); 사용자 확인 대기
- [ ] 승인 뒤 공개 image action flow
- [ ] AT-04/AT-14 전체 소비자 검증 및 STEP-018 종료

이는 **private kernel checkpoint**다. public exports, 저장 schema, image primitive 또는
renderer 지원을 추가했다는 뜻이 아니다. [전체 실행 승인](../../AUTHORIZATION.json) 안에서
독립적인 자원 준비·배치 계산을 진행했다. STEP-017 이후 통합과 visual Gate는 남아 있다.

`resources/resolveAssets.js`가 host 경계를, `materialization/image.js`가 concrete rectangle 계산을
소유한다. `core/contentDigest.js`의 같은 SHA256 구현을 UTF-8 text와 binary bytes가 공유한다.
기존 text digest 결과는 그대로이며 host callback 없이 네트워크나 decoder를 선택하지 않는다.

요청은 URI, lowercase expected SHA256, MIME, 최대 byte 수를 고정한다. 현재 private 지원 MIME은
PNG/JPEG/WebP와 검증한 정적 SVG다. SVG는 아래의 닫힌 subset만 허용하며 임의 SVG 문서 지원을 주장하지 않는다.
기본/최대 byte budget은 16 MiB, decode pixel budget은 64 MiPixels다. MIME magic과 hash를 decode 전에
검증하고 decode 결과는 양의 정수 dimensions와 originClean=true를 요구한다. host는 전달된 pixel
budget을 실제 decode 전에 적용해야 한다. 일반 CORS load error와 decoder 오류는 별도 원인으로 남긴다.

AbortSignal은 실제 내장 getter로 확인한다. 각 host stage는 abort와 경쟁하며 이미 중단한 요청은
callback을 호출하지 않는다. 진행 중 load/decode 뒤의 늦은 결과는 폐기하며 listener는 모든 종료
경로에서 제거한다. host callback 자체가 외부에서 수행한 일을 되돌린다고 주장하지 않는다.

Retained bytes는 host/decoder와 별도로 복사하고 immutable base64 text로 보존한다. SharedArrayBuffer는
동시 변경으로 identity가 바뀔 수 있어 거부하며 typed-array의 사용자 length/iterator getter도 실행하지
않는다. Decoder 객체나 함수는 결과에 남지 않는다. URI만 있는 결과를 offline-ready로 만들지 않는다.

200×100 이미지를 100×100 viewport에 중앙 contain하면 `(0,25,100,50)`, cover하면
`(-50,0,200,100)`과 viewport clip이다. Fill은 viewport rectangle을 그대로 사용한다. align은 각 축
0..1, size는 양수, 모든 끝 좌표는 finite여야 한다. Explicit null은 default로 바꾸지 않는다.

## 검증

- Focused 및 기존 source/digest 회귀: 29 passed, 0 failed.
- Image placement: line/branch/function 100/100/100%; image resolver 100/97.78/100%.
- Shared content digest: 100/100/100%. 이 수치는 전체 repository coverage가 아니다.
- Source/package/discovery 계약: 38 passed, 0 failed.
- 문서 source suite159개 및 generated artifacts 검사 통과.
- Package: 687 entries, packed1,026,817/unpacked4,780,907 bytes. 실제 측정의 1000byte 올림을 한도로 적용.
- Packed Full/Basic gzip: 515,399/296,455 bytes. 기존 bundle 한도 안이다.

실행 로그와 입력 hash는 `evidence/manifest.json`에 연결한다. 공개 source export·타입은 변경하지
않으며 전체 STEP-018을 complete로 표시하지 않는다. 최종 DATA/statistics/conditions merge 이후
package 크기와 provenance를 다시 측정해야 한다.

## 정적 SVG 검증 checkpoint

`resources/svgImage.js`는 명시 host decoder 앞에서 UTF-8 문서를 읽어 element/attribute allowlist,
단일 SVG namespace/root, unique ID, local gradient/clip reference의 종류·존재를 확인한다.
기본 도형·path·group, defs의 linear/radial gradient와 clipPath, title/desc만 허용한다.
script, event handler, stylesheet/style attribute, foreignObject, text/font, image/use/href,
외부 URL, XML DTD/entity 선언과 processing instruction을 거부한다. XML 1.0 UTF-8 declaration과
표준/유효 numeric character reference만 허용하고 raw document를 DOM에 삽입하지 않는다.

원본 SVG bytes의 SHA256을 먼저 확인한 뒤 허용 여부를 검사하고, decoder에는 별도 복사본을
전달한다. SVG는 최대1MiB/10000elements/depth128이며 전체 image decode의64MiPixel 한도도
유지한다. 불허 content는 `unsafe-svg` 원인과 함께 실패하고 decoder 호출은0이다. 이는
자동으로 문서를 고치는 sanitizer가 아니다. 기존 drawing의 지원되지 않는 element를 조용히
제거하지 않는다. 지원 범위를 벗어난 문서는 명시 실패한다.

Host가 던진 error의 name getter를 읽으면 preparation promise가 끝나지 않을 수 있던 경로도
수정했다. own data descriptor 또는 내장 DOMException getter의 brand check만 사용한다.
사용자 getter가 실행되지 않고 load-error 또는 cors로 종료되는 회귀를 검증했다.

집중19/19, source/package/discovery38/38, 문서159/159 통과. SVG validator line100/branch97.12/
function100%, resolver100/99.03/100%다. 실제 native decoder로 hash 고정 SVG를 읽어 clip 외부
alpha0/내부alpha255도 검사했다. Package688entries, packed1029429/unpacked4788996bytes이며
앞선 main CI에서 확인한 pack 크기 변동을 고려해 cap1034000/4790000을 적용한다.
이 source는 여전히 private이며 공개 renderer의 SVG image 지원 완료와 구별한다.

SVG checkpoint의 입력과 실행 evidence는 [별도 manifest](evidence/svg/manifest.json)에 보존한다.
