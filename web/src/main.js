import './styles.css';
import { api, DEMO } from './api.js';

const $ = id => document.getElementById(id);
let COMP = [], FEES = {}, REC = {}, STYLES = [], SALES = [], SNAPS = [], ASSUME = {}, SMAP = {}, ME = null, CUR_TAB = 'overview';

function boot() {
const M0 = STYLES.find(s => s.id === (CUR_TAB.startsWith('style:') ? CUR_TAB.slice(6) : 'medium')) || STYLES[0];
const DEF = Object.assign({ style:M0.id, price:M0.target, cost:M0.cost, mrp:M0.mrp, slab:M0.slab, ads:15, returns:8, national:60 }, ASSUME, FEES);
let S = Object.assign({}, DEF);
const fmt = n => Math.round(n).toLocaleString('en-IN');
const INR = v => (v < 0 ? '−' : '') + '₹' + fmt(Math.abs(v));
const PCT = v => Math.round(v) + '%';
const median = a => { a = a.slice().sort((x,y)=>x-y); if (!a.length) return 0; const m = Math.floor(a.length/2); return a.length % 2 ? a[m] : (a[m-1]+a[m])/2; };
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, text) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; };
const row = (tb, cells, cls) => { const tr = document.createElement('tr'); if (cls) tr.className = cls; cells.forEach((c,i) => { const td = document.createElement('td'); if (c instanceof Node) td.appendChild(c); else td.textContent = c; if (i > 0 && !(c instanceof Node) && /^[−₹\d]/.test(String(c))) td.className = 'num'; tr.appendChild(td); }); tb.appendChild(tr); return tr; };

function econ(price, cost = S.cost, slab = S.slab) {
  const netRev = price / (1 + S.gst_output/100);
  const referral = price > S.referral_threshold ? price * S.referral_rate_above/100 : 0;
  const closing = price <= 300 ? S.closing_0_300 : price <= 500 ? S.closing_301_500 : price <= 1000 ? S.closing_501_1000 : S.closing_above_1000;
  const nat = S.national/100;
  const sk = slab === '500g' ? '500g' : slab === '2kg' ? '2kg' : '1kg';
  const wh = nat*S['wh_'+sk+'_national'] + (1-nat)*S['wh_'+sk+'_regional'];
  const r = S.returns/100, ads = price*S.ads/100;
  const profit = (1-r)*(netRev - referral - closing - cost) - wh - S.pick_pack - r*wh - ads;
  return { price, netRev, referral, closing, wh, ads, r, profit };
}
function deadZoneEnd() { const base = econ(S.referral_threshold - 1).profit; let e = S.referral_threshold + 1; while (e < 5000 && econ(e).profit < base) e++; return e; }

function tipBox(host) { const t = document.createElement('div'); t.className = 'tip'; t.hidden = true; host.appendChild(t); return t; }
function showTip(host, tip, ev, lines) { tip.replaceChildren(...lines.map((l,i) => { const d = document.createElement('div'); d.textContent = l; if (!i) d.style.fontWeight = '600'; return d; })); tip.hidden = false; const b = host.getBoundingClientRect(); let x = ev.clientX - b.left + 12, y = ev.clientY - b.top + 12; if (x + tip.offsetWidth > b.width) x = Math.max(0, x - tip.offsetWidth - 24); tip.style.left = x + 'px'; tip.style.top = y + 'px'; }

function drawCurve() {
  const host = $('curve'); host.replaceChildren();
  const W = 560, H = 320, m = {t:16, r:16, b:40, l:60};
  const pts = []; for (let p = 399; p <= 1499; p += 10) pts.push(p); [S.referral_threshold - 1, S.referral_threshold, S.referral_threshold + 1].forEach(p => { if (p > 399 && p < 1499) pts.push(p); });
  const data = Array.from(new Set(pts)).sort((a,b)=>a-b).map(p => ({ price:p, profit:econ(p).profit }));
  const lo = Math.min(0, ...data.map(d=>d.profit)), hi = Math.max(50, ...data.map(d=>d.profit));
  const x = p => m.l + (p-399)/(1499-399)*(W-m.l-m.r), y = v => H-m.b - (v-lo)/(hi-lo)*(H-m.t-m.b);
  const svg = el('svg', {viewBox:`0 0 ${W} ${H}`, role:'img', 'aria-label':'Profit per order shipped at selling prices from 399 to 1,499 rupees'});
  const step = Math.max(50, Math.ceil((hi-lo)/5/50)*50);
  for (let v = Math.ceil(lo/step)*step; v <= hi; v += step) { svg.appendChild(el('line', {x1:m.l, x2:W-m.r, y1:y(v), y2:y(v), stroke: v === 0 ? '#9aa1a9' : '#e6e9ec'})); svg.appendChild(el('text', {x:m.l-8, y:y(v)+4, 'text-anchor':'end'}, INR(v))); }
  [499,699,899,1099,1299,1499].forEach(p => svg.appendChild(el('text', {x:x(p), y:H-m.b+16, 'text-anchor':'middle'}, INR(p))));
  svg.appendChild(el('text', {x:(m.l+W-m.r)/2, y:H-4, 'text-anchor':'middle'}, 'Selling price'));
  svg.appendChild(el('path', {d: data.map((d,i) => (i ? 'L' : 'M') + x(d.price).toFixed(1) + ' ' + y(d.profit).toFixed(1)).join(' '), fill:'none', stroke:'#1f6f8b', 'stroke-width':2}));
  if (S.price >= 399 && S.price <= 1499) { const e = econ(S.price); svg.appendChild(el('circle', {cx:x(S.price), cy:y(e.profit), r:5, fill:'#1f6f8b', stroke:'#fff', 'stroke-width':2})); svg.appendChild(el('text', {x:Math.min(W-m.r-50, Math.max(m.l+50, x(S.price))), y:y(e.profit)-10, 'text-anchor':'middle'}, INR(S.price) + ' → ' + INR(e.profit))); }
  const hover = el('circle', {r:4, fill:'#1f2328', visibility:'hidden'}); svg.appendChild(hover);
  const hit = el('rect', {x:m.l, y:m.t, width:W-m.l-m.r, height:H-m.t-m.b, fill:'transparent'}); svg.appendChild(hit);
  host.appendChild(svg); const tip = tipBox(host);
  hit.addEventListener('pointermove', ev => { const b = svg.getBoundingClientRect(); const px = 399 + ((ev.clientX-b.left)/b.width*W - m.l)/(W-m.l-m.r)*(1499-399); const d = data.reduce((a,c) => Math.abs(c.price-px) < Math.abs(a.price-px) ? c : a); hover.setAttribute('cx', x(d.price)); hover.setAttribute('cy', y(d.profit)); hover.setAttribute('visibility','visible'); showTip(host, tip, ev, ['Sell at ' + INR(d.price), 'Profit per order: ' + INR(d.profit), d.price > S.referral_threshold ? S.referral_rate_above + '% referral fee applies' : 'No referral fee']); });
  hit.addEventListener('pointerleave', () => { tip.hidden = true; hover.setAttribute('visibility','hidden'); });
}

const SM = id => SMAP[id] || { market: 'tote', peers: 'Design-led canvas' };
const MKT = () => SM(S.style).market;
const recFor = id => (REC && REC[id] && typeof REC[id] === 'object') ? REC[id] : null;
const segOf = id => { const sm = SM(id); const all = COMP.filter(c => c.market === sm.market); const seg = all.filter(c => c.segment === sm.peers); return seg.length ? seg : all; };
const peersOf = id => { const sm = SM(id), seg = segOf(id); if (!sm.size) return seg; const sized = seg.filter(c => c.size_class === sm.size); return sized.length ? sized : seg; };
const CM = () => COMP.filter(c => c.market === MKT());
const SEG = {'Nylon / polyester pouch':'#1f6f8b', 'Cotton / canvas pouch':'#3f8f5a', 'Premium pouch':'#7a5aa6', 'Mass canvas tote':'#1f6f8b', 'Lunch / small hand-carry':'#c9772b', 'Design-led canvas':'#3f8f5a', 'Premium':'#7a5aa6'};
function drawMap() {
  const host = $('map'); host.replaceChildren();
  const W = 1000, H = 360, m = {t:16, r:16, b:40, l:70};
  const x = p => m.l + (Math.log(p)-Math.log(200))/(Math.log(4000)-Math.log(200))*(W-m.l-m.r);
  const levels = [0,50,100,200,300], y = u => H-m.b-20 - levels.indexOf(u)/(levels.length-1)*(H-m.t-m.b-40);
  const svg = el('svg', {viewBox:`0 0 ${W} ${H}`, role:'img', 'aria-label':'Comparable Amazon.in tote listings by selling price and monthly sales badge'});
  levels.forEach(u => { svg.appendChild(el('line', {x1:m.l, x2:W-m.r, y1:y(u), y2:y(u), stroke:'#e6e9ec'})); svg.appendChild(el('text', {x:m.l-8, y:y(u)+4, 'text-anchor':'end'}, u ? u + '+' : 'No badge')); });
  [200,300,500,700,1000,1500,2500,4000].forEach(p => svg.appendChild(el('text', {x:x(p), y:H-m.b+16, 'text-anchor':'middle'}, INR(p))));
  svg.appendChild(el('text', {x:(m.l+W-m.r)/2, y:H-4, 'text-anchor':'middle'}, 'Selling price (log scale)'));
  const mkb = marketOf(S.style); const rc = mkb.ps.length ? { low: mkb.ps[0], high: mkb.ps[mkb.ps.length - 1] } : null; if (rc) svg.appendChild(el('rect', {x:x(rc.low), width:x(rc.high)-x(rc.low), y:m.t, height:H-m.b-m.t, fill:'#9aa1a9', opacity:0.2}));
  const th = Math.min(4000, Math.max(300, S.referral_threshold)); svg.appendChild(el('line', {x1:x(th), x2:x(th), y1:m.t, y2:H-m.b, stroke:'#5f6771', 'stroke-dasharray':'4 4'}));
  host.appendChild(svg); const tip = tipBox(host);
  CM().forEach((d,i) => { const c = el('circle', {cx:x(d.price), cy:y(d.units_badge) + ((i*37)%21) - 10, r:4 + Math.sqrt(d.reviews/9000)*12, fill:SEG[d.segment], 'fill-opacity':0.7, stroke:'#fff'}); c.addEventListener('pointermove', ev => showTip(host, tip, ev, [d.brand + ' — ' + d.product, INR(d.price) + ' (MRP ' + INR(d.mrp) + ', ' + d.discount_pct + '% off)', d.rating.toFixed(1) + ' stars, ' + fmt(d.reviews) + ' reviews', d.units_badge ? d.units_badge + '+ bought in past month' : 'No sales badge'])); c.addEventListener('pointerleave', () => { tip.hidden = true; }); svg.appendChild(c); });
}

function render() {
  const e = econ(S.price), dead = deadZoneEnd();
  $('t-dead').textContent = INR(dead);
  const SLAB = {'500g':'Up to 500 g', '1kg':'500 g to 1 kg', '2kg':'1 to 2 kg'};
  const st = $('styles'); st.replaceChildren(); const ledeParts = [];
  STYLES.forEach(s => { const cur = s.id === S.style; const cost = cur ? S.cost : s.cost, target = cur ? S.price : s.target, slab = cur ? S.slab : s.slab, mrp = cur ? S.mrp : s.mrp;
    const p = econ(target, cost, slab).profit; const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Open'; btn.addEventListener('click', () => showTab('style:' + s.id));
    const tr = row(st, [s.name, s.size, INR(cost), INR(target), SLAB[slab], INR(p), PCT(p/target*100), INR(econ(target+100, cost, slab).profit), INR(econ(999, cost, slab).profit), INR(mrp), PCT((1-target/mrp)*100), btn]); if (cur) tr.className = 'total';
    ledeParts.push(INR(p) + ' on the ' + s.name + ' at ' + INR(target)); });
  $('lede').textContent = 'At your target prices, each order shipped leaves ' + ledeParts.join(', ') + ', after Amazon fees, GST, ads, returns and product cost.';
  $('cur-style').textContent = STYLES.find(s => s.id === S.style).name;
  renderRec();
  const peers = peersOf(S.style); $('m-rivalmrp').textContent = INR(median(peers.map(c => c.mrp))); $('m-rivaldisc').textContent = PCT(median(peers.map(c => c.discount_pct)));
  $('legend-tote').hidden = MKT() !== 'tote'; $('legend-toiletry').hidden = MKT() === 'tote';
  const tb = $('econ'); tb.replaceChildren();
  const retCost = e.r*(e.netRev - e.referral - e.closing - S.cost) + e.r*e.wh;
  [['Selling price', e.price], ['GST included in price', -(e.price - e.netRev)], ['Referral fee', -e.referral], ['Closing fee', -e.closing], ['Weight handling', -e.wh], ['Pick and pack', -S.pick_pack], ['Ad spend', -e.ads], ['Product cost', -S.cost], ['Returns (lost sales and return shipping, net of cost recovered)', -retCost]].forEach(([l,v]) => row(tb, [l, INR(v)]));
  const tr = row(tb, ['Profit per order shipped', INR(e.profit)], 'total'); tr.lastChild.classList.add(e.profit < 0 ? 'bad' : 'good');
  row(tb, ['Profit as % of selling price', PCT(e.profit/e.price*100)]);
  $('callout').textContent = 'For this style, ₹499 leaves ' + INR(econ(499).profit) + ' per order, ₹699 leaves ' + INR(econ(699).profit) + ', ₹799 leaves ' + INR(econ(799).profit) + ' and ₹999 leaves ' + INR(econ(999).profit) + '. At ₹1,099 it falls back to ' + INR(econ(1099).profit) + '.';
  const bt = $('bands'); bt.replaceChildren();
  [['₹200 to 299',200,299],['₹300 to 449',300,449],['₹450 to 599',450,599],['₹600 to 799',600,799],['₹800 to 999',800,999],['₹1,000 to 1,499',1000,1499],['₹1,500 and above',1500,1e9]].forEach(([b,lo,hi]) => { const s = CM().filter(c => c.price >= lo && c.price <= hi); if (!s.length) return; row(bt, [b, String(s.length), String(s.filter(c => c.units_badge > 0).length), fmt(s.reduce((t,c) => t + c.units_badge, 0)), INR(median(s.map(c => c.mrp))), PCT(median(s.map(c => c.discount_pct)))]); });
  const mt = $('mrpgrid'); mt.replaceChildren();
  Array.from(new Set([1299,1499,1699,1999,S.mrp])).sort((a,b)=>a-b).forEach(mrp => row(mt, [INR(mrp), ...[699,799,899,999].map(p => PCT((1 - p/mrp)*100))]));
  drawCurve(); drawMap(); fillComps(); renderDemand(); renderSales(); renderSnaps();
}
function fillComps() { const tb = $('comps'); tb.replaceChildren(); CM().sort((a,b) => b.units_badge - a.units_badge || a.price - b.price).forEach(c => { const a = document.createElement('a'); a.textContent = c.product; a.href = c.url; a.target = '_blank'; a.rel = 'noopener'; row(tb, [c.brand, a, c.segment, c.size_class ? c.size_class + (c.dims_cm ? ' (' + c.dims_cm + ' cm)' : '') : '', c.closure || '', INR(c.price), INR(c.mrp), c.discount_pct + '%', c.rating.toFixed(1), fmt(c.reviews), c.units_badge ? c.units_badge + '+' : 'No badge', c.bsr ? '#' + fmt(c.bsr) : '']); }); }
function loadStyle(id) { const s = STYLES.find(x => x.id === id); S.style = id; S.price = s.target; S.cost = s.cost; S.slab = s.slab; S.mrp = s.mrp; syncInputs(); render(); }
function syncInputs() { document.querySelectorAll('[data-k]').forEach(i => { i.value = S[i.dataset.k]; }); }
document.querySelectorAll('[data-k]').forEach(i => i.oninput = (() => { const k = i.dataset.k; if (k === 'slab') S.slab = i.value; else { const v = Number(i.value); if (i.value === '' || !Number.isFinite(v) || v < 0) return; S[k] = v; } ['savemsg', 'savemsg2'].forEach(id => { $(id).textContent = ''; }); render(); }));
$('s-style').replaceChildren(...STYLES.map(s => new Option(s.name, s.id)));
$('reset').onclick = () => { S = Object.assign({}, DEF); syncInputs(); render(); };


function demandFit() {
  const s = STYLES.find(x => x.id === S.style), ref = s.target, cost = S.cost, slab = S.slab;
  const obs = SALES.filter(r => r.style === s.id && r.sessions > 0).map(r => ({ e: r.list_price * (1 - (r.coupon_pct || 0) / 100), n: r.sessions, k: Math.min(r.sessions, r.units) }));
  const G = 40, grid = [];
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const c0 = 0.005 * Math.pow(40, i / (G - 1)), elx = 0.2 * Math.pow(25, j / (G - 1));
    let lw = -Math.pow(Math.log(c0 / 0.04), 2) / 0.98 - Math.pow(Math.log(elx / 1.8), 2) / 0.5;
    obs.forEach(r => { const q = Math.min(0.5, c0 * Math.pow(r.e / ref, -elx)); lw += r.k * Math.log(q) + (r.n - r.k) * Math.log(1 - q); });
    grid.push({ c0, el: elx, lw });
  }
  const mx = Math.max(...grid.map(g => g.lw)); let tot = 0;
  grid.forEach(g => { g.w = Math.exp(g.lw - mx); tot += g.w; }); grid.forEach(g => { g.w /= tot; });
  const mean = fn => grid.reduce((t, g) => t + g.w * fn(g), 0);
  const quant = (fn, q) => { const a = grid.map(g => [fn(g), g.w]).sort((x, y) => x[0] - y[0]); let c = 0; for (const [v, w] of a) { c += w; if (c >= q) return v; } return a[a.length - 1][0]; };
  const levels = []; for (let e = 399; e < 1000; e += 50) if (e >= ref - 150) levels.push({ e, profit: econ(e, cost, slab).profit + e * S.ads / 100, conv: g => Math.min(0.5, g.c0 * Math.pow(e / ref, -g.el)), pbest: 0 });
  grid.forEach(g => { let b = levels[0], bv = -Infinity; levels.forEach(l => { const v = l.conv(g) * l.profit; if (v > bv) { bv = v; b = l; } }); b.pbest += g.w; });
  const near = x => levels.reduce((a, b) => (Math.abs(b.e - x) < Math.abs(a.e - x) ? b : a));
  const tested = l => obs.some(r => Math.abs(r.e - l.e) <= 25);
  const untested = [near(ref), near(Math.min(999, ref + 100)), near(ref - 50)].find(l => !tested(l));
  const best = levels.reduce((a, b) => (b.pbest > a.pbest ? b : a));
  return { s, ref, obs, levels, mean, quant, next: untested || best };
}
function renderDemand() {
  const m = demandFit();
  $('d-style').textContent = m.s.name; $('d-weeks').textContent = m.obs.length; $('d-sessions').textContent = fmt(m.obs.reduce((t, r) => t + r.n, 0)); $('d-units').textContent = fmt(m.obs.reduce((t, r) => t + r.k, 0));
  $('d-el').textContent = m.mean(g => g.el).toFixed(1); $('d-ello').textContent = m.quant(g => g.el, 0.1).toFixed(1); $('d-elhi').textContent = m.quant(g => g.el, 0.9).toFixed(1); $('d-next').textContent = INR(m.next.e);
  const tb = $('dlevels'); tb.replaceChildren();
  m.levels.forEach(l => { const v = g => l.conv(g) * l.profit * 1000; const tr = row(tb, [INR(l.e) + (Math.abs(l.e - m.ref) <= 25 ? ' (target)' : ''), (m.mean(l.conv) * 100).toFixed(1) + '%', INR(l.profit), INR(m.mean(v)), INR(m.quant(v, 0.1)), INR(m.quant(v, 0.9)), PCT(l.pbest * 100)]); tr.querySelectorAll('td').forEach((td, i) => { if (i) td.className = 'num'; }); });
}
function renderSnaps() { const tb = $('snaps'); tb.replaceChildren(); SNAPS.slice().sort((a, b) => (a.week_start < b.week_start ? 1 : a.week_start > b.week_start ? -1 : a.market.localeCompare(b.market))).forEach(r => row(tb, [r.week_start, r.segment, String(r.listings), String(r.with_badge), fmt(r.units_min), INR(r.median_price), INR(r.median_mrp), r.median_discount_pct + '%'])); }
function renderSales() {
  const tb = $('sales'); tb.replaceChildren();
  if (!SALES.length) { const tr = row(tb, ['No sales weeks yet. Add the first one below.']); tr.firstChild.colSpan = 10; tr.firstChild.className = 'muted'; }
  SALES.slice().sort((a, b) => (a.week_start < b.week_start ? 1 : -1)).forEach(r => {
    const act = document.createElement('span');
    const ed = document.createElement('button'); ed.type = 'button'; ed.textContent = 'Edit'; ed.onclick = () => { $('s-week').value = r.week_start; $('s-style').value = r.style; $('s-price').value = r.list_price; $('s-coupon').value = r.coupon_pct || 0; $('s-sessions').value = r.sessions; $('s-units').value = r.units; $('s-ads').value = r.ad_spend || 0; $('s-week').focus(); };
    act.appendChild(ed);
    if (ME.role === 'admin') { const del = document.createElement('button'); del.type = 'button'; del.textContent = 'Delete'; del.style.marginLeft = '6px'; let armed = false; del.onclick = async () => { if (!armed) { armed = true; del.textContent = 'Confirm delete'; return; } try { await api.deleteSale(r.week_start, r.style); await reload('Week deleted.'); } catch (x) { saleMsg(x.message, false); } }; act.appendChild(del); }
    row(tb, [r.week_start, (STYLES.find(s => s.id === r.style) || { name: r.style }).name, INR(r.list_price), (r.coupon_pct || 0) + '%', fmt(r.sessions), fmt(r.units), INR(r.ad_spend || 0), r.sessions ? (r.units / r.sessions * 100).toFixed(1) + '%' : '', r.source || '', act]);
  });
}
function saleMsg(text, ok) { $('salemsg').textContent = text; $('salemsg').className = 'msg' + (ok ? ' ok' : ''); }
async function reload(msg) { const d = await api.loadAll(); SALES = d.sales; SNAPS = d.snapshots; render(); if (msg) saleMsg(msg, true); }
$('s-save').onclick = async () => {
  const n = id => Number($(id).value), w = $('s-week').value;
  if (!w || !(n('s-price') > 0) || $('s-sessions').value === '' || $('s-units').value === '') return saleMsg('Fill in week, list price, sessions and units.', false);
  if (new Date(w + 'T00:00:00Z').getUTCDay() !== 1) return saleMsg('Week must start on a Monday.', false);
  if (n('s-units') > n('s-sessions')) return saleMsg('Units cannot exceed sessions.', false);
  try { await api.saveSale({ week_start: w, style: $('s-style').value, list_price: n('s-price'), coupon_pct: n('s-coupon') || 0, sessions: n('s-sessions'), units: n('s-units'), ad_spend: n('s-ads') || 0, source: 'Entered by ' + ME.name }); await reload('Week saved.'); } catch (x) { saleMsg(x.message, false); }
};
$('savedef').hidden = ME.role !== 'admin';
$('team-section').hidden = ME.role !== 'admin';
async function renderTeam() {
  if (ME.role !== 'admin') return;
  const tb = $('team'); const rows = await api.team(); tb.replaceChildren();
  rows.forEach(r => { const b = document.createElement('button'); b.type = 'button'; b.textContent = r.approved ? 'Remove access' : 'Approve'; if (!r.approved) b.className = 'primary'; b.disabled = r.role === 'admin';
    b.onclick = async () => { try { await api.setApproved(r.id, !r.approved); await renderTeam(); } catch (x) { $('teammsg').textContent = x.message; } };
    row(tb, [r.display_name, r.role, r.approved ? 'Approved' : 'Waiting for approval', b]); });
}
renderTeam().catch(x => { $('teammsg').textContent = x.message; });
$('savedef').onclick = async () => {
  const fees = {}; Object.keys(FEES).forEach(k => { fees[k] = S[k]; });
  try { await api.saveDefaults({ fees, assumptions: { ads: S.ads, returns: S.returns, national: S.national }, style: { id: S.style, cost: S.cost, target: S.price, slab: S.slab, mrp: S.mrp } }); $('savemsg').textContent = 'Saved for the whole team.'; $('savemsg').className = 'msg ok'; await start(); } catch (x) { $('savemsg').textContent = x.message; $('savemsg').className = 'msg'; }
};


const to99 = x => Math.max(49, Math.round((x + 1) / 50) * 50 - 1);
function marketOf(id) {
  const sm = SM(id), peers = peersOf(id), strong = peers.filter(c => c.units_badge >= 100);
  const ps = strong.map(c => c.price).sort((a, b) => a - b);
  return { sm, peers, strong, ps, price: ps.length ? to99(median(ps)) : null, disc: strong.length ? median(strong.map(c => c.discount_pct)) : null };
}
function renderRec() {
  const s = STYLES.find(x => x.id === S.style), mk = marketOf(S.style), sm = mk.sm;
  const cost = S.cost, slab = S.slab, target = S.price, profitAt = x => econ(x, cost, slab).profit;
  const group = (mk.peers.length && mk.peers.every(c => c.segment === sm.peers) ? sm.peers.toLowerCase() : 'all tracked listings') + ' among ' + (sm.market === 'toiletry' ? 'toiletry bags and pouches' : 'totes');
  $('rec-style').textContent = s.name;
  const seg = segOf(S.style), sized = sm.size && mk.peers.length < seg.length;
  $('rec-peers').textContent = 'Closest rivals: ' + (sized ? sm.size + '-size ' : '') + group + (sized ? ' (' + mk.peers.length + ' of ' + seg.length + '; size taken from the dimensions each seller entered, ' + seg.filter(c => !c.size_class || c.size_class === 'unclear').length + ' left out because their dimensions are missing or implausible)' : '') + ', read from Amazon.in. Every figure in this section is calculated from those listings and from the price, cost and assumptions currently on this page.';
  $('r-count').textContent = mk.strong.length; $('r-total').textContent = mk.peers.length;
  $('r-target').textContent = INR(target);
  const launch = to99(target * 0.9), pl = profitAt(launch), pt = profitAt(target);
  $('r-launch').textContent = INR(launch);
  $('r-launch-why').textContent = 'about 10% under your target of ' + INR(target) + ' for the first 30 to 60 days, to win early reviews. Leaves ' + INR(pl) + ' an order' + (pl <= 0 ? ', so it is not advised' : '') + '.';
  if (!mk.ps.length) {
    $('r-range').textContent = 'No data'; $('r-market').textContent = 'No data'; $('r-disc').textContent = 'No data'; $('r-mrp-why').textContent = ''; $('r-gap').textContent = 'no rivals selling 100+ a month to compare with';
    $('rec-note').textContent = 'None of the tracked rivals for this style shows 100 or more sales a month, so there is no market price to compare your target with. At your target of ' + INR(target) + ' an order leaves ' + INR(pt) + '.';
  } else {
    const d = target - mk.price, pm = profitAt(mk.price);
    $('r-range').textContent = INR(mk.ps[0]) + ' to ' + INR(mk.ps[mk.ps.length - 1]);
    $('r-market').textContent = INR(mk.price);
    $('r-gap').textContent = d === 0 ? 'the same as the market price' : INR(Math.abs(d)) + (d < 0 ? ' below' : ' above') + ' the market price of ' + INR(mk.price);
    $('r-disc').textContent = PCT(mk.disc);
    const mrpNeed = to99(target / (1 - mk.disc / 100));
    $('r-mrp-why').textContent = 'off MRP. Your MRP of ' + INR(S.mrp) + ' shows ' + PCT((1 - target / S.mrp) * 100) + ' at your target; an MRP of ' + INR(mrpNeed) + ' would match the rivals.';
    $('rec-note').textContent = mk.strong.length + ' of the ' + mk.peers.length + ' closest rivals show 100 or more sales a month. They charge ' + INR(mk.ps[0]) + ' to ' + INR(mk.ps[mk.ps.length - 1]) + ', with a middle price of ' + INR(mk.price) + '. Your target of ' + INR(target) + ' is ' + (d === 0 ? 'the same as that' : INR(Math.abs(d)) + (d < 0 ? ' below that' : ' above that')) + '. At your target an order leaves ' + INR(pt) + (d === 0 ? '.' : '; at the market price it would ' + (pm < 0 ? 'lose ' + INR(Math.abs(pm)) : 'leave ' + INR(pm)) + '.');
  }
  const withClosure = mk.peers.filter(c => c.closure), zips = withClosure.filter(c => /zip/i.test(c.closure)).length;
  const feat = withClosure.length ? zips + ' of these ' + withClosure.length + ' rivals close with a zip. ' : '';
  $('rec-caveat').textContent = 'Caution: ' + feat + (sm.market === 'toiletry'
    ? 'These rivals are cotton and canvas pouches; nylon organisers sell in far higher volume and are a different product. '
    : (sized ? 'Sizes come from seller-entered dimensions, which are often wrong, and the group is small. ' : 'Rivals are not sorted by size. ')) + 'A middle price says what rivals charge, not what shoppers would pay for this bag.';
}
function showTab(key) {
  if (key !== CUR_TAB) ['savemsg', 'savemsg2', 'addmsg'].forEach(id => { $(id).textContent = ''; });
  CUR_TAB = key;
  const panel = key.startsWith('style:') ? 'style' : key;
  if (panel === 'style' && S.style !== key.slice(6)) loadStyle(key.slice(6));
  document.querySelectorAll('[data-tab]').forEach(d => { d.hidden = d.dataset.tab !== panel; });
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.key === key));
  window.scrollTo(0, 0);
}
function buildTabs() {
  const defs = [['overview', 'Overview'], ...STYLES.map(s => ['style:' + s.id, s.name]), ['assumptions', 'Assumptions'], ['weaknesses', 'Weaknesses']];
  $('tabs').replaceChildren(...defs.map(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.key = k; b.textContent = label; b.onclick = () => showTab(k); return b; }));
  if (!defs.some(d => d[0] === CUR_TAB)) CUR_TAB = 'overview';
}
$('savedef2').hidden = ME.role !== 'admin';
$('savedef2').onclick = async () => { await $('savedef').onclick(); $('savemsg2').textContent = $('savemsg').textContent; $('savemsg2').className = $('savemsg').className; };
$('addstyle-section').hidden = ME.role !== 'admin';
$('a-save').onclick = async () => {
  const name = $('a-name').value.trim(), n = id => Number($(id).value), msg = (t, ok) => { $('addmsg').textContent = t; $('addmsg').className = 'msg' + (ok ? ' ok' : ''); };
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id || $('a-cost').value === '' || !(n('a-target') > 0) || !(n('a-mrp') > 0)) return msg('Fill in name, cost, target price and MRP.', false);
  if (STYLES.some(s => s.id === id)) return msg('A style with that name already exists.', false);
  if (n('a-mrp') < n('a-target')) return msg('MRP cannot be below the target price.', false);
  const market = $('a-market').value;
  try { await api.addStyle({ id, name, size: $('a-size').value.trim(), cost: n('a-cost'), target: n('a-target'), slab: $('a-slab').value, mrp: n('a-mrp'), sort: STYLES.length + 1 }, { market, peers: market === 'toiletry' ? 'Cotton / canvas pouch' : 'Design-led canvas', ...(market === 'tote' && $('a-sizeclass').value ? { size: $('a-sizeclass').value } : {}) }); CUR_TAB = 'style:' + id; await start(); } catch (x) { msg(x.message, false); }
};
buildTabs();
syncInputs(); render(); showTab(CUR_TAB);
}

async function start() {
  ME = await api.me();
  $('login').hidden = !!ME; $('pending').hidden = !(ME && !ME.approved); $('app').hidden = !(ME && ME.approved); $('demo-note').hidden = !DEMO;
  if (!ME || !ME.approved) return;
  $('who').textContent = ME.name + ' (' + ME.role + ')' + (DEMO ? ' · demo mode' : '');
  const d = await api.loadAll();
  COMP = d.competitors; FEES = d.fees; REC = d.recommendation; STYLES = d.styles; SALES = d.sales; SNAPS = d.snapshots; ASSUME = d.assumptions; SMAP = d.style_market || {};
  if (!STYLES.length) { $('app').textContent = 'No bag styles are set up yet. Ask the admin to run the setup.'; return; }
  boot();
}
$('login').addEventListener('submit', async (e) => {
  e.preventDefault(); $('loginmsg').textContent = '';
  try { await api.signIn($('email').value.trim(), $('password').value); $('password').value = ''; await start(); } catch (x) { $('loginmsg').textContent = x.message; }
});
$('signout').addEventListener('click', async () => { await api.signOut(); location.reload(); });
$('signout2').addEventListener('click', async () => { await api.signOut(); location.reload(); });
start().catch((x) => { $('login').hidden = false; $('loginmsg').textContent = x.message; });
