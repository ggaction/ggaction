// 타입 설계 검토용. 실제 action 실행/제품 테스트 완료 증거가 아니다.
import type * as P from "./IMPLEMENTATION_TYPES.js";

export const computed = {
  id: "c", as: "v",
  expression: { op: "if", condition: {op:"gt",left:{field:"x"},right:{constant:0}},
    then:{op:"log",operand:{field:"x"}},else:{constant:null} }
} satisfies P.ComputedDataOptions;
export const complete = {id:"c",key:"t",sequence:{start:1,end:3,step:1}} satisfies P.CompleteDataOptions;
export const impute = {id:"i",fields:["v"],method:"linear",sortBy:[{field:"t"}]} satisfies P.ImputedDataOptions;
export const normalize = {id:"n",field:"v",as:"z",method:"index",sortBy:[{field:"t"}]} satisfies P.NormalizedDataOptions;
export const time = {id:"t",field:"when",as:"week",unit:"week",weekRule:"iso",weekStartsOn:1,timeZone:"UTC"} satisfies P.TimeUnitDataOptions;
export const window = {id:"w",temporalUnit:"timestamp",sortBy:[{field:"t"}],
  operations:[{op:"movingMean",field:"x",as:"m",frame:{duration:{preceding:7,unit:"day"}}}]
} satisfies P.WindowDataOptions;
export const weighted = {id:"w",weight:{field:"w",kind:"frequency"},
  aggregates:[{op:{op:"quantile",probability:.25},field:"x",as:"q"}]
} satisfies P.SummaryDataOptions;
export const edit = {target:"c",dependents:"recompute",expression:{constant:2}} satisfies P.EditComputedDataOptions;
export const size = {type:"pow",exponent:2,domain:[1,9],range:[0,80]} satisfies P.SizeScaleOptions;
export const stroke = {target:"p",field:"g",fieldType:"nominal"} satisfies P.StrokeEncodingOptions;
export const parallel = {target:"p",dimension:"a",domain:[0,20]} satisfies P.EditParallelScaleOptions;
export const offset = {target:"b",paddingInner:.2,paddingOuter:.1} satisfies P.EditXOffsetScaleOptions;
export const channels = {target:"p",channels:{x:{field:"b",scale:{id:"x"}},y:{field:"a"},stroke:{field:"g"}}} satisfies P.EncodeChannelsOptions;
export const coordinate = {target:"polar",aspect:{mode:"frame",ratio:1},polarFrame:{radius:{unit:"fraction",value:.8}}} satisfies P.EditCoordinateOptions;
export const removeLabels = {source:"p"} satisfies P.RemoveMarkLabelsOptions;
export const selection = {target:"labels",select:{field:"v",op:"max",count:2}} satisfies P.EditMarkLabelSelectionOptions;
export const placement = {target:"labels",placement:{anchor:"outsideEnd",gap:4}} satisfies P.EditMarkLabelPlacementOptions;
export const reference = {source:"p",axis:"y",statistic:{op:"quantile",p:.25}} satisfies P.CreateReferenceLineOptions;
export const legend = {target:"p",channels:["size"],values:[10,50,100]} satisfies P.LegendOptions;
export const block = {target:"p",channel:"size",title:"규모",values:[10,50]} satisfies P.EditLegendBlockOptions;
export const header = {role:"row",side:"left",labelMap:[{value:1,label:"하나"}]} satisfies P.EditFacetHeadersOptions;
export const repeat = {channel:{parallelDimension:"a"},fields:["c","d"],scales:{parallelDimensions:"shared"}} satisfies P.RepeatChartsOptions;
export const theme = {theme:{base:"light",tokens:{mark:"#ff0000"}},scope:"descendants"} satisfies P.ApplyThemeOptions;
export const shape = {cornerRadius:4,lineCap:"round",lineJoin:"bevel",miterLimit:10} satisfies P.RectStyleDetails;
export const remove = {id:"unused"} satisfies P.RemoveDataOptions;

// @ts-expect-error Complete values와sequence는배타
const badComplete: P.CompleteDataOptions = {id:"c",key:"t",values:[1],sequence:{start:1,end:2,step:1}};
// @ts-expect-error constant에는value필수
const badImpute: P.ImputedDataOptions = {id:"i",fields:["v"],method:"constant"};
// @ts-expect-error 기준형method의position기준에는sort필수
const badNormalize: P.NormalizedDataOptions = {id:"n",field:"v",as:"z",method:"index"};
// @ts-expect-error change는zeroDenominator옵션없음
const badChange: P.NormalizedDataOptions = {id:"n",field:"v",as:"z",method:"change",baseline:{value:0},zeroDenominator:"zero"};
// @ts-expect-error ISO는Monday만
const badWeek: P.TimeUnitDataOptions = {id:"t",field:"t",as:"w",unit:"week",weekRule:"iso",weekStartsOn:0};
// @ts-expect-error weekday에는week전용옵션없음
const badWeekday: P.TimeUnitDataOptions = {id:"t",field:"t",as:"w",unit:"weekday",weekRule:"calendar"};
// @ts-expect-error rank는moving옵션없음
const badWindow: P.WindowOperation = {op:"rank",as:"rank",minPeriods:2};
// @ts-expect-error 두frame형태혼합금지
const badFrame: P.WindowFrame = {preceding:2,duration:{preceding:7,unit:"day"}};
// @ts-expect-error focusededitor는source교체없음
const badEdit: P.EditComputedDataOptions = {target:"c",source:"other",as:"v"};
// @ts-expect-error powexponent필수
const badSize: P.SizeScaleOptions = {type:"pow",range:[0,100]};
// @ts-expect-error discretesize는clamp없음
const badDiscrete: P.SizeScaleOptions = {type:"quantile",range:[1,2],clamp:true};
// @ts-expect-error strokevalue/field배타
const badStroke: P.StrokeEncodingOptions = {value:"red",field:"g"};
// @ts-expect-error offsetrange금지
const badOffset: P.EditXOffsetScaleOptions = {target:"b",range:[0,100]};
// @ts-expect-error channelpayload의coordinate금지
const badChannels: P.EncodeChannelsOptions = {target:"p",channels:{x:{field:"x",coordinate:"other"}}};
// @ts-expect-error 좌표type변경은범위밖
const badCoordinate: P.EditCoordinateOptions = {target:"c",type:"polar"};
// @ts-expect-error labels제거selector배타
const badRemoval: P.RemoveMarkLabelsOptions = {target:"l",source:"p"};
// @ts-expect-error selection해제는all:true만
const badSelection: P.EditMarkLabelSelectionOptions = {target:"l",all:false};
// @ts-expect-error literal/statistic배타
const badReference: P.CreateReferenceLineOptions = {source:"p",y:4,axis:"y",statistic:{op:"mean"}};
// @ts-expect-error all+side금지
const badHeader: P.EditFacetHeadersOptions = {role:"all",side:"left"};
// @ts-expect-error row의topside금지
const badRow: P.EditFacetHeadersOptions = {role:"row",side:"top"};
// @ts-expect-error closedthemevocabulary
const badTheme: P.ApplyThemeOptions = {theme:{base:"light",tokens:{brandColor:"red"}}};
// @ts-expect-error closedcapvocabulary
const badShape: P.StrokeStyleDetails = {lineCap:"flat"};
