# EFS — jogadores
**Versao:** 1.2
**Data:** 2026-05-30
**Tipo:** Nova feature
**Status:** Aprovada

---

## Contexto

O sistema precisa de uma area para gerenciar os jogadores do grupo de futebol
society. O grupo tem cerca de 18 pessoas fixas e recebe convidados ocasionais.
Os jogadores sao referenciados em todas as outras partes do sistema (times,
partidas, gols, assistencias), portanto esta feature e prerequisito para o
restante da aplicacao.

A entidade `Jogador` ja esta definida no schema Prisma e o banco esta de pe
(migrations executadas). Esta feature trata exclusivamente do CRUD de jogadores
na interface do usuario e nos endpoints da API.

## Tipo de Solicitacao

**Nova feature** — funcionalidade que nao existe ainda.

## Comportamento Atual

N/A — o modulo de jogadores nao existe. O banco possui a tabela `jogadores`
criada pelo schema Prisma, mas nenhuma tela ou endpoint esta implementado.

## Comportamento Esperado

O usuario pode:

1. Ver a lista de todos os jogadores ativos (sem data de suspensao) ordenados
   por nome, com indicacao visual de quem e convidado.
2. Cadastrar um novo jogador informando nome, apelido (opcional), posicao
   (opcional) e se e convidado.
3. Editar os dados de um jogador existente (mesmos campos do cadastro).
4. Suspender um jogador da lista — o jogador nao e apagado do banco, apenas
   marcado como suspenso (soft delete via `deletedAt`) e deixa de aparecer
   na listagem principal.
5. Visualizar jogadores suspensos ativando um toggle "Mostrar suspensos" na
   propria listagem — os suspensos aparecem com visual diferenciado (card
   acinzentado + badge "Suspenso") ao final da lista.
6. Reativar um jogador suspenso diretamente pela listagem, clicando no botao
   "Reativar" exibido no card do jogador suspenso.

## Entidades / Modelos Necessarios

Nao ha novas entidades. A entidade `Jogador` ja existe no schema:

| Campo | Tipo | Observacao |
|-------|------|-----------|
| `id` | Int (PK) | Autoincremento |
| `nome` | String (max 100) | Obrigatorio |
| `apelido` | String? (max 50) | Opcional |
| `posicao` | String? (max 30) | Opcional (ex: goleiro, atacante) |
| `convidado` | Boolean | Padrao: false |
| `deletedAt` | DateTime? | null = ativo; preenchido = suspenso |
| `createdAt` | DateTime | Automatico |
| `updatedAt` | DateTime | Automatico |

## Regras de Negocio

- RN-01: O campo `nome` e obrigatorio e deve ter entre 2 e 100 caracteres.
- RN-02: O campo `apelido`, se informado, deve ter no maximo 50 caracteres.
- RN-03: O campo `posicao`, se informado, deve ter no maximo 30 caracteres.
- RN-04: A listagem principal exibe apenas jogadores com `deletedAt = null`.
- RN-05: A suspensao (soft delete) define `deletedAt` com a data/hora atual;
  o registro permanece no banco para preservar o historico de partidas.
- RN-06: Jogadores com `convidado = true` recebem um badge visual distinto
  na listagem.
- RN-07: A listagem e ordenada por nome em ordem alfabetica crescente, tanto
  para ativos quanto para suspensos.
- RN-08: A reativacao define `deletedAt` de volta a `null`; o jogador volta a
  aparecer na listagem principal na proxima renderizacao.
- RN-09: Jogadores suspensos nao aparecem em selecoes de time (montagem de
  times) — isso e responsabilidade do modulo de dias-de-jogo, mas a regra de
  negocio origina-se aqui: somente jogadores com `deletedAt = null` estao
  disponiveis para selecao.
- RN-10: A exibicao de suspensos e controlada por um toggle na propria pagina
  de listagem; o estado do toggle nao persiste entre sessoes (comportamento
  padrao: suspensos ocultados).

## Excecoes e Casos de Borda

- EX-01: Tentativa de salvar jogador com nome vazio ou menor que 2 caracteres
  → formulario exibe erro inline "Nome deve ter ao menos 2 caracteres"; nao
  envia requisicao.
- EX-02: Tentativa de salvar jogador com nome maior que 100 caracteres →
  formulario exibe erro inline; nao envia requisicao.
- EX-03: Falha de rede ou erro interno no servidor ao salvar → toast de erro
  exibido; usuario permanece no formulario com os dados preenchidos.
- EX-04: Jogador suspenso (soft delete) ainda aparece em historicos de
  partidas e estatisticas — apenas nao aparece na listagem de jogadores ativos
  nem esta disponivel para selecao em novos times.
- EX-05: Acesso direto a URL de edicao de jogador inexistente → pagina exibe
  mensagem de nao encontrado (ou redirect para a listagem).
- EX-06: Tentativa de reativar jogador que ja esta ativo (ex: requisicao
  duplicada) → API retorna 400 com mensagem "Jogador ja esta ativo"; UI
  exibe toast de erro.
- EX-07: Falha de rede ao tentar reativar → toast de erro exibido; jogador
  permanece marcado como suspenso; usuario pode tentar novamente.

## Riscos Identificados

| Risco | Probabilidade | Impacto | Observacao |
|-------|--------------|---------|-----------|
| Jogador suspenso referenciado em partida futura | Baixa | Medio | Soft delete mitiga: registro permanece; montagem de times deve filtrar apenas jogadores ativos |
| Nome duplicado | Baixa | Baixo | Nao ha restricao de unicidade no schema; aceita duplicatas por hora |
| Reativacao acidental | Baixa | Baixo | Grupo fechado; nao ha confirmacao adicional para reativacao (acao reversivel) |

## Impactos em Features Existentes

N/A — primeira feature de negocio implementada. Nenhuma feature existente
depende de jogadores ainda.

## Fora de Escopo

- Foto ou avatar do jogador
- Estatisticas do jogador (pertence ao modulo dashboard/ciclos)
- Historico de partidas do jogador (pertence ao modulo dias-de-jogo)
- Paginacao da listagem (grupo de ~18 pessoas; cabe em uma tela)
- Busca por texto na listagem
- Confirmacao adicional (dialog) ao reativar — a acao e facilmente reversivel

## Criterios de Aceite Funcionais

- CA-01: Dado que o usuario acessa `/jogadores`, quando a pagina carrega,
  entao a lista exibe apenas os jogadores com `deletedAt = null` ordenados
  por nome.
- CA-02: Dado que ha jogadores com `convidado = true`, quando a lista e
  exibida, entao esses jogadores possuem um badge "Convidado" visualmente
  distinto.
- CA-03: Dado que o usuario clica em "Novo Jogador", quando preenche nome
  valido e confirma, entao o jogador e criado e aparece na listagem.
- CA-04: Dado que o usuario tenta salvar com nome em branco, quando confirma,
  entao o formulario exibe erro inline e nao envia a requisicao.
- CA-05: Dado que o usuario clica em "Editar" em um jogador, quando altera
  os dados e confirma, entao as alteracoes sao salvas e refletidas na listagem.
- CA-06: Dado que o usuario clica em "Suspender" em um jogador ativo, quando
  confirma a acao, entao o jogador desaparece da listagem principal (soft
  delete aplicado via `deletedAt`).
- CA-07: Dado que um jogador foi suspenso, quando o usuario acessa a listagem
  sem ativar o toggle, entao o jogador suspenso nao aparece.
- CA-08: Dado que ocorre erro ao salvar (ex: servidor indisponivel), quando
  o usuario tenta salvar, entao um toast de erro e exibido e o formulario
  mantem os dados preenchidos.
- CA-09: Dado que ha jogadores suspensos, quando o usuario ativa o toggle
  "Mostrar suspensos", entao os jogadores com `deletedAt` preenchido aparecem
  ao final da lista com visual acinzentado e badge "Suspenso".
- CA-10: Dado que o usuario visualiza um jogador suspenso (toggle ativado),
  quando clica em "Reativar", entao o jogador tem `deletedAt` zerado, deixa
  de aparecer na secao de suspensos e passa a aparecer na listagem principal.
- CA-11: Dado que o usuario desativa o toggle "Mostrar suspensos", quando a
  lista e atualizada, entao apenas jogadores ativos sao exibidos.

## Escopo Tecnico

- **Frontend afetado:** Sim
  - Pages: `(jogadores)/jogadores/page.tsx`, `(jogadores)/jogadores/novo/page.tsx`,
    `(jogadores)/jogadores/[id]/editar/page.tsx`
  - Components: `components/jogadores/JogadorListagem.tsx`,
    `components/jogadores/JogadorCard.tsx`, `components/jogadores/JogadorForm.tsx`
  - Validations: `lib/validations/jogador.ts`
  - API Routes: `api/jogadores/route.ts` (GET com suporte a query param
    `?incluirSuspensos=true`, POST), `api/jogadores/[id]/route.ts` (GET,
    PATCH, DELETE para suspensao e PATCH para reativacao via `deletedAt: null`)
- **Backend afetado:** N/A — monolito; API Routes sao parte do frontend
- **Database afetado:** Nao — schema ja existe; nenhuma migration necessaria

## Historico de Versoes

| Versao | Data | Alteracao |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Versao inicial |
| 1.1 | 2026-05-30 | Incluida reativacao de jogador: toggle na listagem, RN-08 a RN-10, EX-06 a EX-07, CA-09 a CA-11, escopo tecnico atualizado |
| 1.2 | 2026-05-30 | Terminologia ajustada: exclusao/excluido/inativo substituidos por suspensao/suspenso em toda a documentacao; campo `deletedAt` permanece igual; query param renomeada para `?incluirSuspensos=true`; EFS aprovada (GATE 1) |
