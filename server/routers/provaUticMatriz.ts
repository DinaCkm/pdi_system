import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { ensureTechnicalMatrixTables } from "../services/technicalMatrixSchema";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export const provaUticMatrizRouter = router({
  listar: adminProcedure.query(async () => {
    const db = await ensureTechnicalMatrixTables();
    const matrizesResult = await db.execute(sql`
      SELECT m.id, m.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
             u.email, u.cargo, u.departamentoId, d.nome AS unidadeNome,
             m.status, m.fonte, m.observacao,
             m.created_at AS createdAt, m.updated_at AS updatedAt
        FROM prova_utic_matrizes m
        JOIN users u ON u.id = m.colaborador_id
        LEFT JOIN departamentos d ON d.id = u.departamentoId
       ORDER BY COALESCE(d.nome, ''), u.name
    `);
    const matrizes = rowsOf<any>(matrizesResult);

    for (const matriz of matrizes) {
      const eixosResult = await db.execute(sql`
        SELECT id, eixo_id AS eixoId, eixo_nome AS eixo,
               relacao, status_classificacao AS statusClassificacao,
               justificativa, percentual_anterior AS anterior
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

  listarHistorico: adminProcedure
    .input(z.object({ matrizId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await ensureTechnicalMatrixTables();
      const result = await db.execute(sql`
        SELECT h.id, h.eixo_id AS eixoId,
               h.valor_anterior AS valorAnterior,
               h.valor_novo AS valorNovo,
               h.motivo, h.observacao,
               h.created_at AS createdAt,
               u.name AS alteradoPorNome
          FROM prova_utic_matriz_historico h
          JOIN users u ON u.id = h.alterado_por
         WHERE h.matriz_id = ${input.matrizId}
         ORDER BY h.created_at DESC, h.id DESC
      `);

      return rowsOf<any>(result).map((item) => {
        const parseJson = (valor: string | null) => {
          if (!valor) return null;
          try { return JSON.parse(valor); } catch { return valor; }
        };
        return {
          ...item,
          valorAnterior: parseJson(item.valorAnterior),
          valorNovo: parseJson(item.valorNovo),
        };
      });
    }),

  salvarEixo: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      eixoId: z.string().min(1).max(40),
      eixo: z.string().min(1).max(255),
      relacao: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"]).nullable(),
      statusClassificacao: z.enum(["CLASSIFICADO", "PENDENTE"]),
      justificativa: z.string().max(5000).nullable().optional(),
      anterior: z.number().min(0).max(100).nullable(),
      motivo: z.string().min(3).max(255),
      observacao: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.statusClassificacao === "CLASSIFICADO" && !input.relacao) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Classificação obrigatória quando o eixo está classificado." });
      }
      if (input.statusClassificacao === "PENDENTE" && input.relacao) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Eixo pendente não deve possuir classificação final." });
      }

      const db = await ensureTechnicalMatrixTables();
      const anteriorResult = await db.execute(sql`
        SELECT eixo_nome AS eixo, relacao,
               status_classificacao AS statusClassificacao,
               justificativa, percentual_anterior AS anterior
          FROM prova_utic_matriz_eixos
         WHERE matriz_id = ${input.matrizId} AND eixo_id = ${input.eixoId}
         LIMIT 1
      `);
      const anterior = rowsOf<any>(anteriorResult)[0] ?? null;
      const novo = {
        eixo: input.eixo,
        relacao: input.relacao,
        statusClassificacao: input.statusClassificacao,
        justificativa: input.justificativa ?? null,
        anterior: input.anterior,
      };

      await db.execute(sql`
        INSERT INTO prova_utic_matriz_eixos
          (matriz_id, eixo_id, eixo_nome, relacao, status_classificacao, justificativa, percentual_anterior)
        VALUES
          (${input.matrizId}, ${input.eixoId}, ${input.eixo}, ${input.relacao},
           ${input.statusClassificacao}, ${input.justificativa ?? null}, ${input.anterior})
        ON DUPLICATE KEY UPDATE
          eixo_nome = VALUES(eixo_nome),
          relacao = VALUES(relacao),
          status_classificacao = VALUES(status_classificacao),
          justificativa = VALUES(justificativa),
          percentual_anterior = VALUES(percentual_anterior),
          updated_at = NOW()
      `);

      await db.execute(sql`
        UPDATE prova_utic_matrizes
           SET atualizado_por = ${ctx.user.id}, updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);

      await db.execute(sql`
        INSERT INTO prova_utic_matriz_historico
          (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
        VALUES
          (${input.matrizId}, ${input.eixoId}, ${anterior ? JSON.stringify(anterior) : null},
           ${JSON.stringify(novo)}, ${input.motivo}, ${input.observacao ?? null}, ${ctx.user.id})
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
      const db = await ensureTechnicalMatrixTables();
      const anteriorResult = await db.execute(sql`
        SELECT status, fonte, observacao
          FROM prova_utic_matrizes
         WHERE id = ${input.matrizId}
         LIMIT 1
      `);
      const anterior = rowsOf<any>(anteriorResult)[0];
      if (!anterior) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Matriz do empregado não encontrada." });
      }

      const novo = {
        status: input.status,
        fonte: input.fonte ?? null,
        observacao: input.observacao ?? null,
      };
      if (
        anterior.status === novo.status &&
        (anterior.fonte ?? null) === novo.fonte &&
        (anterior.observacao ?? null) === novo.observacao
      ) return { atualizado: false };

      await db.execute(sql`
        UPDATE prova_utic_matrizes
           SET status = ${input.status},
               fonte = ${input.fonte ?? null},
               observacao = ${input.observacao ?? null},
               atualizado_por = ${ctx.user.id},
               updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);

      await db.execute(sql`
        INSERT INTO prova_utic_matriz_historico
          (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
        VALUES
          (${input.matrizId}, NULL, ${JSON.stringify(anterior)}, ${JSON.stringify(novo)},
           'Atualização da situação geral da matriz', ${input.observacao ?? null}, ${ctx.user.id})
      `);

      return { atualizado: true };
    }),
});
