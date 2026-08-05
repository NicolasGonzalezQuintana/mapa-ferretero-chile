# Mapa Ferretero Chile

Dashboard interactivo con los puntos de venta oficiales de Sodimac, Easy, Chilemat y MTS en Chile. Permite activar una o varias cadenas, buscar locales, filtrar por región y navegar el mapa con zoom y desplazamiento.

## Cobertura incluida

La versión publicada contiene 410 puntos georreferenciados:

- Sodimac: 73
- Easy: 42
- Chilemat: 162
- MTS: 133

Los datos consolidados están en `public/stores.json`, por lo que no se necesita ninguna clave para ejecutar el dashboard.

## Paso a paso para ejecutar el dashboard

### 1. Instalar los requisitos

Necesitas:

- [Git](https://git-scm.com/downloads).
- [Node.js](https://nodejs.org/) versión 22.13 o superior. Se recomienda instalar la versión LTS.

Comprueba las versiones desde PowerShell, Terminal o una consola:

```bash
git --version
node --version
npm --version
```

Si `node --version` muestra una versión inferior a 22.13, actualiza Node.js antes de continuar.

### 2. Descargar el proyecto

Opción recomendada, usando Git:

```bash
git clone https://github.com/NicolasGonzalezQuintana/mapa-ferretero-chile.git
cd mapa-ferretero-chile
```

También puedes descargarlo desde GitHub con **Code → Download ZIP**. En ese caso, descomprime el archivo y abre una terminal dentro de la carpeta `mapa-ferretero-chile`.

### 3. Descargar e instalar las dependencias

Ejecuta este comando dentro de la carpeta del proyecto:

```bash
npm install
```

El comando lee `package.json` y descarga automáticamente React, Leaflet, vinext y las demás dependencias necesarias. La carpeta generada `node_modules` no se sube a GitHub.

### 4. Iniciar el dashboard

```bash
npm run dev
```

Cuando la terminal indique que el servidor está listo, abre la dirección que muestra en pantalla, normalmente:

```text
http://localhost:3000
```

Mantén la terminal abierta mientras uses el dashboard. Para detenerlo, vuelve a la terminal y presiona `Ctrl + C`.

Los 410 locales ya están incluidos en `public/stores.json`; no necesitas claves API ni una cuenta de ChatGPT para ejecutar el mapa.

### 5. Compilar y validar la versión de producción

```bash
npm run build
npm test
```

Si ambos comandos finalizan sin errores, el proyecto está listo para desplegarse.

### 6. Volver a ejecutarlo otro día

No necesitas repetir `npm install` cada vez. Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm run dev
```

Después de descargar cambios nuevos desde GitHub, usa:

```bash
git pull
npm install
npm run dev
```

### Problemas frecuentes

- **`node` o `npm` no se reconoce como comando:** instala Node.js y vuelve a abrir la terminal.
- **La versión de Node es inferior a 22.13:** actualiza Node.js a la versión LTS actual.
- **El puerto ya está ocupado:** detén el otro servidor con `Ctrl + C` o utiliza el puerto alternativo que indique la terminal.
- **Las dependencias están dañadas o incompletas:** elimina `node_modules`, ejecuta nuevamente `npm install` y después `npm run dev`.
- **El mapa base no aparece:** comprueba la conexión a Internet, porque las calles se cargan desde OpenStreetMap. Los datos de los locales permanecen en el proyecto.

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
