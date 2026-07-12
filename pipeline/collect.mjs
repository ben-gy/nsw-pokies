// Download the raw NSW gaming-machine (pokies) LGA reports + LGA boundaries.
// Writes XLSX files and a simplified GeoJSON into pipeline/raw/, ready for aggregate.mjs.
// Source: Liquor & Gaming NSW gaming machine data reports (public, no auth).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, 'raw');
fs.mkdirSync(RAW, { recursive: true });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const B = 'https://www.nsw.gov.au/sites/default/files/noindex';

// local-name -> source URL. Half-year reports build the earlier years; annual files the latest two.
const FILES = {
  clubs_2019H1: `${B}/2025-07/clubs-gaming-machine-by-lga-report-1-june-2019-to-30-november-2019.xlsx`,
  clubs_2019H2: `${B}/2025-07/clubs-gaming-machine-lga-report_1-dec-2019-to-31-may-2020.xlsx`,
  clubs_2020H1: `${B}/2025-07/clubs-gaming-machine-lga-report_1-june-2020-to-30-november-2020.xlsx`,
  clubs_2020H2: `${B}/2025-07/clubs-gaming-machine-lga-report-1-dec-2020-to-31-may-2021.xlsx`,
  clubs_2021H1: `${B}/2025-07/clubs-gaming-machine-report-by-lga-1-jun-2021-to-30-nov-2021.xlsx`,
  clubs_2021H2: `${B}/2025-07/clubs-gaming-machine-report-by-lga-1-dec-2021-31-may-2022.xlsx`,
  clubs_2022H1: `${B}/2025-07/clubs-gaming-machine-report-by-lga-1-jun-2022-30-nov-2022.xlsx`,
  clubs_2022H2: `${B}/2025-07/clubs-gaming-machine-report-by-lga-1-dec-2022-31-may-2023.xlsx`,
  clubs_FY2324: `${B}/2025-07/gaming-machine-annual-report-by-lga-clubs-fy2023-2024.xlsx`,
  clubs_FY2425: `${B}/2025-11/gaming-machine-annual-report-by-lga-clubs-fy2024-2025.xlsx`,
  hotels_2019H1: `${B}/2025-07/hotels-gaming-machine-report-by-lga-report-1-july-2019-to-31-december-2019.xlsx`,
  hotels_2019H2: `${B}/2025-07/hotels-gaming-machine-lga-report_1-jan-2020-to-30-jun-2020.xlsx`,
  hotels_2020H1: `${B}/2025-07/hotels-gaming-machine-report-by-lga-1-july-2020-to-31-december-2020.xlsx`,
  hotels_2020H2: `${B}/2025-07/hotels-gaming-machine-lga-report-1-jan-2021-to-30-jun-2021.xlsx`,
  hotels_2021H1: `${B}/2025-07/hotels-gaming-machine-report-by-lga-1-jul-2021-to-31-dec-2021.xlsx`,
  hotels_2021H2: `${B}/2025-07/hotels-gaming-machine-report-by-lga-1-jan-2022-30-jun-2022.xlsx`,
  hotels_2022H1: `${B}/2025-07/hotels-gaming-machine-report-by-lga-1-jul-2022-31-dec-2022.xlsx`,
  hotels_2022H2: `${B}/2025-07/hotels-gaming-machine-report-by-lga-1-jan-2023-30-jun-2023.xlsx`,
  hotels_FY2324: `${B}/2025-07/gaming-machine-annual-report-by-lga-hotels-fy2023-2024.xlsx`,
  hotels_FY2425: `${B}/2025-11/gaming-machine-annual-report-by-lga-hotels-fy2024-2025.xlsx`,
};

// data.gov.au Geoscape NSW LGA boundaries (full resolution GeoJSON via WFS).
const GEO_URL = 'https://data.gov.au/geoserver/nsw-local-government-areas/wfs?request=GetFeature&typeName=ckan_f6a00643_1842_48cd_9c2f_df23a3a1dc1e&outputFormat=json';

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Reject bot-block HTML pages masquerading as downloads.
  if (buf.slice(0, 200).toString('utf8').toLowerCase().includes('<!doctype html')) {
    throw new Error(`Got HTML (blocked?) for ${url}`);
  }
  fs.writeFileSync(dest, buf);
  return buf.length;
}

let ok = 0, fail = 0;
for (const [name, url] of Object.entries(FILES)) {
  try {
    const bytes = await download(url, path.join(RAW, name + '.xlsx'));
    console.log(`  ${name}.xlsx  ${(bytes / 1024).toFixed(0)}KB`);
    ok++;
  } catch (e) {
    console.error(`  FAILED ${name}: ${e.message}`);
    fail++;
  }
}
console.log(`Downloaded ${ok} report files (${fail} failed).`);
if (ok < 2) throw new Error('Too few report files downloaded — aborting.');

// Boundaries: download full, dissolve by LGA name and simplify with mapshaper.
console.log('Fetching LGA boundaries...');
const fullGeo = path.join(RAW, 'nsw_lga_full.json');
await download(GEO_URL, fullGeo);
const simplified = path.join(RAW, 'nsw_lga.json');
execFileSync('npx', [
  'mapshaper', fullGeo,
  '-filter-fields', 'LGA_NAME',
  '-dissolve2', 'LGA_NAME',
  '-simplify', '5%', 'keep-shapes',
  '-o', 'format=geojson', 'precision=0.0001', simplified,
], { stdio: 'inherit', cwd: __dirname });
fs.rmSync(fullGeo, { force: true });
console.log('Boundaries simplified ->', path.relative(process.cwd(), simplified));
console.log('Collect complete.');
