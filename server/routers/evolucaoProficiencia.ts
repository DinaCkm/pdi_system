import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { ensureHomologacaoTables } from "../services/homologacaoProvas";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await ensureHomologacaoTables(db);
  return db;
}

function parseResultado(valor: unknown) {
  try {
    return JSON.parse(String(valor ?? "{}"));
  } catch {
    return { porEixo: [], percentualGeral: 0 };
  }
}

export const evolucaoProficienciaRouter = router({
  listarEmpregadosComResultado: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.cargo, d.nome AS departamentoNome,
             rp.id AS resultadoId, rp.aplicacao_id AS aplicacaoId,
             rp.percentual_geral AS percentualGeral, rp.calculado_em AS calculadoEm,
             a.titulo AS aplicacaoTitulo, p.nome AS provaNome
        FROM users u
        LEFT JOIN departamentos d ON d.id = u.departamentoId
        JOIN resultados_proficiencia rp ON rp.id = (
          SELECT rp2.id
            FROM resultados_proficiencia rp2
           WHERE rp2.colaborador_id = u.id
           ORDER BY rp2.calculado_em DESC, rp2.id DESC
           LIMIT 1
        )
        JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
        LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
        JOIN provas_importadas p ON p.id = a.prova_id
       WHERE u.status = 'ativo'
         AND ph.id IS NULL
       ORDER BY d.nome, u.name
    `);
    return rowsOf<any>(result);
  }),

  resultadoEmpregado: adminProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const result = await db.execute(sql`
        SELECT rp.id, rp.aplicacao_id AS aplicacaoId, rp.percentual_geral AS percentualGeral,
               rp.resultado_json AS resultadoJson, rp.calculado_em AS calculadoEm,
               a.titulo AS aplicacaoTitulo, a.agendada_para AS agendadaPara,
               p.nome AS provaNome, p.unidade AS provaUnidade,
               u.name AS colaboradorNome, u.email AS colaboradorEmail, u.cargo,
               d.nome AS departamentoNome
          FROM resultados_proficiencia rp
          JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
          LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
          JOIN provas_importadas p ON p.id = a.prova_id
          JOIN users u ON u.id = rp.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
         WHERE rp.colaborador_id = ${input.colaboradorId}
           AND ph.id IS NULL
         ORDER BY rp.calculado_em DESC, rp.id DESC
         LIMIT 1
      `);
      const linha = rowsOf<any>(result)[0];
      if (!linha) return null;
      return { ...linha, resultado: parseResultado(linha.resultadoJson) };
    }),

  consolidadoUnidade: adminProcedure
    .input(z.object({ departamentoNome: z.string().trim().min(1).max(255) }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const result = await db.execute(sql`
        SELECT u.id AS colaboradorId, u.name AS colaboradorNome,
               rp.resultado_json AS resultadoJson, rp.calculado_em AS calculadoEm
          FROM users u
          JOIN departamentos d ON d.id = u.departamentoId
          JOIN resultados_proficiencia rp ON rp.id = (
            SELECT rp2.id
              FROM resultados_proficiencia rp2
             WHERE rp2.colaborador_id = u.id
               AND NOT EXISTS (
                 SELECT 1 FROM provas_importadas_homologacao ph2
                 WHERE ph2.aplicacao_teste_id = rp2.aplicacao_id
               )
             ORDER BY rp2.calculado_em DESC, rp2.id DESC
             LIMIT 1
          )
         WHERE u.status = 'ativo'
           AND d.nome = ${input.departamentoNome}
         ORDER BY u.name
      `);
      const linhas = rowsOf<any>(result);
      const eixos = new Map<string, {
        eixo: string;
        anteriores: number[];
        atuais: number[];
        evoluiram: number;
        estaveis: number;
        reduziram: number;
      }>();

      for (const linha of linhas) {
        const resultado = parseResultado(linha.resultadoJson);
        for (const eixo of resultado.porEixo ?? []) {
          const nome = String(eixo.eixo ?? "");
          const item = eixos.get(nome) ?? { eixo: nome, anteriores: [], atuais: [], evoluiram: 0, estaveis: 0, reduziram: 0 };
          const atual = Number(eixo.percentualAtual ?? 0);
          item.atuais.push(atual);
          if (eixo.linhaBase !== null && eixo.linhaBase !== undefined) {
            const anterior = Number(eixo.linhaBase);
            item.anteriores.push(anterior);
            const delta = atual - anterior;
            if (delta > 0) item.evoluiram += 1;
            else if (delta < 0) item.reduziram += 1;
            else item.estaveis += 1;
          }
          eixos.set(nome, item);
        }
      }

      const media = (valores: number[]) => valores.length
        ? arredondar(valores.reduce((soma, valor) => soma + valor, 0) / valores.length)
        : null;

      return {
        unidade: input.departamentoNome,
        totalComResultado: linhas.length,
        porEixo: Array.from(eixos.values()).map(item => {
          const anterior = media(item.anteriores);
          const atual = media(item.atuais);
          const comparaveis = item.anteriores.length;
          return {
            eixo: item.eixo,
            mediaAnterior: anterior,
            mediaAtual: atual,
            evolucaoPp: anterior === null || atual === null ? null : arredondar(atual - anterior),
            comparaveis,
            evoluiram: item.evoluiram,
            estaveis: item.estaveis,
            reduziram: item.reduziram,
            percentualEvoluiram: comparaveis ? arredondar((item.evoluiram / comparaveis) * 100) : null,
          };
        }),
      };
    }),
});
