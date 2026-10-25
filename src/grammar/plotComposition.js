// One constructor capability registry for layering, adjacent inference and
// inspection. Native constructors remain responsible for statistical work.
const xy = ['createScatterPlot','createLinePlot','createBarPlot','createAreaPlot','createStripPlot','createBeeswarmPlot','createRegressionPlot','createTextPlot'];
const summaryXY = ['createBoxPlot','createViolinPlot','createGradientPlot','createIntervalPlot'];
export const PLOT_COMPOSITION_ROLES = Object.freeze(Object.fromEntries([
  ...xy.map(a => [a, 'xy']), ...summaryXY.map(a => [a, 'summaryXY']),
  ...['createDotPlot','createLollipopPlot','createDumbbellPlot'].map(a => [a, 'endpoint']),
  ['createRaincloudPlot','categoryValue'], ['createHistogram','histogram'], ['createDensityPlot','density'],
  ['createECDFPlot','ecdf'], ['createRugPlot','rug'], ['createHeatmap','heatmap'], ['createHorizonPlot','horizon'],
  ...['createPolarScatterPlot','createPolarLinePlot'].map(a => [a, 'polar']),
  ...['createPiePlot','createRosePlot','createRadialBarPlot'].map(a => [a, 'radial']),
  ['createRadarPlot','radar'], ['createParallelCoordinates','parallel']
]));
export const COMPOSITION_PLOT_ACTIONS = Object.freeze(Object.keys(PLOT_COMPOSITION_ROLES));
export const fieldEncoding = value => typeof value === 'string' ? { field:value } : value;
const categorical = c => c && ['nominal','ordinal'].includes(c.fieldType);
const encoding = (c, aggregate = true) => c?.field ? { field:c.field, fieldType:c.fieldType,
  ...(aggregate && c.measurement.operations.length === 1 && ['mean','median','sum','min','max','count'].includes(c.measurement.operations[0]) ? { aggregate:c.measurement.operations[0] } : {}),
  ...(c.bin ? { bin:c.bin } : {}), ...(c.temporalUnit ? { temporalUnit:c.temporalUnit } : {}) } : undefined;
const plain = c => c?.field ? { field:c.field, fieldType:c.fieldType } : undefined;
const merge = (base, supplied) => {
  const value=typeof supplied==='string'?{field:supplied}:supplied;
  // An explicit new field owns its type/grain. Source defaults only fill an
  // omitted role or an options-only patch on that inferred field.
  if (value?.field !== undefined && value.field !== base?.field || value?.lower !== undefined || value?.upper !== undefined) return value;
  const merged={ ...base, ...value };
  if (value?.center !== undefined || value?.extent !== undefined) {
    // Native interval measurements are not ordinary field encodings.
    for (const key of ['fieldType','temporalUnit','aggregate','bin']) delete merged[key];
  }
  return merged;
};

export function inferCompositionOptions(source, action, supplied = {}) {
  const kind = PLOT_COMPOSITION_ROLES[action];
  if (!kind) throw new Error(`Unknown plot constructor "${action}".`);
  const c = source.channels;
  const x = c.x ?? c.theta, y = c.y ?? c.radius;
  const categoryAxis = categorical(x) ? 'x' : categorical(y) ? 'y' : undefined;
  const category = categoryAxis === 'x' ? x : categoryAxis === 'y' ? y : undefined;
  const measure = categoryAxis === 'x' ? y : categoryAxis === 'y' ? x : x;
  let defaults = { data: source.data };
  if (['xy','summaryXY','heatmap','horizon'].includes(kind)) {
    defaults.x = kind === 'xy' && ['createLinePlot','createBarPlot'].includes(action) ? encoding(x) : plain(x);
    defaults.y = kind === 'xy' && ['createLinePlot','createBarPlot'].includes(action) ? encoding(y) : plain(y);
    if (kind === 'summaryXY') {
      if (!categoryAxis && !(supplied.x !== undefined && supplied.y !== undefined)) throw new Error(`${action} requires one category axis and one quantitative measure.`);
      if (categoryAxis && action === 'createIntervalPlot') defaults[categoryAxis === 'x' ? 'y' : 'x'] = { field:measure.field, center:'mean', extent:'ci', level:0.95 };
    }
    // Binning follows the new chart's roles, including explicitly supplied
    // categorical/ordinal grids, rather than the source chart's old axes.
    if (kind === 'heatmap' && !['x', 'y'].some(axis => categorical(
      supplied[axis] === undefined ? defaults[axis] : merge(defaults[axis], supplied[axis])
    ))) defaults.bin = { bins:12 };
    if (kind === 'horizon' && c.y?.measurement.parameters) Object.assign(defaults, c.y.measurement.parameters);
    if (action === 'createTextPlot') defaults.text = { field:c.color?.field ?? y?.field ?? x?.field };
  } else if (['endpoint','categoryValue'].includes(kind)) {
    if (!categoryAxis && !(supplied.category !== undefined && (supplied.value !== undefined || supplied.end !== undefined))) throw new Error(`${action} requires one category axis and one quantitative measure.`);
    if (categoryAxis) Object.assign(defaults, {category:plain(category), orientation: categoryAxis === 'x' ? 'vertical' : 'horizontal'});
    if (action === 'createDumbbellPlot') { defaults.end=plain(measure); } else defaults.value=plain(measure);
    if (kind === 'endpoint') defaults.summary=['mean','median','sum','min','max'].includes(measure?.measurement.operations.at(-1))?measure.measurement.operations.at(-1):'mean';
  } else if (['histogram','density','ecdf'].includes(kind)) {
    defaults.field = supplied.field ?? measure?.field;
    if (kind === 'density' && c.x?.measurement.unit === 'density') defaults.densityChannel='x';
    if (kind === 'histogram' && x?.bin) {
      defaults.maxBins=x.bin.maxBins; defaults.binStep=x.bin.step; defaults.binBoundaries=x.bin.boundaries;
    }
    if (kind === 'density' && c.color?.field && categorical(c.color)) defaults.groupBy=c.color.field;
  } else if (kind === 'rug') {
    const axis = supplied.y !== undefined || supplied.edge === 'left' || supplied.edge === 'right' || categorical(c.x) ? 'y' : 'x';
    defaults[axis] = plain(c[axis]); defaults.edge = axis === 'x' ? 'bottom' : 'left';
  } else if (kind === 'polar') {
    defaults.theta=plain(c.theta); defaults.radius=plain(c.radius);
    if (action === 'createPolarLinePlot' && source.groupBy) defaults.groupBy=source.groupBy;
  } else if (kind === 'radial') {
    defaults.category=plain(c.theta);
    defaults.aggregate=c.radius?.measurement.operations.at(-1) ?? c.theta?.measurement.parameters?.aggregate ?? 'count';
    if(defaults.aggregate==='sum') defaults.value=c.radius?.field ?? c.theta?.measurement.parameters?.weight;
  } else if (kind === 'radar') {
    if (c.theta?.fields) defaults.wide={fields:c.theta.fields};
    else {defaults.category=plain(c.theta); defaults.value=plain(c.radius);}
    if (source.groupBy) defaults.groupBy=source.groupBy;
  } else if (kind === 'parallel') defaults.dimensions=source.dimensions?.map(plain);
  if (c.color?.field && kind !== 'heatmap' && kind !== 'horizon') {
    const summaryCategoryOnly = ['endpoint','categoryValue','summaryXY'].includes(kind) && action !== 'createIntervalPlot';
    const colorSurvives = !summaryCategoryOnly || c.color.field === category?.field ||
      action === 'createViolinPlot' && supplied.split?.field === c.color.field;
    if (colorSurvives) defaults.color=plain(c.color);
    if (action === 'createIntervalPlot' && categorical(c.color) && c.color.field !== category?.field) defaults.groupBy=c.color.field;
  }
  if (action === 'createAreaPlot') {
    const axis = supplied.valueChannel ?? (categoryAxis === 'y' ? 'x' : 'y'); defaults.valueChannel=axis;
    if(defaults[axis]) defaults[axis]={field:defaults[axis].field};
  }
  if (kind==='ecdf' && c.color?.field) defaults.groupBy=[c.color.field];
  if (action==='createAreaPlot' && c.color?.field) defaults.groupBy=[c.color.field];
  const result={...defaults,...supplied};
  for(const key of ['x','y','category','value','theta','radius','color','end']) {
    if (supplied[key] !== undefined && defaults[key] !== undefined) result[key]=merge(defaults[key],supplied[key]);
  }
  return Object.fromEntries(Object.entries(result).filter(([,v])=>v!==undefined));
}

// Describe prospective roles without constructing/rendering a candidate chart.
export function constructorChannels(action, options, source) {
  const kind=PLOT_COMPOSITION_ROLES[action], c=source.channels, result={};
  const add=(channel,value,path,operation) => {
    const e=fieldEncoding(value); if(!e?.field) return;
    const reference=c[channel]?.field===e.field?c[channel]:Object.values(c).find(r=>r.field===e.field);
    result[channel]={ field:e.field,fieldType:e.fieldType??reference?.fieldType??'quantitative',
      operations:operation ? [operation] : e.aggregate ? [e.aggregate] : [],
      ...(e.temporalUnit ? {temporalUnit:e.temporalUnit}:{}), ...(e.bin ? {bin:e.bin}:{}), path };
  };
  if(['xy','summaryXY','heatmap','horizon'].includes(kind)) {
    add('x',options.x,'x.scale'); add('y',options.y,'y.scale');
    if(kind==='horizon' && result.y) result.y.operations=['folded'];
  } else if(['endpoint','categoryValue'].includes(kind)) {
    const axis=options.orientation==='horizontal'?'y':'x', measureAxis=axis==='x'?'y':'x';
    add(axis,options.category,'category.scale');
    add(measureAxis,options.value??options.end,options.value?'value.scale':'end.scale',kind==='endpoint'?options.summary:undefined);
  } else if(kind==='histogram') {
    add('x',options.field,'xScale'); add('y',options.weight??options.field,'yScale',options.weight?'sum':'count');
  } else if(kind==='density') {
    const density=options.densityChannel??'y', value=density==='y'?'x':'y';
    add(value,options.field,'valueScale'); add(density,options.field,'densityScale','density');
  } else if(kind==='ecdf') {
    const value=options.orientation==='horizontal'?'y':'x';
    add(value,options.field,'valueScale'); add(value==='x'?'y':'x',options.field,'probabilityScale','probability');
  } else if(kind==='rug') {
    add('x',options.x,'x.scale'); add('y',options.y,'y.scale');
  } else if(kind==='polar') {
    add('theta',options.theta,'theta.scale'); add('radius',options.radius,'radius.scale');
  } else if(kind==='radial') {
    add('theta',options.category,'category.scale');
    if(action!=='createPiePlot') {
      if(options.aggregate==='count') result.radius={fieldType:'quantitative',operations:['count'],path:'radiusScale'};
      else add('radius',options.value,'radiusScale',options.aggregate);
    } else if(result.theta) result.theta.operations=['partition'];
  } else if(kind==='radar' && !options.wide) {
    add('theta',options.category,'category.scale'); add('radius',options.value,'value.scale');
  }
  return result;
}
