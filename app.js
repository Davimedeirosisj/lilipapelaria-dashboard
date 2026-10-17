import { SOURCE } from './data.js';
import { initialState, clone, dayKey, shiftedDay, periodSales, summarize, inventorySummary, quote, createSale, cancelSale, updateProduct, validateState, PAYMENTS } from './core.js';

const KEY = 'lili-papelaria-vendas-v1';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = c => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);
const shortMoney = c => (c / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const int = n => n.toLocaleString('pt-BR');
const dateTime = v => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));
const numberText = v => Number(v).toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 6 });
function numberInput(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error('Informe um valor válido, como 12,90.');
  return Number(s);
}
const moneyInput = raw => Math.round(numberInput(raw) * 100);
const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  box: '<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.8 7"/><path d="M3 4v7h7M12 7v5l3 2"/>',
  data: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  money: '<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  growth: '<path d="m3 17 6-6 4 4 8-11M15 4h6v6"/>',
  receipt: '<path d="M5 3h14v19l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  edit: '<path d="m4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  print: '<path d="M6 9V3h12v6M6 17H3v-8h18v8h-3M6 14h12v7H6Z"/><path d="M17 11h1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
const colors = { Canetas: '#b7c6a7', Escrita: '#c2adcf', Colorir: '#e9cba8', Organização: '#aebecb', Cadernos: '#d0b9c2', Kits: '#bec9ca', Embalagens: '#d8c4a3' };
const tones = { Canetas: '#edf1e8', Escrita: '#f1eaf6', Colorir: '#faf0e3', Organização: '#eaf0f3', Cadernos: '#f5ecef', Kits: '#edf1f0', Embalagens: '#f5eee2' };
function art(category) {
  const shape = category === 'Cadernos'
    ? '<rect x="23" y="12" width="51" height="71" rx="5" fill="#c4accd"/><path d="M32 12v71M27 22h-8m8 12h-8m8 12h-8m8 12h-8m8 12h-8" stroke="#6e7764" stroke-width="3"/><rect x="41" y="33" width="23" height="22" rx="3" fill="#faf5e9"/><path d="M48 44h10"/>'
    : category === 'Organização'
    ? '<path d="M10 29h34l8 8h34v42H10V29Z" fill="#cbb9dc"/><path d="M10 39h76v40H10Z" fill="#b4a0c7"/><path d="M22 26V14h52v23" fill="#f9f8ef"/><path d="M31 21h34M31 28h24" stroke="#a4b0a1"/><circle cx="50" cy="58" r="4" fill="#f9f8ef"/>'
    : category === 'Colorir'
    ? '<path d="m22 20 6-10 6 10v51H22Z" fill="#bdcfa9"/><path d="m41 20 6-10 6 10v51H41Z" fill="#c3afcf"/><path d="m60 20 6-10 6 10v51H60Z" fill="#e6c09e"/><path d="M17 47h63v37H17Z" fill="#f5e4bf"/><rect x="33" y="55" width="32" height="19" rx="2" fill="#fffaf0"/><path d="M39 64h20" stroke="#aaa17f"/>'
    : category === 'Kits'
    ? '<rect x="15" y="28" width="66" height="55" rx="10" fill="#d8b9be"/><path d="M36 29V17h24v12" stroke="#a58a8d" stroke-width="4"/><rect x="25" y="41" width="46" height="30" rx="6" fill="#efdbd7"/><path d="M25 49h46" stroke="#b6989b"/><path d="M64 50v8" stroke="#a58a8d" stroke-width="3"/><circle cx="47" cy="61" r="4" fill="#c3aba5"/>'
    : category === 'Embalagens'
    ? '<path d="M18 31h61l-5 51H23L18 31Z" fill="#d9bd91"/><path d="M35 38V24a13 13 0 0 1 26 0v14" stroke="#a88e67" stroke-width="4" fill="none"/><path d="M37 56h24M41 63h16" stroke="#af976e"/>'
    : '<path d="M30 17h12v55l-6 12-6-12V17Z" fill="#afc39d"/><path d="M30 17v-5h12v5M30 69h12" stroke="#7e9570"/><path d="M54 17h12v55l-6 12-6-12V17Z" fill="#c4afd5"/><path d="M54 17v-5h12v5M54 69h12" stroke="#9c83b2"/><path d="M41 19h5v22M65 19h5v22" stroke="#78826b"/><path d="m34 80 2 4 2-4m20 0 2 4 2-4" stroke="#5d6756"/>';
  return `<svg viewBox="0 0 96 96" fill="none" stroke="#a1a98e" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}

let state, readError = '', storageBroken = false;
try {
  const raw = localStorage.getItem(KEY);
  state = raw ? validateState(JSON.parse(raw)) : initialState();
  if (!raw) localStorage.setItem(KEY, JSON.stringify(state));
} catch (e) { state = initialState(); readError = e.message; storageBroken = true; }
const tabs = [{id:'dashboard',name:'Visão geral',short:'Início',icon:'dashboard'},{id:'venda',name:'Nova venda',short:'Vender',icon:'bag'},{id:'estoque',name:'Produtos e estoque',short:'Estoque',icon:'box'},{id:'historico',name:'Histórico de vendas',short:'Vendas',icon:'history'},{id:'dados',name:'Dados e backup',short:'Backup',icon:'data'}];
let route = tabs.some(t => t.id === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
let period = 'today', historyPeriod = 'all', historyStatus = 'all', inventoryCategory = 'Todos', inventorySearch = '', saleSearch = '', saleCategory = 'Todos', historySearch = '', inventorySort = 'category';
let cart = {}, supplies = {}, checkout = { customer: '', note: '', payment: 'Pix', discount: '', fee: '', cash: '' };
let toastTimer, pendingRestore = null, editOriginal = null, lastFocus = null;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4000); }
function go(id) { if (location.hash === '#' + id) {route = id; render();} else location.hash = id; }
function commit(next, restoring = false) {
  try {
    if (!restoring && storageBroken) throw new Error('Recupere os dados em Dados e backup antes de registrar alterações.');
    const raw = localStorage.getItem(KEY);
    if (!restoring && raw) {
      const disk = validateState(JSON.parse(raw));
      if (disk.revision !== state.revision) { state = disk; render(); throw new Error('O painel foi atualizado em outra aba. Revise os valores e tente novamente.'); }
    }
    next.revision = (restoring ? Math.max(state.revision, next.revision || 0) : state.revision) + 1;
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(next));
    state = next; storageBroken = false; readError = '';
    return true;
  } catch (e) { toast('Alteração não salva. ' + e.message); return false; }
}
function header(title, subtitle, right = '', eyebrow = 'LILI PAPELARIA') { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div>${right}</div>`; }
function selectPeriod(value, id) { return `<select id="${id}" class="date-filter" aria-label="Período"><option value="today" ${value==='today'?'selected':''}>Hoje</option><option value="week" ${value==='week'?'selected':''}>Últimos 7 dias</option><option value="month" ${value==='month'?'selected':''}>Este mês</option><option value="all" ${value==='all'?'selected':''}>Todo o período</option></select>`; }
function stat(title, value, foot, i) { return `<article class="stat"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon(i)}</span></div><div class="stat-value">${value}</div><small>${foot}</small></article>`; }
function empty(title, description, button = '', compact = false, i = 'bag') { return `<div class="empty ${compact?'compact':''}"><div class="empty-symbol">${icon(i)}</div><h3>${title}</h3><p>${description}</p>${button}</div>`; }
function reviewNotice() { const n = state.products.filter(p=>p.needsReview).length; return n ? `<div class="notice">${icon('info')}<span><strong>${n} quantidades para conferir.</strong> Cadernos Jolie e canetas CIS Move vieram com quantidades provisórias na planilha. Os totais de estoque incluem esses valores.</span><button class="button small" data-action="review">Conferir estoque ${icon('arrow')}</button></div>` : ''; }
function stockBadge(p) { return p.needsReview ? '<span class="badge amber">Conferir qtd.</span>' : p.stock === 0 ? '<span class="badge red">Esgotado</span>' : p.stock <= p.threshold ? '<span class="badge amber">Estoque baixo</span>' : '<span class="badge green">Disponível</span>'; }
function dashboard() {
  const inv = inventorySummary(state), sales = periodSales(state, period), totals = summarize(sales);
  const today = dayKey(), days = Array.from({length:7},(_,i)=>shiftedDay(today,i-6));
  const daily = days.map(d => state.sales.filter(s=>!s.cancelledAt&&dayKey(s.createdAt)===d).reduce((a,s)=>a+s.revenueCents,0));
  const max = Math.max(...daily,1);
  const cats = [...new Set(state.products.filter(p=>!p.internal).map(p=>p.category))].map(c=>({name:c,units:state.products.filter(p=>p.category===c).reduce((a,p)=>a+p.stock,0)})).sort((a,b)=>b.units-a.units);
  let at = 0; const stops = cats.map(c=>{ const start=at; at += inv.units ? c.units / inv.units*100 : 0; return `${colors[c.name]} ${start}% ${at}%`;}).join(',');
  const recent = sales.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  const daysLabels = days.map(d=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza',weekday:'short'}).format(new Date(d+'T12:00:00Z')).replace('.',''));
  const stockRows = inv.low.slice(0,4).map(p=>`<div class="low-row"><span class="mini-art" style="background:${tones[p.category]}">${art(p.category)}</span><div class="name">${esc(p.name)}<small>${esc(p.category)}</small></div><span class="badge ${p.stock?'amber':'red'}">${p.stock} ${esc(p.unit)}</span><button class="text-button" data-action="edit" data-id="${p.id}" aria-label="Ajustar ${esc(p.name)}">${icon('edit')}</button></div>`).join('');
  return header('Visão geral','Acompanhe suas vendas e o estoque da loja.',selectPeriod(period,'period')) +
    `<section class="hero"><div><div class="eyebrow">SEU BALCÃO DIGITAL</div><h2>Pronta para a próxima venda.</h2><p>Produtos organizados, preços por unidade e tudo no seu lugar.<br>Escolha os itens e deixe o painel cuidar das contas.</p></div><span class="hero-art">${art('Escrita')}</span><button class="button" data-action="go-sale">Registrar uma venda ${icon('arrow')}</button></section>`+
    `<div class="stats">${stat('Vendas no período',brl(totals.revenueCents),`${totals.count} ${totals.count===1?'venda registrada':'vendas registradas'}`,'money')}${stat('Resultado bruto',brl(totals.profitCents),'Após custo, embalagens usadas e taxas','growth')}${stat('Ticket médio',brl(totals.ticketCents),'Valor médio por venda no período','receipt')}${stat('Unidades em estoque',int(inv.units),`${state.products.filter(p=>!p.internal).length} produtos · embalagens à parte`,'box')}</div>`+
    reviewNotice()+
    `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Vendas nos últimos 7 dias</h2><p>Faturamento por dia · horário de Fortaleza</p></div><span class="chart-key"><i></i> Vendas</span></div><div class="chart" role="img" aria-label="Faturamento dos últimos sete dias: ${days.map((d,i)=>`${d}: ${brl(daily[i])}`).join('; ')}">${days.map((d,i)=>`<div class="bar-col"><span class="bar-value">${daily[i]?brl(daily[i]):'R$ 0'}</span><div class="bar" style="height:${Math.max(3,daily[i]/max*116)}px"></div></div>`).join('')}</div><div class="chart-labels">${daysLabels.map((d,i)=>`<span>${d}<br>${days[i].slice(8)}/${days[i].slice(5,7)}</span>`).join('')}</div><div class="chart-zero"><span>${daily.some(Boolean)?'Total da semana: '+brl(daily.reduce((a,b)=>a+b,0)):'As primeiras vendas vão aparecer aqui.'}</span><button class="text-button" data-action="go-history">Ver histórico →</button></div></section>
    <section class="panel"><div class="panel-head"><div><h2>Seu estoque em números</h2><p>Distribuição das unidades disponíveis</p></div>${icon('box')}</div><div class="donut-area"><div class="donut" style="background:${inv.units?'conic-gradient('+stops+')':'#edf1e8'}"><span>${int(inv.units)}<small>UNIDADES</small></span></div><div><span class="small-label">Potencial de venda</span><div class="potential-number">${brl(inv.potentialCents)}</div><span class="fine">Estoque × preço atual<br>${inv.needsReview.length?'Quantidades a conferir':'Antes de descontos e taxas'}</span></div></div><div class="legend">${cats.map(c=>`<div><i style="background:${colors[c.name]}"></i><span>${c.name}</span><b>${c.units}</b></div>`).join('')}</div><div class="potential-foot">Custo do estoque: ${brl(inv.costCents)} · Embalagens: ${brl(inv.packagingCents)}</div></section></div>`+
    `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Últimas vendas</h2><p>Vendas concluídas no período selecionado</p></div><button class="text-button" data-action="go-history">Ver todas →</button></div>${recent.length?`<div class="table-wrap"><table><thead><tr><th>Venda</th><th>Pagamento</th><th class="align-right">Total</th><th></th></tr></thead><tbody>${recent.map(s=>`<tr><td><strong>#${String(s.number).padStart(4,'0')}</strong><br><small>${dateTime(s.createdAt)}</small></td><td>${esc(s.payment)}</td><td class="align-right"><strong>${brl(s.revenueCents)}</strong></td><td><button class="text-button" data-action="sale-detail" data-id="${esc(s.id)}">Ver</button></td></tr>`).join('')}</tbody></table></div>`:empty('Um novo começo por aqui','Registre sua primeira venda para acompanhar os resultados.', '<button class="button lilac small" data-action="go-sale">+ Fazer a primeira venda</button>',true)}</section><section class="panel"><div class="panel-head"><div><h2>Atenção ao estoque</h2><p>Itens no limite de alerta configurado</p></div><span class="pill-count">${inv.low.length} itens</span></div>${stockRows||empty('Tudo em dia','Os produtos estão acima dos seus limites de alerta.','',true,'box')}<div class="source-note">O limite de cada item pode ser ajustado no estoque.</div></section></div>`+
    `<section class="panel"><div class="panel-head"><div><h2>Resultado do período</h2><p>Resumo das vendas concluídas</p></div><span class="badge green">${totals.units} itens vendidos</span></div><div class="report-columns"><div>${[['Faturamento após descontos',totals.revenueCents],['Custo dos produtos vendidos',totals.cogsCents],['Embalagens utilizadas',totals.packagingCents],['Taxas informadas',totals.feeCents],['Resultado bruto',totals.profitCents]].map(([label,v])=>`<div class="metric-row"><span>${label}</span><strong>${brl(v)}</strong></div>`).join('')}</div><div><h3 style="margin-bottom:10px">Formas de pagamento</h3>${PAYMENTS.map(p=>{const n=sales.filter(s=>s.payment===p).reduce((a,s)=>a+s.revenueCents,0);return `<div style="margin-bottom:12px"><div class="total-line"><span>${p}</span><b>${brl(n)}</b></div><div class="chart-payment"><i style="width:${totals.revenueCents?n/totals.revenueCents*100:0}%"></i></div></div>`;}).join('')}</div></div><p class="source-note">Resultado bruto = vendas após descontos − produtos vendidos − embalagens utilizadas − taxas informadas. Não inclui impostos e despesas fixas. Custos de compra conforme a planilha, antes do desconto da nota.</p></section>`;
}

function normalize(s) { return String(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function searchField(id,value,placeholder) { return `<label class="search">${icon('search')}<input type="search" id="${id}" value="${esc(value)}" placeholder="${placeholder}" aria-label="${placeholder}" autocomplete="off"></label>`; }
function chips(selected, includeInternal, action) { const categories=['Todos',...new Set(state.products.filter(p=>includeInternal||!p.internal).map(p=>p.category))];return `<div class="chips" aria-label="Filtrar por categoria">${categories.map(c=>`<button class="chip ${c===selected?'active':''}" data-action="${action}" data-category="${esc(c)}" aria-pressed="${c===selected}">${esc(c)}</button>`).join('')}</div>`; }
function productCards() {
  const q=normalize(saleSearch), filtered=state.products.filter(p=>!p.internal&&(saleCategory==='Todos'||p.category===saleCategory)&&normalize(p.name+' '+p.sku).includes(q));
  return filtered.map(p=>`<article class="product-card"><div class="product-art" style="--tone:${tones[p.category]}">${art(p.category)}${p.needsReview?'<span class="badge amber">Conferir qtd.</span>':p.stock===0?'<span class="badge red">Esgotado</span>':''}</div><div class="product-body"><p class="product-category">${esc(p.category)}</p><h3>${esc(p.name)}</h3><p class="stock-text">${p.stock} ${esc(p.unit)} em estoque${cart[p.id]?' · '+cart[p.id]+' no carrinho':''}</p><div class="product-price-row"><span class="product-price">${brl(p.priceCents)} <small>/${esc(p.unit)}</small></span>${p.needsReview?`<button class="button small lilac" data-action="edit" data-id="${p.id}" aria-label="Conferir quantidade de ${esc(p.name)}">Conferir</button>`:`<button class="add-button" data-action="add" data-id="${p.id}" ${p.stock<=(cart[p.id]||0)?'disabled':''} aria-label="Adicionar ${esc(p.name)}">+</button>`}</div></div></article>`).join('') || `<div class="no-results">${empty('Nenhum produto encontrado','Tente outro nome, código ou categoria.','','true','search')}</div>`;
}
function orderFromForm() {
  return { items:Object.entries(cart).filter(([,qty])=>qty>0).map(([id,qty])=>({id,qty})), supplies:Object.entries(supplies).filter(([,qty])=>qty>0).map(([id,qty])=>({id,qty})), payment:checkout.payment, customer:checkout.customer, note:checkout.note, discountCents:moneyInput(checkout.discount), feeRate:numberInput(checkout.fee), paidCents:checkout.cash.trim()?moneyInput(checkout.cash):undefined };
}
function currentQuote() { try{return {value:quote(state,orderFromForm())};}catch(e){return {error:e.message};} }
function cartTotals() {
  const {value:q,error}=currentQuote();
  if(error) return `<div class="error-text" role="alert">${esc(error)}</div><button class="button primary checkout" disabled>Revise os valores</button>`;
  let cashError='',change=0;
  if(checkout.payment==='Dinheiro') { try{const paid=checkout.cash.trim()?moneyInput(checkout.cash):q.revenueCents;change=Math.max(0,paid-q.revenueCents);if(paid<q.revenueCents)cashError='O valor recebido é menor que o total.';}catch(e){cashError=e.message;} }
  return `<div class="cart-totals"><div class="total-line"><span>Subtotal</span><b>${brl(q.subtotalCents)}</b></div>${q.discountCents?`<div class="total-line"><span>Desconto</span><b>− ${brl(q.discountCents)}</b></div>`:''}<div class="total-line total"><span>Total</span><b>${brl(q.revenueCents)}</b></div>${checkout.payment==='Dinheiro'?`<div class="total-line"><span>Troco</span><b>${brl(change)}</b></div>`:''}<div class="total-line profit-line"><span>Resultado bruto estimado</span><b>${brl(q.profitCents)}</b></div><div class="fine">Custo: ${brl(q.cogsCents)} · Embalagem: ${brl(q.packagingCents)} · Taxa: ${brl(q.feeCents)}</div></div>${cashError?`<div class="error-text">${esc(cashError)}</div>`:''}<button class="button primary checkout" data-action="checkout" ${!q.items.length||cashError||storageBroken?'disabled':''}>${icon('check')} Finalizar venda</button><p class="cart-note">Registra a venda e baixa o estoque.<br>O pagamento é realizado fora deste painel.</p>`;
}
function cartPanel() {
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  return `<aside class="cart" id="cart-panel" aria-label="Carrinho de venda"><div class="cart-head"><h2>Sua venda <span class="badge gray">${count}</span></h2><button class="text-button" data-action="clear-cart" ${!count?'disabled':''}>Limpar</button></div><div class="cart-items">${count?Object.entries(cart).map(([id,qty])=>{const p=state.products.find(p=>p.id===id);return `<div class="cart-line"><div class="cart-line-head"><strong>${esc(p.name)}</strong><button class="text-button" data-action="remove" data-id="${id}" aria-label="Remover ${esc(p.name)}">×</button></div><div class="cart-line-controls"><div class="qty-control"><button data-action="minus" data-id="${id}" aria-label="Diminuir quantidade de ${esc(p.name)}">−</button><input type="number" min="1" max="${p.stock}" step="1" value="${qty}" data-qty="${id}" aria-label="Quantidade de ${esc(p.name)}"><button data-action="add" data-id="${id}" ${qty>=p.stock?'disabled':''} aria-label="Aumentar quantidade de ${esc(p.name)}">+</button></div><span class="cart-line-total">${brl(qty*p.priceCents)}</span></div></div>`;}).join(''):empty('O carrinho está esperando','Toque no + de um produto para começar.','','true')}</div>
    <label class="field"><span>Cliente <span class="fine">(opcional)</span></span><input id="customer" maxlength="100" value="${esc(checkout.customer)}" placeholder="Nome do cliente" autocomplete="off"></label>
    <div class="field-row"><label class="field"><span>Desconto (R$)</span><input id="discount" inputmode="decimal" value="${esc(checkout.discount)}" placeholder="0,00"></label><label class="field"><span>Taxa do pagamento (%)</span><input id="fee" inputmode="decimal" value="${esc(checkout.fee)}" placeholder="0"><small>Taxa descontada do resultado.</small></label></div>
    <label class="field"><span>Forma de pagamento</span><select id="payment">${PAYMENTS.map(p=>`<option ${checkout.payment===p?'selected':''}>${p}</option>`).join('')}</select></label><div id="cash-field">${cashField()}</div>
    <details class="supplies" ${Object.values(supplies).some(Boolean)?'open':''}><summary>Embalagens utilizadas <span class="fine">(uso interno)</span></summary>${state.products.filter(p=>p.internal).map(p=>`<div class="supply-row"><label for="supply-${p.id}">${esc(p.name)}<br><span class="fine">${p.stock} disponíveis · custo ${brl(p.costCentsUnit)}/un.</span></label><input id="supply-${p.id}" type="number" min="0" max="${p.stock}" step="1" value="${supplies[p.id]||0}" data-supply="${p.id}" aria-label="Quantidade utilizada de ${esc(p.name)}"></div>`).join('')}</details>
    <details class="supplies"><summary>Observação da venda</summary><label class="field"><span>Observação (opcional)</span><textarea id="sale-note" maxlength="300" placeholder="Algum detalhe desta venda?">${esc(checkout.note)}</textarea></label></details><div id="cart-totals">${cartTotals()}</div></aside>`;
}
function cashField() { return checkout.payment==='Dinheiro'?`<label class="field"><span>Valor recebido (R$)</span><input id="cash" inputmode="decimal" placeholder="Valor exato da venda" value="${esc(checkout.cash)}"><small>Deixe em branco se recebeu o valor exato.</small></label>`:''; }
function pointOfSale() { return header('Nova venda','Selecione os produtos e registre a venda por unidade.','', 'PONTO DE VENDA')+reviewNotice()+`<div class="pos-layout"><section class="catalogue"><div class="toolbar">${searchField('sale-search',saleSearch,'Buscar produto ou código...')}</div>${chips(saleCategory,false,'sale-category')}<div class="products-grid" id="product-results">${productCards()}</div><button class="mobile-cart-link" data-action="scroll-cart"><span>Ver minha venda</span><span>${Object.values(cart).reduce((a,b)=>a+b,0)} itens ↓</span></button></section>${cartPanel()}</div>`; }
function inventoryRows() {
  let products=state.products.filter(p=>(inventoryCategory==='Todos'||inventoryCategory==='Conferir'&&p.needsReview||p.category===inventoryCategory)&&normalize(p.name+' '+p.sku).includes(normalize(inventorySearch)));
  products=products.slice().sort(inventorySort==='stock'?(a,b)=>a.stock-b.stock:inventorySort==='price'?(a,b)=>a.priceCents-b.priceCents:(a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
  return products.map(p=>`<tr><td><div class="td-product"><span class="mini-art" style="background:${tones[p.category]}">${art(p.category)}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · ${esc(p.category)}${p.internal?' · Uso interno':''}</small></div></div></td><td class="align-right">${brl(p.costCentsUnit)}</td><td class="align-right"><strong>${p.internal?'—':brl(p.priceCents)}</strong><br><small>${esc(p.unit)}</small></td><td class="align-right"><strong>${p.stock}</strong></td><td>${stockBadge(p)}</td><td class="align-right"><button class="icon-button" data-action="edit" data-id="${p.id}" aria-label="Editar ${esc(p.name)}">${icon('edit')}</button></td></tr>`).join('')||'<tr><td colspan="6">Nenhum produto encontrado.</td></tr>';
}
function inventory() {
  const inv=inventorySummary(state);
  return header('Produtos e estoque','Preços, quantidades e embalagens sempre à mão.',`<div class="actions"><button class="button" data-action="export-stock" aria-label="Exportar estoque em CSV">${icon('data')} Exportar CSV</button></div>`)+
    `<div class="stats">${stat('Produtos para venda',String(state.products.filter(p=>!p.internal).length),'Cada preço corresponde à unidade de venda','box')}${stat('Unidades para venda',int(inv.units),inv.needsReview.length?`Inclui ${inv.needsReview.length} ${inv.needsReview.length===1?'quantidade a conferir':'quantidades a conferir'}`:'Contagem atual dos produtos','bag')}${stat('Potencial de venda',brl(inv.potentialCents),'Estoque atual × preço de venda','growth')}${stat('Custo das embalagens',brl(inv.packagingCents),`${state.products.filter(p=>p.internal).reduce((a,p)=>a+p.stock,0)} unidades de uso interno`,'receipt')}</div>`+reviewNotice()+
    `<div class="toolbar">${searchField('stock-search',inventorySearch,'Buscar produto ou código...')}<select class="date-filter" id="inventory-sort" aria-label="Ordenar produtos"><option value="category" ${inventorySort==='category'?'selected':''}>Por categoria</option><option value="stock" ${inventorySort==='stock'?'selected':''}>Menor estoque</option><option value="price" ${inventorySort==='price'?'selected':''}>Menor preço</option></select></div>${chips(inventoryCategory,true,'stock-category')}${inventoryCategory==='Conferir'?'<p class="fine">Mostrando apenas quantidades a conferir. Escolha “Todos” para ver o estoque completo.</p>':''}<section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Produto</th><th class="align-right">Custo / un.</th><th class="align-right">Venda / un.</th><th class="align-right">Estoque</th><th>Situação</th><th></th></tr></thead><tbody id="inventory-results">${inventoryRows()}</tbody></table></div><div class="summary-strip"><span>Custo de mercadorias <b>${brl(inv.costCents)}</b></span><span>Embalagens <b>${brl(inv.packagingCents)}</b></span><span>Custo total atual <b>${brl(inv.costCents+inv.packagingCents)}</b></span></div></section><p class="source-note">Caixas de canetas e lápis foram desmembradas conforme a planilha. Lápis de cor são vendidos por estojo e kits por kit. Sacos e sacolas são de uso interno. O custo é exibido com duas casas, mas calculado com a precisão de origem.</p>`;
}
function filteredHistory() {
  const eligible=new Set(periodSales({...state,sales:state.sales.map(s=>({...s,cancelledAt:null}))},historyPeriod).map(s=>s.id));
  return state.sales.filter(s=>eligible.has(s.id)&&(historyStatus==='all'||historyStatus==='active'&&!s.cancelledAt||historyStatus==='cancelled'&&s.cancelledAt)&&normalize(s.customer+' '+s.number+' '+s.items.map(i=>i.name).join(' ')).includes(normalize(historySearch))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
function historyTable() {
  const sales=filteredHistory();
  if(!sales.length) return empty('Nenhuma venda neste filtro','Suas vendas aparecerão aqui com os itens, o pagamento e o resultado.','<button class="button lilac small" data-action="go-sale">+ Nova venda</button>');
  return `<div class="table-wrap"><table><thead><tr><th>Venda / data</th><th>Cliente</th><th>Pagamento</th><th class="align-right">Total</th><th class="align-right">Resultado</th><th>Situação</th><th></th></tr></thead><tbody>${sales.map(s=>`<tr class="${s.cancelledAt?'cancelled-row':''}"><td><strong>#${String(s.number).padStart(4,'0')}</strong><br><small>${dateTime(s.createdAt)}</small></td><td>${esc(s.customer||'Venda de balcão')}</td><td>${esc(s.payment)}</td><td class="align-right"><strong>${brl(s.revenueCents)}</strong></td><td class="align-right">${brl(s.profitCents)}</td><td><span class="badge ${s.cancelledAt?'gray':'green'}">${s.cancelledAt?'Cancelada':'Concluída'}</span></td><td><button class="button small" data-action="sale-detail" data-id="${esc(s.id)}">Detalhes</button></td></tr>`).join('')}</tbody></table></div>`;
}
function history() {
  const totals=summarize(filteredHistory().filter(s=>!s.cancelledAt));
  return header('Histórico de vendas','Cada venda registrada, com todos os detalhes.',`<div class="actions"><button class="button" data-action="export-sales" aria-label="Exportar vendas filtradas em CSV">${icon('data')} Exportar CSV</button></div>`)+
    `<div class="toolbar">${searchField('history-search',historySearch,'Buscar cliente, produto ou nº da venda...')}${selectPeriod(historyPeriod,'history-period')}<select class="date-filter" id="history-status" aria-label="Situação da venda"><option value="all" ${historyStatus==='all'?'selected':''}>Todas as vendas</option><option value="active" ${historyStatus==='active'?'selected':''}>Concluídas</option><option value="cancelled" ${historyStatus==='cancelled'?'selected':''}>Canceladas</option></select></div><section class="panel table-panel" id="history-panel">${historyTable()}<div class="summary-strip"><span>Concluídas no filtro <b>${totals.count}</b></span><span>Faturamento <b>${brl(totals.revenueCents)}</b></span><span>Resultado bruto <b>${brl(totals.profitCents)}</b></span></div></section><p class="source-note">Cancelar uma venda devolve os produtos e as embalagens ao estoque e remove o resultado dos relatórios. O registro fica preservado. Estornos de pagamentos são feitos fora do painel.</p>`;
}
function dataPage() {
  return header('Seus dados, bem guardados','Exporte uma cópia para manter seu histórico e continuar em outro dispositivo.')+
    `<div class="notice">${icon('info')}<span>As vendas e os ajustes ficam salvos <strong>neste navegador</strong>. Não há sincronização entre dispositivos. Baixe um backup ao fim do dia e antes de limpar os dados do navegador.</span></div><div class="data-grid"><section class="panel"><span class="data-icon">${icon('data')}</span><h2>Backup completo</h2><p>Guarde produtos, preços, estoque, vendas e ajustes em um único arquivo. Use esse arquivo para recuperar seu painel.</p><button class="button primary" data-action="backup">${icon('data')} Baixar backup</button><p class="fine">${state.sales.length} vendas no histórico · ${state.adjustments.length} ajustes de estoque</p></section><section class="panel"><span class="data-icon">${icon('upload')}</span><h2>Restaurar um backup</h2><p>Abra um arquivo de backup gerado por este painel. Você poderá revisar o conteúdo antes de substituir os dados atuais.</p><button class="button" data-action="restore">${icon('upload')} Escolher arquivo</button><p class="fine">A restauração substitui os dados e limpa o carrinho.</p></section><section class="panel"><span class="data-icon">${icon('box')}</span><h2>Origem dos produtos</h2><ul class="info-list"><li><strong>Base:</strong> ${esc(SOURCE.name)}</li><li><strong>Localização:</strong> ${esc(SOURCE.sheet)}</li><li><strong>Conferência:</strong> ${esc(SOURCE.invoice)}</li><li><strong>Custo inicial informado:</strong> ${brl(SOURCE.initialCostCents)}, sendo ${brl(SOURCE.initialPackagingCents)} em embalagens.</li><li>Itens marcados de verde na nota foram excluídos da base.</li><li>${esc(SOURCE.costBasis)}</li></ul></section><section class="panel"><span class="data-icon">${icon('receipt')}</span><h2>Relatórios para planilha</h2><p>Exporte valores em reais e quantidades em arquivos CSV compatíveis com Excel. Para preservar o painel completo, use o backup JSON.</p><div class="actions"><button class="button" data-action="export-stock">${icon('data')} Estoque CSV</button><button class="button" data-action="export-all-sales">${icon('data')} Vendas CSV</button><button class="button" data-action="export-adjustments">${icon('data')} Ajustes CSV</button></div><p class="fine">Os relatórios de vendas incluem a situação de cada registro. Vendas canceladas devem ser excluídas dos resultados.</p></section><section class="panel wide"><h2>Uma rotina simples para a loja</h2><div class="steps"><div><span class="step-number">1</span><h3>Confira os produtos</h3><p>Valide as quantidades provisórias em Produtos e estoque. Ajuste o preço e o limite de alerta quando precisar.</p></div><div><span class="step-number">2</span><h3>Registre cada venda</h3><p>Selecione os itens, informe o pagamento e as embalagens usadas. O estoque é atualizado na finalização.</p></div><div><span class="step-number">3</span><h3>Feche o dia com um backup</h3><p>Confira o histórico e baixe uma cópia. Para trocar de dispositivo, restaure o backup mais recente antes de vender.</p></div></div></section></div>`;
}
function render() {
  $('nav').innerHTML=tabs.map(t=>`<a href="#${t.id}" class="nav-link ${route===t.id?'active':''}" aria-label="${t.name}" ${route===t.id?'aria-current="page"':''}>${icon(t.icon)}<span class="nav-text"><span class="desktop-name">${t.name}</span><span class="mobile-name">${t.short}</span></span></a>`).join('');
  $('crumb-title').textContent=tabs.find(t=>t.id===route)?.name||'Visão geral';
  $('today-date').textContent=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  $('top-sale').hidden=route==='venda';
  if(storageBroken&&route!=='dados') $('content').innerHTML=`<section class="error-screen"><h1>Vamos recuperar seus dados.</h1><p>O navegador não conseguiu abrir o histórico salvo. Ele foi preservado. Vá a Dados e backup para baixar uma cópia e restaurar um backup válido.</p><p class="fine">${esc(readError)}</p><button class="button primary" data-action="go-data">Dados e backup</button></section>`;
  else $('content').innerHTML=({dashboard, venda:pointOfSale, estoque:inventory, historico:history, dados:dataPage}[route]||dashboard)();
  $('save-status').textContent=storageBroken?'Falha ao abrir os dados · use Dados e backup':state.updatedAt?'Salvo neste navegador · '+dateTime(state.updatedAt):'Dados neste navegador · faça backups regularmente';
}
function refreshFocused() {const el=document.activeElement;const id=el?.id;const start=el?.selectionStart;const end=el?.selectionEnd;render();if(id&&$(id)){ $(id).focus({preventScroll:true});try{$(id).setSelectionRange(start,end);}catch{} }}
function refreshSale() { if(route==='venda') refreshFocused(); }
function openModal(title,subtitle,body) { lastFocus=document.activeElement; const modal=$('modal');modal.innerHTML=`<div class="modal-head"><div><h2 id="modal-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="icon-button" data-action="close-modal" aria-label="Fechar janela">${icon('close')}</button></div><div class="modal-body">${body}</div>`;if(!modal.open)modal.showModal(); }
function closeModal() { $('modal').close(); lastFocus?.isConnected&&lastFocus.focus(); }
function editProduct(id) {
  const p=state.products.find(p=>p.id===id);if(!p)return;
  editOriginal={id:p.id,costText:numberText(p.costCentsUnit/100),revision:state.revision};
  openModal('Ajustar produto',esc(p.name),`<form id="product-form" data-id="${p.id}"><div class="field-row"><label class="field"><span>Quantidade atual em estoque</span><input name="stock" type="number" min="0" max="1000000" step="1" required value="${p.stock}"></label><label class="field"><span>Alertar ao chegar a</span><input name="threshold" type="number" min="0" max="1000000" step="1" required value="${p.threshold}"></label></div><div class="field-row"><label class="field"><span>Preço de venda por ${esc(p.unit)} (R$)</span><input name="price" inputmode="decimal" value="${numberText(p.priceCents/100)}" ${p.internal?'disabled':''} required></label><label class="field"><span>Custo por ${esc(p.unit)} (R$)</span><input name="cost" inputmode="decimal" value="${editOriginal.costText}" required></label></div>${p.needsReview?`<div class="alert-line"><strong>Quantidade provisória da planilha.</strong><br>${esc(p.sourceNote)}<br>Informe a contagem física de unidades que serão vendidas separadamente.</div><label class="checkbox"><input type="checkbox" name="confirmed" required><span>Conferi a quantidade física e a unidade de venda deste produto.</span></label>`:''}<label class="field"><span>Motivo do ajuste</span><input name="reason" maxlength="300" required minlength="3" placeholder="Ex.: contagem física, reposição ou novo preço" value="${p.needsReview?'Conferência da quantidade física':''}"></label><p class="fine">Informe o total disponível após o ajuste. Em uma reposição, atualize o custo médio se necessário. Vendas anteriores mantêm os custos e preços registrados.</p><div id="product-error" class="error-text" role="alert"></div><div class="modal-actions"><button type="button" class="button" data-action="close-modal">Voltar</button><button class="button primary" type="submit">Salvar ajuste</button></div></form>`);
}
function reviewProducts() { const pending=state.products.filter(p=>p.needsReview);openModal('Conferir quantidades','Valide a contagem física antes de vender estes itens.',`<div class="pending-products">${pending.map(p=>`<div class="pending-product"><div><strong>${esc(p.name)}</strong><small>${p.stock} unidades provisórias · ${brl(p.priceCents)} cada</small></div><button class="button small" data-action="edit" data-id="${p.id}">Conferir</button></div>`).join('')||'<p>Todos os produtos já foram conferidos.</p>'}</div><p class="fine">Os demais produtos já estão disponíveis para registro de vendas.</p>`); }
function saleDetail(id,success=false) {
  const s=state.sales.find(s=>s.id===id);if(!s)return;
  openModal(success?'Venda registrada':'Detalhes da venda',`#${String(s.number).padStart(4,'0')} · ${dateTime(s.createdAt)}`,`${success?`<div class="receipt-success"><span class="checkmark">✓</span><h3>Mais uma venda por aqui!</h3><strong>${brl(s.revenueCents)}</strong><p>Estoque atualizado com sucesso.</p></div>`:''}<div class="receipt-meta"><span>${esc(s.customer||'Venda de balcão')}</span><strong>${esc(s.payment)}</strong></div><div class="receipt-lines">${s.items.map(i=>`<div class="receipt-line"><span>${i.qty} × ${esc(i.name)}</span><strong>${brl(i.qty*i.unitPriceCents)}</strong></div>`).join('')}</div>${s.discountCents?`<div class="total-line"><span>Desconto</span><b>− ${brl(s.discountCents)}</b></div>`:''}<div class="total-line total"><span>Total</span><b>${brl(s.revenueCents)}</b></div>${s.payment==='Dinheiro'?`<div class="total-line"><span>Recebido / troco</span><b>${brl(s.paidCents)} / ${brl(s.changeCents)}</b></div>`:''}<div class="cost-breakdown"><div class="total-line"><span>Produtos vendidos (custo)</span><b>${brl(s.cogsCents)}</b></div><div class="total-line"><span>Embalagens utilizadas</span><b>${brl(s.packagingCents)}</b></div><div class="total-line"><span>Taxa (${numberText(s.feeRate)}%)</span><b>${brl(s.feeCents)}</b></div><div class="total-line profit-line"><span>Resultado bruto</span><b>${brl(s.profitCents)}</b></div></div>${s.supplies.length?`<p class="fine">Embalagens: ${s.supplies.map(x=>x.qty+' × '+esc(x.name)).join(', ')}.</p>`:''}${s.note?`<p class="fine">Observação: ${esc(s.note)}</p>`:''}${s.cancelledAt?`<div class="alert-line">Cancelada em ${dateTime(s.cancelledAt)}.<br>Motivo: ${esc(s.cancelReason)}. Estoque devolvido.</div>`:''}<div class="modal-actions">${!s.cancelledAt?`<button class="button danger small" data-action="cancel-sale" data-id="${esc(s.id)}">Cancelar venda</button>`:''}<button class="button" data-action="print-sale" data-id="${esc(s.id)}">${icon('print')} Comprovante</button><button class="button primary" data-action="close-modal">Concluir</button></div>`);
}
function checkoutSale() {
  try {
    const order=orderFromForm();const q=quote(state,order);if(order.payment==='Dinheiro'&&order.paidCents===undefined)order.paidCents=q.revenueCents;
    const result=createSale(state,order);
    if(commit(result.state)){cart={};supplies={};checkout={customer:'',note:'',payment:'Pix',discount:'',fee:'',cash:''};render();saleDetail(result.sale.id,true);}
  }catch(e){toast(e.message);}
}
function download(content,name,type='application/json') {const blob=new Blob([content],{type});const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function csvCell(v) {let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function csv(rows,name) {download('\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n'),name,'text/csv;charset=utf-8');}
const csvMoney=c=>(c/100).toFixed(2).replace('.',',');
function exportStock() {csv([['Código','Produto','Categoria','Unidade de venda','Estoque','Custo unitário (R$)','Preço de venda (R$)','Potencial (R$)','Uso interno','Quantidade a conferir'],...state.products.map(p=>[p.sku,p.name,p.category,p.unit,p.stock,(p.costCentsUnit/100).toFixed(6).replace('.',','),csvMoney(p.priceCents),csvMoney(p.stock*p.priceCents),p.internal?'Sim':'Não',p.needsReview?'Sim':'Não'])],`Lili_Estoque_${dayKey()}.csv`);}
function exportSales(all=false) {const list=all?state.sales:filteredHistory();csv([['Venda','Data e hora (Fortaleza)','Cliente','Itens','Pagamento','Subtotal (R$)','Desconto (R$)','Faturamento (R$)','Custo dos produtos (R$)','Embalagens (R$)','Taxa (R$)','Resultado bruto (R$)','Situação','Cancelada em','Motivo do cancelamento','Observação'],...list.map(s=>[s.number,dateTime(s.createdAt),s.customer,s.items.map(i=>`${i.qty} x ${i.name}`).join(' | '),s.payment,csvMoney(s.subtotalCents),csvMoney(s.discountCents),csvMoney(s.revenueCents),csvMoney(s.cogsCents),csvMoney(s.packagingCents),csvMoney(s.feeCents),csvMoney(s.profitCents),s.cancelledAt?'Cancelada':'Concluída',s.cancelledAt?dateTime(s.cancelledAt):'',s.cancelReason||'',s.note])],`Lili_Vendas_${dayKey()}.csv`);}
function exportAdjustments() {csv([['Data e hora (Fortaleza)','Produto','Estoque anterior','Estoque após ajuste','Preço anterior (R$)','Preço novo (R$)','Custo anterior (R$)','Custo novo (R$)','Motivo'],...state.adjustments.map(a=>[dateTime(a.at),a.name,a.before.stock,a.after.stock,csvMoney(a.before.priceCents),csvMoney(a.after.priceCents),csvMoney(a.before.costCentsUnit),csvMoney(a.after.costCentsUnit),a.reason])],`Lili_Ajustes_${dayKey()}.csv`);}
function printSale(id) {
  const s=state.sales.find(s=>s.id===id);if(!s)return;
  $('print-area').innerHTML=`<h1>Lili Papelaria</h1><p class="print-sub">Guajeru · Fortaleza<br>COMPROVANTE DE VENDA · SEM VALOR FISCAL</p><div class="print-rule"></div><div>Venda #${String(s.number).padStart(4,'0')}<br>${dateTime(s.createdAt)}${s.customer?'<br>Cliente: '+esc(s.customer):''}</div>${s.cancelledAt?'<h2>VENDA CANCELADA</h2>':''}<div class="print-rule"></div>${s.items.map(x=>`<div class="receipt-line"><span>${x.qty} × ${esc(x.name)}<br>${brl(x.unitPriceCents)} cada</span><strong>${brl(x.qty*x.unitPriceCents)}</strong></div>`).join('')}<div class="print-rule"></div>${s.discountCents?`<div class="receipt-line"><span>Desconto</span><span>− ${brl(s.discountCents)}</span></div>`:''}<div class="print-total">Total: ${brl(s.revenueCents)}</div><div>Pagamento: ${esc(s.payment)}</div>${s.payment==='Dinheiro'?`<div>Recebido: ${brl(s.paidCents)}<br>Troco: ${brl(s.changeCents)}</div>`:''}${s.note?`<p>${esc(s.note)}</p>`:''}<p class="print-foot">Obrigada por comprar na Lili!<br>Pequenos detalhes, feitos com carinho.</p>`;
  window.print();
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='go-sale')go('venda');
  else if(action==='go-history')go('historico');
  else if(action==='go-data')go('dados');
  else if(action==='add') {const p=state.products.find(p=>p.id===id);if(!p||p.needsReview)return editProduct(id);if((cart[id]||0)>=p.stock)return toast('Estoque insuficiente.');cart[id]=(cart[id]||0)+1;refreshSale();}
  else if(action==='minus'){if(--cart[id]<=0)delete cart[id];refreshSale();}
  else if(action==='remove'){delete cart[id];refreshSale();}
  else if(action==='clear-cart'){cart={};supplies={};checkout.discount='';checkout.cash='';refreshSale();}
  else if(action==='sale-category'){saleCategory=button.dataset.category;render();}
  else if(action==='stock-category'){inventoryCategory=button.dataset.category;render();}
  else if(action==='edit')editProduct(id);
  else if(action==='review')reviewProducts();
  else if(action==='checkout')checkoutSale();
  else if(action==='close-modal')closeModal();
  else if(action==='scroll-cart')$('cart-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  else if(action==='sale-detail')saleDetail(id);
  else if(action==='print-sale')printSale(id);
  else if(action==='cancel-sale') {const s=state.sales.find(s=>s.id===id);openModal('Cancelar esta venda?',`Venda #${String(s.number).padStart(4,'0')} · ${brl(s.revenueCents)}`,`<form id="cancel-form" data-id="${esc(id)}"><p>Os produtos e as embalagens voltarão ao estoque. A venda ficará marcada como cancelada. Se já recebeu o pagamento, faça o estorno fora do painel.</p><label class="field"><span>Motivo do cancelamento</span><textarea name="reason" minlength="3" maxlength="300" required placeholder="Informe o motivo"></textarea></label><div id="cancel-error" class="error-text" role="alert"></div><div class="modal-actions"><button type="button" class="button" data-action="sale-detail" data-id="${esc(id)}">Voltar</button><button type="submit" class="button danger">Confirmar cancelamento</button></div></form>`);}
  else if(action==='export-stock')exportStock();
  else if(action==='export-sales')exportSales();
  else if(action==='export-all-sales')exportSales(true);
  else if(action==='export-adjustments')exportAdjustments();
  else if(action==='backup'){try{const raw=localStorage.getItem(KEY);download(storageBroken&&raw?raw:JSON.stringify({app:'Lili Papelaria',exportedAt:new Date().toISOString(),state},null,2),`Lili_Backup_${dayKey()}_${Date.now()}.json`);toast('Backup preparado para download.');}catch(e){toast(e.message);}}
  else if(action==='restore'){$('backup-file').value='';$('backup-file').click();}
  else if(action==='confirm-restore'){if(pendingRestore&&commit(clone(pendingRestore),true)){pendingRestore=null;cart={};supplies={};checkout={customer:'',note:'',payment:'Pix',discount:'',fee:'',cash:''};closeModal();render();toast('Backup restaurado.');}}
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='sale-search'){saleSearch=el.value;$('product-results').innerHTML=productCards();}
  else if(el.id==='stock-search'){inventorySearch=el.value;$('inventory-results').innerHTML=inventoryRows();}
  else if(el.id==='history-search'){historySearch=el.value;refreshFocused();}
  else if(['customer','discount','fee','cash','sale-note'].includes(el.id)){checkout[el.id==='sale-note'?'note':el.id]=el.value;if(['discount','fee','cash'].includes(el.id))$('cart-totals').innerHTML=cartTotals();}
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='period'){period=el.value;render();}
  else if(el.id==='history-period'){historyPeriod=el.value;render();}
  else if(el.id==='history-status'){historyStatus=el.value;render();}
  else if(el.id==='inventory-sort'){inventorySort=el.value;$('inventory-results').innerHTML=inventoryRows();}
  else if(el.id==='payment'){checkout.payment=el.value;$('cash-field').innerHTML=cashField();$('cart-totals').innerHTML=cartTotals();}
  else if(el.dataset.qty){const p=state.products.find(p=>p.id===el.dataset.qty),n=Number(el.value);if(!Number.isInteger(n)||n<1||n>p.stock){toast('Informe uma quantidade inteira dentro do estoque disponível.');el.value=cart[p.id];return;}cart[p.id]=n;refreshSale();}
  else if(el.dataset.supply){const p=state.products.find(p=>p.id===el.dataset.supply),n=Number(el.value);if(!Number.isInteger(n)||n<0||n>p.stock){toast('Quantidade de embalagem inválida.');el.value=supplies[p.id]||0;return;}supplies[p.id]=n;$('cart-totals').innerHTML=cartTotals();}
});
document.addEventListener('submit',e=>{
  if(e.target.id==='product-form'){
    e.preventDefault();const form=e.target;const f=new FormData(form),p=state.products.find(p=>p.id===form.dataset.id);
    try{if(editOriginal.revision!==state.revision)throw new Error('O estoque mudou. Feche esta janela e abra o produto novamente.');
      const next=updateProduct(state,p.id,{stock:Number(f.get('stock')),threshold:Number(f.get('threshold')),priceCents:p.internal?0:moneyInput(f.get('price')),costCentsUnit:f.get('cost')===editOriginal.costText?p.costCentsUnit:numberInput(f.get('cost'))*100,confirmed:f.get('confirmed')==='on'},String(f.get('reason')));
      if(commit(next)){if(cart[p.id]>next.products.find(x=>x.id===p.id).stock)cart[p.id]=next.products.find(x=>x.id===p.id).stock;if(cart[p.id]===0)delete cart[p.id];closeModal();render();toast('Produto atualizado.');}
    }catch(err){$('product-error').textContent=err.message;}
  }else if(e.target.id==='cancel-form'){
    e.preventDefault();const form=e.target;try{const next=cancelSale(state,form.dataset.id,String(new FormData(form).get('reason')));if(commit(next)){closeModal();render();toast('Venda cancelada e estoque devolvido.');}}catch(err){$('cancel-error').textContent=err.message;}
  }
});
$('backup-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>25*1024*1024)throw new Error('O arquivo é muito grande. Use um backup de até 25 MB.');const raw=JSON.parse(await file.text());pendingRestore=validateState(raw.state||raw);const inv=inventorySummary(pendingRestore);openModal('Restaurar este backup?','Confira os dados antes de substituir o painel.',`<p><strong>${esc(file.name)}</strong></p><div class="metric-row"><span>Produtos</span><strong>${pendingRestore.products.length}</strong></div><div class="metric-row"><span>Unidades para venda</span><strong>${inv.units}</strong></div><div class="metric-row"><span>Vendas no histórico</span><strong>${pendingRestore.sales.length}</strong></div><div class="metric-row"><span>Última alteração</span><strong>${pendingRestore.updatedAt?dateTime(pendingRestore.updatedAt):'Base inicial'}</strong></div><div class="alert-line">O backup substituirá ${state.sales.length} vendas e ${state.adjustments.length} ajustes atuais. Baixe uma cópia do painel atual antes de continuar.</div><div class="modal-actions"><button class="button" data-action="backup">Baixar dados atuais</button><button class="button primary" data-action="confirm-restore">Restaurar backup</button></div>`);}catch(err){pendingRestore=null;toast('Backup não importado. '+err.message);}
});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
window.addEventListener('hashchange',()=>{route=tabs.some(t=>t.id===location.hash.slice(1))?location.hash.slice(1):'dashboard';render();window.scrollTo(0,0);});
window.addEventListener('storage',e=>{if(e.key===KEY){try{if(!e.newValue)throw new Error('Os dados foram removidos em outra aba.');state=validateState(JSON.parse(e.newValue));render();toast('Dados atualizados por outra aba. Revise o carrinho antes de finalizar.');}catch(err){storageBroken=true;readError=err.message;render();}}});
render();
