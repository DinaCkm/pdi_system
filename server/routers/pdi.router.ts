import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { pdis, actions, users, departamentos, ciclos, evidences, adjustmentRequests } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * PDI Router - Plano de Desenvolvimento Individual
 * 
 * ARQUITETURA CORRIGIDA:
 * - PDI é um CONTAINER único por ciclo
 * - AÇÕES são o fluxo real (aprovação, evidência, alteração)
 * - Fluxo de aprovação, alteração e evidência acontece NO NÍVEL DE AÇÃO
 * 
 * REGRAS CRÍTICAS:
 * #7: Apenas ADMINISTRADOR cria PDI
 * #8: PDI é único por ciclo (UNIQUE constraint)
 * #9: Ações devem estar sempre dentro do ciclo de duração do PDI
 */

export const pdiRouter = router({
  /**
   * Listar PDIs com filtro por contexto (dualidade)
   * - Admin: vê todos os PDIs
   * - Líder: vê PDIs da equipe + seu próprio PDI
   * - Colaborador: vê apenas seu PDI
   */
  listarPdis: protectedProcedure
    .input(z.object({
      cicloId: z.number().optional(),
      status: z.enum(["rascunho", "aguardando_aprovacao", "ativo", "concluido", "cancelado"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      if (!user.role || !["admin", "lider", "colaborador"].includes(user.role)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Perfil de usuário inválido",
        });
      }

      let query = db.select().from(pdis);

      if (input.cicloId) {
        query = query.where(eq(pdis.cicloId, input.cicloId));
      }

      if (input.status) {
        query = query.where(eq(pdis.status, input.status));
      }

      if (user.role === "admin") {
        return await query;
      }

      if (user.role === "lider") {
        // Líder vê: seu PDI + PDIs de sua equipe
        const departamentoLiderado = await db
          .select()
          .from(departamentos)
          .where(eq(departamentos.leaderId, user.id))
          .limit(1);

        if (departamentoLiderado.length) {
          return await query.where(
            or(
              eq(pdis.colaboradorId, user.id),
              // PDIs de colaboradores no departamento que lidera
              db.select()
                .from(users)
                .where(
                  and(
                    eq(users.departamentoId, departamentoLiderado[0].id),
                    eq(users.id, pdis.colaboradorId)
                  )
                )
            )
          );
        }

        return await query.where(eq(pdis.colaboradorId, user.id));
      }

      if (user.role === "colaborador") {
        return await query.where(eq(pdis.colaboradorId, user.id));
      }

      return [];
    }),

  /**
   * Obter PDI por ID com validação de acesso
   */
  obterPdi: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, input.id))
        .limit(1);

      if (!pdi.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PDI não encontrado",
        });
      }

      const temAcesso = await validarAcessoPdi(db, user, pdi[0].colaboradorId);
      if (!temAcesso) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar este PDI",
        });
      }

      return pdi[0];
    }),

  /**
   * Criar novo PDI (APENAS ADMIN - Regra Crítica #7)
   * Garante PDI único por ciclo (Regra Crítica #8)
   */
  criarPdi: adminProcedure
    .input(z.object({
      colaboradorId: z.number(),
      cicloId: z.number(),
      titulo: z.string().min(3).max(255),
      objetivoGeral: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que colaborador existe
      const colaborador = await db
        .select()
        .from(users)
        .where(eq(users.id, input.colaboradorId))
        .limit(1);

      if (!colaborador.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      // Validar que ciclo existe
      const ciclo = await db
        .select()
        .from(ciclos)
        .where(eq(ciclos.id, input.cicloId))
        .limit(1);

      if (!ciclo.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ciclo não encontrado",
        });
      }

      // REGRA CRÍTICA #8: Validar unicidade de PDI por ciclo
      const pdiExistente = await db
        .select()
        .from(pdis)
        .where(
          and(
            eq(pdis.colaboradorId, input.colaboradorId),
            eq(pdis.cicloId, input.cicloId)
          )
        )
        .limit(1);

      if (pdiExistente.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "O colaborador já possui um PDI para este ciclo",
        });
      }

      // Criar PDI
      const result = await db.insert(pdis).values({
        colaboradorId: input.colaboradorId,
        cicloId: input.cicloId,
        titulo: input.titulo,
        objetivoGeral: input.objetivoGeral || null,
        status: "rascunho",
        createdBy: user.id,
      });

      return {
        id: result.insertId,
        colaboradorId: input.colaboradorId,
        cicloId: input.cicloId,
        titulo: input.titulo,
        objetivoGeral: input.objetivoGeral || null,
        status: "rascunho",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.id,
      };
    }),

  /**
   * Listar ações do PDI
   */
  listarAcoes: protectedProcedure
    .input(z.object({ pdiId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar acesso ao PDI
      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, input.pdiId))
        .limit(1);

      if (!pdi.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PDI não encontrado",
        });
      }

      const temAcesso = await validarAcessoPdi(db, user, pdi[0].colaboradorId);
      if (!temAcesso) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar este PDI",
        });
      }

      return await db
        .select()
        .from(actions)
        .where(eq(actions.pdiId, input.pdiId));
    }),

  /**
   * Criar ação no PDI (APENAS ADMIN)
   * REGRA CRÍTICA #9: Ação deve estar dentro do ciclo do PDI
   */
  criarAcao: adminProcedure
    .input(z.object({
      pdiId: z.number(),
      blocoId: z.number(),
      macroId: z.number(),
      microId: z.number(),
      nome: z.string().min(3).max(255),
      descricao: z.string().min(10),
      prazo: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que PDI existe
      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, input.pdiId))
        .limit(1);

      if (!pdi.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PDI não encontrado",
        });
      }

      // Validar que ciclo existe e obter datas
      const ciclo = await db
        .select()
        .from(ciclos)
        .where(eq(ciclos.id, pdi[0].cicloId))
        .limit(1);

      if (!ciclo.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ciclo não encontrado",
        });
      }

      // REGRA CRÍTICA #9: Validar que ação está dentro do ciclo
      const cicloData = ciclo[0];
      if (input.prazo < cicloData.dataInicio || input.prazo > cicloData.dataFim) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Prazo da ação deve estar entre ${cicloData.dataInicio.toLocaleDateString()} e ${cicloData.dataFim.toLocaleDateString()}`,
        });
      }

      // Criar ação
      const result = await db.insert(actions).values({
        pdiId: input.pdiId,
        blocoId: input.blocoId,
        macroId: input.macroId,
        microId: input.microId,
        nome: input.nome,
        descricao: input.descricao,
        prazo: input.prazo,
        status: "pendente_aprovacao_lider",
        createdBy: user.id,
      });

      return {
        id: result.insertId,
        pdiId: input.pdiId,
        blocoId: input.blocoId,
        macroId: input.macroId,
        microId: input.microId,
        nome: input.nome,
        descricao: input.descricao,
        prazo: input.prazo,
        status: "pendente_aprovacao_lider",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.id,
      };
    }),

  /**
   * Aprovar ação (APENAS LÍDER)
   * Muda status de "pendente_aprovacao_lider" para "aprovada_lider"
   */
  aprovarAcao: protectedProcedure
    .input(z.object({
      acaoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que usuário é Líder
      if (user.role !== "lider" && user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas líderes podem aprovar ações",
        });
      }

      // Validar que ação existe
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, input.acaoId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Validar que ação está em status correto
      if (acao[0].status !== "pendente_aprovacao_lider") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ação não está aguardando aprovação",
        });
      }

      // Validar que líder tem acesso (é líder do colaborador)
      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, acao[0].pdiId))
        .limit(1);

      if (!pdi.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PDI não encontrado",
        });
      }

      const colaborador = await db
        .select()
        .from(users)
        .where(eq(users.id, pdi[0].colaboradorId))
        .limit(1);

      if (!colaborador.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      // Validar que líder é o líder do colaborador (ou é admin)
      if (user.role !== "admin" && colaborador[0].leaderId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste colaborador",
        });
      }

      // Aprovar ação
      await db
        .update(actions)
        .set({ status: "aprovada_lider", updatedAt: new Date() })
        .where(eq(actions.id, input.acaoId));

      return { id: input.acaoId, status: "aprovada_lider" };
    }),

  /**
   * Enviar evidência de ação (COLABORADOR)
   */
  enviarEvidencia: protectedProcedure
    .input(z.object({
      acaoId: z.number(),
      texto: z.string().min(10).optional(),
      arquivos: z.array(z.object({
        url: z.string().url(),
        nome: z.string(),
        tamanho: z.number(),
        tipo: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que ação existe
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, input.acaoId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Validar que ação está em status correto
      if (acao[0].status !== "aprovada_lider" && acao[0].status !== "em_andamento") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ação não está em execução",
        });
      }

      // Validar que colaborador é o dono da ação
      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, acao[0].pdiId))
        .limit(1);

      if (!pdi.length || pdi[0].colaboradorId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para enviar evidência desta ação",
        });
      }

      // Criar evidência
      const result = await db.insert(evidences).values({
        actionId: input.acaoId,
        colaboradorId: user.id,
        status: "aguardando_avaliacao",
      });

      // Atualizar status da ação
      await db
        .update(actions)
        .set({ status: "evidencia_enviada", updatedAt: new Date() })
        .where(eq(actions.id, input.acaoId));

      return {
        id: result.insertId,
        acaoId: input.acaoId,
        status: "aguardando_avaliacao",
      };
    }),

  /**
   * Validar evidência (ADMIN)
   */
  validarEvidencia: adminProcedure
    .input(z.object({
      evidenciaId: z.number(),
      aprovada: z.boolean(),
      justificativa: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que evidência existe
      const evidencia = await db
        .select()
        .from(evidences)
        .where(eq(evidences.id, input.evidenciaId))
        .limit(1);

      if (!evidencia.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidência não encontrada",
        });
      }

      const novoStatus = input.aprovada ? "aprovada" : "reprovada";

      // Atualizar evidência
      await db
        .update(evidences)
        .set({
          status: novoStatus,
          justificativaAdmin: input.justificativa || null,
          evaluatedAt: new Date(),
          evaluatedBy: user.id,
        })
        .where(eq(evidences.id, input.evidenciaId));

      // Atualizar status da ação
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, evidencia[0].actionId))
        .limit(1);

      if (acao.length) {
        const novoStatusAcao = input.aprovada ? "concluida" : "evidencia_reprovada";
        await db
          .update(actions)
          .set({ status: novoStatusAcao, updatedAt: new Date() })
          .where(eq(actions.id, evidencia[0].actionId));
      }

      return { id: input.evidenciaId, status: novoStatus };
    }),

  /**
   * Solicitar alteração de ação (LÍDER ou COLABORADOR)
   */
  solicitarAlteracao: protectedProcedure
    .input(z.object({
      acaoId: z.number(),
      tipoSolicitacao: z.enum([
        "alteracao_descricao",
        "alteracao_prazo",
        "alteracao_competencia",
        "cancelamento"
      ]),
      descricaoSolicitacao: z.string().min(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que ação existe
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, input.acaoId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Criar solicitação de alteração
      const result = await db.insert(adjustmentRequests).values({
        actionId: input.acaoId,
        solicitanteId: user.id,
        tipoSolicitacao: input.tipoSolicitacao,
        descricaoSolicitacao: input.descricaoSolicitacao,
        status: "pendente",
      });

      return {
        id: result.insertId,
        acaoId: input.acaoId,
        status: "pendente",
      };
    }),
});

/**
 * Validar acesso ao PDI baseado em dualidade
 */
async function validarAcessoPdi(
  db: any,
  user: any,
  colaboradorId: number
): Promise<boolean> {
  if (user.role === "admin") return true;

  if (user.role === "colaborador") {
    return user.id === colaboradorId;
  }

  if (user.role === "lider") {
    // Líder vê seu PDI
    if (user.id === colaboradorId) return true;

    // Líder vê PDIs de sua equipe
    const colaborador = await db
      .select()
      .from(users)
      .where(eq(users.id, colaboradorId))
      .limit(1);

    if (!colaborador.length) return false;

    const departamentoLiderado = await db
      .select()
      .from(departamentos)
      .where(eq(departamentos.leaderId, user.id))
      .limit(1);

    if (departamentoLiderado.length) {
      return colaborador[0].departamentoId === departamentoLiderado[0].id;
    }
  }

  return false;
}
