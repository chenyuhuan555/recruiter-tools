let records = [], live = false;
const el = id => document.getElementById(id);
const node = (tag, text) => { const n=document.createElement(tag); n.textContent=text; return n; };
const status = text => el('status').textContent=text;
function show(record) {
  const article=node('article','');
  article.append(node('strong',record.query || '查询记录'));
  article.append(node('p',`状态 ${record.status ?? '未知'} · 费用 ${record.cost_usd == null ? '未返回' : '$'+record.cost_usd} · ${record.elapsed_ms == null ? '耗时未单独计量' : (record.elapsed_ms/1000).toFixed(2)+'秒'} · ${record.call_id || '无调用编号'}`));
  const body=record.body || {}, rows=body.output?.results || body.results || [];
  const provider=body._treg?.served_by;
  if(provider) article.append(node('small',`实际服务商：${provider}；返回${rows.length}条，页面最多展示10条。`));
  for(const row of rows.slice(0,10)) {
    const card=node('article','');
    try { const url=new URL(row.url); if(!['http:','https:'].includes(url.protocol)) continue;
      const link=node('a',row.title || url.hostname); link.href=url.href; link.target='_blank'; link.rel='noopener noreferrer'; card.append(link);
    } catch { continue; }
    card.append(node('p',row.snippet || row.description || '未返回摘要'));
    card.append(node('small','搜索摘要 · 不等于原文核实')); SourceReview.attach(card,row,record); article.append(card);
  }
  if(!rows.length) article.append(node('p','本次没有可展示的搜索结果，请核查状态和数据结构。'));
  el('results').append(article);
  SourceReview.refresh();
}
function plan(event) {
  event?.preventDefault();
  const role=el('role').value.trim(), sector=el('sector').value.trim(), city=el('city').value.trim();
  const skills=el('skills').value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean).slice(0,5);
  el('directions').replaceChildren();
  const groups=[['同业务公司',`${sector} 公司 官网`, '验证产品是否服务相同业务，目标公司员工是否具备相关经验仍待核实。'],
    ['相邻岗位',`${city} ${role} ${skills.slice(0,2).join(' ')} 招聘`, '比较岗位职责；职称和关键词相似不代表经验相同。'],
    ['公开职业线索',`site:linkedin.com/in/ ${city} ${role} ${sector}`, '只用于发现可核实的公开职业主页，行业经历和当前任职待确认。']];
  for(const [title,query,note] of groups){const section=node('article','');section.append(node('strong',title+' · 寻访假设'),node('p',note),node('pre',query));const button=node('button',live?'实时查公开来源':'实时查询需配置服务端凭证');button.disabled=!live;button.onclick=async()=>{button.disabled=true;status('正在检索，可能需要约一分钟…');try{const r=await fetch('/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})});const d=await r.json();if(!r.ok)throw Error(d.error);records.push(d);show(d);SourceReview.remember(records);status('本次结果已保留，可导出核查。');}catch(e){status(e.message);}finally{button.disabled=!live;}};section.append(button);el('directions').append(section);}
  status('已生成3个寻访方向。它们是待验证的假设。');
}
el('form').onsubmit=plan;
el('replay').onclick=async()=>{try{const r=await fetch('/data');if(!r.ok)throw Error('读取失败');const d=await r.json();el('results').replaceChildren();records=d.searches;records.forEach(show);SourceReview.remember(records);status('显示2026-10-28实测：HR SaaS行业、AI岗位和中性原子行业，共3条查询。与当前输入独立；我的核实按原始查询与链接保存。');}catch(e){status(e.message);}};
el('export').onclick=()=>{const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),inputs:Object.fromEntries(['role','sector','city','skills'].map(k=>[k,el(k).value])),records,reviews:SourceReview.exportReviews()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=node('a','');a.href=url;a.download='sourcing-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
records=SourceReview.restoredRecords();
if(records.length){el('results').replaceChildren();records.forEach(show);}
fetch('/config').then(r=>r.json()).then(d=>{live=d.live;plan();}).catch(()=>status('本地服务未连接，请运行 python server.py。'));

const scenes = [
  {title:'公司地图与岗位启动', level:'tested', proof:'网页搜索、正文提取已实测；公司补全未实测', priority:'优先打磨',
    intro:'理解陌生行业，找到值得与客户讨论的人才来源公司。', input:'业务方向、职责、技能、地点、排除公司。',
    output:'直接同类业务、相邻业务和待了解公司；每家公司附来源与原文依据，分组由人确认。',
    tools:'treg.web.search · treg.web.extract · treg.companies.enrich',
    cost:'首次搜索及成功提取各 $0.00015；公司补全目录范围 $0.000495–$0.2496。实际费用随服务商变化。',
    limit:'相邻技术路线可能混入；链接可能失效。公司业务相似不能直接证明员工符合岗位。',
    next:'5个脱敏JD，各找3家经人工认可的公司，记录核实时间和排除原因。'},
  {title:'招聘动态与客户开发', level:'catalog', proof:'仅目录核查 · 未接入原型', priority:'第二批验证',
    intro:'从已有公司清单观察招聘、融资或业务变化，形成值得进一步了解的业务线索。', input:'明确的公司名称或域名，以及两次采样时间。',
    output:'岗位/新闻、日期、来源、变化与待核实的跟进理由。', tools:'treg.companies.jobs.search · treg.companies.news · findymail.signals',
    cost:'岗位路由目录 $0.009–$0.04；新闻 $0.01–$0.04。按行计费、分页和空结果可能影响总价。',
    limit:'招聘不代表有猎头预算。标价0的Findymail监测需自有账号及已创建任务；首次观察日期不等于发布日期。',
    next:'10家公司做两次采样；保存基线并去重，由业务人员判断哪些变化值得跟进。'},
  {title:'目标公司定向寻访', level:'tested', proof:'LinkedIn人物检索有实测；通用人物搜索待验证', priority:'第二批验证',
    intro:'已确认目标公司后，寻找相关岗位的公开职业线索。', input:'公司域名、岗位、地区与业务关键词。',
    output:'公开主页、平台职称、地点、查询时间和未被证明的条件。', tools:'treg.people.search · harvestapi.linkedin.profile.search',
    cost:'LinkedIn首次实收 $0.002，目录标价 $0.004；通用人物路由目录 $0–$0.30，可能按行收费。',
    limit:'首次10条结果有主页，但未验证HR经历、当前任职和意愿。目录能力存在不代表完整中国招聘简历覆盖。',
    next:'3家已确认公司各查少量条目，分别复核公司、岗位、地区和链接有效率。'},
  {title:'职业信息补全与冲突核对', level:'catalog', proof:'仅目录核查 · 未接入原型', priority:'第三批验证',
    intro:'把已有线索整理成可核对的职业信息卡。', input:'已知LinkedIn主页、邮箱，或姓名加公司域名。',
    output:'原有信息、外部返回、来源、时间和冲突项；缺失字段保留未知。', tools:'treg.people.enrich',
    cost:'路由目录 $0.000495–$0.28；不同服务商要求不同身份标识。',
    limit:'统一接口未保证完整工作履历。同名不自动合并，旧职位不自动视为现任，外部结果不覆盖原始简历。',
    next:'用少量允许研究的职业线索逐字段复核，重点检查身份和任职时效。'},
  {title:'工作邮箱查找与核验', level:'catalog', proof:'仅目录核查 · 未接入原型', priority:'第三批验证',
    intro:'对已确认身份、准备人工联系的对象，整理可复核的联系入口。', input:'姓名与公司域名、公开职业主页，或已有工作邮箱。',
    output:'来源、获取时间、核验状态，以及catch-all或unknown等不确定结果。', tools:'treg.people.email.find · treg.people.email.verify',
    cost:'查找路由目录 $0.000495–$0.15；核验 $0–$0.024。查找与核验需分别计费。',
    limit:'邮箱可投递不证明属于该人，也不证明愿意接收联系；已有邮箱可直接核验，无需重复查找。',
    next:'先核对服务商状态含义和少量已有邮箱的结果一致性，不用自动发信验证。'},
  {title:'论文与GitHub技术人才研究', level:'catalog', proof:'仅目录核查 · 未接入原型', priority:'专业岗位支线',
    intro:'围绕量子计算、生物医药等岗位，从公开成果理解具体研究方向。', input:'专业主题；查GitHub仓库还需要已知用户名或用户URL。',
    output:'主题、论文/项目、机构与待确认作者线索，人工连接到岗位职责。', tools:'valyu.research.papers.search · scrapecreators.x.v1-github-user-repositories',
    cost:'GitHub目录 $0.00188/调用；论文搜索headline为 $0.05，cost表随请求条数与来源结算。',
    limit:'论文数据源与共享凭证参数受限；仓库接口只查已知用户。署名、星标和提交数量不能直接证明胜任力。',
    next:'1个专业JD找5篇相关论文或项目，人工核对职责相关度和作者身份。'},
  {title:'客户沟通与寻访策略报告', level:'catalog', proof:'产品方案 · 报告生成尚未实现', priority:'优先打磨',
    intro:'向客户说明为什么从这些公司、岗位和技能方向寻找。', input:'客户确认的岗位要求、已核实公司信息和待确认问题。',
    output:'一页寻访策略：公司分组、可迁移经验、原始来源和客户需确认的问题。', tools:'复用网页证据；由产品整理、引用与导出',
    cost:'可复用已有查询；若增加模型总结，另计推理与产品托管费用。',
    limit:'treg提供数据；报告结构、判断和生成由应用承担。业务推断需标为假设。',
    next:'与公司地图一起验证：每条关键判断能回到来源，并由客户或行业研究者确认。'}
];
function renderScenes(filter='all') {
  el('scenes').replaceChildren();
  const selected=scenes.filter(scene=>filter==='all'||scene.level===filter);
  el('scene-count').textContent=`显示 ${selected.length} 个场景 · 有实测依据不代表整条业务流程已验证`;
  for(const scene of selected){
    const detail=node('details',''); detail.className='scene';
    const summary=node('summary',scene.title); detail.append(summary);
    const meta=node('span','');meta.className='scene-meta';meta.append(node('span',scene.priority),node('span',scene.level==='tested'?'有局部实测依据':'待验证机会'));summary.append(meta);detail.append(node('p',scene.intro));
    const dl=node('dl','');
    for(const [label,value] of [['验证程度',scene.proof],['需要输入',scene.input],['可以产出',scene.output],['对应能力',scene.tools],['成本口径',scene.cost],['主要限制',scene.limit],['下一步怎么验证',scene.next]]){dl.append(node('dt',label),node('dd',value));}
    detail.append(dl); el('scenes').append(detail);
  }
}
document.querySelectorAll('[data-scene-filter]').forEach(button=>button.onclick=()=>{
  document.querySelectorAll('[data-scene-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  renderScenes(button.dataset.sceneFilter);
});
renderScenes();

fetch('./review-study.json').then(response=>{if(!response.ok)throw Error('核查示例读取失败');return response.json();}).then(study=>{
  const area=el('review-study');area.replaceChildren(node('p',study.job),node('p',study.method));
  for(const item of study.cases){
    const card=node('article','');const link=node('a',item.company);link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
    card.append(link,node('p',`${item.state} · ${item.group} · ${item.access}`));
    if(item.quote)card.append(node('blockquote',item.quote));card.append(node('p',item.reason));area.append(card);
  }
  area.append(node('p',study.note));
}).catch(error=>el('review-study').textContent=error.message);

