# Site Plan: Pokies Losses (NSW)

## Overview
- **Name:** Pokies Losses (NSW)
- **Repo name:** nsw-pokies
- **Tagline:** How much your suburb loses to poker machines — every NSW council ranked, mapped, and tracked over time.

## Target Audience
NSW residents, journalists, community advocates, councillors, gambling-harm researchers and curious locals who want to answer "how much do people lose to the pokies where I live?" Most arrive on mobile after a news story or council debate; some are analysts on desktop comparing LGAs.

## Value Proposition
NSW has more poker machines than any state in Australia (~88,000) and players lose ~$9 billion a year to them — but the official data is buried in dozens of half-yearly XLSX spreadsheets. This site unifies clubs + hotels gaming-machine data for every one of NSW's 128 LGAs into one fast, interactive tool: rank by total loss OR loss-per-adult, see it on a map, track the six-year trend (including the COVID collapse and record post-COVID surge), and drill into any council. Nowhere else presents it this cleanly.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| Liquor & Gaming NSW — Gaming Machine Data (Clubs, by LGA) | nsw.gov.au/.../gaming-machine-data-reports | Net gaming machine profit (= player losses), tax, EGM count, premises, LGA population, by LGA | Quarterly / annual | No |
| Liquor & Gaming NSW — Gaming Machine Data (Hotels, by LGA) | nsw.gov.au/.../gaming-machine-data-reports | Same, for hotels | Quarterly / annual | No |
| Geoscape Administrative Boundaries — NSW LGA | data.gov.au | LGA boundary polygons (GeoJSON, simplified) | Static | No |

## Key Features
1. **Leaderboard** — every LGA ranked by total loss and by loss-per-adult, sector toggle (Combined / Clubs / Hotels), colour-coded vs the state median, click to drill in.
2. **Map** — Leaflet choropleth of loss-per-adult (or total) by LGA with hover/click, legend, sector toggle.
3. **Trend** — statewide six-year time series (2019–20 → 2024–25) showing clubs vs hotels vs combined, with the COVID lockdown dip annotated.
4. **Full table** — sortable, searchable, filterable table of all reporting areas with every metric.
5. **Treemap** — LGAs sized by total loss, shaded by loss-per-adult density — composition at a glance.
6. **Distribution** — histogram of loss-per-adult across LGAs highlighting the outliers.
7. **Insights** — auto-detected findings (highest per-adult, biggest year-on-year jump, concentration, EGM density).
8. **Drill-down panel** — per-LGA slide-in (URL hash) with clubs/hotels split, per-adult, EGMs, premises, rank, vs-median, and its own multi-year trend.

## Style Direction
**Tone:** civic / serious — this is a social-harm topic, so calm and authoritative, never flashy or gamified.
**Colour palette:** light, clean, government-portal feel — slate/ink text on near-white, deep teal-navy primary, with an amber→red sequential ramp reserved for "loss" intensity (money leaving the community). The red is used sparingly and meaningfully.
**UI density:** balanced-to-dense — a data tool that still reads clearly on a phone.
**Dark/light theme:** light (civic/consumer audience), with a dark-mode override for accessibility.
**Reference sites for tone:** ABS data explorer, courtwatch.us, fuelaustralia.org.

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite
- **Data strategy:** pipeline (GitHub Actions downloads the NSW XLSX files, parses + aggregates to `public/data/pokies.json`, simplifies the LGA GeoJSON to `public/data/nsw_lga.json`). Generated data is committed so the site works immediately.
- **Key libraries:** Leaflet (map). All charts (bars, treemap, histogram, trend, matrix) hand-rolled in SVG.

## Layout
Fixed header (title, sector toggle, metric toggle, search, About + help). Below: a KPI strip (state totals). Then a horizontal view-tab bar. Main content fills the rest; drill-down slides in from the right. Sticky footer with attribution. On mobile, KPIs wrap to 2-up, tabs scroll horizontally, table collapses to cards, drill-down is full-screen.

## Pages/Views
Single page, tabbed views: Leaderboard · Map · Trend · Table · Treemap · Distribution · Insights. Drill-down panel overlays any view.

## Visualization Strategy
- **Leaderboard (bars)** — ranks LGAs; the newsworthy default. Insight: who loses most / most per adult.
- **Map (Leaflet choropleth)** — geographic pattern; insight the leaderboard can't show (western-Sydney concentration).
- **Trend (multi-series line/bar)** — change over time; insight: COVID collapse + record surge, clubs vs hotels divergence.
- **Table** — precise lookup and comparison across all metrics.
- **Treemap** — composition/scale: how a handful of LGAs dominate total losses.
- **Histogram** — distribution and outliers of loss-per-adult.
- **Insights** — narrative interpretation so raw numbers become findings.
