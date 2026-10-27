import json,pathlib,re
B=pathlib.Path(__file__).resolve().parents[1]
c=json.loads((B/'evidence/flint-catalog.json').read_text());api=json.loads((B/'evidence/flint-api-types.json').read_text());access=json.loads((B/'evidence/flint-property-accesses.json').read_text())
# Current action names are composition candidates verified against ggaction ACTION_INDEX, not conformance proofs.
rows='''Area Chart|compose|createAreaPlot;createStackData;encodeGroup|baseline/stack/curve 결측 및 semantic path provenance
Bar Chart|compose|createBarPlot;createSummaryData;encodeColor|aggregation/zero/transpose/dodge/label/rounded corner fidelity
Bar Table|partial|createAdjacentPlot;createBarPlot;createTextPlot|공유 행높이/열정렬/셀포맷/헤더/스크롤 및 table layout
Boxplot|compose|createBoxPlot;createPointMark|quartile/whisker 규약, outliers/points/dodge 및 원본 row lineage
Bubble Chart|compose|createScatterPlot;encodeSize|radius와area 입력단위 명시 및 size legend
Bullet Chart|partial|createBarMark;createRuleMark;createReferenceBand;createOverlay|actual/target/bands의 공동 scale과 의미별 hit role
Bump Chart|compose|createWindowData;createLinePlot;orderCategories|시점별 rank/tie/dense-rank와 반전 y/rank label
Calendar Heatmap|partial|createTimeUnitData;createHeatmap;facetGrid|timezone/weekStart/ISO week/leap day/월경계 및 calendar 좌표
Candlestick Chart|partial|createBarMark;createRuleMark;createOverlay;createWindowData|OHLC 검증, open/close body, high/low wick, up/down color, MA overlay
Choropleth|missing|createLookupData;encodeColor|GeoJSON/TopoJSON, geo coordinate/projection, polygon mark, missing-join/LOD/geo hits
Combo Chart|partial|createOverlay;createLinePlot;createBarPlot;editCompositionScales|공통 x+독립 y, line/bar z-order, 통합legend/tooltip
Connected Scatter Plot|compose|createLinePlot;createPointMark;encodePathOrder|시간/순서채널이 x정렬과 독립; path segment provenance
Density Contour|missing|createBin2DData;createPointMark|2D bin-density contour polygon 추출/threshold topology; KDE로 대체금지
Density Plot|compose|createDensityData;createDensityPlot|kernel/bandwidth/norm/extent grid수치일치 및 tail policy
Donut Chart|compose|createPiePlot;editArcMark|inner radius 단위/정렬/pad angle/outside labels/legend
Doughnut Chart|compose|createPiePlot;editArcMark|Donut alias를 adapter에서정규화, percentage innerRadius 일치
ECDF Plot|compose|createECDFData;createECDFPlot|ties/step side/normalization/points/empty handling
Funnel Chart|missing|createSummaryData;createTextMark|가변너비 trapezoid/ordering/gap/orientation/percentage label geometry
Gantt Chart|compose|createBarMark;encodeX;encodeX2;encodeY;createMarkLabels|start/end temporal interval, task height, invalid/reversed interval, overlap
Gauge Chart|partial|createArcMark;createRuleMark;createTextMark|min/max clamp, progress ring, needle/value/end labels, tile composition
Grouped Bar Chart|compose|createBarPlot;encodeXOffset;encodeYOffset;encodeGroup|nested grouping/dodge mode, missinggroups/inner-outer padding
Heatmap|compose|createHeatmap;encodeColor;createMarkLabels|continuous/quantized/diverging colors, missing cell, cell labels+contrast
Histogram|compose|createBinData;createHistogram|bin boundary inclusive rule, binCount vs actual bins, emptybins/provenance
KPI Card|partial|createTextPlot;createAdjacentPlot;createAnnotation|metric/value/goal/delta+format, fixedtile/auto columns/rich text role
Line Chart|compose|createLinePlot;encodeGroup;encodePathOrder|interpolate variants/gaps/points/shared indexhit/series end labels
Lollipop Chart|compose|createLollipopPlot|orientation/negativevalue/pointsize and line role
Map|missing|createPointMark;encodeSize;encodeColor|projection+basemap+lonlat coordinate/globe clip/camera/geo inverse
Marginal Plot|partial|createScatterPlot;createHistogram;createDensityPlot;createAdjacentPlot|marginal axis sharing/tight bounds/top-right alignment/legend ownership
Network Graph|missing|createPointMark;createLineMark|graph node/edge layout circular/seeded force, graph identity/selflinks/multiedges
Parallel Coordinates|compose|createParallelCoordinates;createParallelAxes;editParallelScale|numeric-column selection, independently scaledaxes, detail/color/provenance
Pie Chart|compose|createPiePlot|slice ordering/percent formatting/negative-zero policy/labels
Pyramid Chart|compose|createBarPlot;createComputedData;createOverlay|signed mirrored scales/absolute ticks/two cohort alignment
Radar Chart|compose|createRadarPlot;createRadialGrid;createThetaAxis|shared vs each dimension normalization/closed path/angular order
Range Area Chart|compose|createAreaMark;encodeY;encodeY2;encodeGroup|range endpoints crossing/missing values/curve pairing and band selection
Ranged Dot Plot|compose|createDumbbellPlot;createIntervalPlot|center optional/range ends/role-specific hits/caps/orientation
Regression|compose|createRegressionData;createRegressionPlot;createRegressionBand|linear/log/exp/power/poly degree/loess differences and independentstats
Ridgeline Plot|partial|createDensityData;createAreaPlot;createAdjacentPlot|overlap/offset baseline/sharedamplitude/category labels and clipping
Rose Chart|compose|createRosePlot;createRadialAxis|equal angle radius encodesarea orlength asdeclared; sort/group/alignment
Sankey Diagram|missing|createSummaryData|weighted directedgraph layout/link ribbons/nodewidth/gap/orientation/conservation
Scatter Plot|compose|createScatterPlot;encodeChannels|shape/area/opacity/log zero/category/axis label invariants
Slope Chart|compose|createLinePlot;encodePathOrder;createMarkLabels|exactlytwo endpoints orfilteredsubset, endpointlabels collision
Sparkline|partial|createLinePlot;createTextPlot;createAdjacentPlot|row label+inline mini chart+value columns aligned; independent/shared y
Stacked Bar Chart|compose|createStackData;createBarPlot|stack order/normalize/diverging+negative stacks/provenance
Streamgraph|compose|createStackData;createAreaPlot|wiggle/silhouette/diverging baseline algorithm and irregular x-spacing
Strip Plot|compose|createStripPlot;jitterPoints;packPoints|seeded jitter/spread/dodge/orient vs strip/lattice ambiguity
Sunburst Chart|missing|createArcMark;createSummaryData|hierarchy partition/rings/parent-childangles/label rotation/drill state
Table|partial|createTextPlot;createRectMark;createAdjacentPlot|cell semantic table, percolumnformat/alignment/header/rowlimit/accessibility
Tree|missing|createPointMark;createLineMark;createTextMark|hierarchy extraction/rootLabel/tidy tree LR/TB/links; native expand disabled
Treemap|missing|createRectMark;createSummaryData;createMarkLabels|hierarchy squarify areas/padding/nodeids/labels/breadcrumb/drill state
Violin Plot|compose|createViolinPlot;createDensityData|bandwidth/tailCut/box/median/half/full/dodge/countwidth/invalidgroups
Waterfall Chart|compose|createWindowData;createComputedData;createBarMark;createRuleMark|delta/subtotal/total mode and connector; avoid blindlysumtotalrows'''
M={};
for row in rows.splitlines():
 name,status,actions,gap=row.split('|');M[name]={'status':status,'candidateActions':actions.split(';'),'gap':gap}
req=[]
for ch in c['charts']:
 m=M[ch['chart']];req.append({**ch,'category':'chart-family','ggactionAssessment':m,'assessmentLevel':'source-contract-based candidate; no translated render proven','priority':'P1' if m['status']=='missing' else 'P0','dependencies':['FCORE-DATA-LINEAGE','FCORE-SEMANTIC-HIT','FCORE-LAYOUT','FCORE-GUIDES'],'acceptance':['source rows/aggregation/scale domains verified independently','each declared chart property and each backend-specific variant has fixture','geometry and guide snapshot compared against pinned reference','semantic hit + input records + accessibility table agree','edit→serialize→load→rerender and cross-renderer export preserve meaning']})
for backend,templates in c['templates'].items():
 for template in templates:
  chart=template['chart'];slug=re.sub('[^a-z0-9]+','-',chart.lower()).strip('-');ev=next((x['evidence'] for x in c['charts'] if x['chart']==chart),[])
  for p in template.get('properties',[]):
   req.append({'id':f'FPROP-{backend}-{slug}-{p["key"]}','category':'chart-property','chart':chart,'backend':backend,'property':p,'evidence':ev,'status':'required-unverified','priority':'P1','acceptance':['default, every discrete choice, continuous minimum/midpoint/maximum and invalid input checked','function-valued applicability evaluated with eligible/ineligible fixtures','edit changes correct domain action and rematerializes dependent guides','reference option output and target geometry agree; no silent drop']})
  for a in template.get('encodingActions',[]):
   req.append({'id':f'FENC-{backend}-{slug}-{a["key"]}','category':'encoding-action','chart':chart,'backend':backend,'action':a,'evidence':ev,'status':'required-unverified','priority':'P1','acceptance':['get→set→get roundtrip','dependent channels transformed explicitly','preserve authored spec and undo/redo trace']})
for i,p in enumerate(c['interactionPresets'],1):
 req.append({'id':f'FINT-{i:03d}','category':'interaction-preset',**p,'status':'requires-host-and-renderer-runtime','priority':'P0','evidence':{'file':'packages/flint-js/src/interactive/spec/registry.ts','url':f'https://github.com/microsoft/flint-chart/blob/{c["snapshot"]["commit"]}/packages/flint-js/src/interactive/spec/registry.ts#L70-L280'},'acceptance':['admitted on runtime-confirmed capabilities only','pointer+keyboard+touch and reset/cancel leave correct state','host and reader events report preview/commit/cancel with stable semantic targets','coexists with other presets or returns explicit conflict warning','resize/scroll/zoom/export/dispose preserve correct coordinate and lifecycle']})
for name,t in c['themes'].items():
 req.append({'id':'FTHEME-'+name,'category':'theme-preset','theme':t,'status':'adapter-mapping-required','priority':'P1','acceptance':['all resolved DesignDecisions implemented or explicit departure','content and aggregation remain unchanged','every chart geometry+small/large/faceted case visually reviewed','font fallback and text measurement deterministic','canvas/svg/pdf use same resolved geometry/colors/text']})
relevant=['ChartAssemblyInput','ChartEncoding','SemanticAnnotation','FormatSpec','DomainConstraint','TickConstraint','ThemeSpec','ThemeInk','ThemeType','ThemeStructure','ThemeMarks','ThemeLabels','ThemeLegend','ThemeDataLabels','ThemeAnnotation','ThemeFurniture','ThemeSource','ThemeFacets','ThemeLayout','ThemeGuard','ThemeVariant','ThemeGeometry','ThemeChartDefaults','ThemeCompileDefaults','ThemeInteraction','AssembleOptions','ChartUpdateOp','ChartState','InteractiveRenderer','FlintChartProps','LinkSpec']
for d in api['declarations']:
 if d['name'] not in relevant:continue
 for field in d.get('members',[]) or [{'name':'$type','type':d.get('type')}]:
  req.append({'id':f'FAPI-{d["name"]}-{field.get("name","$index")}','category':'public-contract-field','type':d['name'],'field':field,'evidence':{k:d[k] for k in ['file','startLine','endLine','url']},'status':'required-unverified','priority':'P0','acceptance':['valid and invalid values fixture','explicit mapping to data/semantic/graphic/runtime owner','serialization/roundtrip where serializable','unsupported values return actionable diagnostic without silent coercion']})
for key in ['DATA-LINEAGE','SEMANTIC-HIT','LAYOUT','GUIDES','RUNTIME-STATE','ANIMATION','GEO','RESOURCE-RESOLUTION','PACKAGE-BOUNDARIES','ACCESSIBILITY','EXPORT']:
 req.append({'id':'FCORE-'+key,'category':'cross-cutting','priority':'P0','status':'implementation-spec-in-report','dependencies':[],'acceptance':['see detailed acceptance contract in parts/flint-audit.ko.md']})
native=json.loads((B/'evidence/flint-native-behaviors.json').read_text())['entries']
seen={}
for n in native:
 stem=re.sub('[^a-zA-Z0-9]+','-',n['file'].removeprefix('packages/flint-js/src/').removesuffix('.ts'))+'-'+n['key'];seen[stem]=seen.get(stem,0)+1
 req.append({'id':f'FNATIVE-{stem}-{seen[stem]}','category':'native-backend-behavior','declaration':n,'priority':'P1','status':'reference-browser-proof-and-adapter-mapping-required','acceptance':['evaluate active/deactivated native option at pinned reference backend','ported hover/tooltip/adjacency/drill behavior preserves source meaning and accessible alternative','do not enable native roam/collapse explicitly disabled by source template','update and export parity tracked separately from preset support']})
(B/'evidence/flint-requirements.json').write_text(json.dumps({'commit':c['snapshot']['commit'],'meaning':'Requirements inventory, not conformance pass results. Current ggaction mappings are source-based implementation candidates. Metadata is exhaustive for public extracted declarations/registered properties; function branches and combinations require coverage generation.','counts':{'requirements':len(req),'chartFamilies':len(c['charts'])},'requirements':req},ensure_ascii=False,indent=2)+'\n')
(B/'evidence/flint-chart-mapping.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print(len(req))
