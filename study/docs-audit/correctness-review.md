# Documentation correctness and maintenance audit

기준: ggaction `v0.0.22`, `202b7afd4146a691c136964c4cc53f9c37444513`, 2026-10-23. 이 문서는 문서 정확성, 예제 실행성, 생성·검증 체계에 관한 하위 조사다. 저장소 소스는 수정하지 않았다.

## 결론

문서의 **생성 일관성·링크·서명·페이지 구조**를 검증하는 기반은 상당히 강하다. 반면 **독자가 복사하는 개별 예제가 실제로 실행되는지**, **수기로 작성한 옵션 표와 설명이 현재 구현과 맞는지**에 공백이 있다. 단순히 생성물을 다시 만들거나 전체 테스트가 통과했다는 사실만으로 해결할 수 없다.

이번에 확인한 대표적 차이는 다음과 같다.

- 실제 공개 코드 블록 7개가 Canvas 생성 누락으로 실행에 실패했다. 정확히 그 위치에 `.createCanvas()` 하나를 추가하면 모두 성공한다.
- 동일 체크아웃의 기존 문서 실행 테스트는 **47/47 통과**했다. 테스트가 고장 난 7개 블록을 실행하지 않기 때문이다.
- 시간 변환의 `as` 필수 여부, point stroke 너비 기본값, 회귀의 허용 interval 값과 LOESS 이웃 수, 브라우저 자동 검증 범위에 상충하는 설명이 있다.
- exact runtime reference와 다운로드 가능한 타입 표면은 모든 공개 entry를 포괄하지 않는다.

## 조사 범위와 재현 자료

기계 조사에서 내부 `AGENTS.md`, 개발용 `docs/README.md`, `_sources/`를 제외한 공개 Markdown은 150개다. 이 파일들에 JavaScript 코드 블록 675개, TypeScript 블록 974개가 있다. 생성 reference의 반복 블록도 포함한 개수이며 고유 예제 수나 실행 커버리지 백분율이 아니다.

`snippet_programs.json`에서 실행 대상으로 선택한 블록은 46개다. `api/`, `advanced/`, `extension/`의 별도 snippet inventory에는 332개가 있고 그 중 `executable: true`는 2개다. 이 수치를 "다른 330개는 어디서도 테스트되지 않는다"고 해석하면 안 된다. 별도 focused tests와 package/browser tests도 존재한다. 다만 전체 블록을 열거하여 실행 또는 의도적 비실행을 명시하는 하나의 완전한 증명 체계가 없다.

- [재현 스크립트](./correctness-probes.mjs): `node study/docs-audit/correctness-probes.mjs` (작업 폴더 루트에서 실행).
- [정확한 코드·위치·원본 실패·Canvas 추가 성공·기본값 결과](./correctness-evidence.json).
- [기존 실행 테스트 결과](./correctness-executable-tests.log): `node --test test/docs/executable-programs.test.js`, 47 pass, 0 fail, 약 3.34초.
- [생성물 freshness 검사](./correctness-freshness.json): catalogue, relationships, cards, inspection descriptors, provenance, workflows, example index, capabilities, reference, picker, scale editors, action metadata, signatures, snippet contracts, page metadata, search, machine artifacts의 check mode **17/17 통과**. 생성물이 원본과 같은지와 내용의 진실성은 별개다.

## C1 — P1: 공개 mark 작성 예제 7개가 실행되지 않음 [확정]

모든 아래 블록은 `chart()`로 새 빈 프로그램을 만들고 바로 mark/encoding을 작성한다. 적절한 import와 데이터 변수를 제공해도 `Graphical layout requires Canvas dimensions and margin.` 오류로 실패한다. 앞 문단의 prepared program을 제공할 수 있는 continuation도 아니다. 코드 자신이 `chart()`로 상태를 새로 시작하기 때문이다.

| 파일 | 코드 블록 시작 | 의도 |
| --- | ---: | --- |
| `docs/api/marks/bar.md` | 29 | histogram bar mark |
| `docs/api/marks/line-area.md` | 23 | temporal aggregate line |
| `docs/api/marks/line-area.md` | 125 | bar 위 aggregate line |
| `docs/api/marks/line-area.md` | 207 | polar/radar line |
| `docs/api/marks/line-area.md` | 234 | interval area |
| `docs/api/marks/point.md` | 35 | scatter point mark |
| `docs/recipes/line-chart.md` | 62 | bar 위 aggregate line |

**증명:** 공개 코드 그대로 실행하고, 비교군에서 `chart()`를 `chart().createCanvas()`로만 바꾸었다. 7개 모두 전자는 실패, 후자는 성공했다. cars는 저장소의 기존 문서 fixture, 나머지는 코드가 요구하는 field를 갖춘 최소 배열을 썼다. [원본과 결과](./correctness-evidence.json)에 모두 기록했다.

**영향:** 사람은 기본 예제에서 막히고 agent는 Canvas 없는 패턴을 반복 학습한다. "Contextual fragment"라는 일반 문구는 이 초기 상태 오류를 설명하거나 보완하지 못한다.

**개선:** fresh chain에 Canvas를 포함하거나, 명명된 실행 가능한 setup을 상속하는 continuation으로 바꾼다. import, 입력 field, 초기 상태, 예상 결과를 블록별로 명시한다.

**완료 기준:** 7개 공개 블록을 코드 변경 없이 추출하여 실행하고 결과 graphics를 확인한다. 해당 패턴을 찾는 검사도 유지하되, `chart()`만 있고 그래픽을 만들지 않는 순수 데이터 변환 예제는 허용한다. 생성 LLM bundle에도 수정 코드가 들어가야 한다.

## C2 — P1: 실행 계약이 페이지당 선택 블록 하나에 머묾 [확정된 유지보수 공백]

`scripts/doc-snippets.js:45-56`은 registry의 파일마다 `contains`에 처음 맞는 블록, `Complete program`의 첫 블록, 또는 첫 JavaScript 블록 하나만 선택한다. `test/docs/executable-programs.test.js:14-46`도 이 선택 결과만 실행한다. `test/docs/documentation.test.js:673-692`는 primary recipe의 **첫 블록**만 문법 검사한다.

`scripts/generate-doc-snippet-contracts.js:26-49`는 api/advanced/extension 블록을 inventory에 포함시키지만 registry에 정확히 일치하지 않는 블록은 기본적으로 `fragment`로 분류하고 `executable: false`로 기록한다. `:39-43`의 자동 prerequisites는 데이터 식별자, required setup action, 실제 available resource를 검증하지 않는다. 그래서 C1을 놓친 채 테스트와 inventory freshness가 모두 통과한다.

**개선:** 파일 단위 registry를 block ID 단위로 바꾼다. 블록은 `complete`, `continuation`, `alternative`, `expected-error`, `type-only` 중 하나를 명시하고, continuation은 setup ID와 입력 fixture를 선언한다. `fragment`는 비실행을 뜻하지 않게 한다. 순수 설명 pseudo-code만 이유와 검토자를 포함한 명시적 예외로 남긴다. 기존 focused tests는 유지하고 새로운 중복 테스트를 무조건 늘리는 대신 실제 공개 코드 추출을 재사용한다.

**완료 기준:** 공개 JS 블록 전체가 정확히 한 계약에 배정되고, 모든 실행 가능한 블록이 원문 그대로 실행된다. 중간 예제 수정으로 의도적 실패를 만들었을 때 CI가 실패해야 한다. 성공 반환뿐 아니라 관련 데이터 grain, 예상 field, 대상 mark/scale 또는 출력값 하나를 검증한다. 브라우저가 필요한 예제는 실제 브라우저에서도 수행한다.

## C3 — P2: `createTimeUnitData.as`의 필수 여부가 같은 페이지에서 상충 [확정]

- `docs/api/data/time-units.md:18`: 생략하면 `${field}_${unit}` 사용.
- 같은 페이지 `:20`: `as?`.
- 같은 페이지 `:57`: 표에서는 **required**.
- `types/program.d.ts:2498-2505`: `as?: string`.
- `src/grammar/timeUnit.js:125-129`: 실제 default inference.

**증명:** `createTimeUnitData({ id: "month", field: "date", unit: "month" })`가 성공하며 `date_month: 1714521600000`을 만든다.

**개선:** 표의 default를 `${field}_${unit}`로 통일하고 collision 규칙만 별도로 설명한다. required/optional은 타입 metadata에서 가져오며 default는 검증 가능한 fixture와 연결한다.

**완료 기준:** `as` 생략과 명시, collision의 문서 예제가 실제 실행되며 표·reference·action card의 필수 여부가 일치한다.

## C4 — P2: 브라우저 compatibility 설명이 현재 CI와 상충 [확정]

- `docs/compatibility.md:8-12`: Chromium 이외 modern ESM browser는 현재 automated compatibility claim 밖이라고 선언.
- `docs/api/rendering.md:104-117`: Chromium·Firefox·WebKit 대표 장면 검증을 정확히 명시.
- `.github/workflows/ci.yml:223-247`: Firefox/WebKit matrix와 실행 명령.
- `.github/workflows/release.yml:466` 이후: 동일 release candidate에 대한 browser qualification.

이는 "문서 UI 자체의 검색·반응형은 Chromium에서 검사"와 "라이브러리 출력 compatibility는 세 engine에서 검사"의 범위가 섞여 생긴 과거 설명 잔존이다.

**개선:** compatibility 페이지에 Node/OS/browser/검증 종류/제한을 구분한 하나의 canonical matrix를 두고 rendering 페이지는 링크하거나 동일 데이터로 표를 생성한다. 모든 browser version이나 font가 검증된 것처럼 과장하지 않는다.

**완료 기준:** CI matrix 변경이 public matrix drift 검사에 반영되고, docs UI engine과 library renderer engine이 구분되어야 한다.

## C5 — P2: exact runtime reference와 machine type export가 공개 entry를 전부 다루지 않음 [확정된 커버리지 공백]

`package.json`에는 공개 import entry 11개가 있다. `scripts/generate-doc-signatures.js:113-130`은 그 중 7개(`ggaction`, `basic`, `svg`, `png`, `pdf`, `diagnostics`, `persistence`)만 runtime declaration으로 생성한다. `extension`, `accessibility`, `inspection`, `scene`이 빠져 있다. `docs/reference/runtime.md:17-157` 결과도 같다.

각 entry는 다른 페이지에서 설명되므로 기능 자체가 미문서화되었다는 뜻은 아니다. 그러나 `docs/llms.txt:75`의 exact runtime route로 들어온 소비자는 새 helper의 정확한 return schema와 overload를 얻을 수 없다. 특히 `types/inspection.d.ts:4-17`의 Finding/CheckResult/ProgramInspection, `types/scene.d.ts:33-35`의 overload, `types/accessibility.d.ts:4-37`의 반환 schema는 코드 생성에 중요하다.

`scripts/generate-doc-machine-artifacts.js:7-17`은 타입 파일 중 `program.d.ts` 하나만 공개한다. 소스 원문을 자동으로 찾지 않는 agent에게 전체 exported runtime 계약을 조합할 공식 경로가 불완전하다.

**개선:** `package.json.exports`를 공개 surface inventory로 삼고 각 entry마다 exact signature, 관련 타입, runnable example, 지원 환경, canonical route를 지정한다. 실제 public type dependency closure를 site machine artifacts와 manifest에 포함한다. 모든 타입을 한 화면에 펼치기보다는 entry별 분할과 탐색 링크를 제공한다.

**완료 기준:** 11/11 exported entry가 한 normative route와 generated contract를 갖고, 그 파일들만 다운로드한 TypeScript 소비자 예제가 컴파일된다. 새 export를 추가하고 문서 owner를 누락하면 CI가 실패한다.

## C6 — P2: 수기 signature·기본값·통계 설명이 부분적으로 오래됨 [확정]

정규식으로 단순한 `{ option, option? }` 형태의 API heading만 비교해도 타입의 옵션을 빠뜨린 heading 15개가 나온다. 이는 전체 heading의 완전한 분석이 아니며, 일부는 뒤 본문에서 해당 옵션을 설명한다. 따라서 기능 부재로 집계하지 않고 **완전한 signature처럼 보이는 축약 제목**으로 분류한다. 전체 목록은 [증거 JSON](./correctness-evidence.json)의 `abbreviatedSignatures`에 있다.

대표 사례:

| 위치 | 현재 문서 | 실제 계약 / 근거 |
| --- | --- | --- |
| `docs/api/data/statistical-transforms.md:10,30-44` | `robustIterations`를 signature와 옵션 표에서 누락 | `createRegressionData` 선언과 `docs/api/regression.md:68,125-139`는 지원을 설명 |
| `docs/api/appearance/mark-style.md:164` | `encodeBarWidth` 제목에 `interval` 없음 | generated declaration은 interval branch 포함 |
| `docs/api/marks/point.md:64` | edit signature에 `missing`, `clip` 없음 | `src/actions/marks/point/edit.js:20,34`가 허용 |
| `docs/api/marks/bar.md:21` | create signature에 `orientation`, `clip` 없음 | 같은 페이지 `:13-19`는 orientation을 안내하므로 제목과 본문도 어긋남 |
| `docs/api/marks/point.md:24` | `strokeWidth` default를 무조건 `0`으로 표시 | stroke를 주면 `1`; `src/actions/marks/point/edit.js:93-98`, 실측 graphic property `strokeWidth: 1` |
| `docs/api/data/statistical-transforms.md:42` / `docs/api/regression.md:72` | interval type을 `"mean"` 또는 `"prediction"`으로만 표기 | 같은 페이지 아래는 `false`도 지원한다고 설명 (`:49`, regression `:100`) |
| `docs/api/data/statistical-transforms.md:50-52` | LOESS 이웃 수 `ceil(span * groupSize)` | 실제는 `max(2, ceil(span * groupSize))`; `src/grammar/regression/models.js:437`, `docs/api/regression.md:125-127` |

**개선:** exact signature와 required/type table은 생성 metadata로 한 번만 소유한다. API family의 사람이 읽는 short call pattern은 "common pattern; complete options" 링크로 구분한다. default·inference·method branch는 독립 prose 복제를 피하고 실행 가능한 contract fixture를 연결한다. 단순 prose string presence 검사를 추가하는 것은 이 문제의 근본 해결이 아니다.

**완료 기준:** 15개 제목은 완전한 생성 signature 또는 명시적 축약 pattern으로 구분된다. stroke 유무의 default, interval false branch, 작은 span LOESS behavior가 표와 런타임에 일치한다. 타입에 option을 추가하면 관련 exact table이 자동 갱신되고 human explanation 검토 대상이 드러난다.

## 유지해야 할 강점

1. `test/docs/action-reference.test.js:9-33`은 293개 direct action에 대해 고유 anchor, 정확한 signature, API layer, option table을 검사한다. generated reference 자체가 전반적으로 stale하다는 증거는 없다.
2. `test/docs/documentation.test.js:164-245`와 `scripts/check-built-docs.js:43-59,80-105`는 소스 및 빌드 결과의 local 링크·anchor·구조를 검사한다. hash/provenance와 release version도 검증한다.
3. `.github/workflows/ci.yml:317-334`는 생성하기 전에 freshness check를 수행한다. stale output을 먼저 덮어써서 감추는 CI 구조가 아니다.
4. docs build 이후 search·keyboard·Axe·responsive browser 검사가 별도로 존재한다. UI 구조 검사가 부족해서 본문 정확성 문제가 생겼다고 일반화해서는 안 된다.
5. canonical chart catalog, canonical example programs, generated image hashes, exact types, action inventory, compact cards가 이미 있으므로 새 병렬 지식 체계를 만드는 대신 연결 범위를 늘리는 편이 낫다.

## 추가 개선 제안 — 현재 버그로 확정하지 않은 항목

- `docs:verify`는 generation부터 시작하고 CI는 check-only 순서를 가진다. 사람이 쓰는 entry point에도 읽기 전용 `docs:check`를 제공하면 freshness 진단과 산출물 갱신 의도를 분리할 수 있다. 이는 현재 CI 결함이라는 뜻은 아니다.
- generator마다 check-mode 표면이 다르다. 예를 들어 `generate-llm-docs.js:347-351`은 CLI 인자에 상관없이 생성한다. 현재 npm 명령에 `docs:llms:check`가 없으므로 허위 계약 위반이라고 단정할 수는 없지만, 통일된 `--check`/`--write` 규약은 실수를 줄인다.
- local link 검사는 외부 URL을 건너뛴다(`scripts/check-built-docs.js:43-47`). 외부 resource 상태는 scheduled/nonblocking 검증으로 관리하되 일시적 network error가 모든 기여를 막지 않도록 한다. 이번 하위 조사에서 외부 broken link를 확정하지 않았다.
- provenance는 runtime/type fingerprint와 생성 상태에 강하지만 hand-written 설명의 의미적 진실을 보장하지 않는다. 실행 예제와 계약 fixture, 변경 영향 목록, 검토 날짜의 조합이 필요하다. 모든 문장에 검토 날짜나 스냅샷을 붙이는 방식은 권장하지 않는다.

## 우선 실행 순서

1. C1의 7개 코드와 다른 agent가 발견한 재현 오류를 같은 예제 실행성 개선으로 묶는다.
2. C2의 block-level 실행 계약을 먼저 도입하여 수정이 다시 퇴행하지 않게 한다.
3. C3/C4/C6의 확인된 모순을 수정하고 canonical prose/metadata owner를 지정한다.
4. C5의 전체 entry 계약 route와 machine export를 완성한다.
5. 그 뒤 검색·분할·LLM token 효율을 개선한다. 정확하지 않은 문서를 더 잘 검색하게 만드는 것으로 완료를 판단하면 안 된다.

이 문서는 검토 보고서이며 구현이나 릴리스를 수행하지 않았다.

## 교차 검토 메모

- **site-review U5:** 유효한 native 2D context로도 조건부 host-state 문제가 재현된다. 문서와 같은 순서로 `editCanvas({ width: 40000, height: 400 })`, `current = candidate`, `render(current, context)`를 실행하면 action은 성공하고 pointer가 바뀐 뒤 renderer가 32,767 차원 제한에서 거절한다. 실제 큰 allocation은 일어나지 않으며 context는 1×1로 남는다. [추가 증거](./correctness-cross-review.json). 따라서 null context만으로 만든 인위적 오류에 한정되지 않는다. 단, 이는 라이브러리 불변성 위반이 아니라 host pointer commit과 output failure를 하나의 catch로 다루는 문서 패턴의 한계다. `docs/errors-and-recovery.md:75`의 "action succeeds" 자체는 코드와 일치하므로 그 문장을 잘못 인용하지 않아야 한다.
- **site-review U6:** initial construction에서 `createCanvas`는 유효하다. existing chart recovery로 읽었을 때의 누락된 전제와 재시도 경로를 지적하는 현재 표현이 적절하다. 반환값 미할당만으로 모든 API fragment를 오류라고 분류하면 과장이다. 여기서는 제목이 recovery를 요구하고 existing canvas에 적용하면 실제 실패한다는 결합이 중요하다.
- **agent metadata allowsEmpty:** schema에 `allowsEmpty`의 empty 대상이 명시되어 있지 않다(`knowledge/action-card.schema.json:150-162`). generator 이름 `emptyResultActions`와 실제 empty-filter 성공은 모순 의심을 강하게 뒷받침하지만, resolver가 이 boolean 때문에 유효한 filter를 거부한다고 주장해서는 안 된다. 의미를 명시하고 empty input/output/graphic completion을 나누어 검증하는 개선으로 제시한다. `editTitle`에 scale을 무조건 요구하거나 constant `encodeColor`에 field를 무조건 요구하는 metadata는 더 명백한 false prerequisite 사례다.
- **published declaration:** site에서 배포하는 `program.d.ts`의 `./extension.js` type dependency 누락은 site machine artifact의 불완전성이다. npm 패키지의 TypeScript 지원이 고장 났다고 확대해서는 안 된다.
