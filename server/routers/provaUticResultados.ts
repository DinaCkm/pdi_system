import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { UTIC_QUESTOES, TOTAL_QUESTOES_UTIC, validarBancoUtic } from "../../shared/uticQuestoes";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { UTIC_EIXOS, UTIC_GABARITO, UTIC_LINHA_BASE_DANIEL } from "../data/uticGabarito";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

function calcularResultado(
  respostas: Array<{ questaoId: number; resposta: string }>,
  linhasBase: Record<string, number | null> = {},
) {
  const respostaPorQuestao = new Map(respostas.map((item) => [Number(item.questaoId), String(item.resposta)]));
  const porEixo = Object.entries(UTIC_EIXOS).map(([eixoId, eixo]) => {
    const questoes = UTIC_QUESTOES.filter((questao) => questao.eixoId === eixoId);
    const respondidas = questoes.filter((questao) => respostaPorQuestao.has(questao.id));
    const acertos = questoes.filter((questao) => respostaPorQuestao.get(questao.id) === UTIC_GABARITO[questao.id]).length;
    const naoSei = questoes.filter((questao) => {
      const resposta = respostaPorQuestao.get(questao.id);
      return Boolean(resposta && questao.opcoes.find((opcao) => opcao.id === resposta)?.naoSei);
    }).length;
    const percentualAtual = questoes.length > 0 ? arredondar((acertos / questoes.length) * 100) : 0;
    const linhaBase = linhasBase[eixoId] ?? null;
    const evolucaoPp = linhaBase === null ? null : arredondar(percentualAtual - linhaBase);
    return {
      eixoId,
      eixo,
      totalQuestoes: questoes.length,
      respondidas: respondidas.length,
      acertos,
      erros: Math.max(0, respondidas.length - acertos - naoSei),
      naoSei,
      percentualAtual,
      linhaBase,
      evolucaoPp,
      comparavel: linhaBase !== null,
    };
  });

  const totalAcertos = UTIC_QUESTOES.filter((questao) => respostaPorQuestao.get(questao.id) === UTIC_GABARITO[questao.id]).length;
  const totalRespondidas = UTIC_QUESTOES.filter((questao) => respostaPorQuestao.has(questao.id)).length;
  return {
    totalQuestoes: TOTAL_QUESTOES_UTIC,
    totalRespondidas,
    totalNaoRespondidas: Math.max(0, TOTAL_QUESTOES_UTIC - totalRespondidas),
    totalAcertos,
    percentualGeral: TOTAL_QUESTOES_UTIC > 0 ? arredondar((totalAcertos / TOTAL_QUESTOES_UTIC) * 100) : 0,
    porEixo,
  };
}

async function obterLinhasBase(db: any, colaboradorId: number, colaboradorNome: string) {
  const result = await db.execute(sql`
    SELECT e.eixo_id AS eixoId, e.percentual_anterior AS percentualAnterior
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
     WHERE m.colaborador_id = ${colaboradorId}
       AND m.status IN ('VALIDADA_PROVISORIA','VALIDADA_DEFINITIVA')
  `);
  const linhas = rowsOf<{ eixoId: string; percentualAnterior: number | string | null }>(result);
  if (linhas.length > 0) {
    return Object.fromEntries(
      linhas.map((item) => [item.eixoId, item.percentualAnterior === null ? null : Number(item.percentualAnterior)]),
    ) as Record<string, number | null>;
  }
  return /Daniel Caio Lemos Penno/i.test(colaboradorNome) ? UTIC_LINHA_BASE_DANIEL : {};
}

export const provaUticResultadosRouter = router({
  validarBanco: adminProcedure.query(async () => validarBancoUtic()),

  resultadoTentativa: adminProcedure
    .input(z.object({ tentativaId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const tentativaResult = await db.execute(sql`
        SELECT t.id, t.colaborador_id AS colaboradorId, t.status,
               t.started_at AS startedAt, t.finished_at AS finishedAt,
               u.name AS colaboradorNome, u.email AS colaboradorEmail, u.cargo,
               (
                 SELECT COUNT(*)
                   FROM prova_utic_eventos e
                  WHERE e.tentativa_id = t.id
                    AND e.tipo NOT IN ('monitoramento_iniciado', 'ordem_aleatoria', 'retomada_pendentes')
               ) AS totalOcorrencias
          FROM prova_utic_tentativas t
          JOIN users u ON u.id = t.colaborador_id
         WHERE t.id = ${input.tentativaId}
         LIMIT 1
      `);
      const tentativa = rowsOf<any>(tentativaResult)[0];
      if (!tentativa) throw new TRPCError({ code: "NOT_FOUND", message: "Tentativa não encontrada." });

      const respostasResult = await db.execute(sql`
        SELECT questao_id AS questaoId, resposta
          FROM prova_utic_respostas
         WHERE tentativa_id = ${input.tentativaId}
      `);
      const respostas = rowsOf<{ questaoId: number; resposta: string }>(respostasResult);
      const nome = String(tentativa.colaboradorNome ?? "");
      const linhasBase = await obterLinhasBase(db, Number(tentativa.colaboradorId), nome);
      const possuiLinhaBase = Object.values(linhasBase).some((valor) => valor !== null);

      return {
        tentativa,
        linhaBase: possuiLinhaBase
          ? {
              fonte: "UTIC_RESULTADO CONSOLIDADO.xlsx / item 5 dos relatórios individuais",
              natureza: "provisória",
              observacao: "A linha de base definitiva será recalculada a partir das respostas históricas e do gabarito original quando essa validação estiver concluída.",
            }
          : null,
        resultado: calcularResultado(respostas, linhasBase),
      };
    }),

  consolidadoUnidade: adminProcedure
    .input(z.object({ departamentoNome: z.string().trim().min(1).max(255) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const empregadosResult = await db.execute(sql`
        SELECT u.id, u.name,
               (SELECT t.id
                  FROM prova_utic_tentativas t
                 WHERE t.colaborador_id = u.id
                   AND t.status IN ('FINALIZADA','CONCLUIDA','FINALIZADA_TEMPO')
                 ORDER BY t.id DESC LIMIT 1) AS tentativaId
          FROM users u
          JOIN departamentos d ON d.id = u.departamentoId
         WHERE u.status = 'ativo'
           AND u.role IN ('colaborador','lider','gerente')
           AND d.nome = ${input.departamentoNome}
         ORDER BY u.name
      `);
      const empregados = rowsOf<{ id: number; name: string; tentativaId: number | null }>(empregadosResult);
      const acumulado = new Map<string, {
        eixoId: string; eixo: string; anteriores: number[]; atuais: number[];
        evoluiram: number; estaveis: number; reduziram: number;
      }>();

      for (const empregado of empregados) {
        if (!empregado.tentativaId) continue;
        const respostasResult = await db.execute(sql`
          SELECT questao_id AS questaoId, resposta
            FROM prova_utic_respostas
           WHERE tentativa_id = ${Number(empregado.tentativaId)}
        `);
        const linhasBase = await obterLinhasBase(db, Number(empregado.id), String(empregado.name ?? ""));
        const resultado = calcularResultado(
          rowsOf<{ questaoId: number; resposta: string }>(respostasResult),
          linhasBase,
        );
        for (const eixo of resultado.porEixo) {
          if (eixo.linhaBase === null) continue;
          const item = acumulado.get(eixo.eixoId) ?? {
            eixoId: eixo.eixoId, eixo: eixo.eixo, anteriores: [], atuais: [],
            evoluiram: 0, estaveis: 0, reduziram: 0,
          };
          item.anteriores.push(Number(eixo.linhaBase));
          item.atuais.push(Number(eixo.percentualAtual));
          if (Number(eixo.evolucaoPp) > 0) item.evoluiram += 1;
          else if (Number(eixo.evolucaoPp) < 0) item.reduziram += 1;
          else item.estaveis += 1;
          acumulado.set(eixo.eixoId, item);
        }
      }

      const media = (valores: number[]) => valores.length
        ? arredondar(valores.reduce((total, valor) => total + valor, 0) / valores.length)
        : null;
      const porEixo = Array.from(acumulado.values()).map((item) => {
        const anterior = media(item.anteriores);
        const atual = media(item.atuais);
        const comparaveis = item.atuais.length;
        return {
          eixoId: item.eixoId,
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
      });

      const comTentativa = empregados.filter((item) => Boolean(item.tentativaId)).length;
      const comComparativoIds = new Set<number>();
      for (const empregado of empregados) {
        if (!empregado.tentativaId) continue;
        const linhas = await obterLinhasBase(db, Number(empregado.id), String(empregado.name ?? ""));
        if (Object.values(linhas).some((valor) => valor !== null)) comComparativoIds.add(Number(empregado.id));
      }

      return {
        unidade: input.departamentoNome,
        totalEmpregados: empregados.length,
        comAvaliacaoAtual: comTentativa,
        comComparativo: comComparativoIds.size,
        semComparativo: Math.max(0, empregados.length - comComparativoIds.size),
        porEixo,
      };
    }),
});
