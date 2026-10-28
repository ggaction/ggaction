type FullFormatsProgram = ReturnType<typeof import("ggaction").chart>;
type BasicFormatsProgram = ReturnType<typeof import("ggaction/basic").chart>;
const groupedFull: Parameters<FullFormatsProgram["createXAxisLabels"]>[0] = {format:",.0f"};
const weekdayFull: Parameters<FullFormatsProgram["createXAxisLabels"]>[0] = {format:"%a"};
const groupedBasic: Parameters<BasicFormatsProgram["createLinePlot"]>[0] = {x:"x",y:"y",guides:{axes:{x:{ticksAndLabels:{labels:{format:",.2f"}}}}}};
const weekdayBasic: Parameters<BasicFormatsProgram["createLinePlot"]>[0] = {x:{field:"date",fieldType:"temporal"},y:"y",guides:{axes:{x:{ticksAndLabels:{labels:{format:"%a"}}}}}};
declare const fullLookup: FullFormatsProgram;
declare const basicLookup: BasicFormatsProgram;
fullLookup.createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});
basicLookup.createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});
fullLookup.editLookupData({target:"ages",lookup:{data:"people",key:"name",fields:["age"],as:["years"]}});
// @ts-expect-error lookup reference is explicit
fullLookup.createLookupData({id:"ages",field:"person",lookup:{key:"name",fields:["age"]}});
// @ts-expect-error nested edit replaces a complete lookup definition
fullLookup.editLookupData({target:"ages",lookup:{key:"name"}});
// @ts-expect-error Basic is creation only
basicLookup.editLookupData({target:"ages",field:"other"});
declare const numericText: FullFormatsProgram;
numericText.encodeDx({field:"shift"}).encodeDy({value:-6});
numericText.encodeChannels({target:"text",channels:{dx:{field:"shift"},dy:{value:0}}});
numericText.removeEncoding({channel:"dx"});
// @ts-expect-error direct offsets have no scale
numericText.encodeDx({field:"shift",scale:{}});
// @ts-expect-error field/value union is exclusive
numericText.encodeDy({field:"shift",value:1});
// @ts-expect-error Basic retains its Text-family exclusion
type BasicNumericTextOffset = BasicFormatsProgram["encodeDx"];
const overlapFull: Parameters<FullFormatsProgram["createYAxisTitle"]>[0] = {overlap:"allow"};
const overlapBasic: Parameters<BasicFormatsProgram["createAxes"]>[0] = {y:{title:{overlap:"allow"}}};
// @ts-expect-error title overlap is a closed string policy
const overlapInvalid: Parameters<FullFormatsProgram["createYAxisTitle"]>[0] = {overlap:true};
// @ts-expect-error grouped scientific notation remains unsupported
const invalidGrouped: Parameters<FullFormatsProgram["createXAxisLabels"]>[0] = {format:",.2e"};

import { chart as preparedChart, prepareDataUpdate, type PreparedDataUpdate } from "ggaction";
import { chart as preparedBasicChart, prepareDataUpdate as prepareBasicDataUpdate } from "ggaction/basic";
const preparedBase = preparedChart(), preparedBasicBase = preparedBasicChart();
const preparedHost = { requestToken: "current" };
const preparedCreate = await prepareDataUpdate(preparedBase, {
  kind: "create", id: "source", source: { kind: "inline", values: [{ x: 1 }] }
}, preparedHost);
preparedBase.applyDataUpdate({ prepared: preparedCreate, requestToken: "current" });
const preparedBasicCreate = await prepareBasicDataUpdate(preparedBasicBase, {
  kind: "create", id: "source", source: { kind: "named", name: "rows", format: "csv" }
}, { ...preparedHost, resolveNamed: () => ({ text: "x\n1", encoding: "utf-8", mimeType: "text/csv" }) });
preparedBasicBase.applyDataUpdate({ prepared: preparedBasicCreate, requestToken: "current" });
const preparedRevision = await prepareDataUpdate(preparedBase, {
  kind: "revise", target: "source", id: "next"
}, preparedHost);
// @ts-expect-error opaque preparations cannot be constructed
const forgedPreparation: PreparedDataUpdate = { kind: "data-update", request: { kind: "create", id: "source" } };
// @ts-expect-error Basic cannot apply a revision preparation
preparedBasicBase.applyDataUpdate({ prepared: preparedRevision, requestToken: "current" });
// @ts-expect-error the latest host token is required
preparedBase.applyDataUpdate({ prepared: preparedCreate });
// @ts-expect-error Basic cannot prepare parameter changes
await prepareBasicDataUpdate(preparedBasicBase, { kind: "parameter", target: "p", value: 2 }, preparedHost);

const flushThresholdFull: Parameters<FullFormatsProgram["createXAxisLabels"]>[0] = {flush:true,flushThreshold:1};
const flushThresholdBasic: Parameters<BasicFormatsProgram["createAxes"]>[0] = {x:{ticksAndLabels:{labels:{flush:true,flushThreshold:0}}}};
fullLookup.editXAxisLabels({flushThreshold:"auto"});
// @ts-expect-error threshold reset is the exact auto literal
fullLookup.editXAxisLabels({flushThreshold:"1"});
