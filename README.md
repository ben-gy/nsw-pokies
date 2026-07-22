# Pokies Losses (NSW)

**How much each NSW council area loses to poker machines — clubs and hotels ranked, mapped and tracked over six years.**

🔗 **Live:** [https://nsw-pokies.benrichardson.dev](https://nsw-pokies.benrichardson.dev)

## What is this?

New South Wales has more poker machines than any other Australian state — around **88,000** of them in clubs and hotels — and players lose roughly **$9 billion every year** feeding them. That's about a million dollars an hour, every hour, drained out of local communities. But the official numbers are buried across dozens of half-yearly and annual XLSX spreadsheets published by Liquor & Gaming NSW, one file per sector per period.

**Pokies Losses (NSW)** unifies all of it into one fast, interactive tool. It answers the question anyone can ask — *"how much do people lose to the pokies where I live?"* — for every one of NSW's 128 council areas. Rank areas by total loss or by loss-per-adult, see the geographic pattern on a map, watch the six-year trend (including the COVID collapse and the record post-COVID surge), and drill into any council for a full breakdown of clubs vs hotels, machines, venues and year-on-year change.

The headline figure throughout is **net gaming machine profit** — the money venues keep after paying out winnings, which is exactly equal to what players lost.

## Who is this for?

NSW residents checking their own suburb, journalists and researchers looking for the newsworthy per-adult leaders, councillors and community advocates debating machine caps, and anyone affected by gambling harm who wants to understand the scale of it. Most visitors arrive on a phone; the site is built to be fast and legible on mobile as well as dense enough for analysts on desktop.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| [Liquor & Gaming NSW — Gaming Machine Data (Clubs, by LGA)](https://www.nsw.gov.au/business-and-economy/liquor-and-gaming/gaming/gaming-machine-data-reports) | Net gaming machine profit (player losses), tax, machine counts, premises and LGA population, by council area | Quarterly / annual |
| [Liquor & Gaming NSW — Gaming Machine Data (Hotels, by LGA)](https://www.nsw.gov.au/business-and-economy/liquor-and-gaming/gaming/gaming-machine-data-reports) | The same, for hotels | Quarterly / annual |
| [Geoscape Administrative Boundaries — NSW LGA (data.gov.au)](https://data.gov.au/data/dataset/nsw-local-government-areas) | Council boundary polygons (GeoJSON, simplified) | Static |

Loss-per-adult uses the LGA population supplied in the reports multiplied by the NSW 18-and-over resident share (0.79, from ABS Estimated Resident Population). Casinos are licensed separately and are not included.

## Features

- **Leaderboard** — every council area ranked by total loss or loss-per-adult, sector toggle (combined / clubs / hotels), colour-coded against the state median.
- **Map** — Leaflet choropleth of all 128 LGAs, revealing the western-Sydney concentration at a glance.
- **Trend** — statewide six-year time series with the COVID dip and record rebound, plus a clubs-vs-hotels breakdown.
- **Full table** — sortable, searchable, filterable across every metric.
- **Treemap** — council areas sized by total loss, shaded by loss-per-adult.
- **Distribution** — histogram of loss-per-adult with the outliers called out.
- **Insights** — auto-detected findings (highest per-adult, concentration, fastest-rising, machine density).
- **Drill-down** — a slide-in panel for any council with clubs/hotels split, per-adult, machines, venues, share of state, year-on-year change and its own multi-year trend (deep-linkable via URL hash).
- **Glossary & About** — inline tooltips on every jargon term and an About panel explaining the data, method and gambling-harm support.

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest (43 unit tests)
- **Mapping:** Leaflet + GeoJSON (all other charts — trend, treemap, histogram, sparklines — are hand-rolled SVG)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline downloads and aggregates the NSW XLSX reports into JSON

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview
```

## How it works

A GitHub Actions data pipeline (`pipeline/collect.mjs` + `pipeline/aggregate.mjs`) downloads the clubs and hotels gaming-machine reports for each LGA, parses the XLSX with `xlsx`, joins clubs and hotels by council area, computes per-adult and per-machine figures, builds the six-year statewide trend from the half-yearly and annual reports, auto-generates insight cards, and writes `public/data/pokies.json`. It also downloads the NSW LGA boundaries, dissolves and simplifies them with `mapshaper`, and emits `public/data/nsw_lga.json`. The frontend loads these two files at runtime — no server required.

## license

[GNU Affero General Public License v3.0 or later](./LICENSE), with an attribution
requirement added under section 7(b) — see
[ADDITIONAL-TERMS.md](./ADDITIONAL-TERMS.md).

In short: you may run, modify, redistribute and even sell this, but if you
distribute it — or run a modified version where other people can reach it — you
have to publish your source under the same licence and keep the attribution. A
separate commercial licence without those obligations is available on request:
<hi@ben.gy>.

Third-party components keep their own licences — see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
