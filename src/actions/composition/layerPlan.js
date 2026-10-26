import { isPlainObject } from '../../core/immutable.js';
import { validateUserId } from '../../core/identifiers.js';
import { validateOptionObject } from '../../core/validation.js';
import { hasLayer } from '../../selectors/layers.js';
import { requireMaterializedDataset } from '../../selectors/datasets.js';
import { normalizeGroupFields, validatePathSeriesAppearance } from '../../grammar/pathSeries.js';
import { deriveLineSeries, resolveLineBins } from '../../grammar/lineSeries.js';
import { findSemanticScale } from '../../selectors/scales.js';
import { plotComposition, measurementUnit } from '../../selectors/plotComposition.js';
import { inferCompositionOptions, constructorChannels, PLOT_COMPOSITION_ROLES, fieldEncoding } from '../../grammar/plotComposition.js';

const get=(object,path)=>path.split('.').reduce((o,k)=>o?.[k],object);
function set(object,path,value) {
  const parts=path.split('.'),last=parts.pop(); let node=object;
  for(const key of parts) { node[key]={...fieldEncoding(node[key])}; node=node[key]; }
  node[last]=value;
}
function bindScale(program, options, path, id) {
  if(!id) throw new Error(`The source has no scale for ${path}.`);
  const requested=get(options,path), stored=findSemanticScale(program,id);
  if(requested?.id!==undefined && requested.id!==id) throw new Error(`${path} must reuse source scale "${id}".`);
  for(const [key,value] of Object.entries(requested??{})) {
    if(key==='id') continue;
    // Explicit automatic limits are compatible with an automatic source. A
    // shared resource must never be silently redefined by a new consumer.
    if(JSON.stringify(value)!==JSON.stringify(key==='palette'?stored?.range?.palette:stored?.[key])) throw new Error(`${path}.${key} conflicts with the shared source scale. Edit that scale first.`);
  }
  set(options,path,{ ...stored, id });
}
export function planLayerPlot(program,args={}) {
  if(program.compositionSpec) throw new Error('Select one chart view; use editFacetSource for a faceted chart.');
  const id=validateUserId(args.id??'layer','Layer plot id');
  if(hasLayer(program,id)||Object.values(program.markConfigs).some(c=>c.raincloudPlot?.id===id)) throw new Error(`Layer plot "${id}" already exists. Supply a unique id.`);
  const placement=args.placement??'front';
  if(!['front','back'].includes(placement)) throw new Error('Layer placement must be front or back.');
  const spec=args.plot;
  validateOptionObject(spec,['action','options','inherit'],'Layer plot');
  if(!PLOT_COMPOSITION_ROLES[spec?.action]) throw new Error('Layer plot requires a supported native plot.action.');
  const supplied=spec.options??{};
  if(!isPlainObject(supplied)) throw new TypeError('Layer plot options must be an object.');
  if(Object.hasOwn(supplied,'id')) throw new Error('Use the top-level layer id, not plot.options.id.');
  const source=plotComposition(program,args.source), kind=PLOT_COMPOSITION_ROLES[spec.action];
  if(args.source && args.source!==source.owner && program.markConfigs[source.owner]?.raincloudPlot?.id!==args.source) throw new Error('Layer source must be an independent plot owner, not one of its generated marks.');
  const family=['polar','radial','radar'].includes(kind)?'polar':kind==='parallel'?'parallel':'cartesian';
  if(source.coordinate?.type!==family) throw new Error(`Cannot overlay ${family} and ${source.coordinate?.type} coordinates. Add an adjacent chart instead.`);
  if(supplied.coordinate!==undefined&&supplied.coordinate!==source.coordinate.id) throw new Error('Layer plots must reuse the source coordinate.');
  const options=inferCompositionOptions(source,spec.action,supplied,spec.inherit);
  if (['createLinePlot','createPolarLinePlot','createAreaPlot'].includes(spec.action)) {
    // A point's per-row color does not necessarily describe one whole path.
    // Reuse the native series contract before deciding whether omitted color
    // can be inherited; explicit choices must still fail rather than disappear.
    const color=options.color===undefined?undefined:{fieldType:'nominal',...fieldEncoding(options.color)};
    const pathColor=color && {...color,scale:color.field===source.channels.color?.field?source.channels.color.scale:color.scale?.id};
    const path={id,mark:{type:spec.action==='createAreaPlot'?'area':'line',missing:options.line?.missing??'error'},encoding:{...(pathColor?{color:pathColor}:{}),
      ...(options.groupBy===undefined?{}:{group:{fieldType:'nominal',fields:normalizeGroupFields(options.groupBy)}})}};
    const rows=requireMaterializedDataset(program,options.data).values;
    const validate=()=>{
      if (spec.action==='createAreaPlot' && path.encoding.color && !['nominal','ordinal'].includes(color.fieldType))
        throw new Error('createAreaPlot color requires a categorical field.');
      validatePathSeriesAppearance(rows,path,program.semanticSpec.scales);
      if(path.mark.type==='line') {
        for(const channel of ['x','y','theta','radius']) if(options[channel])
          path.encoding[channel]={...fieldEncoding(options[channel]),scale:source.channels[channel]?.scale};
        deriveLineSeries(rows,path,{scales:program.semanticSpec.scales,
          xBinBoundaries:path.encoding.x?.bin===undefined?undefined:
            resolveLineBins(rows,path,findSemanticScale(program,source.channels.x?.scale)).boundaries,
          xDomain:program.resolvedScales[source.channels.x?.scale]?.domain,
          yDomain:program.resolvedScales[source.channels.y?.scale]?.domain,
          thetaDomain:program.resolvedScales[source.channels.theta?.scale]?.domain});
      }
    };
    try {validate();} catch (error) {
      if (supplied.color!==undefined || options.color===undefined) throw error;
      delete options.color;
      delete path.encoding.color;
      validate();
    }
  }
  if(spec.action==='createRegressionPlot' && ['x','y'].some(axis=>source.channels[axis]?.fieldType!=='quantitative')) throw new Error('Regression requires two quantitative source axes.');
  if(spec.action==='createBarPlot' && ['x','y'].some(axis=>options[axis]?.aggregate) && !['x','y'].some(axis=>['nominal','ordinal'].includes(options[axis]?.fieldType)||options[axis]?.bin)) throw new Error('Bar layers require a categorical or binned position.');
  if(kind==='heatmap' && ['x','y'].some(axis=>source.channels[axis]?.fieldType!=='quantitative')) throw new Error('A density heatmap layer requires two quantitative source axes.');
  if(spec.action==='createDumbbellPlot') {
    if(!fieldEncoding(options.start)?.field) throw new Error('Dumbbell requires an explicit start field; it cannot be inferred from one measure.');
    if(fieldEncoding(options.start).field===fieldEncoding(options.end)?.field) throw new Error('Dumbbell start and end fields must be distinct.');
  }
  if(['summaryXY','categoryValue','density','endpoint'].includes(kind)&&options.color?.fieldType==='quantitative') throw new Error('A grouped distribution layer requires a categorical color field.');
  if(['createStripPlot','createBeeswarmPlot'].includes(spec.action) && ['x','y'].filter(axis=>['nominal','ordinal'].includes(source.channels[axis]?.fieldType)).length!==1) throw new Error('Strip and Beeswarm require one categorical slot and one measure.');
  if(kind==='rug') {
    const axis=options.y?'y':'x';
    if(!(axis==='y'?['left','right']:['top','bottom']).includes(options.edge)) throw new Error(`Rug ${axis} uses ${axis==='y'?'left or right':'top or bottom'} edges.`);
    if(!['quantitative','temporal'].includes(options[axis]?.fieldType))throw new Error('Rug requires a quantitative or temporal axis.');
  }
  const category=options.category?.field ?? ['x','y'].map(axis=>options[axis]).find(e=>['nominal','ordinal'].includes(e?.fieldType))?.field;
  if (options.color?.field && ['summaryXY','categoryValue'].includes(kind) && spec.action!=='createIntervalPlot' &&
      options.color.field!==category && !(spec.action==='createViolinPlot'&&options.split?.field===options.color.field))
    throw new Error('This summary color must name its category or an explicit supported split field.');
  if (kind === 'rug' && spec.inherit?.color !== false && !options.color && source.channels.color?.field) {
    options.color = { field: source.channels.color.field, fieldType: source.channels.color.fieldType };
  }
  let deferredColor;
  if(['endpoint','rug'].includes(kind)&&options.color) {
    if(kind==='endpoint' && options.color.field!==options.category.field) throw new Error('Endpoint summary color must be the category field.');
    deferredColor=options.color; delete options.color;
  }
  if (spec.action==='createAreaPlot' && options.missing!=='break') {
    const fields=options.groupBy===undefined?[]:normalizeGroupFields(options.groupBy);
    const groups=new Map();
    for (const row of requireMaterializedDataset(program,options.data).values) {
      const key=JSON.stringify(fields.map(field=>row[field]));
      groups.set(key,(groups.get(key)??0)+1);
    }
    if (!groups.size || [...groups.values()].some(count=>count<2))
      throw new Error('Each area series requires at least two observations. Choose another layer or a less granular group.');
  }
  options.id=id; options.coordinate=source.coordinate.id;
  // A layer consumes existing guides. createGuides can be called once after
  // constructing the view; constructors must not duplicate or reset them.
  if(options.guides!==undefined&&options.guides!==false) throw new Error('Layer guides are shared; call createGuides on the completed view.');
  options.guides=false;
  const rebind = {}, scaleEdits = [];
  if(kind==='radial') {
    if(!['count','sum'].includes(options.aggregate)||(options.aggregate==='sum')!==(options.value!==undefined)) throw new Error('Radial plots require count without a value field or sum with a value field.');
    if(spec.action==='createPiePlot') {
      const expected={aggregate:options.aggregate,...(options.aggregate==='sum'?{weight:options.value}:{})};
      if(source.role!=='pie'||JSON.stringify(expected)!==JSON.stringify(source.channels.theta?.measurement.parameters)) throw new Error('Pie layers require the same angle partition, aggregate and weight.');
    } else {
      const mapping=spec.action==='createRosePlot'?'area':'radius-length';
      if(findSemanticScale(program,source.channels.radius?.scale)?.radialMapping!==mapping) throw new Error('Radial layers require the same radius mapping (area or radius-length).');
    }
  }
  if (['createViolinPlot','createRaincloudPlot','createBoxPlot','createGradientPlot','createBarPlot'].includes(spec.action)) {
    for (const channel of ['x','y']) {
      const role = source.channels[channel], scale = findSemanticScale(program,role?.scale);
      if (scale?.type === 'point') scaleEdits.push({id:scale.id,type:'band',paddingInner:0,paddingOuter:0});
    }
  }
  if(kind==='radar') {
    const fields=source.channels.theta?.fields;
    if(source.role!=='radar'||JSON.stringify(options.wide?.fields)!==JSON.stringify(fields)) throw new Error('Radar layers require identical dimensions and order.');
    if(options.order&&JSON.stringify(options.order)!==JSON.stringify(fields)) throw new Error('Radar layers require the source dimension order.');
    rebind.theta = source.channels.theta.scale;
    rebind.radius = source.channels.radius.scale;
  } else if(kind==='parallel') {
    const dimensions=options.dimensions?.map(fieldEncoding);
    if(!dimensions||JSON.stringify(dimensions.map(d=>d.field))!==JSON.stringify(source.dimensions?.map(d=>d.field))) throw new Error('Parallel layers require identical dimensions and order.');
    options.dimensions=dimensions.map((d,index)=>{const o={...d};bindScale(program,{dimension:o},'dimension.scale',source.dimensions[index].scale);return {...o,scale:{id:source.dimensions[index].scale}};});
  } else {
    const channels=constructorChannels(spec.action,options,source);
    if(!Object.keys(channels).length || (kind==='polar' && (!channels.theta || !channels.radius))) throw new Error('The source does not supply the required positional fields.');
    for(const [channel,candidate] of Object.entries(channels)) {
      const original=source.channels[channel];
      if(!original||candidate.field!==original.field||candidate.fieldType!==original.fieldType||
        measurementUnit(candidate.operations)!==original.measurement.unit||
        (candidate.temporalUnit??null)!==(original.temporalUnit??null))
        throw new Error(`Layer ${channel} must measure the same field, type, and units as the source. Use a follow overlay or an adjacent chart for different measurements.`);
      if (kind === 'ecdf') rebind[channel] = original.scale;
      else if (kind === 'horizon' && channel === 'y') set(options,candidate.path,{id:original.scale});
      else {
        bindScale(program,options,candidate.path,original.scale);
        const promotion=scaleEdits.find(s=>s.id===original.scale);
        if(promotion) { const bound={...get(options,candidate.path),...promotion}; delete bound.padding; set(options,candidate.path,bound); }
      }
    }
    if(kind==='horizon'&&JSON.stringify(source.channels.y.measurement.parameters)!==JSON.stringify({bands:options.bands,baseline:options.baseline,extent:options.extent,resolve:options.resolve})) throw new Error('Horizon layers require the same folding parameters.');
  }
  if(spec.action==='createDumbbellPlot') bindScale(program,options,'start.scale',source.channels[options.orientation==='horizontal'?'x':'y'].scale);
  if(kind==='radial') {
    options.category.scale={id:source.channels.theta.scale};
    if(options.radiusScale) options.radiusScale={id:source.channels.radius.scale};
  }
  if(kind==='heatmap') options.color={...(options.color??{}),scale:{...(options.color?.scale??{}),id:options.color?.scale?.id??`${id}Color`}};
  else if(options.color?.field && options.color.field!==source.channels.color?.field) options.color={...options.color,scale:{...options.color.scale,id:options.color.scale?.id??`${id}Color`}};
  if(options.color?.field && options.color.field===source.channels.color?.field) bindScale(program,options,'color.scale',source.channels.color.scale);
  if(deferredColor?.field===source.channels.color?.field && deferredColor) deferredColor={...deferredColor,scale:{id:source.channels.color.scale}};
  return {id,source,action:spec.action,options,placement,rebind,scaleEdits,deferredColor};
}
