# 이미지 공개 연결 I1–I4

## 진행 상태

- [x] 승인된 resource 준비/동기 적용, mark lifecycle, concrete payload, 네 renderer 연결
- [x] resource lineage, selection/highlight, inspection/accessibility, composition, editable/graphic 복원
- [x] Full/Basic 선언과 공개 예제, Current, 생성 문서 및 source-free 설치 fixture
- [x] 최신 통합 기준 `a561ae1c` 병합 후 이미지/조건부 위치·텍스트 교차 64개 및 경계 47개 통과
- [ ] 최종 frozen source의 전체 normal/coverage, realistic inventory, package/설치 검증
- [ ] 검증된 구현 checkpoint commit/push

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
