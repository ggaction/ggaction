import {chart} from 'ggaction';
import {getMarkItems} from 'ggaction/inspection';
const p=chart(),items=getMarkItems(p,{target:'points'}).map(item=>item.key);
p.selectMarks({target:'points',id:'picked',items,empty:'all'});
p.editMarkSelection({selection:'picked',mode:'toggle',items:[]});
p.editMarkSelection({selection:'picked',mode:'add',field:'x',op:'gt',value:0});
p.filterMarks({target:'points',items});
p.highlightMarks({target:'points',select:{items},color:'red'});
p.selectMarks({target:{childPath:['left'],id:'points'},items});
p.editMarkSelection({target:{childPath:['left']},selection:'picked',items,mode:'subtract'});
// @ts-expect-error logical keys and predicates are exclusive
p.selectMarks({items:[],field:'x',op:'eq',value:1});
// @ts-expect-error selection update mode is closed
p.editMarkSelection({items:[],mode:'compose'});
