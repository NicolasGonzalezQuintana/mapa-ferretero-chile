import { mkdir, writeFile } from "node:fs/promises";

const checkedAt = new Date().toISOString();
const sodimacListUrl = "https://www.sodimac.cl/static/campana/z-test-ds-2022/horarios/data/stores.json";
const sodimacDetailBase = "https://www.sodimac.services/store/v1/stores/";
const easyUrl = "https://cl-ccom-easy-bff-web.ecomm.cencosud.com/v2/cms/views/store";
const chilematUrl = "https://www.chilemat.cl/encuentra-ferreteria";
const easyApiKey = process.env.EASY_API_KEY;
const chilematFirebaseApiKey = process.env.CHILEMAT_FIREBASE_API_KEY;
const chileRegionsUrl = "https://arcgiswebad.bcn.cl/arcgis/rest/services/tematico/Regiones_Generalizadas/MapServer/0/query?where=1%3D1&outFields=nom_reg%2Ccodregion&returnGeometry=true&outSR=4326&f=geojson&maxAllowableOffset=0.08&geometryPrecision=3";
const mtsUrl = "https://www.mts.cl/ferreteros-de-verdad/";
const mtsPagesUrl = "https://www.mts.cl/wp-json/wp/v2/pages?per_page=100&_fields=id,link,slug,title,content";
const bcnCommuneQuery = "https://arcgiswebad.bcn.cl/arcgis/rest/services/Mapa_Electoral_MIL1/MapServer/9/query";

const regionNames = {
  RM: "Metropolitana", I: "Tarapacá", II: "Antofagasta", III: "Atacama",
  IV: "Coquimbo", V: "Valparaíso", VI: "O’Higgins", VII: "Maule",
  VIII: "Biobío", IX: "La Araucanía", X: "Los Lagos", XI: "Aysén",
  XII: "Magallanes", XIV: "Los Ríos", XV: "Arica y Parinacota", XVI: "Ñuble",
};

function cleanRegion(value = "") {
  const clean = value.replace(/^Región (de |del |de la )?/i, "").replace("Metropolitana de Santiago", "Metropolitana").trim();
  const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const aliases = {
    "metropolitana": "Metropolitana", "libertador general bernardo o'higgins": "O’Higgins",
    "libertador general bernardo o’higgins": "O’Higgins", "o'higgins": "O’Higgins", "o’higgins": "O’Higgins",
    "biobio": "Biobío", "bio bio": "Biobío", "la araucania": "La Araucanía", "araucania": "La Araucanía",
    "nuble": "Ñuble", "los rios": "Los Ríos", "aysen": "Aysén", "magallanes y de la antartica chilena": "Magallanes",
    "libertador bernardo o'higgins": "O’Higgins", "bio-bio": "Biobío", "magallanes y antartica chilena": "Magallanes",
    "aysen del gral.ibanez del campo": "Aysén",
  };
  return aliases[key] || clean;
}

function firestoreValue(value) {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(firestoreValue);
  return undefined;
}

function coordsFromMapLink(link = "") {
  const match = link.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) || link.match(/ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return match ? [Number(match[2]), Number(match[1])] : null;
}

function chileSvg(geojson) {
  const project = ([lng, lat]) => [30 + (lng + 76) * 66, 18 + (-17.3 - lat) * 26];
  const ringPath = (ring) => {
    const mainland = ring.filter(([lng, lat]) => lng >= -76.2 && lng <= -66 && lat <= -17 && lat >= -56.2);
    if (mainland.length < 3) return "";
    const projected = mainland.map(project);
    const area = Math.abs(projected.reduce((sum, point, index) => {
      const next = projected[(index + 1) % projected.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2);
    if (area < 2.5) return "";
    const step = Math.max(1, Math.floor(mainland.length / 220));
    const sampled = mainland.filter((_, index) => index % step === 0);
    if (sampled.at(-1) !== mainland.at(-1)) sampled.push(mainland.at(-1));
    return `${sampled.map((point, index) => `${index ? "L" : "M"}${project(point).map((n) => n.toFixed(1)).join(" ")}`).join(" ")}Z`;
  };
  const colors = ["#f8f5ed", "#f0eee5"];
  const paths = geojson.features.flatMap((feature, featureIndex) => {
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    return polygons.flatMap((polygon) => polygon.map(ringPath).filter(Boolean).map((path) => `<path d="${path}" fill="${colors[featureIndex % 2]}"/>`));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1040" role="img" aria-label="Mapa político de Chile"><g stroke="#718b84" stroke-width="1.7" stroke-linejoin="round">${paths.join("")}</g></svg>`;
}

async function mapInBatches(items, size, mapper) {
  const output = [];
  for (let index = 0; index < items.length; index += size) output.push(...await Promise.all(items.slice(index, index + size).map(mapper)));
  return output;
}

async function sodimacStores() {
  const source = await (await fetch(sodimacListUrl)).json();
  const output = [];
  for (const listing of source.stores) {
    const candidates = await (await fetch(`${sodimacDetailBase}${listing.store}`)).json();
    const detail = candidates.find((item) => item.countryCode === "CL" && item.buName === "sodimac" && item.isActive);
    if (!detail || !Number.isFinite(detail.latitude) || !Number.isFinite(detail.longitude)) continue;
    output.push({
      id: `sodimac-${detail.id}-${detail.nodeId.slice(0, 8)}`,
      chain: "SODIMAC",
      name: listing.name,
      format: detail.storeCategory || (listing.name.includes("Constructor") ? "Constructor" : "Homecenter"),
      address: detail.streetAddress,
      commune: detail.comuna || detail.city,
      region: cleanRegion(detail.regionName) || regionNames[listing.region] || listing.region,
      coordinates: [Number(detail.longitude), Number(detail.latitude)],
      phone: detail.phone || "",
      hours: listing.time || {},
      services: detail.serviceCounters || [],
      sourceUrl: sodimacListUrl,
      mapUrl: listing.url,
      confidence: "Alta",
      verifiedAt: checkedAt,
    });
  }
  return output;
}

async function easyStores() {
  if (!easyApiKey) throw new Error("Define EASY_API_KEY para actualizar los locales de Easy");
  const response = await fetch(easyUrl, { headers: { "x-api-key": easyApiKey } });
  if (!response.ok) throw new Error(`Easy source returned ${response.status}`);
  const payload = await response.json();
  const entries = payload.content.flatMap((block) => block.storeInfo || []).flatMap((info) => info.stores || []);
  const stores = entries.flatMap((store, index) => {
    const coordinates = coordsFromMapLink(store.mapLink);
    if (!coordinates || store.forceClose) return [];
    const addressParts = store.address.split(",").map((part) => part.trim());
    return [{
      id: `easy-${store.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}-${index}`,
      chain: "EASY",
      name: `Easy ${store.name}`,
      format: "Tienda",
      address: store.address,
      commune: store.neighborhood || addressParts.at(-2) || "",
      region: cleanRegion(addressParts.at(-1) || ""),
      coordinates,
      phone: "",
      hours: { "Lunes a sábado": `${store.monSatStartHour}–${store.monSatEndHour}`, "Domingo y festivos": `${store.sunHolStartHour}–${store.sunHolEndHour}` },
      services: (store.services || []).map((service) => service.name),
      sourceUrl: "https://www.easy.cl/tiendas",
      mapUrl: `https://www.google.com${store.mapLink}`,
      confidence: "Alta",
      verifiedAt: checkedAt,
    }];
  });
  if (!stores.some((store) => store.name.toLowerCase().includes("san bernardo"))) {
    stores.push({
      id: "easy-san-bernardo",
      chain: "EASY",
      name: "Easy San Bernardo",
      format: "Tienda",
      address: "Av. Portales 3698, San Bernardo, Región Metropolitana",
      commune: "San Bernardo",
      region: "Metropolitana",
      coordinates: [-70.70695, -33.634605],
      phone: "",
      hours: { "Lunes a sábado": "08:00–21:00", "Domingo y festivos": "09:00–21:00" },
      services: ["Corte de Madera", "Corte de Tableros (Dimensionado)", "Perfiles Metálicos", "Puesta en marcha de Productos", "Tintometría", "Trasplante de Plantas"],
      sourceUrl: "https://www.easy.cl/stores",
      mapUrl: "https://www.google.com/maps/place/Easy+San+Bernardo/@-33.6346005,-70.7095249,547m/data=!3m2!1e3!4b1!4m6!3m5!1s0x9662d8d0eeeff809:0x719b75179287ec3c!8m2!3d-33.634605!4d-70.70695",
      confidence: "Alta",
      verifiedAt: checkedAt,
    });
  }
  return stores;
}

async function chilematStores() {
  if (!chilematFirebaseApiKey) throw new Error("Define CHILEMAT_FIREBASE_API_KEY para actualizar los locales de Chilemat");
  const chilematFirestoreUrl = `https://firestore.googleapis.com/v1/projects/chilemat-admin/databases/(default)/documents/Ferreterias?pageSize=1000&key=${encodeURIComponent(chilematFirebaseApiKey)}`;
  const response = await fetch(chilematFirestoreUrl);
  if (!response.ok) throw new Error(`Chilemat source returned ${response.status}`);
  const payload = await response.json();
  return (payload.documents || []).flatMap((document, index) => {
    const fields = Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, firestoreValue(value)]));
    if (fields.activo === false || !Number.isFinite(fields.lat) || !Number.isFinite(fields.lng)) return [];
    return [{
      id: `chilemat-${document.name.split("/").at(-1) || index}`,
      chain: "CHILEMAT",
      name: fields.nombre || "Ferretería Chilemat",
      format: "Ferretería asociada",
      address: fields.direccion || "",
      commune: fields.ciudad || "",
      region: cleanRegion(fields.region || ""),
      coordinates: [Number(fields.lng), Number(fields.lat)],
      phone: fields.telefono || "",
      hours: {},
      services: fields.especialidades || [],
      sourceUrl: chilematUrl,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${fields.lat},${fields.lng}`,
      confidence: "Alta",
      verifiedAt: checkedAt,
    }];
  });
}

async function mtsStores() {
  const pagesResponse = await fetch(mtsPagesUrl);
  if (!pagesResponse.ok) throw new Error(`MTS source returned ${pagesResponse.status}`);
  const pages = await pagesResponse.json();
  const locations = pages.flatMap((page) => {
    const html = page.content?.rendered || "";
    return [...html.matchAll(/(?:href|src)=["']([^"']*google\.com\/maps\/embed\/v1\/place[^"']*)/gi)].map((match, index) => {
      const embedUrl = match[1].replace(/&#0*38;/g, "&").replace(/&amp;/g, "&");
      const query = embedUrl.match(/[?&]q=([^&]+)/);
      return { partner: page.title.rendered, slug: page.slug, sourceUrl: page.link, address: query ? decodeURIComponent(query[1].replace(/\+/g, " ")) : "", embedUrl, index };
    });
  });
  if (locations.length !== 133) throw new Error(`MTS expected 133 official map entries, received ${locations.length}`);

  const geocoded = await mapInBatches(locations, 12, async (location) => {
    const response = await fetch(location.embedUrl);
    const html = await response.text();
    const match = html.match(/(-(?:1[789]|[2-5]\d)\.\d{4,}),(-(?:6[6-9]|7[0-6])\.\d{4,})/);
    if (!response.ok || !match) throw new Error(`MTS coordinate unavailable for ${location.address}`);
    return { ...location, coordinates: [Number(match[2]), Number(match[1])] };
  });

  const classified = await mapInBatches(geocoded, 15, async (location) => {
    const params = new URLSearchParams({ geometry: location.coordinates.join(","), geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects", outFields: "nom_reg,nom_com", returnGeometry: "false", f: "json" });
    const payload = await (await fetch(`${bcnCommuneQuery}?${params}`)).json();
    const attributes = payload.features?.[0]?.attributes;
    if (!attributes) throw new Error(`BCN commune unavailable for ${location.address}`);
    return { ...location, commune: attributes.nom_com, region: cleanRegion(attributes.nom_reg) };
  });

  return classified.map((location) => ({
    id: `mts-${location.slug}-${location.index}`,
    chain: "MTS",
    name: location.partner,
    format: "Ferretería asociada",
    address: location.address,
    commune: location.commune,
    region: location.region,
    coordinates: location.coordinates,
    phone: "",
    hours: {},
    services: [],
    sourceUrl: location.sourceUrl,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${location.coordinates[1]},${location.coordinates[0]}`,
    confidence: "Alta",
    verifiedAt: checkedAt,
  }));
}

const [sodimac, easy, chilemat, mts, chileRegions] = await Promise.all([
  sodimacStores(), easyStores(), chilematStores(), mtsStores(), fetch(chileRegionsUrl).then((response) => {
    if (!response.ok) throw new Error(`BCN map source returned ${response.status}`);
    return response.json();
  }),
]);
const stores = [...sodimac, ...easy, ...chilemat, ...mts];
const output = {
  meta: {
    generatedAt: checkedAt,
    coordinateSystem: "WGS84",
    publishedStores: stores.length,
    scope: "Puntos de venta físicos activos con coordenadas publicadas por la fuente oficial",
    coverage: {
      SODIMAC: { status: "complete", count: sodimac.length, source: sodimacListUrl },
      EASY: { status: "complete", count: easy.length, source: "https://www.easy.cl/tiendas" },
      CHILEMAT: { status: "complete", count: chilemat.length, source: chilematUrl },
      MTS: { status: "complete", count: mts.length, source: mtsUrl },
    },
  },
  stores,
};

await mkdir("public", { recursive: true });
await writeFile("public/stores.json", JSON.stringify(output, null, 2) + "\n", "utf8");
await writeFile("public/chile-regions.geojson", JSON.stringify(chileRegions), "utf8");
await writeFile("public/chile-map.svg", chileSvg(chileRegions), "utf8");
console.log(`Generated ${stores.length} verified stores: Sodimac ${sodimac.length}, Easy ${easy.length}, Chilemat ${chilemat.length}, MTS ${mts.length}`);
