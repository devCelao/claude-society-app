# Ordem de Execucao — Setup Database
**Projeto:** claude-society-app
**Artefato de origem:** docs/arquitetura/arquitetura-database.md
**Gerado em:** 2026-05-30

---

## Instrucoes

1. Conecte ao banco `claude_society_db` antes de executar os scripts.
2. Execute os scripts na **ordem listada abaixo**.
3. Se qualquer script falhar: **pare**, nao execute os proximos, e reporte o erro.

---

## Convencao de rollback

- **Por entrega:** cada entrega tem um script de rollback proprio (ex: `rollback_fundacao.sql`).
- **Por feature:** quando uma feature adiciona colunas, seu rollback contem o `DROP COLUMN` correspondente — nunca toca em tabelas inteiras.
- Os scripts DDL (`001_*.sql` etc.) nao tem `_down` individual — o rollback e sempre por entrega.

---

## Ordem de Execucao — Fundacao

| # | Arquivo | Tabela | Depende de |
|---|---------|--------|------------|
| 1 | `001_jogadores.sql` | `jogadores` | — |
| 2 | `002_ciclos.sql` | `ciclos` | — |
| 3 | `003_dias_de_jogo.sql` | `dias_de_jogo` | 002 (ciclos) |
| 4 | `004_times.sql` | `times` | 003 (dias_de_jogo) |
| 5 | `005_jogador_time.sql` | `jogador_time` | 001 (jogadores), 004 (times) |
| 6 | `006_partidas.sql` | `partidas` | 003 (dias_de_jogo), 004 (times) |
| 7 | `007_gols.sql` | `gols` | 001 (jogadores), 006 (partidas) |
| 8 | `008_assistencias.sql` | `assistencias` | 001 (jogadores), 007 (gols) |

## Rollback — Fundacao

| Arquivo | O que desfaz |
|---------|-------------|
| `rollback_fundacao.sql` | DROP de todas as 8 tabelas (ordem segura com FK_CHECKS=0) |

---

## Exemplo de execucao (MySQL CLI)

```bash
# Via Docker (container db rodando):
docker exec -i claude-society-app-db mysql -u claude_society_user -p claude_society_db < database/setup/001_jogadores.sql

# Repita para cada arquivo na ordem acima.
```

---

## Status de Execucao _(preenchido pelo humano)_

| Arquivo | Executado em | Status | Observacao |
|---------|-------------|--------|-----------|
| `001_jogadores.sql` | — | Pendente | — |
| `002_ciclos.sql` | — | Pendente | — |
| `003_dias_de_jogo.sql` | — | Pendente | — |
| `004_times.sql` | — | Pendente | — |
| `005_jogador_time.sql` | — | Pendente | — |
| `006_partidas.sql` | — | Pendente | — |
| `007_gols.sql` | — | Pendente | — |
| `008_assistencias.sql` | — | Pendente | — |
