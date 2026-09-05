import { chart } from '../../../../types/index.js';
chart().createPointMark({ stroke: false });
chart().createBarMark({ stroke: false });
chart().createRectMark({ stroke: false });
chart().createBarPlot({ x: { field: 'amount', aggregate: 'sum' }, y: { field: 'when', fieldType: 'temporal' }, guides: false });
