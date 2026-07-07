import { router, protectedProcedure, adminProcedure, adminOrGerenteProcedure } from "../_core/customTrpc";
import { z } from "zod";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { pdis, actions, users, departamentos } from "../../drizzle/schema";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "../_core/email";

const CC_RELACIONAMENTO = "relacionamento@ckmtalents.net";
const CC_FIXOS = [CC_RELACIONAMENTO, "elisangela.varanda@to.sebrae.com.br"];

// Limite de segurança para o payload da imagem em base64 (~5MB de imagem real)
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

/**
 * Dashboard Router
 * Procedures para retornar estatísticas e métricas do sistema
 */
export const dashboardRouter = router({
  /**
   * Obter estatísticas para a Visão Executiva
   * Inclui progresso geral e cards de PDI por tipo
   */
  getVisaoExecutivaStats: protectedProcedure
    .input(
      z.object({
        departamentoId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;
      const { departamentoId } = input;

      let filterCondition = sql`1=1`; // Condição padrão para não filtrar

      if (departamentoId) {
        filterCondition = eq(users.departamentoId, departamentoId);
      } else if (user.role === "lider") {
        filterCondition = eq(users.leaderId, user.id);
      } else if (user.role === "colaborador") {
        const userData = await db.select({ departamentoId: users.departamentoId }).from(users).where(eq(users.id, user.id)).limit(1);
        if (userData.length > 0 && userData[0].departamentoId) {
          filterCondition = eq(users.departamentoId, userData[0].departamentoId);
        }
      }

      // Progresso Geral de Execução do PDI
      const totalActionsResult = await db
        .select({
          total: count(actions.id),
          concluidas: count(sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`),
        })
        .from(actions)
        .leftJoin(pdis, eq(actions.pdiId, pdis.id))
        .leftJoin(users, eq(pdis.colaboradorId, users.id))
        .where(filterCondition);

      const totalActions = totalActionsResult[0]?.total || 0;
      const concludedActions = totalActionsResult[0]?.concluidas || 0;
      const progress = totalActions > 0 ? Math.round((concludedActions / totalActions) * 100) : 0;

      // Ações por Tipo de PDI (Certificação, Herdeiras, Onboarding)
      const pdiTypesStats = await db
        .select({
          pdiType: pdis.type,
          planned: count(actions.id),
          concluded: count(sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`),
        })
        .from(pdis)
        .leftJoin(actions, eq(actions.pdiId, pdis.id))
        .leftJoin(users, eq(pdis.colaboradorId, users.id))
        .where(filterCondition)
        .groupBy(pdis.type);

      const pdiCertificacao = pdiTypesStats.find(s => s.pdiType === 'certificacao') || { pdiType: 'certificacao', planned: 0, concluded: 0 };
      const acoesHerdeiras = pdiTypesStats.find(s => s.pdiType === 'herdeiras') || { pdiType: 'herdeiras', planned: 0, concluded: 0 };
      const pdiOnboarding = pdiTypesStats.find(s => s.pdiType === 'onboarding') || { pdiType: 'onboarding', planned: 0, concluded: 0 };

      return {
        progress: progress,
        concludedActions: concludedActions,
        totalActions: totalActions,
        pdiCertificacao: {
          planned: pdiCertificacao.planned,
          concluded: pdiCertificacao.concluded,
          open: pdiCertificacao.planned - pdiCertificacao.concluded,
          percentage: pdiCertificacao.planned > 0 ? Math.round((pdiCertificacao.concluded / pdiCertificacao.planned) * 100) : 0,
        },
        acoesHerdeiras: {
          planned: acoesHerdeiras.planned,
          concluded: acoesHerdeiras.concluded,
          open: acoesHerdeiras.planned - acoesHerdeiras.concluded,
          percentage: acoesHerdeiras.planned > 0 ? Math.round((acoesHerdeiras.concluded / acoesHerdeiras.planned) * 100) : 0,
        },
        pdiOnboarding: {
          planned: pdiOnboarding.planned,
          concluded: pdiOnboarding.concluded,
          open: pdiOnboarding.planned - pdiOnboarding.concluded,
          percentage: pdiOnboarding.planned > 0 ? Math.round((pdiOnboarding.concluded / pdiOnboarding.planned) * 100) : 0,
        },
      };
    }),
  /**
   * Obter estatísticas gerais do dashboard
   * Retorna 4 blocos de informação com hierarquia de acesso
   */
  getStats: protectedProcedure
    .input(
      z.object({
        departamentoId: z.number().optional(), // Filtro opcional para Admin
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;
      const stats = {
        blocoA: {
          totalColaboradores: 0,
          totalLideres: 0,
          taxaEngajamento: 0, // PDIs ativos / Total colaboradores
        },
        blocoB: {
          pendente: 0,
          emAndamento: 0,
          concluida: 0,
          percentualPendente: 0,
          percentualEmAndamento: 0,
          percentualConcluida: 0,
        },
        blocoC: {
          top5Departamentos: [] as Array<{
            departamentoId: number;
            departamentoNome: string;
            taxaConclusao: number;
            acoesConcluidas: number;
            acoesTotal: number;
          }>,
        },
        blocoD: {
          top10Colaboradores: [] as Array<{
            colaboradorId: number;
            colaboradorNome: string;
            acoesConcluidasTotal: number;
            acoesTotal: number;
            taxaConclusao: number;
            posicao: number;
            medalha?: "ouro" | "prata" | "bronze";
          }>,
        },
        // Bloco E: Estatísticas pessoais do colaborador
        blocoE: {
          minhasAcoesTotal: 0,
          minhasAcoesConcluidas: 0,
          minhaTaxaConclusao: 0,
          minhaPosicaoRanking: 0,
        },
      };

      try {
        // Determinar filtro baseado no role
        let departamentoFilter: number | null = null;
        let leaderFilter: number | null = null; // Novo filtro para líderes

        if (user.role === "lider") {
          // Líder vê apenas sua equipe (colaboradores que têm ele como líder)
          leaderFilter = user.id;
        } else if (user.role === "colaborador") {
          // Colaborador vê apenas sua equipe (seu departamento)
          const userData = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (userData.length > 0 && userData[0].departamentoId) {
            departamentoFilter = userData[0].departamentoId;
          }
        } else if ((user.role === "admin" || user.role === "gerente") && input.departamentoId) {
          // Admin ou Gerente pode filtrar por departamento específico
          departamentoFilter = input.departamentoId;
        }

        // ============= BLOCO A: KPIs GERAIS =============
        if (leaderFilter) {
          // Líder: contar colaboradores que têm ele como líder
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.leaderId, leaderFilter),
                eq(users.status, "ativo")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = 1; // O próprio líder
        } else if (departamentoFilter) {
          // Filtrado por departamento
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.departamentoId, departamentoFilter),
                eq(users.role, "colaborador"),
                eq(users.status, "ativo")
              )
            );

          const lideresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.departamentoId, departamentoFilter),
                eq(users.role, "lider"),
                eq(users.status, "ativo")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = lideresResult[0]?.count || 0;
        } else if (user.role === "admin" || user.role === "gerente") {
          // Admin ou Gerente vendo tudo - CONTAR LÍDERES E COLABORADORES SEPARADAMENTE
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.role, "colaborador"),
                eq(users.status, "ativo")
              )
            );

          const lideresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.role, "lider"),
                eq(users.status, "ativo")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = lideresResult[0]?.count || 0;
        }

        // Taxa de engajamento: Ações Concluídas / Total de Ações
        let acoesQuery = db
          .select({
            total: count(),
            concluidas: count(sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`),
          })
          .from(actions)
          .leftJoin(pdis, eq(actions.pdiId, pdis.id))
          .leftJoin(users, eq(pdis.colaboradorId, users.id));
        
        if (leaderFilter) {
          acoesQuery = acoesQuery.where(eq(users.leaderId, leaderFilter));
        } else if (departamentoFilter) {
          acoesQuery = acoesQuery.where(eq(users.departamentoId, departamentoFilter));
        }
        
        const acoesResult = await acoesQuery;
        const totalAcoesEngajamento = acoesResult[0]?.total || 0;
        const acoesConcluidasEngajamento = acoesResult[0]?.concluidas || 0;
        
        if (totalAcoesEngajamento > 0) {
          stats.blocoA.taxaEngajamento = Math.round((acoesConcluidasEngajamento / totalAcoesEngajamento) * 100);
        }

        // ============= BLOCO B: FUNIL DE EXECUÇÃO =============
        let statusCountsQuery = db
          .select({
            status: actions.status,
            count: count(),
          })
          .from(actions)
          .leftJoin(pdis, eq(actions.pdiId, pdis.id))
          .leftJoin(users, eq(pdis.colaboradorId, users.id));

        if (leaderFilter) {
          statusCountsQuery = statusCountsQuery.where(eq(users.leaderId, leaderFilter));
        } else if (departamentoFilter) {
          statusCountsQuery = statusCountsQuery.where(
            eq(users.departamentoId, departamentoFilter)
          );
        }

        const statusCounts = await statusCountsQuery.groupBy(actions.status);

        const totalAcoes = statusCounts.reduce((sum: number, item: { status: string | null; count: number }) => sum + item.count, 0);

        statusCounts.forEach((item: { status: string | null; count: number }) => {
          if (item.status === "nao_iniciada" || item.status === "pendente") {
            stats.blocoB.pendente += item.count;
          } else if (item.status === "em_andamento") {
            stats.blocoB.emAndamento += item.count;
          } else if (item.status === "concluida") {
            stats.blocoB.concluida += item.count;
          }
        });

        if (totalAcoes > 0) {
          stats.blocoB.percentualPendente = parseFloat(
            ((stats.blocoB.pendente / totalAcoes) * 100).toFixed(3)
          );
          stats.blocoB.percentualEmAndamento = parseFloat(
            ((stats.blocoB.emAndamento / totalAcoes) * 100).toFixed(3)
          );
          stats.blocoB.percentualConcluida = parseFloat(
            ((stats.blocoB.concluida / totalAcoes) * 100).toFixed(3)
          );
        }

        // ============= BLOCO C: TOP 5 DEPARTAMENTOS =============
        // Só mostra para admin ou gerente (para líder não faz sentido ver ranking de departamentos)
        if (user.role === "admin" || user.role === "gerente") {
          const departamentosStats = await db
            .select({
              departamentoId: departamentos.id,
              departamentoNome: departamentos.nome,
              acoesConcluidas: count(
                sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`
              ),
              acoesTotal: count(),
            })
            .from(departamentos)
            .leftJoin(users, eq(users.departamentoId, departamentos.id))
            .leftJoin(pdis, eq(pdis.colaboradorId, users.id))
            .leftJoin(actions, eq(actions.pdiId, pdis.id))
            .groupBy(departamentos.id, departamentos.nome)
            .orderBy(desc(sql`COUNT(CASE WHEN ${actions.status} = 'concluida' THEN 1 END)`))
            .limit(5);

          stats.blocoC.top5Departamentos = departamentosStats
            .map((item: { departamentoId: number; departamentoNome: string | null; acoesConcluidas: number; acoesTotal: number }) => ({
              departamentoId: item.departamentoId,
              departamentoNome: item.departamentoNome,
              acoesConcluidas: item.acoesConcluidas || 0,
              acoesTotal: item.acoesTotal || 0,
              taxaConclusao:
                item.acoesTotal > 0
                  ? Math.round(
                      ((item.acoesConcluidas || 0) / item.acoesTotal) * 100
                    )
                  : 0,
            }))
            .sort((a: { departamentoId: number; departamentoNome: string | null; acoesConcluidas: number; acoesTotal: number; taxaConclusao: number }, b: { departamentoId: number; departamentoNome: string | null; acoesConcluidas: number; acoesTotal: number; taxaConclusao: number }) => b.taxaConclusao - a.taxaConclusao);
        }

        // ============= BLOCO D: TOP 10 COLABORADORES =============
        // Para líder: mostrar apenas colaboradores da sua equipe
        // Para admin/colaborador: mostrar todos (ou filtrado por departamento)
        let colaboradoresStatsQuery = db
          .select({
            colaboradorId: users.id,
            colaboradorNome: users.name,
            acoesConcluidasTotal: count(
              sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`
            ),
            acoesTotal: count(actions.id),
          })
          .from(users)
          .leftJoin(pdis, eq(pdis.colaboradorId, users.id))
          .leftJoin(actions, eq(actions.pdiId, pdis.id));

        if (leaderFilter) {
          // Líder vê apenas seus colaboradores diretos
          colaboradoresStatsQuery = colaboradoresStatsQuery.where(
            and(
              eq(users.leaderId, leaderFilter),
              eq(users.status, "ativo")
            )
          );
        } else if (departamentoFilter) {
          // Filtrado por departamento
          colaboradoresStatsQuery = colaboradoresStatsQuery.where(
            and(
              eq(users.departamentoId, departamentoFilter),
              eq(users.role, "colaborador"),
              eq(users.status, "ativo")
            )
          );
        } else {
          // Admin vendo todos
          colaboradoresStatsQuery = colaboradoresStatsQuery.where(
            and(
              eq(users.role, "colaborador"),
              eq(users.status, "ativo")
            )
          );
        }

        const colaboradoresStats = await colaboradoresStatsQuery.groupBy(users.id, users.name);

        // Calcular taxa de conclusão e filtrar quem tem ações concluídas
        const colaboradoresComTaxa = colaboradoresStats
          .map((item: { colaboradorId: number | null; colaboradorNome: string | null; acoesConcluidasTotal: number; acoesTotal: number }) => ({
            colaboradorId: item.colaboradorId as number,
            colaboradorNome: (item.colaboradorNome || "Sem nome") as string,
            acoesConcluidasTotal: (item.acoesConcluidasTotal || 0) as number,
            acoesTotal: (item.acoesTotal || 0) as number,
            taxaConclusao: item.acoesTotal > 0 
              ? Math.round(((item.acoesConcluidasTotal || 0) / item.acoesTotal) * 100) 
              : 0,
          }))
          // Filtrar apenas quem tem ações concluídas (> 0)
          .filter((item: { colaboradorId: number; colaboradorNome: string; acoesConcluidasTotal: number; acoesTotal: number; taxaConclusao: number }) => item.acoesConcluidasTotal > 0)
          // Ordenar por taxa de conclusão (desc), depois por quantidade (desc) como desempate
          .sort((a: { colaboradorId: number; colaboradorNome: string; acoesConcluidasTotal: number; acoesTotal: number; taxaConclusao: number }, b: { colaboradorId: number; colaboradorNome: string; acoesConcluidasTotal: number; acoesTotal: number; taxaConclusao: number }) => {
            if (b.taxaConclusao !== a.taxaConclusao) {
              return b.taxaConclusao - a.taxaConclusao;
            }
            return b.acoesConcluidasTotal - a.acoesConcluidasTotal;
          })
          .slice(0, 10); // Pegar top 10

        // Aplicar posição e medalhas
        let posicao = 1;
        let ultimaTaxa = -1;
        const top10Final: Array<{
          colaboradorId: number;
          colaboradorNome: string;
          acoesConcluidasTotal: number;
          acoesTotal: number;
          taxaConclusao: number;
          posicao: number;
          medalha?: "ouro" | "prata" | "bronze";
        }> = [];

        for (const item of colaboradoresComTaxa) {
          // Se a taxa for diferente da anterior, atualiza a posição
          if (item.taxaConclusao !== ultimaTaxa) {
            posicao = top10Final.length + 1;
            ultimaTaxa = item.taxaConclusao;
          }

          top10Final.push({
            ...item,
            posicao,
            medalha:
              posicao === 1 ? "ouro" : posicao === 2 ? "prata" : posicao === 3 ? "bronze" : undefined,
          });
        }

        stats.blocoD.top10Colaboradores = top10Final;

        // ============= BLOCO E: ESTATÍSTICAS PESSOAIS DO COLABORADOR =============
        if (user.role === "colaborador") {
          // Buscar PDIs do colaborador logado
          const meusPDIs = await db
            .select({ id: pdis.id })
            .from(pdis)
            .where(eq(pdis.colaboradorId, user.id));
          
          const meusPDIIds = meusPDIs.map((p: { id: number }) => p.id);
          
          if (meusPDIIds.length > 0) {
            // Contar minhas ações
            const minhasAcoesResult = await db
              .select({
                total: count(),
                concluidas: count(sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`),
              })
              .from(actions)
              .where(sql`${actions.pdiId} IN (${sql.join(meusPDIIds.map((id: number) => sql`${id}`), sql`, `)})`);
            
            stats.blocoE.minhasAcoesTotal = minhasAcoesResult[0]?.total || 0;
            stats.blocoE.minhasAcoesConcluidas = minhasAcoesResult[0]?.concluidas || 0;
            stats.blocoE.minhaTaxaConclusao = stats.blocoE.minhasAcoesTotal > 0
              ? Math.round((stats.blocoE.minhasAcoesConcluidas / stats.blocoE.minhasAcoesTotal) * 100)
              : 0;
          }
          
          // Encontrar minha posição no ranking geral
          const minhaEntrada = colaboradoresComTaxa.find(
            (c: { colaboradorId: number }) => c.colaboradorId === user.id
          );
          if (minhaEntrada) {
            const minhaPosicao = colaboradoresComTaxa.findIndex(
              (c: { colaboradorId: number }) => c.colaboradorId === user.id
            ) + 1;
            stats.blocoE.minhaPosicaoRanking = minhaPosicao;
          }
        }

        return stats;
      } catch (error) {
        console.error("Erro ao obter estatísticas do dashboard:", error);
        return stats;
      }
    }),

  /**
   * Obter análise de liderança
   * Retorna ranking de líderes com métricas de engajamento pessoal e da equipe
   */
  getLeadershipAnalysis: adminOrGerenteProcedure.query(async () => {
    const { getLeadershipAnalysis } = await import("../db");
    return await getLeadershipAnalysis();
  }),

  /**
   * Envia por e-mail o card de Análise de Liderança de um líder específico.
   * Destinatário: o próprio líder.
   * Cópia: todos os usuários com perfil "gerente" + relacionamento@ckmtalents.net.
   * A imagem chega como anexo inline (CID), não em base64 embutido no HTML,
   * para evitar bloqueio de exibição em clientes como Gmail/Outlook.
   */
  sendLeadershipReport: adminOrGerenteProcedure
    .input(
      z.object({
        leaderId: z.number(),
        cardImage: z.string().min(1, "Imagem do card é obrigatória"),
      })
    )
    .mutation(async ({ input }) => {
      const { getUserById, getUsersByRole } = await import("../db");

      // 1. Validar tamanho do payload antes de processar
      if (input.cardImage.length > MAX_IMAGE_BASE64_LENGTH) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "A imagem do relatório é muito grande para ser enviada por e-mail.",
        });
      }

      // 2. Validar formato esperado (data URL de PNG)
      const match = input.cardImage.match(/^data:image\/png;base64,(.+)$/);
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Formato de imagem inválido. Esperado PNG em base64.",
        });
      }
      const imageBuffer = Buffer.from(match[1], "base64");

      // 3. Buscar o líder
      const leader = await getUserById(input.leaderId);
      if (!leader) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Líder não encontrado." });
      }
      if (!leader.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este líder não possui e-mail cadastrado.",
        });
      }

      // 4. Resolver destinatários em cópia: gerentes ativos + relacionamento
      const gerentes = await getUsersByRole("gerente");
      const gerentesEmails = gerentes
        .filter((g: { status?: string; email?: string | null }) => g.status === "ativo" && g.email)
        .map((g: { email: string }) => g.email);

      const ccList = Array.from(new Set([...gerentesEmails, ...CC_FIXOS]));
      const ccString = ccList.join(", ");

      // 5. Montar HTML seguindo o mesmo padrão visual do relatório da Visão Executiva
      const cid = "leadership-report-card";
      const html = `
        <div style="font-family: sans-serif; color: #334155; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
          <div style="background-image: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 900;">Análise de Liderança</h2>
            <p style="margin: 5px 0 0; opacity: 0.9; font-weight: 600;">${leader.cargo ? `${leader.cargo} · ` : ""}Relatório de Desempenho</p>
          </div>

          <div style="padding: 30px;">
            <p style="font-size: 16px;">Olá <strong>${leader.name}</strong>,</p>
            <p style="color: #64748b; line-height: 1.6;">Segue o resumo de desempenho da sua liderança no ciclo atual, com base nos indicadores de conclusão de PDI.</p>

            <div style="margin: 25px 0; border: 1px solid #f1f5f9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <img src="cid:${cid}" alt="Card de Análise de Liderança" style="width: 100%; display: block;" />
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://pdi.ecodobem.com/analise-lideranca" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">ACESSAR SISTEMA PDI</a>
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 600;">
              Este e-mail foi gerado pelo Administrador via Análise de Liderança.<br />
              ⚠️ NÃO RESPONDA ESTE EMAIL — O FLUXO É VIA SISTEMA ⚠️
            </p>
          </div>
        </div>
      `;

      // 6. Enviar
      const sent = await sendEmail({
        to: leader.email,
        cc: ccString,
        subject: `[Análise de Liderança] Relatório de ${leader.name}`,
        body: `Olá ${leader.name}, segue o resumo de desempenho da sua liderança. Acesse o sistema para mais detalhes.`,
        html,
        attachments: [
          {
            filename: "analise-lideranca.png",
            content: imageBuffer,
            cid,
            contentType: "image/png",
          },
        ],
      });

      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível enviar o e-mail. Verifique a configuração de SMTP.",
        });
      }

      return { success: true, sentTo: leader.email, cc: ccList };
    }),
});
