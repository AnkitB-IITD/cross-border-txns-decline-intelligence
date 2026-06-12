/* Decline Intelligence — demo dashboard running on data/taxonomy.json */

const $ = sel => document.querySelector(sel);
const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');
const pct = (a, b) => b ? (100 * a / b) : 0;

let TAX = null;        // code+rail -> taxonomy entry
let TXNS = [];

async function loadTaxonomy() {
  const res = await fetch('../data/taxonomy.json');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const map = {};
  for (const c of data.codes) map[c.rail + ':' + c.code] = c;
  return { map, meta: data.meta, count: data.codes.length };
}

function lookup(t) {
  return TAX.map[t.rail + ':' + t.code] || {
    category: 'technical', retryability: 'retryable_after_fix', owner: 'internal_eng',
    native_description: 'Unmapped code', customer_message: '', iso20022_equivalent: ''
  };
}

const declined = () => TXNS.filter(t => t.status === 'declined');

/* ---------- View 1: Corridor health ---------- */
function renderCorridors() {
  const corridors = [...new Set(TXNS.map(t => t.corridor))];
  const dec = declined();
  $('#kpis').innerHTML = [
    ['Transactions (30d)', TXNS.length.toLocaleString()],
    ['Declined', dec.length.toLocaleString()],
    ['Overall decline rate', pct(dec.length, TXNS.length).toFixed(1) + '%'],
    ['Value at risk', fmtUSD(dec.reduce((s, t) => s + t.amountUSD, 0))],
    ['Recoverable (retryable)', fmtUSD(dec.filter(t => lookup(t).retryability !== 'terminal').reduce((s, t) => s + t.amountUSD, 0))],
  ].map(([l, v]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

  $('#corridor-grid').innerHTML = corridors.map(c => {
    const all = TXNS.filter(t => t.corridor === c);
    const bad = all.filter(t => t.status === 'declined');
    const rate = pct(bad.length, all.length);
    const cls = rate < 4 ? 'ok' : rate < 7 ? 'warn' : 'bad';
    // daily decline-rate sparkline
    const days = 30;
    const daily = Array.from({ length: days }, (_, d) => {
      const dAll = all.filter(t => t.day === d);
      const dBad = dAll.filter(t => t.status === 'declined');
      return pct(dBad.length, dAll.length || 1);
    });
    const max = Math.max(...daily, 1);
    const spark = daily.map(v => `<div style="height:${Math.max(4, 100 * v / max)}%" class="${v > rate * 1.8 && v > 5 ? 'hot' : ''}"></div>`).join('');
    const topLeg = ['collection', 'correspondent', 'disbursement']
      .map(leg => [leg, bad.filter(t => t.failedLeg === leg).length])
      .sort((a, b) => b[1] - a[1])[0];
    return `<div class="corridor-card">
      <h3>${c}</h3>
      <div class="meta">${all.length.toLocaleString()} txns · ${fmtUSD(all.reduce((s, t) => s + t.amountUSD, 0))}</div>
      <div class="rate ${cls}">${rate.toFixed(1)}%</div>
      <div class="meta">decline rate · worst leg: <b>${topLeg[0]}</b> (${topLeg[1]} fails)</div>
      <div class="spark">${spark}</div>
    </div>`;
  }).join('');
}

/* ---------- View 2: Failure drill-down ---------- */
function renderDrilldown() {
  const sel = $('#dd-corridor').value;
  const dec = declined().filter(t => sel === 'all' || t.corridor === sel);
  const totalVal = dec.reduce((s, t) => s + t.amountUSD, 0);

  // by leg
  const legs = ['collection', 'correspondent', 'disbursement'];
  $('#dd-legs').innerHTML = legs.map(leg => {
    const ts = dec.filter(t => t.failedLeg === leg);
    const val = ts.reduce((s, t) => s + t.amountUSD, 0);
    return `<tr><td><b>${leg}</b></td><td class="num">${ts.length}</td>
      <td class="num">${fmtUSD(val)}</td>
      <td><div class="bar-wrap"><div class="bar" style="width:${pct(val, totalVal).toFixed(0)}%"></div></div></td></tr>`;
  }).join('');

  // by category
  const cats = {};
  for (const t of dec) {
    const c = lookup(t).category;
    cats[c] = cats[c] || { n: 0, v: 0 };
    cats[c].n++; cats[c].v += t.amountUSD;
  }
  $('#dd-cats').innerHTML = Object.entries(cats).sort((a, b) => b[1].v - a[1].v).map(([c, s]) =>
    `<tr><td><span class="chip ${c}">${c.replace('_', ' ')}</span></td>
     <td class="num">${s.n}</td><td class="num">${fmtUSD(s.v)}</td>
     <td><div class="bar-wrap"><div class="bar" style="width:${pct(s.v, totalVal).toFixed(0)}%"></div></div></td></tr>`).join('');

  // top culprits: impact = count x value
  const codes = {};
  for (const t of dec) {
    const k = t.rail + ':' + t.code;
    codes[k] = codes[k] || { n: 0, v: 0, t };
    codes[k].n++; codes[k].v += t.amountUSD;
  }
  const top = Object.values(codes).sort((a, b) => b.v - a.v).slice(0, 12);
  $('#dd-codes').innerHTML = top.map(({ n, v, t }) => {
    const m = lookup(t);
    return `<tr>
      <td><b>${t.code}</b><br><span class="chip">${t.rail}</span></td>
      <td>${m.native_description.split('—')[0].trim()}</td>
      <td><span class="chip ${m.category}">${m.category.replace('_', ' ')}</span></td>
      <td><span class="chip ${m.retryability}">${m.retryability.replace(/_/g, ' ')}</span></td>
      <td>${t.failedLeg}</td>
      <td class="num">${n}</td>
      <td class="num"><b>${fmtUSD(v)}</b></td>
      <td>${m.iso20022_equivalent}</td>
    </tr>`;
  }).join('');
}

/* ---------- View 3: Ops routing queue ---------- */
function renderOps() {
  const dec = declined();
  const owners = ['compliance', 'banking_partner', 'merchant_ops', 'internal_eng', 'payer'];
  const OWNER_LABEL = {
    compliance: 'Compliance team', banking_partner: 'Banking partner desk',
    merchant_ops: 'Merchant ops', internal_eng: 'Engineering', payer: 'Customer action needed'
  };
  const SLA_HOURS = { compliance: 24, banking_partner: 48, merchant_ops: 12, internal_eng: 8, payer: 72 };

  $('#queue-grid').innerHTML = owners.map(o => {
    const ts = dec.filter(t => lookup(t).owner === o);
    if (!ts.length) return '';
    const v = ts.reduce((s, t) => s + t.amountUSD, 0);
    const r = ts.filter(t => lookup(t).retryability === 'retryable').length;
    const rf = ts.filter(t => lookup(t).retryability === 'retryable_after_fix').length;
    const term = ts.length - r - rf;
    // SLA mock: deterministic "aging" — items from older days count as breaching
    const breaching = ts.filter(t => t.day < 26).length;
    return `<div class="queue-card">
      <h3>${OWNER_LABEL[o]}</h3>
      <div class="count">${ts.length}</div>
      <div class="val">${fmtUSD(v)} at risk · SLA ${SLA_HOURS[o]}h</div>
      <div class="split">
        <span class="chip retryable">${r} retryable</span>
        <span class="chip retryable_after_fix">${rf} after fix</span>
        <span class="chip terminal">${term} terminal</span>
      </div>
      <div class="sla">SLA breaches (demo aging): <b class="${breaching > ts.length * 0.5 ? 'over' : ''}">${breaching}</b></div>
    </div>`;
  }).join('');

  // Worklist: highest-value actionable items
  const actionable = dec
    .filter(t => lookup(t).retryability !== 'terminal')
    .sort((a, b) => b.amountUSD - a.amountUSD)
    .slice(0, 15);
  $('#ops-list').innerHTML = actionable.map(t => {
    const m = lookup(t);
    return `<tr>
      <td>${t.id}</td><td>${t.corridor}</td><td class="num">${fmtUSD(t.amountUSD)}</td>
      <td><b>${t.code}</b> <span class="chip">${t.rail}</span></td>
      <td><span class="chip ${m.retryability}">${m.retryability.replace(/_/g, ' ')}</span></td>
      <td>${{compliance:'Compliance', banking_partner:'Bank partner', merchant_ops:'Merchant ops', internal_eng:'Engineering', payer:'Customer'}[m.owner]}</td>
      <td style="max-width:340px">${m.customer_message}</td>
    </tr>`;
  }).join('');
}

/* ---------- Tabs + boot ---------- */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  $('#' + id).classList.add('active');
  $('[data-view="' + id + '"]').classList.add('active');
}

async function boot() {
  try {
    TAX = await loadTaxonomy();
  } catch (e) {
    $('#app-error').innerHTML = `<div class="error-box"><b>Could not load ../data/taxonomy.json</b> (${e.message}).
      If you opened this file directly (file://), serve the repo root instead — e.g. <code>npx serve</code> or
      <code>python -m http.server</code> — then open <code>/dashboard/</code>.</div>`;
    return;
  }
  TXNS = window.SAMPLE_TXNS;
  $('#tax-stats').textContent = `taxonomy v${TAX.meta.version} · ${TAX.count} codes · ${Object.keys(TAX.meta.rails).length} rails`;

  const corridors = [...new Set(TXNS.map(t => t.corridor))];
  $('#dd-corridor').innerHTML = '<option value="all">All corridors</option>' +
    corridors.map(c => `<option>${c}</option>`).join('');
  $('#dd-corridor').addEventListener('change', renderDrilldown);

  document.querySelectorAll('nav button').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.view)));

  renderCorridors();
  renderDrilldown();
  renderOps();
}

boot();
