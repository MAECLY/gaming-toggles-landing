# Gaming Toggles — landing

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

## Iconos

Las imágenes de `public/assets/` se rasterizan desde los SVG del repo del plugin para que el
arte no diverja. Para regenerarlas, desde `gaming-toggles`:

```sh
npm run render:icons -- --site ../gaming-toggles-landing/public/assets
```

## Licencia

MIT — ver [LICENSE](LICENSE).
