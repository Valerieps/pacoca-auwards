# Arquitetura

O desenho técnico que o código não mostra sozinho.

- **Entra aqui:** as invariantes (o que precisa ser sempre verdade), o modelo de dados, o fluxo de
  eventos e as migrações.
- **Não entra aqui:** um passeio pelos arquivos (o código mostra), o porquê de cada decisão (`adr/`),
  o que falta construir (`ROADMAP.md`) e as regras de produto (`spec/`).

## Visão geral

- **App:** web app (Vite + React + TypeScript), instalável (PWA). Fala só com a própria origem.
- **Servidor:** um Cloudflare Worker serve os arquivos do app, a API em `/api`, a conexão ao vivo e
  o cron. Todos os dados do grupo ficam num único Durable Object, `Group`, com SQLite. Ver ADR-004.
- **Login:** Google, pelo fluxo de código OAuth no Worker, com cookie de sessão. Ver ADR-005.
- **TMDB:** o Worker busca mídias, datas e temporadas na API do TMDB; os pôsteres carregam direto de
  `image.tmdb.org`. Ver ADR-008.
- **Pede pra Paçoca:** o Worker chama o Worker do Pede pra Paçoca por um Service Binding
  (`isMember`, `watchedBy`), sem rota pública. Ver ADR-009.

```
app (celular) ──POST /api/query|command──► Worker ──RPC──► Group (Durable Object, SQLite)
     ▲                                       ▲                    │
     └──────── WebSocket /api/live ──────────┘                    │ "mudou: members, invites…"
                                             cron 5 min ──► tick  ▼
                                                     todos os apps abertos refazem a consulta
```

## Camadas

`domain` ← `application` ← `infrastructure` e `ui`, no app e no servidor.

- `src/domain/`: regras puras e os textos da interface (`strings.ts`). O app e o servidor usam o
  mesmo código.
- `src/application/api-contract.ts`: os nomes, entradas e saídas das consultas e dos comandos. É só
  tipo; o servidor importa com `import type`.
- `server/application/`: os casos de uso do servidor. Síncronos, dependem só das portas `Sql`,
  `Clock` e `IdGenerator`; os testes rodam sobre `node:sqlite`.
- `server/infrastructure/` e `server/entry/`: Cloudflare, Google, cookies. Finos.
- A interface chama `Backend` e `LiveUpdates` (portas em `src/application/ports.ts`), nunca a rede
  direto.

## Invariantes

- Só o servidor grava. O app não tem acesso ao banco; toda escrita é um comando que o `Group`
  confere (sessão, papel, regra) e grava numa transação só.
- Um comando roda sozinho: o Durable Object processa uma chamada por vez, e tudo o que o comando
  causa entra junto ou não entra.
- Papéis são conferidos no servidor, nunca só na interface.
- Sempre existe pelo menos um admin.
- O que um membro lê depende da fase: o servidor filtra cada consulta pela fase atual da edição
  (indicações provisórias e votos de outros nunca saem do servidor antes da hora).
- Um item é identificado por `media_type` + `tmdb_id` + temporada; nunca pelo título.
- Trazer do Pede pra Paçoca nunca sobrescreve o que o membro editou (`watched_at_edited`,
  `rating_edited`) nem desarquiva.
- A sessão vale só enquanto o membro está ativo. Remover alguém apaga as sessões dele e fecha os
  WebSockets abertos (o comando devolve `disconnect`), então o acesso acaba na hora.
- Um comando devolve os tópicos (`Topic`) que mudou; o `Group` avisa todos os apps abertos, que
  refazem as consultas desses tópicos.

## Modelo de dados

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| `members` | `id`, `google_sub`, `email`, `name`, `photo_url`, `roles` (JSON), `active` | Removido fica com `active = 0`; um convite novo traz o mesmo membro de volta |
| `sessions` | `token_hash`, `member_id`, `expires_at` | Só o SHA-256 do token; o cron apaga as vencidas |
| `invites` | `email`, `invited_by`, `state` (`pending`, `accepted`, `revoked`) | Um por e-mail |
| `media` | `media_type`, `tmdb_id`, `season`, `title`, `poster_path`, `release_date`, `release_date_manual` | Cópia do que veio do TMDB; chave única nos três primeiros. Desenho, ainda sem migração |
| `list_items` | `member_id`, `media_id`, `state`, `rating`, `rating_edited`, `watched_at`, `watched_at_edited`, `from_pede`, `archived`, `wants_to_nominate`, `justification` | Um por membro e mídia. Desenho, ainda sem migração |
| `pede_imports` | `member_id`, `last_at` | A última vez que o membro trouxe do Pede pra Paçoca. Desenho |
| `editions` | `year`, `name`, `phase`, `phase_ends_at` (JSON, por fase) | Uma por ano; o cron troca a fase. Desenho |

## Fluxo de eventos

- **Troca de fase:** o cron (`GroupService.tick`) vê que a data de fim da fase passou, no horário
  de Brasília, e avança a edição numa transação. Na mesma transação faz o que a troca pede: no fim
  da Fase 2 registra as indicações de quem não registrou; no fim da Fase 4 torna oficiais os votos
  provisórios. Depois avisa os apps abertos.
- O feed da camada social, quando existir, lê esses eventos; cada um é gravado na transação do
  comando que o causa.

## Migrações

`MIGRATIONS` em `server/application/schema.ts` é uma lista numerada; o `Group` aplica as que faltam
ao iniciar, cada uma numa transação, e registra em `schema_migrations`. Uma migração publicada nunca
muda: a mudança seguinte é uma migração nova. Remover uma coluna leva duas versões: primeiro o código
para de usar, depois a coluna sai. A classe do Durable Object tem suas próprias migrações no
`wrangler.jsonc` (`tag`), que também só crescem.
