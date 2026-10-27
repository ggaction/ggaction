# Chart-LLM 전수 감사와 번역 충실도 구현 명세

> **과거 코퍼스/번역 조사 — 참고 전용.** 이 장의 원본 사실·수치·이전 권고를 보존한다. 이전의 필수/호환/번역/완료 표현은 최신 계획의 의무가 아니다. POL-09/10에 따라 외부 정합성·통합·번역은 철회되었고, 활성 작업과 시험은 14–15장 및 GGA/USR 원장만 사용한다.

> **범위 개정:** 모든 파일과 원본 선언은 유지한다. 부록 F에 따라 금지된 dual-Y 표현은 별도 policy disposition을 갖고, 허용 원본만 fidelity qualification 대상으로 삼는다. 별도 패널 등 재표현은 원본 합격으로 세지 않는다. 단순 independent Y 선언은 layer/facet 의미를 해석해야 한다.

이 절의 결론은 **현재 공개 번역본은 좋은 액션 구성의 출발점이지만, Chart-LLM 원본 전체의 정적·동적 동등성을 이미 증명한 데이터셋은 아니다**라는 것이다. 원본 1,981개의 번호를 보존한 전수 원장, 공개 번역본 1,387가족의 산출물 검사, 10,174개 프로그램의 AST 검사, 24,957개 저장소 차트 후보의 문법 분류, 현재 ggaction 0.0.26에서 수행한 46개 프로그램 재실행을 서로 다른 증거로 기록했다. 이 구분을 구현과 CI에도 그대로 도입해야 한다.

## C.1 조사 기준과 재현 가능한 분모

2026-10-27 읽기 전용 스냅샷의 기준은 다음과 같다. 원본 파일이나 번역 프로그램, ggaction 코드는 수정하지 않았다.

| 대상 | 고정 커밋 | 의미 |
| --- | --- | --- |
| `hyungkwonko/chart-llm` | `6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24` | 목표 원본 및 저장소 전체 벤치마크 |
| `ggaction/chart-datasets` | `58791ace7212cacb98c2b64e3f92280722ab638e` | 공개된 1,387가족, 10,174개 액션 프로그램 |
| `ggaction/ggaction` | `40ec7edead7fc84de05aad31888dd0f7d264a512` | 이번 일부 프로그램 재실행의 0.0.26 런타임 |

Chart-LLM의 README는 주 데이터셋을 `docs/data/chart`의 1,981개 인간 작성 Vega-Lite 명세로 정의하고, 도구팁·팬/줌·연결 선택과 복합 뷰를 다양성의 핵심으로 설명한다. 따라서 번역 목표를 정지 화면으로 축소하는 것은 원본 데이터셋의 설명과 맞지 않는다. [원본 README L10–14](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/README.md#L10-L14)

저장소 전체는 추적 파일 25,399개, JSON 25,024개다. 모든 JSON을 파싱했고 파싱 실패와 중복 JSON 키를 발견하지 않았다. 이 중 최상위 차트 구조를 가진 후보는 24,957개, 데이터/메타데이터 배열 55개, 데이터/메타데이터 객체 11개, 차트를 내부에 담은 컨테이너 1개다. 후보의 JSON 정규화 해시로 묶으면 24,276종이다. **24,957과 24,276은 유효 차트 수가 아니다.** 최상위 `mark`, `layer`, `facet`, `repeat`, `concat` 등의 구조로 분류한 수이며, 동일 JSON은 동일 실행 환경이나 데이터 상태까지 의미하지 않는다.

| 그룹 | 루트 차트 후보 파일 | 그룹 내부 고유 JSON | 해석 |
| --- | ---: | ---: | --- |
| `docs/data/chart` | 1,981 | 1,981 | 기본 목표 원본. 번호를 영구 보존한다 |
| `chart-48` | 48 | 48 | 별도 출현 위치를 가진 부분집합 |
| `chart-48-in` | 48 | 48 | 입력용 부분집합; 원본과의 alias는 해시로 추적 |
| app 예제 | 11 | 11 | 앱에 포함된 명세 |
| framework sample | 1 | 1 | 프레임워크 샘플 |
| VisQA-release | 52 | 52 | 별도 벤치마크 명세 |
| ChartSeer | 9,917 | 9,897 | 모든 후보가 데이터 선언이 없는 추상 템플릿 |
| Data2Vis | 4,318 | 4,318 | 구형 `config.cell`, `bandSize`와 보조 속성이 있는 명세 |
| nvBench | 7,241 | 6,680 | inline 데이터 기반 후보; 동일 명세의 다중 출현 |
| Vega-Lite benchmark | 718 | 711 | 버전별 예제 출현 및 중복 |
| Vega-Lite v4 benchmark | 622 | 617 | 구형 예제; 별도 dialect qualification 대상 |

그룹 내부 고유 수는 전역 고유 수와 합산할 수 없다. 다른 그룹의 alias와 사본을 보존한 `corpus-duplicate-specs.json`이 중복의 근거다. ChartSeer의 9,917개는 데이터가 없는 문법 템플릿이므로 “원본 화면을 재현했다”라는 판정을 붙일 수 없다. 그렇다고 목표에서 지우지 않는다. 템플릿 인스턴스 생성 규칙, 타입별 테스트 데이터, bin/timeUnit/aggregate 조합의 의미 검사를 갖춘 별도 qualification track으로 다룬다.

루트 후보가 아닌 나머지 67개 JSON도 객체·배열·JSON 문자열 내부를 재귀 검사했다. `exp/d2_utterance/data/vlSpecs.json`에서 **30개 embedded chart 후보**를 추가로 확인했다. 각각의 키를 JSON pointer로 보존했고 28개는 선언 v3 스키마를 통과하며 2개는 실패한다. 따라서 root 파일 후보 24,957개와 내부 chart 출현 30개를 합친 **차트 후보 출현은 24,987개**다. 정규화 JSON 해시로 이 30개와 root 후보의 완전 일치 alias는 없었으므로 합산 고유 후보는 24,306개다. 이 30개를 canonical 1,981개에 몰래 합치거나 제외하지 않는다. composition child는 별도의 독립 원본으로 부풀리지 않고 각 후보의 tree 안에서 검사한다. 상세 경로·원문·스키마 결과는 `corpus-embedded-specs.json`에 있다.

선언된 `$schema`에 대해서도 검증했다. 공식 URL에서 가져온 스키마의 바이트와 SHA-256을 보관하고 Ajv로 구조·타입을 검사했다. `validateFormats:false`이므로 `format` keyword의 의미 검사는 제외했다. `$schema`가 없는 명세를 임의로 v5로 판정하지 않았다.

| 전 저장소 후보의 문법 상태 | 수 |
| --- | ---: |
| 선언한 JSON Schema 통과 | 2,870 |
| 선언한 JSON Schema 실패 | 610 |
| 스키마 미선언으로 dialect 미확정 | 21,476 |
| 선언한 `v4.2.1.json` URL이 404여서 미확정 | 1 |
| 합계 | 24,957 |

주 원본 1,981개는 모두 v5를 선언하지만 1,417개만 해당 스키마를 통과하고 564개는 실패했다. 스키마 통과는 컴파일 성공·데이터 가용성·동작·시각적 정확성을 보증하지 않는다. 반대로 실패는 “의도한 차트가 없다”라는 뜻이 아니다. 과거 `selection` 문법, 비표준 실험 속성, 잘못된 속성 위치 또는 철자가 남을 수 있다. 실패 원본도 원래 해시와 JSON pointer를 보존하고 **원본→dialect 해석→명시적 repair→native program**의 변환 기록을 남겨야 한다. 현재 스키마가 허용하지 않는 속성을 무조건 삭제하여 유효하게 만드는 방식은 금지해야 한다.

재현 명령은 보고서 폴더에서 다음 순서다. `corpus-schema-sources.json`의 각 URL과 SHA-256에 대응하는 스키마 파일은 evidence에 이미 저장되어 있으므로 재검증에는 네트워크가 필요 없다. Node 도구는 현재 ggaction checkout의 Acorn, Ajv, esbuild, Playwright를 사용한다.

```sh
python3 scripts/corpus-census.py
python3 scripts/corpus-source-deltas.py
node scripts/corpus-programs.mjs
node scripts/corpus-schema-validation.mjs
node scripts/corpus-embedded.mjs
node scripts/corpus-runtime-probes.mjs
python3 scripts/corpus-finalize.py
```

## C.2 공개 번역본의 의미와 원본 식별 문제

공개 저장소의 manifest, 실제 폴더, stage 목록은 1,387가족/10,174프로그램으로 일치한다. 선언된 파일의 존재, 바이트 길이, SHA-256과 실제 stage 파일 집합 검사에서 실패가 없었다. Acorn으로 10,174개 ES module을 모두 파싱했고 구문 오류가 없었다. G1의 member-call site 수는 최소 4, 중앙값 12, 최대 235다. 이 수는 `Math.sqrt` 같은 helper 호출도 포함하므로 동적 액션 수나 간결성 점수로 사용하지 않는다. 이번 AST screening에서 반복문, 대입문, `graphicSpec`·`semanticSpec`·`scenegraph` 직접 참조를 발견하지 않았으나, 이것만으로 모든 입력 소유권과 의미 동등성이 증명되는 것은 아니다.

G1부터 G8까지의 프로그램 수는 각각 1,387 / 1,387 / 1,381 / 1,366 / 1,323 / 1,266 / 1,141 / 923이다. 모든 가족을 억지로 8단계까지 늘리는 구조가 아니라, 같은 결과를 의미 있는 작은 액션으로 분해하다가 frontier가 끝나면 멈추는 설계다. 이 원칙은 유지할 가치가 있다. [stage 원칙과 cutoff](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L44-L53)

하지만 공개 번역의 정확한 런타임 pin은 **ggaction 0.0.24**다. `runtime-lock.json`의 source commit은 `5f952f59b9ca236e8e9cff477c4f51067f2f8ea9`, release commit은 `fd5c4073fc80295c513bd099ac0ff0aa83059371`이고 npm archive SHA-256은 `ab6dce015ef4698aa9b1691ce91448c03ce6ad5244d0918a84d3f6f758413889`이다. 이 저장소가 기록한 1,387/10,174 replay 통과는 0.0.24의 사실이다. 0.0.26 전체 replay나 원본 동작 충실도로 옮겨 적으면 안 된다. [runtime pin과 검증 정책](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L86-L113), [runtime-lock](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/runtime-lock.json#L1-L18)

더 중요한 점은 **숫자 ID가 같은 파일이 반드시 이 GitHub 원본과 동일하지 않다**는 것이다.

| 원본 1,981개와 공개 `source.vl.json`의 관계 | 수 | 허용되는 결론 |
| --- | ---: | --- |
| 파일 바이트 동일 | 932 | 이 스냅샷의 원본 파일 식별 가능 |
| 바이트는 다르지만 JSON 정규화 값 동일 | 115 | 직렬화 차이 후보; 실행 환경까지 동일하다는 뜻은 아님 |
| JSON 구조 또는 값이 다름 | 340 | 원본과 다른 source artifact; 차이별 분석 필요 |
| 공개 가족 없음 | 594 | 공개 번역 및 공개 certification 부재 |

따라서 1,387/1,981=70.015%는 **번호가 연결된 공개 가족 비율**이지 충실도나 실제 지원률이 아니다. JSON 값까지 같은 source가 1,047개라는 사실도 번역 결과가 원본과 같은 비율을 뜻하지 않는다. provenance tuple은 `repository + commit + path + bytes SHA-256 + dialect + data-owner hashes`로 정의해야 한다.

`DATA_SOURCES.md`는 보존 대상이 “local corpus”이며 그 로컬 코퍼스에는 전체 라이선스나 canonical repository URL이 없었다고 명시한다. exporter는 그 로컬 workspace의 `source.vl.json`과 검증 기록의 해시를 확인하고 파일을 복사한다. 공개 Chart-LLM 커밋과 비교하는 단계는 이 경로에 없다. 즉, byte-for-byte 보존 주장은 **이미 가공된 로컬 source의 보존**일 수 있으며, 이번 결과만으로 exporter가 원본을 훼손했다고 말할 수 없다. 반대로 README의 “Unchanged original”을 현재 Chart-LLM GitHub 원본과 동일하다고 해석해서도 안 된다. [local corpus 설명](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/DATA_SOURCES.md#L3-L13), [exporter source 입력과 검증](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/scripts/sync-dataset.py#L160-L198), [copy 단계](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/scripts/sync-dataset.py#L266-L293)

왜 과거 로컬 입력에서 상호작용이 제거됐는지는 공개 배포 자료만으로 확정할 수 없다. 확인 가능한 근거는 현재 갤러리가 frozen SVG와 정적 복잡도에 초점을 둔다는 점, 복잡도 계산에서 tooltip과 interactive channel을 제외한다는 점, completion이 원본 Vega-Lite와 정확한 픽셀 일치를 뜻하지 않는다고 밝힌다는 점이다. 이 사실은 정적 변환이 만들어진 배경과 양립하지만, 실제 제거한 주체·시점·정당성을 증명하지 않는다. 과거 실행 로그가 없으면 “추정”으로 유지하고 새로운 원본 provenance로 재검증한다. [정적 catalog 정의](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L20-L27), [completion의 제한](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L161-L164)

## C.3 원본과 다른 340개 source artifact의 분류

변경 JSON pointer를 분류한 결과는 아래와 같다. 한 원본이 여러 범주에 걸칠 수 있으므로 합계는 340을 넘는다. 이 표는 변경의 범위를 보여 주며 모든 변경이 손실이거나 오류라는 뜻은 아니다.

상세 원장에는 1,704개의 차이 기록이 있다. 길이가 다른 배열도 모든 공통 index를 재귀 비교하고 추가·삭제 index를 각각 보존한다. 배열 길이는 같은 배열 pointer의 `kind:"array-length"` 기록으로 별도 표시하며, 이 기록의 before/after는 배열 자체가 아닌 길이다. 나머지 `kind:"value"` 기록은 RFC 6901로 escape한 실제 JSON pointer의 값 변경이다. 길이가 다른 배열을 길이 한 줄로 요약하지 않는다. 모든 pointer를 실제 원본·번역 파일에 다시 적용하여 before/after 또는 excerpt hash가 맞는지 검증했다.

| 변경 범주 | 차트 수 |
| --- | ---: |
| mark 또는 encoding의 외형/선언 | 299 |
| interaction 또는 conditional 선언 | 182 |
| guide 또는 text | 175 |
| transform 또는 통계 의미 | 119 |
| layout 또는 responsiveness | 115 |
| data source 또는 values | 29 |
| empty transform / null aggregate 정규화 후보 | 14 |
| 기타 선언 | 59 |

feature 집합에서 사라진 선언을 따로 세면 selection 143개, 조건부 encoding 92개, hover 51개, brush 41개, pan/zoom 26개, cross-view selection reference 48개, input-binding 63개다. 이 수는 각 원본에서 해당 종류가 완전히 사라진 경우이며 일부 selection만 삭제된 경우를 전부 세는 방법은 아니다. 제거된 null/empty 속성과 동작 삭제를 한 수치로 합쳐 “semantic loss 340개”라고 쓰면 안 된다.

`vl_0035`, `vl_0062`, `vl_0140`, `vl_0200`, `vl_0202`, `vl_0208`은 이번 diff 분류에서 empty-transform/null-aggregate 정규화 후보만 발견됐다. 이것들도 dialect별 기본값 동등성 검증 전까지 무조건 harmless로 확정하지 않는다. 변경 없는 경우와, 동등함을 입증한 정규화와, 원본 의미를 바꾼 repair를 별도 상태로 저장한다.

### C.3.1 `vl_0011`: 화면 replay가 팬/줌을 증명하지 못하는 최소 사례

원본 `/selection`은 `selector014: {type: "interval", bind: "scales", encodings: ["x", "y"]}`이다. 번역 source에서는 `/selection` 전체가 없다. 원본 source 해시는 `d9613aa087f7b139d38d77fcbadfe4e3375465a1cbb10fbac519d97adfd38ac5`, 번역 source 해시는 `47b6825fee809ce6f95911f5536947565472bbae3ff791def672f25f63328ecf`이다. [원본 selection](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0011.vl.json#L32-L41)

현재 0.0.26에서 G1–G7이 모두 실행되고 과거 ggaction SVG와 바이트까지 같다. 그러나 휠과 드래그 후 x/y domain이 변경되는지에 대한 증거는 없다. 새 번역은 `createLinePlot` 등 기존 정적 구성에 domain을 바인딩한 interval state, hit surface, wheel/drag reducer, reset 정책을 연결해야 한다. 테스트는 초기·줌·팬·리셋의 domain과 화면을 함께 비교하고, 드래그가 view 밖으로 나가더라도 pointer capture와 종료가 정확해야 한다.

### C.3.2 `vl_0009`: nearest hover, 조건부 mark, 필터, input의 동시 제거

원본 해시는 `841509ee3e19add08247fa1b80ac5ca7db5ed0212feeb18f9355024b163f9da7`, 번역 source 해시는 `bfd61205f98cdf42aa523ffeca9e9f35efb95c7885750ffc40544b41124615c3`이다. 대표 변경은 다음과 같다.

| JSON pointer | 원본 | 번역 source |
| --- | --- | --- |
| `/layer/1/selection` | `selector040`, single, nearest, mouseover, `DateClean` field | 없음 |
| `/layer/2/encoding/opacity/condition` | selection이면 `value:1` | 없음 |
| `/layer/2/encoding/opacity/value` | `0` | `1` |
| `/layer/3/transform` | `filter:{selection:"selector040"}` | 없음 |
| `/layer/4/encoding/text/condition` | 선택 시 `Value` field 표시 | 없음 |
| `/params` | 원본의 입력 parameter 선언 | 없음 |
| `/transform/13` | `filter:"datum.Year>=minYear"` | 없음 |
| `/transform/14` | `filter:"datum.Year<=maxYear"` | 없음 |

원본에는 여러 연동 레이어와 입력 parameter가 있으므로 “같은 line chart”로 요약하면 의미를 놓친다. [원본 parameter](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0009.vl.json#L70-L90), [hover와 조건](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0009.vl.json#L143-L218)

기존 G1은 `createData → createComputedData(parseTime/replaceLiteral) → line/point/rule/text 구성 → encoding → guides/legend/title`의 native 액션으로 표현된다. 입력 날짜 문자열을 안전한 expression IR로 변환하는 구성은 재사용할 가치가 있다. 하지만 정적 source에 맞춰 포인트를 항상 보이도록 만드는 코드는 original interaction의 번역이 아니다. 원본 보존 버전은 `createSelection({id:"hover", kind:"point", fields:["DateClean"], nearest:true})`, `bindEvent({on:"pointermove", selection:"hover"})`, `encodeCondition({target, channel:"opacity", when:{selection:"hover"}, then:1, else:0})`, `filterData({predicate:{selection:"hover"}})` 같은 **제안 액션**으로 같은 상태를 공유해야 한다. API 이름은 최종 registry 설계에서 통일하되, 상태별 의미와 scope가 먼저 정해져야 한다.

nearest의 의미는 단순 화면상 가장 가까운 점인지, x축 날짜 기준인지, tie일 때 어떤 tuple을 선택하는지 명시해야 한다. 빈 선택의 `empty` 의미도 조건과 filter에서 동일하게 적용해야 한다. 원본이 초기 빈 선택에서 보여 주는 것과 첫 hover 후 보이는 것이 다르면 두 상태 모두 golden으로 저장한다.

### C.3.3 `vl_0002`: 고정 크기 replay가 responsive 계약을 증명하지 못함

원본 `/layer/0/width`와 `/layer/1/width`는 `"container"`, 두 레이어의 `/height`는 `300`이며 번역 source에서 네 속성이 모두 없다. 원본 해시는 `f3acbb98693ca4141b7d339866943a1359a3115508ab362070000ca77b11ca1a`, 번역 source는 `5ee740b0f23728760a3fe3a0397cc4b843c85553215d1a8332068b5ded37fb53`이다. [원본 첫 레이어 크기](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0002.vl.json#L39-L42), [두 번째 크기](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0002.vl.json#L74-L77)

G1–G7은 이번 실행에서 441×347의 동일 SVG를 출력했다. 원본의 layered size 선언이 최신 스키마상 유효한지도 별도 문제지만, 이를 고정 크기로 선택했다면 어떤 container 측정값과 어떤 repair 정책을 적용했는지 남겨야 한다. 320/768/1280px container, 장문 축 라벨, 폰트 로딩 전후에서 plot extent와 줄바꿈·clip·title/legend reserve가 결정적으로 재계산되는지 확인해야 한다. 하나의 고정 441×347 그림은 이 검사를 대신하지 못한다.

## C.4 현재 실행으로 확인한 범위

이번 분석에서 공개 G1–Gn을 현재 0.0.26 소스에 bundle하고 Chromium 153.0.8010.12, en-US, UTC, 1280×960 viewport, DPR2, 네트워크 차단 상태로 실행했다. 설치 폰트의 파일 해시는 별도 고정하지 않았으므로 이것은 전체 배포 certificate가 아니라 진단 probe다.

| 가족 | 프로그램 수 | 현재 실행 | 가족 내 SVG 일치 | frozen ggaction SVG 일치 |
| --- | ---: | --- | --- | --- |
| 0002 | 7 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 0009 | 8 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 0011 | 7 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 0237 | 8 | 모두 성공 | 모두 동일 | 바이트 차이 |
| 1180 | 8 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 1417 | 8 | 모두 성공 | 모두 동일 | 바이트 차이 |

합계 6가족/46프로그램이다. 0237/1417은 0.0.24 문서에도 바이트 차이와 DPR별 raster qualification이 기록되어 있다. **과거 certificate를 0.0.26에 재사용하지 않았다.** 이번 probe에서는 두 SVG의 픽셀 일치까지 인증하지 않았고, 현재 차이를 regression 또는 무해함으로 확정하지 않는다. 전체 10,174개가 현재 버전에서 통과한다고 일반화하지 않는다.

이 probe는 원본 Chart-LLM과 비교한 fidelity test가 아니다. 특히 0009/0011의 source 자체가 원본과 다르므로 frozen 결과와의 완벽한 일치는 원본 동작 손실을 감출 수 있다. 판정 축을 `accepted artifact`, `current runtime replay`, `original data fidelity`, `original geometry fidelity`, `original behavior fidelity`, `responsive fidelity`로 분리해야 하는 직접적인 이유다.

## C.5 원본 선언의 전수 기능 프로필

다음 수는 “해당 선언을 하나 이상 가진 원본 수”다. nested mark의 총 개수나 지원 완료 수가 아니다. 전체 JSON pointer, composition tree, feature별 원본 목록은 `corpus-originals.json`과 `corpus-features.json`에 있다.

| mark | 원본 수 | 구현/검증 방향 |
| --- | ---: | --- |
| line | 859 | path order, invalid gap, interpolation, grouped series, conditional styles |
| bar | 509 | stack, grouped offsets, range/bin spacing, baseline, rounded ends |
| point | 273 | symbol area, shape path, fill/stroke, angle, hit target |
| circle | 258 | area/radius 의미, stroke 포함 bounds |
| text | 172 | multiline, anchor, baseline, offset, wrapping, clipping, formatting |
| rule | 155 | range endpoints, clipping, stroke cap, crosshair interaction |
| area | 135 | stacking, upper/lower path, defined gaps, interpolation |
| geoshape | 129 | 신규 geographic pipeline, 아래 C.8 참조 |
| rect | 82 | bin interval, band geometry, heatmap, overlap order |
| arc | 34 | theta/radius/secondary endpoints, pad/corner, polar labels |
| square | 30 | area normalization, angle, legends |
| tick | 21 | orientation, thickness, band position |
| errorbar | 14 | estimator, interval convention, cap geometry |
| boxplot | 11 | whisker/outlier/median conventions, sample edge cases |
| errorband | 8 | center/bounds, confidence intervals, alpha/overlap |
| image | 3 | 신규 image asset ownership, sizing and loading policy |
| trail | 1 | 신규 variable-width path mesh |

레이어 528개, explicit facet 43개, repeat 32개, hconcat 59개, vconcat 58개, concat 6개가 있다. 이 수는 encoding의 row/column facet과 implicit composite mark 확장을 포함하는 최종 panel 수가 아니다. IR은 원본 node tree와 확장된 view tree 둘 다 보존해야 한다. `unit`라는 이유로 단일 view로 분류하면 encoding-level row/column을 놓치며, 이 점이 #258 같은 layout 실패를 숨길 수 있다.

상호작용 선언은 tooltip 879개, selection 324개, input-binding 263개, conditional encoding 252개, selection reference 185개, variable parameter 161개, hover event 136개, cross-view selection reference 117개, nearest 101개, brush 97개, pan/zoom 63개, hyperlink 3개다. `input-binding` 수는 selection의 `bind` 형태도 포함하는 정적 census이며 263개의 독립 DOM 위젯이 있다는 뜻은 아니다. 조건부 encoding은 정적 predicate를 포함할 수 있어 252개를 모두 event interaction으로 세면 안 된다. 원본 metadata.xlsx의 interaction annotation은 1,010개이며, 자동 선언 census와 정의가 다르므로 어느 쪽도 다른 쪽을 덮어쓰지 않는다.

selection 종류는 interval 97, multi 47, point 70, single 136개에서 발견됐다. 한 원본이 여러 종류를 가질 수 있다. legacy single/multi와 modern point의 선택·toggle·empty·resolve 의미를 통일된 typed selection IR로 옮기되 원본 dialect의 기본값을 기록해야 한다.

| transform | 원본 수 | 현재 액션 구성에 대한 판단 |
| --- | ---: | --- |
| filter | 608 | 기존 정적 predicate와 신규 selection/parameter 반응형 predicate를 구분 |
| calculate | 478 | 안전한 expression IR 번역과 missing/null/type coercion 동등성 검증 |
| lookup | 136 | 입력 owner, 키 타입, 중복키, default와 nested object 보존 |
| fold | 120 | native shaping의 output order와 alias 충돌 검증 |
| window | 49 | peer, frame, sort 안정성, rank/lag/lead 의미 |
| regression | 35 | method별 fitting domain, coefficient, sample grid |
| aggregate | 33 | group/null semantics, sample/population 통계, argmin/argmax tie |
| pivot | 23 | 고정 범주 conditional columns+summary 가능; 일반 동적 pivot의 별도 계약 필요 |
| extent | 21 | extent를 parameter로 내보내 downstream domain을 갱신하는 semantics |
| timeUnit | 13 | UTC/local, week/day boundary, daylight-saving, interval end |
| impute | 10 | absent vs null, keyvals/frame, grouping/order |
| joinaggregate | 9 | group summary를 원래 row/order에 붙이는 native composition |
| flatten | 5 | zip/unequal lengths/index와 null padding |
| loess | 3 | 이미 `createRegressionData`+`editRegressionData(method:"loess")` 존재; 신규 기능으로 오인 금지 |
| stack | 3 | explicit transform뿐 아니라 encoding implicit stack을 함께 검증 |
| density | 2 | 기존 density action과 kernel/bandwidth/domain/grid/normalization 동등성 검증 |
| bin | 1 | explicit transform 수; encoding bin은 별도 다수 |
| quantile | 1 | quantile plot의 probability grid와 estimator convention을 명시 |

예를 들어 `vl_1412`는 기존 native regression에 `method:"loess"`, `span:0.3`, `robustIterations:2`를 설정한다. 따라서 “loess 없음”이 아니라 원본의 smoothing convention과 native output을 수치 검증하는 작업이다. [기존 native LOESS 구성](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_1412/G1.gg.mjs#L8-L18), [원본 LOESS](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_1412.vl.json#L263-L268)

`vl_0054`의 pivot은 세 알려진 범주에 대해 `createComputedData(if category then value else 0)` 세 번 뒤 `createSummaryData(sum)`로 구성되어 있다. 이는 간단한 native action의 조합으로 특정 pivot을 표현한 좋은 사례다. 그러나 동적으로 나타나는 범주, null/missing, non-sum aggregation, duplicate keys, `limit`, schema 변화까지 자동으로 해결했다는 증거는 아니다. general pivot은 고정 범주 조건합과 동등한 전제 조건을 증명할 수 있을 때만 이 lowering을 사용하고, 그 외에는 typed shaping action을 추가해야 한다. [native pivot recipe](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_0054/G1.gg.mjs#L50-L54), [원본 pivot과 hover](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0054.vl.json#L78-L93)

## C.6 C-IR: 원본에서 native 액션까지의 번역 계약

번역기는 Vega renderer를 내부에 넣거나 source JSON을 opaque blob으로 저장한 뒤 통째로 렌더링하는 wrapper가 되어서는 안 된다. runtime core는 source-neutral이어야 하고, import adapter가 dialect와 defaults를 해석하여 공개 native action으로 내리는 구조가 필요하다. source별 예외를 renderer 안에 넣지 않는다.

1. **SourceDocument**: 원본 bytes, 해시, 파일 경로, upstream repository/commit, 선언 schema, parse diagnostics. 원본은 immutable이다.
2. **DialectResolution**: legacy/modern selection, config의 옛 위치, bin/timeUnit/scale 기본값, invalid value 정책을 판정한다. 스키마와 작성 문법이 충돌하면 repair record에 before/after pointer, 사유, 승인된 의미, reference hash를 기록한다. 불명확한 부분은 unresolved로 유지한다.
3. **ResolvedSourceIR**: 데이터 owner, lexical scope, view tree, transforms, scale/guide resolution, mark/encoding, parameter/selection, interaction graph, projection, asset graph를 타입으로 표현한다. 각 node는 source pointer와 source span을 가진다.
4. **SemanticLowering**: 최소한의 native action DAG로 변환한다. 부모 data의 상속과 child override, cross-view selection resolution, layer/concat/facet scope를 보존한다. 각 source node가 어느 action/semantic object로 내려갔는지 mapping을 만든다.
5. **NativeProgram**: 공개 action registry의 버전과 입력·출력 ID를 명시한다. JS helper나 generic path escape hatch로 원본 문제를 숨기지 않는다. G1은 의미가 있는 조합, G2 이후는 같은 semantic object와 output을 유지하는 refinement이다.
6. **Qualification**: 데이터·수치·geometry·guide/text·interaction state·resize·animation timeline의 독립 oracle을 통과시킨다. 실패는 원본 ID와 source pointer까지 돌아가야 한다.

`loweringCoverage`에는 원본의 모든 비메타 선언이 소비됐는지 저장한다. `tooltip`, `params`, `selection`, `projection`, `resolve`, `config`, `autosize`, `href` 등 사용하지 않은 선언이 있으면 명시적인 unsupported 진단을 발생시킨다. 최신 사용자 정책에 의한 제외/금지라면 unsupported 대신 해당 policy ID와 disposition을 기록하고 source pointer를 유지한다. 조용히 삭제하고 그림만 만드는 것을 통과로 처리하지 않는다. 단, 사용되지 않는 description/usermeta나 dialect에서 의미가 없는 선언은 구체적 이유와 함께 `non-semantic`으로 분류할 수 있다.

단순한 액션의 기준은 줄 수 최소화가 아니라 (a) 하나의 명확한 역할, (b) 재사용 가능한 인수, (c) immutable return, (d) state/ownership이 드러나는 ID, (e) 부분 편집 가능한 의미 단위다. `createEverythingFromVega(spec)`도, 수천 개의 `createPath`로 scenegraph를 복제하는 코드도 이 기준을 만족시키지 못한다.

## C.7 C-EXP / C-DATA: 안전한 표현식과 데이터 보존

원본 표현식에서 문자열 리터럴을 제외한 lexical function 후보는 `timeParse` 93개, `substring` 72개, `join` 68개, `year` 63개, `if` 36개, `format` 32개, `replace` 21개, `parseInt`/`toNumber` 각 18개를 포함한다. 이 추출은 AST parsing 결과가 아니며 문자열/정규식/문법의 최종 해석은 dialect parser가 해야 한다. 낮은 빈도라도 `geoCentroid`, `scale`, `quantileNormal`, `quantileUniform`, `random`, `sequence`, `test`, UTC date helper가 존재한다.

구현은 source expression을 `eval`/`Function`으로 실행하는 대신 제한된 parser와 typed expression IR을 사용한다. `{field}`, `{constant}`, unary/binary/conditional, safe call, parameter ref, selection predicate, transform output ref를 구분한다. 배열/object 접근, 문자열 escape, field 이름에 점/공백이 있는 경우, null/missing/NaN, `-0`, Infinity, equality/coercion, regex subset, 날짜 파싱의 timezone을 테스트한다. 함수별 pure/deterministic/stateful 의존성을 registry에 표시한다. `random()`은 seeded reference policy가 있어야 재현 가능하며 user source에 seed를 몰래 추가하지 않는다. `scale()`은 scale scope와 domain 변경에 반응해야 하므로 단순 데이터 전처리 함수가 아니다.

데이터 선언은 remote URL을 가진 원본 1,449개, inline values 363개, named data 256개, embedded datasets 203개다. 서로 겹칠 수 있다. root `datasets`에서 이름을 찾는 단순 검사로 53개 원본의 named reference가 해결되지 않았다. 이는 full lexical-scope resolver의 최종 실패 수가 아니며 외부 주입 데이터·nested scope·미완성 source 가능성을 따로 확인해야 한다. 이번 감사는 URL을 전수 재다운로드하거나 HTTP 정상 여부를 확인하지 않았으므로 remote data의 현재 가용성은 미확정이다.

필수 resolver 계약은 다음과 같다.

- `DataOwner`는 값이 같은 테이블도 원본 소유자가 다르면 구분한다. 부모에서 상속한 참조와 별개 입력을 합치지 않는다. 빈 원본 table도 유지한다.
- URL의 원본 문자열, 최종 redirect, MIME, fetch 시점, status, 응답 SHA-256, parse format, source pointer, 캐시 파일을 남긴다. mutable main URL과 commit-pinned URL을 구별한다.
- CSV/TSV/JSON/TopoJSON과 `format.property`, `format.parse`, 날짜/숫자 parser를 source semantics에 맞춘다. 로컬 테스트는 immutable cache만 사용하고 network 변화는 별도 freshness check로 관리한다.
- typed row/key order와 `-0`, null/absent, duplicate keys 처리 방침을 보존한다. transform 전 원본과 transform 후 파생 테이블은 별도 provenance를 가진다.
- lookup은 보조 입력을 모두 inventory에 포함한다. row count가 작거나 chart에서 일부만 사용한다고 원본 table을 truncate하지 않는다.
- image URL과 geo resource도 같은 asset graph에 포함한다. 데이터가 없으면 `blocked-data`로 기록하고 translation capability와 분리한다.

공개 데이터셋의 raw-input ownership 검사와 Acorn import-binding audit는 그대로 발전시킬 가치가 있다. 이 기존 검증은 새로운 canonical source identity 확인 단계와 연결해야 한다. [기존 입력 소유권과 원본 row 검증](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L140-L153)

## C.8 C-GEO / C-ASSET: 지리와 비정형 마크

geoshape 선언이 있는 129개와 longitude/latitude 계열을 사용하는 27개 원본은 **공개 1,387가족에 하나도 포함되지 않았다**. 이미지 3개와 trail 1개도 전부 미포함이다. 지도/이미지/trail을 canonical denominator에서 제거하면 현재 번역의 넓은 coverage를 과장하게 된다.

projection 선언은 112개이며 타입은 mercator 42, naturalEarth1 25, albersUsa 20, equalEarth 12, identity 7, equirectangular 4, orthographic 3, conicConformal 2, conicEquidistant 1개에서 나타난다. 여러 projection이 있는 원본은 중복 집계될 수 있다. TopoJSON feature reference 75개, graticule 2개, sphere 1개도 확인했다.

**필수 native primitive**는 `createProjection`, `createGeoShape`, `encodeLongitude`, `encodeLatitude`, `encodeGeoGeometry`, `createGeoGraticule` 또는 동등한 source-neutral API다. API 표면보다 semantic model을 먼저 만든다. projection은 type, center, rotate, parallels, scale, translate, precision, clipping, fit extent, reflect, datum/units를 명시하고 view별 소유권을 가진다. geoshape는 feature ID·properties·geometry·원본 owner를 보존해야 한다. GeoJSON Feature/FeatureCollection/GeometryCollection, Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon, TopoJSON arc decoding과 feature extraction을 지원한다.

`createData(geometry) → createProjection({type,fit}) → createGeoShape({data,projection}) → encodeColor({field}) → createLegend`가 기본 choropleth recipe다. 지명/관측점은 같은 projection을 공유하는 point/text layer로 추가한다. 지리선을 Cartesian 직선으로 대신하지 말고 great-circle 또는 source가 요구하는 곡선·resampling 의미를 명시한다. sphere/background와 graticule도 projection clipping을 공유한다. [원본의 복합 지도 레이어 예](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0004.vl.json#L1-L58)

통과 기준은 단순히 “미국 지도가 보임”이 아니다. antimeridian crossing, polygon hole/winding, polar clipping, multipolygon, empty/null geometry, projection fit 후 bounds, identity projection의 y reflection, sphere, graticule, inset projection, 입력 좌표 순서와 degree/radian convention을 fixture로 고정한다. geographic hit testing은 화면에 projection된 geometry를 사용하되 선택 결과는 원본 feature ID로 반환한다. 줌/팬 후 tooltip/selection mapping, facet마다 다른 projection scope, resize 후 fit와 explicit scale의 우선순위를 검증한다. 애니메이션 중 projection parameters가 바뀌면 clipping/resampling과 hit geometry도 동일한 시점으로 갱신해야 한다.

image mark는 asset data와 drawable object를 분리하고 URL field, intrinsic size, explicit width/height, aspect ratio fit, align/baseline, clipping, opacity, cross-origin/export 가능 여부, load/error state를 계약으로 만든다. 대체 텍스트와 안정적인 export failure 진단도 필요하다. bitmap을 data mark의 대용으로 사용하여 차트 전체를 붙이는 번역은 허용하지 않는다.

trail은 각 sample의 size가 선폭에 영향을 주는 ordered path다. `createTrailMark`와 `encodeWidth` 또는 기존 line type의 명시적 variable-width 확장으로 표현한다. normal vector, joins/caps, zero-length segments, duplicate x, reversed order, missing gaps, variable width interpolation, stroke/fill bounds를 수치 검증한다. [유일한 canonical trail 원본](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_1775.vl.json#L25-L31)

## C.9 C-INT: 반응형 상태와 이벤트의 실행 의미

정적 `selectMarks`·`highlightMarks`가 존재해도 pointer 이벤트, brush lifetime, cross-view selection storage, control binding을 구현한 것은 아니다. 이 차이를 API 문서와 capability manifest에 드러내야 한다. 하나의 event를 처리할 때 `hitTest → event normalize → selection/parameter reducer → dependency invalidation → data/scale/mark rematerialize → render → accessible state update`가 동일한 transaction으로 수행되어야 한다.

최소 상태 모델은 point tuple set, interval domains, scalar parameter, legend category selection, view viewport를 구분한다. 상태의 owner/view scope, stable ID, initial value, empty semantics, union/intersection/global resolve, toggle, clear, nearest, projection field, event filter를 포함한다. tool/runtime가 state JSON을 export/import할 수 있어 agent가 현재 상태를 읽고 재현할 수 있어야 한다. event handler의 JS closure를 프로그램의 유일한 진실로 삼지 않는다.

필수 작은 액션의 역할은 다음과 같다. 이름은 제안이며 현재 구현된 API로 오인하지 않는다.

| 제안 액션 역할 | 핵심 인수와 결과 | 검증 oracle |
| --- | --- | --- |
| selection 선언 | ID, point/interval, fields/encodings, resolve, empty | 직렬화된 state schema와 scope |
| event binding | event stream, target view/marks, filter, reducer | pointer/key/wheel event trace |
| conditional encoding | target, channel, predicate, then/else | 상태별 mark props, default 복원 |
| parameter 선언/편집 | 타입, 초기값, allowed range/options | invalid value 거절, downstream 갱신 |
| input control binding | range/select/checkbox/radio/text, parameter ID | keyboard/input/change, label/ARIA |
| tooltip | fields, format, anchor, trigger, aggregate policy | 내용·좌표·hide lifecycle |
| viewport binding | x/y scales, zoom anchor, clamp, reset | domain과 화면 bounds |
| linked filter | source/selection scopes, predicate | 선택한 tuple과 출력 row IDs |

브러시가 빈 상태일 때 all인지 none인지, multi의 Shift toggle과 click clear가 무엇인지, legend binding이 field-domain과 어떻게 연결되는지 원본 dialect에 맞게 테스트한다. hover에서 원본이 nearest selection을 사용하면 SVG 요소의 browser hit box에만 의존해서는 안 된다. line의 투명 point layer처럼 hit-test 전용 geometry도 provenance와 bounds가 있어야 한다. mouse/touch/pen, pointer cancellation, Escape/reset, keyboard focus, focus-visible tooltip까지 계약에 포함한다.

단일 차트 324개의 selection 선언만 성공해도 완료가 아니다. 117개의 cross-view reference는 서로 다른 data owner, aggregate output, facet instance에서 같은 selection을 어떤 key로 적용할지 검증해야 한다. 반복된 panel은 `selectionId + viewInstanceId`로 구분하고 resolve 규칙에 따라 합친다. 축의 scale binding은 실제 domain state와 연결되어야 하며 display transform만 확대해서 tick/domain은 그대로 남는 구현은 탈락이다.

## C.10 C-ANIM: 코퍼스에 없는 요구를 숨기지 않는 애니메이션 계획

이번 canonical 선언 census에서 명시적인 animation/transition/timer 선언을 발견하지 않았다. 이 사실은 animation이 필요 없다는 근거가 아니다. 사용자의 별도 목표가 animation을 포함하고 Flint backend 통합에도 시간 상태가 필요하므로 **코퍼스 fidelity와 별도의 animation conformance suite**를 만들어야 한다.

이 0건은 raw data values를 제외한 JSON 선언 키와 timer event stream을 검사한 결과다. JSON 바깥의 앱 코드가 차트를 갱신하며 만드는 animation까지 없다는 뜻은 아니다. 검사 방식과 결과를 `corpus-animation-declarations.json`에 저장했다.

timeline은 `transitionId`, source/target semantic snapshot, duration, delay, easing, stagger, keyed correspondence, interruption policy, clock source를 가진다. `createTransition`, `editTransition`, `play`, `pause`, `seek`, `cancel`의 역할을 분리하고 interactive parameter의 연속 업데이트와 authored timeline을 구분한다. 원본에는 없는 애니메이션을 번역 과정에서 임의로 추가하지 않는다.

mark matching은 source owner + row key + layer ID를 기반으로 하며 index matching만 사용하지 않는다. enter/update/exit, sorted/filtered data, duplicate keys, aggregated marks, facets 추가/삭제를 검증한다. color space, numeric props, angle wrap, band scale movement, scale type 변경, line/area path topology 변경, geo projection 변화는 interpolation 규칙이 다르다. 지원하지 않는 topology morph는 명시적 crossfade policy 또는 error를 선택하고 silent jump로 성공을 선언하지 않는다.

deterministic virtual clock으로 t=0, 0.25, 0.5, 0.75, 1의 semantic/graphic snapshots와 screenshot을 고정한다. animation 중 selection hit geometry와 tooltip anchor는 현재 frame에 맞아야 한다. interruption은 cancel/rebase/queue 중 정책을 명시하고 background tab, reduced-motion, seek backward, pause/resume, export frame에서 결과가 같아야 한다. 성능 검사는 frame budget뿐 아니라 반복 play/cancel 뒤 listener/timer/data cache 누수가 없는지도 확인한다.

## C.11 C-LAYOUT / C-TEXT: 정확한 디자인을 완료 조건으로 만들기

원본의 많은 옵션을 지원하는 것과 실제 픽셀 배치를 맞추는 것은 별개의 문제다. axis/legend/title/header의 기본값, font metrics, mark bounds, shared scale resolution, band step, repeat expansion, padding/spacing/align/bounds, clipping, stroke extent를 모두 명시적인 layout inputs로 만들어야 한다. 수동으로 한 차트의 offset만 보정하면 다른 폰트·문자열·패널 수에서 다시 실패한다.

현재 공개 번역의 `vl_1180`은 shape별 `selectMarks → highlightMarks`로 크기·위치를 미세 조정하고, metadata에 source-bound subpixel contour approximation을 공개한다. 이것은 숨겨진 임의 편집보다 나은 provenance지만, 장기적으로는 native symbol area/bounds/anchor convention이 원본과 일치하도록 해결해야 한다. existing shape correction을 제거할 때는 원본 reference와 비교하고 G1..Gn 전체를 함께 갱신해야 한다. [1180 native 프로그램](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_1180/G1.gg.mjs), [1180 metadata](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_1180/metadata.json)

원본 `vl_0522`, `vl_0628`, `vl_0944`는 공개 1,387가족에 모두 없다. 현재 열려 있는 #258의 원본 layout/facet fidelity 문제를 “이미 accepted dataset에 있으므로 해결됨”으로 처리할 수 없다. 알려진 다른 3-row header의 0.890625px residual도 원본 ID·row 수·실제 text metrics·renderer environment와 함께 재현해야 한다. 이번 census의 `static-supported-candidate`는 이런 layout 동등성을 입증한 상태가 아니다. [issue #258](https://github.com/ggaction/ggaction/issues/258)

layout oracle은 각각의 panel plot rectangle, outer rectangle, shared guide ownership, header baseline, title/legend block bounds, child order, clipping rectangle를 수치로 비교한다. typography oracle은 문자열 자체, font family/file hash, weight/style, font size, baseline, line height, letter spacing, alignment, rotation, multiline split, truncated ellipsis, minus sign/locale formatting을 비교한다. `applyTextMetrics`는 source-qualified measurements를 재현할 수 있어야 하지만 모든 chart를 고정 문자 폭 lookup으로만 맞추는 구조는 dynamic label 변화와 responsive text를 지원하지 못한다. 실시간 측정 cache와 deterministic export metrics의 경계를 설계해야 한다.

## C.12 완료 판정, regression, 구현 순서

각 원본의 상태는 최소 아래 축으로 저장한다. 하나의 `completed:true`로 합치지 않는다.

```text
sourceIdentity: exact | normalized-equivalent | repaired | different | missing
dialect: schema-valid | schema-invalid-reviewed | unresolved
data: resolved-and-hashed | external-injection-required | unavailable | unknown
lowering: complete | unsupported-features | unresolved-semantics
runtime: passed(version, artifactHash, environment) | failed | not-run
staticFidelity: numeric + geometry + typography + raster evidence
behaviorFidelity: event trace + state + dynamic data/domain evidence
responsiveFidelity: container matrix + font-load + DPR evidence
animationConformance: required cases + deterministic frames
```

전체 원본 1,981개 원장에는 정적 선언상 검토가 필요한 gap candidate 1,065개와 static-supported candidate 916개가 있다. 이 분류는 보수적 feature screening이고 **verified 916개라는 뜻이 아니다**. 모든 원본의 original fidelity는 이번 감사에서 최종 인증하지 않았다. 현재 재실행 상태가 있는 것은 위 6가족뿐이다. 데이터 불확실성, schema repair, issue #258 같은 외부 fidelity blocker는 각각 독립 필드로 남겼다.

완료를 위한 실행 순서는 다음과 같다.

1. **분모와 provenance 고정**: 1,981 primary originals와 모든 benchmark candidate를 registry에 등록한다. 340개 source 차이는 exact diff로 해결하거나 명시적인 repaired branch로 분리한다. 594개 미포함 ID는 retained backlog다. schema-invalid 564개를 제외하지 않고 intended dialect 판정과 source-reference policy를 만든다.
2. **데이터·환경 reference 고정**: 모든 table/asset을 owner별로 resolve하고 hash를 부여한다. reference renderer의 버전, browser, viewport, DPR1/2/4, timezone, locale, font bytes, random seed policy를 기록한다. 데이터 unavailable 상태와 라이브러리 unsupported 상태를 분리한다.
3. **소스→IR와 lowering coverage checker**: 모든 선언의 소비 여부와 source pointer mapping을 완성한다. unsupported 선언이 있으면 정확히 진단하고 정적 그림 성공으로 통과하지 않는다.
4. **기존 정적 기능의 수치·디자인 qualification**: 현재 1,387가족 10,174프로그램을 0.0.26 exact artifact에서 다시 실행하고 원본 reference와 비교한다. 통계/scale/time/geometry/layout 문제를 재사용 가능한 native semantics로 해결한다. #258과 미포함 static candidate를 포함한다.
5. **반응형 parameter/selection/event kernel**: dynamic filter, conditional channels, tooltip, controls, cross-view selection, pan/zoom을 구현하고 0009/0011 같은 동작이 삭제된 source를 원본으로 복구하여 event traces로 검증한다.
6. **geo/image/trail/남은 transform**: geo 129개+좌표 27개, image 3개, trail 1개, quantile/일반 pivot 및 표현식 잔여 기능을 source-neutral action으로 연결한다. 이미 있는 LOESS/density를 새로 중복 구현하지 말고 필요한 semantics를 확장한다.
7. **timeline과 전체 backend conformance**: animation suite와 Flint 요구를 합쳐 event→state→render→export 계약을 검증한다. canonical 원본에서 animation 사례가 없다는 이유로 이 단계의 exit criterion을 생략하지 않는다.
8. **전수 승격과 공개 문서**: 각 ID별 원본 identity·runtime·정적/동적 fidelity·제약을 공개한다. 새 런타임 release마다 입력·program·runtime hash를 묶은 certificate를 재생성한다. 과거 certificate의 version만 고쳐 재사용하지 않는다.

테스트 전략은 fixture 한 장의 screenshot 통과에 의존하지 않는다. 수치 oracle은 transform/scale의 중간 결과를 독립 계산하고, semantic oracle은 data owner와 view scope를 검사하고, geometry oracle은 경로/좌표/bounds를 비교하고, screenshot은 마지막 합성 결과를 확인한다. 외부 renderer를 테스트 oracle로 사용하는 것은 허용되지만 ggaction runtime 구현을 그 renderer의 scenegraph 복사에 의존시키지 않는다.

동적 테스트는 action chain을 만든 뒤 실제 browser event를 주입하여 관찰 가능한 결과를 비교한다. state를 테스트가 직접 최종값으로 대입하면 event binding 결함을 놓친다. 반대로 kernel unit test에서는 입력 event의 canonical representation과 reducer state transition을 빠르게 검증한다. 두 층을 함께 둔다. selection이 참조하는 row와 표시 tooltip row가 다른 오류, zoom 후 hit target이 옛 좌표에 남는 오류, animation 중 exit mark가 계속 선택되는 오류를 명시적 regression case로 만든다.

통과 기준은 “전부 render됨”이 아니라 (a) every original accounted, (b) every semantic declaration lowered or explicitly unresolved, (c) all data owners preserved, (d) original event states equivalent, (e) numeric/layout/text tolerances justified, (f) current exact artifact certificate, (g) no unexplained approximation이다. 원본 자체의 오류·외부 데이터 소실 때문에 달성 불가능한 항목이 있으면 원본을 삭제하는 대신 재현 가능한 blocker와 복구 정책을 남긴다.

## C.13 산출물과 직접 활용 방법

이 절의 모든 숫자는 아래 파일에서 다시 계산할 수 있다. 구현자는 Markdown의 대표 예제만 처리하지 말고 CSV/JSON 원장을 CI 입력으로 사용해야 한다.

| 파일 | 용도 |
| --- | --- |
| `evidence/corpus-original-crosswalk.csv` | 원본 1,981개 전체, source hash, schema 상태, 번역 presence, source identity, gap 후보, 현재 probe, #258 연결 |
| `evidence/corpus-originals.json` | 각 원본의 feature, JSON pointer, composition nodes, expression, resource, translation metadata, qualification 상태 |
| `evidence/corpus-all-files-qualified.csv` | JSON 25,024개 모두의 분류와 schema qualification |
| `evidence/corpus-schema-validation.json` | candidate 24,957개의 개별 schema 결과 및 진단 |
| `evidence/corpus-embedded-specs.json` | root 후보 밖에 있는 30개 embedded chart의 파일·JSON pointer·원문·schema 결과 |
| `evidence/corpus-schema-sources.json` | 공식 스키마 다운로드 URL, 파일, SHA-256, 404 근거 |
| `evidence/corpus-features.json` | 모든 그룹의 모든 관측 feature와 해당 파일 목록 |
| `evidence/corpus-duplicate-specs.json` | JSON 정규화로 같은 spec의 모든 출현 경로 |
| `evidence/corpus-source-deltas.json` | 원본과 다른 340개 source의 pointer/before/after/digest |
| `evidence/corpus-array-diff-revision.json` | 배열 차이 보완 전후 검산, 모든 pointer의 실제 값 대조, 원본 1,981개·번역 source 1,387개 해시 재확인 |
| `evidence/corpus-original-metadata.json` | metadata.xlsx sheet3의 1,981개 upstream provenance/annotation |
| `evidence/corpus-data-dependencies.json` | 모든 primary 원본의 외부/named data dependency 출현 |
| `evidence/translations-artifact-inventory.json` | 1,387가족의 stage와 파일 식별, notes, 과거 replay 상태 |
| `evidence/translations-integrity-failures.json` | 이번 artifact 무결성 검사 실패 목록: 빈 배열 |
| `evidence/translations-programs.json` | 10,174개 프로그램의 import와 member-call site AST inventory |
| `evidence/translations-runtime-probes.json` | 0.0.26에서 실제 실행한 46개 stage의 SVG hash와 결과 |

metadata.xlsx는 1,981개 원본 모두에 upstream URL, repository, license key/url 등을 연결하며 기록된 license key가 19종이다. 이 정보는 provenance이며 독립적으로 검증된 재배포 허가가 아니다. 예전 local corpus에 metadata가 없었다는 사유를 그대로 유지하는 대신 canonical upstream metadata를 연결하되 URL과 license의 실제 관계·버전을 확인해야 한다. 보고서의 기술적 지원률과 라이선스 상태는 서로 다른 필드로 보관한다.

향후 보고서는 최소 세 수치를 나란히 공개해야 한다. **원본 등록률**, **현재 런타임 실행률**, **원본 의미·디자인·동작 충실도 인증률**이다. 지금 확인한 1,387개 번호 연결과 46개 현재 실행을 마지막 수치로 재표현하지 않는다. 이 원칙이 있어야 사용자가 원하는 “모든 차트를 간단한 native 액션으로 제대로 번역”을 실제로 측정하고 완료할 수 있다.
