import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { UTIC_QUESTOES, TOTAL_QUESTOES_UTIC, validarBancoUtic } from "../../shared/uticQuestoes";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { UTIC_EIXOS, UTIC_GABARITO, UTIC_LINHA_BASE_DANIEL } from "../uticGabarito";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

function calcularResultado(respostas: Array<{ questaoId: number; resposta: string }>, usarLinhaBaseDaniel: boolean) {
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
    const linhaBase = usarLinhaBaseDaniel ? UTIC_LINHA_BASE_DANIEL[eixoId] ?? null : null;
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
               u.name AS colaboradorNome, u.email AS colaboradorEmail, u.cargo
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
      const usarLinhaBaseDaniel = /Daniel Caio Lemos Penno/i.test(nome);

      return {
        tentativa,
        linhaBase: usarLinhaBaseDaniel
          ? {
              fonte: "UTIC_RESULTADO CONSOLIDADO.xlsx / item 5 dos relatórios individuais",
              natureza: "provisória",
              observacao: "A linha de base definitiva será recalculada a partir das respostas históricas e do gabarito original quando essa validação estiver concluída.",
            }
          : null,
        resultado: calcularResultado(respostas, usarLinhaBaseDaniel),
      };
    }),
});
