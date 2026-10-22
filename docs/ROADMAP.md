# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Entrega | Spec | Observação |
| --- | --- | --- | --- |
| Entrada de quem está no Pede pra Paçoca | 1 | `spec/acesso-e-membros.md` | Service Binding com `isMember` (ADR-009); precisa da mudança no repositório do Pede pra Paçoca |
| Minha lista: adicionar pelo TMDB, estados, nota, datas, filtros, arquivar | 1 | `spec/minha-lista.md` | ADR-008 |
| Indicação provisória | 1 | `spec/minha-lista.md` | |
| Trazer do Pede pra Paçoca | 1 | `spec/trazer-do-pede.md` | `watchedBy` no Pede pra Paçoca (ADR-009) |
| Edição e calendário, nascendo na Fase 1 | 1 | `spec/premiacao.md` | A troca de fase pelo cron, no horário de Brasília |
| Fases 2 e 3: registrar indicações, indicações abertas, categorias, sugestões | 2 | `spec/premiacao.md` | |
| Fase 4, apuração e anúncio | 3 | `spec/premiacao.md` | |
| Camada social e notificações | 4 | `spec/camada-social.md` | Notificações pedem Web Push e um ADR |

## O código ainda não segue o spec

- A tela de início ainda é a de exemplo do template (`Home` e `src/domain/greeting.ts`); sai quando
  a minha lista existir.

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
