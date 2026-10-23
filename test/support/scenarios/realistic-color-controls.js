// Compatible interpolation controls for truthful color-scale witnesses. The same
// explicit choices are used by direct, encoding and complete-chart recipes.
export function realisticColorControls(interpolate, ordinal = 0) {
  if (["lab", "hcl", "hcl-long"].includes(interpolate)) {
    return { whitePoint: ordinal % 2 === 0 ? "d50" : "d65" };
  }
  return ["cubehelix", "cubehelix-long"].includes(interpolate)
    ? { gamma: ordinal % 2 === 0 ? 2.2 : 1.4 } : {};
}

// Keep new color controls visible as direct public facade calls in the existing
// real-data lifecycle recipe. Each temporary consumer is removed through its
// domain lifecycle, leaving its ordinary public trace and original rows intact.
export function appendRealisticColorControls(program) {
  const profiles = [
    {type:"sequential",interpolate:"lab",whitePoint:"d50"},
    {type:"sequential",interpolate:"hcl",whitePoint:"d65"},
    {type:"sequential",interpolate:"cubehelix",gamma:2.2},
    {type:"pow",interpolate:"lab",whitePoint:"d50",exponent:2},
    {type:"sqrt",interpolate:"rgb"}
  ];
  let next = program.createBarPlot({id:"color-control-position-bar",data:"analysisRows",
    coordinate:"color-control-position-bar-coordinate",guides:false,
    x:{field:"category",fieldType:"nominal",scale:{id:"color-control-position-bar-x",type:"band"}},
    y:{field:"positiveY",aggregate:"mean",scale:{id:"color-control-position-bar-y",type:"pow",exponent:2}}})
    .removeMark({target:"color-control-position-bar"});
  for (const [ordinal, profile] of profiles.entries()) {
    const scale = {...profile,range:realisticPaletteRange(ordinal)};
    for (const action of ["createPolarScatterPlot","createStripPlot","createBeeswarmPlot",
      "createIntervalPlot","createRegressionPlot","createTextPlot"]) {
      const id = `color-control-${action}-${ordinal}`;
      const common = {id,data:"analysisRows",coordinate:`${id}-coordinate`,guides:false,
        ...(["createPolarScatterPlot","createStripPlot","createBeeswarmPlot","createRegressionPlot"].includes(action)
          ? {size:{field:"positiveY",scale:{id:`${id}-size`,type:"pow",exponent:2,range:[4,25]}}}:{}),
        color:{field:"positiveY",fieldType:"quantitative",scale:{id:`${id}-color`,...scale}}};
      const x={field:"positiveX",fieldType:"quantitative",scale:{id:`${id}-x`,type:"pow",exponent:2}};
      const y={field:"positiveY",fieldType:"quantitative",scale:{id:`${id}-y`,type:"pow",exponent:2}};
      const positions = action === "createPolarScatterPlot"
        ? {theta:{...x,scale:{id:`${id}-theta`,type:"linear"}},radius:{...y,scale:{...y.scale,id:`${id}-radius`}}}
        : ["createStripPlot","createBeeswarmPlot"].includes(action)
        ? {...(ordinal%2===0
            ? {x,y:{field:"category",fieldType:"nominal",scale:{id:`${id}-category`,type:"point"}}}
            : {y,x:{field:"category",fieldType:"nominal",scale:{id:`${id}-category`,type:"point"}}}),
            ...(action === "createStripPlot" ? {jitter:false} : {packing:false})}
        : action === "createIntervalPlot"
        ? {x,y:{center:"positiveY",lower:"lower",upper:"upper",scale:{id:`${id}-y`,type:"pow",exponent:2}}}
        : {x,y,...(action === "createRegressionPlot"
            ? {method:"exp",band:false} : {text:"label"})};
      next = next[action]({...common,...positions}).removeMark({target:id});
    }
    const id=`color-control-stroke-${ordinal}`;
    next=next.createPointMark({id,data:"analysisRows"})
      .encodeX({target:id,coordinate:`${id}-coordinate`,field:"positiveX",scale:{id:`${id}-x`,type:"linear"}})
      .encodeY({target:id,coordinate:`${id}-coordinate`,field:"positiveY",scale:{id:`${id}-y`,type:"linear"}})
      .encodeStroke({target:id,field:"positiveY",fieldType:"quantitative",scale:{id:`${id}-stroke`,...scale}})
      .editStrokeScale({target:id,...scale})
      .encodeColor({target:id,field:"positiveY",fieldType:"quantitative",scale:{id:`${id}-color`,...scale}})
      .editColorScale({target:id,...scale});
    if (scale.whitePoint) next=next.editStrokeScale({target:id,whitePoint:"auto"});
    if (scale.gamma) next=next.editStrokeScale({target:id,gamma:"auto"});
    next=next.removeMark({target:id});
    const color={field:"category",fieldType:"nominal",scale:{type:"ordinal",range:realisticPaletteRange(ordinal)}};
    for (const action of ["createBoxPlot", "createGradientPlot"]) {
      const owner=`color-control-${action}-${ordinal}`;
      next=next[action]({id:owner,...(action === "createGradientPlot" ? {target:`color-control-createBoxPlot-${ordinal}`} : {}),data:"analysisRows",coordinate:`${owner}-coordinate`,
        x:{field:"category",fieldType:"nominal",scale:{id:`${owner}-x`,type:"band"}},
        y:{field:"positiveY",fieldType:"quantitative",scale:{id:`${owner}-y`,type:"linear"}},
        color:{...color,scale:{...color.scale,id:`${owner}-color`}},guides:false});
      if(action === "createGradientPlot")next=next.removeMark({target:owner}).removeMark({target:`color-control-createBoxPlot-${ordinal}`});
    }
    const ecdf=`color-control-ecdf-${ordinal}`;
    next=next.createECDFPlot({id:ecdf,data:"analysisRows",coordinate:`${ecdf}-coordinate`,
      field:"positiveY",groupBy:"category",color:{...color,scale:{...color.scale,id:`${ecdf}-color`}},guides:false})
      .editECDFPlot({target:ecdf,color:{...color,scale:{...color.scale,id:`${ecdf}-color`}}})
      .removeMark({target:ecdf});
    const raincloud=`color-control-raincloud-${ordinal}`;
    next=next.createRaincloudPlot({id:raincloud,data:"analysisRows",coordinate:`${raincloud}-coordinate`,
      category:"category",value:"positiveY",density:false,summary:false,points:{type:"strip",jitter:false},
      color:{...color,scale:{...color.scale,id:`${raincloud}-color`}},guides:false})
      .editRaincloudPlot({target:raincloud,color:{...color,scale:{...color.scale,id:`${raincloud}-color`}}})
      .removeMark({});
  }
  return next;
}

// The range-object spelling is a real public alternative to scale.palette.
// Continuous palettes keep extent valid for both ordinal and continuous uses.
export function realisticPaletteRange(ordinal = 0) {
  return { palette: { name: ["viridis", "magma", "plasma"][ordinal % 3],
    count: 7, extent: [0.08, 0.92] } };
}
