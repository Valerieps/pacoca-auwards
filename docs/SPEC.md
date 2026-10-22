# Spec

O que o app faz. É a fonte da verdade: quando outro documento diverge daqui, vale o spec.

- **Entra aqui:** o que o app é, para quem, as entregas e qual arquivo de `spec/` cobre cada feature.
- **Não entra aqui:** as regras em si (ficam em `spec/`), o que falta construir (`ROADMAP.md`) e
  como o app é construído (`ARQUITETURA.md` e `adr/`).

## O app

O Paçoca AUwards é onde eu e uns 12 amigos guardamos o que assistimos no ano e organizamos a nossa
premiação anual de filmes e séries. No dia a dia, eu registro o que vi (à mão ou trazendo do Pede
pra Paçoca), dou nota, monto minha watchlist e anoto o que eu gostaria de indicar. Uma vez por ano,
o Cesar, nosso Organizador, conduz a premiação: indicações, categorias, votação e o anúncio dos
vencedores. O nome vem da Paçoca, a cachorrinha do Cesar.

## Entregas

A ordem em que o app é construído. Cada entrega precisa ser usável sozinha. Cada regra em `spec/`
diz de que entrega vale, como *(1)*. Não confundir com as **fases da premiação**, que são o
calendário de cada ano ([spec/premiacao.md](spec/premiacao.md)).

| Entrega | O que entra |
| --- | --- |
| 1 | Login (convite ou Pede pra Paçoca), minha lista com busca no TMDB, trazer do Pede pra Paçoca, nota, indicação provisória e o calendário da premiação nascendo na Fase 1 |
| 2 | Fases 2 e 3: registrar indicações, indicações abertas, categorias e sugestões de categoria |
| 3 | Fase 4 e anúncio: votação, apuração e revelação dos vencedores |
| 4 | Camada social e notificações |

## Arquivos

| Arquivo | O que cobre |
| --- | --- |
| [spec/acesso-e-membros.md](spec/acesso-e-membros.md) | Login com Google, convites, entrada pelo Pede pra Paçoca, papéis e membros |
| [spec/minha-lista.md](spec/minha-lista.md) | Minha lista: adicionar mídias, assisti, watchlist, nota, datas, filtros e indicação provisória |
| [spec/trazer-do-pede.md](spec/trazer-do-pede.md) | Trazer os meus assistidos do Pede pra Paçoca |
| [spec/premiacao.md](spec/premiacao.md) | O calendário e as fases da premiação, categorias, votação, apuração e anúncio |
| [spec/camada-social.md](spec/camada-social.md) | Feed, reações, mural, progresso do grupo, conquistas e notificações |
| [spec/_modelo.md](spec/_modelo.md) | Modelo para um arquivo de feature novo |

Os termos estão definidos em [GLOSSARIO.md](GLOSSARIO.md).
