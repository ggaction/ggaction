# 조합 recipe 검증 기록

## 변경과 근거

`../../AUTHORIZATION.json`의 remainingApproval을 재사용했다. 새 library API·저장 형식·runtime source·package entry는 0개다. Marginal/Bullet은 examples의 host 함수이며 공통 공개 액션만 호출한다. Combo는 기존 linked-overlay 정본과 primitive를 그대로 재사용한다. public body의 AST는 허용된 공개 import와 action만 사용하고 raw graphic primitive 및 전용 constructor가 없음을 검사한다.

- Marginal: 한 immutable source의 typed row keys를 3개 독립 panel에서 유지한다. count Y와 observed-value Y를 같은 frame에 겹치지 않는다. explicit domain/plot alignment, exact bin membership, duplicate coordinates, row reorder 및 source revision 후 linked selection을 검증했다. 일부 child만 revise한 경우 helper는 실패한다.
- Bullet: reference Rect → actual Bar → target Rule → attached Text 순서. 하나의 amount X scale이며 reference threshold는 명시 값이다. zero actual은 semantic 0을 보존하고 no-area item을 만들지 않는다.
- Combo: 기존 bar endpoint를 따라가는 Line, 같은 Y scale 객체/guide를 유지한다. 5개 실제 source 각각에서도 원값 단위 그대로 24행 cohort의 bars/linked line을 검증한다. 24개 label이 들어가도록 plot width 960을 명시했으며 행/label을 삭제하지 않았다.

## 실행

정확한 명령·결과는 `qualification.json`, 로그는 같은 디렉터리의 gzip 원문이다. 원래 실패 로그도 보존했다.

- Canonical unit 7, chart 4, AST+vertical slices 2, complete graphic hierarchy 1.
- Canonical render의 PNG primitive/public 2 및 Canvas/SVG/PNG/PDF/offline/scene 3. Primitive/public PDF는 각각 72dpi로 rasterize한 결과가 정확히 같으며, backend 간 text antialiasing까지 같다는 주장은 하지 않는다.
- 실제 Chromium 3개 × DPR 1/2 × Canvas/SVG의 primitive/public pixel mismatch 0. 화면 이미지는 canonical generated docs `marginal.png`/`bullet.png` 및 기존 linked-overlay 이미지다. Marginal 위치/분포 정렬, Bullet label·target 가독성을 직접 확인했다.
- 실제 데이터: penguins, stock prices, movie profit, US births, trash wheel의 5개 source hash를 확인했다. 각 24개 finite 원행과 원필드를 보존한다. Birth의 day-of-month 문자열만 명시 numeric projection하며 mean/max reference의 sourceHash/sourceIndices를 기록한다. 실제 source의 의미를 임의 금융 role로 바꾸지 않는다.
- 고정 archive SHA256 `3364bce3f7fad099c1e7adb25e8a4f0d88dfc8841ed285b0d0c129c8da0e1451`, root integration candidate `69089faccecc0e2de8429a78c4f85c663b8ab621`: Node20/22/24 각각 3개 recipe, 별도 Node22 exact displayed snippet 3개 통과. 지원 example만 복사하고 구현 src는 복사하지 않았다. 모든 library import는 설치된 public entry다. temp consumer는 finally에서 정리했다.

이는 현재 integration archive의 focused 증거다. 최종 STEP074/077 합산 archive, native 30요구/79시험군 전체, release qualification을 완료한 것으로 집계하지 않는다.

## 기존 통합 입력 수리

`test/support/docs-runtime.js`는 root `f14063eab`의 Canvas attribute mock 2줄을 정확히 재사용했다. 기존 installed interaction fixture는 case 내용/개수를 바꾸지 않고 manifest 순서만 실제 AST에 맞췄다. 새 recipe3 manifest는 별도 entry다.

Search index의 기존 HEAD조차 1,064,902bytes로 이전 1,037,700 한도를 초과했다. 세 recipe 추가 뒤 정확한 1,071,900bytes를 측정하고 root와 조율하여 최소 1,072,000으로 교정했다. 패키지/bundle limits는 변경하지 않았다. Docs renderer inputs는 그대로 유지했고 canonical generation만 실행했다.

## 최종 문서 검증

Canonical example source ref를 `7830a16a64097fb6e6be8498a63a80da61bb9afc`로 고정했다. `npm run docs:provenance` 이후 examples index/metadata/search/LLM을 재생성하고 `npm run test:docs` 224/224, `bundle exec jekyll build` 종료 0, built links 185 pages/1,595 LLM artifacts를 확인했다. `node scripts/test-built-docs.js _site`는 desktop search와 전체 문서의 320/390/768px 검사를 통과했다. 실행 Ruby는 3.2.11이며 CI의 3.2.6과 동일 버전이라고 주장하지 않는다.

`inputs.json`의 source 31개 hash는 최종 검증 뒤 모두 동일했다. 이미 통과한 runtime/installed/render/actual-data 검사는 반복하지 않았다. 최종 STEP074/077 합산 archive qualification은 여전히 별도 의무다.
