import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO } from './config.js';
import seed from './seed.json';

const sb = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const demo = { user: null, data: JSON.parse(JSON.stringify(seed)) };

export const api = {
  async me() {
    if (DEMO) return demo.user;
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    const p = must(await sb.from('profiles').select('role,display_name,approved').eq('id', data.session.user.id).maybeSingle());
    return { email: data.session.user.email, role: p ? p.role : 'member', name: p ? p.display_name : data.session.user.email, approved: !!(p && p.approved) };
  },
  async signIn(email, password) {
    if (DEMO) { demo.user = { email: email || 'demo', role: 'admin', name: 'Demo admin', approved: true }; return; }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  async signOut() { if (DEMO) { demo.user = null; return; } await sb.auth.signOut(); },
  async loadAll() {
    if (DEMO) return JSON.parse(JSON.stringify(demo.data));
    const [styles, settings, competitors, snapshots, sales] = await Promise.all([
      sb.from('styles').select('*').order('sort'), sb.from('settings').select('key,value'),
      sb.from('competitors').select('*'), sb.from('snapshots').select('*'), sb.from('sales').select('*').order('week_start'),
    ]).then((r) => r.map(must));
    const kv = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const n = (rows, keys) => rows.map((r) => { const o = { ...r }; keys.forEach((k) => { if (o[k] !== null && o[k] !== undefined) o[k] = Number(o[k]); }); return o; });
    return {
      styles: n(styles, ['cost', 'target', 'mrp']), fees: kv.fees || {}, assumptions: kv.assumptions || {}, recommendation: kv.recommendation || {}, style_market: kv.style_market || {},
      competitors: n(competitors, ['price', 'mrp', 'discount_pct', 'rating', 'reviews', 'units_badge']),
      snapshots: n(snapshots, ['listings', 'with_badge', 'units_min', 'median_price', 'median_mrp', 'median_discount_pct']),
      sales: n(sales, ['list_price', 'coupon_pct', 'sessions', 'units', 'ad_spend']),
    };
  },
  async team() {
    if (DEMO) return [{ id: 'demo', display_name: 'Demo admin', role: 'admin', approved: true }];
    return must(await sb.from('profiles').select('id,display_name,role,approved,created_at').order('created_at'));
  },
  async setApproved(id, approved) {
    if (DEMO) return;
    must(await sb.from('profiles').update({ approved }).eq('id', id));
  },
  async addStyle(style, map) {
    if (DEMO) { demo.data.styles.push(style); demo.data.style_market = { ...(demo.data.style_market || {}), [style.id]: map }; return; }
    must(await sb.from('styles').insert(style));
    const cur = must(await sb.from('settings').select('value').eq('key', 'style_market').maybeSingle());
    must(await sb.from('settings').upsert({ key: 'style_market', value: { ...((cur && cur.value) || {}), [style.id]: map }, updated_at: new Date().toISOString() }, { onConflict: 'key' }));
  },
  async saveSale(row) {
    if (DEMO) { demo.data.sales = demo.data.sales.filter((r) => !(r.week_start === row.week_start && r.style === row.style)).concat([row]); return; }
    must(await sb.from('sales').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'week_start,style' }));
  },
  async deleteSale(week_start, style) {
    if (DEMO) { demo.data.sales = demo.data.sales.filter((r) => !(r.week_start === week_start && r.style === style)); return; }
    must(await sb.from('sales').delete().eq('week_start', week_start).eq('style', style));
  },
  async saveDefaults({ fees, assumptions, style }) {
    if (DEMO) { demo.data.fees = fees; demo.data.assumptions = assumptions; demo.data.styles = demo.data.styles.map((s) => (s.id === style.id ? { ...s, ...style } : s)); return; }
    const at = new Date().toISOString();
    must(await sb.from('settings').upsert([{ key: 'fees', value: fees, updated_at: at }, { key: 'assumptions', value: assumptions, updated_at: at }], { onConflict: 'key' }));
    must(await sb.from('styles').update({ cost: style.cost, target: style.target, slab: style.slab, mrp: style.mrp }).eq('id', style.id));
  },
};
export { DEMO };
