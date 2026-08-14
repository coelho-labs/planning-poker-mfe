# AGENTS.md — Planning Poker MFE (Remote de Negócio)

Este repositório é o **Feature MFE de Planning Poker**: o módulo remoto especializado em estimativas ágeis do ecossistema de Micro Frontends da Coelho Labs. Contém as regras de negócio da funcionalidade (salas, votação oculta, sugestão de IA) e se acopla ao **Core/Host** (`portal-shell`). Pode rodar standalone para desenvolvimento, mas em produção é consumido como remote do Core.

**O que NÃO pertence aqui:**
- Layout global, gavetas de anúncio e overlay visual → `portal-shell` (Core).
- Backend FastAPI, WebSocket server-side e integração LLM → repositório privado (aqui só consumimos a API).

## Comandos

```bash
npm run dev      # servidor dev (Vite, modo remote standalone)
npm run build    # tsc -b && vite build  (typecheck faz parte do build)
npm run lint     # eslint .
npm run preview  # servidor de produção (porta 4173)
```

- Não há test runner nem suíte de testes.
- Verificação padrão de uma mudança: `npm run lint` e `npm run build`.

## Module Federation (plugin atual — não confunda!)

- O pacote instalado/configurado é **`@module-federation/vite`** (oficial, v1.20.6). README e docs antigos citam `@originjs/vite-plugin-federation` — **está desatualizado, ignore**. Não instale o `@originjs` para novas features.
- O plugin exporta `federation()` (adicionado em `vite.config.ts`) e `createModuleFederationConfig()` (helper de tipagem para a config).
- A config fica em **`module-federation.config.ts`** (arquivo separado, importado em `vite.config.ts` com extensão `.ts`).
- Opções relevantes do `createModuleFederationConfig`:
  - `name`: nome do módulo (aqui `planning-poker`).
  - `filename`: nome do remote entry (default `remoteEntry.js`).
  - `exposes`: módulos expostos ao host. A chave vira `nome-do-remote/nome-da-chave` no host (ex: `planning-poker/RemoteAppEntry`).
  - `remotes`: para consumir outros MFEs — string `nome@url` ou objeto `{ type: 'module', name, entry, entryGlobalName, shareScope }`.
  - `shared`: dependências compartilhadas com o host; `react`, `react-dom` e `react-router-dom` como `singleton: true` (duplicar React entre host e remote quebra o runtime).
  - Também existem: `publicPath`, `manifest`, `bundleAllCSS`, `varFilename`, `hostInitInjectLocation`.
- **Config atual:** expõe `./RemoteAppEntry` (`src/RemoteAppEntry.tsx`), `filename: remoteEntry.js`, `manifest: true` (gera `mf-manifest.json` + `mf-stats.json`), `shared` com `react`/`react-dom`/`react-router-dom` como singleton. O `requiredVersion` vem do `package.json` (evita drift de versão). Não há `remotes` (este módulo é só produtor).
- Ao migrar de `@originjs/vite-plugin-federation`, revise explicitamente o formato do remote entry, remotes dinâmicos, `shared` e compatibilidade entre bundlers (ver guia oficial do plugin).
- Porta dev fixa: 4175 (`strictPort`). Em `vite.config.ts`, `server.origin` vem de `VITE_ORIGIN` (default `http://localhost:4175`) e `base` de `VITE_BASE` (build; exigir **barra final**, ex. `https://cdn.coelho-labs.com/planning-poker/`).
- Remote entry: http://localhost:4175/remoteEntry.js (dev); manifest: http://localhost:4175/mf-manifest.json.

**Contrato com o portal-shell (dynamic remotes):**
- O core registra em runtime via `@module-federation/runtime` apontando para o manifest: `registerRemotes([{ name: 'planning-poker', entry: 'http://localhost:4175/mf-manifest.json' }])`.
- Consome com `loadRemote('planning-poker/RemoteAppEntry')`, montado em `<Route path="/planning-poker/*">` com `<Suspense>`.
- Não declarar o remote em `remotes` estático (mantém opcional e evita crash de boot com remote offline).
- Compartilhar `react`/`react-dom`/`react-router-dom` como `singleton: true` no core e alinhar a versão do `react-router-dom` (7.18.2).
- Dev: CORS coberto pelo Vite. Prod: servir remoteEntry + chunks no mesmo origin (reverse proxy/CDN); `base` da build via `VITE_BASE`.
- **Convenção:** todo MFE expõe `./RemoteAppEntry` como chave de entrada padrão; o core sempre importa `loadRemote('<nome>/RemoteAppEntry')`.
- A lista de remotes (nome → URL) deve vir de um registry (ex: `GET /api/mfe-registry`) para plugar módulos novos sem rebuild do core.

## Regra de arquitetura do router

- O módulo exposto (`src/RemoteAppEntry.tsx`) deve renderizar **apenas `<Routes>`** — **SEM `BrowserRouter`**. O router é fornecido pelo Core/Host; adicionar outro router aqui quebra a navegação quando acoplado.
- `src/main.tsx` + `src/App.tsx` (com `BrowserRouter` e rota `/planning-poker/*`) existem **só para desenvolvimento standalone**. Não incluí-los na entrada exposta.
- Mantenha `react-router-dom` em `shared` como `singleton: true` para o host e o remote usarem a mesma instância de router.
- **Navegação interna deve ser relativa** (`relative="path"`): o remote é montado em prefixos diferentes (`/planning-poker/*` no standalone, `/planning/*` no host). Use `<Link to="rooms/new" relative="path">` e `navigate('../:id', { relative: 'path' })` — nunca `to="/..."` absoluto.

## Tema no Core (contrato — NÃO duplicar tokens no remote)

O **Core/Host é o dono do tema** (toggle em `portal-shell`, chave `coelho-theme`, classe `.dark` no `<html>` + anti-FOUC). O remote apenas **consome** os tokens:

- `src/index.css` (bundlado no remote via `RemoteAppEntry.tsx`): só `@import tailwindcss`/`tw-animate-css`/`shadcn/tailwind.css`, `@custom-variant dark`, `@theme inline` (mapeia utilities → `var(--*)`) e um `@layer base` mínimo. **Não contém** `:root`/`.dark` com valores de tema nem `@import` da fonte — se redefinir, o CSS do remote sobrepõe o do host quando injetado.
- As utilities (`bg-background`, `text-muted-foreground`, `dark:...`) resolvem `var(--background)` etc. declarados pelo host. O host declara todos os tokens usados pelo remote (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-*, sidebar-*, radius).
- A exceção `--font-sans: 'Geist Variable'` no `@theme inline` do remote é mantida **porque é idêntica à do host** (evita que o Tailwind emita o default `-apple-system` no `:root` do remote e sobrescreva a fonte). O remote **não importa** o font-face — quem carrega o Geist é o host (e o `standalone.css` no dev).
- `src/standalone.css`: **só para o dev shell** (`main.tsx`). Declara a fonte Geist e os tokens escopados em `.app-shell` / `.app-shell.dark` (nunca `:root`), garantindo tema no standalone **sem nunca** colidir com o host.
- Verificação: em `dist/assets/RemoteAppEntry-*.css` não pode haver `font-face` nem tokens de cor redefinidos (apenas o mapeamento inline).

## Stack real (versões instaladas — confie no `npm ls`, não no README)

| Pacote | Versão |
|---|---|
| react / react-dom | 19.2.8 |
| react-router-dom | 7.18.2 |
| vite | 8.2.1 |
| typescript | 6.0.3 |
| tailwindcss / @tailwindcss/vite | 4.3.3 |
| shadcn (style `base-nova` / Base UI) | 4.18.0 |
| @base-ui/react | 1.7.0 |
| lucide-react | 1.31.0 |
| tw-animate-css | 1.4.0 |
| class-variance-authority / clsx / tailwind-merge | — |
| @module-federation/vite | 1.20.6 |
| @vitejs/plugin-react | 6.0.5 |
| @rolldown/plugin-babel | 0.2.3 |
| babel-plugin-react-compiler | 1.0.0 |
| eslint | 10.8.1 |
| typescript-eslint | 8.67.0 |
| eslint-plugin-react-hooks | 7.1.1 |
| eslint-plugin-react-refresh | 0.5.4 |
| @types/react / @types/react-dom | 19.2.18 / 19.2.4 |
| @types/node | 24.13.3 |

- Node: ^20.19.0 ou >=22.12.0 (exigência do plugin de federation).
- **React Compiler habilitado** via `@rolldown/plugin-babel` + `reactCompilerPreset()` em `vite.config.ts` — memoização é automática, não otimize manualmente com `useMemo`/`useCallback` sem necessidade.

## Regras de negócio relevantes ao front (Planning Poker)

- **Sessões de Votação (Salas):** uma sala possui um Moderador e múltiplos Votantes. A feature gerencia estado de sala, participação e revelação de votos via WebSocket.
- **Votação Oculta:** os votos dos participantes permanecem ocultos (chegam ao front de forma não revelada) até o Moderador acionar "revelar cartas".
- **Consenso:** com divergência extrema, destacar os valores discrepantes (maior e menor) para debate.
- **Sugestão de IA:** o front deve exibir a estimativa sugerida pela IA retornada pelo backend (`suggested_story_points` int, `confidence_score` float 0–1, `justification` string) — a chamada ao LLM é responsabilidade do backend, não deste MFE.
- **Sem BFF:** o frontend conecta-se diretamente via HTTP REST e WebSocket ao backend FastAPI (repo privado).

## Fluxo "Criar Sala" (vinheta de anúncio, core-driven)

1. Clique em "Criar Sala" dispara o overlay de transição global do Core (`absolute inset-0` restrito ao `<main>`), que injeta texto dinâmico + `onCloseCallback`. **O Core gerencia o visual; esta feature gerencia o estado de negócio.**
2. `Promise.all` com duas promessas em paralelo:
   - Requisição `POST /rooms` para o backend FastAPI.
   - Timer local de **5000ms** (tempo de impressão válido do AdSense).
3. O front guarda o ID da sala em estado local e segura a tela até ambas as promessas resolverem (timer segura se a API responder antes; a API segura se demorar).
4. Redirecionamento para `/rooms/:id` só quando **ambas** resolvem.
5. No **standalone** (sem core), o `CreateRoom.page.tsx` mostra um estado de carregamento próprio (`aria-busy`) no lugar da vinheta.

## API consumida (backend privado + mock)

- `src/lib/api/types.ts` — contratos (`Room`, `Participant`, `Vote`, `AiSuggestion`, mensagens WS como union types). Sem `enum` (TS `erasableSyntaxOnly`).
- `src/lib/api/client.ts` — REST (`POST /rooms`, `GET /rooms/:id`, `GET /rooms/:id/ai-suggestion`) + WebSocket; base URL via `VITE_API_BASE`. A sugestão de IA tem o WS `ai_suggestion` como caminho primário e o REST `fetchAiSuggestion` como fallback (disparado 1.2s após a revelação se o WS não entregar antes).
- `src/lib/api/mock.ts` — mock in-memory (bots votam sozinhos, revelação, sugestão de IA) para rodar demo **sem backend**.
- `src/lib/api/service.ts` — seleciona mock ou client real por `VITE_USE_MOCKS` (default `"1"`).
- `src/lib/api/identity.ts` — identidade do participante (`saveSelf`/`loadSelf`, sessionStorage).

## TypeScript / lint (armadilhas reais do tsconfig)

- `erasableSyntaxOnly: true` (TS 6): **proibido** `enum`, `namespace` e *parameter properties* (`constructor(private x)`) — use `union types`/objetos.
- `verbatimModuleSyntax: true`: use `import type` para importações somente de tipo.
- `allowImportingTsExtensions: true` + bundler mode: imports usam extensão explícita (ex: `./pages/home/Home.page.tsx`).
- `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` ativos.
- `tsconfig.json` raiz carrega as `compilerOptions` do projeto DTS do Module Federation (`jsx: "react-jsx"`, `moduleResolution: "bundler"`, `types: ["vite/client"]`, `allowImportingTsExtensions`, `skipLibCheck`, `rootDir: "."`, `ignoreDeprecations: "6.0"`). Motivo: o plugin DTS gera um tsconfig que faz `extends` do raiz e **descarta `paths`/`baseUrl`** ao montar o projeto; sem essas options a compilação de tipos do `RemoteAppEntry.tsx` falha (`#TYPE-001`). Não afeta o typecheck da app — o `tsc -b` compila `tsconfig.app.json`/`tsconfig.node.json`, que têm config própria.
- `baseUrl` foi **removido** do raiz (deprecado no TS 6 → `TS5101` no projeto do plugin). `tsconfig.app.json` mantém o próprio `baseUrl` + `ignoreDeprecations: "6.0"` para o `tsc -b`.
- Histórico `#TYPE-001`: a causa original eram os `.d.ts` do react-router v7; hoje, com `skipLibCheck` + as options acima, a geração de tipos funciona (saída em `dist/@mf-types`). Para reproduzir um erro do DTS, rode o comando `tsc --project node_modules/.federation/tsconfig.<hash>.json` que o log do build imprime.

## Estrutura atual (estado do código)

- `src/main.tsx` / `src/App.tsx`: shell standalone de dev (próprio `BrowserRouter`, rota `/planning-poker/*`). Importa `standalone.css` (tokens escopados).
- `src/RemoteAppEntry.tsx`: **entrada exposta ao host** — somente `<Routes>` com as rotas da feature (`index`, `rooms/new`, `rooms/:roomId`).
- `src/pages/home/Home.page.tsx`: landing da feature (hero + cartões de recursos).
- `src/pages/create-room/CreateRoom.page.tsx`: fluxo de criação (`Promise.all` + timer 5s) com formulário (nome, moderador, escala).
- `src/pages/room/Room.page.tsx`: sala de votação (cartas, votação oculta, revelação, destaque de discrepância) + `AiSuggestionCard`.
- `src/components/ui/*`: componentes **shadcn/base-nova** (`button`, `card`, `badge`, `input`, `label`, `avatar`, `separator`, `progress`, `select`, `tooltip`).
- `src/lib/api/*`: camada de API (tipos, client REST+WS, mock, seletor, identidade).
- **Estilização:** 100% shadcn/ui + utilities Tailwind. **Não** usar CSS Modules, ids globais nem `var(--accent)` de starters antigos — o CSS do remote é injetado no host, então estilos globais vazam/colidem com o portal-shell.
- **ESLint:** `@typescript-eslint/consistent-type-imports` ativo (alinha com `verbatimModuleSyntax`). `eslint-plugin-jsx-a11y`/`eslint-plugin-react` ainda não declaram suporte ao ESLint 10 — acessibilidade é garantida no código (HTML semântico, labels, `:focus-visible`).
