import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import {
  competenciasOrganizacionais,
  competenciasRequeridasFuncao,
  funcoesOrganizacionais,
  organizacoes,
} from "../../drizzle/comportamental-schema";

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

export const bloco1CompetenciasFuncaoRouter = router({
  funcoes: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    return db.select({
      id: funcoesOrganizacionais.id,
      nome: funcoesOrganizacionais.nome,
      cargoReferencia: funcoesOrganizacionais.cargoReferencia,
      organizacaoId: funcoesOrganizacionais.organizacaoId,
      organizacaoNome: organizacoes.nome,
    })
      .from(funcoesOrganizacionais)
      .innerJoin(organizacoes, eq(funcoesOrganizacionais.organizacaoId, organizacoes.id))
      .where(eq(funcoesOrganizacionais.ativa, true))
      .orderBy(asc(funcoesOrganizacionais.nome));
  }),

  competencias: adminProcedure
    .input(z.object({ organizacaoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      return db.select({
        id: competenciasOrganizacionais.id,
        nome: competenciasOrganizacionais.nome,
        descricao: competenciasOrganizacionais.descricao,
      })
        .from(competenciasOrganizacionais)
        .where(and(
          eq(competenciasOrganizacionais.organizacaoId, input.organizacaoId),
          eq(competenciasOrganizacionais.ativa, true),
        ))
        .orderBy(asc(competenciasOrganizacionais.nome));
    }),

  requisitos: adminProcedure
    .input(z.object({ funcaoOrganizacionalId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      return db.select({
        id: competenciasRequeridasFuncao.id,
        competenciaOrganizacionalId: competenciasRequeridasFuncao.competenciaOrganizacionalId,
        competenciaNome: competenciasOrganizacionais.nome,
        classificacaoFuncao: competenciasRequeridasFuncao.classificacaoFuncao,
        justificativa: competenciasRequeridasFuncao.justificativa,
        nivelResponsabilidade: competenciasRequeridasFuncao.nivelResponsabilidade,
      })
        .from(competenciasRequeridasFuncao)
        .innerJoin(
          competenciasOrganizacionais,
          eq(competenciasRequeridasFuncao.competenciaOrganizacionalId, competenciasOrganizacionais.id),
        )
        .where(and(
          eq(competenciasRequeridasFuncao.funcaoOrganizacionalId, input.funcaoOrganizacionalId),
          eq(competenciasRequeridasFuncao.ativa, true),
        ))
        .orderBy(asc(competenciasOrganizacionais.nome));
    }),

  salvarRequisito: adminProcedure
    .input(z.object({
      funcaoOrganizacionalId: z.number().int().positive(),
      competenciaOrganizacionalId: z.number().int().positive(),
      classificacaoFuncao: z.enum(["ESSENCIAL_FUNCAO", "TRANSVERSAL_FUNCAO"]),
      nivelResponsabilidade: z.enum([
        "EXECUTA_COM_ORIENTACAO",
        "EXECUTA_COM_AUTONOMIA",
        "ANALISA_RECOMENDA",
        "DECIDE",
        "COORDENA",
        "RESPONDE_PELO_RESULTADO",
      ]).optional().nullable(),
      justificativa: z.string().trim().max(5000).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();
      const hoje = new Date().toISOString().slice(0, 10);

      return db.transaction(async tx => {
        const funcao = (await tx.select({
          id: funcoesOrganizacionais.id,
          nome: funcoesOrganizacionais.nome,
          organizacaoId: funcoesOrganizacionais.organizacaoId,
          ativa: funcoesOrganizacionais.ativa,
        }).from(funcoesOrganizacionais)
          .where(eq(funcoesOrganizacionais.id, input.funcaoOrganizacionalId))
          .limit(1))[0];

        if (!funcao?.ativa) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Função organizacional ativa não encontrada." });
        }

        const competencia = (await tx.select({
          id: competenciasOrganizacionais.id,
          organizacaoId: competenciasOrganizacionais.organizacaoId,
          ativa: competenciasOrganizacionais.ativa,
        }).from(competenciasOrganizacionais)
          .where(eq(competenciasOrganizacionais.id, input.competenciaOrganizacionalId))
          .limit(1))[0];

        if (!competencia?.ativa || Number(competencia.organizacaoId) !== Number(funcao.organizacaoId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Competência organizacional inválida para esta função." });
        }

        const existente = (await tx.select({ id: competenciasRequeridasFuncao.id })
          .from(competenciasRequeridasFuncao)
          .where(and(
            eq(competenciasRequeridasFuncao.funcaoOrganizacionalId, input.funcaoOrganizacionalId),
            eq(competenciasRequeridasFuncao.competenciaOrganizacionalId, input.competenciaOrganizacionalId),
          ))
          .limit(1))[0];

        const dados = {
          classificacaoFuncao: input.classificacaoFuncao,
          nivelResponsabilidade: input.nivelResponsabilidade ?? null,
          justificativa: input.justificativa ?? null,
          origem: "VALIDACAO_ADMIN" as const,
          validada: true,
          validadaPor: Number(ctx.user.id),
          validadaEm: new Date().toISOString().slice(0, 19).replace("T", " "),
          ativa: true,
          vigenciaFim: null,
        };

        if (existente) {
          await tx.update(competenciasRequeridasFuncao)
            .set(dados)
            .where(eq(competenciasRequeridasFuncao.id, existente.id));
          return { success: true, id: existente.id, operacao: "ATUALIZADO" as const };
        }

        await tx.insert(competenciasRequeridasFuncao).values({
          organizacaoId: funcao.organizacaoId,
          departamentoId: null,
          funcaoOrganizacionalId: funcao.id,
          cargoFuncao: funcao.nome,
          competenciaOrganizacionalId: input.competenciaOrganizacionalId,
          ...dados,
          versao: 1,
          vigenciaInicio: hoje,
        });

        return { success: true, operacao: "CRIADO" as const };
      });
    }),

  removerRequisito: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await dbObrigatorio();
      await db.update(competenciasRequeridasFuncao)
        .set({ ativa: false, vigenciaFim: new Date().toISOString().slice(0, 10) })
        .where(eq(competenciasRequeridasFuncao.id, input.id));
      return { success: true };
    }),
});
