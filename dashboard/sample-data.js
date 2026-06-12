/*
 * Synthetic transaction generator for the Decline Intelligence demo.
 *
 * ALL DATA IS SIMULATED. Distribution assumptions (sources: public industry
 * benchmarks, amplified slightly so the demo has visible failure volume):
 *
 *  - Card-funded collection declines: ~8% (industry CNP decline rates commonly
 *    cited 5–15%; cross-border CNP runs at the high end).
 *  - UPI collection failures: ~3% (NPCI publishes monthly technical-decline
 *    rates per bank, commonly 0.5–3%; we include business declines too).
 *  - ACH disbursement returns: ~1.5% (overall ACH return rates are <1%;
 *    amplified for demo visibility, IAT returns trend higher).
 *  - FPS / FAST disbursement rejects: ~1.2% (instant rails reject less but
 *    fail fast on data quality and CoP name-matching).
 *  - Correspondent/ISO leg failures: ~0.8% of all txns (RR* regulatory info,
 *    cut-offs, format errors).
 *
 *  Decline-code mix within each rail is weighted toward the codes that
 *  dominate real reject files (e.g. R01 ≈ 40–50% of ACH returns per NACHA
 *  commentary; "do not honor" is the most common card decline).
 */

// Deterministic PRNG so the demo is reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260611);

function pickWeighted(items, r) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [v, w] of items) { x -= w; if (x <= 0) return v; }
  return items[items.length - 1][0];
}

// Corridor definitions: collection rail mix, disbursement rail, decline rates per leg.
const CORRIDORS = {
  'IN→US': { collection: [['upi', 0.6], ['card', 0.4]], disbursement: 'ach',  collRate: { upi: 0.03, card: 0.08 }, disbRate: 0.018, corrRate: 0.008 },
  'IN→UK': { collection: [['upi', 0.6], ['card', 0.4]], disbursement: 'fps',  collRate: { upi: 0.03, card: 0.08 }, disbRate: 0.012, corrRate: 0.008 },
  'IN→SG': { collection: [['upi', 0.7], ['card', 0.3]], disbursement: 'fast', collRate: { upi: 0.03, card: 0.08 }, disbRate: 0.011, corrRate: 0.007 },
  'US→IN': { collection: [['card', 0.55], ['ach', 0.45]], disbursement: 'upi', collRate: { card: 0.09, ach: 0.015 }, disbRate: 0.022, corrRate: 0.009 },
};

// Decline-code mix per rail per leg role. Weights approximate real-world skew.
const DECLINE_MIX = {
  upi_collection: [['Z9', 22], ['U30', 14], ['ZM', 12], ['U69', 9], ['XY', 8], ['U28', 7], ['U67', 6], ['ZA', 5], ['U29', 5], ['XZ', 4], ['U09', 3], ['K1', 2], ['ZX', 2], ['U16', 1]],
  card_collection: [['05', 28], ['51', 22], ['14', 9], ['54', 8], ['57', 8], ['59', 6], ['61', 5], ['91', 4], ['62', 3], ['65', 3], ['N7', 2], ['41', 1], ['93', 1]],
  ach_collection: [['R01', 45], ['R03', 12], ['R04', 10], ['R02', 8], ['R09', 7], ['R10', 6], ['R13', 5], ['R29', 4], ['R16', 3]],
  ach_disbursement: [['R03', 22], ['R04', 18], ['R02', 14], ['R13', 12], ['R23', 8], ['R16', 6], ['R20', 6], ['R80', 4], ['R82', 4], ['R83', 3], ['R85', 3]],
  fps_disbursement: [['ANNM', 24], ['AC01', 18], ['AC04', 14], ['PANM', 12], ['RC01', 9], ['BE01', 7], ['AG01', 5], ['AC06', 4], ['RR04', 3], ['FRAD', 2], ['AM05', 2]],
  fast_disbursement: [['AC01', 22], ['AC03', 15], ['AC04', 13], ['RC01', 11], ['BE01', 9], ['AG01', 7], ['AM02', 6], ['AC06', 5], ['RR04', 4], ['TM01', 4], ['FF01', 2]],
  upi_disbursement: [['U31', 20], ['XZ', 16], ['U68', 13], ['AC04', 0], ['U29', 12], ['XH', 9], ['U28', 9], ['ZX', 7], ['XC', 6], ['U70', 5], ['U16', 3]],
  iso_correspondent: [['RR04', 18], ['RR03', 14], ['RR01', 12], ['TM01', 11], ['FF01', 10], ['MS03', 9], ['AM03', 7], ['RC01', 6], ['DUPL', 5], ['FRAD', 4], ['AM07', 4]],
};

const TXN_COUNT = 2000;
const DAYS = 30;

function generateTransactions() {
  const txns = [];
  const corridorNames = Object.keys(CORRIDORS);
  // Corridor volume mix: IN→US dominates (matches India outbound remittance/trade skew)
  const corridorWeights = [['IN→US', 0.42], ['IN→UK', 0.22], ['IN→SG', 0.16], ['US→IN', 0.20]];

  for (let i = 0; i < TXN_COUNT; i++) {
    const corridor = pickWeighted(corridorWeights, rand());
    const cfg = CORRIDORS[corridor];
    const day = Math.floor(rand() * DAYS);
    // Log-normal-ish amounts: most $200–$5k, tail to $50k (B2B invoices)
    const amountUSD = Math.round(Math.exp(5.5 + rand() * 2.8 + rand() * 1.2));

    const collectionRail = pickWeighted(cfg.collection, rand());
    const txn = { id: 'TXN' + String(10000 + i), corridor, day, amountUSD, status: 'success', failedLeg: null, rail: null, code: null };

    // Leg 1: collection
    if (rand() < cfg.collRate[collectionRail]) {
      txn.status = 'declined'; txn.failedLeg = 'collection'; txn.rail = collectionRail;
      txn.code = pickWeighted(DECLINE_MIX[collectionRail + '_collection'], rand());
      txns.push(txn); continue;
    }
    // Leg 2: correspondent / regulatory (ISO spine)
    if (rand() < cfg.corrRate) {
      txn.status = 'declined'; txn.failedLeg = 'correspondent'; txn.rail = 'iso20022';
      txn.code = pickWeighted(DECLINE_MIX.iso_correspondent, rand());
      txns.push(txn); continue;
    }
    // Leg 3: disbursement
    if (rand() < cfg.disbRate) {
      const disbRail = cfg.disbursement;
      txn.status = 'declined'; txn.failedLeg = 'disbursement'; txn.rail = disbRail;
      const mix = DECLINE_MIX[disbRail + '_disbursement'].filter(([, w]) => w > 0);
      txn.code = pickWeighted(mix, rand());
      txns.push(txn); continue;
    }
    txns.push(txn);
  }
  return txns;
}

window.SAMPLE_TXNS = generateTransactions();
window.SAMPLE_META = { txnCount: TXN_COUNT, days: DAYS, generated: '2026-06-11', disclaimer: 'All data simulated. Distribution assumptions documented in sample-data.js.' };
