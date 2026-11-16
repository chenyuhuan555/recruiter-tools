import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const metricsFile="/workspace/scratch/b732763e17e6/inputs/gold_eval/baseline_100_metrics.json";
const rawFile="/workspace/scratch/b732763e17e6/inputs/gold_eval/baseline_100_raw_results.json";
const outputDir="/workspace/scratch/b732763e17e6/outputs/recruitment_agent_baseline";
const outputFile=`${outputDir}/招聘Agent_首版评测基线_2026-11-16.xlsx`;
const previewDir=`${outputDir}/previews`;
const {summary,rows}=JSON.parse(await fs.readFile(metricsFile,"utf8"));
const raw=JSON.parse(await fs.readFile(rawFile,"utf8"));

const usdCny=6.6718;
const inputPrice=0.30;
const outputPrice=1.20;
const totalUsd=(summary.totalPromptTokens/1e6)*inputPrice+(summary.totalCompletionTokens/1e6)*outputPrice;
const totalCny=totalUsd*usdCny;
const costPerRunCny=Number((totalCny/summary.total).toFixed(6));
const pct=x=>x;

const rawById=new Map(raw.results.map(x=>[x.sample.sampleId,x]));
const wb=Workbook.create();
const overview=wb.worksheets.add("基线总览");
const scenes=wb.worksheets.add("分场景表现");
const details=wb.worksheets.add("样本明细");
const method=wb.worksheets.add("评测口径");
for(const s of [overview,scenes,details,method]){s.showGridLines=false;}

const colors={
  green:"#155E4B", green2:"#DCEFE8", mint:"#EEF7F3", dark:"#15231E",
  red:"#B42318", redFill:"#FDECEA", amber:"#9A6700", amberFill:"#FFF4CE",
  gray:"#66756F", light:"#F4F6F5", border:"#D7DEDA", white:"#FFFFFF", blue:"#2458A6", blueFill:"#EAF2FF"
};
const font="Arial";
function base(range,size=10){range.format.font={name:font,size,color:colors.dark};range.format.verticalAlignment="center";}
function title(sheet,text,subtitle){
  sheet.getRange("A2").values=[[text]];
  base(sheet.getRange("A2"),16); sheet.getRange("A2").format.font.bold=true;
  sheet.getRange("A3").values=[[subtitle]];
  base(sheet.getRange("A3"),10); sheet.getRange("A3").format.font={name:font,size:10,color:colors.gray,italic:true};
}
function section(range){
  range.format.fill=colors.green2; range.format.font={name:font,size:11,bold:true,color:colors.green};
  range.format.borders={bottom:{style:"thin",color:colors.green}};
}
function header(range){
  range.format.fill=colors.green; range.format.font={name:font,size:10,bold:true,color:colors.white};
  range.format.horizontalAlignment="center"; range.format.verticalAlignment="center";
}
function status(result,target,kind){
  if(kind==="max") return result<=target?"达标":"未达标";
  if(kind==="info") return "基线";
  return result>=target?"达标":"未达标";
}

title(overview,"招聘 Agent 首版评测基线","100 条均衡分层合成样本｜DeepSeek Flash｜网站 Agent v11｜2026-11-16");
overview.getRange("A5:G5").merge();
overview.getRange("A5").values=[["核心结论"]];
section(overview.getRange("A5:G5"));
overview.getRange("A6:G8").values=[
  ["总体准确率看似达到 83%，但 17 条金标通过样本全部漏判，正样本召回率为 0%。",null,null,null,null,null,null],
  ["系统主要问题是过度保守：最高分 86，实际人工接管率 78%，比金标 38% 高 40 个百分点。",null,null,null,null,null,null],
  ["优势是确定性护栏稳定：100 次请求均成功，证据逐字审计通过率和 JSON 通过率均为 100%。",null,null,null,null,null,null]
];
for(const row of ["A6:G6","A7:G7","A8:G8"]){overview.getRange(row).merge();base(overview.getRange(row),11);overview.getRange(row).format.wrapText=true;}
overview.getRange("A6:G6").format.fill=colors.redFill;
overview.getRange("A7:G7").format.fill=colors.amberFill;
overview.getRange("A8:G8").format.fill=colors.mint;

overview.getRange("A10:G10").merge(); overview.getRange("A10").values=[["版本指标"]];
section(overview.getRange("A10:G10"));
const metricRows=[
  ["deepseek-flash｜site-v11","通过判断准确率",pct(summary.passAccuracy),0.90,status(summary.passAccuracy,0.90,"min"),"83/100","受负样本占比影响，不能单独判断效果"],
  ["deepseek-flash｜site-v11","正样本召回率",0,0.90,"未达标","0/17","17条应通过样本全部漏判"],
  ["deepseek-flash｜site-v11","硬性条件判断准确率",pct(summary.hardAccuracy),0.95,status(summary.hardAccuracy,0.95,"min"),"70/100","待核实判断明显过多"],
  ["deepseek-flash｜site-v11","平均评分绝对误差",summary.scoreMAE,5,status(summary.scoreMAE,5,"max"),"—","评分整体偏低且呈离散档位"],
  ["deepseek-flash｜site-v11","证据引用准确率",pct(summary.evidenceAccuracy),0.90,status(summary.evidenceAccuracy,0.90,"min"),"100/100","连续原文逐字核验稳定"],
  ["deepseek-flash｜site-v11","可观测幻觉率",pct(summary.hallucinationRate),0.01,status(summary.hallucinationRate,0.01,"max"),"0/100","自动证据审计口径，仍需人工语义复核"],
  ["deepseek-flash｜site-v11","人工接管率",pct(summary.handoffRate),0.38,"偏高","78/100","金标接管率为38%"],
  ["deepseek-flash｜site-v11","人工接管判断准确率",pct(summary.handoffAccuracy),0.90,status(summary.handoffAccuracy,0.90,"min"),"56/100","42条清晰样本被过度接管"],
  ["deepseek-flash｜site-v11","JSON结构通过率",pct(summary.jsonSuccessRate),0.99,status(summary.jsonSuccessRate,0.99,"min"),"100/100","接口与结构稳定"],
  ["deepseek-flash｜site-v11","平均时延（ms）",summary.avgLatencyMs,null,"基线","—","约2.50秒"],
  ["deepseek-flash｜site-v11","P95时延（ms）",summary.p95LatencyMs,null,"基线","—","95%请求在2.854秒内完成"],
  ["deepseek-flash｜site-v11","平均单次成本（元）",costPerRunCny,null,"估算","—","峰时、输入缓存未命中上限估算"]
];
overview.getRange("A11:G11").values=[["版本","指标","结果","目标/参考","状态","样本口径","解释"]];
header(overview.getRange("A11:G11"));
overview.getRange(`A12:G${11+metricRows.length}`).values=metricRows;
base(overview.getRange(`A12:G${11+metricRows.length}`),10);
overview.getRange(`C12:D${11+metricRows.length}`).format.horizontalAlignment="right";
for(let i=0;i<metricRows.length;i++){
  const row=12+i, metric=metricRows[i][1];
  if(metric.includes("率")||metric.includes("准确")) {
    overview.getRange(`C${row}:D${row}`).format.numberFormat=[["0.0%","0.0%"]];
  } else if(metric.includes("误差")) overview.getRange(`C${row}:D${row}`).format.numberFormat=[["0.00","0.00"]];
  else if(metric.includes("成本")) overview.getRange(`C${row}`).format.numberFormat=[["¥0.0000"]];
  else overview.getRange(`C${row}:D${row}`).format.numberFormat=[["0","0"]];
}
overview.getRange(`E12:E${11+metricRows.length}`).conditionalFormats.add("containsText",{text:"未达标",format:{fill:colors.redFill,font:{color:colors.red,bold:true}}});
overview.getRange(`E12:E${11+metricRows.length}`).conditionalFormats.add("containsText",{text:"达标",format:{fill:colors.green2,font:{color:colors.green,bold:true}}});
overview.getRange(`E12:E${11+metricRows.length}`).conditionalFormats.add("containsText",{text:"偏高",format:{fill:colors.amberFill,font:{color:colors.amber,bold:true}}});

const failureStart=26;
overview.getRange(`A${failureStart}:G${failureStart}`).merge();overview.getRange(`A${failureStart}`).values=[["失败类型与改进动作"]];
section(overview.getRange(`A${failureStart}:G${failureStart}`));
overview.getRange(`A${failureStart+1}:G${failureStart+1}`).values=[["优先级","失败类型","影响样本/信号","根因判断","改进动作","验收指标","状态"]];
header(overview.getRange(`A${failureStart+1}:G${failureStart+1}`));
const failures=[
  ["P0","正样本全部漏判","17/17","评分锚点过低；硬性状态过度使用“待核实”","增加正样本评分锚点；逐项硬性条件输出证据；满足时禁止无依据降为待核实","正样本召回率≥80%","待处理"],
  ["P0","评分严重偏低","MAE 29.46；最高分86","评分档位离散，模型未贴合金标标尺","固定五维权重和分数区间；增加90分上下边界示例；输出分项和必须等于总分","MAE≤5","待处理"],
  ["P0","硬性条件误判","30/100","把加分项或信息完整度混入硬性判断","先逐项判断硬性要求，再汇总满足/不满足/待核实；加分项不得影响硬性状态","硬性准确率≥95%","待处理"],
  ["P1","过度人工接管","42条误接管；总接管78%","任一信息不完整即转人工，触发条件过宽","接管仅限关键硬性字段缺失、矛盾、注入、乱码和阈值证据不足","接管判断准确率≥90%","待处理"],
  ["P1","金标输入契约不兼容","原150条均短于200字","v1.0是摘要，不符合网站“完整简历”门槛","保留v1.0；新建完整合成简历v1.1并记录生成规则，重新校验金标证据","100%样本满足输入契约","已识别"],
  ["P1","金标一致性风险","明显匹配样本仍缺部分项目类型直证","部分金标结论比输入证据更乐观","双人复核明显匹配和临界分；修订时记录gold_version与理由","金标分歧率<5%","待复核"],
  ["P2","优势：证据与结构护栏稳定","证据/JSON均100%","服务端逐字核验和JSON归一化有效","保持现有护栏；新增语义事实人工抽检，避免只验证引用存在","人工抽检幻觉率≤1%","保持"]
];
overview.getRange(`A${failureStart+2}:G${failureStart+1+failures.length}`).values=failures;
base(overview.getRange(`A${failureStart+2}:G${failureStart+1+failures.length}`),10);
overview.getRange(`A${failureStart+2}:A${failureStart+1+failures.length}`).format.font.bold=true;
overview.getRange(`A${failureStart+2}:G${failureStart+1+failures.length}`).format.wrapText=true;
overview.getRange(`A${failureStart+2}:A${failureStart+1+failures.length}`).conditionalFormats.add("containsText",{text:"P0",format:{fill:colors.redFill,font:{color:colors.red,bold:true}}});
overview.getRange(`A${failureStart+2}:A${failureStart+1+failures.length}`).conditionalFormats.add("containsText",{text:"P1",format:{fill:colors.amberFill,font:{color:colors.amber,bold:true}}});

title(scenes,"分场景表现","均衡分层：17/17/17/17/16/16，共100条");
scenes.getRange("A5:H5").values=[["场景","样本数","通过判断准确率","硬性准确率","评分MAE","Agent接管率","接管判断准确率","主要结论"]];
header(scenes.getRange("A5:H5"));
const sceneOrder=["明显匹配","明显不匹配","临界分","信息缺失","硬性冲突","异常输入"];
const sceneRows=sceneOrder.map(scene=>{
  const s=summary.sceneSummary[scene];
  const conclusion={
    "明显匹配":"0/17通过，正样本召回失败",
    "明显不匹配":"拒绝判断稳定，但评分偏低",
    "临界分":"硬性状态与接管判断不稳定",
    "信息缺失":"接管识别正确，评分明显低于金标",
    "硬性冲突":"结论正确，1条硬性状态误判",
    "异常输入":"接管与结论稳定"
  }[scene];
  return [scene,s.n,s.passAccuracy,s.hardAccuracy,s.mae,s.handoffRate,s.handoffAccuracy,conclusion];
});
scenes.getRange("A6:H11").values=sceneRows;base(scenes.getRange("A6:H11"),10);
scenes.getRange("C6:D11").format.numberFormat=[["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"]];
scenes.getRange("F6:G11").format.numberFormat=[["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"],["0.0%","0.0%"]];
scenes.getRange("E6:E11").format.numberFormat=[["0.00"],["0.00"],["0.00"],["0.00"],["0.00"],["0.00"]];
scenes.getRange("C6:G11").conditionalFormats.add("colorScale",{colors:[colors.redFill,colors.amberFill,colors.green2],thresholds:["min",{type:"percentile",value:50},"max"]});

title(details,"100条样本运行明细","所有样本均为合成数据；原始v1.0未被覆盖");
const detailHeaders=["样本ID","场景","金标分数","Agent分数","绝对误差","金标结论","Agent结论","结论正确","金标硬性","Agent硬性","硬性正确","金标接管","Agent接管","接管正确","证据审计","幻觉标记","时延ms","输入tokens","输出tokens","单次成本元","错误类型","Agent状态","主要风险"];
details.getRange("A5:W5").values=[detailHeaders];header(details.getRange("A5:W5"));
const detailRows=rows.map(x=>{
  const rr=rawById.get(x.id); const c=rr.body?.candidate||{};
  const errors=[];
  if(!x.passCorrect) errors.push("正样本漏判");
  if(!x.hardCorrect) errors.push("硬性条件误判");
  if(!x.handoffCorrect) errors.push(x.agentHandoff&&!x.goldHandoff?"过度接管":"未触发接管");
  if(x.scoreError>5) errors.push("评分偏差");
  if(x.hallucination) errors.push("无依据事实");
  const cost=Number(((((x.promptTokens/1e6)*inputPrice+(x.completionTokens/1e6)*outputPrice)*usdCny)).toFixed(6));
  return [x.id,x.scene,x.goldScore,x.agentScore,x.scoreError,x.goldPass?"进入最终JSON":"不进入最终JSON",x.agentPass?"进入最终JSON":"不进入最终JSON",x.passCorrect?"是":"否",x.goldHard,x.agentHard,x.hardCorrect?"是":"否",x.goldHandoff?"是":"否",x.agentHandoff?"是":"否",x.handoffCorrect?"是":"否",x.audit,x.hallucination?"是":"否",x.latencyMs,x.promptTokens,x.completionTokens,cost,errors.join("；")||"无",x.status,(c.risks||[]).join("；")];
});
details.getRange(`A6:W${5+detailRows.length}`).values=detailRows;base(details.getRange(`A6:W${5+detailRows.length}`),9);
details.getRange(`C6:E${5+detailRows.length}`).format.numberFormat=[...Array(detailRows.length)].map(()=>["0","0","0"]);
details.getRange(`Q6:S${5+detailRows.length}`).format.numberFormat=[...Array(detailRows.length)].map(()=>["0","0","0"]);
details.getRange(`T6:T${5+detailRows.length}`).format.numberFormat=[...Array(detailRows.length)].map(()=>["¥0.0000"]);
details.getRange(`H6:H${5+detailRows.length}`).conditionalFormats.add("containsText",{text:"否",format:{fill:colors.redFill,font:{color:colors.red,bold:true}}});
details.getRange(`K6:K${5+detailRows.length}`).conditionalFormats.add("containsText",{text:"否",format:{fill:colors.redFill,font:{color:colors.red,bold:true}}});
details.getRange(`N6:N${5+detailRows.length}`).conditionalFormats.add("containsText",{text:"否",format:{fill:colors.amberFill,font:{color:colors.amber,bold:true}}});
details.getRange(`P6:P${5+detailRows.length}`).conditionalFormats.add("containsText",{text:"是",format:{fill:colors.redFill,font:{color:colors.red,bold:true}}});
details.getRange(`U6:U${5+detailRows.length}`).format.wrapText=true;
details.getRange(`W6:W${5+detailRows.length}`).format.wrapText=true;
const detailTable=details.tables.add(`A5:W${5+detailRows.length}`,true,"BaselineDetails");
detailTable.showFilterButton=true;detailTable.showBandedRows=true;

title(method,"评测口径与限制","本页用于解释指标，不作为候选人或招聘决策依据");
const methodRows=[
  ["项目","说明"],
  ["原始数据","招聘Agent_150条脱敏金标评测集_v1.0.xlsx；150条均为合成样本。"],
  ["抽样","按场景均衡分层抽取100条：明显匹配17、明显不匹配17、临界分17、信息缺失17、硬性冲突16、异常输入16。"],
  ["输入规范化","原始150条简历摘要长度均为63–134字，全部低于网站200字完整性门槛。运行副本仅追加统一的脱敏与缺失信息说明，不添加新经历或改变金标；原v1.0保持不变。"],
  ["Agent版本","deepseek-flash｜招聘评估网站v11｜thinking disabled｜temperature 0.1。"],
  ["通过判断","Agent score≥90、hard=满足、证据审计通过、简历长度达标时进入最终JSON。"],
  ["准确率","(判断正确样本数/100)。由于金标通过仅17条，同时报告正样本召回率，避免类别不平衡误导。"],
  ["幻觉率","本版按服务端可观测护栏统计：证据引用不在resumeText中，或模型输出的当前公司/职位无法被原文支持。0%不等于完成独立人工语义审计。"],
  ["人工接管","Agent出现insufficient、hard=待核实、证据审计失败或请求失败即视为接管。"],
  ["时延","使用服务端返回的模型调用时延；P95采用最近秩法。"],
  ["成本","按DeepSeek Flash峰时、输入缓存未命中价格估算：输入$0.30/百万tokens、输出$1.20/百万tokens；本次未调用搜索/Fetch。"],
  ["汇率","按2026-11-16 USD/CNY 6.6718换算，仅用于作品集成本估算。"],
  ["总用量",`输入 ${summary.totalPromptTokens.toLocaleString()} tokens；输出 ${summary.totalCompletionTokens.toLocaleString()} tokens；总成本约 $${totalUsd.toFixed(4)} / ¥${totalCny.toFixed(4)}。`],
  ["适用性","这是诊断基线，不是上线验收结果。下一版应先完成完整合成简历与金标一致性复核，再比较Prompt或规则改动。"],
  ["DeepSeek定价来源","https://api-docs.deepseek.com/quick_start/pricing/"],
  ["汇率来源","https://www.google.com/finance/beta/quote/USD-CNY?hl=en"]
];
method.getRange(`A5:B${4+methodRows.length}`).values=methodRows;
header(method.getRange("A5:B5"));base(method.getRange(`A6:B${4+methodRows.length}`),10);
method.getRange(`B6:B${4+methodRows.length}`).format.wrapText=true;

overview.freezePanes.freezeRows(11);
scenes.freezePanes.freezeRows(5);
details.freezePanes.freezeRows(5);details.freezePanes.freezeColumns(2);
method.freezePanes.freezeRows(5);

for(const s of [overview,scenes,details,method]){
  const used=s.getUsedRange();
  used.format.font.name=font;
  used.format.verticalAlignment="center";
}
overview.getRange("A:G").format.columnWidth=16;
overview.getRange("A:A").format.columnWidth=22;
overview.getRange("B:B").format.columnWidth=24;
overview.getRange("F:F").format.columnWidth=17;
overview.getRange("G:G").format.columnWidth=38;
overview.getRange(`A${failureStart+2}:G${failureStart+1+failures.length}`).format.rowHeight=56;
scenes.getRange("A:A").format.columnWidth=16;scenes.getRange("B:G").format.columnWidth=15;scenes.getRange("H:H").format.columnWidth=36;
details.getRange("A:A").format.columnWidth=12;details.getRange("B:B").format.columnWidth=14;
details.getRange("C:T").format.columnWidth=12;details.getRange("U:U").format.columnWidth=32;details.getRange("V:V").format.columnWidth=14;details.getRange("W:W").format.columnWidth=42;
details.getRange(`A6:W${5+detailRows.length}`).format.rowHeight=32;
method.getRange("A:A").format.columnWidth=18;method.getRange("B:B").format.columnWidth=92;
method.getRange(`A6:B${4+methodRows.length}`).format.rowHeight=42;

wb.recalculate();
await fs.mkdir(previewDir,{recursive:true});
const checks=[];
for(const [sheetName,range] of [["基线总览","A1:G34"],["分场景表现","A1:H12"],["样本明细","A1:W18"],["评测口径",`A1:B${4+methodRows.length}`]]){
  const inspect=await wb.inspect({kind:"table",range:`${sheetName}!${range}`,include:"values,formulas",tableMaxRows:40,tableMaxCols:24,maxChars:12000});
  checks.push({sheetName,inspect:inspect.ndjson.slice(0,12000)});
  const preview=await wb.render({sheetName,range,scale:1.2,format:"png"});
  await fs.writeFile(`${previewDir}/${sheetName}.png`,new Uint8Array(await preview.arrayBuffer()));
}
const errors=await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",options:{useRegex:true,maxResults:300},summary:"final formula error scan"});
await fs.writeFile(`${outputDir}/validation.json`,JSON.stringify({checks,errorScan:errors.ndjson},null,2));
await fs.mkdir(outputDir,{recursive:true});
const out=await SpreadsheetFile.exportXlsx(wb);
await out.save(outputFile);
console.log(JSON.stringify({outputFile,previewDir,totalUsd,totalCny,costPerRunCny,errorScan:errors.ndjson},null,2));
