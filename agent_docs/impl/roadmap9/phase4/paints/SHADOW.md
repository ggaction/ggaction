# P2 Shadow 공개 준비 연결

## 진행 상태

- [x] `PUBLIC.md`와 사용자 포괄 승인을 재사용하고 추가 질문 없이 진행
- [x] 9종 mark의 단일 appearance intent, 생성·편집·false 제거·pending·revision·codec focused 회귀
- [x] 기존 Gaussian·strict color·source-over owner를 재사용한 immutable RGBA 합성과 fractional offset literal
- [x] Canvas/SVG의 준비 없음·stale·dispose·density 검사와 비텍스트 glyph/clip 회귀
- [x] 정확한 font identity와 실제 Text ink/mask owner 연결
- [x] PNG/PDF·public entry/type/Current·generated 문서·built responsive/axe 연결
- [x] 이 checkpoint의 mark/label consumer matrix, 실제 데이터 witness, 네 backend public/primitive 및 설치 검증
- [x] canonical 전체 coverage 최초 종료와 5개 owning harness 수정 후 검사·333 critical floors 기록
- [ ] root 최종 합산 source의 전체 normal/coverage 재검증 및 추가 domain consumer matrix

전체 P2, STEP017, STEP077 완료를 의미하지 않는다. 안정 blend source는 `d0b3f763c`,
qualification checkpoint는 `f9ba5e621`이다. Shadow source candidate는 `ad9825105`이며 이 문서는
그 source의 검증 범위와 최종 합산 의무를 기록한다. 정확한 공개 동작은 Current 계약이 소유한다.

## 준비 경계

`prepareShadowRendering(programOrCanvasScene, {createCanvas, decode?, fonts?, pixelRatio?, signal?})`
는 Promise로 opaque `{kind:"shadow-rendering", glyphCount, pixelRatio, dispose()}`를 반환한다.
`createCanvas(width,height)`는 명시적인 읽기 가능한 Canvas surface를 제공한다. Canvas 소비에는
기존 image renderer와 같은 `decode` callback이 필요하고 SVG만 생성할 때는 생략할 수 있다.
준비 결과는 원래 concrete graphic 객체 identity와 내용 digest, 출력 density에 결합된다.
중복 dispose는 안전하며 stale/disposed/density mismatch는 destination clear/resize 전에 실패한다.
실제 mask와 PNG/decoded image는 private handle에만 있고 program·trace·codec에 저장하지 않는다.

Canvas/SVG 동기 API는 `{shadows}`를 받는다. PNG/PDF 비동기 API는 공통 native adapter로 준비한다. 저장 복원·편집·composition 결과에는 새 준비가 필요하다. Canvas scene은
concrete shadow 값을 보존하며 그 scene 자체로 준비한다. SVG scene 생성에는 program에 결합된
handle을 넘기고 준비 결과를 포함한 fragment는 cache로 stale 검사를 우회하지 않는다.

## 실제 glyph와 수치 소유

기존 Canvas drawer가 fill와 stroke/outline을 opacity1로 그린 실제 RGBA에서 alpha를 얻는다.
Text는 exact prepared font alias와 실제 `measureText` ink bounding boxes를 사용한다. 각 line origin,
alignment/baseline, rotation, outline 확장을 보존하며 fontSize 비율이나 advance width로 잉크를 대체하지 않는다.
Font glyph helper의 같은 RGBA/alpha를 재사용하고, 폰트 parser 또는 사각 glyph mask를 만들지 않는다.

Gaussian은 기존 `shadow.js`의 sigma=blurRadius×pixelRatio/2, ceil(3sigma) 지원 범위와 두 pass 계산을
그대로 쓴다. Fractional offset은 alpha grid에 bilinear sampling하고 source pixel alignment는 유지한다.
기존 `compositeRGBA`가 shadow 뒤에 source를 source-over로 합성한 후 한 번 양자화한다. mark opacity와
blend는 이 전체 glyph에 최종 한 번 적용한다. Outline/stroke alpha도 원래 source alpha의 일부다.
공통 canonical PNG encoder와 I3 concrete image payload를 쓰며, SVG는 같은 PNG bytes를 embed한다.
PDF는 효과가 있는 도형만 rasterize한다. 전체 chart raster 또는 network fetch는 없다.

`paintFrames.js`는 기존 isolated glyph와 shadow가 공유하는 순서·ancestor offset·clip 계산 owner다.
Shadow는 최종 clip의 역 blur/offset 기여 범위를 먼저 계산해 밖에 있는 source가 안에 cast하는 부분을
보존한다. 준비된 glyph는 원래 collection/item identity와 clip traversal에서 소비된다.

## 한도와 원자성

구조·닫힌 옵션·own-data·signal·source native 값은 callback 전에 검사한다. Nontext analytic bounds와
aggregate frame 한도도 callback 전에 검사한다. Text는 정확한 host ink 측정 후 실제 allocation/convolution
한도를 검사하고 큰 raster surface를 만든다. 측정용 1×1 surface 외에 검증 전 큰 할당을 하지 않는다.
모든 glyph가 계획된 후에 실제 rasterization을 시작한다. source 변이·decode 중 abort·host failure는
handle을 반환하지 않는다. 준비 surface는 destination chart가 아니다.

기존 shadow dimension4096/pixels1,048,576/numeric buffer8MiB, work10,000,000을 유지한다.
새 composite는 RGBA output와 source inspection·mask sampling work도 따로 센다. Scene 전체 RGBA64MiB,
16,777,216pixels 및 work10,000,000을 제한한다. Provider readback, copied RGBA, numeric mask, PNG, decoded
backend surface의 순간 중복은 각 byte budget과 별도로 계산해야 한다. Source는 provider RGBA와 복사된
RGBA, numeric 배열로 동시에 존재할 수 있고 composite/PNG/base64와 decoded surface도 공존한다.
64MiB는 scene의 최종 RGBA 한도이며 JS 배열·문자열 overhead나 host surface를 포함하는 process RSS
상한이 아니다. 각각의 pixel/work/byte 사전 검증은 이 중복에도 유한한 입력 크기를 강제한다.

## 검증 경계와 남은 matrix

현재 native SVG decoder는 embedded PNG를 투명하게 읽는다. 이는 xlink를 사용해도 동일하며 직접 PNG
bytes decode는 정상이다. Unit은 embedded bytes/placement를 검증하고 실제 SVG raster pixels는 Chromium에서
검증한다. 네 backend 완료를 native SVG decoder 호출 한 번으로 대체하지 않는다.

| Consumer | 현재 증거 / 남은 의무 |
|---|---|
| 9 mark family, Full/Basic 지원 subset | 생성·편집·삭제·revision·codec·타입 회귀; 5 pinned datasets × 3 recipes |
| Text labels, annotation, reference bands/rules | 기존 style forwarding, source grain, exact embedded font와 actual ink/mask |
| endpoint/ECDF label outline | Dot/Lollipop/Dumbbell/ECDF 네 label forwarding과 codec 회귀 |
| selection/highlight, legends, occupied bounds | source hit geometry 분리, source별 combined legend shadow, 제거/replay |
| facet/repeat/concat, nested/path clip, scene | 기존 frame/clip contribution·scene stale/density/dispose 회귀 |
| Image, H, Partition, GraphPlot | root가 최종 합산 P2 consumer 연결을 소유. 이 checkpoint로 완료 선언하지 않음 |
| Canvas/SVG/PNG/PDF, offline restore | 도형 6종과 Text 3종의 exact primitive/public pair, Canvas/SVG DPR1·2, native PDF와 literal glyph counters |

Font dependency는 b0682914b로 병합/push했다. Fallback 교차 보수는 안정 fdb0ea51f의 text/nativeBackend/
canvas-text 3-file delta를 적용해 기존 configureTextContext와 shadow preparation을 보존했다. Native font lease
전·중·후 비교를 포함한 17개 focused 검증이 통과했다.

공개 도형 6종의 4backend pair 및 Gaussian interior oracle 192개, Text 3종의 actual glyph/outline/rotation/
multiline/clip pair가 통과했다. Text의 literal A counter와 같은 위치의 offset shadow가 비어 있는지도 네
backend에서 검사했다. 설치·focused·critical floor 검증은 아래처럼 구분하며 최초 전체 coverage를
전체 성공으로 표시하지 않는다.

최초 실패는 .artifacts 아래 보존한다. Action card는 shadow 옵션 75bytes 추가로 ReferenceBand3807,
MarkLabels4063, Annotation4057bytes를 측정했고 각각3810/4070/4060으로 필요한 한도만 조정했다.
Median은2001bytes이며 기존2070 cap을 유지한다. Node22 패키지 실측815entries/1,198,723packed/
5,516,118unpacked, Vite Full585,965/Basic346,504/SVG20,051gzip bytes이다. 최종 고정 archive의
지원 Node별 실측 및 qualification을 별도 evidence에 기록한다.

## Source qualification 결과

`shadow-evidence/progress.json`과 압축 로그가 실행 결과를 보존한다. Canonical 최초 전체 coverage는
7,465개 중 7,460개 성공, 5개 실패이며 aggregate lines96.43/branches94.22/functions98.89%였다.
실패는 registry의 Text testDirectory, bundle 문서 한도, graphic hierarchy 기대 descendants,
PDF의 허용된 glyph raster 기대값, SVG의 명시 shadow preparation 누락이다. 해당 owning 검사를
수정한 뒤 7/7, chart12/12, boundary/type/package34/34, docs172/172가 통과했다. 완전한 최초
coverage report에 canonical policy를 다시 적용하여 333개 critical module floor도 통과했다.
`src`, `types`, `knowledge`는 candidate 이후 byte 변경이 없다. Parent의 검증 분담에 따라
다음 전체 실행은 최종 합산 checkpoint가 소유하며, 이번 기록은 전체 suite green을 주장하지 않는다.

실제 데이터는 5 pinned datasets × 3 recipes의 15개와 inventory14개를 통과했다.
추가 shadow option은 기존 데이터의 실제 호출·결과로 연결했으며 count만 바꾸지 않았다.

설치한 한 archive의 SHA-256은 `d4ebe98b9e799164da277ea6c1a01a885622628a9e5a48df28ff7ac56c00572c`다.
Node20/22/24 각각 runtime219개와 tutorial76개가 통과했고 Node22/24 qualification은7/7이었다.
Node20 최초 qualification은 Full/Basic gzip cap 때문에5/7이었으며 동일 archive에 대해
세 bundle만 재검증해 통과했다. 최초 실패를 보존한다. 지원 Node 최대 측정은 packed1,201,262,
unpacked5,516,118bytes/815entries 및 Full586,754/Basic347,170/SVG20,191gzip bytes다.
Cap은 필요한 최소 올림으로 package1,202,000/5,517,000/815,
Full587,000/Basic348,000/SVG25,000으로 설정했다.

최종 README 한도 설명 변경 후 metadata archive의 SHA-256은
`e43b7d0f98b5648fe2e4a928368bb752861c6a933d2e14c7e7b4e17aafbc3aee`다.
설치 archive와 추출 파일을 전수 비교하면 `package/README.md`만 다르다. Runtime·declarations·knowledge는
동일하지만 metadata archive 자체의 Node3종 전체 설치 재실행으로 기록하지 않는다.

문서 source172/172, built154 pages/1310 LLM artifacts 및 320/390/768 responsive 검사를 통과했다.
마지막 변경 페이지 감사에서 기존 version 목록 안 링크의 non-color cue 누락을 발견해 `li a`에도
공통 밑줄을 적용하고 canonical desktop/mobile Axe 대상에 version을 추가했다. 그 최초 오류와
수정 뒤 별도 browser 결과를 보존한다. CSS 변경 뒤 canonical browser는 desktop search·keyboard·
no-JavaScript·Axe와 154 pages의 320/390/768 containment를 모두 통과했다.

Remaining scope: root 소유 P2 domain consumers, 최종 합산 전체 검사, 전체 STEP017 및
STEP047–049/STEP077는 이 기록으로 완료되지 않는다.
