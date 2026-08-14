# Planning Poker MFE

Módulo remoto de negócio para estimativas ágeis (Planning Poker) do ecossistema de Micro Frontends da **Coelho Labs**. É um **Feature MFE**: carrega as regras de negócio da funcionalidade — salas, votação oculta, consenso e sugestão de IA — e se acopla ao **portal-shell** (Core) via **Module Federation**, podendo rodar standalone durante o desenvolvimento.

## Stack

| Pacote | Versão |
|---|---|
| React / React DOM | 19.2.8 |
| React Router DOM | 7.18.2 |
| Vite | 8.2.1 |
| TypeScript | 6.0.3 |
| Tailwind CSS | 4.3.3 |
| shadcn/ui (`base-nova` / Base UI) | 4.18.0 |
| lucide-react | 1.31.0 |
| @module-federation/vite | 1.20.6 |
| ESLint | 10.8.1 |

Recursos: **React Compiler** (memoização automática via `@rolldown/plugin-babel`), **shadcn/ui + Tailwind** com tokens oklch consumidos do Core, Vite + Rolldown e `typescript-eslint`.

## Como rodar

```bash
npm install
npm run dev       # dev standalone em http://localhost:4175
npm run lint      # eslint .
npm run build     # tsc -b && vite build (typecheck + bundle)
npm run preview   # serve o build de produção (porta 4173)
```

Sem backend, o módulo roda em **modo demo** (mock in-memory com bots votando, revelação e sugestão de IA) — `VITE_USE_MOCKS=1` (default). Para consumir o backend FastAPI privado: `VITE_USE_MOCKS=0` e `VITE_API_BASE=http://localhost:8000`.

## Arquitetura

```
src/
├── main.tsx                 # bootstrap do shell standalone (dev)
├── App.tsx                  # shell standalone com BrowserRouter (não entra no remote)
├── RemoteAppEntry.tsx       # entrada exposta ao host: apenas <Routes>
├── standalone.css           # dev: fonte Geist + tokens escopados em .app-shell
├── index.css                # tailwind + shadcn + @theme inline (sem tokens de tema)
├── pages/
│   ├── home/                # landing da feature
│   ├── create-room/         # fluxo de criação (POST /rooms + timer 5s)
│   └── room/                # sala de votação (votos ocultos, revelação, consenso, IA)
├── components/ui/           # componentes shadcn (base-nova)
└── lib/
    ├── utils.ts             # cn()
    └── api/                 # types, client REST+WS, mock, service, identity
```

- `src/RemoteAppEntry.tsx` — **única** entrada exposta ao host. Renderiza somente `<Routes>` (sem `BrowserRouter`): o router pertence ao Core/Host.
- `src/main.tsx` + `src/App.tsx` — shell de desenvolvimento standalone, fora do remote entry.
- `module-federation.config.ts` — config do Module Federation: `remoteEntry.js`, `manifest: true` (gera `mf-manifest.json`) e `shared` com `react`/`react-dom`/`react-router-dom` como `singleton`.

### Tema

O **Core é o dono do tema** (toggle em `portal-shell`, chave `coelho-theme`, classe `.dark` no `<html>` + anti-FOUC). O remote **não define tokens** (`:root`/`.dark`) nem carrega a fonte: apenas mapeia utilities Tailwind para `var(--*)` declarados pelo host. No standalone, o dev shell injeta tokens escopados em `.app-shell` (`standalone.css`), sem nunca colidir com o host.

### Integração com o portal-shell (dynamic remotes)

O Core registra o remote em runtime apontando para o **manifest** e monta a rota `/planning/*`:

```ts
import { registerRemotes, loadRemote } from "@module-federation/runtime";

registerRemotes([
  { name: "planning-poker", entry: "http://localhost:4175/mf-manifest.json" },
]);

const RemoteApp = lazy(() => loadRemote("planning-poker/RemoteAppEntry"));
// <Route path="/planning/*" element={<Suspense fallback={...}><RemoteApp /></Suspense>} />
```

- Dev: remote entry em `http://localhost:4175/remoteEntry.js` e manifest em `http://localhost:4175/mf-manifest.json`.
- Produção: remoteEntry + chunks servidos no mesmo origin do Core (reverse proxy/CDN); `base` da build via `VITE_BASE` (exigir barra final) e `server.origin` via `VITE_ORIGIN`.
- **Navegação interna é relativa** (`relative="path"`): o mesmo bundle roda em `/planning-poker/*` (standalone) e `/planning/*` (host).

## Regras de negócio

- **Sessões de Votação (Salas):** uma sala possui um Moderador e múltiplos Votantes; estado e revelação via WebSocket.
- **Votação Oculta:** os votos permanecem ocultos até o Moderador acionar "revelar cartas".
- **Consenso:** com divergência extrema, destacar os valores discrepantes (maior/menor) para debate.
- **Sugestão de IA:** exibir `suggested_story_points`, `confidence_score` e `justification` retornados pelo backend (a chamada ao LLM é responsabilidade do backend).
