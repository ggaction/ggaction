# 경로 판정의 일시 geometry 조립

## 진행 상태

- [x] Root가 같은 수학·과금·오류 diagnostics 소유권을 유지하는 내부 변경으로 채택
- [x] Source 미변경 prototype40numeric pair/10error case
- [ ] 제품 적용과 default/explicit pathGeometry exact 비교
- [ ] 공개 flatten 반환 소유권·오류 diagnostics 동결·owner coverage
- [ ] 동일 archive3Node/browser/원100k 기능과 canonical5+30/DPR1·2

Root는2026-11-02에 `requireFlattened`가boolean/number판정에만사용하는일시geometry의owned등록제거를remainingApproval내부개선으로채택했다. 앞선rawprojectioncheckpoint를고정한후구현한다. Globalregistry/수학/guard/index방문과금은변경하지않는다.

## 정확 변경

`src/grammar/pathGeometry.js`의private `requireFlattened`는 `calculateFlattenedPathCommands(commands,options)`를호출한다. 원 `pathFillContains`/`pathStrokeDistance`가같은points를읽고최종boolean/number를반환한다. Geometry를저장하거나caller/native권한으로내보내지않는다. Subdivisiondiagnostic이있는오류분기에서는기존 `ownFlattenedGeometry(geometry).diagnostics`로동결·소유권을완성해기존RangeError의diagnostics로반환한다. 공개 `flattenPathCommands`와width/arc출력의소유권은그대로다. 원pathTopology검증/작업량, maxCommands, maxPoints, tolerance/depth와geometry입력오류를그대로유지한다.

[read-only prototype](geo-raw-path-query-evidence/proof.mjs)은원module과계산-only후보의직선/곡선/degenerate/±0/extreme/query결과40쌍을exact비교했고10옵션오류case의name/message/diagnostics및frozen을비교했다. 임시등록계수는520→80이었다. 이값은소형사례계수이며원100k성능통과가아니다. 후속제품검사에서는default/명시pathGeometry및공개flatten반환불변성을추가한다. 재실행은proof를 `.artifacts/geo-hit-a3/raw-path-query/proof.mjs`로복사해repositoryroot에서node로실행한다.
