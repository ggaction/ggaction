export async function load(url, context, nextLoad) {
 const result=await nextLoad(url, context);
 if (url.endsWith('/src/grammar/regression/models.js')) {
  const original=String(result.source);
  const needle='count: rows.length, intercept: model.intercept, slope: model.slope,';
  if(!original.includes(needle)) throw new Error('Mutation anchor not found');
  return {...result,source:original.replace(needle,'count: rows.length, intercept: model.intercept, slope: Math.abs(model.slope) < 1e-250 ? 0 : model.slope,')};
 }
 return result;
}
