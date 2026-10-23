# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Entrega | Spec | Observação |
| --- | --- | --- | --- |
| Entrada de quem está no Pede pra Paçoca | 1 | `spec/acesso-e-membros.md` | O lado do AUwards está pronto; falta o `isMember` no repositório do Pede pra Paçoca e o binding `PEDE` no `wrangler.jsonc` (ADR-009) |
| Minha lista: adicionar pelo TMDB, estados, nota, datas, filtros, arquivar | 1 | `spec/minha-lista.md` | A busca no TMDB já existe (`catalog.*`, ADR-010); faltam as tabelas `media` e `list_items` e as telas |
| Indicação provisória | 1 | `spec/minha-lista.md` | |
| Trazer do Pede pra Paçoca | 1 | `spec/trazer-do-pede.md` | O adaptador e `pede.status` existem; falta `watchedBy` no Pede pra Paçoca (ADR-009) e o comando de trazer |
| Fases 2 e 3: registrar indicações, indicações abertas, categorias, sugestões | 2 | `spec/premiacao.md` | O que a troca de fase causa entra em `advancePhase` |
| Fase 4, apuração e anúncio | 3 | `spec/premiacao.md` | |
| Camada social e notificações | 4 | `spec/camada-social.md` | Notificações pedem Web Push e um ADR |

## O código ainda não segue o spec

- Nada por enquanto.

## Adiado

- Interface própria para o computador — por enquanto o desktop usa a mesma do celular.
- Identidade visual da Paçoca — as cores ainda são as do template; a dona pediu para deixar para depois.

## Revisar as lacunas que o agente decidiu

- [ ] Ao registrar as indicações na Fase 2, eu posso desmarcar algumas antes de confirmar
  (`spec/premiacao.md`).
- [ ] A votação da Fase 4 mantém as regras da spec antiga: um voto por categoria, abstenção e voto
  "não vi" (`spec/premiacao.md`).
- [ ] Organizador e admin são papéis independentes; o admin dá o papel de Organizador ao Cesar na
  tela de membros (`spec/acesso-e-membros.md`).
- [ ] Trazer do Pede pra Paçoca traz tudo, de qualquer ano, e os itens entram no estado Assisti
  (`spec/trazer-do-pede.md`).
- [ ] Quem foi removido não volta pelo Pede pra Paçoca: só com um convite novo
  (`spec/acesso-e-membros.md`).
- [ ] O calendário: uma fase sem data de início começa no fim da anterior; uma sem data de fim não
  termina; as datas que ainda vão chegar ficam no futuro e em ordem; as que já passaram não mudam
  mais (`spec/premiacao.md`).
- [ ] A busca de uma série não oferece a temporada 0 do TMDB ("Especiais") (`spec/minha-lista.md`).
