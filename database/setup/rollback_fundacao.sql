-- rollback_fundacao.sql
-- Rollback completo da fundacao: remove todas as tabelas criadas na entrega inicial
-- Ordem: filhos antes dos pais (inverso da criacao)
-- Executar apenas para desfazer TODA a fundacao — nao usar para rollback parcial de feature

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `assistencias`;
DROP TABLE IF EXISTS `gols`;
DROP TABLE IF EXISTS `partidas`;
DROP TABLE IF EXISTS `jogador_time`;
DROP TABLE IF EXISTS `times`;
DROP TABLE IF EXISTS `dias_de_jogo`;
DROP TABLE IF EXISTS `ciclos`;
DROP TABLE IF EXISTS `jogadores`;

SET FOREIGN_KEY_CHECKS = 1;
