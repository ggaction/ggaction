import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {renderToSVG} from "../../../../src/renderers/svg.js";
import {serializeProgram, deserializeProgram} from "../../../../src/persistence.js";

const base = (factory = chart) => factory().createCanvas({width:800,height:800,margin:250});
const properties = (program, id) => {
  const object = program.graphicSpec.objects[id];
  return (object.items ?? [object]).map(item => item.properties);
};
const options = {
  text:"\nAlpha\n\nBeta\n", subtitle:"\nSource\n\nCredit\n",
  titleStyle:{fontSize:10}, subtitleStyle:{fontSize:8}, gap:3
};

for (const position of ["top","bottom","left","right"]) {
  test(`${position} blank title lines reserve their original positions without empty graphic text`, () => {
    const factory = chart;
      const program = base(factory).createTitle({...options,position});
      assert.deepEqual(properties(program,"chartTitle").map(p => p.text),["Alpha","Beta"]);
      assert.deepEqual(properties(program,"chartSubtitle").map(p => p.text),["Source","Credit"]);
      const axis = ["top","bottom"].includes(position) ? "y" : "x";
      assert.equal(Math.abs(properties(program,"chartTitle")[1][axis] - properties(program,"chartTitle")[0][axis]),24);
      assert.ok(Math.abs(Math.abs(properties(program,"chartSubtitle")[1][axis] - properties(program,"chartSubtitle")[0][axis])-19.2)<1e-10);
      const withVisibleSentinels = base(factory).createTitle({
        ...options, position, text:options.text.replaceAll("\n\n","\ni\n").replace(/^\n/,"i\n").replace(/\n$/,"\ni"),
        subtitle:options.subtitle.replaceAll("\n\n","\ni\n").replace(/^\n/,"i\n").replace(/\n$/,"\ni")
      });
      for (const id of ["chartTitle","chartSubtitle"]) {
        assert.deepEqual(properties(program,id),properties(withVisibleSentinels,id).filter(p => p.text !== "i"));
      }
      assert.equal(program.semanticSpec.title.text,options.text);
      assert.equal(program.semanticSpec.title.subtitle,options.subtitle);
      assert.doesNotThrow(() => renderToSVG(program));
      assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec,program.graphicSpec);
      const before = JSON.stringify(program);
      const changed = program.editCanvas({width:840});
      assert.deepEqual(changed.graphicSpec,base(factory).editCanvas({width:840}).createTitle({...options,position}).graphicSpec);
      assert.equal(JSON.stringify(program),before);
  });
}

test("edits reconcile a single painted line, multiple painted lines and subtitle removal", () => {
  const original = base().createTitle({text:"Alpha",subtitle:"Source",titleStyle:{fontSize:10},subtitleStyle:{fontSize:8}});
  const snapshot = JSON.stringify(original);
  const changed = original.editTitle({text:"\nAlpha\n",subtitle:"\nSource\n"});
  assert.equal(changed.graphicSpec.objects.chartTitle.items,undefined);
  assert.deepEqual(properties(changed,"chartTitle").map(p => p.text),["Alpha"]);
  assert.deepEqual(properties(changed,"chartSubtitle").map(p => p.text),["Source"]);
  assert.doesNotThrow(() => renderToSVG(changed));
  const multiple = changed.editTitle({text:"Alpha\n\nBeta",subtitle:false});
  assert.equal(multiple.graphicSpec.objects.chartTitle.items.length,2);
  assert.equal(multiple.graphicSpec.objects.chartSubtitle,undefined);
  assert.deepEqual(multiple.editTitle({text:"Alpha",subtitle:"Source"}).graphicSpec,original.graphicSpec);
  assert.equal(JSON.stringify(original),snapshot);
});

test("hard blanks and wrapping retain explicit lineHeight and reject whole empty multiline text atomically", () => {
  const p = base().createTitle({text:"Alpha beta\n\nGamma",titleStyle:{fontSize:10},maxWidth:45,lineHeight:15});
  assert.deepEqual(properties(p,"chartTitle").map(p => p.text),["Alpha","beta","Gamma"]);
  const ys = properties(p,"chartTitle").map(p => p.y);
  assert.equal(ys[1]-ys[0],15);
  assert.equal(ys[2]-ys[1],30);
  assert.doesNotThrow(() => renderToSVG(p));
  const snapshot = JSON.stringify(p);
  for (const text of ["", "\n", "\r\n\r\n", "\r\n\r"]) {
    assert.throws(() => p.editTitle({text}),/non-empty/);
    assert.throws(() => p.editTitle({subtitle:text}),/non-empty/);
    assert.throws(() => base().createTitle({text}),/non-empty/);
  }
  assert.equal(JSON.stringify(p),snapshot);
});

test("faceted parent titles skip blank painted lines while reserving the complete reading block", () => {
  const source = chart().createCanvas({width:300,height:250,margin:60})
    .createData({values:[{panel:"A",x:1,y:1},{panel:"B",x:2,y:2}]})
    .createScatterPlot({x:"x",y:"y",guides:false});
  const p = source.facet({field:"panel",columns:2}).createTitle({...options});
  assert.deepEqual(properties(p,"chartTitle").map(p => p.text),["Alpha","Beta"]);
  assert.deepEqual(properties(p,"chartSubtitle").map(p => p.text),["Source","Credit"]);
  assert.doesNotThrow(() => renderToSVG(p));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
});

test("single-line and nonblank multiline titles keep literal concrete geometry", () => {
  const p = base().createTitle({text:"Alpha",subtitle:"Source",titleStyle:{fontSize:10},subtitleStyle:{fontSize:8},gap:3});
  assert.deepEqual(properties(p,"chartTitle"),[{x:250,y:21,text:"Alpha",fill:"#0f172a",fontSize:10,fontFamily:"sans-serif",fontWeight:600,textAlign:"left",textBaseline:"middle"}]);
  assert.equal(properties(p,"chartSubtitle")[0].y,33);
  const q = p.editTitle({text:"Alpha\nBeta"});
  assert.deepEqual(properties(q,"chartTitle").map(p => [p.text,p.y]),[["Alpha",21],["Beta",33]]);
  assert.doesNotThrow(() => renderToSVG(q));
});
