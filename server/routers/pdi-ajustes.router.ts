import { router, protectedProcedure, adminProcedure } from "../_core/customTrpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { adjustmentRequests, actions, pdis, users, departamentos, ciclos } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  sendEmailAjusteSolicitadoParaLider,
  sendEmailAjusteValidadoParaAdmin,
  sendEmailAjusteAprovadoParaColaborador,
  sendEmailAjusteReprovadoParaColaborador,
} from "../_core/email";

/**
 * REGRA CRÍTICA #10 REFINADA: Fluxo de Solicitação de Ajuste com Precedência do Líder
 * 
 * FASE 1: PROPOSTA (pendente_aprovacao_lider)
 * - Dina é autoridade principal
 * - Colaborador solicita ajustes (limite 5)
 * - Dina pode editar DIRETO
 * - Status: pendente_admin
 * 
 * FASE 2: COMPROMISSO (aprovada_lider+)
 * - Líder é "dono" da prioridade
 * - Colaborador solicita ajuste
 * - BLOQUEIO: Botão de editar desabilitado para Dina
 * - Status: aguardando_autorizacao_lider_para_ajuste
 * - LIBERAÇÃO: Após Líder "De Acordo" → lider_de_acordo
 * - CONCLUSÃO: Dina edita (botão habilitado)
 */

export const pdiAjustesRouter = router({
  /**
   * Solicitar alteração de ação (COLABORADOR ou LÍDER)
   * Detecta fase da ação e define status inicial apropriado
   */
  solicitarAlteracao: protectedProcedure
    .input(
      z.object({
        acaoId: z.number(),
        tipoSolicitacao: z.enum([
          "alteracao_descricao",
          "alteracao_prazo",
          "alteracao_competencia",
          "cancelamento",
        ]),
        descricaoSolicitacao: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const user = ctx.user;

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

      // Validar que usuário é dono ou líder da ação
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

      // Validar permissão: Colaborador (dono) ou Líder (seu líder)
      if (user.role === "colaborador") {
        if (pdi[0].colaboradorId !== user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas o colaborador dono da ação pode solicitar alteração",
          });
        }
      } else if (user.role === "lider") {
        // Líder pode solicitar para si mesmo ou para subordinados
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

        // Verificar se é seu próprio PDI ou de subordinado
        if (
          pdi[0].colaboradorId !== user.id &&
          colaborador[0].leaderId !== user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para solicitar alteração nesta ação",
          });
        }
      } else if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas colaboradores, líderes e admins podem solicitar alterações",
        });
      }

      // Validar limite de 5 solicitações
      const totalSolicitacoes = await db
        .select()
        .from(adjustmentRequests)
        .where(and(
          eq(adjustmentRequests.actionId, input.acaoId),
          eq(adjustmentRequests.solicitanteId, user.id)
        ));

      if (totalSolicitacoes.length >= 5) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Limite de 5 solicitações de ajuste atingido para esta ação",
        });
      }

      // ARQUITETURA DE PRECEDÊNCIA DO LÍDER
      // Determinar status inicial baseado na fase da ação
      let statusInicial: "pendente" | "aguardando_lider";

      if (acao[0].status === "pendente_aprovacao_lider") {
        // FASE 1: PROPOSTA - Dina é autoridade principal
        statusInicial = "pendente";
      } else if (
        acao[0].status === "aprovada_lider" ||
        acao[0].status === "em_andamento" ||
        acao[0].status === "evidencia_enviada" ||
        acao[0].status === "concluida"
      ) {
        // FASE 2: COMPROMISSO - Líder é "dono"
        // Requer autorização do Líder antes de Dina editar
        statusInicial = "aguardando_lider";
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ação não pode ter alterações solicitadas neste status",
        });
      }

      // Criar solicitação de alteração
      const result = await db.insert(adjustmentRequests).values({
        actionId: input.acaoId,
        solicitanteId: user.id,
        tipoSolicitacao: input.tipoSolicitacao,
        descricaoSolicitacao: input.descricaoSolicitacao,
        status: statusInicial,
      });

      // NOTIFICAÇÃO POR EMAIL - Etapa 1: Notificar o Líder quando colaborador solicita ajuste
      if (statusInicial === "aguardando_lider") {
        try {
          // Buscar o colaborador dono do PDI
          const colaboradorDono = await db
            .select()
            .from(users)
            .where(eq(users.id, pdi[0].colaboradorId))
            .limit(1);

          if (colaboradorDono.length && colaboradorDono[0].leaderId) {
            // Buscar o líder
            const lider = await db
              .select()
              .from(users)
              .where(eq(users.id, colaboradorDono[0].leaderId))
              .limit(1);

            if (lider.length && lider[0].email) {
              // Buscar departamento
              let deptNome = '';
              if (colaboradorDono[0].departamentoId) {
                const dept = await db
                  .select()
                  .from(departamentos)
                  .where(eq(departamentos.id, colaboradorDono[0].departamentoId))
                  .limit(1);
                if (dept.length) deptNome = dept[0].nome;
              }

              await sendEmailAjusteSolicitadoParaLider({
                liderEmail: lider[0].email,
                liderName: lider[0].name,
                colaboradorName: colaboradorDono[0].name,
                tituloAcao: acao[0].descricao || 'Ação do PDI',
                tipoAjuste: input.tipoSolicitacao,
                justificativa: input.descricaoSolicitacao,
                departamento: deptNome || undefined,
              });
            }
          }
        } catch (emailError) {
          console.warn('[Email] Erro ao enviar email de ajuste para líder:', emailError);
        }
      }

      const mensagem =
        statusInicial === "pendente"
          ? "Solicitação enviada para o administrador (ação ainda não foi validada pelo líder)"
          : "Solicitação enviada. Aguardando autorização do seu líder para o RH proceder com a alteração";

      return {
        id: Number(result.insertId),
        acaoId: input.acaoId,
        status: statusInicial,
        mensagem,
      };
    }),

  /**
   * Autorizar alteração (LÍDER)
   * Apenas para FASE 2: Ação já validada pelo Líder
   * Libera o botão de edição para Admin
   */
  autorizarAlteracao: protectedProcedure
    .input(
      z.object({
        solicitacaoId: z.number(),
        autoriza: z.boolean(),
        feedback_lider: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const user = ctx.user;

      // Validar que usuário é Líder
      if (user.role !== "lider" && user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas líderes podem autorizar alterações",
        });
      }

      // Validar que solicitação existe
      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.solicitacaoId))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação de alteração não encontrada",
        });
      }

      // Validar que solicitação está aguardando autorização do líder
      if (solicitacao[0].status !== "aguardando_lider") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação não está aguardando autorização do líder",
        });
      }

      // Validar que líder é o líder do colaborador
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, solicitacao[0].actionId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

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

      // Atualizar solicitação com autorização do líder
      const novoStatus = input.autoriza ? "pendente" : "reprovada";
      await db
        .update(adjustmentRequests)
        .set({
          liderConfirmacao: input.autoriza,
          liderConfirmadoPor: user.id,
          feedback_lider: input.feedback_lider,
          liderConfirmadoAt: new Date(),
          status: novoStatus,
        })
        .where(eq(adjustmentRequests.id, input.solicitacaoId));

      // NOTIFICAÇÃO POR EMAIL - Etapa 2: Notificar Admin (CKM) quando Líder valida o ajuste
      if (input.autoriza) {
        try {
          // Buscar todos os admins
          const admins = await db
            .select()
            .from(users)
            .where(eq(users.role, 'admin'));

          // Buscar departamento do colaborador
          let deptNome = '';
          if (colaborador[0].departamentoId) {
            const dept = await db
              .select()
              .from(departamentos)
              .where(eq(departamentos.id, colaborador[0].departamentoId))
              .limit(1);
            if (dept.length) deptNome = dept[0].nome;
          }

          // Enviar email para cada admin
          for (const admin of admins) {
            if (admin.email) {
              await sendEmailAjusteValidadoParaAdmin({
                adminEmail: admin.email,
                adminName: admin.name,
                liderName: user.name,
                colaboradorName: colaborador[0].name,
                tituloAcao: acao[0].descricao || 'Ação do PDI',
                camposAjustar: solicitacao[0].camposAjustar,
                justificativa: solicitacao[0].justificativa,
                feedbackLider: input.feedback_lider,
                departamento: deptNome || undefined,
              });
            }
          }
        } catch (emailError) {
          console.warn('[Email] Erro ao enviar email de ajuste validado para admin:', emailError);
        }
      }

      return {
        id: input.solicitacaoId,
        status: novoStatus,
        autoriza: input.autoriza,
        mensagem: input.autoriza
          ? "Alteração autorizada. Enviada para o administrador"
          : "Solicitação rejeitada",
      };
    }),

  /**
   * Aprovar e fazer alteração (ADMIN)
   * ARQUITETURA DE PRECEDÊNCIA: Valida se Líder já aprovou a ação
   */
  aprovarAlteracao: adminProcedure
    .input(
      z.object({
        solicitacaoId: z.number(),
        aprovada: z.boolean(),
        justificativa: z.string().optional(),
        novaDescricao: z.string().optional(),
        novoPrazo: z.date().optional(),
        novoMicroId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const user = ctx.user;

      // Validar que solicitação existe
      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.solicitacaoId))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação de alteração não encontrada",
        });
      }

      // Validar que solicitação está aguardando aprovação do admin
      if (solicitacao[0].status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação não está aguardando aprovação do admin",
        });
      }

      // TRAVA DE PRECEDÊNCIA DO LÍDER
      // Se a solicitação estava em "aguardando_lider"
      // ela DEVE estar em "pendente" (após líder aprovar) para Admin poder editar
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, solicitacao[0].actionId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Se aprovada, fazer o ajuste na ação
      if (input.aprovada) {
        const pdi = await db
          .select()
          .from(pdis)
          .where(eq(pdis.id, acao[0].pdiId))
          .limit(1);

        if (pdi.length) {
          // Validar que novo prazo está dentro do ciclo (Regra #9)
          if (input.novoPrazo) {
            const ciclo = await db
              .select()
              .from(ciclos)
              .where(eq(ciclos.id, pdi[0].cicloId))
              .limit(1);

            if (ciclo.length) {
              if (
                input.novoPrazo < ciclo[0].dataInicio ||
                input.novoPrazo > ciclo[0].dataFim
              ) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Novo prazo deve estar entre ${ciclo[0].dataInicio.toLocaleDateString()} e ${ciclo[0].dataFim.toLocaleDateString()}`,
                });
              }
            }
          }
        }

        // Fazer o ajuste na ação
        const updateData: any = { updatedAt: new Date() };
        if (input.novaDescricao) updateData.descricao = input.novaDescricao;
        if (input.novoPrazo) updateData.prazo = input.novoPrazo;
        if (input.novoMicroId) updateData.microId = input.novoMicroId;

        await db
          .update(actions)
          .set(updateData)
          .where(eq(actions.id, solicitacao[0].actionId));
      }

      // Atualizar solicitação
      const novoStatus = input.aprovada ? "aprovada" : "reprovada";
      await db
        .update(adjustmentRequests)
        .set({
          status: novoStatus,
          respondidoPor: user.id,
          justificativaResposta: input.justificativa || null,
          respondidoAt: new Date(),
        })
        .where(eq(adjustmentRequests.id, input.solicitacaoId));

      // NOTIFICAÇÃO POR EMAIL - Etapa 3: Notificar Colaborador quando CKM aprova/reprova o ajuste
      try {
        // Buscar o solicitante (colaborador)
        const solicitante = await db
          .select()
          .from(users)
          .where(eq(users.id, solicitacao[0].solicitanteId))
          .limit(1);

        if (solicitante.length && solicitante[0].email) {
          // Buscar departamento
          let deptNome = '';
          if (solicitante[0].departamentoId) {
            const dept = await db
              .select()
              .from(departamentos)
              .where(eq(departamentos.id, solicitante[0].departamentoId))
              .limit(1);
            if (dept.length) deptNome = dept[0].nome;
          }

          if (input.aprovada) {
            await sendEmailAjusteAprovadoParaColaborador({
              colaboradorEmail: solicitante[0].email,
              colaboradorName: solicitante[0].name,
              tituloAcao: acao[0].descricao || 'Ação do PDI',
              camposAjustar: solicitacao[0].camposAjustar,
              departamento: deptNome || undefined,
            });
          } else {
            await sendEmailAjusteReprovadoParaColaborador({
              colaboradorEmail: solicitante[0].email,
              colaboradorName: solicitante[0].name,
              tituloAcao: acao[0].descricao || 'Ação do PDI',
              camposAjustar: solicitacao[0].camposAjustar,
              justificativa: input.justificativa || undefined,
              departamento: deptNome || undefined,
            });
          }
        }
      } catch (emailError) {
        console.warn('[Email] Erro ao enviar email de resultado do ajuste para colaborador:', emailError);
      }

      return {
        id: input.solicitacaoId,
        status: novoStatus,
        acao: input.aprovada ? "Alteração realizada" : "Solicitação rejeitada",
        mensagem: input.aprovada
          ? "Alteração foi aplicada à ação"
          : "Solicitação foi rejeitada",
      };
    }),

  /**
   * Listar solicitações de alteração (LÍDER e ADMIN)
   */
  listarSolicitacoes: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "pendente",
            "aguardando_lider",
            "aprovada",
            "reprovada",
            "mais_informacoes",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const user = ctx.user;

      if (user.role !== "lider" && user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas líderes e admins podem listar solicitações",
        });
      }

      let results;
      
      if (input.status) {
        results = await db.select().from(adjustmentRequests).where(eq(adjustmentRequests.status, input.status));
      } else if (user.role === "lider") {
        // Líder vê apenas solicitações que aguardam sua autorização
        results = await db.select().from(adjustmentRequests).where(eq(adjustmentRequests.status, "aguardando_lider"));
      } else {
        // Admin vê todas
        results = await db.select().from(adjustmentRequests);
      }

      return results;
    }),

  /**
   * Obter detalhes de uma solicitação
   */
  obterSolicitacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const user = ctx.user;

      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.id))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      // Validar acesso
      if (user.role !== "admin" && solicitacao[0].solicitanteId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar esta solicitação",
        });
      }

      return solicitacao[0];
    }),

  /**
   * Reenviar notificação de solicitação de ajuste pendente para o líder
   * Usado pelo Admin quando quer lembrar o líder de avaliar
   */
  reenviarNotificacaoLider: protectedProcedure
    .input(z.object({ adjustmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem reenviar notificações' });
      }

      const db = await getDb();

      // Buscar a solicitação
      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.adjustmentId))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
      }

      // Buscar a ação
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, solicitacao[0].actionId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }

      // Buscar o colaborador solicitante
      const colaborador = await db
        .select()
        .from(users)
        .where(eq(users.id, solicitacao[0].solicitanteId))
        .limit(1);

      if (!colaborador.length || !colaborador[0].leaderId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Colaborador sem líder vinculado' });
      }

      // Buscar o líder
      const lider = await db
        .select()
        .from(users)
        .where(eq(users.id, colaborador[0].leaderId))
        .limit(1);

      if (!lider.length || !lider[0].email) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Líder não encontrado ou sem email' });
      }

      // Buscar departamento
      let deptNome = '';
      if (colaborador[0].departamentoId) {
        const dept = await db
          .select()
          .from(departamentos)
          .where(eq(departamentos.id, colaborador[0].departamentoId))
          .limit(1);
        if (dept.length) deptNome = dept[0].nome;
      }

      // Enviar email ao líder
      await sendEmailAjusteSolicitadoParaLider({
        liderEmail: lider[0].email,
        liderName: lider[0].name,
        colaboradorName: colaborador[0].name,
        tituloAcao: acao[0].descricao || 'Ação do PDI',
        camposAjustar: solicitacao[0].camposAjustar,
        justificativa: solicitacao[0].justificativa || '',
        departamento: deptNome || undefined,
      });

      return { success: true, liderNome: lider[0].name, liderEmail: lider[0].email };
    }),
});
