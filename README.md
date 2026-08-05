# Mapa Ferretero Chile

Dashboard interactivo con los puntos de venta oficiales de Sodimac, Easy, Chilemat y MTS en Chile. Permite activar una o varias cadenas, buscar locales, filtrar por región y navegar el mapa con zoom y desplazamiento.

## Cobertura incluida

La versión publicada contiene 410 puntos georreferenciados:

- Sodimac: 73
- Easy: 42
- Chilemat: 162
- MTS: 133

Los datos consolidados están en `public/stores.json`, por lo que no se necesita ninguna clave para ejecutar el dashboard.

## Ejecutar localmente

Requisito: Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

Abre la dirección local que aparece en la terminal, normalmente `http://localhost:3000`.

Para validar una compilación de producción:

```bash
npm run build
npm test
```

## Actualizar los puntos de venta

El sincronizador consulta las fuentes oficiales y vuelve a generar `public/stores.json`. Easy y Chilemat requieren las claves que utilizan sus respectivos sitios públicos; no deben guardarse en Git.

1. Copia `.env.example` como `.env`.
2. Completa `EASY_API_KEY` y `CHILEMAT_FIREBASE_API_KEY`.
3. Ejecuta:

```bash
npm run sync:data
```

Fuentes principales:

- Sodimac: directorio oficial de tiendas y servicio oficial de locales.
- Easy: [directorio oficial de tiendas](https://www.easy.cl/stores).
- Chilemat: [Encuentra tu ferretería](https://www.chilemat.cl/encuentra-ferreteria).
- MTS: [Ferreteros de verdad](https://www.mts.cl/ferreteros-de-verdad/).
- Límites regionales y comunales: Biblioteca del Congreso Nacional de Chile.

## Tecnología

- React y TypeScript
- Leaflet con cartografía de OpenStreetMap
- vinext/Vite

Los marcadores no son puntos inventados: cada registro conserva su fuente, fecha de verificación y coordenadas WGS84.
