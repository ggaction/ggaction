# 이미지 공개 연결 I1–I4

## 진행 상태

- [x] 승인된 resource 준비/동기 적용, mark lifecycle, concrete payload, 네 renderer 연결
- [x] resource lineage, selection/highlight, inspection/accessibility, composition, editable/graphic 복원
- [x] Full/Basic 선언과 공개 예제, Current, 생성 문서 및 source-free 설치 fixture
- [x] 최신 통합 기준 `a561ae1c` 병합 후 이미지/조건부 위치·텍스트 교차 64개 및 경계 47개 통과
- [x] 최종 frozen source의 전체 normal/coverage, realistic inventory, package/설치 검증
- [x] 검증된 구현 checkpoint commit/push

승인 정본은 [PUBLIC_APPROVALS_20261028.json](../../PUBLIC_APPROVALS_20261028.json)의 I1–I4
`990315b7`과 6종 시각 `3853bdb1`이다. 전체 후속 선택은 `b758b912`의 사용자 전면 승인에 속한다.
이 문서는 실행 이력이며 정확한 동작은 Current `CORE.md`/`MARKS.md`와 `docs/api/rendering.md`가 소유한다.

## 구현 경계와 소비자

Full은 `prepareImageResource`와 동기 `createImageResource`/`replaceImageResource`를 제공한다.
Handle은 원래 receiver와 현재 requestToken/abort에 묶이며 원문 bytes와 callback을 trace에 복제하지 않는다.
Resource 교체는 공통 typed reference owner에서 layer revision을 원자적으로 바꾸고 모든 image mark를
한 번씩 명시 rematerialize한다. `removeResource`의 기본 restrict와 명시 cascade는 같은 ref owner를 쓴다.
Basic에는 image authoring action을 등록하지 않고 Full/Basic 모두 concrete image rendering을 제공한다.

Image mark는 dataset 없는 단일 item이다. Image ref/alt는 semantic layer, placement 의도는 config,
resolved draw rectangle과 viewport/추가 clip은 graphicSpec에 둔다. Selection key는 resource 교체 후에도
유지되며 opacity highlight를 재적용한다. Field encoding과 scale/axis/legend 생성은 이 mark에 해당하지
않으므로 명시 오류다. Hit/inspection은 clip된 rectangle이며 pixel alpha hit를 암시하지 않는다.
접근성은 alt와 단일 item을 제공한다. Facet/repeat의 주 데이터 선택에서 decorative image를 제외하고
자식 plot마다 같은 명시 resource를 보존한다. Concat의 자식은 명시 경로로 편집한다.

ConcreteImage는 bytes/hash/MIME/dimensions를 가진 하나의 self-contained 값이다. URI/host 객체는
renderer가 읽지 않는다. Canvas는 명시 `prepareImageRendering`의 decoder와 opaque handle을 사용하고,
SVG는 data URI, PNG/PDF는 내부 native decoder를 사용한다. 어느 경로도 URL을 fetch하지 않는다.
같은 hash를 한 번 decode하며 개별 16MiB/64MiPixels, 준비 전체 unique 64MiB/64MiPixels를 callback 전에
검사한다. Editable/graphic snapshot 모두 embedded bytes를 검증하여 offline 복원한다.

CanvasTransitionScene overload는 기존 공통 concrete compiler를 공유한다. Mutable scene의 exact content가
바뀌면 준비 handle을 context clear/resize 전에 거부한다. 경로 command와 image의 원점 이동을 literal pixel로
검증하며 기존 path clip을 같은 compiler가 보존한다. 이 작은 overload는 사용자 전면 승인 범위의 scene
consumer 요구를 완결하며 별도 public helper/schema를 만들지 않는다.

## 검증 이력과 재현

안정 slice는 `test/charts/image-assets/`, 정본은 `examples/image-assets/program.js`다. 네 backend의
6×11 interior 표본 264개와 same-run public/primitive 전체 decoded pixel equality를 분리한다.
과거 PDF edge 2개 실패는 원래 REVIEW-EVIDENCE에 남기며 backend 전체 edge equality를 주장하지 않는다.

최초 전체 coverage는 7,051개 중 7,043개를 통과했다. 실패 8개는 실행 중 바뀐 README/생성 문서와 아직
commit되지 않은 예제 branch 링크였다. Runtime assertion 실패는 없었지만 이 실행을 최종 통과로 세지 않는다.
최초 realistic 10개 중 9개 통과, 실패는 새 opaque image API의 excluded option count가 한 assertion에서
갱신되지 않은 것이었다. 실측 count를 보존하고 assertion을 동기화했다. 최초 설치 tutorial의 native import가
browser bundle에 유입된 실패는 명시 browser/native decoder 분리로 수정했으며 source-free tutorial은 재통과했다.
이 중간 증거는 `.artifacts/image-public/`의 최초 log/receipt에 남긴다.

`a561ae1c`를 병합한 후 focused 64/64와 source/package/type/discovery 47/47을 통과했다.
Scene helper는 normal 23/23 및 line/branch/function 각각100%다. 최종 검증의 입력 hash, 명령, 결과 및
package dimensions는 다음 검증 절에 기록한다. Font resource와 최종 asset bundle은 후속 STEP의 범위다.

## 최종 검증

검증 대상 runtime은 `ee0a90db`, 공개 문서 provenance는 `ac7b2f7b`다. 최종 실행은 그 위에
브라우저 실측 한도/architecture 표, public·primitive PDF 비교, realistic inventory 기대값의
네 파일 교정을 포함했다. 전체 실행 전후 추적 입력 7,138개 파일의 SHA256 변화는 `[]`다.
정확한 입력 목록·최종 결과·압축 로그는 [PUBLIC_EVIDENCE.json](PUBLIC_EVIDENCE.json)과
`public-evidence/`에 보존했다. 이후 변경은 이 실행 기록과 실측 주석뿐이다.

| 검증 | 결과 |
| --- | --- |
| `node scripts/run-tests.js coverage` | normal discovery 1,156 files, 7,148/7,148 tests; lines 96.25%, branches 94.02%, functions 98.85%; critical floors 285/285 |
| 이미지 + 조건부 위치/텍스트 focused | 64/64 |
| source/package/types/discovery | 47/47 |
| Canvas scene focused coverage | 23/23, lines/branches/functions 100/100/100% |
| generated lifecycle/feature realistic | 10/10 |
| 이미지 renderer | 6 variants × 11 interiors × 4 backends = 264; public/primitive PNG와 PDF 각각 전체 decoded pixels exact |
| built documentation | 151 pages, 1,245 selective artifacts; desktop 및 320/390/768 responsive/accessibility 통과 |
| installed Node 20.20.2 / 22.23.1 / 24.22.1 | 각 202 Node cases, 71 tutorials, 7 qualification groups 통과 |
| gallery | approved 60 variants, active review 0; 두 gallery 검증 통과 |

Canonical coverage는 `all`과 같은 normal discovery를 실행한다. 중복 normal 실행은 host 부하를 줄이기
위해 SIGTERM으로 종료했으며 성공 실행으로 세지 않는다. 수정 전 architecture browser 한도를 읽은
이전 coverage도 종료 기록을 보존하고, 표 교정 후 위 전체 실행을 다시 시작했다. 최종 실행은 실패 0이다.
Realistic의 총 작성 경로는 26,162개(required 17,493/excluded 8,669), scale type 경로 205개/값 958개,
ledger 요구 31,526개다. 수를 줄여 통과시키지 않고 실제 public inventory와 일치시켰다.

동일 source-free 설치 artifact의 SHA256은
`67f853cab90584f8167ad402673d768d5f34b1ea996c2a9f50b92dd3624018fc`다.
Node 22 pack은 769 entries / 1,128,489 packed / 5,217,216 unpacked bytes이고 독립 재포장도 같은 hash다.
Node 20/24 pack 실측 최대는 1,131,244 bytes로 승인 범위의 실행환경 차이를 한도에 반영했다.
세 설치 검증은 새로 서로 다른 artifact를 만들지 않고 위 동일 tarball을 사용했다.

Browser gzip 실측 최대 Full 556,214 / Basic 329,870 bytes에 대해 한도는 557,000 / 330,000이다.
Node 20의 첫 Full bundle 검사만 임시 556,000 한도를 초과했으며, 그 실패를 보존하고 실측 한도 교정 후
동일 artifact의 해당 group을 재검증했다. 나머지 여섯 group과 Node cases/tutorials는 최초 실행에서 통과했다.
전체 renderer 간 edge pixel equality를 주장하지 않으며 과거 edge 실패도 삭제하지 않았다.

재현 명령은 `PUBLIC_EVIDENCE.json`의 각 검증 항목을 따른다. Docs build에는 저장소가 사용하는
Ruby 3.2 및 Node 22 PATH를 적용했다. STEP-019 font와 후행 export asset bundle/AT-04·AT-14 전체 종료는
이 이미지 checkpoint의 완료 주장에 포함하지 않는다.
