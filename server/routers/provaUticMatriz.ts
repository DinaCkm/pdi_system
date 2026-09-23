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

  // Eixos técnicos com pontuação histórica, por unidade do empregado.
  // Fonte por empregado:
  //  - se o empregado tem registro da prova histórica (registro_historico_proficiencia_eixos,
  //    hoje as Regionais), usa esse registro;
  //  - senão, usa a matriz de eixos do empregado (prova_utic_matriz_eixos.percentual_anterior),
  //    a mesma exibida na aba "Por Empregado" (unidades administrativas).
  // Unidade: gestores (líderes de departamento) contam na unidade que gerenciam;
  // os demais, no próprio departamento.
  listarPorDepartamento: adminProcedure.query(async () => {
    const db = await ensureTechnicalMatrixTables();
    const base = sql`
      SELECT h.colaborador_id AS colaboradorId,
             h.eixo_chave AS eixoChave,
             h.eixo_nome AS eixoNome,
             h.percentual_original AS pontuacao
        FROM registro_historico_proficiencia_eixos h
      UNION ALL
      SELECT m.colaborador_id AS colaboradorId,
             LOWER(TRIM(e.eixo_nome)) AS eixoChave,
             e.eixo_nome AS eixoNome,
             e.percentual_anterior AS pontuacao
        FROM prova_utic_matrizes m
        JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
       WHERE NOT EXISTS (
         SELECT 1 FROM registro_historico_proficiencia_eixos h2 WHERE h2.colaborador_id = m.colaborador_id
       )
    `;
    const result = await db.execute(sql`
      SELECT COALESCE(dl.nome, d.nome, 'Sem unidade') AS unidadeNome,
             x.eixoChave AS eixoId,
             MIN(x.eixoNome) AS eixo,
             COUNT(DISTINCT x.colaboradorId) AS totalEmpregados,
             COUNT(x.pontuacao) AS qtdPontuacao,
             SUM(x.pontuacao) AS somaPontuacao,
             MIN(x.pontuacao) AS menorPontuacao,
             MAX(x.pontuacao) AS maiorPontuacao
        FROM (${base}) x
        JOIN users u ON u.id = x.colaboradorId
        LEFT JOIN departamentos d ON d.id = u.departamentoId
        LEFT JOIN (
          SELECT leaderId, MIN(nome) AS nome
            FROM departamentos
           WHERE leaderId IS NOT NULL AND status = 'ativo'
           GROUP BY leaderId
        ) dl ON dl.leaderId = u.id
       GROUP BY COALESCE(dl.nome, d.nome, 'Sem unidade'), x.eixoChave
       ORDER BY unidadeNome, eixo
    `);
    const empregadosResult = await db.execute(sql`
      SELECT COALESCE(dl.nome, d.nome, 'Sem unidade') AS unidadeNome,
             COUNT(DISTINCT x.colaboradorId) AS totalEmpregados
        FROM (${base}) x
        JOIN users u ON u.id = x.colaboradorId
        LEFT JOIN departamentos d ON d.id = u.departamentoId
        LEFT JOIN (
          SELECT leaderId, MIN(nome) AS nome
            FROM departamentos
           WHERE leaderId IS NOT NULL AND status = 'ativo'
           GROUP BY leaderId
        ) dl ON dl.leaderId = u.id
       GROUP BY COALESCE(dl.nome, d.nome, 'Sem unidade')
    `);
    const totais = new Map(rowsOf<any>(empregadosResult).map((t) => [String(t.unidadeNome), Number(t.totalEmpregados)]));

    const porUnidade = new Map<string, any>();
    for (const row of rowsOf<any>(result)) {
      const nome = String(row.unidadeNome);
      if (!porUnidade.has(nome)) {
        porUnidade.set(nome, { unidadeNome: nome, totalEmpregados: totais.get(nome) ?? 0, eixos: [] });
      }
      const qtd = Number(row.qtdPontuacao);
      const soma = row.somaPontuacao === null ? 0 : Number(row.somaPontuacao);
      porUnidade.get(nome).eixos.push({
        eixoId: String(row.eixoId),
        eixo: row.eixo,
        totalEmpregados: Number(row.totalEmpregados),
        qtdPontuacao: qtd,
        somaPontuacao: soma,
        mediaPontuacao: qtd ? Number((soma / qtd).toFixed(2)) : null,
        menorPontuacao: row.menorPontuacao === null ? null : Number(row.menorPontuacao),
        maiorPontuacao: row.maiorPontuacao === null ? null : Number(row.maiorPontuacao),
      });
    }
    return Array.from(porUnidade.values()).sort((x, y) => x.unidadeNome.localeCompare(y.unidadeNome, "pt-BR"));
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
