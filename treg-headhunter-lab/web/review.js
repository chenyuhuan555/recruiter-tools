/* Source decisions belong to one query and URL, never to a company globally. */
const SourceReview = (() => {
  const storageKey = 'sourcing-source-review-v1';
  const states = ['待核实', '已确认', '已排除'];
  const groups = ['暂不确定', '同类业务', '相邻业务'];
  let saved = { records: [], reviews: {} }, storageError = '';
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (value && Array.isArray(value.records) && value.reviews && typeof value.reviews === 'object') saved = value;
  } catch { storageError = '无法读取浏览器记录。请先导出当前工作；未自动删除原有数据。'; }
  const make = (tag, text) => { const element = document.createElement(tag); element.textContent = text; return element; };
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); return true; }
    catch { return false; }
  }
  function refresh() {
    const cards = [...document.querySelectorAll('[data-source-state]')];
    const filter = document.getElementById('source-filter').value;
    cards.forEach(card => { card.hidden = filter !== '全部' && card.dataset.sourceState !== filter; });
    document.querySelectorAll('#results > article').forEach(section => {
      const sourceCards = [...section.querySelectorAll('[data-source-state]')];
      section.hidden = sourceCards.length > 0 && !sourceCards.some(card => !card.hidden);
    });
    document.getElementById('review-count').textContent = `共 ${cards.length} 条 · ` + states.map(state => `${state} ${cards.filter(card => card.dataset.sourceState === state).length}`).join(' · ');
  }
  function attach(card, row, record) {
    const key = JSON.stringify([record.query || '', row.url]);
    const previous = saved.reviews[key] || {};
    const badge = make('p', `我的核实：${previous.state || '待核实'} · ${previous.group || '暂不确定'}`);
    badge.className = 'review-badge';
    card.dataset.sourceState = states.includes(previous.state) ? previous.state : '待核实';
    const details = make('details', '');
    details.className = 'source-review';
    details.append(make('summary', '记录核实依据'));
    const form = make('form', '');
    const fields = {};
    for (const [name, label, options, placeholder] of [
      ['state', '核实状态', states, ''], ['group', '公司业务分类', groups, ''],
      ['quote', '原文依据', null, '从已打开的来源页摘录，保留原意'],
      ['reason', '判断理由', null, '说明为什么确认、排除或仍需核实']
    ]) {
      const wrapper = make('label', label);
      const input = make(options ? 'select' : 'textarea', '');
      input.setAttribute('aria-label', label);
      if (options) options.forEach(value => { const option = make('option', value); option.value = value; input.append(option); });
      else { input.rows = 2; input.maxLength = 2000; input.placeholder = placeholder; }
      input.value = previous[name] || (options ? options[0] : '');
      fields[name] = input; wrapper.append(input); form.append(wrapper);
    }
    const feedback = make('p', previous.updated_at ? `上次保存：${new Date(previous.updated_at).toLocaleString()}` : '尚未保存核实判断');
    feedback.setAttribute('role', 'status');
    const button = make('button', '保存核实记录'); button.type = 'submit';
    form.append(button, feedback);
    form.onsubmit = event => {
      event.preventDefault();
      const state = fields.state.value, quote = fields.quote.value.trim(), reason = fields.reason.value.trim();
      if (state === '已确认' && (!quote || !reason)) { feedback.textContent = '确认前请填写原文依据和判断理由。'; return; }
      if (state === '已排除' && !reason) { feedback.textContent = '排除前请填写判断理由。'; return; }
      const review = { query: record.query || '', url: row.url, title: row.title || '', state,
        group: fields.group.value, quote, reason, updated_at: new Date().toISOString() };
      saved.reviews[key] = review;
      const stored = persist();
      badge.textContent = `我的核实：${review.state} · ${review.group}`;
      card.dataset.sourceState = review.state;
      feedback.textContent = stored ? '已保存在当前浏览器，可随研究记录导出。' : '浏览器保存失败，目前仅保留在本页；请立即导出记录。';
      refresh();
    };
    details.append(form); card.append(badge, details);
  }
  document.getElementById('source-filter').onchange = refresh;
  if (storageError) document.getElementById('review-count').textContent = storageError;
  return {
    attach, refresh,
    restoredRecords: () => saved.records,
    remember(records) { saved.records = records; const ok = persist(); if (!ok) document.getElementById('review-count').textContent = '浏览器保存失败，请导出研究记录备份。'; },
    exportReviews: () => Object.values(saved.reviews)
  };
})();

