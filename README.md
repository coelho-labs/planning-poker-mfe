# Planning Poker MFE

Módulo remoto de negócio para estimativas ágeis (Planning Poker) do ecossistema de Micro Frontends da **Coelho Labs**. É um **Feature MFE**: carrega as regras de negócio da funcionalidade — salas, votação oculta, consenso e sugestão de IA — e se acopla ao **portal-shell** (Core) via **Module Federation**, podendo rodar standalone durante o desenvolvimento.

## Stack

| Pacote | Versão |
|---|---|
| React / React DOM | 19.2.8 |
| React Router DOM | 7.18.2 |
| Vite | 8.2.1 |
| TypeScript | 6.0.3 |
| @module-federation/vite | 1.20.6 |
| ESLint | 10.8.1 |

Recursos: **React Compiler** (memoização automática via `@rolldown/plugin-babel`), **CSS Modules** com tokens escopados, Vite + Rolldown e `typescript-eslint`.

## Como rodar

```bash
npm install
npm run dev       # dev standalone em http://localhost:4175
npm run lint      # eslint .
npm run build     # tsc -b && vite build (typecheck + bundle)
npm run preview   # serve o build de produção (porta 4173)
```

## Arquitetura

```
src/
├── main.tsx              # bootstrap do shell standalone (dev)
├── App.tsx               # shell standalone com BrowserRouter (não entra no remote)
├── RemoteAppEntry.tsx    # entrada exposta ao host: apenas <Routes>
└── pages/home/           # landing da feature (CSS Modules + tokens --pp-*)
```

- `src/RemoteAppEntry.tsx` — **única** entrada exposta ao host. Renderiza somente `<Routes>` (sem `BrowserRouter`): o router pertence ao Core/Host.
- `src/main.tsx` + `src/App.tsx` — shell de desenvolvimento standalone, fora do remote entry.
- `module-federation.config.ts` — config do Module Federation: `remoteEntry.js`, `manifest: true` (gera `mf-manifest.json`) e `shared` com `react`/`react-dom`/`react-router-dom` como `singleton`.

### Integração com o portal-shell (dynamic remotes)

O Core registra o remote em runtime apontando para o **manifest** e monta a rota `/planning-poker/*`:

```ts
import { registerRemotes, loadRemote } from "@module-federation/runtime";

registerRemotes([
  { name: "planning-poker", entry: "http://localhost:4175/mf-manifest.json" },
]);

const RemoteApp = lazy(() => loadRemote("planning-poker/RemoteAppEntry"));
// <Route path="/planning-poker/*" element={<Suspense fallback={...}><RemoteApp /></Suspense>} />
```

- Dev: remote entry em `http://localhost:4175/remoteEntry.js` e manifest em `http://localhost:4175/mf-manifest.json`.
- Produção: remoteEntry + chunks servidos no mesmo origin do Core (reverse proxy/CDN); `base` da build via `VITE_BASE` (exigir barra final) e `server.origin` via `VITE_ORIGIN`.

## Regras de negócio

- **Sessões de Votação (Salas):** uma sala possui um Moderador e múltiplos Votantes; estado e revelação via WebSocket.
- **Votação Oculta:** os votos permanecem ocultos até o Moderador acionar "revelar cartas".
- **Consenso:** com divergência extrema, destacar os valores discrepantes (maior/menor) para debate.
- **Sugestão de IA:** exibir `suggested_story_points`, `confidence_score` e `justification` retornados pelo backend (a chamada ao LLM é responsabilidade do backend).

## Roadmap

- [ ] Tela de criação de sala (fluxo com a vinheta de transição do Core)
- [ ] Sala de votação em tempo real (WebSocket)
- [ ] Revelação de votos e destaque de consenso
- [ ] Painel de sugestão de IA
