# Font·관측 그래프·외곽선 통합

## 진행 상태

- [x] Font `efcf2ca9b`와 main `7501da344`의 양쪽 public 계약 보존
- [x] 통합 source `fdb0ea51f91b76638d0db297342a3a027d0e2336` 고정
- [x] 폰트 등록·해제와 unbound Canvas/PNG 교차 오류 수정
- [x] 실제 출력·lease 수명·설치 패키지·문서 링크 검증
- [x] 최초 실패와 수정 후 결과 분리 보존

이 기록은 [font 공개 checkpoint](PUBLIC_EVIDENCE.md)의 후속 통합이다. Theme STEP-033–035 또는
전체 STEP-077 완료 기록이 아니다. 기존 전체 승인 `b758b912` 범위에서 구현하며 새 공개 API나
저장 필드를 추가하지 않는다. npm publication, 문서 deployment, PR 생성은 수행하지 않았다.

## 교차 오류와 수정

같은 프로세스에서 outline/image/hierarchy 설치 예제를 실행하면 처음에는 성공하지만, exact font
등록·사용·해제 뒤에는 plain Canvas와 PNG가 다른 unbound `sans-serif` glyph를 그렸다. Exact font
alias와 glyph geometry는 정상이며, native PNG/PDF만 적용하던 대체 family 목록과 plain Canvas의
bare family 입력이 달랐다. 최초 실패의 Buffer 차이와 순서 재현 로그를 그대로 보존한다.

`renderers/text.js`가 기존 대체 family 순서의 단일 owner가 되었다. Plain Canvas는 이 목록을
사용하며 host가 없는 family를 건너뛴다. Native adapter는 설치된 family 집합으로 같은 목록을
필터링한다. 사용자 family 순서가 먼저이며, exact embedded font는 준비된 alias 하나만 사용한다.
Typeface 선택을 위해 text 내용·line origin·semantic layout·metric profile을 바꾸지 않는다.
SVG의 브라우저 font resolution은 유지한다. Public renderer 옵션이나 폰트 parser를 추가하지 않는다.

## 증거

| 검증 | 결과 |
| --- | --- |
| 병합 focused source/contract | 72/72 |
| Font+outline+observed graph 실제 조합 | 1/1, literal red/black half-alpha와 prepared glyph RGBA 확인 |
| Fallback·exact lease·mixed glyph | 최종 32/32 |
| 변경 renderer 3파일 instrumentation | 41/41; 공통 fallback helper 100/100/100. 부분 실행을 전체 coverage로 표시하지 않음 |
| Source/package/discovery/documentation 경계 | 36/36 |
| 실제 action/option ledger | canonical realistic runner 7/7, 33,438 entries |
| 고정 tar Node 22.23.1 설치 | 214 cases + 75 tutorials + 7 qualification groups 통과 |
| 같은 tar Node 20.20.2 / 24.22.1 | 각 outline→font 두 사례→outline 4개 순서 검사 통과 |
| Public docs | 최초 171개 중 170 통과, 유일 실패는 merge 전 branch ref에 새 example이 없음. Source commit 후 canonical provenance 재생성 및 owning 포함 28/28 통과 |

실제 generic text는 font lease 전·중·후 plain Canvas와 PNG가 같고, 세 시점의 픽셀도 그대로다.
PDF는 같은 기본 family 정책을 사용하며 `/ToUnicode` vector text를 유지한다. Bound font alias의
실제 glyph·outline·중첩 native lease·실패 cleanup은 기존 회귀와 함께 확인했다. 서로 다른 backend의
모든 antialiasing 또는 외부 raw GlobalFonts 변경까지 같다고 주장하지 않는다.

Font 원 checkpoint의 전체 source/critical-floor 증거는 [PUBLIC_EVIDENCE.md](PUBLIC_EVIDENCE.md)가
소유한다. 변경되지 않은 모든 source를 다시 7천 개 전체 검사로 반복하지 않았으며, 이 통합의
합성 전체 coverage 비율이나 Node 20/24 전체 설치 통과를 만들지 않았다. Node 20 focused 첫 실행은
optional peer 설치를 빠뜨린 harness 오류였다. 기존 `testOptionalDependencies` 절차를 사용한 뒤
성공했으며 처음 로그도 남겼다.

## Artifact와 한도

- 검증 tar SHA256: `da944f9e6950081353f3c3146064e8c24af755cadc93a81a34b26fa4252820ab`.
- 809 entries, Node 22 packed 1,192,990 / unpacked 5,490,271 bytes.
- 같은 staging의 Node 20 packed 1,195,724 bytes. Package 한도 809 / 1,196,000 / 5,491,000.
- Node 20 Full/Basic/SVG gzip: 590,159 / 345,880 / 19,199 bytes.
- Full/Basic/SVG 한도: 591,000 / 346,000 / 25,000 bytes.
- 공개 옵션 inventory를 임의 축소하지 않고 opaque font preparation·graph·outline union을 유지했다.

[summary.json](integration-evidence/summary.json)과 [runtime-inputs.json](integration-evidence/runtime-inputs.json)에
정확 source commit, 파일별 hash와 결과 범위를 기록했다. Raw log는 gzip으로 보존하며 원문을
수정하지 않았다. Postcommit 생성 변경은 docs provenance와 LLM 링크뿐이며 runtime/tar 내용은 같다.
