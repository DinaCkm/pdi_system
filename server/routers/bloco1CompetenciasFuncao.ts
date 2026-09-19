import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { avaliacoes, medicoesCompetencias } from "../../drizzle/avaliacoes-schema";
import { competenciasMacros, departamentos, users } from "../../drizzle/schema";
import {
  funcoesOrganizacionais,
  usuariosFuncoesOrganizacionais,
} from "../../drizzle/comportamental-schema";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível.",
    });
  }
  return db;
}

export const bloco1CompetenciasFuncaoRouter = router({
  empregados: adminProcedure.query(async () => {
    const db = await dbObrigatorio();

    return db
      .select({
        id: users.id,
        nome: users.name,
        cargo: users.cargo,
        departamentoId: users.departamentoId,
        departamentoNome: departamentos.nome,
        funcaoOrganizacionalId: usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
        funcaoNome: funcoesOrganizacionais.nome,
        status: users.status,
      })
      .from(users)
      .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
      .leftJoin(
        usuariosFuncoesOrganizacionais,
        and(
          eq(usuariosFuncoesOrganizacionais.usuarioId, users.id),
          eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
          eq(usuariosFuncoesOrganizacionais.ativo, true),
        ),
      )
      .leftJoin(
        funcoesOrganizacionais,
        eq(
          usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
          funcoesOrganizacionais.id,
        ),
      )
      .orderBy(users.name);
  }),

  mapaIndividual: adminProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();

      const empregado = (
        await db
          .select({
            id: users.id,
            nome: users.name,
            cargo: users.cargo,
            departamentoNome: departamentos.nome,
            funcaoOrganizacionalId: usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
            funcaoNome: funcoesOrganizacionais.nome,
          })
          .from(users)
          .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
          .leftJoin(
            usuariosFuncoesOrganizacionais,
            and(
              eq(usuariosFuncoesOrganizacionais.usuarioId, users.id),
              eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
              eq(usuariosFuncoesOrganizacionais.ativo, true),
            ),
          )
          .leftJoin(
            funcoesOrganizacionais,
            eq(
              usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
              funcoesOrganizacionais.id,
            ),
          )
          .where(eq(users.id, input.colaboradorId))
          .limit(1)
      )[0];

      if (!empregado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empregado não encontrado.",
        });
      }

      const matrizResult = await db.execute(
        sql.raw(
          "SELECT m.id AS matrizId, m.status AS matrizStatus, m.fonte AS matrizFonte, " +
          "e.id AS eixoRegistroId, e.eixo_id AS eixoId, e.eixo_nome AS eixoNome, " +
          "e.relacao, e.percentual_anterior AS percentualAnterior " +
          "FROM prova_utic_matrizes m " +
          "LEFT JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id " +
          "WHERE m.colaborador_id = " + Number(input.colaboradorId) + " " +
          "ORDER BY e.id",
        ),
      );

      const linhasTecnicas = rowsOf<any>(matrizResult);
      const matrizBase = linhasTecnicas[0] ?? null;
      const tecnicas = linhasTecnicas
        .filter((linha) => linha.eixoRegistroId)
        .map((linha) => ({
          eixoRegistroId: Number(linha.eixoRegistroId),
          eixoId: String(linha.eixoId),
          eixoNome: String(linha.eixoNome),
          classificacao: String(linha.relacao),
          percentualAnterior:
            linha.percentualAnterior === null ? null : Number(linha.percentualAnterior),
          fonte:
            matrizBase?.matrizFonte ||
            "Questionário individual de levantamento das atividades",
        }));

      const comportamentais = await db
        .select({
          medicaoId: medicoesCompetencias.id,
          avaliacaoId: avaliacoes.id,
          avaliacaoTitulo: avaliacoes.titulo,
          dataReferencia: avaliacoes.dataReferencia,
          competenciaMacroId: medicoesCompetencias.competenciaMacroId,
          competenciaNome: competenciasMacros.nome,
          valor: medicoesCompetencias.valor,
          escalaMin: medicoesCompetencias.escalaMin,
          escalaMax: medicoesCompetencias.escalaMax,
          classificacaoResultado: medicoesCompetencias.classificacao,
          observacao: medicoesCompetencias.observacao,
          validada: medicoesCompetencias.validada,
        })
        .from(medicoesCompetencias)
        .innerJoin(avaliacoes, eq(medicoesCompetencias.avaliacaoId, avaliacoes.id))
        .leftJoin(
          competenciasMacros,
          eq(medicoesCompetencias.competenciaMacroId, competenciasMacros.id),
        )
        .where(
          and(
            eq(medicoesCompetencias.colaboradorId, input.colaboradorId),
            eq(medicoesCompetencias.tipoCompetencia, "COMPORTAMENTAL"),
            eq(medicoesCompetencias.fonte, "AVALIACAO_DESEMPENHO"),
          ),
        )
        .orderBy(desc(avaliacoes.dataReferencia), desc(medicoesCompetencias.id));

      const ultimaMedicaoPorCompetencia = new Map<number, any>();
      for (const item of comportamentais) {
        const chave = Number(item.competenciaMacroId);
        if (!ultimaMedicaoPorCompetencia.has(chave)) {
          ultimaMedicaoPorCompetencia.set(chave, item);
        }
      }

      return {
        empregado,
        tecnico: {
          matrizId: matrizBase?.matrizId ? Number(matrizBase.matrizId) : null,
          status: matrizBase?.matrizStatus ?? null,
          fonte:
            matrizBase?.matrizFonte ||
            "Questionário individual de levantamento das atividades",
          competencias: tecnicas,
        },
        comportamental: {
          fonte: "Avaliação de Desempenho",
          competencias: Array.from(ultimaMedicaoPorCompetencia.values()).map(
            (item: any) => ({
              medicaoId: Number(item.medicaoId),
              avaliacaoId: Number(item.avaliacaoId),
              avaliacaoTitulo: item.avaliacaoTitulo,
              dataReferencia: item.dataReferencia,
              competenciaMacroId: Number(item.competenciaMacroId),
              competenciaNome: item.competenciaNome,
              valor: Number(item.valor),
              escalaMin: Number(item.escalaMin),
              escalaMax: Number(item.escalaMax),
              classificacaoResultado: item.classificacaoResultado,
              observacao: item.observacao,
              validada: Boolean(item.validada),
            }),
          ),
        },
      };
    }),
});
