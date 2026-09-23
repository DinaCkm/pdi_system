const mysql=require("mysql2/promise");
async function main(){
 if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  await db.execute(`
   CREATE TABLE IF NOT EXISTS registro_historico_proficiencia_eixos (
     id INT NOT NULL AUTO_INCREMENT,
     colaborador_id INT NOT NULL,
     prova_historica_id INT NOT NULL,
     eixo_chave VARCHAR(255) NOT NULL,
     eixo_nome VARCHAR(255) NOT NULL,
     percentual_original DECIMAL(5,2) NULL,
     acertos_original INT NULL,
     total_questoes_original INT NULL,
     nao_sei_original INT NULL,
     status ENUM('REGISTRADO','PENDENTE_VALIDACAO') NOT NULL DEFAULT 'PENDENTE_VALIDACAO',
     fonte TEXT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY registro_historico_colaborador_prova_eixo_unique_idx (colaborador_id,prova_historica_id,eixo_chave),
     KEY registro_historico_colaborador_idx (colaborador_id),
     KEY registro_historico_prova_idx (prova_historica_id),
     KEY registro_historico_status_idx (status),
     CONSTRAINT registro_historico_colaborador_fk FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.execute(`
   CREATE TABLE IF NOT EXISTS questionario_atividades_eixos_tecnicos (
     id INT NOT NULL AUTO_INCREMENT,
     questionario_id INT NOT NULL,
     prova_id INT NOT NULL,
     aplicacao_id INT NULL,
     origem_prova ENUM('SNAPSHOT_APLICACAO','PROVA_HISTORICA') NOT NULL,
     origem_prova_chave VARCHAR(80) NOT NULL,
     eixo_chave VARCHAR(255) NOT NULL,
     eixo_nome VARCHAR(255) NOT NULL,
     classificacao ENUM('ESSENCIAL','NAO_ESSENCIAL','TRANSVERSAL') NULL,
     status_classificacao ENUM('PENDENTE','CLASSIFICADO') NOT NULL DEFAULT 'PENDENTE',
     justificativa TEXT NULL,
     classificado_por INT NULL,
     classificado_em TIMESTAMP NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY questionario_eixo_origem_unique_idx (questionario_id,origem_prova_chave,eixo_chave),
     KEY questionario_eixos_questionario_idx (questionario_id),
     KEY questionario_eixos_prova_idx (prova_id),
     KEY questionario_eixos_aplicacao_idx (aplicacao_id),
     KEY questionario_eixos_classificacao_idx (classificacao),
     CONSTRAINT questionario_eixos_questionario_fk FOREIGN KEY (questionario_id) REFERENCES questionarios_atividades_funcao(id) ON DELETE CASCADE,
     CONSTRAINT questionario_eixos_classificado_por_fk FOREIGN KEY (classificado_por) REFERENCES users(id) ON DELETE SET NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("MIGRATION_OK");
 } finally { await db.end(); }
}
main().catch(e=>{console.error("MIGRATION_FATAL="+e.stack);process.exit(1)});