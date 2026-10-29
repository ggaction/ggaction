import { withPositionScaleBindings } from "../encodings/position/scope.js";
import { closedAction } from '../../core/action.js';
import { planLayerPlot } from './layerPlan.js';
import { findLayer } from '../../selectors/layers.js';
import { plotComposition } from '../../selectors/plotComposition.js';

const createLayerPlot = /* @__PURE__ */ closedAction({op:'createLayerPlot',description:'Layer a native chart over a compatible source using shared coordinates and scales.'},
  ['id','source','plot','placement'],function(args={}) {
    const plan=planLayerPlot(this,args);
    let next=this;
    for (const edit of plan.scaleEdits) next=next.editScale(edit);
    next=withPositionScaleBindings(plan.options, plan.rebind, options => next[plan.action](options));
    for (const [channel, scale] of Object.entries(plan.rebind)) {
      const owner = plotComposition(next, plan.id);
      const layer = findLayer(next, owner.owner);
      const method = {x:'encodeX',y:'encodeY',theta:'encodeTheta',radius:'encodeR'}[channel];
      const {field,fieldType} = layer.encoding[channel];
      next = next[method]({target:owner.owner,field,fieldType,scale:{id:scale}});
    }
    if(plan.deferredColor) next=next[plan.action==='createRugPlot'?'encodeStroke':'encodeColor']({target:plan.id,...plan.deferredColor});
    const owner=plotComposition(next,plan.id);
    const existing=new Set(this.semanticSpec.layers.map(layer=>layer.id));
    const added=new Set(next.semanticSpec.layers.filter(layer=>!existing.has(layer.id)).map(layer=>layer.id));
    if(!owner.ownedMarks.every(id=>added.has(id))) throw new Error('A layer must own its new compound marks independently.');
    // Preserve the native mark block as one unit. Concrete roots keep their
    // relative order; guides and unrelated graphics retain their positions.
    const reorder = order => {
      const addedRoots=order.filter(id=>added.has(id));
      if(!addedRoots.length) return order;
      const rest=order.filter(id=>!added.has(id));
      const anchors=rest.map((id,index)=>existing.has(id)?index:-1).filter(i=>i>=0);
      const at=anchors.length?(plan.placement==='back'?anchors[0]:anchors.at(-1)+1):rest.length;
      rest.splice(at,0,...addedRoots); return rest;
    };
    for (const [id, graphic] of Object.entries(next.graphicSpec.objects)) {
      if (!graphic.children) continue;
      const children = reorder(graphic.children);
      if (children.some((child, index) => child !== graphic.children[index]))
        next = next.editGraphics({ target:id, property:'children', value:children });
    }
    return next;
  });
export function registerLayerPlotActions(ProgramClass){ProgramClass.prototype.createLayerPlot=createLayerPlot;}
