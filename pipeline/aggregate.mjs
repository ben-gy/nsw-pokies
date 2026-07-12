// Aggregate NSW gaming-machine (pokies) XLSX reports into the site's data file.
// Reads raw XLSX from pipeline/raw/ and a simplified LGA GeoJSON, writes:
//   public/data/pokies.json   (all metrics, per-LGA + statewide trend + insights)
//   public/data/nsw_lga.json  (copied simplified boundaries)
// Run after collect.mjs. Pure Node (xlsx dependency only).
import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(__dirname, 'raw');
const OUT = path.join(ROOT, 'public', 'data');

// NSW resident share aged 18+ (ABS Estimated Resident Population, 2023). Used to
// convert the LGA population supplied in the reports into an adult denominator.
const ADULT_SHARE = 0.79;

// ---- XLSX parsing ---------------------------------------------------------
function parseFile(file) {
  const wb = XLSX.readFile(path.join(RAW, file));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  let h = -1;
  for (let i = 0; i < rows.length; i++) {
    const c0 = String(rows[i][0] || '').toLowerCase();
    const c1 = String(rows[i][1] || '').toLowerCase();
    if (c0.includes('local government area') && c1.includes('net profit')) { h = i; break; }
  }
  if (h < 0) throw new Error('No header row found in ' + file);
  const hdr = rows[h].map((x) => String(x || '').replace(/\s+/g, ' ').trim().toLowerCase());
  const popCol = hdr.findIndex((x) => x.includes('population'));
  const out = [];
  for (let i = h + 1; i < rows.length; i++) {
    const raw0 = String(rows[i][0] || '');
    const label = raw0.replace(/\s+/g, ' ').trim();
    if (!label) continue;
    if (/^total/i.test(label) || label.includes('final_report_df')) break;
    if (typeof rows[i][1] !== 'number') continue;
    out.push({
      label,
      members: raw0.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      netProfit: rows[i][1],
      tax: typeof rows[i][2] === 'number' ? rows[i][2] : 0,
      egm: typeof rows[i][3] === 'number' ? rows[i][3] : 0,
      premises: typeof rows[i][4] === 'number' ? rows[i][4] : 0,
      population: popCol >= 0 && typeof rows[i][popCol] === 'number' ? rows[i][popCol] : null,
    });
  }
  return out;
}

const sum = (arr, k) => arr.reduce((a, r) => a + (r[k] || 0), 0);
const areaKey = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- Statewide trend ------------------------------------------------------
// Each earlier year = two half-year reports; FY23-24 & FY24-25 = annual files.
const periodDefs = [
  { key: '2019-20', label: '2019–20', clubs: ['clubs_2019H1', 'clubs_2019H2'], hotels: ['hotels_2019H1', 'hotels_2019H2'] },
  { key: '2020-21', label: '2020–21', clubs: ['clubs_2020H1', 'clubs_2020H2'], hotels: ['hotels_2020H1', 'hotels_2020H2'] },
  { key: '2021-22', label: '2021–22', clubs: ['clubs_2021H1', 'clubs_2021H2'], hotels: ['hotels_2021H1', 'hotels_2021H2'] },
  { key: '2022-23', label: '2022–23', clubs: ['clubs_2022H1', 'clubs_2022H2'], hotels: ['hotels_2022H1', 'hotels_2022H2'] },
  { key: '2023-24', label: '2023–24', clubs: ['clubs_FY2324'], hotels: ['hotels_FY2324'] },
  { key: '2024-25', label: '2024–25', clubs: ['clubs_FY2425'], hotels: ['hotels_FY2425'] },
];

const periods = periodDefs.map((p) => {
  const clubsRows = p.clubs.flatMap((f) => parseFile(f + '.xlsx'));
  const hotelsRows = p.hotels.flatMap((f) => parseFile(f + '.xlsx'));
  const clubs = sum(clubsRows, 'netProfit');
  const hotels = sum(hotelsRows, 'netProfit');
  // EGM count: use the latest snapshot in the period (annual = its file; halves = 2nd half).
  const egmClubs = sum(parseFile((p.clubs.length === 1 ? p.clubs[0] : p.clubs[1]) + '.xlsx'), 'egm');
  const egmHotels = sum(parseFile((p.hotels.length === 1 ? p.hotels[0] : p.hotels[1]) + '.xlsx'), 'egm');
  return { key: p.key, label: p.label, clubs, hotels, combined: clubs + hotels, egmClubs, egmHotels, egms: egmClubs + egmHotels };
});

// Per-area combined figures for a given (clubsFile, hotelsFile) pair.
function combinedByArea(clubsFile, hotelsFile) {
  const c = new Map(parseFile(clubsFile).map((r) => [areaKey(r.label), r]));
  const h = new Map(parseFile(hotelsFile).map((r) => [areaKey(r.label), r]));
  const keys = new Set([...c.keys(), ...h.keys()]);
  const map = new Map();
  for (const k of keys) {
    const cr = c.get(k), hr = h.get(k);
    map.set(k, {
      label: (cr || hr).label,
      members: (cr || hr).members,
      clubs: cr ? cr.netProfit : 0,
      hotels: hr ? hr.netProfit : 0,
      combined: (cr ? cr.netProfit : 0) + (hr ? hr.netProfit : 0),
      egm: (cr ? cr.egm : 0) + (hr ? hr.egm : 0),
      egmClubs: cr ? cr.egm : 0,
      egmHotels: hr ? hr.egm : 0,
      premises: (cr ? cr.premises : 0) + (hr ? hr.premises : 0),
      population: (cr && cr.population) || (hr && hr.population) || null,
      sectors: (cr ? 'clubs' : '') + (cr && hr ? '+' : '') + (hr ? 'hotels' : ''),
      hasClubs: !!cr,
      hasHotels: !!hr,
    });
  }
  return map;
}

const cur = combinedByArea('clubs_FY2425.xlsx', 'hotels_FY2425.xlsx');
const prev = combinedByArea('clubs_FY2324.xlsx', 'hotels_FY2324.xlsx');

// Per-area historical combined (for drill-down trends): half-year sums per area.
function areaHistory(k) {
  const out = [];
  for (const p of periodDefs) {
    let clubs = 0, hotels = 0, seen = false;
    for (const f of p.clubs) { const m = new Map(parseFile(f + '.xlsx').map((r) => [areaKey(r.label), r])); if (m.has(k)) { clubs += m.get(k).netProfit; seen = true; } }
    for (const f of p.hotels) { const m = new Map(parseFile(f + '.xlsx').map((r) => [areaKey(r.label), r])); if (m.has(k)) { hotels += m.get(k).netProfit; seen = true; } }
    if (seen) out.push({ key: p.key, clubs, hotels, combined: clubs + hotels });
  }
  return out;
}

// ---- GeoJSON name matching ------------------------------------------------
const geo = JSON.parse(fs.readFileSync(path.join(RAW, 'nsw_lga.json'), 'utf8'));
const geoNorm = (s) => s.toLowerCase().replace(/\b(council|city|shire|regional|municipal|municipality|of|the|area)\b/g, '').replace(/[^a-z]/g, '');
const geoIndex = new Map(geo.features.map((f) => [geoNorm(f.properties.LGA_NAME), f.properties.LGA_NAME]));
const geoKeys = [...geoIndex.keys()];
function matchGeo(memberName) {
  const k = geoNorm(memberName);
  if (geoIndex.has(k)) return geoIndex.get(k);
  const c = geoKeys.find((g) => g.startsWith(k) || k.startsWith(g));
  return c ? geoIndex.get(c) : null;
}

// ---- Build per-area records ----------------------------------------------
const totalCombined = [...cur.values()].reduce((a, r) => a + r.combined, 0);
const areas = [...cur.values()].map((r) => {
  const adults = r.population ? Math.round(r.population * ADULT_SHARE) : null;
  const lossPerAdult = adults ? r.combined / adults : null;
  const pk = areaKey(r.label);
  const pr = prev.get(pk);
  const geoIds = [...new Set(r.members.map(matchGeo).filter(Boolean))];
  return {
    name: r.label,
    slug: slug(r.label),
    members: r.members,
    geoIds,
    clubs: Math.round(r.clubs),
    hotels: Math.round(r.hotels),
    combined: Math.round(r.combined),
    egm: r.egm,
    egmClubs: r.egmClubs,
    egmHotels: r.egmHotels,
    premises: r.premises,
    population: r.population,
    adults,
    lossPerAdult: lossPerAdult ? Math.round(lossPerAdult) : null,
    lossPerDay: Math.round(r.combined / 365),
    egmPer1kAdults: adults ? +(r.egm / (adults / 1000)).toFixed(1) : null,
    lossPerEgm: r.egm ? Math.round(r.combined / r.egm) : null,
    sectors: r.sectors,
    hasClubs: r.hasClubs,
    hasHotels: r.hasHotels,
    shareOfState: +((r.combined / totalCombined) * 100).toFixed(2),
    prevCombined: pr ? Math.round(pr.combined) : null,
    yoyPct: pr && pr.combined ? +(((r.combined - pr.combined) / pr.combined) * 100).toFixed(1) : null,
    history: areaHistory(pk),
  };
}).sort((a, b) => b.combined - a.combined);
areas.forEach((a, i) => { a.rank = i + 1; });

// per-adult rank (only areas with a value)
const withPA = areas.filter((a) => a.lossPerAdult != null).sort((a, b) => b.lossPerAdult - a.lossPerAdult);
withPA.forEach((a, i) => { a.rankPerAdult = i + 1; });

// ---- Summary + medians ----------------------------------------------------
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const latest = periods[periods.length - 1];
const medianPerAdult = median(withPA.map((a) => a.lossPerAdult));
const totalEgm = areas.reduce((a, r) => a + r.egm, 0);
const totalPremises = areas.reduce((a, r) => a + r.premises, 0);
const summary = {
  latestPeriod: latest.label,
  prevPeriod: periods[periods.length - 2].label,
  totalLoss: Math.round(latest.combined),
  clubsLoss: Math.round(latest.clubs),
  hotelsLoss: Math.round(latest.hotels),
  totalEgm,
  totalPremises,
  lgaCount: areas.length,
  lossPerDay: Math.round(latest.combined / 365),
  lossPerHour: Math.round(latest.combined / 365 / 24),
  medianPerAdult,
  yoyPct: +(((latest.combined - periods[periods.length - 2].combined) / periods[periods.length - 2].combined) * 100).toFixed(1),
};

// ---- Insights (auto-detected) --------------------------------------------
const fmtM = (n) => '$' + (n / 1e6).toFixed(1) + 'M';
const fmt$ = (n) => '$' + Math.round(n).toLocaleString('en-AU');
const insights = [];
const top = areas[0];
insights.push({ severity: 'alert', title: `${top.name} loses the most in NSW`, body: `Players lost ${fmtM(top.combined)} to poker machines in ${top.name} in ${summary.latestPeriod} — ${top.shareOfState}% of the entire state's losses, or about ${fmt$(top.lossPerDay)} every single day.` });
const topPA = withPA[0];
insights.push({ severity: 'alert', title: `${topPA.name}: highest loss per adult`, body: `${topPA.name} lost about ${fmt$(topPA.lossPerAdult)} per adult in ${summary.latestPeriod} — ${(topPA.lossPerAdult / medianPerAdult).toFixed(1)}× the state median of ${fmt$(medianPerAdult)}.` });
const concTop5 = areas.slice(0, 5).reduce((a, r) => a + r.combined, 0);
insights.push({ severity: 'warning', title: 'Losses are highly concentrated', body: `Just 5 of ${areas.length} council areas account for ${((concTop5 / totalCombined) * 100).toFixed(0)}% of all NSW pokies losses: ${areas.slice(0, 5).map((a) => a.name).join(', ')}.` });
const biggestJump = [...areas].filter((a) => a.yoyPct != null && a.combined > 20e6).sort((a, b) => b.yoyPct - a.yoyPct)[0];
if (biggestJump) insights.push({ severity: 'warning', title: `Fastest-rising: ${biggestJump.name}`, body: `Losses in ${biggestJump.name} rose ${biggestJump.yoyPct}% year-on-year to ${fmtM(biggestJump.combined)} — the sharpest increase among larger council areas.` });
const biggestFall = [...areas].filter((a) => a.yoyPct != null && a.combined > 20e6).sort((a, b) => a.yoyPct - b.yoyPct)[0];
if (biggestFall && biggestFall.yoyPct < 0) insights.push({ severity: 'info', title: `Biggest fall: ${biggestFall.name}`, body: `Losses in ${biggestFall.name} fell ${Math.abs(biggestFall.yoyPct)}% year-on-year — one of the few larger areas going the other way.` });
const covidLow = periods.reduce((m, p) => (p.combined < m.combined ? p : m), periods[0]);
insights.push({ severity: 'info', title: 'The COVID dip and the record rebound', body: `Statewide losses fell to ${fmtM(covidLow.combined)} in ${covidLow.label} while venues were shut, then climbed to a record ${fmtM(latest.combined)} in ${summary.latestPeriod} — a ${(((latest.combined - covidLow.combined) / covidLow.combined) * 100).toFixed(0)}% rise.` });
const densest = [...areas].filter((a) => a.egmPer1kAdults != null && a.adults > 30000).sort((a, b) => b.egmPer1kAdults - a.egmPer1kAdults)[0];
if (densest) insights.push({ severity: 'info', title: `Most machines per person: ${densest.name}`, body: `${densest.name} has ${densest.egmPer1kAdults} poker machines per 1,000 adults — the densest concentration among larger LGAs (${densest.egm.toLocaleString()} machines).` });

// ---- Write ----------------------------------------------------------------
const out = {
  meta: {
    state: 'NSW',
    generatedAt: new Date().toISOString(),
    adultShare: ADULT_SHARE,
    source: 'Liquor & Gaming NSW — Gaming Machine Data (Clubs & Hotels, by LGA)',
    sourceUrl: 'https://www.nsw.gov.au/business-and-economy/liquor-and-gaming/gaming/gaming-machine-data-reports',
    boundaries: 'Geoscape Administrative Boundaries — NSW LGA (data.gov.au), simplified',
    note: 'Net gaming machine profit equals the amount players lost. Loss-per-adult uses the LGA population reported by L&GNSW multiplied by the NSW 18+ resident share (0.79). Some small councils are grouped by L&GNSW for privacy; clubs and hotels are occasionally grouped differently, so a few reporting areas carry only one sector (shown with a badge).',
  },
  summary,
  periods,
  areas,
  insights,
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'pokies.json'), JSON.stringify(out));
fs.copyFileSync(path.join(RAW, 'nsw_lga.json'), path.join(OUT, 'nsw_lga.json'));

console.log('Wrote pokies.json:', areas.length, 'areas,', periods.length, 'periods,', insights.length, 'insights');
console.log('State', summary.latestPeriod, 'total', fmtM(summary.totalLoss), '| clubs', fmtM(summary.clubsLoss), '| hotels', fmtM(summary.hotelsLoss), '| EGMs', summary.totalEgm.toLocaleString());
console.log('Top 5:', areas.slice(0, 5).map((a) => `${a.name} ${fmtM(a.combined)}`).join(', '));
console.log('geoIds matched for top 20:', areas.slice(0, 20).every((a) => a.geoIds.length) ? 'all ok' : 'SOME MISSING');
