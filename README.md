# Cinema Bergamo

Programmazione unificata dei cinema di Bergamo in un'unica interfaccia:
**UCI Cinemas Orio**, **Arcadia Stezzano** e **Notorious Curno**.

Live: https://d3dde.github.io/Cinema-Frontend/

## Funzionalità

- Tutta la programmazione dei tre cinema in un unico elenco cronologico.
- Raggruppamento automatico dello stesso film tra catene diverse (i titoli sono
  normalizzati e clusterizzati, es. `DUNE PARTE TRE | ANTEPRIMA IMAX` → `Duna: Parte Tre`).
- Filtri per periodo, cinema, sale speciali (IMAX, ISENSE, XL, ENERGIA, …),
  formato (2D/3D), lingua originale, sottotitolati e orari.
- Link diretti alla prenotazione per ogni singolo spettacolo.
- Export `.ics` del film selezionato.
- Tema chiaro/scuro, interfaccia in italiano.

## Struttura

Monorepo con [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces):

| Cartella   | Descrizione |
| ---------- | ----------- |
| `server/`  | Backend Express: scarica, normalizza e aggrega la programmazione dalle API dei cinema. Espone `/api/cinemas`, `/api/films`, `/api/film/:key/showtimes`, `/api/schedule`. |
| `web/`     | Frontend Svelte 5 + Vite + TypeScript (Tailwind v4, bits-ui). |
| `scripts/` | `snapshot.mjs`: genera un JSON statico con tutta la programmazione. |
| `assets/`  | Loghi originali dei cinema (le copie servite stanno in `web/public/brands/`). |

Il frontend riusa **lo stesso motore dati del backend** tramite l'alias
`@engine` → `server/src`. In locale parla con l'Express server (`/api`); nella
build statica (GitHub Pages) esegue lo stesso codice nel browser, sostituendo il
trasporto HTTP con un proxy CORS (`web/src/lib/engine/`).

### Fonti dati

- **UCI Orio** — API Cloud Run (`myuci---uci-backend-production-*.a.run.app`).
  Supporta CORS: viene chiamata direttamente, con fallback sul proxy.
- **Arcadia Stezzano** / **Notorious Curno** — Webtic (`secure.webtic.it`).
  Nessun header CORS: passa sempre dal proxy.

## Sviluppo

Requisiti: **Node.js 24+**.

```bash
npm install
npm run dev          # server su :8787 + web su :5173 (proxy /api → :8787)
```

Il progetto include anche una flake Nix: `nix develop` fornisce Node 24 e npm.

### Script utili

```bash
npm run typecheck    # svelte-check + tsc
npm run build        # build web + server (uso locale)
npm run snapshot     # rigenera web/public/data/snapshot.json
npm run build:static # build statica per GitHub Pages
```

## Deploy

Il deploy è automatizzato da `.github/workflows/deploy.yml`:

1. scarica i dati reali dalle API (dai runner non c'è il problema CORS) e genera
   `web/public/data/snapshot.json` come fallback;
2. builda il sito statico con `VITE_BASE=/Cinema-Frontend/` e `VITE_STATIC=1`;
3. pubblica su GitHub Pages.

Viene eseguito a ogni push su `main`, manualmente e **ogni 3 ore** (cron) per
rinnovare i dati.

### Variabili d'ambiente (build web)

| Variabile         | Descrizione |
| ----------------- | ----------- |
| `VITE_STATIC`     | `1` per attivare il motore dati lato browser (Pages). |
| `VITE_BASE`       | Base path pubblico (es. `/Cinema-Frontend/`). |
| `VITE_CORS_PROXY` | Template proxy personalizzato, es. `https://myproxy/?url={url}`. |

## Note

I dati provengono da API pubbliche non ufficiali dei cinema e possono essere
incompleti o in ritardo. Il trasporto passa da proxy CORS pubblici: se non
disponibili, il sito usa l'ultimo snapshot generato dal workflow.
