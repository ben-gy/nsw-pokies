// Leaflet choropleth of NSW LGAs coloured by the selected metric.
import L from 'leaflet';
import type { Area, Sector, Metric } from './types';
import { metricValue, makeColorScale, LOSS_RAMP } from './analysis';
import { money, dollars } from './format';

let geojsonCache: any = null;

async function loadGeo(): Promise<any> {
  if (geojsonCache) return geojsonCache;
  const res = await fetch('data/nsw_lga.json');
  if (!res.ok) throw new Error('Could not load boundaries');
  geojsonCache = await res.json();
  return geojsonCache;
}

export interface MapHandle { destroy(): void }

export async function renderMap(
  container: HTMLElement,
  areas: Area[],
  sector: Sector,
  metric: Metric,
  onSelect: (slug: string) => void,
): Promise<MapHandle> {
  const geo = await loadGeo();

  // geoId (LGA_NAME) -> area lookup, and value per area for the current metric.
  const byGeo = new Map<string, Area>();
  for (const a of areas) for (const g of a.geoIds) byGeo.set(g, a);
  const values = areas.map((a) => metricValue(a, sector, metric)).filter((v): v is number => v != null && v > 0);
  const scale = makeColorScale(values);

  container.innerHTML = '<div class="map-canvas"></div>';
  const canvas = container.querySelector('.map-canvas') as HTMLElement;

  const map = L.map(canvas, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: 'Boundaries: Geoscape / data.gov.au · Tiles © CARTO',
    subdomains: 'abcd',
    maxZoom: 12,
    minZoom: 5,
  }).addTo(map);

  const valueFor = (name: string): number | null => {
    const a = byGeo.get(name);
    return a ? metricValue(a, sector, metric) : null;
  };

  const layer = L.geoJSON(geo, {
    style: (f: any) => {
      const v = valueFor(f.properties.LGA_NAME);
      return { fillColor: scale(v), fillOpacity: v == null ? 0.25 : 0.82, color: '#ffffff', weight: 0.6 };
    },
    onEachFeature: (f: any, lyr: any) => {
      const name = f.properties.LGA_NAME;
      const a = byGeo.get(name);
      const v = valueFor(name);
      const label = a
        ? `<strong>${a.name}</strong><br>${metric === 'perAdult' ? dollars(v) + ' per adult' : money(v) + ' total'}<br><span class="mt-sub">${a.rank ? 'Rank #' + a.rank + ' of ' + areas.length : ''}</span>`
        : `<strong>${name}</strong><br><span class="mt-sub">No pokies data</span>`;
      lyr.bindTooltip(label, { sticky: true, className: 'map-tip' });
      lyr.on({
        mouseover: () => lyr.setStyle({ weight: 2, color: '#0f172a' }),
        mouseout: () => layer.resetStyle(lyr),
        click: () => { if (a) onSelect(a.slug); },
      });
    },
  }).addTo(map);

  const bounds = layer.getBounds();
  map.setView([-33.4, 147.5], 6); // sensible NSW default before fitting
  const fit = () => {
    map.invalidateSize();
    if (bounds.isValid() && canvas.clientHeight > 50) map.fitBounds(bounds, { padding: [12, 12] });
  };
  // Fit once the container actually has its layout height (observer fires on first size).
  const ro = new ResizeObserver(() => { if (canvas.clientHeight > 50) { fit(); ro.disconnect(); } });
  ro.observe(canvas);
  setTimeout(fit, 400);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'map-legend';
  const stops = LOSS_RAMP.map((c) => `<span style="background:${c}"></span>`).join('');
  legend.innerHTML = `<div class="ml-title">${metric === 'perAdult' ? 'Loss per adult' : 'Total loss'}</div><div class="ml-ramp">${stops}</div><div class="ml-ends"><span>lower</span><span>higher</span></div><div class="ml-na"><span class="ml-na-sw"></span> no data</div>`;
  container.appendChild(legend);

  return {
    destroy() { ro.disconnect(); map.remove(); },
  };
}
