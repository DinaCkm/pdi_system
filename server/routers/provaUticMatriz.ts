import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

type RelacaoEixo = "ESSENCIAL" | "TRANSVERSAL" | "NAO_APLICAVEL";
type StatusMatriz = "VALIDADA_PROVISORIA" | "VALIDADA_DEFINITIVA" | "PENDENTE_HISTORICO";

type EixoInicial = {
  eixoId: string;
  eixo: string;
  relacao: RelacaoEixo;
  anterior: number | null;
};

const FONTE_PROVISORIA =
  "Relatórios individuais da certificação anterior — item 5. Percentuais provisórios até validação das respostas e do gabarito histórico.";

const EIXOS = {
  GOVERNANCA: "Governança e Gestão de TI",
  INFRAESTRUTURA: "Infraestrutura de TI",
  SEGURANCA: "Segurança da Informação",
  INCIDENTES: "Gestão de Incidentes e Continuidade",
  SISTEMAS: "Sistemas Corporativos, Processos e Automação",
  DADOS: "Dados, BI e Inteligência Artificial",
  SUPORTE: "Suporte, Atendimento e Service Desk",
  LIDERANCA: "Liderança e Competências Transversais",
} as const;

const MATRIZES_INICIAIS: Record<string, EixoInicial[]> = {
  "Alorran de Freitas Barbosa": [
    { eixoId: "GOVERNANCA", eixo: EIXOS.GOVERNANCA, relacao: "ESSENCIAL", anterior: 62.5 },
    { eixoId: "INFRAESTRUTURA", eixo: EIXOS.INFRAESTRUTURA, relacao: "ESSENCIAL", anterior: 55.6 },
    { eixoId: "SEGURANCA", eixo: EIXOS.SEGURANCA, relacao: "ESSENCIAL", anterior: 50 },
    { eixoId: "INCIDENTES", eixo: EIXOS.INCIDENTES, relacao: "NAO_APLICAVEL", anterior: null },
    { eixoId: "SISTEMAS", eixo: EIXOS.SISTEMAS, relacao: "ESSENCIAL", anterior: 60 },
    { eixoId: "DADOS", eixo: EIXOS.DADOS, relacao: "ESSENCIAL", anterior: null },
    { eixoId: "SUPORTE", eixo: EIXOS.SUPORTE, relacao: "TRANSVERSAL", anterior: 83.3 },
    { eixoId: "LIDERANCA", eixo: EIXOS.LIDERANCA, relacao: "ESSENCIAL", anterior: 20 },
  ],
  "Daniel Caio Lemos Penno": [
    { eixoId: "GOVERNANCA", eixo: EIXOS.GOVERNANCA, relacao: "TRANSVERSAL", anterior: 60 },
    { eixoId: "INFRAESTRUTURA", eixo: EIXOS.INFRAESTRUTURA, relacao: "ESSENCIAL", anterior: 63 },
    { eixoId: "SEGURANCA", eixo: EIXOS.SEGURANCA, relacao: "TRANSVERSAL", anterior: 58 },
    { eixoId: "INCIDENTES", eixo: EIXOS.INCIDENTES, relacao: "NAO_APLICAVEL", anterior: null },
    { eixoId: "SISTEMAS", eixo: EIXOS.SISTEMAS, relacao: "ESSENCIAL", anterior: 70 },
    { eixoId: "DADOS", eixo: EIXOS.DADOS, relacao: "ESSENCIAL", anterior: 55 },
    { eixoId: "SUPORTE", eixo: EIXOS.SUPORTE, relacao: "ESSENCIAL", anterior: 65 },
    { eixoId: "LIDERANCA", eixo: EIXOS.LIDERANCA, relacao: "TRANSVERSAL", anterior: 50 },
  ],
  "Gabriel Borges Araújo": [
    { eixoId: "GOVERNANCA", eixo: EIXOS.GOVERNANCA, relacao: "TRANSVERSAL", anterior: 62 },
    { eixoId: "INFRAESTRUTURA", eixo: EIXOS.INFRAESTRUTURA, relacao: "ESSENCIAL", anterior: 70 },
    { eixoId: "SEGURANCA", eixo: EIXOS.SEGURANCA, relacao: "TRANSVERSAL", anterior: 67 },
    { eixoId: "INCIDENTES", eixo: EIXOS.INCIDENTES, relacao: "NAO_APLICAVEL", anterior: null },
    { eixoId: "SISTEMAS", eixo: EIXOS.SISTEMAS, relacao: "ESSENCIAL", anterior: 60 },
    { eixoId: "DADOS", eixo: EIXOS.DADOS, relacao: "TRANSVERSAL", anterior: null },
    { eixoId: "SUPORTE", eixo: EIXOS.SUPORTE, relacao: "ESSENCIAL", anterior: 80 },
    { eixoId: "LIDERANCA", eixo: EIXOS.LIDERANCA, relacao: "TRANSVERSAL", anterior: 75 },
  ],
  "Jader Lincoln do Nascimento": [
    { eixoId: "GOVERNANCA", eixo: EIXOS.GOVERNANCA, relacao: "ESSENCIAL", anterior: 50 },
    { eixoId: "INFRAESTRUTURA", eixo: EIXOS.INFRAESTRUTURA, relacao: "ESSENCIAL", anterior: 60 },
    { eixoId: "SEGURANCA", eixo: EIXOS.SEGURANCA, relacao: "ESSENCIAL", anterior: 55 },
    { eixoId: "INCIDENTES", eixo: EIXOS.INCIDENTES, relacao: "ESSENCIAL", anterior: null },
    { eixoId: "SISTEMAS", eixo: EIXOS.SISTEMAS, relacao: "TRANSVERSAL", anterior: 60 },
    { eixoId: "DADOS", eixo: EIXOS.DADOS, relacao: "TRANSVERSAL", anterior: null },
    { eixoId: "SUPORTE", eixo: EIXOS.SUPORTE, relacao: "ESSENCIAL", anterior: 65 },
    { eixoId: "LIDERANCA", eixo: EIXOS.LIDERANCA, relacao: "TRANSVERSAL", anterior: 75 },
  ],
  "Leonardo Campelo Leite Guedes": [
    { eixoId: "GOVERNANCA", eixo: EIXOS.GOVERNANCA, relacao: "TRANSVERSAL", anterior: 65 },
    { eixoId: "INFRAESTRUTURA", eixo: EIXOS.INFRAESTRUTURA, relacao: "ESSENCIAL", anterior: 75 },
    { eixoId: "SEGURANCA", eixo: EIXOS.SEGURANCA, relacao: "TRANSVERSAL", anterior: 70 },
    { eixoId: "INCIDENTES", eixo: EIXOS.INCIDENTES, relacao: "NAO_APLICAVEL", anterior: null },
    { eixoId: "SISTEMAS", eixo: EIXOS.SISTEMAS, relacao: "ESSENCIAL", anterior: 67 },
    { eixoId: "DADOS", eixo: EIXOS.DADOS, relacao: "TRANSVERSAL", anterior: null },
    { eixoId: "SUPORTE", eixo: EIXOS.SUPORTE, relacao: "ESSENCIAL", anterior: 85 },
    { eixoId: "LIDERANCA", eixo: EIXOS.LIDERANCA, relacao: "TRANSVERSAL", anterior: 70 },
  ],
};

const PENDENTES = ["Ellen Cássia Carvalho Custódio", "Wescley Ribeiro Lemos Silva"];

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

async function ensureTables() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_matrizes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      colaborador_id INT NOT NULL,
      status ENUM('VALIDADA_PROVISORIA','VALIDADA_DEFINITIVA','PENDENTE_HISTORICO') NOT NULL,
      fonte TEXT NULL,
      observacao TEXT NULL,
      atualizado_por INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_prova_utic_matriz_colaborador (colaborador_id),
      INDEX idx_prova_utic_matrizes_status (status),
      CONSTRAINT fk_prova_utic_matrizes_colaborador FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_prova_utic_matrizes_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_matriz_eixos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      matriz_id INT NOT NULL,
      eixo_id VARCHAR(40) NOT NULL,
      eixo_nome VARCHAR(255) NOT NULL,
      relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_APLICAVEL') NOT NULL,
      percentual_anterior DECIMAL(5,2) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_prova_utic_matriz_eixo (matriz_id, eixo_id),
      CONSTRAINT fk_prova_utic_matriz_eixos_matriz FOREIGN KEY (matriz_id) REFERENCES prova_utic_matrizes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_matriz_historico (
      id INT AUTO_INCREMENT PRIMARY KEY,
      matriz_id INT NOT NULL,
      eixo_id VARCHAR(40) NULL,
      valor_anterior TEXT NULL,
      valor_novo TEXT NOT NULL,
      motivo VARCHAR(255) NOT NULL,
      observacao TEXT NULL,
      alterado_por INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prova_utic_matriz_historico_matriz (matriz_id),
      CONSTRAINT fk_prova_utic_matriz_historico_matriz FOREIGN KEY (matriz_id) REFERENCES prova_utic_matrizes(id) ON DELETE CASCADE,
      CONSTRAINT fk_prova_utic_matriz_historico_usuario FOREIGN KEY (alterado_por) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  return db;
}

async function obterUsuarioPorNome(nome: string) {
  const db = await ensureTables();
  const result = await db.execute(sql`
    SELECT id, name, email, cargo, status
      FROM users
     WHERE name = ${nome}
       AND status = 'ativo'
     LIMIT 1
  `);
  return rowsOf<any>(result)[0] ?? null;
}

export const provaUticMatrizRouter = router({
  listar: adminProcedure.query(async () => {
    const db = await ensureTables();
    const matrizesResult = await db.execute(sql`
      SELECT m.id, m.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
             u.email, u.cargo, m.status, m.fonte, m.observacao,
             m.created_at AS createdAt, m.updated_at AS updatedAt
        FROM prova_utic_matrizes m
        JOIN users u ON u.id = m.colaborador_id
       ORDER BY u.name
    `);
    const matrizes = rowsOf<any>(matrizesResult);
    for (const matriz of matrizes) {
      const eixosResult = await db.execute(sql`
        SELECT id, eixo_id AS eixoId, eixo_nome AS eixo,
               relacao, percentual_anterior AS anterior
          FROM prova_utic_matriz_eixos
         WHERE matriz_id = ${matriz.id}
         ORDER BY id
      `);
      matriz.eixos = rowsOf<any>(eixosResult).map((eixo) => ({
        ...eixo,
        anterior: eixo.anterior === null ? null : Number(eixo.anterior),
      }));
    }
    return matrizes;
  }),

  inicializarOficial: adminProcedure.mutation(async ({ ctx }) => {
    const db = await ensureTables();
    const ausentes: string[] = [];
    let matrizesCriadas = 0;
    let eixosCriados = 0;

    for (const [nome, eixos] of Object.entries(MATRIZES_INICIAIS)) {
      const usuario = await obterUsuarioPorNome(nome);
      if (!usuario) {
        ausentes.push(nome);
        continue;
      }
      await db.execute(sql`
        INSERT INTO prova_utic_matrizes
          (colaborador_id, status, fonte, observacao, atualizado_por)
        VALUES
          (${usuario.id}, 'VALIDADA_PROVISORIA', ${FONTE_PROVISORIA},
           'Matriz preparada para a aplicação oficial da UTIC. A linha de base será substituída após validação histórica definitiva.',
           ${ctx.user.id})
        ON DUPLICATE KEY UPDATE colaborador_id = VALUES(colaborador_id)
      `);
      const matrizResult = await db.execute(sql`
        SELECT id FROM prova_utic_matrizes WHERE colaborador_id = ${usuario.id} LIMIT 1
      `);
      const matriz = rowsOf<{ id: number }>(matrizResult)[0];
      if (!matriz) continue;
      matrizesCriadas += 1;

      for (const eixo of eixos) {
        await db.execute(sql`
          INSERT IGNORE INTO prova_utic_matriz_eixos
            (matriz_id, eixo_id, eixo_nome, relacao, percentual_anterior)
          VALUES
            (${matriz.id}, ${eixo.eixoId}, ${eixo.eixo}, ${eixo.relacao}, ${eixo.anterior})
        `);
        eixosCriados += 1;
      }
    }

    for (const nome of PENDENTES) {
      const usuario = await obterUsuarioPorNome(nome);
      if (!usuario) {
        ausentes.push(nome);
        continue;
      }
      await db.execute(sql`
        INSERT INTO prova_utic_matrizes
          (colaborador_id, status, fonte, observacao, atualizado_por)
        VALUES
          (${usuario.id}, 'PENDENTE_HISTORICO', NULL,
           'Há evidência de avaliação anterior, mas o relatório histórico ainda não foi localizado. Não liberar antes da inclusão e validação dos oito eixos.',
           ${ctx.user.id})
        ON DUPLICATE KEY UPDATE colaborador_id = VALUES(colaborador_id)
      `);
      matrizesCriadas += 1;
    }

    return { matrizesCriadas, eixosProcessados: eixosCriados, ausentes };
  }),

  salvarEixo: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      eixoId: z.string().min(1).max(40),
      eixo: z.string().min(1).max(255),
      relacao: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_APLICAVEL"]),
      anterior: z.number().min(0).max(100).nullable(),
      motivo: z.string().min(3).max(255),
      observacao: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const anteriorResult = await db.execute(sql`
        SELECT eixo_nome AS eixo, relacao, percentual_anterior AS anterior
          FROM prova_utic_matriz_eixos
         WHERE matriz_id = ${input.matrizId} AND eixo_id = ${input.eixoId}
         LIMIT 1
      `);
      const anterior = rowsOf<any>(anteriorResult)[0] ?? null;
      await db.execute(sql`
        INSERT INTO prova_utic_matriz_eixos
          (matriz_id, eixo_id, eixo_nome, relacao, percentual_anterior)
        VALUES
          (${input.matrizId}, ${input.eixoId}, ${input.eixo}, ${input.relacao}, ${input.anterior})
        ON DUPLICATE KEY UPDATE
          eixo_nome = VALUES(eixo_nome),
          relacao = VALUES(relacao),
          percentual_anterior = VALUES(percentual_anterior),
          updated_at = NOW()
      `);
      await db.execute(sql`
        UPDATE prova_utic_matrizes SET atualizado_por = ${ctx.user.id}, updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);
      await db.execute(sql`
        INSERT INTO prova_utic_matriz_historico
          (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
        VALUES
          (${input.matrizId}, ${input.eixoId}, ${anterior ? JSON.stringify(anterior) : null},
           ${JSON.stringify({ eixo: input.eixo, relacao: input.relacao, anterior: input.anterior })},
           ${input.motivo}, ${input.observacao ?? null}, ${ctx.user.id})
      `);
      return { salvo: true };
    }),

  atualizarStatus: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      status: z.enum(["VALIDADA_PROVISORIA", "VALIDADA_DEFINITIVA", "PENDENTE_HISTORICO"]),
      fonte: z.string().max(2000).nullable().optional(),
      observacao: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      await db.execute(sql`
        UPDATE prova_utic_matrizes
           SET status = ${input.status},
               fonte = ${input.fonte ?? null},
               observacao = ${input.observacao ?? null},
               atualizado_por = ${ctx.user.id},
               updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);
      return { atualizado: true };
    }),
});
