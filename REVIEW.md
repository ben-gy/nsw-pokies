# Pokies Losses (NSW) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/nsw-pokies/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://nsw-pokies.benrichardson.dev

## What it is

Unifies Liquor & Gaming NSW clubs + hotels gaming-machine data for all 128 NSW
council areas into one interactive tool. Players lost ~$9.06bn to poker machines
in NSW in 2024–25; this site ranks, maps and tracks that by LGA.

Views: Leaderboard · Map (Leaflet choropleth) · Trend (six years) · Table ·
Treemap · Distribution · Insights, plus a per-council drill-down panel.

## DNS setup (already provisioned)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `nsw-pokies` | `ben-gy.github.io` | DNS only (grey cloud) |

If the TLS cert needs re-triggering:
```bash
gh api repos/ben-gy/nsw-pokies/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/nsw-pokies/pages -X PUT -f cname="nsw-pokies.benrichardson.dev"
```
