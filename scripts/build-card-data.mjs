import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const tsv=fs.readFileSync(path.resolve(root,"../NK DB extracted.tsv"),"utf8");
const csv=fs.readFileSync(path.resolve(root,"../Nubian Kings Reconciliation.csv"),"utf8");
const cardTypes=JSON.parse(fs.readFileSync(path.resolve(root,"scripts/card-types.json"),"utf8"));
function parseCsv(text){const rows=[];let row=[],cell="",quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c}else if(c==='"')quote=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=""}else if(c!=='\r')cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}const head=rows.shift();return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??""])))}
const rec=parseCsv(csv);
const assetsByRow=new Map();
for(const r of rec){if(!r["Spreadsheet ID"]||!r["JPEG Filename"])continue;const a={assetId:r["Asset ID"],filename:r["JPEG Filename"],copyCount:Number(r["Copy Count"]||1),status:r.Status};const list=assetsByRow.get(r["Spreadsheet ID"])??[];list.push(a);assetsByRow.set(r["Spreadsheet ID"],list)}
const ethiopianJewishJpegStatsByRow=new Map();
for(const r of rec){
  if(r["Printed Religion"]!=="J"||r["Printed Nation"]!=="Et"||!r["Spreadsheet ID"])continue;
  const stats={strength:Number(r["Printed Strength"]),zeal:Number(r["Printed Zeal"]),wealth:Number(r["Printed Wealth"])};
  if(!Object.values(stats).every(Number.isFinite))continue;
  const prior=ethiopianJewishJpegStatsByRow.get(r["Spreadsheet ID"]);
  if(prior&&Object.keys(stats).some(key=>prior[key]!==stats[key]))throw new Error(`Conflicting Ethiopian Jewish JPEG statistics for ${r["Spreadsheet ID"]}`);
  ethiopianJewishJpegStatsByRow.set(r["Spreadsheet ID"],stats);
}
const factionFor=(religion,nation)=>({"Ch:N":"nubian-christians","Ch:Eg":"egyptian-christians","Ch:Et":"ethiopian-christians","M:Eg":"egyptian-muslims","J:Et":"ethiopian-jews"}[`${religion}:${nation}`]);
const rows=tsv.split(/\r?\n/).map(x=>x.trimEnd()).filter(x=>x.startsWith("\t"));
const cards=rows.map((line,index)=>{const [,name,s,z,w,religion,rawNation]=line.split("\t");const nation=rawNation==="E"?"Et":rawNation;const spreadsheetRow=index+2;const id=`NK-ROW-${String(spreadsheetRow).padStart(3,"0")}`;const assets=assetsByRow.get(id)??[];const reconciledCopies=assets.reduce((n,a)=>n+a.copyCount,0);const availableInPrototype=assets.length>0;const jpegStats=ethiopianJewishJpegStatsByRow.get(id);return{id,name,strength:jpegStats?.strength??Number(s),zeal:jpegStats?.zeal??Number(z),wealth:jpegStats?.wealth??Number(w),religion,nation,factionId:factionFor(religion,nation),type:cardTypes[id],assets,deckCopies:availableInPrototype?reconciledCopies:0,availableInPrototype,source:{spreadsheetRow,statisticsAuthority:jpegStats?"JPEG":"spreadsheet"}}});
const invalid=cards.filter(c=>!c.factionId||!["leader","person","place","thing"].includes(c.type)||![c.strength,c.zeal,c.wealth].every(Number.isFinite));
if(invalid.length)throw new Error(`Invalid canonical rows: ${invalid.map(c=>c.id).join(", ")}`);
const output={schemaVersion:1,source:"NK DB.xls + Nubian Kings Reconciliation.csv",statisticsAuthority:"JPEG for Ethiopian Jewish cards; spreadsheet for all other factions",cards};
fs.mkdirSync(path.resolve(root,"src/data"),{recursive:true});
fs.writeFileSync(path.resolve(root,"src/data/cards.json"),JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({cards:cards.length,withAssets:cards.filter(c=>c.assets.length).length,missingAssets:cards.filter(c=>!c.assets.length).map(c=>`${c.id} ${c.name}`),deckCopies:cards.reduce((n,c)=>n+c.deckCopies,0),byFaction:Object.fromEntries(Object.entries(Object.groupBy(cards,c=>c.factionId)).map(([k,v])=>[k,{definitions:v.length,copies:v.reduce((n,c)=>n+c.deckCopies,0)}]))},null,2));
