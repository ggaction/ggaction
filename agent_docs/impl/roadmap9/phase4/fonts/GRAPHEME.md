# Grapheme 단위 줄바꿈

## 진행 상태

- [x] STEP-019의 한글·combining·emoji cluster 보존
- [x] 제목과 Cartesian 축의 concrete line/origin·hard break
- [x] 편집·Canvas replay·저장 복원·이전 program 불변성
- [x] Node 20/22/24 및 Chromium/Firefox/WebKit의 설치 패키지 검증
- [x] current 계약·선언 설명·공개 문서·생성물 동기화
- [ ] 실제 font asset/hash와 renderer 측정값 연결 및 load completion
- [ ] STEP-019의 전체 AT-04/15 종료

[전체 실행 승인](../../AUTHORIZATION.json)의 기존 text layout 요구를 구현한 checkpoint다.
새 mark나 새 시각 스타일을 추가하지 않는다. 기존 code-point wrapping이 결합 문자와 emoji를
분리하던 결함을 수정하며 `wrap` 옵션 어휘와 signature는 유지한다.

`src/layout/text.js`가 `Intl.Segmenter("en", { granularity: "grapheme" })`를 사용한다.
Word mode의 긴 단어 fallback과 character mode 모두 cluster를 보존하고, cluster 하나가
maxWidth보다 넓어도 나누지 않는다. Unicode boundary 버전은 host runtime의 Unicode 버전을
따르며 서로 다른 모든 Unicode 버전의 새 문자에서 동일 결과를 보장한다고 주장하지 않는다.
현재 지원 runtime에서 accent, decomposed Hangul, modifier+ZWJ, flag, keycap의 literal 결과를
검증했다. Deterministic text metrics는 유지하고 renderer는 저장된 line text/origin을 소비한다.

LF·CRLF·CR hard break를 width wrapping 전에 나눈다. Cartesian axis는 maxWidth를 제거해도
CR과 빈 줄의 간격을 보존한다. Public fixture는 title과 axis에 동일 cluster를 각각 그린다.
두 wrapping mode에서 이전 program을 보존하며 Canvas edit와 codec round trip 뒤에도 같은
cluster를 유지한다. Browser에서는 실제 Canvas fillText와 SVG text를 독립 확인한다.
이것은 글리프의 미관이나 font fallback·shaping 정확성 검증을 대신하지 않는다.

## 검증

- Focused21/21, layout+guide unit1190/1190, 경계·discovery38/38, docs159/159.
- Installed package browser는 Chromium/Firefox/WebKit 각각9/9.
- Node20.20.2와24.22.1에서 shared layout/public regression 각각10/10, Node22.23.1은 위 canonical unit 결과.
- Package690entries, packed1,031,297/unpacked4,795,791bytes. 기존 cap 유지.
- Full/Basic gzip515,500/296,564bytes. 기존 cap 유지.
- docs:generate와 machine metadata check 통과.

처음 보조 실행 script가 존재하지 않는 `scripts/check-doc-machine-artifacts.js`를 호출한
invocation 오류는 보존했다. 실제 canonical command
`node scripts/generate-doc-machine-artifacts.js --check`로 수정해 성공했다.
제품 검사의 실패로 오인하거나 실패 기록을 성공으로 바꾸지 않았다.
원본 로그·hash와 입력 hash는 [grapheme-evidence/summary.json](grapheme-evidence/summary.json)에 있다.
