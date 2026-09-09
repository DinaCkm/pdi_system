import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  avaliacoes,
  medicoesCompetencias,
} from "../../drizzle/avaliacoes-schema";
import {
  ciclos,
  competenciasMacros,
  departamentos,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import {
  adminOrGerenteProcedure,
  adminProcedure,
  router,
} from "../_core/customTrpc";

const tipoAvaliacaoSchema = z.enum(["DESEMPENHO", "TECNICA"]);
const statusAvaliacaoSchema = z.enum([
  "RASCUNHO",
  "EM_CONFERENCIA",
  "FINALIZADA",
  "CANCELADA",
]);

export const avaliacoesRouter = router({
  listar: adminOrGerenteProcedure
    .input(
      z
        .object({
          cicloId: z.number().int().positive().optional(),
          tipo: tipoAvaliacaoSchema.optional(),
          status: statusAvaliacaoSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const conditions = [];
      if (input?.cicloId) conditions.push(eq(avaliacoes.cicloId, input.cicloId));
      if (input?.tipo) conditions.push(eq(avaliacoes.tipo, input.tipo));
      if (input?.status) conditions.push(eq(avaliacoes.status, input.status));

      return await db
        .select({
          id: avaliacoes.id,
          cicloId: avaliacoes.cicloId,
          cicloNome: ciclos.nome,
          tipo: avaliacoes.tipo,
          titulo: avaliacoes.titulo,
          descricao: avaliacoes.descricao,
          dataReferencia: avaliacoes.dataReferencia,
          departamentoId: avaliacoes.departamentoId,
          departamentoNome: departamentos.nome,
          origem: avaliacoes.origem,
          status: avaliacoes.status,
          observacoes: avaliacoes.observacoes,
          createdBy: avaliacoes.createdBy,
          createdAt: avaliacoes.createdAt,
          updatedAt: avaliacoes.updatedAt,
        })
        .from(avaliacoes)
        .leftJoin(ciclos, eq(avaliacoes.cicloId, ciclos.id))
        .leftJoin(departamentos, eq(avaliacoes.departamentoId, departamentos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(avaliacoes.dataReferencia), desc(avaliacoes.id));
    }),

  obter: adminOrGerenteProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const [avaliacao] = await db
        .select({
          id: avaliacoes.id,
          cicloId: avaliacoes.cicloId,
          cicloNome: ciclos.nome,
          tipo: avaliacoes.tipo,
          titulo: avaliacoes.titulo,
          descricao: avaliacoes.descricao,
          dataReferencia: avaliacoes.dataReferencia,
          departamentoId: avaliacoes.departamentoId,
          departamentoNome: departamentos.nome,
          origem: avaliacoes.origem,
          status: avaliacoes.status,
          arquivoOrigemNome: avaliacoes.arquivoOrigemNome,
          arquivoOrigemUrl: avaliacoes.arquivoOrigemUrl,
          observacoes: avaliacoes.observacoes,
          createdBy: avaliacoes.createdBy,
          createdAt: avaliacoes.createdAt,
          updatedAt: avaliacoes.updatedAt,
        })
        .from(avaliacoes)
        .leftJoin(ciclos, eq(avaliacoes.cicloId, ciclos.id))
        .leftJoin(departamentos, eq(avaliacoes.departamentoId, departamentos.id))
        .where(eq(avaliacoes.id, input.id))
        .limit(1);

      if (!avaliacao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Avaliação não encontrada." });
      }

      return avaliacao;
    }),

  criarRascunho: adminProcedure
    .input(
      z.object({
        cicloId: z.number().int().positive(),
        tipo: tipoAvaliacaoSchema,
        titulo: z.string().trim().min(3).max(255),
        descricao: z.string().trim().max(5000).optional().nullable(),
        dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        departamentoId: z.number().int().positive().optional().nullable(),
        origem: z.enum(["IMPORTACAO", "SISTEMA", "MANUAL"]).default("SISTEMA"),
        observacoes: z.string().trim().max(5000).optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const [ciclo] = await db.select({ id: ciclos.id }).from(ciclos).where(eq(ciclos.id, input.cicloId)).limit(1);
      if (!ciclo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ciclo informado não existe." });
      }

      if (input.departamentoId) {
        const [departamento] = await db
          .select({ id: departamentos.id })
          .from(departamentos)
          .where(eq(departamentos.id, input.departamentoId))
          .limit(1);
        if (!departamento) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Departamento/unidade informado não existe." });
        }
      }

      const result = await db.insert(avaliacoes).values({
        cicloId: input.cicloId,
        tipo: input.tipo,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        dataReferencia: input.dataReferencia,
        departamentoId: input.departamentoId ?? null,
        origem: input.origem,
        status: "RASCUNHO",
        observacoes: input.observacoes ?? null,
        createdBy: ctx.user.id,
      });

      return { id: Number(result[0]?.insertId), status: "RASCUNHO" as const };
    }),

  listarMedicoes: adminOrGerenteProcedure
    .input(z.object({ avaliacaoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      return await db
        .select({
          id: medicoesCompetencias.id,
          avaliacaoId: medicoesCompetencias.avaliacaoId,
          colaboradorId: medicoesCompetencias.colaboradorId,
          colaboradorNome: users.name,
          competenciaMacroId: medicoesCompetencias.competenciaMacroId,
          competenciaNome: competenciasMacros.nome,
          tipoCompetencia: medicoesCompetencias.tipoCompetencia,
          fonte: medicoesCompetencias.fonte,
          valor: medicoesCompetencias.valor,
          escalaMin: medicoesCompetencias.escalaMin,
          escalaMax: medicoesCompetencias.escalaMax,
          classificacao: medicoesCompetencias.classificacao,
          observacao: medicoesCompetencias.observacao,
          medicaoAnteriorId: medicoesCompetencias.medicaoAnteriorId,
          validada: medicoesCompetencias.validada,
          validadaPor: medicoesCompetencias.validadaPor,
          validadaEm: medicoesCompetencias.validadaEm,
          createdAt: medicoesCompetencias.createdAt,
        })
        .from(medicoesCompetencias)
        .leftJoin(users, eq(medicoesCompetencias.colaboradorId, users.id))
        .leftJoin(
          competenciasMacros,
          eq(medicoesCompetencias.competenciaMacroId, competenciasMacros.id),
        )
        .where(eq(medicoesCompetencias.avaliacaoId, input.avaliacaoId))
        .orderBy(users.name, competenciasMacros.nome);
    }),

  adicionarMedicao: adminProcedure
    .input(
      z.object({
        avaliacaoId: z.number().int().positive(),
        colaboradorId: z.number().int().positive(),
        competenciaMacroId: z.number().int().positive(),
        tipoCompetencia: z.enum(["COMPORTAMENTAL", "TECNICA"]),
        fonte: z.enum(["AVALIACAO_DESEMPENHO", "AVALIACAO_TECNICA"]),
        valor: z.number().finite(),
        escalaMin: z.number().finite(),
        escalaMax: z.number().finite(),
        classificacao: z.string().trim().max(255).optional().nullable(),
        observacao: z.string().trim().max(5000).optional().nullable(),
        medicaoAnteriorId: z.number().int().positive().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.escalaMax <= input.escalaMin) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A escala máxima deve ser maior que a mínima." });
      }
      if (input.valor < input.escalaMin || input.valor > input.escalaMax) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O resultado está fora da escala informada." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const [avaliacao] = await db
        .select({ id: avaliacoes.id, tipo: avaliacoes.tipo, status: avaliacoes.status })
        .from(avaliacoes)
        .where(eq(avaliacoes.id, input.avaliacaoId))
        .limit(1);

      if (!avaliacao) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Avaliação não encontrada." });
      }
      if (avaliacao.status === "FINALIZADA" || avaliacao.status === "CANCELADA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta avaliação não aceita novas medições." });
      }

      const esperado = avaliacao.tipo === "DESEMPENHO"
        ? { tipoCompetencia: "COMPORTAMENTAL", fonte: "AVALIACAO_DESEMPENHO" }
        : { tipoCompetencia: "TECNICA", fonte: "AVALIACAO_TECNICA" };

      if (input.tipoCompetencia !== esperado.tipoCompetencia || input.fonte !== esperado.fonte) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O tipo da medição não corresponde ao tipo desta avaliação.",
        });
      }

      const [colaborador] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.colaboradorId)).limit(1);
      if (!colaborador) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Empregado não encontrado." });
      }

      const [competencia] = await db
        .select({ id: competenciasMacros.id })
        .from(competenciasMacros)
        .where(eq(competenciasMacros.id, input.competenciaMacroId))
        .limit(1);
      if (!competencia) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Competência não encontrada." });
      }

      if (input.medicaoAnteriorId) {
        const [anterior] = await db
          .select({
            id: medicoesCompetencias.id,
            colaboradorId: medicoesCompetencias.colaboradorId,
            competenciaMacroId: medicoesCompetencias.competenciaMacroId,
            fonte: medicoesCompetencias.fonte,
            escalaMin: medicoesCompetencias.escalaMin,
            escalaMax: medicoesCompetencias.escalaMax,
          })
          .from(medicoesCompetencias)
          .where(eq(medicoesCompetencias.id, input.medicaoAnteriorId))
          .limit(1);

        if (!anterior) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Medição anterior não encontrada." });
        }
        if (
          anterior.colaboradorId !== input.colaboradorId ||
          anterior.competenciaMacroId !== input.competenciaMacroId ||
          anterior.fonte !== input.fonte ||
          Number(anterior.escalaMin) !== input.escalaMin ||
          Number(anterior.escalaMax) !== input.escalaMax
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A medição anterior não é comparável com a medição atual.",
          });
        }
      }

      try {
        const result = await db.insert(medicoesCompetencias).values({
          avaliacaoId: input.avaliacaoId,
          colaboradorId: input.colaboradorId,
          competenciaMacroId: input.competenciaMacroId,
          tipoCompetencia: input.tipoCompetencia,
          fonte: input.fonte,
          valor: String(input.valor),
          escalaMin: String(input.escalaMin),
          escalaMax: String(input.escalaMax),
          classificacao: input.classificacao ?? null,
          observacao: input.observacao ?? null,
          medicaoAnteriorId: input.medicaoAnteriorId ?? null,
          validada: false,
        });

        return { id: Number(result[0]?.insertId), validada: false };
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe uma medição desta competência para este empregado nesta avaliação.",
          });
        }
        throw error;
      }
    }),
});
