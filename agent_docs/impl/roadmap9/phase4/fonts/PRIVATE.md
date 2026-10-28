# Font asset와 측정 identity 준비

## 진행 상태

- [x] STEP-019의 원본 font identity/async cleanup 요구 확인
- [x] pinned bytes·MIME signature·family/style/weight·metrics provider 검증
- [x] 같은 font hash/provider만 허용하는 immutable 측정 batch
- [x] 실제 고정 TTF decoder와 독립 literal advance 검증
- [x] image 기존 회귀, source/package/discovery 및 문서 검증
- [ ] public font resource·apply/load completion·stale revision·dependency closure
- [ ] bundled font의 Canvas/SVG/PNG/PDF 연결과 export preflight
- [ ] 한글/emoji/combining/긴 label 및 layout line origins 전체 AT-15
- [ ] STEP-019 종료와 후속 bundle/qualification

이것은 **private preparation checkpoint**다. [전체 실행 승인](../../AUTHORIZATION.json) 안에서
공개 action/schema와 독립적인 host preparation을 구현했다. 공개 font 지원 완료가 아니다.

`resources/assetPreparation.js`가 image/font의 descriptor 검증, SHA256·byte budget,
load stage, abort 경쟁·listener cleanup, 별도 byte copy와 immutable base64를 공유한다.
기존 image resolver의 반복된 host 경계를 이 공통 owner로 옮겼으며 image 의미/visual target은 유지한다.
`resources/resolveFonts.js`가 font identity와 같은 font의 측정 batch를 소유한다.
둘 다 network·DOM·native decoder를 선택하지 않는다. Renderer나 ChartProgram에 host callback을 저장하지 않는다.

Font 요청은 URI, lowercase expected SHA256, MIME, family, normal/italic style,
100–900/100단위 weight와 nonempty metricsProviderVersion을 명시한다.
최대16MiB이며 TTF/OTF/WOFF/WOFF2의 signature와 요청 MIME을 비교한 뒤 hash를 확인한다.
Signature만으로 font가 유효하다고 판정하지 않는다. 명시 host decoder가 전체 font를 검증하고
동일 hash/family/style/weight/provider를 돌려줘야 준비가 성공한다.
다른 font 또는 fallback identity를 보고하면 font-identity-mismatch다.
TTF/OTF/WOFF header 기준은 [WOFF 명세](https://www.w3.org/submissions/WOFF/),
WOFF2 기준은 [W3C WOFF2](https://w3c.github.io/woff/woff2/)다.

측정은 이 preparation이 만든 정확한 asset handle과 text/fontSize query를 사용한다.
한 batch는1–10000queries, 총1048576UTF-16 units 이하이며 text는 빈 문자열도 허용한다.
Host가 받은 snapshot은 immutable이고 응답은 같은 font hash/provider와 query별 finite
nonnegative width를 가져야 한다. 준비 asset을 복사하거나 임의 object로 위조한 입력은 거부한다.
이 private handle brand는 public 저장 schema가 아니다. Offline restoration과 재등록은 후속 연결 범위다.
임의 system fallback 측정값을 같은 profile로 채택하지 않는다.

Load·decode·measure 각 stage는 AbortSignal과 경쟁한다. 이미 abort된 요청은 callback0이고
진행 중 abort 뒤 늦은 결과를 버리며 성공/실패/abort 모두 listener를 정리한다.
원본 byte와 decoder copy는 분리하고, mutable width array와 query 수정도 결과를 바꾸지 못한다.
Host가 이미 수행한 외부 font 등록을 취소한다고 주장하지 않는다. 등록 handle disposal 정책은
공개 renderer/session 연결에서 별도로 구현해야 한다.

## 검증

Original MIT geometric TTF fixture는 `test/fixtures/fonts/`에 generator와 함께 보존한다.
SHA256은 `cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878`다.
1000units/em, A600/B800/space250/combining-accent0이라는 literal metrics를
실제 native decoder에 등록하여20px의 AB=28, empty=0, A+combining=12를 확인했다.
검사 후 native font handle을 제거한다. 이 작은 geometric font는 한글/emoji typography
시험이나 일반적인 글꼴 지원을 대신하지 않는다.

Font11+image19=30focused tests가 통과했다. Common preparation의 line/branch/function
100/98.67/100%, image100/100/100%, font100/100/100%이며 새 공통/font critical floor는95/90/100%다.
Source/package/discovery38/38, docs159/159와 generated metadata 검사도 통과했다.
Package690entries, packed1031109/unpacked4795329bytes이며 unpacked cap을4796000으로
최소1000byte 올림했다. Packed1034000은 유지한다.
Full/Basic gzip515399/296455bytes는 이전 private image checkpoint와 같다.
이 branch는 main DATA/statistics의 앞선 base이므로 통합 때 더 최신 한도를 덮어쓰지 않는다.

원시 로그·source hashes·fixture hash는 [evidence.json](evidence.json)에 보존한다.
이미지 검토 revision3853bdb1의 primitive 그림을 바꾸지 않았으며 approval은 여전히 pending이다.
공개 resource/preflight, 실제 render font binding, stale layout 차단과 모든 재물질화 소비자를
연결하기 전에는 AT-04/AT-15 또는 STEP-019를 complete로 표시하지 않는다.
