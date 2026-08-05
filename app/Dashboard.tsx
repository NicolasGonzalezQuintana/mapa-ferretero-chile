"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

type Chain = "SODIMAC" | "EASY" | "CHILEMAT" | "MTS";
type Store = {
  id: string; chain: Chain; name: string; format: string; address: string; commune: string; region: string;
  coordinates: [number, number]; phone: string; hours: Record<string, string>; services: string[];
  sourceUrl: string; mapUrl: string; confidence: string; verifiedAt: string;
};
type Dataset = { meta: { generatedAt: string; publishedStores: number; coverage: Record<Chain, { status: string; count: number; source: string }> }; stores: Store[] };

const chainInfo: Record<Chain, { label: string; color: string; short: string }> = {
  SODIMAC: { label: "Sodimac", color: "#0067a8", short: "SO" },
  EASY: { label: "Easy", color: "#d7202f", short: "EA" },
  CHILEMAT: { label: "Chilemat", color: "#f2b705", short: "CH" },
  MTS: { label: "MTS", color: "#e46922", short: "MT" },
};
const allChains = Object.keys(chainInfo) as Chain[];

function freshness(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function Dashboard() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [data, setData] = useState<Dataset | null>(null);
  const [activeChains, setActiveChains] = useState<Chain[]>(allChains);
  const [region, setRegion] = useState("Todas las regiones");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Store | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { fetch("/stores.json").then((response) => response.json()).then(setData); }, []);
  const regions = useMemo(() => ["Todas las regiones", ...Array.from(new Set(data?.stores.map((s) => s.region) || [])).sort()], [data]);
  const visible = useMemo(() => (data?.stores || []).filter((store) => {
    const haystack = `${store.name} ${store.address} ${store.commune} ${store.region}`.toLowerCase();
    return activeChains.includes(store.chain) && (region === "Todas las regiones" || store.region === region) && haystack.includes(query.toLowerCase().trim());
  }), [data, activeChains, region, query]);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !mapNode.current || mapRef.current) return;
      const map = L.map(mapNode.current, { center: [-38.8, -71.2], zoom: 4, minZoom: 3, maxZoom: 19, zoomControl: true, scrollWheelZoom: true, touchZoom: true, dragging: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { minZoom: 3, maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    void import("leaflet").then((L) => {
      if (!mapRef.current) return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = visible.map((store) => L.marker([store.coordinates[1], store.coordinates[0]], {
        icon: L.divIcon({ className: "leaflet-store-icon", html: `<span style="--pin:${chainInfo[store.chain].color}">${chainInfo[store.chain].short}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
        title: `${store.name} · ${store.commune}`,
      }).on("click", () => setSelected(store)).addTo(mapRef.current!));
      if (visible.length) {
        const bounds = L.latLngBounds(visible.map((store) => [store.coordinates[1], store.coordinates[0]] as [number, number]));
        mapRef.current.fitBounds(bounds, { padding: [38, 38], maxZoom: visible.length === 1 ? 16 : 10 });
      }
    });
  }, [visible, mapReady]);

  const toggleChain = (chain: Chain) => setActiveChains((current) => current.includes(chain) ? current.filter((item) => item !== chain) : [...current, chain]);
  const reset = () => { setActiveChains(allChains); setRegion("Todas las regiones"); setQuery(""); setSelected(null); };
  const coveredRegions = new Set(visible.map((store) => store.region)).size;

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">CL</span><div><strong>Mapa Ferretero</strong><small>Chile · puntos de venta</small></div></div>
        <div className="top-actions"><span className="update-pill"><i /> Datos verificados · {freshness(data?.meta.generatedAt)}</span><button className="ghost-button" onClick={() => setListOpen(!listOpen)}>☷ <span>Ver listado</span></button></div>
      </header>

      <section className="hero-row">
        <div><p className="eyebrow">COBERTURA NACIONAL</p><h1>¿Dónde está la red<br />ferretera en Chile?</h1><p className="dek">Explora locales físicos confirmados desde las fuentes oficiales. Combina cadenas, filtra por región y abre la evidencia de cada punto.</p></div>
        <div className="summary-grid">
          <article><span>Locales visibles</span><strong>{visible.length}</strong><small>de {data?.meta.publishedStores ?? "—"} publicados</small></article>
          <article><span>Regiones</span><strong>{coveredRegions}</strong><small>con presencia visible</small></article>
          <article><span>Cadenas activas</span><strong>{activeChains.length}</strong><small>de 4 seleccionadas</small></article>
        </div>
      </section>

      <section className="control-band" aria-label="Filtros del mapa">
        <div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar local, comuna o dirección" aria-label="Buscar local" /></div>
        <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Filtrar por región">{regions.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="reset-button" onClick={reset}>Restablecer</button>
      </section>

      <section className="chain-strip">
        {allChains.map((chain) => {
          const info = chainInfo[chain]; const coverage = data?.meta.coverage[chain]; const active = activeChains.includes(chain);
          return <button key={chain} className={`chain-card ${active ? "active" : ""}`} style={{ "--chain": info.color } as React.CSSProperties} onClick={() => toggleChain(chain)} aria-pressed={active}>
            <span className="chain-dot">{active ? "✓" : ""}</span><span><b>{info.label}</b><small>{coverage?.status === "complete" ? `${coverage.count} locales` : "Integración pendiente"}</small></span>
          </button>;
        })}
      </section>

      <section className="map-stage">
        <div ref={mapNode} className="leaflet-map" aria-label="Mapa interactivo de puntos de venta en Chile" />
        <div className="legend"><b>Leyenda</b>{allChains.map((chain) => <span key={chain}><i style={{ background: chainInfo[chain].color }} />{chainInfo[chain].label}</span>)}</div>
        <div className="coverage-note"><span>i</span><p><b>Estado del catastro</b><br />Las cuatro redes están publicadas desde sus fuentes oficiales. Cada punto conserva un enlace directo a la ficha que acredita su dirección.</p></div>
        {selected && <aside className="store-panel">
          <button className="close" onClick={() => setSelected(null)} aria-label="Cerrar detalle">×</button>
          <p className="store-chain" style={{ color: chainInfo[selected.chain].color }}>{selected.chain}</p><h2>{selected.name}</h2>
          <p className="store-address">{selected.address}</p>
          <dl><div><dt>Comuna</dt><dd>{selected.commune}</dd></div><div><dt>Región</dt><dd>{selected.region}</dd></div><div><dt>Formato</dt><dd>{selected.format}</dd></div><div><dt>Confianza</dt><dd><span className="verified">● {selected.confidence}</span></dd></div></dl>
          <p className="verified-line">Verificado el {freshness(selected.verifiedAt)} · coordenadas WGS84</p>
          <div className="panel-actions"><a href={selected.mapUrl} target="_blank" rel="noreferrer">Cómo llegar ↗</a><a href={selected.sourceUrl} target="_blank" rel="noreferrer">Fuente oficial ↗</a></div>
        </aside>}
      </section>

      <section className={`store-list ${listOpen ? "open" : ""}`}>
        <div className="list-header"><div><p className="eyebrow">DIRECTORIO</p><h2>{visible.length} puntos visibles</h2></div><button onClick={() => setListOpen(false)}>Cerrar ×</button></div>
        <div className="table-wrap"><table><thead><tr><th>Cadena</th><th>Local</th><th>Comuna</th><th>Región</th><th>Verificación</th></tr></thead><tbody>{visible.map((store) => <tr key={store.id} onClick={() => { setSelected(store); setListOpen(false); }}><td><span className="table-chain" style={{ color: chainInfo[store.chain].color }}>● {store.chain}</span></td><td><b>{store.name}</b><small>{store.address}</small></td><td>{store.commune}</td><td>{store.region}</td><td>{freshness(store.verifiedAt)}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
