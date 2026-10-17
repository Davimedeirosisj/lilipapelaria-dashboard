import { INITIAL_PRODUCTS, SOURCE } from './data.js';

export const SCHEMA = 1;
export const PAYMENTS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito'];
export const clone = value => JSON.parse(JSON.stringify(value));
const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
const quantity = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000;
const cost = n => Number.isFinite(n) && n >= 0 && n <= 100000000;
const assert = (ok, message) => { if (!ok) throw new Error(message); };
export function initialState() {
  return { schema: SCHEMA, revision: 0, products: clone(INITIAL_PRODUCTS), sales: [], adjustments: [], source: clone(SOURCE), nextSale: 1, updatedAt: null };
}
export function dayKey(value = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = t => p.find(x => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftedDay(key, offset) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return dayKey(date);
}
export function periodSales(state, period = 'today', now = new Date()) {
  const today = dayKey(now);
  const from = period === 'today' ? today : period === 'week' ? shiftedDay(today, -6) : period === 'month' ? today.slice(0, 7) + '-01' : '0000-01-01';
  return state.sales.filter(s => !s.cancelledAt && dayKey(s.createdAt) >= from && dayKey(s.createdAt) <= today);
}
export function summarize(sales) {
  const out = { count: sales.length, revenueCents: 0, profitCents: 0, cogsCents: 0, packagingCents: 0, feeCents: 0, discountCents: 0, units: 0 };
  for (const s of sales) {
    for (const k of ['revenueCents', 'profitCents', 'cogsCents', 'packagingCents', 'feeCents', 'discountCents']) out[k] += s[k];
    out.units += s.items.reduce((a, x) => a + x.qty, 0);
  }
  out.ticketCents = out.count ? Math.round(out.revenueCents / out.count) : 0;
  return out;
}
export function inventorySummary(state) {
  const saleable = state.products.filter(p => !p.internal);
  return {
    units: saleable.reduce((a, p) => a + p.stock, 0),
    potentialCents: saleable.reduce((a, p) => a + p.stock * p.priceCents, 0),
    costCents: Math.round(saleable.reduce((a, p) => a + p.stock * p.costCentsUnit, 0)),
    packagingCents: Math.round(state.products.filter(p => p.internal).reduce((a, p) => a + p.stock * p.costCentsUnit, 0)),
    needsReview: saleable.filter(p => p.needsReview),
    low: saleable.filter(p => p.stock <= p.threshold).sort((a, b) => a.stock - b.stock)
  };
}
function resolveLines(state, lines, internal, requireReviewed) {
  assert(Array.isArray(lines), 'Lista de itens inválida.');
  const used = new Set();
  return lines.map(line => {
    assert(line && typeof line.id === 'string' && !used.has(line.id), 'Item repetido ou inválido.');
    used.add(line.id);
    const p = state.products.find(p => p.id === line.id);
    assert(p && p.internal === internal, 'Produto não encontrado nessa categoria.');
    assert(quantity(line.qty) && line.qty > 0, 'Informe uma quantidade inteira maior que zero.');
    assert(line.qty <= p.stock, `Estoque insuficiente: ${p.name}.`);
    assert(!requireReviewed || !p.needsReview, `Confira a quantidade de ${p.name} no estoque antes de vender.`);
    return { id: p.id, name: p.name, category: p.category, unit: p.unit, qty: line.qty, unitPriceCents: p.priceCents, costCentsUnit: p.costCentsUnit };
  });
}
export function quote(state, order, requireReviewed = true) {
  const items = resolveLines(state, order.items || [], false, requireReviewed);
  const supplies = resolveLines(state, order.supplies || [], true, false);
  const subtotalCents = items.reduce((a, x) => a + x.qty * x.unitPriceCents, 0);
  const discountCents = order.discountCents ?? 0;
  const feeRate = order.feeRate ?? 0;
  assert(money(discountCents) && discountCents <= subtotalCents, 'O desconto deve ficar entre zero e o subtotal.');
  assert(Number.isFinite(feeRate) && feeRate >= 0 && feeRate <= 100, 'A taxa deve ficar entre 0% e 100%.');
  const revenueCents = subtotalCents - discountCents;
  const feeCents = Math.round(revenueCents * feeRate / 100);
  const cogsCents = Math.round(items.reduce((a, x) => a + x.qty * x.costCentsUnit, 0));
  const packagingCents = Math.round(supplies.reduce((a, x) => a + x.qty * x.costCentsUnit, 0));
  return { items, supplies, subtotalCents, discountCents, feeRate, revenueCents, feeCents, cogsCents, packagingCents, profitCents: revenueCents - feeCents - cogsCents - packagingCents };
}
export function createSale(state, order, now = new Date().toISOString(), uuid = crypto.randomUUID()) {
  assert(order.items?.length, 'Adicione um produto para registrar a venda.');
  assert(PAYMENTS.includes(order.payment), 'Selecione a forma de pagamento.');
  const totals = quote(state, order);
  const paidCents = order.payment === 'Dinheiro' ? order.paidCents : totals.revenueCents;
  assert(money(paidCents) && paidCents >= totals.revenueCents, 'O valor recebido precisa cobrir o total da venda.');
  const next = clone(state);
  for (const line of [...totals.items, ...totals.supplies]) next.products.find(p => p.id === line.id).stock -= line.qty;
  const sale = { id: uuid, number: next.nextSale++, createdAt: now, ...totals, payment: order.payment, paidCents, changeCents: paidCents - totals.revenueCents, customer: String(order.customer || '').trim().slice(0, 100), note: String(order.note || '').trim().slice(0, 300), cancelledAt: null, cancelReason: null };
  next.sales.push(sale);
  return { state: next, sale };
}
export function cancelSale(state, saleId, reason, now = new Date().toISOString()) {
  assert(typeof reason === 'string' && reason.trim().length >= 3, 'Informe o motivo do cancelamento.');
  const next = clone(state);
  const sale = next.sales.find(s => s.id === saleId);
  assert(sale && !sale.cancelledAt, 'Esta venda já foi cancelada ou não foi encontrada.');
  for (const line of [...sale.items, ...sale.supplies]) {
    const p = next.products.find(p => p.id === line.id);
    assert(p && quantity(p.stock + line.qty), 'Não foi possível devolver os itens ao estoque.');
    p.stock += line.qty;
  }
  sale.cancelledAt = now;
  sale.cancelReason = reason.trim().slice(0, 300);
  return next;
}
export function updateProduct(state, id, changes, reason, now = new Date().toISOString()) {
  const next = clone(state), p = next.products.find(p => p.id === id);
  assert(p, 'Produto não encontrado.');
  assert(quantity(changes.stock) && quantity(changes.threshold), 'Estoque e alerta precisam ser números inteiros positivos ou zero.');
  assert(money(changes.priceCents) && cost(changes.costCentsUnit), 'Preço ou custo inválido.');
  assert(p.internal || changes.priceCents > 0, 'O preço de venda precisa ser maior que zero.');
  assert(!p.internal || changes.priceCents === 0, 'Embalagens são de uso interno.');
  assert(typeof reason === 'string' && reason.trim().length >= 3, 'Informe o motivo do ajuste.');
  const before = clone(p);
  Object.assign(p, { stock: changes.stock, threshold: changes.threshold, priceCents: changes.priceCents, costCentsUnit: changes.costCentsUnit });
  if (changes.confirmed === true) p.needsReview = false;
  next.adjustments.push({ id: `${id}-${now}-${next.adjustments.length}`, productId: id, name: p.name, at: now, reason: reason.trim().slice(0, 300), before, after: clone(p) });
  return next;
}
export function validateState(s) {
  assert(s && s.schema === SCHEMA && quantity(s.revision) && quantity(s.nextSale) && s.nextSale > 0, 'Formato de backup incompatível.');
  assert(s.updatedAt === null || typeof s.updatedAt === 'string' && Number.isFinite(Date.parse(s.updatedAt)), 'Data do backup inválida.');
  assert(Array.isArray(s.products) && s.products.length === INITIAL_PRODUCTS.length && Array.isArray(s.sales) && Array.isArray(s.adjustments), 'O backup precisa conter os produtos e o histórico da Lili.');
  const ids = new Set();
  for (const p of s.products) {
    const original = INITIAL_PRODUCTS.find(x => x.id === p.id);
    assert(original && !ids.has(p.id) && p.internal === original.internal, 'Produto ausente, repetido ou alterado no backup.');
    ids.add(p.id);
    assert(typeof p.name === 'string' && p.name.length <= 200 && typeof p.category === 'string' && typeof p.sku === 'string' && typeof p.unit === 'string', 'Identificação de produto inválida.');
    assert(quantity(p.stock) && quantity(p.threshold) && money(p.priceCents) && cost(p.costCentsUnit) && typeof p.needsReview === 'boolean', 'Preço ou estoque inválido no backup.');
    assert(p.internal ? p.priceCents === 0 : p.priceCents > 0, 'Preço de produto inválido no backup.');
  }
  const salesIds = new Set(), numbers = new Set();
  for (const sale of s.sales) {
    assert(sale && typeof sale.id === 'string' && !salesIds.has(sale.id) && quantity(sale.number) && sale.number > 0 && sale.number < s.nextSale && !numbers.has(sale.number), 'Venda inválida ou repetida no backup.');
    salesIds.add(sale.id); numbers.add(sale.number);
    assert(Number.isFinite(Date.parse(sale.createdAt)) && PAYMENTS.includes(sale.payment), 'Data ou pagamento inválido no backup.');
    assert(typeof sale.customer === 'string' && typeof sale.note === 'string' && Array.isArray(sale.items) && sale.items.length > 0 && Array.isArray(sale.supplies), 'Detalhes da venda inválidos.');
    if (sale.cancelledAt) assert(Number.isFinite(Date.parse(sale.cancelledAt)) && typeof sale.cancelReason === 'string', 'Cancelamento inválido.');
    const lineIds = new Set();
    for (const [lines, internal] of [[sale.items, false], [sale.supplies, true]]) for (const line of lines) {
      const p = s.products.find(p => p.id === line.id);
      assert(p && p.internal === internal && !lineIds.has(line.id) && quantity(line.qty) && line.qty > 0 && money(line.unitPriceCents) && cost(line.costCentsUnit) && typeof line.name === 'string', 'Item de venda inválido.');
      lineIds.add(line.id);
    }
    const subtotal = sale.items.reduce((a, x) => a + x.qty * x.unitPriceCents, 0);
    assert(money(sale.discountCents) && sale.discountCents <= subtotal && sale.subtotalCents === subtotal && sale.revenueCents === subtotal - sale.discountCents, 'Totais de venda inconsistentes.');
    assert(Number.isFinite(sale.feeRate) && sale.feeRate >= 0 && sale.feeRate <= 100 && sale.feeCents === Math.round(sale.revenueCents * sale.feeRate / 100), 'Taxa de venda inconsistente.');
    assert(sale.cogsCents === Math.round(sale.items.reduce((a, x) => a + x.qty * x.costCentsUnit, 0)) && sale.packagingCents === Math.round(sale.supplies.reduce((a, x) => a + x.qty * x.costCentsUnit, 0)), 'Custos da venda inconsistentes.');
    assert(sale.profitCents === sale.revenueCents - sale.feeCents - sale.cogsCents - sale.packagingCents && money(sale.paidCents) && sale.paidCents >= sale.revenueCents && sale.changeCents === sale.paidCents - sale.revenueCents, 'Resultado ou troco inconsistente.');
  }
  for (const a of s.adjustments) assert(a && ids.has(a.productId) && typeof a.name === 'string' && typeof a.reason === 'string' && Number.isFinite(Date.parse(a.at)) && a.before && a.after && quantity(a.before.stock) && quantity(a.after.stock) && money(a.before.priceCents) && money(a.after.priceCents) && cost(a.before.costCentsUnit) && cost(a.after.costCentsUnit), 'Ajuste de estoque inválido.');
  return clone(s);
}
