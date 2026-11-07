# 경로 판정의 일시 geometry 조립

## 진행 상태

- [x] Root가 같은 수학·과금·오류 diagnostics 소유권을 유지하는 내부 변경으로 채택
- [x] Source 미변경 prototype40numeric pair/10error case
- [x] 제품 적용과 default/explicit pathGeometry exact 비교
- [x] 공개 flatten 반환 소유권·오류 diagnostics 동결·owner coverage
- [x] 동일 archive3Node/browser 및 원100k native/current 전수 기능
- [ ] 원100k rebase/offline 전체 기능, canonical5+30/DPR1·2, 원100cycle

Root는2026-11-02에 `requireFlattened`가boolean/number판정에만사용하는일시geometry의owned등록제거를remainingApproval내부개선으로채택했다. 앞선rawprojectioncheckpoint를고정한후구현한다. Globalregistry/수학/guard/index방문과금은변경하지않는다.

## 정확 변경

`src/grammar/pathGeometry.js`의private `requireFlattened`는 `calculateFlattenedPathCommands(commands,options)`를호출한다. 원 `pathFillContains`/`pathStrokeDistance`가같은points를읽고최종boolean/number를반환한다. Geometry를저장하거나caller/native권한으로내보내지않는다. Subdivisiondiagnostic이있는오류분기에서는기존 `ownFlattenedGeometry(geometry).diagnostics`로동결·소유권을완성해기존RangeError의diagnostics로반환한다. 공개 `flattenPathCommands`와width/arc출력의소유권은그대로다. 원pathTopology검증/작업량, maxCommands, maxPoints, tolerance/depth와geometry입력오류를그대로유지한다.

[read-only prototype](geo-raw-path-query-evidence/proof.mjs)은원module과계산-only후보의직선/곡선/degenerate/±0/extreme/query결과40쌍을exact비교했고10옵션오류case의name/message/diagnostics및frozen을비교했다. 임시등록계수는520→80이었다. 이값은소형사례계수이며원100k성능통과가아니다. 후속제품검사에서는default/명시pathGeometry및공개flatten반환불변성을추가한다. 재실행은proof를 `.artifacts/geo-hit-a3/raw-path-query/proof.mjs`로복사해repositoryroot에서node로실행한다.


## 제품 checkpoint

`requireFlattened`의두줄을변경했다. Publicflatten/variablewidth/arc출력은기존owner를유지하며판정오류의diagnostics에도같은deepownedtree를준다. Source494path/hit/interaction tests와22집중검사가통과했다. PathGeometry97.20line/93.83branch/100function으로critical floor를충족한다. Default/explicit정책의전수shape비교는같은회귀에포함한다. Docs248, package/discovery24, built186pages/1607LLM이통과했다.

최종archive는 `9e622bc170ed67f36b9e34bb55289b5da356e2eddfa5074b3792edb5af444ae5`다. Node20/24strictpack동일bytes이며1262entries/1,822,378packed/8,191,124unpacked다. Samearchive3Node runtime·strictTS·실행문서·6bundles 및source-free minifiedChromium DPR1/2가통과했다. Full788907/interaction140073gzipB로bundlecap증가는없다. Unpacked만실측의100byte올림8191200으로갱신했다. 작은20vertex100cycle oldscene100/100회수는원큰100cycle과구분한다.

원100k의모든199999native좌표·339849parts/1939096footprintcommands exacthash·4query전수scalar·current199999좌표/3CSSquery는다시통과했다. Native준비3,020.67ms(기능진단값)였고원work/거리/owner는그대로다. 이후rebaseplan에서758/758WeakSet rehash가재현되어PID1748을중단했다. 원rebase/offline전체와long-lived100cycle은열려있다. 이query변경이plan단계의남은geometry snapshot복사병목을해결했다고주장하지않는다. [manifest](geo-raw-path-query-evidence/verification.json)와partial원로그/sample이범위를고정한다.

새canonical은이frozenarchive와명시정책모든size를사용해원1k/10k/100k·DPR1/2·5warmup+30measured를그대로측정한다. 최초default1k실패와새결과는별도report로보관한다. 입력·timers·SLO와오류guard는바꾸지않는다.

제품source는 `9a524620333a2008889433a63d8ee8c1556a589c`이며후속pin은metadata-only다.

## 원조건 성능 중간 진단

2026-11-02 12:03:15–12:07:44 UTC, PID 2522는 동일 frozen archive의 원 6 cells / 12 stages를 각각 5 warmup + 30 measured로 마쳤으며 SLO 미달로 exit 1이었다. 측정 중 explicit GC, 입력·query·타이머·SLO 변경은 없다. 1k는 앞서 채택한 명시 capacity/index/format5 정책이며 기존 default 1k 결과와 구분한다.

| DPR | 크기 | camera P95 ms | hit P95 ms |
| --- | --- | --- | --- |
| 1 | 1k | 22.2 | 0.7 |
| 1 | 10k | 249.2 | 4.2 |
| 1 | 100k | 3262.0 | 26.6 |
| 2 | 1k | 24.9 | 0.9 |
| 2 | 10k | 282.8 | 3.3 |
| 2 | 100k | 3233.7 | 25.9 |

1k/10k hit 4 cells는 20ms 안에 들었지만 100k hit 2 cells와 camera 6 cells는 원 목표를 넘었다. Root의 443개 검증이 약 41초 겹쳤고 설치 bundle·소형 batch 검증도 병행되었다. 따라서 이 결과는 **중간 진단이며 최종 성능 qualification이 아니다**. Source가 안정되면 CPU 경쟁 작업도 중지한 exclusive 구간에서 다시 검증한다. 원 [report](geo-raw-path-query-evidence/canonical-p95.json), 전체 iteration progress와 stdout gzip을 보존했다. 원 100k rebase/offline, 원 100cycle과 최종 SLO는 계속 미완료다.
