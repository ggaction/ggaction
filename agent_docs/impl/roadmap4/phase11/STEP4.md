# Step 4 — Row-path materialization과 lifecycle

## 진행 상태

- [ ] equally spaced dimension projection과 ordinary path graphics
- [ ] quantitative/ordinal mixed dimensions
- [ ] key lineage와 `break | drop-row | error`
- [ ] Canvas/data/filter/scale/dimension-order rematerialization
- [ ] Browser Canvas/Node PNG parity와 immutability

한 row가 한 semantic item이며 missing fragments는 같은 identity 아래 여러 attachments가 된다. Existing ordered-path와
scale mapping helpers를 재사용하되 Parallel 의미를 ordinary Cartesian line grammar에 끼워 맞추지 않는다.
