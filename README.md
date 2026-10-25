# Gaming Toggles — landing

[![Estrellas](https://img.shields.io/github/stars/MAECLY/gaming-toggles-landing?style=flat-square&label=estrellas)](https://github.com/MAECLY/gaming-toggles-landing/stargazers) [![Visitas](https://hits.sh/github.com/MAECLY/gaming-toggles-landing.svg?label=visitas&style=flat-square)](https://hits.sh/github.com/MAECLY/gaming-toggles-landing/) [![Último commit](https://img.shields.io/github/last-commit/MAECLY/gaming-toggles-landing?style=flat-square&label=último%20commit)](https://github.com/MAECLY/gaming-toggles-landing/commits/main)

Landing estática (ES/EN) de [Gaming Toggles for PC](https://github.com/MAECLY/gaming-toggles),
publicada en [gaming-toggles.maecly.com](https://gaming-toggles.maecly.com/) con Vercel.

Plugin en el [Marketplace de Elgato](https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4).

## Estructura

- `public/` — el sitio que se publica tal cual, sin paso de build.
- `tests/` — contenido, API de releases y E2E responsive con Playwright.
- `scripts/serve.mjs` — servidor local en `http://127.0.0.1:4173`.

## Desarrollo

```sh
npm ci
npm run serve              # previsualizar
npm test                   # contenido y API de releases
npm run test:e2e           # E2E en Edge (como CI)
npm run test:e2e:chromium  # E2E en Chromium (macOS/Linux)
```

## Publicación

Cada push a `main` despliega a producción en Vercel (proyecto
`gaming-toggles-landing-page`); los PR generan previews. El DNS vive en Cloudflare:
`gaming-toggles` es un CNAME sin proxy hacia Vercel.

## Métricas públicas

La línea del hero muestra descargas reales y nada más:

- **GitHub**: suma de `download_count` de todos los assets de todas las Releases, consultada en el navegador
  contra `api.github.com` en cada visita. Si la API falla o limita la cuota, la cifra no se muestra.
- **Elgato Marketplace**: Elgato no ofrece API pública, así que se publica como instantánea fechada en
  `public/assets/metrics.json` y la web indica siempre la fecha («al 24 oct 2026»). No se publican ventas.

Para actualizar la instantánea con un export nuevo de Elgato Maker Console:

1. Exporta la analítica del producto «Gaming Toggles for PC» desde Maker Console.
2. Suma la columna de unidades (adquisiciones gratuitas) de todos los días hasta el último día completo del export.
3. Edita `public/assets/metrics.json`: `elgatoUnits` con esa suma y `through` con ese último día en formato
   `AAAA-MM-DD`. Deja `source` como `"Elgato Maker Console export"`.
4. `npm test`, PR y merge: Vercel lo publica. El JSON-LD suma ambas cifras automáticamente.

## Iconos

Las imágenes de `public/assets/` se rasterizan desde los SVG del repo del plugin para que el
arte no diverja. Para regenerarlas, desde `gaming-toggles`:

```sh
npm run render:icons -- --site ../gaming-toggles-landing/public/assets
```

## Licencia

MIT — ver [LICENSE](LICENSE).
