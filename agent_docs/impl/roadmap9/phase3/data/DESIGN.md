# 데이터 입력 준비 경계

현재 사용자 승인 범위는 [전체 실행 승인](../../AUTHORIZATION.json)이다. STEP-013의 CSV/JSON resolver를 기존 immutable dataset에 연결하기 위한 내부 계약이며, 공개 action 및 codec 연결은 별도 통합 작업으로 추적한다.

- `grammar/dataSource.js`가 descriptor 검사, 입력 형식 정규화, CSV/JSON 파싱, 명시 field parse 및 schema 검증을 소유한다. `resources/resolveData.js`만 명시 host callback을 비동기로 호출한다. renderer, grammar 및 restore는 fetch하지 않는다.
- source는 `inline` rows, `inline` text, `named` name, `url` URL 또는 version 2 AST다. text source에는 `format: csv | json`이 필수다. CSV delimiter 기본값은 comma이며 한 문자 delimiter를 명시할 수 있다. URL의 상대 경로는 host의 명시 `baseURL`이 필요하다.
- named와 URL loader는 각각 `{name, signal?}`, `{url, signal?}`를 받고 `{text | bytes, mimeType, encoding: utf-8}`를 반환한다. 두 payload를 동시에 허용하지 않는다. 지정 format과 맞지 않는 MIME/charset 및 잘못된 UTF-8은 오류다. 별도 전역 loader/cache/fetch 기본값이 없다.
- field parse map의 각 값은 `{type: string | number | boolean | date, nullable?, format?, timeZone?}`다. JSON 값을 추측하여 바꾸지 않는다. 숫자는 유한 decimal/exponent 문법, boolean은 exact `true`/`false`, string은 원문 보존이다. 비문자 빈 셀과 null은 `nullable: true`가 있어야 null이 되며 실패한 행을 버리지 않는다.
- date는 `timeZone` 필수이며 기본 format은 `%Y-%m-%d`다. 기존 parseTime explicit calendar format 세 종류와 `iso`를 지원한다. 숫자는 정수 epoch milliseconds다. ISO offset은 absolute instant이며 offset 없는 date/time은 선언한 IANA civil time이다. 기존 timeUnit owner의 earliest-fold 규칙을 재사용하고 존재하지 않는 civil time은 exact roundtrip 검사로 거부한다. 기존 permissive `parseTimeValue(auto)`는 바꾸지 않는다. 기존 expression ISO offset parser를 공유 parseTime owner로 옮겨 strict calendar 검증을 재사용한다.
- CSV는 quoted delimiter/newline/escaped quote, BOM, CRLF, 빈 셀을 보존한다. duplicate/empty/reserved header, row 폭 차이, quote 오류는 거부한다. JSON은 row record의 배열이며 own data properties만 허용한다. prototype key, getter, class, cycle, nonfinite 및 undefined는 거부한다. dotted literal key는 그대로 보존한다.
- `createDataSourceRequest(source, options)`는 비동기 호출 전에 immutable source, 전 branch parameter dependencies의 exact ordered revision vector, scalar 값, resolvedURL, inputHash 및 명시 requestToken을 고정한다. `prepareDataSource`는 `{request, values, schema, original, provenance}`를 반환한다. requestToken은 같은 입력이 제거/재생성된 ABA도 구분한다.
- 원본 text는 BOM을 포함한 실제 UTF-8 내용이며 contentHash는 해당 byte SHA-256이다. rows를 받은 경우 `original.kind: rows`, `hashKind: encoded-rows`로 구분하고 기존 codec으로 signed zero를 보존한다. 저자가 제공하지 않은 원본 bytes를 주장하지 않는다. parser version은 `csv@1`, `json@1`, `rows@1`이다.
- `validatePreparedDataSource(prepared, {requestToken,inputHash})`는 current identity와 원본/rows/schema/hash를 검사한다. 실패하면 기존 ChartProgram을 변경할 수 없고 restore도 외부 I/O가 없다. AbortSignal은 loader에 전달되며 load 전/후 취소를 검사한다.

공개 API 등록, immutable original dataset commit, source revision/parameter 재요청 및 stale commit 차단, persistence source-free lifecycle, 타입/문서/패키지 연결이 완료되기 전에는 STEP-013을 완료로 표시하지 않는다.
